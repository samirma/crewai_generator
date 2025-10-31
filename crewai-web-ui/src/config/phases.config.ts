import { buildPrompt } from "@/utils/promptUtils";

export interface PhaseState {
  id: number;
  title: string;
  prompt: string;
  defaultPrompt: string;
  input: string;
  output: string;
  isLoading: boolean;
  duration: number | null;
  isTimerRunning: boolean;
  filePath?: string;
  outputType?: 'file' | 'directory';
  promptFileName?: string;
  generateInputPrompt: (currentPhase: PhaseState, allPhases: PhaseState[], initialUserInput: string) => string;
  dependencies: PhaseState[];
}

// Helper function to clean JSON string from markdown
const cleanJsonString = (jsonString: string): string => {
  const match = jsonString.match(/```json\n([\s\S]*?)\n```/);
  if (match && match[1]) {
    return match[1];
  }
  return jsonString;
};

// Helper function to merge JSON outputs from multiple phases
const mergeOutputs = (outputs: string[]): string => {
  const merged = outputs.reduce((acc, output) => {
    try {
      const cleanedOutput = cleanJsonString(output);
      const parsed = JSON.parse(cleanedOutput);
      return { ...acc, ...parsed };
    } catch (e) {
      console.error("Failed to parse phase output:", e);
      return acc;
    }
  }, {});
  return JSON.stringify(merged, null, 2);
};

export const defaultGenerateInputPrompt = (currentPhase: PhaseState, allPhases: PhaseState[], initialUserInput: string): string => {
  const dependentOutputs = currentPhase.dependencies.map(dep => {
    const depState = allPhases.find(p => p.id === dep.id);
    return depState ? depState.output : "";
  });
  return `${dependentOutputs[0]}\n\n${currentPhase.prompt}`;
};

const blueprintGenerateInputPrompt = (currentPhase: PhaseState, allPhases: PhaseState[], initialUserInput: string): string => {
  return buildPrompt(initialUserInput, currentPhase.prompt, null, null);
};

export const codeGenerationGenerateInputPrompt = (currentPhase: PhaseState, allPhases: PhaseState[], initialUserInput: string): string => {
  const dependentOutputs = currentPhase.dependencies.map(dep => {
    const depState = allPhases.find(p => p.id === dep.id);
    return depState ? depState.output : "";
  });
  const mergedOutput = mergeOutputs(dependentOutputs);
  return `${mergedOutput}\n\n${currentPhase.prompt}`;
};

export const pyProjectGenerateInputPrompt = (currentPhase: PhaseState, allPhases: PhaseState[], initialUserInput: string): string => {
  const pythonCode = currentPhase.dependencies.map(dep => {
    const depState = allPhases.find(p => p.id === dep.id);
    return depState ? `File: ${depState.filePath}\n${depState.output}` : "";
  }).filter(p => p && p.includes("\n")).join('\n\n---\n\n');
  return `${pythonCode}\n\n${currentPhase.prompt}`;
};

const blueprintDefinitionPhase: PhaseState = {
  id: 1,
  title: "Blueprint Definition",
  promptFileName: "phase1_blueprint_prompt.md",
  prompt: "",
  defaultPrompt: "",
  input: "",
  output: "",
  isLoading: false,
  duration: null,
  isTimerRunning: false,
  dependencies: [],
  generateInputPrompt: blueprintGenerateInputPrompt
};
const highLevelArchitecturePhase: PhaseState = {
  id: 2,
  title: "High-Level Architecture",
  promptFileName: "phase2.1_high_level_architecture_prompt.md",
  prompt: "",
  defaultPrompt: "",
  input: "",
  output: "",
  isLoading: false,
  duration: null,
  isTimerRunning: false,
  dependencies: [blueprintDefinitionPhase],
  generateInputPrompt: defaultGenerateInputPrompt
};
const detailedAgentAndTaskDefinitionPhase: PhaseState = {
  id: 3,
  title: "Detailed Agent and Task Definition",
  promptFileName: "phase2.2_detailed_agent_and_task_prompt.md",
  prompt: "",
  defaultPrompt: "",
  input: "",
  output: "",
  isLoading: false,
  duration: null,
  isTimerRunning: false,
  dependencies: [highLevelArchitecturePhase],
  generateInputPrompt: defaultGenerateInputPrompt
};
const toolSelectionPhase: PhaseState = {
  id: 4,
  title: "Tool Selection",
  promptFileName: "phase2.3_tool_selection_prompt.md",
  prompt: "",
  defaultPrompt: "",
  input: "",
  output: "",
  isLoading: false,
  duration: null,
  isTimerRunning: false,
  dependencies: [detailedAgentAndTaskDefinitionPhase],
  generateInputPrompt: defaultGenerateInputPrompt
};
const customToolGenerationPhase: PhaseState = {
  id: 5,
  title: "Custom Tool Generation",
  promptFileName: "phase2.4_custom_tool_generation_prompt.md",
  prompt: "",
  defaultPrompt: "",
  input: "",
  output: "",
  isLoading: false,
  duration: null,
  isTimerRunning: false,
  dependencies: [toolSelectionPhase],
  generateInputPrompt: defaultGenerateInputPrompt
};
const agentsYamlGenerationPhase: PhaseState = {
  id: 6,
  title: "Agents.yaml Generation",
  promptFileName: "phase3_agents_prompt.md",
  filePath: "src/crewai_generated/config/agents.yaml",
  outputType: 'file',
  prompt: "",
  defaultPrompt: "",
  input: "",
  output: "",
  isLoading: false,
  duration: null,
  isTimerRunning: false,
  dependencies: [highLevelArchitecturePhase],
  generateInputPrompt: codeGenerationGenerateInputPrompt
};
const tasksYamlGenerationPhase: PhaseState = {
  id: 7,
  title: "Tasks.yaml Generation",
  promptFileName: "phase3_tasks_prompt.md",
  filePath: "src/crewai_generated/config/tasks.yaml",
  outputType: 'file',
  prompt: "",
  defaultPrompt: "",
  input: "",
  output: "",
  isLoading: false,
  duration: null,
  isTimerRunning: false,
  dependencies: [highLevelArchitecturePhase],
  generateInputPrompt: codeGenerationGenerateInputPrompt
};
const crewPyGenerationPhase: PhaseState = {
  id: 8,
  title: "Crew.py Generation",
  promptFileName: "phase3_crew_prompt.md",
  filePath: "src/crewai_generated/crew.py",
  outputType: 'file',
  prompt: "",
  defaultPrompt: "",
  input: "",
  output: "",
  isLoading: false,
  duration: null,
  isTimerRunning: false,
  dependencies: [highLevelArchitecturePhase, detailedAgentAndTaskDefinitionPhase, toolSelectionPhase, customToolGenerationPhase],
  generateInputPrompt: codeGenerationGenerateInputPrompt
};
const mainPyGenerationPhase: PhaseState = {
  id: 9,
  title: "Main.py Generation",
  promptFileName: "phase3_main_prompt.md",
  filePath: "src/crewai_generated/main.py",
  outputType: 'file',
  prompt: "",
  defaultPrompt: "",
  input: "",
  output: "",
  isLoading: false,
  duration: null,
  isTimerRunning: false,
  dependencies: [crewPyGenerationPhase],
  generateInputPrompt: defaultGenerateInputPrompt
};
const toolsGenerationPhase: PhaseState = {
  id: 10,
  title: "Tools Generation",
  promptFileName: "phase3_tools_prompt.md",
  filePath: "src/crewai_generated/tools",
  outputType: 'directory',
  prompt: "",
  defaultPrompt: "",
  input: "",
  output: "",
  isLoading: false,
  duration: null,
  isTimerRunning: false,
  dependencies: [customToolGenerationPhase],
  generateInputPrompt: codeGenerationGenerateInputPrompt
};
const pyProjectGenerationPhase: PhaseState = {
  id: 11,
  title: "PyProject Generation",
  promptFileName: "phase3_pyproject_prompt.md",
  filePath: "pyproject.toml",
  outputType: 'file',
  prompt: "",
  defaultPrompt: "",
  input: "",
  output: "",
  isLoading: false,
  duration: null,
  isTimerRunning: false,
  dependencies: [crewPyGenerationPhase, mainPyGenerationPhase, toolsGenerationPhase],
  generateInputPrompt: pyProjectGenerateInputPrompt
};

const phases = [
  blueprintDefinitionPhase,
  highLevelArchitecturePhase,
  detailedAgentAndTaskDefinitionPhase,
  toolSelectionPhase,
  customToolGenerationPhase,
  agentsYamlGenerationPhase,
  tasksYamlGenerationPhase,
  crewPyGenerationPhase,
  mainPyGenerationPhase,
  toolsGenerationPhase,
  pyProjectGenerationPhase,
];

export const getPhases = () => {
  return phases;
}
