import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { interactWithLLM } from './llm.service';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const promptsDir = path.join(process.cwd(), 'public', 'prompts');
const workspaceDir = path.join(process.cwd(), 'workspace');
const agentCodeDir = path.join(workspaceDir, 'agent_code');

async function readPrompt(filename: string): Promise<string> {
  try {
    return await fs.readFile(path.join(promptsDir, filename), 'utf-8');
  } catch (error) {
    console.error(`Error reading prompt file ${filename}:`, error);
    throw new Error(`Could not read prompt file: ${filename}`);
  }
}

async function writeFileToAgentCode(relativePath: string, content: string): Promise<void> {
  const fullPath = path.join(agentCodeDir, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content);
}

function buildPrompt(template: string, insertions: Record<string, string>): string {
  return template.replace(/{{{ (\w+) }}}/g, (_, key) => insertions[key] || '');
}

async function callLLM(llmModel: string, prompt: string, phase: number): Promise<string> {
  const { llmResponseText } = await interactWithLLM(prompt, llmModel, phase);
  // Basic validation to ensure we get some JSON-like output
  if (!llmResponseText.trim().startsWith('{') && !llmResponseText.trim().startsWith('[')) {
    // A simple retry logic can be added here if needed
  }
  return llmResponseText;
}

export async function POST(request: Request) {
  const startTime = Date.now();
  try {
    const { llmModel, initialInput } = await request.json();

    if (!llmModel || !initialInput) {
      return NextResponse.json({ error: "Missing required parameters: llmModel and initialInput." }, { status: 400 });
    }

    // 1. Clean Slate and Scaffold Project
    await fs.rm(agentCodeDir, { recursive: true, force: true });
    // Manually create the directory structure that `crewai create` would have.
    await fs.mkdir(path.join(agentCodeDir, 'src', 'agent_code', 'config'), { recursive: true });
    await fs.mkdir(path.join(agentCodeDir, 'src', 'agent_code', 'tools'), { recursive: true });


    // 2. Load All Prompt Templates
    const prompts = {
      p1: await readPrompt('phase1_blueprint_prompt.md'),
      p2_1: await readPrompt('phase2.1_workflow_memory_llms.md'),
      p2_2: await readPrompt('phase2.2_tools.md'),
      p2_3: await readPrompt('phase2.3_agents_tasks.md'),
      p2_4: await readPrompt('phase2.4_assemble_architecture.md'),
      p3_1: await readPrompt('phase3.1_generate_agents_yaml.md'),
      p3_2: await readPrompt('phase3.2_generate_tasks_yaml.md'),
      p3_3: await readPrompt('phase3.3_generate_custom_tools.md'),
      p3_4: await readPrompt('phase3.4_generate_crew_py.md'),
      p3_5: await readPrompt('phase3.5_generate_main_py.md'),
    };

    // 3. Execute Generation Phases
    // Phase 1: Blueprint
    const blueprintPrompt = buildPrompt(prompts.p1, { userInput: initialInput });
    const blueprint = await callLLM(llmModel, blueprintPrompt, 1);

    // Phase 2.1: Workflow, Memory, LLMs
    const p2_1_prompt = buildPrompt(prompts.p2_1, { blueprint });
    const p2_1_json = await callLLM(llmModel, p2_1_prompt, 2.1);

    // Phase 2.2: Tools
    const p2_2_prompt = buildPrompt(prompts.p2_2, { blueprint, p2_1_json });
    const p2_2_json = await callLLM(llmModel, p2_2_prompt, 2.2);

    // Phase 2.3: Agents & Tasks
    const p2_3_prompt = buildPrompt(prompts.p2_3, { blueprint, p2_1_json, p2_2_json });
    const p2_3_json = await callLLM(llmModel, p2_3_prompt, 2.3);

    // Phase 2.4: Assemble Architecture
    const p2_4_prompt = buildPrompt(prompts.p2_4, { p2_1_json, p2_2_json, p2_3_json });
    const finalArchitectureJsonStr = await callLLM(llmModel, p2_4_prompt, 2.4);
    const finalArchitecture = JSON.parse(finalArchitectureJsonStr);

    // Phase 3: Code Generation
    // 3.1: agents.yaml
    const agentsYamlPrompt = buildPrompt(prompts.p3_1, { finalArchitecture: JSON.stringify(finalArchitecture.agent_cadre) });
    const agentsYaml = await callLLM(llmModel, agentsYamlPrompt, 3.1);
    await writeFileToAgentCode('src/agent_code/config/agents.yaml', agentsYaml);

    // 3.2: tasks.yaml
    const tasksYamlPrompt = buildPrompt(prompts.p3_2, { finalArchitecture: JSON.stringify(finalArchitecture.task_roster) });
    const tasksYaml = await callLLM(llmModel, tasksYamlPrompt, 3.2);
    await writeFileToAgentCode('src/agent_code/config/tasks.yaml', tasksYaml);

    // 3.3: custom_tools.py (Conditional)
    let customToolsPy = null;
    if (finalArchitecture.custom_tool_definitions && finalArchitecture.custom_tool_definitions.length > 0) {
      const customToolsPrompt = buildPrompt(prompts.p3_3, { finalArchitecture: JSON.stringify(finalArchitecture.custom_tool_definitions) });
      customToolsPy = await callLLM(llmModel, customToolsPrompt, 3.3);
      await writeFileToAgentCode('src/agent_code/tools/custom_tools.py', customToolsPy);
    }

    // 3.4: crew.py
    const crewPyPrompt = buildPrompt(prompts.p3_4, { finalArchitecture: finalArchitectureJsonStr });
    const crewPy = await callLLM(llmModel, crewPyPrompt, 3.4);
    await writeFileToAgentCode('src/agent_code/crew.py', crewPy);

    // 3.5: main.py
    const mainPyPrompt = buildPrompt(prompts.p3_5, { finalArchitecture: JSON.stringify(finalArchitecture.task_roster) });
    const mainPy = await callLLM(llmModel, mainPyPrompt, 3.5);
    await writeFileToAgentCode('src/agent_code/main.py', mainPy);

    // 4. Copy .env file
    await fs.copyFile(path.join(workspaceDir, '.env'), path.join(agentCodeDir, '.env'));

    // 5. Return generated files to UI
    const generatedFiles = {
      'agents.yaml': agentsYaml,
      'tasks.yaml': tasksYaml,
      'crew.py': crewPy,
      'main.py': mainPy,
      'tools/custom_tools.py': customToolsPy, // Will be null if not created
    };

    const duration = parseFloat(((Date.now() - startTime) / 1000).toFixed(2));

    return NextResponse.json({ files: generatedFiles, duration });

  } catch (error) {
    console.error("Error in generation process:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}