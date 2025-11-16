"use client";

import { Phase, PhaseStatus } from '@/config/phases.config';

interface PhaseSummaryProps {
  phases: Phase[];
}

const PhaseSummary = ({ phases }: PhaseSummaryProps) => {
  const getStatusIcon = (status: PhaseStatus) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'running':
        return '⏳';
      case 'pending':
        return '📄';
      default:
        return '';
    }
  };

  const renderPhase = (phase: Phase) => (
    <div key={phase.id} className="flex items-center space-x-2 text-sm">
      <span>{getStatusIcon(phase.status)}</span>
      <span>{phase.title}</span>
    </div>
  );

  const completedPhases = phases.filter((p) => p.status === 'completed');
  const runningPhases = phases.filter((p) => p.status === 'running');
  const pendingPhases = phases.filter((p) => p.status === 'pending');

  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
      <h3 className="text-lg font-semibold mb-3 text-slate-700 dark:text-slate-200">Phases Summary</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <h4 className="font-semibold text-slate-600 dark:text-slate-300 mb-2">Completed</h4>
          <div className="space-y-1">
            {completedPhases.length > 0 ? completedPhases.map(renderPhase) : <p className="text-slate-500 dark:text-slate-400 text-sm">No phases completed yet.</p>}
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-slate-600 dark:text-slate-300 mb-2">Running</h4>
          <div className="space-y-1">
            {runningPhases.length > 0 ? runningPhases.map(renderPhase) : <p className="text-slate-500 dark:text-slate-400 text-sm">No phases running.</p>}
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-slate-600 dark:text-slate-300 mb-2">Pending</h4>
          <div className="space-y-1">
            {pendingPhases.length > 0 ? pendingPhases.map(renderPhase) : <p className="text-slate-500 dark:text-slate-400 text-sm">All phases are running or completed.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhaseSummary;
