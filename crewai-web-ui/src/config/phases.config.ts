import { buildPrompt } from "@/utils/promptUtils";

export type PhaseStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface PhaseState {
  id: number;
  title: string;
  prompt: string;
  defaultPrompt: string;
  input: string;
  output: string;
  status: PhaseStatus;
  duration: number | null;
  tokensPerSecond: number | null;
  filePath?: string;
  outputType?: 'file' | 'directory';
  promptFileName?: string;
  generateInputPrompt: (currentPhase: PhaseState, allPhases: PhaseState[], initialUserInput: string) => string;
  dependencies: PhaseState[];
}

export type Phase = PhaseState;

// --- Helper for Auto-Incrementing IDs ---
let phaseIdCounter = 0;

// This array will hold all the phase definitions
const phases: PhaseState[] = [];

// Define the properties that are common to all phases
const defaultPhaseStateProperties: Omit<PhaseState,
  'id' | 'title' | 'promptFileName' | 'generateInputPrompt' | 'dependencies' | 'filePath' | 'outputType'
> = {
  prompt: "",
  defaultPrompt: "",
  input: "",
  output: "",
  status: 'pending',
  duration: null,
  tokensPerSecond: null,
};

// Define the type for creating a new phase.
// Required properties are 'title', 'promptFileName', 'generateInputPrompt', 'dependencies'.
// Optional properties are 'filePath', 'outputType', and all from defaultPhaseStateProperties.
type PhaseStateConfig = Pick<PhaseState,
  'title' | 'promptFileName' | 'generateInputPrompt' | 'dependencies'
> & Partial<Omit<PhaseState,
  'id' | 'title' | 'promptFileName' | 'generateInputPrompt' | 'dependencies'
>>;


/**
 * Creates a PhaseState object, adds it to the global phases array,
 * and returns it.
 * @param config The phase-specific configuration.
 * @returns A full PhaseState object with a unique ID and merged defaults.
 */
const createPhaseState = (config: PhaseStateConfig): PhaseState => {
  phaseIdCounter++;
  const newPhase: PhaseState = {
    ...defaultPhaseStateProperties, // Apply defaults first
    ...config,                    // Override with specific config
    id: phaseIdCounter,              // Add the unique ID
  };
  phases.push(newPhase); // Automatically add the new phase to the list
  return newPhase;
};
// ------------------------------------------

// Helper function to clean JSON string from markdown
const cleanJsonString = (jsonString: string): string => {
  if (!jsonString) return "{}";
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
      if (!cleanedOutput || cleanedOutput.trim() === "") {
        return acc;
      }
      const parsed = JSON.parse(cleanedOutput);
      return { ...acc, ...parsed };
    } catch (e) {
      console.warn("Failed to parse phase output, skipping:", e);
      return acc;
    }
  }, {});
  return JSON.stringify(merged, null, 2);
};

const getDependentOutputs = (currentPhase: PhaseState, allPhases: PhaseState[]): string[] => {
  return currentPhase.dependencies.map(dep => {
    const depState = allPhases.find(p => p.id === dep.id);
    return depState ? depState.output : "";
  });
};

export const defaultGenerateInputPrompt = (currentPhase: PhaseState, allPhases: PhaseState[], initialUserInput: string): string => {
  const dependentOutputs = getDependentOutputs(currentPhase, allPhases);
  const mergedOutput = dependentOutputs.join('\n\n');
  return `${mergedOutput}\n\n${currentPhase.prompt}`;
};

const blueprintGenerateInputPrompt = (currentPhase: PhaseState, allPhases: PhaseState[], initialUserInput: string): string => {
  return buildPrompt(initialUserInput, currentPhase.prompt, null, null);
};

export const jsonGenerateInputPrompt = (currentPhase: PhaseState, allPhases: PhaseState[], initialUserInput: string): string => {
  const dependentOutputs = getDependentOutputs(currentPhase, allPhases);
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

// --- Phase Definitions (now using createPhaseState) ---
// These functions now automatically populate the 'phases' array

const blueprintDefinitionPhase: PhaseState = createPhaseState({
  title: "Blueprint Definition",
  promptFileName: "phase1_blueprint_prompt.md",
  dependencies: [],
  generateInputPrompt: blueprintGenerateInputPrompt
});

const projectConfigurationPhase: PhaseState = createPhaseState({
  title: "Project Configuration",
  promptFileName: "phase2_project_config_prompt.md",
  filePath: "project_config.yaml",
  outputType: 'file',
  dependencies: [blueprintDefinitionPhase],
  generateInputPrompt: defaultGenerateInputPrompt
});

const detailedAgentAndTaskDefinitionPhase: PhaseState = createPhaseState({
  title: "Detailed Agent and Task Definition",
  promptFileName: "phase2.2_detailed_agent_and_task_prompt.md",
  dependencies: [blueprintDefinitionPhase, projectConfigurationPhase],
  generateInputPrompt: defaultGenerateInputPrompt
});

const llmSelectionPhase: PhaseState = createPhaseState({
  title: "LLM Selection",
  promptFileName: "phase2_llm.md",
  dependencies: [detailedAgentAndTaskDefinitionPhase],
  generateInputPrompt: defaultGenerateInputPrompt
});

const toolSelectionPhase: PhaseState = createPhaseState({
  title: "Tool Selection",
  promptFileName: "phase2.3_tool_selection_prompt.md",
  dependencies: [detailedAgentAndTaskDefinitionPhase],
  generateInputPrompt: defaultGenerateInputPrompt
});

const customToolGenerationPhase: PhaseState = createPhaseState({
  title: "Custom Tool plan Generation",
  promptFileName: "phase2.4_plan_custom_tool_prompt.md",
  dependencies: [toolSelectionPhase],
  generateInputPrompt: defaultGenerateInputPrompt
});

const toolsGenerationPhase: PhaseState = createPhaseState({
  title: "Custom Tools Generation",
  promptFileName: "phase3_custom_tools_prompt.md",
  filePath: "src/crewai_generated/tools",
  outputType: 'directory',
  dependencies: [customToolGenerationPhase],
  generateInputPrompt: jsonGenerateInputPrompt
});

const agentsYamlGenerationPhase: PhaseState = createPhaseState({
  title: "Agents.yaml Generation",
  promptFileName: "phase3_agents_prompt.md",
  filePath: "src/crewai_generated/config/agents.yaml",
  outputType: 'file',
  dependencies: [detailedAgentAndTaskDefinitionPhase],
  generateInputPrompt: defaultGenerateInputPrompt
});

const tasksYamlGenerationPhase: PhaseState = createPhaseState({
  title: "Tasks.yaml Generation",
  promptFileName: "phase3_tasks_prompt.md",
  filePath: "src/crewai_generated/config/tasks.yaml",
  outputType: 'file',
  dependencies: [detailedAgentAndTaskDefinitionPhase],
  generateInputPrompt: defaultGenerateInputPrompt
});

const workflow: PhaseState = createPhaseState({
  title: "Workflow",
  promptFileName: "phase2_workflow_prompt.md",
  dependencies: [detailedAgentAndTaskDefinitionPhase],
  generateInputPrompt: defaultGenerateInputPrompt
});

const crewPyGenerationPhase: PhaseState = createPhaseState({
  title: "Crew.py Generation",
  promptFileName: "phase3_crew_prompt.md",
  filePath: "src/crewai_generated/crew.py",
  outputType: 'file',
  dependencies: [workflow, llmSelectionPhase, detailedAgentAndTaskDefinitionPhase, toolSelectionPhase],
  generateInputPrompt: defaultGenerateInputPrompt
});

const mainPyGenerationPhase: PhaseState = createPhaseState({
  title: "Main.py Generation",
  promptFileName: "phase3_main_prompt.md",
  filePath: "src/crewai_generated/main.py",
  outputType: 'file',
  dependencies: [detailedAgentAndTaskDefinitionPhase],
  generateInputPrompt: defaultGenerateInputPrompt
});

const pyProjectGenerationPhase: PhaseState = createPhaseState({
  title: "PyProject Generation",
  promptFileName: "phase3_pyproject_prompt.md",
  filePath: "pyproject.toml",
  outputType: 'file',
  dependencies: [toolsGenerationPhase],
  generateInputPrompt: pyProjectGenerateInputPrompt
});

const streamitPhase: PhaseState = createPhaseState({
  title: "Streamit Generation",
  promptFileName: "phase3_streamit_prompt.md",
  filePath: "streamit.py",
  outputType: 'file',
  dependencies: [projectConfigurationPhase],
  generateInputPrompt: defaultGenerateInputPrompt
});

export const getPhases = () => {
  return phases;
}
