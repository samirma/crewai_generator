import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Home from '../app/page';
import { usePhases } from '../hooks/usePhases';

// Mock all child components to isolate the Home component
jest.mock('../app/components/ProjectSetup', () => {
  return jest.fn((props) => (
    <div data-testid="project-setup-mock">
      <button
        onClick={() => props.handleRunAllPhases(false)}
        disabled={!props.initialInput.trim() || !props.llmModel || props.isRunAllLoading}
      >
        {props.isRunAllLoading && props.activeExecutionMode === 'sequential' ? 'Running...' : 'Generate Full Script (Sequential)'}
      </button>
      <button
        onClick={() => props.handleRunAllPhases(true)}
        disabled={!props.initialInput.trim() || !props.llmModel || props.isRunAllLoading}
      >
        {props.isRunAllLoading && props.activeExecutionMode === 'parallel' ? 'Running...' : 'Generate Full Script (Parallel)'}
      </button>
    </div>
  ));
});
jest.mock('../app/components/SavedPrompts', () => () => <div data-testid="saved-prompts-mock" />);
jest.mock('../app/components/GenerationTab', () => () => <div data-testid="generation-tab-mock" />);
jest.mock('../app/components/ExecutionTab', () => () => <div data-testid="execution-tab-mock" />);
jest.mock('../hooks/usePhases');

const mockUsePhases = usePhases as jest.Mock;

describe('Home page', () => {
  const mockInitialPhases = {
    phases: [],
    setPhases: jest.fn(),
    handlePhaseExecution: jest.fn(),
    currentActivePhase: null,
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock fetch for both models and prompts
    global.fetch = jest.fn((url) => {
      if (url === '/api/models') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ id: 'test-model', name: 'Test Model' }]),
        });
      }
      if (url === '/api/prompts') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }) as jest.Mock;

    // Mock document.cookie to set initial state
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: 'initialInstruction=some-input',
    });
  });

  it('should call handleRunAllPhases from hook when sequential button is clicked', async () => {
    const handleRunAllPhases = jest.fn().mockReturnValue(new Promise(() => {}));
    mockUsePhases.mockReturnValue({
      ...mockInitialPhases,
      handleRunAllPhases,
      handleRunAllPhasesInParallel: jest.fn(),
      isRunAllLoading: false,
    });

    render(<Home />);
    await waitFor(() => {
      expect(screen.getByText('Generate Full Script (Sequential)')).not.toBeDisabled();
    });
    act(() => {
      fireEvent.click(screen.getByText('Generate Full Script (Sequential)'));
    });
    expect(handleRunAllPhases).toHaveBeenCalled();
  });

  it('should call handleRunAllPhasesInParallel from hook when parallel button is clicked', async () => {
    const handleRunAllPhasesInParallel = jest.fn().mockReturnValue(new Promise(() => {}));
    mockUsePhases.mockReturnValue({
      ...mockInitialPhases,
      handleRunAllPhases: jest.fn(),
      handleRunAllPhasesInParallel,
      isRunAllLoading: false,
    });

    render(<Home />);
    await waitFor(() => {
      expect(screen.getByText('Generate Full Script (Parallel)')).not.toBeDisabled();
    });
    act(() => {
      fireEvent.click(screen.getByText('Generate Full Script (Parallel)'));
    });
    expect(handleRunAllPhasesInParallel).toHaveBeenCalled();
  });

  it('should show loading state on sequential button when running sequentially', async () => {
    const promise = new Promise<boolean>(() => {}); // A promise that never resolves
    const handleRunAllPhases = jest.fn().mockReturnValue(promise);

    mockUsePhases.mockImplementation(() => ({
      ...mockInitialPhases,
      handleRunAllPhases,
      handleRunAllPhasesInParallel: jest.fn(),
      isRunAllLoading: handleRunAllPhases.mock.calls.length > 0,
    }));

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Generate Full Script (Sequential)')).not.toBeDisabled();
    });

    act(() => {
      fireEvent.click(screen.getByText('Generate Full Script (Sequential)'));
    });

    await waitFor(() => {
      expect(screen.getByText('Running...')).toBeInTheDocument();
      expect(screen.getByText('Generate Full Script (Parallel)')).toBeDisabled();
    });
  });

  it('should show loading state on parallel button when running in parallel', async () => {
    const promise = new Promise<boolean>(() => {});
    const handleRunAllPhasesInParallel = jest.fn().mockReturnValue(promise);

    mockUsePhases.mockImplementation(() => ({
      ...mockInitialPhases,
      handleRunAllPhases: jest.fn(),
      handleRunAllPhasesInParallel,
      isRunAllLoading: handleRunAllPhasesInParallel.mock.calls.length > 0,
    }));

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Generate Full Script (Parallel)')).not.toBeDisabled();
    });

    act(() => {
      fireEvent.click(screen.getByText('Generate Full Script (Parallel)'));
    });

    await waitFor(() => {
      expect(screen.getByText('Running...')).toBeInTheDocument();
      expect(screen.getByText('Generate Full Script (Sequential)')).toBeDisabled();
    });
  });
});
