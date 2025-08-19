import React, { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Campaign } from '../types';
import Modal from './Modal';
import { PaperAirplaneIcon } from './icons';

interface SendCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign | null;
}

const SendCampaignModal: React.FC<SendCampaignModalProps> = ({ isOpen, onClose, campaign }) => {
  const [isSending, setIsSending] = useState(false);
  const sendCampaign = useMutation(api.marketing.sendCampaign);

  const handleSend = async () => {
    if (!campaign) return;
    setIsSending(true);
    try {
        await sendCampaign({ campaignId: campaign._id });
        onClose();
    } catch (error) {
        console.error("Failed to send campaign:", error);
        alert("An error occurred. The campaign could not be sent.");
    } finally {
        setIsSending(false);
    }
  };

  if (!campaign) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm & Send Campaign">
      <div className="space-y-6">
        <p className="text-gray-400">You are about to send the following email campaign to all customers in your database. Please review the content before sending.</p>
        
        <div className="bg-gray-900/50 p-4 rounded-lg space-y-4">
            <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Subject</label>
                <p className="mt-1 p-2 bg-gray-700 rounded-md text-white">{campaign.subject}</p>
            </div>
             <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Body</label>
                <p className="mt-1 p-2 bg-gray-700 rounded-md text-gray-200 whitespace-pre-wrap h-48 overflow-y-auto">{campaign.body}</p>
            </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
          <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 text-gray-100 rounded-md">
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleSend}
            disabled={isSending}
            className="flex items-center justify-center py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:bg-gray-500"
          >
            <PaperAirplaneIcon className="w-5 h-5 mr-2" />
            {isSending ? 'Sending...' : 'Send to All Customers'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SendCampaignModal;