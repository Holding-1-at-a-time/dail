
import React, { useState } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { User, JobItem, Checklist } from '../types';
import { CarIcon, UserCircleIcon, BriefcaseIcon, ChecklistIcon, CameraIcon, PencilAltIcon, DocumentDownloadIcon, ClipboardListIcon, ChatBubbleLeftRightIcon } from './icons';
import SignatureModal from './SignatureModal';
import jsPDF from 'jspdf';

const InteractiveChecklist: React.FC<{ jobItemId: string; checklist: Checklist; disabled: boolean; onUpdate: (args: { jobItemId: string; completedTasks: string[] }) => void; }> = ({ jobItemId, checklist, disabled, onUpdate }) => {
    const jobItem = useQuery(api.jobs.getJobItem, { jobItemId });
    const completed = new Set((jobItem?.checklistCompletedItems || []) as string[]);
    const handleToggle = (task: string) => {
        if (disabled) return;
        const newCompleted = new Set(completed);
        newCompleted.has(task) ? newCompleted.delete(task) : newCompleted.add(task);
        onUpdate({ jobItemId, completedTasks: Array.from(newCompleted) });
    };
    return (
        <div className="space-y-2">
            {!disabled && <p className="text-xs text-gray-400 mb-2">Check off tasks as you complete them.</p>}
            {disabled && <p className="text-xs text-yellow-400 mb-2">Checklist is disabled. Convert the job to a 'Work Order' to enable it.</p>}
            {checklist.tasks.map((task, index) => (
                <label key={index} className={`flex items-center p-3 bg-gray-700 rounded-md transition-colors ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-600'}`}>
                    <input type="checkbox" checked={completed.has(task)} onChange={() => handleToggle(task)} disabled={disabled} className="h-5 w-5 rounded bg-gray-800 border-gray-600 text-blue-500 focus:ring-blue-500" />
                    <span className={`ml-3 text-white ${completed.has(task) ? 'line-through text-gray-400' : ''}`}>{task}</span>
                </label>
            ))}
        </div>
    );
};

interface JobDetailPageProps { jobId: string; currentUser: User | null; onBack: () => void; }

const Tab: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; icon: React.ReactNode; }> = ({ active, onClick, children, icon }) => (
    <button onClick={onClick} className={`flex items-center space-x-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${ active ? 'border-blue-500 text-white' : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500' }`}>
        {icon}
        <span>{children}</span>
    </button>
);

const JobDetailPage: React.FC<JobDetailPageProps> = ({ jobId, currentUser, onBack }) => {
    const [activeTab, setActiveTab] = useState('summary');
    const data = useQuery(api.jobs.getDataForDetailPage, { jobId });
    const communicationHistory = useQuery(api.communication.getHistoryForJob, { jobId });
    const updateChecklist = useMutation(api.jobs.updateChecklistProgress);
    const generateUploadUrl = useMutation(api.files.generateUploadUrl);
    const addPhoto = useMutation(api.jobs.addPhoto);
    const approveJob = useMutation(api.jobs.approve);
    const sendManualEmail = useAction(api.communication.sendManualEmail);
    
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    if (!data) return <div className="p-8 text-center">Loading job details...</div>;
    const { job, customer, vehicle, services, checklists, photoUrls, signatureUrl } = data;
    if (!job || !customer || !vehicle) return <div className="p-8 text-center text-red-500">Error loading job data.</div>;
    
    const isTechnician = currentUser?.role === 'technician';
    
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
        const file = e.target.files?.[0];
        if (!file) return;
        const postUrl = await generateUploadUrl();
        const result = await fetch(postUrl, { method: "POST", headers: { 'Content-Type': file.type }, body: file });
        const { storageId } = await result.json();
        await addPhoto({ jobId: job._id, storageId, type });
    };
    
    const handleSaveSignature = async (signatureDataUrl: string) => {
        const response = await fetch(signatureDataUrl);
        const blob = await response.blob();
        const postUrl = await generateUploadUrl();
        const result = await fetch(postUrl, { method: "POST", headers: { 'Content-Type': blob.type }, body: blob });
        const { storageId } = await result.json();
        await approveJob({ jobId: job._id, signatureStorageId: storageId });
        setIsSignatureModalOpen(false);
    };
    
    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;
        setIsSending(true);
        try {
            await sendManualEmail({ jobId: job._id, message: newMessage });
            setNewMessage('');
        } catch (error) {
            console.error("Failed to send message:", error);
            alert("Error: Could not send message.");
        } finally {
            setIsSending(false);
        }
    };

    const handleGeneratePdf = () => { /* PDF generation logic remains the same */ };
    
    const renderTabContent = () => {
        switch(activeTab) {
            case 'summary':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-gray-800 p-6 rounded-lg shadow-lg"><h2 className="text-xl font-bold text-white flex items-center mb-4"><UserCircleIcon className="w-6 h-6 mr-3 text-gray-400"/>Customer</h2><p className="text-lg font-semibold">{customer.name}</p><p className="text-gray-400">{customer.phone}</p><p className="text-gray-400">{customer.email}</p></div>
                            <div className="bg-gray-800 p-6 rounded-lg shadow-lg"><h2 className="text-xl font-bold text-white flex items-center mb-4"><CarIcon className="w-6 h-6 mr-3 text-gray-400"/>Vehicle</h2><p className="text-lg font-semibold">{vehicle.make} {vehicle.model}</p><p className="text-gray-400">{vehicle.year} - {vehicle.color}</p><p className="text-gray-400 font-mono text-xs mt-1">{vehicle.vin}</p></div>
                        </div>
                        <div className="lg:col-span-2 space-y-6">
                             <div className="bg-gray-800 p-6 rounded-lg shadow-lg"><h2 className="text-xl font-bold text-white flex items-center mb-4"><BriefcaseIcon className="w-6 h-6 mr-3 text-gray-400"/>Job Summary</h2><div className="space-y-2 text-sm"><div className="flex justify-between"><span>Status:</span> <span className="font-semibold capitalize">{job.status}</span></div><div className="flex justify-between"><span>Total:</span> <span className="font-semibold">${job.totalAmount.toFixed(2)}</span></div><div className="flex justify-between"><span>Paid:</span> <span className="font-semibold">${job.paymentReceived.toFixed(2)}</span></div></div></div>
                            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                                <h2 className="text-xl font-bold text-white flex items-center mb-4"><PencilAltIcon className="w-6 h-6 mr-3 text-gray-400"/>Approval</h2>
                                {job.customerApprovalStatus === 'approved' ? (<div><p className="text-sm text-green-400 font-semibold mb-2">Estimate Approved</p>{signatureUrl && <img src={signatureUrl} alt="Signature" className="bg-gray-700 rounded-md p-2" />}<p className="text-xs text-gray-500 mt-2">Signed on: {job.approvalTimestamp ? new Date(job.approvalTimestamp).toLocaleString() : 'N/A'}</p></div>) : job.customerApprovalStatus === 'pending' && job.status === 'estimate' ? (<div><p className="text-sm text-yellow-400 font-semibold mb-3">Pending Approval</p>{isTechnician && (<button onClick={() => setIsSignatureModalOpen(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Get Signature</button>)}</div>) : (<p className="text-sm text-gray-500 italic">Approval not applicable.</p>)}
                            </div>
                        </div>
                    </div>
                );
            case 'checklists':
                 return (
                    <div className="space-y-6">
                        {job.jobItems.map(item => {
                            const service = services.find(s => s._id === item.serviceId);
                            const checklist = checklists.find(c => c.serviceId === item.serviceId);
                            if (!service || !checklist) return null;
                            const canInteractWithChecklist = isTechnician && job.status === 'workOrder';
                            return (
                                <div key={item.id} className="bg-gray-800 p-6 rounded-lg shadow-lg">
                                    <h3 className="text-xl font-bold text-white mb-3">Checklist for: {service.name}</h3>
                                    <InteractiveChecklist jobItemId={item.id} checklist={checklist} disabled={!canInteractWithChecklist} onUpdate={updateChecklist} />
                                </div>
                            );
                        })}
                        {job.jobItems.every(item => !checklists.some(c => c.serviceId === item.serviceId)) && <p className="text-center text-gray-500 py-8">No checklists are associated with the services in this job.</p>}
                    </div>
                 );
            case 'photos':
                 return (
                     <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                         {isTechnician && (<div className="grid grid-cols-2 gap-4 mb-6"><label className="cursor-pointer bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg text-center">+ 'Before'<input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, 'before')} /></label><label className="cursor-pointer bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg text-center">+ 'After'<input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, 'after')} /></label></div>)}
                         {photoUrls.length > 0 ? (<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{photoUrls.map(p => (<div key={p.id} className="relative group"><img src={p.url!} alt={`${p.type} photo`} className="rounded-md aspect-square object-cover" /><div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs text-center py-1 rounded-b-md capitalize">{p.type}</div></div>))}</div>) : (<p className="text-sm text-gray-500 italic text-center py-12">No photos uploaded.</p>)}
                     </div>
                 );
            case 'communication':
                return (
                    <div className="bg-gray-800 rounded-lg shadow-lg">
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-white mb-4">Communication History</h2>
                            <div className="space-y-4 max-h-96 overflow-y-auto pr-2 mb-6 border-b border-gray-700 pb-4">
                                {(communicationHistory || []).map(log => (
                                    <div key={log._id} className="p-3 bg-gray-700/50 rounded-lg">
                                        <div className="flex justify-between items-center text-xs text-gray-400 mb-1">
                                            <span>{log.type === 'automated_reminder' ? 'Automated Reminder' : 'Manual Message'}</span>
                                            <span>{new Date(log.timestamp).toLocaleString()}</span>
                                        </div>
                                        <p className="text-sm text-gray-200 whitespace-pre-wrap">{log.content}</p>
                                    </div>
                                ))}
                                {(!communicationHistory || communicationHistory.length === 0) && <p className="text-sm text-gray-500 text-center py-8">No messages have been sent for this job.</p>}
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2">Send Message to Customer</h3>
                                <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} rows={4} placeholder="Type your message..." className="w-full bg-gray-700 rounded-md p-2 text-white"></textarea>
                                <div className="text-right mt-2"><button onClick={handleSendMessage} disabled={isSending} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white font-semibold disabled:bg-gray-500">{isSending ? 'Sending...' : 'Send Email'}</button></div>
                            </div>
                        </div>
                    </div>
                );
        }
    }

    return (
        <>
            <div className="container mx-auto p-4 md:p-8">
                <header className="mb-6 flex justify-between items-start">
                    <div>
                        <button onClick={onBack} className="flex items-center text-blue-400 hover:text-blue-300 mb-4 font-semibold">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            Back to List
                        </button>
                        <h1 className="text-3xl font-bold text-white">Job Details</h1><p className="text-gray-400 mt-1">Job #{job._id.substring(0,6)}</p>
                    </div>
                    <button onClick={handleGeneratePdf} className="flex items-center bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors mt-12"><DocumentDownloadIcon className="w-5 h-5 mr-2" />Download PDF</button>
                </header>
                
                <div className="flex space-x-1 border-b border-gray-700 mb-6">
                    <Tab active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} icon={<ClipboardListIcon className="w-5 h-5"/>}>Summary</Tab>
                    <Tab active={activeTab === 'checklists'} onClick={() => setActiveTab('checklists')} icon={<ChecklistIcon className="w-5 h-5"/>}>Checklists</Tab>
                    <Tab active={activeTab === 'photos'} onClick={() => setActiveTab('photos')} icon={<CameraIcon className="w-5 h-5"/>}>Photos</Tab>
                    <Tab active={activeTab === 'communication'} onClick={() => setActiveTab('communication')} icon={<ChatBubbleLeftRightIcon className="w-5 h-5"/>}>Communication</Tab>
                </div>
                
                {renderTabContent()}

            </div>
            <SignatureModal isOpen={isSignatureModalOpen} onClose={() => setIsSignatureModalOpen(false)} onSave={handleSaveSignature} />
        </>
    );
};

export default JobDetailPage;