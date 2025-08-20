
import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Product, Supplier } from '../types';
import Modal from './Modal';
import { MagicIcon } from './icons';
import { useToasts } from './ToastProvider';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit: Product | null;
  suppliers: Supplier[];
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, productToEdit, suppliers }) => {
  const [formData, setFormData] = useState<Omit<Product, '_id' | '_creationTime'>>({
    name: '',
    category: '',
    supplierId: '' as any,
    stockLevel: 0,
    reorderPoint: 0,
    unit: '',
    barcode: '',
  });

  const { addToast } = useToasts();
  const company = useQuery(api.company.get);
  const enableSmartInventory = company?.enableSmartInventory;
  const [isSuggesting, setIsSuggesting] = useState(false);
  const suggestAttributes = useAction(api.ai.suggestProductAttributes);

  const createProduct = useMutation(api.inventory.createProduct);
  const updateProduct = useMutation(api.inventory.updateProduct);

  useEffect(() => {
    if (productToEdit) {
      setFormData({
        name: productToEdit.name,
        category: productToEdit.category,
        supplierId: productToEdit.supplierId,
        stockLevel: productToEdit.stockLevel,
        reorderPoint: productToEdit.reorderPoint,
        unit: productToEdit.unit || '',
        barcode: productToEdit.barcode || '',
      });
    } else {
      setFormData({ name: '', category: '', supplierId: suppliers[0]?._id, stockLevel: 0, reorderPoint: 0, unit: '', barcode: '' });
    }
  }, [productToEdit, isOpen, suppliers]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name.includes('stock') || name.includes('reorder') ? parseInt(value) || 0 : value }));
  };

  const handleSuggest = async () => {
    if (!formData.name) return;
    setIsSuggesting(true);
    try {
        const result = await suggestAttributes({ productName: formData.name });
        if (result.category) setFormData(prev => ({ ...prev, category: result.category }));
        if (result.unit) setFormData(prev => ({ ...prev, unit: result.unit }));
    } catch (error: any) {
        console.error("Error suggesting details:", error);
        if (error?.data?.kind === 'RateLimitError') {
            addToast("You've made too many AI requests. Please wait a moment before trying again.", 'error');
        } else {
            addToast("AI suggestion failed.", 'error');
        }
    } finally {
        setIsSuggesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId) {
      addToast("Please select a supplier.", 'error');
      return;
    }
    
    const dataToSave = { ...formData, barcode: formData.barcode?.trim() || undefined };

    try {
        if (productToEdit) {
            await updateProduct({ id: productToEdit._id, ...dataToSave });
        } else {
            await createProduct(dataToSave);
        }
        onClose();
    } catch (error: any) {
        console.error("Error saving product:", error);
        addToast(`Error: ${error.data || "Could not save product."}`, 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={productToEdit ? 'Edit Product' : 'Add New Product'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
            <div className="flex justify-between items-center">
                <label htmlFor="name" className="block text-sm font-medium text-gray-300">Product Name</label>
                {enableSmartInventory && (
                    <button type="button" onClick={handleSuggest} disabled={isSuggesting || !formData.name} className="flex items-center space-x-1 text-xs text-blue-400 hover:text-blue-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"><MagicIcon className="w-4 h-4" /><span>{isSuggesting ? 'Thinking...' : 'Suggest Details'}</span></button>
                )}
            </div>
            <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label htmlFor="category" className="block text-sm font-medium text-gray-300">Category</label><input type="text" name="category" id="category" value={formData.category} onChange={handleChange} required placeholder="e.g., Chemicals" className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white" /></div>
            <div><label htmlFor="unit" className="block text-sm font-medium text-gray-300">Unit</label><input type="text" name="unit" id="unit" value={formData.unit} onChange={handleChange} placeholder="e.g., bottle, gallon" className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white" /></div>
        </div>
        <div><label htmlFor="supplierId" className="block text-sm font-medium text-gray-300">Supplier</label><select name="supplierId" id="supplierId" value={formData.supplierId} onChange={handleChange} required className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white"><option value="" disabled>Select a supplier...</option>{suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}</select></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label htmlFor="stockLevel" className="block text-sm font-medium text-gray-300">Current Stock</label><input type="number" name="stockLevel" id="stockLevel" value={formData.stockLevel} onChange={handleChange} required min="0" className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white" /></div>
            <div><label htmlFor="reorderPoint" className="block text-sm font-medium text-gray-300">Reorder Point</label><input type="number" name="reorderPoint" id="reorderPoint" value={formData.reorderPoint} onChange={handleChange} required min="0" className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white" /></div>
        </div>
         <div>
            <label htmlFor="barcode" className="block text-sm font-medium text-gray-300">Barcode / SKU</label>
            <input type="text" name="barcode" id="barcode" value={formData.barcode} onChange={handleChange} placeholder="Scan or enter barcode" className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white" />
        </div>
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
          <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 text-gray-100 rounded-md">Cancel</button>
          <button type="submit" className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md">Save Product</button>
        </div>
      </form>
    </Modal>
  );
};

export default ProductFormModal;