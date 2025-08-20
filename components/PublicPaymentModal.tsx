
import React, { useState, useEffect } from 'react';
import { useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Job } from '../types';
import Modal from './Modal';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.VITE_STRIPE_PUBLISHABLE_KEY!);

const PublicCheckoutForm: React.FC<{ job: Job; onClose: () => void; }> = ({ job, onClose }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const amountDue = job ? job.totalAmount - job.paymentReceived : 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;
        setIsLoading(true);
        setErrorMessage(null);

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: { return_url: `${window.location.href}&payment_status=success` },
        });

        if (error.type === "card_error" || error.type === "validation_error") {
            setErrorMessage(error.message || "An unexpected error occurred.");
        } else {
            setErrorMessage("An unexpected error occurred.");
        }
        setIsLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-4 bg-gray-900 rounded-lg text-center">
                <p className="text-sm text-gray-400">Amount Due</p>
                <p className="text-3xl font-bold text-yellow-400">${amountDue.toFixed(2)}</p>
            </div>

            <PaymentElement />
            
            {errorMessage && <div className="text-red-400 text-sm text-center">{errorMessage}</div>}

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
                <button type="button" onClick={onClose} disabled={isLoading} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 text-gray-100 rounded-md transition-colors disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={isLoading || !stripe || !elements} className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50">
                    {isLoading ? "Processing..." : `Pay $${amountDue > 0 ? amountDue.toFixed(2) : '0.00'}`}
                </button>
            </div>
        </form>
    );
};

interface PublicPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
}

const PublicPaymentModal: React.FC<PublicPaymentModalProps> = ({ isOpen, onClose, job }) => {
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const createPaymentIntent = useAction(api.jobs.createPaymentIntent);

    useEffect(() => {
        if (job && isOpen) {
            const amountDue = job.totalAmount - job.paymentReceived;
            if (amountDue > 0.50) {
                createPaymentIntent({ jobId: job._id, amount: Math.round(amountDue * 100) })
                    .then(secret => setClientSecret(secret))
                    .catch(err => {
                        console.error("Failed to create payment intent:", err);
                        alert("Error: Could not initialize payment form.");
                        onClose();
                    });
            }
        } else {
            setClientSecret(null);
        }
    }, [job, isOpen, createPaymentIntent, onClose]);
  
  if (!job || !isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Secure Payment for Invoice #${job._id.substring(0, 6)}`}>
      {clientSecret ? (
         <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PublicCheckoutForm onClose={onClose} job={job} />
         </Elements>
      ) : (
        <div className="text-center p-8"><p className="animate-pulse">Initializing secure payment gateway...</p></div>
      )}
    </Modal>
  );
};

export default PublicPaymentModal;