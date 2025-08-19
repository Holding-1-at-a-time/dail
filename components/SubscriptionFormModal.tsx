import React, { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Subscription, Customer, Service } from '../types';
import Modal from './Modal';
import { Id } from '../convex/_generated/dataModel';

interface SubscriptionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionToEdit: Subscription | null;
  customers: Customer[];
  services: Service[];
}

const SubscriptionFormModal: React.FC<SubscriptionFormModalProps> = ({ isOpen, onClose, subscriptionToEdit, customers, services }) => {
  const [formData, setFormData] = useState({
    customerId: '' as Id<'customers'> | '',
    serviceIds: [] as Id<'services'>[],
    frequency: 'monthly' as Subscription['frequency'],
    price: 0,
    startDate: new Date().toISOString().split('T')[0],
  });
  
  const saveSubscription = useMutation(api.subscriptions.save);

  useEffect(() => {
    if (subscriptionToEdit) {
      setFormData({
        customerId: subscriptionToEdit.customerId,
        serviceIds: subscriptionToEdit.serviceIds,
        frequency: subscriptionToEdit.frequency,
        price: subscriptionToEdit.price,
        startDate: new Date(subscriptionToEdit.startDate).toISOString().split('T')[0],
      });
    } else {
      setFormData({
        customerId: customers[0]?._id || '',
        serviceIds: [],
        frequency: 'monthly',
        price: 0,
        startDate: new Date().toISOString().split('T')[0],
      });
    }
  }, [subscriptionToEdit, isOpen, customers]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'price' ? parseFloat(value) || 0 : value }));
  };

  const handleServiceToggle = (serviceId: Id<'services'>) => {
    setFormData(prev => {
        const newServiceIds = prev.serviceIds.includes(serviceId)
            ? prev.serviceIds.filter(id => id !== serviceId)
            : [...prev.serviceIds, serviceId];
        return { ...prev, serviceIds: newServiceIds };
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || formData.serviceIds.length === 0 || formData.price <= 0) {
        return alert("Please fill out all fields.");
    }
    await saveSubscription({
        id: subscriptionToEdit?._id,
        data: {
            ...formData,
            startDate: new Date(formData.startDate).getTime()
        }
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={subscriptionToEdit ? 'Edit Subscription' : 'Create New Subscription'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div><label htmlFor="customerId" className="block text-sm font-medium text-gray-300">Customer</label><select name="customerId" id="customerId" value={formData.customerId} onChange={handleChange} required className="mt-1 block w-full bg-gray-700 rounded-md py-2 px-3 text-white"><option value="" disabled>Select a customer...</option>{customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}</select></div>
        <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Included Services</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 bg-gray-900 rounded-md max-h-48 overflow-y-auto">{services.map(s => (<div key={s._id} className="flex items-center"><input type="checkbox" id={`sub-service-${s._id}`} checked={formData.serviceIds.includes(s._id)} onChange={() => handleServiceToggle(s._id)} className="h-4 w-4 text-blue-600 bg-gray-700 rounded" /><label htmlFor={`sub-service-${s._id}`} className="ml-2 text-sm text-gray-300">{s.name}</label></div>))}</div>
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div><label htmlFor="frequency" className="block text-sm font-medium text-gray-300">Frequency</label><select name="frequency" id="frequency" value={formData.frequency} onChange={handleChange} className="mt-1 block w-full bg-gray-700 rounded-md py-2 px-3 text-white"><option value="weekly">Weekly</option><option value="biweekly">Bi-Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select></div>
            <div><label htmlFor="price" className="block text-sm font-medium text-gray-300">Price per Cycle ($)</label><input type="number" name="price" id="price" value={formData.price} onChange={handleChange} required min="0.01" step="0.01" className="mt-1 block w-full bg-gray-700 rounded-md py-2 px-3 text-white"/></div>
        </div>
        <div><label htmlFor="startDate" className="block text-sm font-medium text-gray-300">Start Date</label><input type="date" name="startDate" id="startDate" value={formData.startDate} onChange={handleChange} required className="mt-1 block w-full bg-gray-700 rounded-md py-2 px-3 text-white"/></div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
          <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 text-gray-100 rounded-md">Cancel</button>
          <button type="submit" className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md">Save Subscription</button>
        </div>
      </form>
    </Modal>
  );
};

export default SubscriptionFormModal;