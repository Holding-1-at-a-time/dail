
import React, { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Job, Payment } from '../types';
import Modal from './Modal';

interface PaymentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
}

const PaymentFormModal: React.FC<PaymentFormModalProps> = ({ isOpen, onClose, job }) => {
  const [amount, setAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const savePayment = useMutation(api.jobs.savePayment);

  const amountDue = job ? job.totalAmount - job.paymentReceived : 0;

  useEffect(() => {
    if (job) {
      setAmount(amountDue);
      setNotes('');
    }
  }, [job, isOpen, amountDue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job || amount <= 0) {
        alert("Payment amount must be greater than zero.");
        return;
    };

    const newPayment: Omit<Payment, 'id'> = {
        amount,
        paymentDate: Date.now(),
        method: 'Credit Card', // Hardcoded as the form simulates a card payment
        notes,
    };
    
    await savePayment({ jobId: job._id, payment: newPayment });
    onClose();
  };
  
  if (!job) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Payment for Job #${job._id.substring(0, 6)}`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="p-4 bg-gray-900 rounded-lg grid grid-cols-2 gap-4 text-center">
            <div>
                <p className="text-sm text-gray-400">Total Due</p>
                <p className="text-2xl font-bold text-blue-400">${job.totalAmount.toFixed(2)}</p>
            </div>
             <div>
                <p className="text-sm text-gray-400">Remaining Balance</p>
                <p className="text-2xl font-bold text-yellow-400">${amountDue.toFixed(2)}</p>
            </div>
        </div>

        <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-1">Payment Amount</label>
            <input
                type="number"
                name="amount"
                id="amount"
                value={amount}
                onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                required
                min="0.01"
                step="0.01"
                max={amountDue > 0 ? amountDue.toFixed(2) : undefined}
                className="block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-blue-500 focus:border-blue-500"
            />
        </div>

        <div className="bg-gray-700 p-4 rounded-lg space-y-4">
             <div>
                <label htmlFor="cardNumber" className="block text-xs font-medium text-gray-400">Card Information</label>
                <input type="text" id="cardNumber" placeholder="Card Number" required className="mt-1 block w-full bg-gray-800 border-gray-600 rounded-md py-2 px-3 text-white placeholder-gray-500"/>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <input type="text" id="expiry" placeholder="MM / YY" required className="block w-full bg-gray-800 border-gray-600 rounded-md py-2 px-3 text-white placeholder-gray-500"/>
                </div>
                <div>
                    <input type="text" id="cvc" placeholder="CVC" required className="block w-full bg-gray-800 border-gray-600 rounded-md py-2 px-3 text-white placeholder-gray-500"/>
                </div>
            </div>
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-300">Payment Notes (Optional)</label>
          <textarea
            name="notes"
            id="notes"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g., Transaction ID, etc."
            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-blue-500 focus:border-blue-500"
          ></textarea>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 bg-gray-600 hover:bg-gray-700 text-gray-100 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Pay ${amount > 0 ? amount.toFixed(2) : '0.00'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default PaymentFormModal;
