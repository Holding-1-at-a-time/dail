import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Promotion, Campaign } from '../types';
import { PlusIcon, EditIcon, TrashIcon, MegaphoneIcon, ExclamationTriangleIcon, PaperAirplaneIcon, CheckCircleIcon, ReceiptPercentIcon } from './icons';
import PromotionFormModal from './PromotionFormModal';
import CampaignFormModal from './CampaignFormModal';
import SendCampaignModal from './SendCampaignModal';
import EmptyState from './EmptyState';

const CampaignCard: React.FC<{ campaign: Campaign; onSend: (campaign: Campaign) => void; }> = ({ campaign, onSend }) => {
    const getStatusIndicator = () => {
        switch (campaign.status) {
            case 'generating':
                return (
                    <div className="flex items-center text-xs text-blue-300 animate-pulse">
                        <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Generating...
                    </div>
                );
            case 'failed':
                return (
                    <div className="flex items-center text-xs text-red-400">
                        <ExclamationTriangleIcon className="w-4 h-4 mr-1.5" />
                        Generation Failed
                    </div>
                );
            case 'sending':
                 return (
                    <div className="flex items-center text-xs text-yellow-300 animate-pulse">
                        <PaperAirplaneIcon className="w-4 h-4 mr-1.5" />
                        Sending...
                    </div>
                );
            case 'sent':
                return (
                    <div className="flex items-center text-xs text-green-400">
                        <CheckCircleIcon className="w-4 h-4 mr-1.5" />
                        Sent on {new Date(campaign.sentAt!).toLocaleDateString()}
                    </div>
                );
            case 'complete':
                 return <button onClick={() => onSend(campaign)} className="flex items-center bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded-lg text-xs transition-colors"><PaperAirplaneIcon className="w-4 h-4 mr-2" />Send</button>;
        }
    }
    
    return (
        <div className="bg-gray-800 rounded-lg shadow-lg p-4 flex flex-col justify-between min-h-[160px]">
            <div>
                <p className="font-semibold text-white truncate">{campaign.subject || `Goal: ${campaign.goal}`}</p>
                {campaign.status !== 'generating' && <p className="text-sm text-gray-300 mt-2 line-clamp-2">{campaign.body}</p>}
                {campaign.status === 'generating' && <p className="text-sm text-gray-400 mt-2">AI is crafting your email content. This may take a moment...</p>}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-700/50 flex justify-between items-center">
                <p className="text-xs text-gray-500">Created: {new Date(campaign.createdAt).toLocaleDateString()}</p>
                {getStatusIndicator()}
            </div>
        </div>
    );
};


const MarketingPage: React.FC = () => {
    const data = useQuery(api.marketing.getData);
    const promotions = data?.promotions ?? [];
    const campaigns = data?.campaigns ?? [];
    const deletePromotion = useMutation(api.marketing.deletePromotion);

    const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);
    const [promotionToEdit, setPromotionToEdit] = useState<Promotion | null>(null);
    const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
    const [isSendModalOpen, setIsSendModalOpen] = useState(false);
    const [campaignToSend, setCampaignToSend] = useState<Campaign | null>(null);
    
    const handleOpenPromotionModal = (promotion: Promotion | null) => {
        setPromotionToEdit(promotion);
        setIsPromotionModalOpen(true);
    };
    
    const handleOpenSendModal = (campaign: Campaign) => {
        setCampaignToSend(campaign);
        setIsSendModalOpen(true);
    };

    const handleCloseModals = () => {
        setIsPromotionModalOpen(false); setPromotionToEdit(null);
        setIsCampaignModalOpen(false);
        setIsSendModalOpen(false); setCampaignToSend(null);
    }
    
    const handleDeletePromotion = (id: string) => {
        if(window.confirm('Are you sure?')) deletePromotion({id});
    }

    if (!data) return <div className="p-8 text-center">Loading marketing data...</div>;

    return (
        <div className="container mx-auto p-4 md:p-8">
            <header className="mb-8"><h1 className="text-3xl font-bold text-white">Marketing & Promotions</h1><p className="text-gray-400 mt-1">Create discount codes and email campaigns to grow your business.</p></header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <section id="promotions">
                    <header className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-white">Promotions</h2><button onClick={() => handleOpenPromotionModal(null)} className="flex items-center bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg"><PlusIcon className="w-5 h-5 mr-2" />New Promotion</button></header>
                    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                        {promotions.length > 0 ? (
                            <table className="min-w-full"><thead className="bg-gray-700"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Code</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Discount</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">Actions</th></tr></thead>
                                <tbody className="divide-y divide-gray-700">{promotions.map(promo => (<tr key={promo._id}><td className="px-6 py-4 font-mono text-primary">{promo.code}</td><td className="px-6 py-4">{promo.type === 'percentage' ? `${promo.value}%` : `$${promo.value.toFixed(2)}`}</td><td className="px-6 py-4"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${promo.isActive ? 'bg-green-800 text-green-100' : 'bg-gray-600 text-gray-200'}`}>{promo.isActive ? 'Active' : 'Inactive'}</span></td><td className="px-6 py-4 text-right"><button onClick={() => handleOpenPromotionModal(promo)} className="p-2 text-gray-400 hover:text-blue-400"><EditIcon className="w-5 h-5" /></button><button onClick={() => handleDeletePromotion(promo._id)} className="p-2 text-gray-400 hover:text-red-500"><TrashIcon className="w-5 h-5" /></button></td></tr>))}</tbody>
                            </table>
                        ) : (
                            <EmptyState
                                icon={<ReceiptPercentIcon className="w-12 h-12 text-gray-600" />}
                                title="No Promotions"
                                message="Create discount codes to attract new customers and reward loyal ones."
                                action={{ label: "New Promotion", onClick: () => handleOpenPromotionModal(null) }}
                            />
                        )}
                    </div>
                </section>
                <section id="campaigns">
                     <header className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-white">Email Campaigns</h2><button onClick={() => setIsCampaignModalOpen(true)} className="flex items-center bg-primary hover:opacity-90 text-white font-bold py-2 px-4 rounded-lg"><PlusIcon className="w-5 h-5 mr-2" />New Campaign</button></header>
                     {campaigns.length > 0 ? (
                        <div className="space-y-4">
                            {campaigns.map(campaign => <CampaignCard key={campaign._id} campaign={campaign} onSend={handleOpenSendModal} />)}
                        </div>
                     ) : (
                        <EmptyState
                            icon={<MegaphoneIcon className="w-12 h-12 text-gray-600" />}
                            title="No Campaigns"
                            message="Engage your customers by creating and sending AI-powered email campaigns."
                            action={{ label: "New Campaign", onClick: () => setIsCampaignModalOpen(true) }}
                        />
                     )}
                </section>
            </div>
            <PromotionFormModal isOpen={isPromotionModalOpen} onClose={handleCloseModals} promotionToEdit={promotionToEdit} />
            <CampaignFormModal isOpen={isCampaignModalOpen} onClose={handleCloseModals} campaignToEdit={null} />
            <SendCampaignModal isOpen={isSendModalOpen} onClose={handleCloseModals} campaign={campaignToSend} />
        </div>
    );
};

export default MarketingPage;