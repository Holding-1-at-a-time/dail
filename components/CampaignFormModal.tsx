import React, { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Campaign } from '../types';
import Modal from './Modal';

interface CampaignFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignToEdit: Campaign | null; // Note: Editing is disabled in this version to showcase creation.
}

const CampaignFormModal: React.FC<CampaignFormModalProps> = ({ isOpen, onClose, campaignToEdit }) => {
  const [goal, setGoal] = useState('');
  const saveCampaign = useMutation(api.marketing.saveCampaign);

  useEffect(() => {
    // This form is now only for creation. Editing can be a future enhancement.
    if (isOpen) {
      setGoal('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // For new campaigns, we only need the goal. The retrier will handle generation.
      await saveCampaign({ data: { goal } });
      onClose();
    } catch (error: any) {
        console.error("Error creating campaign:", error);
        if (error?.data?.kind === 'RateLimitError') {
            alert("You have exceeded the limit for AI campaign generation. Please wait a moment before trying again.");
        } else {
            alert("An error occurred while creating the campaign.");
        }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New AI-Powered Campaign">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="goal" className="block text-sm font-medium text-gray-300">Campaign Goal</label>
           <div className="mt-1">
                <input
                    type="text"
                    name="goal"
                    id="goal"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    required
                    placeholder="e.g., Promote a 20% spring cleaning discount"
                    className="block w-full bg-gray-700 rounded-md py-2 px-3 text-white"
                />
           </div>
           <p className="text-xs text-gray-400 mt-2">
            Enter your objective, and our AI will generate a compelling subject and body for your email campaign. The generation will happen in the background.
           </p>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
          <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 text-gray-100 rounded-md">Cancel</button>
          <button type="submit" className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md">Create Campaign</button>
        </div>
      </form>
    </Modal>
  );
};

export default CampaignFormModal;