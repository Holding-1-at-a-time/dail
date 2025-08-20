import React from 'react';
import { PlusIcon } from './icons';

interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    message: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message, action }) => {
    return (
        <div className="text-center py-16 px-6 flex flex-col items-center justify-center h-full">
            <div className="mb-4">{icon}</div>
            <h3 className="text-xl font-semibold text-white">{title}</h3>
            <p className="text-gray-400 mt-2 max-w-sm">{message}</p>
            {action && (
                <button
                    onClick={action.onClick}
                    className="mt-6 flex items-center bg-primary hover:opacity-90 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors"
                >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    {action.label}
                </button>
            )}
        </div>
    );
};

export default EmptyState;