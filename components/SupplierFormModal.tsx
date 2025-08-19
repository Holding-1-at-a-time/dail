import React, { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Supplier } from '../types';
import Modal from './Modal';

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierToEdit: Supplier | null;
}

const SupplierFormModal: React.FC<SupplierFormModalProps> = ({ isOpen, onClose, supplierToEdit }) => {
  const [formData, setFormData] = useState<Omit<Supplier, '_id' | '_creationTime'>>({
    name: '',
    contactEmail: '',
    estimatedLeadTimeDays: undefined,
  });

  const createSupplier = useMutation(api.suppliers.create);
  const updateSupplier = useMutation(api.suppliers.update);

  useEffect(() => {
    if (supplierToEdit) {
      setFormData({
        name: supplierToEdit.name,
        contactEmail: supplierToEdit.contactEmail || '',
        estimatedLeadTimeDays: supplierToEdit.estimatedLeadTimeDays,
      });
    } else {
      setFormData({ name: '', contactEmail: '', estimatedLeadTimeDays: undefined });
    }
  }, [supplierToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value) || undefined : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (supplierToEdit) {
      await updateSupplier({ id: supplierToEdit._id, ...formData });
    } else {
      await createSupplier(formData);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={supplierToEdit ? 'Edit Supplier' : 'Add New Supplier'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300">Supplier Name</label>
            <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-300">Contact Email</label>
                <input type="email" name="contactEmail" id="contactEmail" value={formData.contactEmail} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white" />
            </div>
            <div>
                <label htmlFor="estimatedLeadTimeDays" className="block text-sm font-medium text-gray-300">Est. Lead Time (Days)</label>
                <input type="number" name="estimatedLeadTimeDays" id="estimatedLeadTimeDays" value={formData.estimatedLeadTimeDays || ''} onChange={handleChange} min="0" className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white" />
            </div>
        </div>
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
          <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 text-gray-100 rounded-md">Cancel</button>
          <button type="submit" className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md">Save Supplier</button>
        </div>
      </form>
    </Modal>
  );
};

export default SupplierFormModal;