
import React, { useState } from 'react';

interface SaveProjectModalProps {
    onCheckName: (name: string) => Promise<boolean>; // Returns true if available
    onSave: (name: string) => void;
    onCancel: () => void;
    isOpen: boolean;
}

const SaveProjectModal: React.FC<SaveProjectModalProps> = ({ onCheckName, onSave, onCancel, isOpen }) => {
    const [projectName, setProjectName] = useState('');
    const [error, setError] = useState('');
    const [isValidating, setIsValidating] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!projectName.trim()) {
            setError('Project name cannot be empty');
            return;
        }

        // Basic regex validation
        if (!/^[a-zA-Z0-9_-]+$/.test(projectName)) {
            setError("Use only alphanumeric characters, underscores, and dashes.");
            return;
        }

        setIsValidating(true);
        // In a real scenario we might check for existence first, but here we can just try to save.
        // However, the props suggest a check. For now, let's just pass to onSave which will call the API.
        // The API returns 409 if exists.

        // Changing approach to simple save trigger
        onSave(projectName);
        setIsValidating(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6">
                <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Save Project</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="projectName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Project Name
                        </label>
                        <input
                            type="text"
                            id="projectName"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="my-awesome-agent"
                            autoFocus
                        />
                        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isValidating}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors disabled:opacity-50"
                        >
                            {isValidating ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SaveProjectModal;
