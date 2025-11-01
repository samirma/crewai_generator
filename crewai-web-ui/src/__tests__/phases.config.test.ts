
import { PhaseState } from '../config/phases.config';
import {
  defaultGenerateInputPrompt,
  jsonGenerateInputPrompt,
  pyProjectGenerateInputPrompt,
} from '../config/phases.config';

// Mock basePhaseState for easy reuse
const basePhaseState: Omit<PhaseState, 'id' | 'dependencies'> = {
  title: "Test Phase",
  prompt: "Test Prompt",
  defaultPrompt: "Default Prompt",
  input: "",
  output: "Test Output",
  isLoading: false,
  duration: null,
  isTimerRunning: false,
  generateInputPrompt: jest.fn(),
};

describe('Phase Configuration', () => {

  describe('defaultGenerateInputPrompt', () => {
    it('should combine the output of the first dependency with the current phase prompt', () => {
      const dependencyPhase1: PhaseState = {
        ...basePhaseState,
        id: 1,
        output: "Initial Dependency Output 1",
        dependencies: [],
      };
      const dependencyPhase2: PhaseState = {
        ...basePhaseState,
        id: 2,
        output: "Dependency Output 2",
        dependencies: [],
      };
      const currentPhase: PhaseState = {
        ...basePhaseState,
        id: 3,
        dependencies: [dependencyPhase1, dependencyPhase2],
      };

      // Simulate state update
      const updatedDependencyPhase1 = { ...dependencyPhase1, output: "Updated Dependency Output 1" };
      const allPhases: PhaseState[] = [updatedDependencyPhase1, dependencyPhase2, currentPhase];
      const initialUserInput = "Initial Input";

      const result = defaultGenerateInputPrompt(currentPhase, allPhases, initialUserInput);

      expect(result).toBe("Updated Dependency Output 1\n\nTest Prompt");
    });
  });

  describe('codeGenerationGenerateInputPrompt', () => {
    it('should merge the outputs of all dependencies and combine with the current phase prompt', () => {
      const dependencyPhase1: PhaseState = {
        ...basePhaseState,
        id: 1,
        output: "{\"key1\":\"initial-value1\"}",
        dependencies: [],
      };
      const dependencyPhase2: PhaseState = {
        ...basePhaseState,
        id: 2,
        output: "```json\n{\"key2\":\"initial-value2\"}\n```",
        dependencies: [],
      };
      const currentPhase: PhaseState = {
        ...basePhaseState,
        id: 3,
        dependencies: [dependencyPhase1, dependencyPhase2],
      };

      // Simulate state update
      const updatedDependencyPhase1 = { ...dependencyPhase1, output: "{\"key1\":\"updated-value1\"}" };
      const updatedDependencyPhase2 = { ...dependencyPhase2, output: "```json\n{\"key2\":\"updated-value2\"}\n```" };
      const allPhases: PhaseState[] = [updatedDependencyPhase1, updatedDependencyPhase2, currentPhase];
      const initialUserInput = "Initial Input";

      const result = jsonGenerateInputPrompt(currentPhase, allPhases, initialUserInput);

      const expectedMergedOutput = JSON.stringify({ key1: 'updated-value1', key2: 'updated-value2' }, null, 2);
      expect(result).toBe(`${expectedMergedOutput}\n\nTest Prompt`);
    });
  });

  describe('pyProjectGenerateInputPrompt', () => {
    it('should combine the file path and output of all dependencies with the current phase prompt', () => {
      const dependencyPhase1: PhaseState = {
        ...basePhaseState,
        id: 8,
        filePath: "src/crewai_generated/crew.py",
        output: "crew.py content",
        dependencies: [],
      };
      const dependencyPhase2: PhaseState = {
        ...basePhaseState,
        id: 9,
        filePath: "src/crewai_generated/main.py",
        output: "main.py content",
        dependencies: [],
      };
      const currentPhase: PhaseState = {
        ...basePhaseState,
        id: 11,
        dependencies: [dependencyPhase1, dependencyPhase2],
      };
      const allPhases: PhaseState[] = [dependencyPhase1, dependencyPhase2, currentPhase];
      const initialUserInput = "Initial Input";

      const result = pyProjectGenerateInputPrompt(currentPhase, allPhases, initialUserInput);

      const expectedPythonCode = `File: src/crewai_generated/crew.py\ncrew.py content\n\n---\n\nFile: src/crewai_generated/main.py\nmain.py content`;
      expect(result).toBe(`${expectedPythonCode}\n\nTest Prompt`);
    });
  });
});
