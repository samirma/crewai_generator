import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import { ExecutionProvider, useExecutionContext } from '../ExecutionContext';

// Mock global fetch
global.fetch = jest.fn();

// Polyfill TextEncoder
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Mock HTMLMediaElement prototype
Object.defineProperty(global.window.HTMLMediaElement.prototype, 'play', {
    configurable: true,
    get() {
        return jest.fn().mockResolvedValue(undefined); // Start with a default
    },
});
Object.defineProperty(global.window.HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    get() {
        return jest.fn();
    },
});

// Helper component to consume context
const TestComponent = () => {
    const {
        executionStates,
        handleExecuteScript,
        stopExecution,
        resetExecutionState,
        playSuccessSound,
        playErrorSound
    } = useExecutionContext();

    const projectState = executionStates['test-project'] || {};

    return (
        <div>
            <div data-testid="status">{projectState.isExecutingScript ? 'EXECUTING' : 'IDLE'}</div>
            <div data-testid="containerId">{projectState.containerId}</div>
            <div data-testid="logs">{projectState.scriptLogOutput?.join('\n')}</div>
            <div data-testid="error">{projectState.scriptExecutionError}</div>
            <button onClick={() => handleExecuteScript('test-project', 'test-script.py')}>Execute</button>
            <button onClick={() => stopExecution('test-project')}>Stop</button>
            <button onClick={() => resetExecutionState('test-project')}>Reset</button>
            <button onClick={playSuccessSound}>Play Success</button>
            <button onClick={playErrorSound}>Play Error</button>
        </div>
    );
};

describe('ExecutionContext', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders children correctly', () => {
        render(
            <ExecutionProvider>
                <div>Test Child</div>
            </ExecutionProvider>
        );
        expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    it('throws error when used outside of provider', () => {
        // Prevent console.error from cluttering the test output
        const consoleError = console.error;
        console.error = jest.fn();

        const Thrower = () => {
            useExecutionContext();
            return null;
        };

        expect(() => render(<Thrower />)).toThrow('useExecutionContext must be used within an ExecutionProvider');

        console.error = consoleError;
    });

    it('initializes with default state', () => {
        render(
            <ExecutionProvider>
                <TestComponent />
            </ExecutionProvider>
        );
        expect(screen.getByTestId('status')).toHaveTextContent('IDLE');
        expect(screen.getByTestId('logs')).toHaveTextContent('');
    });

    it('handles successful script execution via mock stream', async () => {
        const mockReader = {
            read: jest.fn()
                .mockResolvedValueOnce({ value: new TextEncoder().encode('LOG: Hello World\n'), done: false })
                .mockResolvedValueOnce({ value: new TextEncoder().encode('RESULT: {"overallStatus": "success"}\n'), done: false })
                .mockResolvedValueOnce({ value: undefined, done: true })
        };

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            body: {
                getReader: () => mockReader
            }
        });

        render(
            <ExecutionProvider>
                <TestComponent />
            </ExecutionProvider>
        );

        fireEvent.click(screen.getByText('Execute'));

        expect(screen.getByTestId('status')).toHaveTextContent('EXECUTING');

        await waitFor(() => {
            expect(screen.getByTestId('logs')).toHaveTextContent('Hello World');
        });

        await waitFor(() => {
            expect(screen.getByTestId('status')).toHaveTextContent('IDLE');
        });
    });

    it('handles run_streamlit.sh specific logic', async () => {
        const mockReader = {
            read: jest.fn()
                .mockResolvedValueOnce({ value: new TextEncoder().encode('LOG: Starting Streamlit\n'), done: false })
                .mockResolvedValueOnce({ value: new TextEncoder().encode('STREAMLIT_URL: http://localhost:8502\n'), done: false })
                .mockResolvedValueOnce({ value: undefined, done: true })
        };

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            body: {
                getReader: () => mockReader
            }
        });

        const StreamlitTestComponent = () => {
            const { handleExecuteScript, executionStates } = useExecutionContext();
            const projectState = executionStates['default'] || {};
            return (
                <div>
                    <div data-testid="logs">{executionStates['default']?.scriptLogOutput?.join('\n')}</div>
                    <button onClick={() => handleExecuteScript('default', 'run_streamlit.sh')}>Run Streamlit</button>
                    {projectState.streamlitUrl && (
                        <a href={projectState.streamlitUrl} target="_blank" rel="noopener noreferrer">
                            <button>Open Streamlit</button>
                        </a>
                    )}
                </div>
            )
        };

        render(
            <ExecutionProvider>
                <StreamlitTestComponent />
            </ExecutionProvider>
        );

        fireEvent.click(screen.getByText('Run Streamlit'));

        await waitFor(() => {
            expect(screen.getByTestId('logs')).toHaveTextContent('Starting Streamlit');
        });

        await waitFor(() => {
            expect(screen.getByText('Open Streamlit')).toBeInTheDocument();
            const link = screen.getByText('Open Streamlit').closest('a');
            expect(link).toHaveAttribute('href', 'http://localhost:8502');
        });
    });

    it('shows streamlit button only when url is available', async () => {
        const mockReader = {
            read: jest.fn()
                // Initial log
                .mockResolvedValueOnce({ value: new TextEncoder().encode('LOG: Init\n'), done: false })
                // Then URL
                .mockResolvedValueOnce({ value: new TextEncoder().encode('STREAMLIT_URL: http://localhost:8502\n'), done: false })
                .mockResolvedValueOnce({ value: undefined, done: true })
        };

        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            body: {
                getReader: () => mockReader
            }
        });

        const StreamlitTestComponent = () => {
            const { handleExecuteScript, executionStates } = useExecutionContext();
            const projectState = executionStates['default'] || {};
            return (
                <div>
                    <button onClick={() => handleExecuteScript('default', 'run_streamlit.sh')}>Run Streamlit</button>
                    {projectState.streamlitUrl && (
                        <button>Open Streamlit</button>
                    )}
                </div>
            )
        };

        render(
            <ExecutionProvider>
                <StreamlitTestComponent />
            </ExecutionProvider>
        );

        // Initially button should not exist
        expect(screen.queryByText('Open Streamlit')).not.toBeInTheDocument();

        fireEvent.click(screen.getByText('Run Streamlit'));

        await waitFor(() => {
            expect(screen.getByText('Open Streamlit')).toBeInTheDocument();
        });
    });

    it('handles stop execution', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({})
        });

        render(
            <ExecutionProvider>
                <TestComponent />
            </ExecutionProvider>
        );

        // Setup state indicating running container (simplified, as we can't easily inject state without running a script,
        // but stopExecution checks for containerId. We can simulate a run first or just assume implementation details.
        // Wait, stopExecution returns early if no containerId. So we must have a containerId.)

        // 1. Start execution to get a container ID
        const mockReader = {
            read: jest.fn()
                .mockResolvedValueOnce({ value: new TextEncoder().encode('CONTAINER_ID: 12345\n'), done: false })
                // Hang indefinitely to simulate active stream
                .mockImplementationOnce(() => new Promise(() => { }))
        };
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            body: { getReader: () => mockReader }
        });

        fireEvent.click(screen.getByText('Execute'));

        // Wait for container ID to be set
        await waitFor(() => {
            expect(screen.getByTestId('containerId')).toHaveTextContent('12345');
        });

        fireEvent.click(screen.getByText('Stop'));

        await waitFor(() => {
            // Check logs for stop request
            expect(screen.getByTestId('logs')).toHaveTextContent('Requesting container stop');
        });
    });

    it('resets execution state', async () => {
        render(
            <ExecutionProvider>
                <TestComponent />
            </ExecutionProvider>
        );

        // Directly influence state via execute (mock fail to get some error state quickly)
        (global.fetch as jest.Mock).mockRejectedValue(new Error('Fail'));
        fireEvent.click(screen.getByText('Execute'));

        await waitFor(() => {
            expect(screen.getByTestId('error')).toHaveTextContent('Fail');
        });

        fireEvent.click(screen.getByText('Reset'));

        expect(screen.getByTestId('error')).toBeEmptyDOMElement();
        expect(screen.getByTestId('logs')).toBeEmptyDOMElement();
    });

    it('plays sounds', async () => {
        const playMock = jest.fn().mockResolvedValue(undefined);
        Object.defineProperty(global.window.HTMLMediaElement.prototype, 'play', {
            configurable: true,
            get() {
                return playMock;
            },
        });

        render(
            <ExecutionProvider>
                <TestComponent />
            </ExecutionProvider>
        );

        fireEvent.click(screen.getByText('Play Success'));
        expect(playMock).toHaveBeenCalled();

        playMock.mockClear();

        fireEvent.click(screen.getByText('Play Error'));
        expect(playMock).toHaveBeenCalled();
    });
});
