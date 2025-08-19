import React from 'react';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Subscription } from '../types';
import { EditIcon, TrashIcon } from './icons';

interface SubscriptionCardProps {
  subscription: Subscription;
  customerName?: string;
  serviceNames: string[];
  onEdit: (subscription: Subscription) => void;
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({ subscription, customerName, serviceNames, onEdit }) => {
    const updateStatus = useMutation(api.subscriptions.updateStatus);

    const handleStatusChange = (status: 'active' | 'paused' | 'cancelled') => {
        if (status === 'cancelled' && !window.confirm("Are you sure you want to cancel this subscription? This cannot be undone.")) {
            return;
        }
        updateStatus({ id: subscription._id, status });
    };

    const statusColors = {
        active: 'bg-green-800 text-green-200',
        paused: 'bg-yellow-800 text-yellow-200',
        cancelled: 'bg-red-800 text-red-200',
    };

    return (
        <div className="bg-gray-800 rounded-lg shadow-lg p-5 flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-white">{customerName || 'Unknown Customer'}</h3>
                    <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${statusColors[subscription.status]}`}>{subscription.status}</span>
                </div>
                <p className="text-sm text-gray-400 capitalize">{subscription.frequency} Plan</p>
                <div className="mt-4 pt-4 border-t border-gray-700/50">
                    <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Included Services</h4>
                    <ul className="space-y-1 text-sm text-gray-300">
                        {serviceNames.map((name, i) => <li key={i}>{name}</li>)}
                    </ul>
                </div>
                <div className="mt-4 text-sm">
                    <span className="text-gray-400">Next Job: </span>
                    <span className="font-semibold text-white">{new Date(subscription.nextDueDate).toLocaleDateString()}</span>
                </div>
            </div>
            <div className="flex justify-end items-center space-x-2 border-t border-gray-700 pt-3 mt-4">
                {subscription.status === 'active' && <button onClick={() => handleStatusChange('paused')} className="text-xs px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded-md">Pause</button>}
                {subscription.status === 'paused' && <button onClick={() => handleStatusChange('active')} className="text-xs px-3 py-1 bg-green-600 hover:bg-green-700 rounded-md">Resume</button>}
                {subscription.status !== 'cancelled' && <button onClick={() => handleStatusChange('cancelled')} className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-700"><TrashIcon className="w-5 h-5" /></button>}
                <button onClick={() => onEdit(subscription)} className="p-2 text-gray-400 hover:text-blue-400 rounded-full hover:bg-gray-700"><EditIcon className="w-5 h-5" /></button>
            </div>
        </div>
    );
};

export default SubscriptionCard;