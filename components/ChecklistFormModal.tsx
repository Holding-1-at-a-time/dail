
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Checklist } from '../types';
import Modal from './Modal';
import { PlusIcon, TrashIcon } from './icons';

interface ChecklistFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  checklistToEdit: Checklist | null;
}

const ChecklistFormModal: React.FC<ChecklistFormModalProps> = ({ isOpen, onClose, checklistToEdit }) => {
  const [formData, setFormData] = useState<Omit<Checklist, '_id' | '_creationTime'>>({
    name: '',
    serviceId: '' as any,
    tasks: [],
  });

  const allServices = useQuery(api.services.getAll);
  const createChecklist = useMutation(api.checklists.create);
  const updateChecklist = useMutation(api.checklists.update);

  useEffect(() => {
    if (checklistToEdit) {
      setFormData({
        name: checklistToEdit.name,
        serviceId: checklistToEdit.serviceId,
        tasks: checklistToEdit.tasks || [],
      });
    } else {
      const defaultServiceId = allServices && allServices.length > 0 ? allServices[0]._id : '' as any;
      setFormData({
        name: '',
        serviceId: defaultServiceId,
        tasks: [''], // Start with one empty task
      });
    }
  }, [checklistToEdit, isOpen, allServices]);

  const handleMainChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  
  const handleTaskChange = (index: number, value: string) => {
    setFormData(prev => {
        const newTasks = [...prev.tasks];
        newTasks[index] = value;
        return { ...prev, tasks: newTasks };
    });
  };

  const addTask = () => {
    setFormData(prev => ({ ...prev, tasks: [...prev.tasks, ''] }));
  };
  
  const removeTask = (index: number) => {
    setFormData(prev => ({ ...prev, tasks: prev.tasks.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.serviceId) {
        alert('Please select a service for this checklist.');
        return;
    }
    const finalTasks = formData.tasks.map(t => t.trim()).filter(t => t);
    const dataToSave = { ...formData, tasks: finalTasks };

    if (checklistToEdit) {
      await updateChecklist({ id: checklistToEdit._id, ...dataToSave });
    } else {
      await createChecklist(dataToSave);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={checklistToEdit ? 'Edit Checklist' : 'Add New Checklist'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-300">Checklist Name</label>
          <input
            type="text"
            name="name"
            id="name"
            value={formData.name}
            onChange={handleMainChange}
            required
            placeholder='e.g., "Premium Interior Procedure"'
            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
            <label htmlFor="serviceId" className="block text-sm font-medium text-gray-300">Associated Service</label>
            <select
                id="serviceId"
                name="serviceId"
                value={formData.serviceId}
                onChange={handleMainChange}
                required
                className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
                <option value="" disabled>Select a service...</option>
                {(allServices || []).map(s => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                ))}
            </select>
        </div>

        <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Tasks</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {formData.tasks.map((task, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <input
                            type="text"
                            placeholder={`Task #${index + 1}`}
                            value={task}
                            onChange={e => handleTaskChange(index, e.target.value)}
                            className="w-full bg-gray-700 border-gray-600 rounded-md py-1 px-2 text-sm"
                        />
                         <button type="button" onClick={() => removeTask(index)} className="p-1 text-gray-500 hover:text-red-500">
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
             <button
                type="button"
                onClick={addTask}
                className="mt-3 flex items-center text-sm text-blue-400 hover:text-blue-300"
            >
                <PlusIcon className="w-4 h-4 mr-1" />
                Add Task
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
            Save Checklist
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ChecklistFormModal;
