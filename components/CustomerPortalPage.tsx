
import React, { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { Job, Customer, Vehicle, Service, Payment } from '../types';
import { CarIcon, UserCircleIcon, BriefcaseIcon, PencilAltIcon, CreditCardIcon } from './icons';
import SignatureModal from './SignatureModal';
import PaymentFormModal from './PaymentFormModal';

interface CustomerPortalPageProps {
    data: {
        job: Job;
        customer: Customer;
        vehicle: Vehicle;
        services: Service[];
        photoUrls: { id: string; url: string | null; type: "before" | "after" }[];
        signatureUrl: string | null;
    }
}

const CustomerPortalPage: React.FC<CustomerPortalPageProps> = ({ data }) => {
    const { job, customer, vehicle, services, photoUrls, signatureUrl } = data;
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    
    const approveJob = useMutation(api.jobs.approve);
    const generateUploadUrl = useMutation(api.files.generateUploadUrl);

    const handleSaveSignature = async (signatureDataUrl: string) => {
        const response = await fetch(signatureDataUrl);
        const blob = await response.blob();
        const postUrl = await generateUploadUrl();
        const result = await fetch(postUrl, { method: "POST", headers: { 'Content-Type': blob.type }, body: blob });
        const { storageId } = await result.json();
        
        await approveJob({ jobId: job._id, signatureStorageId: storageId });
        setIsSignatureModalOpen(false);
    };

    const renderAction = () => {
        if (job.status === 'estimate' && job.customerApprovalStatus === 'pending') {
            return <button onClick={() => setIsSignatureModalOpen(true)} className="w-full flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg text-lg"><PencilAltIcon className="w-6 h-6 mr-3" />Review & Approve Estimate</button>;
        }
        if (job.status === 'invoice' && job.paymentStatus !== 'paid') {
            return <button onClick={() => setIsPaymentModalOpen(true)} className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg text-lg"><CreditCardIcon className="w-6 h-6 mr-3" />Pay Invoice</button>;
        }
        return null;
    }

    const statusInfo = {
        estimate: { text: "This is an estimate for the services listed below.", color: "text-yellow-300" },
        workOrder: { text: "This job is in progress.", color: "text-blue-300" },
        invoice: { text: "This is an invoice. Payment is due.", color: "text-purple-300" },
        completed: { text: "This job is complete and paid. Thank you!", color: "text-green-300" },
        cancelled: { text: "This job has been cancelled.", color: "text-gray-400" },
    };

    return (
        <>
            <div className="bg-gray-900 min-h-screen p-4 sm:p-6 md:p-8">
                <div className="max-w-4xl mx-auto">
                    <header className="text-center mb-8"><h1 className="text-4xl font-bold text-white">Detailing Pro</h1><p className="text-gray-400 mt-2">Your Service Details</p></header>
                    <div className="bg-gray-800 rounded-lg shadow-2xl p-6 md:p-8">
                         <div className={`p-4 rounded-lg mb-6 text-center ${statusInfo[job.status]?.color.replace('text-', 'bg-').replace('-300', '-900 bg-opacity-50')}`}><p className={`font-semibold ${statusInfo[job.status]?.color}`}>{statusInfo[job.status]?.text}</p></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                             <div className="bg-gray-700 p-4 rounded-lg"><h2 className="text-lg font-bold text-white flex items-center mb-3"><UserCircleIcon className="w-5 h-5 mr-2 text-gray-400"/>Customer</h2><p>{customer.name}</p><p className="text-sm text-gray-400">{customer.email}</p></div>
                             <div className="bg-gray-700 p-4 rounded-lg"><h2 className="text-lg font-bold text-white flex items-center mb-3"><CarIcon className="w-5 h-5 mr-2 text-gray-400"/>Vehicle</h2><p>{`${vehicle.year} ${vehicle.make} ${vehicle.model}`}</p><p className="text-sm text-gray-400">{vehicle.color}</p></div>
                        </div>
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-white flex items-center mb-4"><BriefcaseIcon className="w-6 h-6 mr-3 text-gray-400"/>Services & Costs</h2>
                            <div className="flow-root"><ul className="-my-4 divide-y divide-gray-700">{job.jobItems.map(item => { const service = services.find(s => s._id === item.serviceId); return (<li key={item.id} className="flex items-center justify-between py-4"><div><p className="font-semibold text-white">{service?.name || 'Unknown'}</p><p className="text-sm text-gray-400">{service?.description}</p></div><p className="font-mono text-lg text-blue-400">${item.total.toFixed(2)}</p></li>)})}</ul></div>
                             <div className="mt-6 pt-6 border-t border-gray-700 text-right space-y-2">
                                <div className="flex justify-end items-center text-lg"><span className="text-gray-300 mr-4">Total:</span><span className="font-bold text-white text-xl">${job.totalAmount.toFixed(2)}</span></div>
                                <div className="flex justify-end items-center text-md"><span className="text-gray-400 mr-4">Paid:</span><span className="font-semibold text-green-400">${job.paymentReceived.toFixed(2)}</span></div>
                                <div className="flex justify-end items-center text-2xl"><span className="text-gray-200 mr-4">Balance Due:</span><span className="font-bold text-yellow-400">${(job.totalAmount - job.paymentReceived).toFixed(2)}</span></div>
                            </div>
                        </div>
                        {photoUrls.length > 0 && (<div className="mb-6"><h2 className="text-xl font-bold text-white mb-4">Photo Documentation</h2><div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">{photoUrls.map(photo => (<div key={photo.id} className="relative group"><img src={photo.url!} alt={`${photo.type} photo`} className="rounded-lg aspect-square object-cover" /><div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs text-center py-1 rounded-b-lg capitalize">{photo.type}</div></div>))}</div></div>)}
                        <div className="mt-8 pt-8 border-t border-gray-700">{renderAction()}</div>
                    </div>
                </div>
            </div>
            <SignatureModal isOpen={isSignatureModalOpen} onClose={() => setIsSignatureModalOpen(false)} onSave={handleSaveSignature} />
            <PaymentFormModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} job={job} />
        </>
    );
};

export default CustomerPortalPage;
