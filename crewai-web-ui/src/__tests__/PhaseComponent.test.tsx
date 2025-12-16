import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import PhaseComponent from '../app/components/PhaseComponent';
import '@testing-library/jest-dom';

// Mocks
const mockSetPrompt = jest.fn();
const mockSetInput = jest.fn();
const mockSetOutput = jest.fn();
const mockOnRunPhase = jest.fn();

const defaultProps = {
    phase: 1,
    title: 'Test Phase',
    status: 'pending' as const,
    prompt: 'Test Prompt',
    setPrompt: mockSetPrompt,
    isExecutingScript: false,
    onRunPhase: mockOnRunPhase,
    duration: null,
    input: '',
    setInput: mockSetInput,
    output: '',
    setOutput: mockSetOutput,
    isInitiallyOpen: false,
};

describe('PhaseComponent', () => {
    it('renders correctly with default props', () => {
        render(<PhaseComponent {...defaultProps} />);
        expect(screen.getByText('Phase 1: Test Phase')).toBeInTheDocument();
    });

    it('opens when isInitiallyOpen is true', () => {
        render(<PhaseComponent {...defaultProps} isInitiallyOpen={true} />);
        const details = screen.getByTestId('phase-component-1').querySelector('details');
        expect(details).toHaveAttribute('open');
    });

    it('stays open when isInitiallyOpen changes from true to false', () => {
        const { rerender } = render(<PhaseComponent {...defaultProps} isInitiallyOpen={true} />);

        let details = screen.getByTestId('phase-component-1').querySelector('details');
        expect(details).toHaveAttribute('open');

        // Simulate phase finishing (isInitiallyOpen becoming false)
        rerender(<PhaseComponent {...defaultProps} isInitiallyOpen={false} />);

        details = screen.getByTestId('phase-component-1').querySelector('details');
        // This is what we want to assert - currently it might fail before the fix
        expect(details).toHaveAttribute('open');
    });

    it('opens when isInitiallyOpen changes from false to true', () => {
        const { rerender } = render(<PhaseComponent {...defaultProps} isInitiallyOpen={false} />);

        let details = screen.getByTestId('phase-component-1').querySelector('details');
        expect(details).not.toHaveAttribute('open');

        // Simulate phase starting
        rerender(<PhaseComponent {...defaultProps} isInitiallyOpen={true} />);

        details = screen.getByTestId('phase-component-1').querySelector('details');
        expect(details).toHaveAttribute('open');
    });
});
