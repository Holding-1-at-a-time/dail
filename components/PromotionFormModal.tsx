
import React, { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Promotion } from '../types';
import Modal from './Modal';

interface PromotionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  promotionToEdit: Promotion | null;
}

const PromotionFormModal: React.FC<PromotionFormModalProps> = ({ isOpen, onClose, promotionToEdit }) => {
  const [formData, setFormData] = useState<Omit<Promotion, '_id' | '_creationTime'>>({
    code: '',
    type: 'percentage',
    value: 0,
    isActive: true,
  });

  const savePromotion = useMutation(api.marketing.savePromotion);

  useEffect(() => {
    if (promotionToEdit) setFormData({ code: promotionToEdit.code, type: promotionToEdit.type, value: promotionToEdit.value, isActive: promotionToEdit.isActive });
    else setFormData({ code: '', type: 'percentage', value: 0, isActive: true });
  }, [promotionToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    else setFormData(prev => ({ ...prev, [name]: name === 'value' ? parseFloat(value) || 0 : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await savePromotion({ id: promotionToEdit?._id, data: { ...formData, code: formData.code.toUpperCase() } });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={promotionToEdit ? 'Edit Promotion' : 'Add New Promotion'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div><label htmlFor="code" className="block text-sm font-medium text-gray-300">Promo Code</label><input type="text" name="code" id="code" value={formData.code} onChange={handleChange} required placeholder="e.g., SPRING20" className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white uppercase"/></div>
        <div className="grid grid-cols-2 gap-4">
            <div><label htmlFor="type" className="block text-sm font-medium text-gray-300">Discount Type</label><select name="type" id="type" value={formData.type} onChange={handleChange} className="mt-1 block w-full bg-gray-700 rounded-md py-2 px-3 text-white"><option value="percentage">Percentage (%)</option><option value="fixedAmount">Fixed Amount ($)</option></select></div>
            <div><label htmlFor="value" className="block text-sm font-medium text-gray-300">Value</label><input type="number" name="value" id="value" value={formData.value} onChange={handleChange} required min="0" className="mt-1 block w-full bg-gray-700 rounded-md py-2 px-3 text-white"/></div>
        </div>
        <div className="flex items-center"><input id="isActive" name="isActive" type="checkbox" checked={formData.isActive} onChange={handleChange} className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded"/><label htmlFor="isActive" className="ml-2 block text-sm text-gray-300">Active</label></div>
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
          <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 text-gray-100 rounded-md">Cancel</button>
          <button type="submit" className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md">Save Promotion</button>
        </div>
      </form>
    </Modal>
  );
};

export default PromotionFormModal;
