
import React, { useState, useEffect } from 'react';
import { useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Job } from '../types';
import Modal from './Modal';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useToasts } from './ToastProvider';

// It's recommended to load Stripe outside of a component's render to avoid
// recreating the Stripe object on every render.
// This needs your Stripe publishable key.
const stripePromise = loadStripe(process.env.VITE_STRIPE_PUBLISHABLE_KEY!);

interface CheckoutFormProps {
  onClose: () => void;
  job: Job;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ onClose, job }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const amountDue = job ? job.totalAmount - job.paymentReceived : 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            // Stripe.js has not yet loaded.
            return;
        }

        setIsLoading(true);
        setErrorMessage(null);

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // Return URL is not strictly needed if we handle success/error here,
                // but good practice to have a fallback.
                return_url: `${window.location.origin}`,
            },
        });

        // This point will only be reached if there is an immediate error when
        // confirming the payment. Otherwise, your customer will be redirected to
        // your `return_url`. For some payment methods like iDEAL, your customer will
        // be redirected to an intermediate site first to authorize the payment, then
        // redirected to the `return_url`.
        if (error.type === "card_error" || error.type === "validation_error") {
            setErrorMessage(error.message || "An unexpected error occurred.");
        } else {
            setErrorMessage("An unexpected error occurred.");
        }

        setIsLoading(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-4 bg-gray-900 rounded-lg grid grid-cols-2 gap-4 text-center">
                <div>
                    <p className="text-sm text-gray-400">Total Due</p>
                    <p className="text-2xl font-bold text-blue-400">${job.totalAmount.toFixed(2)}</p>
                </div>
                <div>
                    <p className="text-sm text-gray-400">Paying Now</p>
                    <p className="text-2xl font-bold text-yellow-400">${amountDue.toFixed(2)}</p>
                </div>
            </div>

            <PaymentElement />
            
            {errorMessage && <div className="text-red-400 text-sm text-center">{errorMessage}</div>}

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
                <button type="button" onClick={onClose} disabled={isLoading} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 text-gray-100 rounded-md transition-colors disabled:opacity-50">
                    Cancel
                </button>
                <button type="submit" disabled={isLoading || !stripe || !elements} className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50">
                    {isLoading ? "Processing..." : `Pay $${amountDue > 0 ? amountDue.toFixed(2) : '0.00'}`}
                </button>
            </div>
        </form>
    );
};


interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
}

const PaymentFormModal: React.FC<PaymentFormModalProps> = ({ isOpen, onClose, job }) => {
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const createPaymentIntent = useAction(api.jobs.createPaymentIntent);
    const { addToast } = useToasts();

    useEffect(() => {
        if (job && isOpen) {
            const amountDue = job.totalAmount - job.paymentReceived;
            if (amountDue > 0.50) { // Stripe minimum is $0.50
                createPaymentIntent({ jobId: job._id, amount: Math.round(amountDue * 100) })
                    .then(secret => setClientSecret(secret))
                    .catch(err => {
                        console.error("Failed to create payment intent:", err);
                        addToast("Error: Could not initialize payment form. Please try again.", 'error');
                        onClose();
                    });
            }
        } else {
            setClientSecret(null); // Reset when modal is closed or job is not present
        }
    }, [job, isOpen, createPaymentIntent, onClose, addToast]);
  
  if (!job || !isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Payment for Job #${job._id.substring(0, 6)}`}>
      {clientSecret ? (
         <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm onClose={onClose} job={job} />
         </Elements>
      ) : (
        <div className="text-center p-8">
            <p className="animate-pulse">Initializing secure payment form...</p>
        </div>
      )}
    </Modal>
  );
};

export default PaymentFormModal;