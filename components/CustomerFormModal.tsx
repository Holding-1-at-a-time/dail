
import React, { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Customer, Vehicle } from '../types';
import Modal from './Modal';
import { PlusIcon, TrashIcon } from './icons';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerToEdit: Customer | null;
  vehiclesForCustomer: Vehicle[] | null;
}

const CustomerFormModal: React.FC<CustomerFormModalProps> = ({ isOpen, onClose, customerToEdit, vehiclesForCustomer }) => {
  const [customerData, setCustomerData] = useState<Omit<Customer, '_id' | '_creationTime'>>({
    name: '',
    phone: '',
    email: '',
    address: '',
    internalNotes: ''
  });
  const [vehicles, setVehicles] = useState<Omit<Vehicle, '_id' | '_creationTime' | 'customerId'>[]>([]);

  const saveCustomer = useMutation(api.customers.saveCustomerWithVehicles);

  useEffect(() => {
    if (isOpen) {
      if (customerToEdit) {
        setCustomerData({
          name: customerToEdit.name,
          phone: customerToEdit.phone,
          email: customerToEdit.email,
          address: customerToEdit.address || '',
          internalNotes: customerToEdit.internalNotes || '',
        });
        setVehicles(vehiclesForCustomer || []);
      } else {
        setCustomerData({
          name: '', phone: '', email: '', address: '', internalNotes: ''
        });
        setVehicles([]);
      }
    }
  }, [customerToEdit, vehiclesForCustomer, isOpen]);

  const handleCustomerChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCustomerData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  
  const handleVehicleChange = (index: number, field: keyof Omit<Vehicle, '_id' | '_creationTime' | 'customerId'>, value: string | number) => {
    const newVehicles = [...vehicles];
    (newVehicles[index] as any)[field] = value;
    setVehicles(newVehicles);
  };

  const addVehicle = () => {
    setVehicles(prev => [...prev, { vin: '', make: '', model: '', year: new Date().getFullYear(), color: '' }]);
  };

  const removeVehicle = (index: number) => {
    setVehicles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveCustomer({
        customerId: customerToEdit?._id,
        customerData,
        vehiclesData: vehicles.map(({vin, make, model, year, color}) => ({vin, make, model, year: Number(year), color}))
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={customerToEdit ? 'Edit Customer' : 'Add New Customer'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300">Full Name</label>
                <input type="text" name="name" id="name" value={customerData.name} onChange={handleCustomerChange} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-blue-500 focus:border-blue-500"/>
            </div>
            <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-300">Phone Number</label>
                <input type="tel" name="phone" id="phone" value={customerData.phone} onChange={handleCustomerChange} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-blue-500 focus:border-blue-500"/>
            </div>
             <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email Address</label>
                <input type="email" name="email" id="email" value={customerData.email} onChange={handleCustomerChange} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-blue-500 focus:border-blue-500"/>
            </div>
             <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-300">Address</label>
                <input type="text" name="address" id="address" value={customerData.address} onChange={handleCustomerChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-blue-500 focus:border-blue-500"/>
            </div>
        </div>
         <div>
            <label htmlFor="internalNotes" className="block text-sm font-medium text-gray-300">Internal Notes</label>
            <textarea name="internalNotes" id="internalNotes" value={customerData.internalNotes} onChange={handleCustomerChange} rows={2} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-blue-500 focus:border-blue-500"></textarea>
        </div>

        {/* Vehicle Details */}
        <div className="pt-4 border-t border-gray-700">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Vehicles</h4>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {vehicles.map((vehicle, index) => (
                    <div key={index} className="p-3 bg-gray-900 rounded-md grid grid-cols-12 gap-x-3 gap-y-2 relative">
                        <div className="col-span-12 md:col-span-6">
                            <label className="text-xs text-gray-400">Make</label>
                            <input type="text" value={vehicle.make} onChange={e => handleVehicleChange(index, 'make', e.target.value)} required className="mt-1 w-full bg-gray-700 border-gray-600 rounded-md py-1 px-2 text-sm"/>
                        </div>
                        <div className="col-span-12 md:col-span-6">
                            <label className="text-xs text-gray-400">Model</label>
                            <input type="text" value={vehicle.model} onChange={e => handleVehicleChange(index, 'model', e.target.value)} required className="mt-1 w-full bg-gray-700 border-gray-600 rounded-md py-1 px-2 text-sm"/>
                        </div>
                        <div className="col-span-6 md:col-span-3">
                            <label className="text-xs text-gray-400">Year</label>
                            <input type="number" value={vehicle.year} onChange={e => handleVehicleChange(index, 'year', parseInt(e.target.value) || new Date().getFullYear())} required className="mt-1 w-full bg-gray-700 border-gray-600 rounded-md py-1 px-2 text-sm"/>
                        </div>
                        <div className="col-span-6 md:col-span-3">
                            <label className="text-xs text-gray-400">Color</label>
                            <input type="text" value={vehicle.color || ''} onChange={e => handleVehicleChange(index, 'color', e.target.value)} className="mt-1 w-full bg-gray-700 border-gray-600 rounded-md py-1 px-2 text-sm"/>
                        </div>
                         <div className="col-span-12 md:col-span-6">
                            <label className="text-xs text-gray-400">VIN</label>
                            <input type="text" value={vehicle.vin} onChange={e => handleVehicleChange(index, 'vin', e.target.value)} required className="mt-1 w-full bg-gray-700 border-gray-600 rounded-md py-1 px-2 text-sm"/>
                        </div>
                        <button type="button" onClick={() => removeVehicle(index)} className="absolute top-2 right-2 p-1 text-gray-500 hover:text-red-500">
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
            {vehicles.length === 0 && <p className="text-sm text-gray-500 italic text-center py-4">No vehicles added for this customer.</p>}
            <button type="button" onClick={addVehicle} className="mt-3 flex items-center text-sm text-blue-400 hover:text-blue-300">
                <PlusIcon className="w-4 h-4 mr-1" /> Add Vehicle
            </button>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 text-gray-100 rounded-md transition-colors">
            Cancel
          </button>
          <button type="submit" className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors">
            Save Customer
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CustomerFormModal;
