
import React, { useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { User } from '../types';
import Modal from './Modal';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit: User | null;
}

const UserFormModal: React.FC<UserFormModalProps> = ({ isOpen, onClose, userToEdit }) => {
  const [formData, setFormData] = useState<Omit<User, '_id' | '_creationTime' | 'clerkId'>>({
    name: '',
    email: '',
    role: 'technician',
  });

  const createUser = useMutation(api.users.create);
  const updateUser = useMutation(api.users.update);

  useEffect(() => {
    if (userToEdit) {
      setFormData({
        name: userToEdit.name,
        email: userToEdit.email,
        role: userToEdit.role,
      });
    } else {
      setFormData({
        name: '',
        email: '',
        role: 'technician',
      });
    }
  }, [userToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userToEdit) {
      await updateUser({ id: userToEdit._id, ...formData });
    } else {
      // Note: A real implementation would invite the user via Clerk,
      // and a webhook would create the user record in Convex.
      // This is a simplified admin-only creation for demo purposes.
      alert("In a real app, you would invite this user via email, and they would sign up through Clerk.");
      // await createUser(formData);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={userToEdit ? 'Edit User' : 'Add New User'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-300">Full Name</label>
          <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 text-white"/>
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email Address</label>
          <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required disabled={!!userToEdit} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 text-white disabled:bg-gray-800"/>
           {!userToEdit && <p className="text-xs text-gray-400 mt-1">User will be invited to this email to sign up.</p>}
        </div>
        <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-300">Role</label>
            <select id="role" name="role" value={formData.role} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 text-white">
                <option value="technician">Technician</option>
                <option value="admin">Admin</option>
            </select>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
          <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 text-gray-100 rounded-md">Cancel</button>
          <button type="submit" className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md">Save User</button>
        </div>
      </form>
    </Modal>
  );
};

export default UserFormModal;
