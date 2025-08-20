import React, { useState } from 'react';
import { useAction, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { StripeIcon } from './icons';

const OnboardingWizard: React.FC = () => {
    const [step, setStep] = useState(1);
    const [companyName, setCompanyName] = useState('');
    const [laborRate, setLaborRate] = useState(75);
    const [isConnecting, setIsConnecting] = useState(false);

    const completeOnboarding = useMutation(api.company.completeOnboarding);
    const createStripeAccount = useAction(api.company.createStripeConnectAccount);

    const handleStripeConnect = async () => {
        setIsConnecting(true);
        try {
            const url = await createStripeAccount();
            if (url) {
                // First, save the basic info so the user doesn't lose it.
                await completeOnboarding({ name: companyName, defaultLaborRate: laborRate });
                // Then redirect to Stripe.
                window.location.href = url;
            }
        } catch (error) {
            console.error(error);
            alert("Failed to start Stripe connection. You can set this up later in Settings.");
        } finally {
            setIsConnecting(false);
        }
    };

    const handleFinish = async () => {
        await completeOnboarding({ name: companyName, defaultLaborRate: laborRate });
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">Welcome to Detailing Pro!</h2>
                        <p className="text-gray-400 mb-6">Let's get your business set up. First, what is the name of your company?</p>
                        <input
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="e.g., Prestige Auto Spa"
                            className="w-full bg-gray-700 border border-gray-600 rounded-md py-3 px-4 text-lg text-white"
                        />
                    </div>
                );
            case 2:
                return (
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">Set Your Labor Rate</h2>
                        <p className="text-gray-400 mb-6">This helps calculate job profitability. You can change this later in settings.</p>
                        <div className="relative">
                             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                             <input
                                type="number"
                                value={laborRate}
                                onChange={(e) => setLaborRate(parseInt(e.target.value) || 0)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-md py-3 px-4 pl-8 text-lg text-white"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">/ hour</span>
                        </div>
                    </div>
                );
            case 3:
                 return (
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">Accept Online Payments</h2>
                        <p className="text-gray-400 mb-6">Connect with Stripe to securely accept credit card payments from your customers online. This is required to use the invoicing and payment features.</p>
                        <button 
                            onClick={handleStripeConnect}
                            disabled={isConnecting}
                            className="w-full flex items-center justify-center bg-[#635BFF] hover:opacity-90 text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors"
                        >
                            <StripeIcon className="h-6 mr-3" />
                            {isConnecting ? 'Connecting...' : 'Connect with Stripe'}
                        </button>
                         <button onClick={handleFinish} className="w-full text-center text-sm text-gray-500 hover:text-gray-400 mt-4">
                            I'll do this later
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };
    
    const isNextDisabled = () => {
        if (step === 1 && !companyName.trim()) return true;
        if (step === 2 && laborRate <= 0) return true;
        return false;
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-90 z-[100] flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-700">
                <div className="p-8">
                    {renderStep()}
                </div>
                <div className="bg-gray-900/50 p-4 flex justify-between items-center rounded-b-xl">
                    <div className="flex items-center space-x-2">
                       {[1,2,3].map(s => <div key={s} className={`w-2 h-2 rounded-full transition-colors ${step >= s ? 'bg-primary' : 'bg-gray-600'}`}></div>)}
                    </div>
                    {step < 3 ? (
                        <button onClick={() => setStep(s => s + 1)} disabled={isNextDisabled()} className="px-6 py-2 bg-primary hover:opacity-90 rounded-lg disabled:bg-gray-500">
                            Next
                        </button>
                    ) : (
                        <button onClick={handleFinish} className="px-6 py-2 bg-primary hover:opacity-90 rounded-lg">
                            Finish Setup
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OnboardingWizard;
