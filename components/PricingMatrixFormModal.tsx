
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { PricingMatrix, PricingRule, Service } from '../types';
import Modal from './Modal';
import { PlusIcon, TrashIcon } from './icons';

interface PricingMatrixFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  matrixToEdit: PricingMatrix | null;
}

const PricingMatrixFormModal: React.FC<PricingMatrixFormModalProps> = ({ isOpen, onClose, matrixToEdit }) => {
  const [formData, setFormData] = useState<Omit<PricingMatrix, '_id' | '_creationTime'>>({
    name: '',
    appliesToServiceIds: [],
    rules: [],
  });

  const allServices = useQuery(api.services.getAll);
  const createMatrix = useMutation(api.pricing.createMatrix);
  const updateMatrix = useMutation(api.pricing.updateMatrix);

  useEffect(() => {
    if (matrixToEdit) {
      setFormData({
        name: matrixToEdit.name,
        appliesToServiceIds: matrixToEdit.appliesToServiceIds || [],
        rules: matrixToEdit.rules || [],
      });
    } else {
      setFormData({
        name: '',
        appliesToServiceIds: [],
        rules: [{ id: `new_${Date.now()}`, factor: '', adjustmentType: 'fixedAmount', adjustmentValue: 0 }],
      });
    }
  }, [matrixToEdit, isOpen]);

  const handleMainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  
  const handleServiceSelection = (serviceId: Id<'services'>) => {
    setFormData(prev => {
        const newServiceIds = prev.appliesToServiceIds.includes(serviceId)
            ? prev.appliesToServiceIds.filter(id => id !== serviceId)
            : [...prev.appliesToServiceIds, serviceId];
        return { ...prev, appliesToServiceIds: newServiceIds };
    });
  };

  const handleRuleChange = (ruleId: string, field: keyof Omit<PricingRule, 'id'>, value: string | number) => {
    setFormData(prev => ({
        ...prev,
        rules: prev.rules.map(rule => 
            rule.id === ruleId ? { ...rule, [field]: value } : rule
        )
    }));
  };

  const addRule = () => {
    setFormData(prev => ({
        ...prev,
        rules: [...prev.rules, { id: `new_${Date.now()}`, factor: '', adjustmentType: 'fixedAmount', adjustmentValue: 0 }]
    }));
  };
  
  const removeRule = (ruleId: string) => {
    setFormData(prev => ({
        ...prev,
        rules: prev.rules.filter(rule => rule.id !== ruleId)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (matrixToEdit) {
        await updateMatrix({ id: matrixToEdit._id, ...formData });
    } else {
        await createMatrix(formData);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={matrixToEdit ? 'Edit Pricing Matrix' : 'Add New Pricing Matrix'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-300">Matrix Name</label>
          <input
            type="text"
            name="name"
            id="name"
            value={formData.name}
            onChange={handleMainChange}
            required
            placeholder='e.g., "Vehicle Size"'
            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Apply to Services</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 bg-gray-900 rounded-md max-h-48 overflow-y-auto">
              {(allServices || []).map(s => (
                <div key={s._id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`matrix-service-${s._id}`}
                    checked={formData.appliesToServiceIds.includes(s._id)}
                    onChange={() => handleServiceSelection(s._id)}
                    className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor={`matrix-service-${s._id}`} className="ml-2 text-sm text-gray-300">{s.name}</label>
                </div>
              ))}
            </div>
        </div>

        <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Pricing Rules</h4>
            <div className="space-y-3">
                {formData.rules.map((rule, index) => (
                    <div key={rule.id} className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-900 rounded-md">
                        <div className="col-span-5">
                            <label className="text-xs text-gray-400">Factor</label>
                            <input
                                type="text"
                                placeholder='e.g., "SUV"'
                                value={rule.factor}
                                onChange={e => handleRuleChange(rule.id, 'factor', e.target.value)}
                                className="mt-1 w-full bg-gray-700 border-gray-600 rounded-md py-1 px-2 text-sm"
                            />
                        </div>
                        <div className="col-span-3">
                             <label className="text-xs text-gray-400">Type</label>
                            <select 
                                value={rule.adjustmentType}
                                onChange={e => handleRuleChange(rule.id, 'adjustmentType', e.target.value)}
                                className="mt-1 w-full bg-gray-700 border-gray-600 rounded-md py-1 px-2 text-sm"
                            >
                                <option value="fixedAmount">Fixed ($)</option>
                                <option value="percentage">Percent (%)</option>
                            </select>
                        </div>
                        <div className="col-span-3">
                             <label className="text-xs text-gray-400">Value</label>
                            <input
                                type="number"
                                placeholder='e.g., 25'
                                value={rule.adjustmentValue}
                                onChange={e => handleRuleChange(rule.id, 'adjustmentValue', parseFloat(e.target.value) || 0)}
                                className="mt-1 w-full bg-gray-700 border-gray-600 rounded-md py-1 px-2 text-sm"
                            />
                        </div>
                        <div className="col-span-1 flex items-end justify-center">
                           {formData.rules.length > 1 && (
                             <button type="button" onClick={() => removeRule(rule.id)} className="p-1 text-gray-500 hover:text-red-500">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                           )}
                        </div>
                    </div>
                ))}
            </div>
             <button
                type="button"
                onClick={addRule}
                className="mt-3 flex items-center text-sm text-blue-400 hover:text-blue-300"
            >
                <PlusIcon className="w-4 h-4 mr-1" />
                Add Rule
            </button>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
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
            Save Matrix
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default PricingMatrixFormModal;
