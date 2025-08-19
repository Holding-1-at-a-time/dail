import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { Service, Product } from '../types';
import Modal from './Modal';
import { MagicIcon, PlusIcon, TrashIcon, LightBulbIcon } from './icons';

interface ServiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceToEdit: Service | null;
  products: Product[];
}

const ServiceFormModal: React.FC<ServiceFormModalProps> = ({ isOpen, onClose, serviceToEdit, products }) => {
  const [formData, setFormData] = useState<Omit<Service, '_id' | '_creationTime'>>({
    name: '',
    description: '',
    basePrice: 0,
    isPackage: false,
    serviceIds: [],
    isDealerPackage: false,
    estimatedDurationHours: 1,
    productsUsed: [],
  });
  
  const company = useQuery(api.company.get);
  const enableSmartInventory = company?.enableSmartInventory;
  const learnedSuggestions = useQuery(api.learning.getLearnedSuggestionsForService, serviceToEdit ? { serviceId: serviceToEdit._id } : "skip");

  const allServices = useQuery(api.services.getAll);
  const createService = useMutation(api.services.create);
  const updateService = useMutation(api.services.update);
  const generateDescriptionAction = useAction(api.ai.generateServiceDescription);
  const suggestProductsAction = useAction(api.ai.suggestProductsForService);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuggestingProducts, setIsSuggestingProducts] = useState(false);

  useEffect(() => {
    if (serviceToEdit) {
      setFormData({
        name: serviceToEdit.name,
        description: serviceToEdit.description,
        basePrice: serviceToEdit.basePrice,
        isPackage: serviceToEdit.isPackage,
        serviceIds: serviceToEdit.serviceIds || [],
        isDealerPackage: serviceToEdit.isDealerPackage,
        estimatedDurationHours: serviceToEdit.estimatedDurationHours || 1,
        productsUsed: serviceToEdit.productsUsed || [],
      });
    } else {
      setFormData({
        name: '', description: '', basePrice: 0, isPackage: false, serviceIds: [],
        isDealerPackage: false, estimatedDurationHours: 1, productsUsed: [],
      });
    }
  }, [serviceToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
    }
  };

  const handleServiceSelection = (serviceId: Id<'services'>) => {
    setFormData(prev => ({ ...prev, serviceIds: prev.serviceIds.includes(serviceId) ? prev.serviceIds.filter(id => id !== serviceId) : [...prev.serviceIds, serviceId] }));
  };

  const handleGenerateDescription = async () => {
    if (!formData.name) return alert('Please enter a service name first.');
    setIsGenerating(true);
    try {
        const description = await generateDescriptionAction({ serviceName: formData.name });
        setFormData(prev => ({ ...prev, description: description.trim() }));
    } catch (error: any) {
        console.error("Error generating description:", error);
        if (error?.data?.kind === 'RateLimitError') {
            alert("You've made too many AI requests. Please wait a moment before trying again.");
        } else {
            alert("An error occurred while generating the description.");
        }
    } finally {
        setIsGenerating(false);
    }
  };
  
  const handleProductChange = (index: number, field: 'productId' | 'quantity', value: string | number) => {
    setFormData(prev => {
      const newProductsUsed = [...(prev.productsUsed || [])];
      (newProductsUsed[index] as any)[field] = value;
      return { ...prev, productsUsed: newProductsUsed };
    });
  };

  const addProductUsed = () => {
    if (products.length === 0) return alert("Please add products in the Inventory page first.");
    setFormData(prev => ({ ...prev, productsUsed: [...(prev.productsUsed || []), { productId: products[0]._id, quantity: 1 }] }));
  };

  const removeProductUsed = (index: number) => {
    setFormData(prev => ({ ...prev, productsUsed: (prev.productsUsed || []).filter((_, i) => i !== index) }));
  };

  const handleSuggestProducts = async () => {
    if (!formData.name) return;
    setIsSuggestingProducts(true);
    try {
        const suggestedIds = await suggestProductsAction({ serviceName: formData.name, serviceDescription: formData.description });
        setFormData(prev => {
            const currentProductIds = new Set((prev.productsUsed || []).map(p => p.productId));
            const newProductsToAdd = suggestedIds
                .filter(id => !currentProductIds.has(id))
                .map(productId => ({ productId, quantity: 1 }));
            return { ...prev, productsUsed: [...(prev.productsUsed || []), ...newProductsToAdd] };
        });
    } catch (error: any) {
        console.error("Error suggesting products:", error);
        if (error?.data?.kind === 'RateLimitError') {
            alert("You've made too many AI requests. Please wait a moment before trying again.");
        } else {
            alert("An error occurred while suggesting products.");
        }
    } finally {
        setIsSuggestingProducts(false);
    }
  };
  
  const addLearnedProduct = (productId: Id<'products'>) => {
    setFormData(prev => {
        const productExists = (prev.productsUsed || []).some(p => p.productId === productId);
        if (productExists) return prev;
        return {
            ...prev,
            productsUsed: [...(prev.productsUsed || []), { productId, quantity: 1 }]
        };
    });
  };

  const availableLearnedSuggestions = useMemo(() => {
    if (!learnedSuggestions) return [];
    const currentProductIds = new Set((formData.productsUsed || []).map(p => p.productId));
    return learnedSuggestions.filter(suggestion => !currentProductIds.has(suggestion._id));
  }, [learnedSuggestions, formData.productsUsed]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (serviceToEdit) await updateService({ id: serviceToEdit._id, ...formData });
    else await createService(formData);
    onClose();
  };
  
  const availableServicesForPackage = allServices?.filter(s => !s.isPackage && s._id !== serviceToEdit?._id) || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={serviceToEdit ? 'Edit Service' : 'Add New Service'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-300">Service Name</label>
          <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
        </div>
        <div>
            <div className="flex justify-between items-center mb-1">
                 <label htmlFor="description" className="block text-sm font-medium text-gray-300">Description</label>
                 <button type="button" onClick={handleGenerateDescription} disabled={isGenerating || !formData.name} className="flex items-center space-x-1 text-xs text-blue-400 hover:text-blue-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"><MagicIcon className="w-4 h-4" /><span>{isGenerating ? 'Generating...' : 'Suggest'}</span></button>
            </div>
          <textarea name="description" id="description" value={formData.description} onChange={handleChange} rows={3} required className="block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"></textarea>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="basePrice" className="block text-sm font-medium text-gray-300">Base Price ($)</label>
            <input type="number" name="basePrice" id="basePrice" value={formData.basePrice} onChange={handleChange} required min="0" step="0.01" className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
          </div>
          <div>
            <label htmlFor="estimatedDurationHours" className="block text-sm font-medium text-gray-300">Est. Duration (hrs)</label>
            <input type="number" name="estimatedDurationHours" id="estimatedDurationHours" value={formData.estimatedDurationHours} onChange={handleChange} required min="0.5" step="0.5" className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"/>
          </div>
        </div>

        <div className="flex items-center space-x-8">
            <div className="flex items-center"><input id="isPackage" name="isPackage" type="checkbox" checked={formData.isPackage} onChange={handleChange} className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500" /><label htmlFor="isPackage" className="ml-2 block text-sm text-gray-300">Is a Package?</label></div>
            <div className="flex items-center"><input id="isDealerPackage" name="isDealerPackage" type="checkbox" checked={formData.isDealerPackage} onChange={handleChange} className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500" /><label htmlFor="isDealerPackage" className="ml-2 block text-sm text-gray-300">Dealer Package?</label></div>
        </div>

        {formData.isPackage && (
          <div><h4 className="text-sm font-medium text-gray-300 mb-2">Included Services</h4><div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 bg-gray-900 rounded-md max-h-48 overflow-y-auto">{availableServicesForPackage.map(s => (<div key={s._id} className="flex items-center"><input type="checkbox" id={`service-${s._id}`} checked={formData.serviceIds.includes(s._id)} onChange={() => handleServiceSelection(s._id)} className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500" /><label htmlFor={`service-${s._id}`} className="ml-2 text-sm text-gray-300">{s.name}</label></div>))}</div></div>
        )}
        
        <div className="pt-4 border-t border-gray-700">
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-gray-300">Products Consumed</h4>
                {enableSmartInventory && (
                    <button type="button" onClick={handleSuggestProducts} disabled={isSuggestingProducts || !formData.name} className="flex items-center space-x-1 text-xs text-blue-400 hover:text-blue-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"><MagicIcon className="w-4 h-4" /><span>{isSuggestingProducts ? 'Suggesting...' : 'AI Suggest Products'}</span></button>
                )}
            </div>
            
            {serviceToEdit && availableLearnedSuggestions && availableLearnedSuggestions.length > 0 && (
              <div className="mb-4 p-3 bg-gray-900 rounded-md">
                  <h5 className="text-xs font-semibold text-gray-400 mb-2 flex items-center">
                      <LightBulbIcon className="w-4 h-4 mr-2 text-yellow-400" />
                      Suggestions from past jobs (click to add):
                  </h5>
                  <div className="flex flex-wrap gap-2">
                      {availableLearnedSuggestions.map(product => (
                          <button
                              key={product._id}
                              type="button"
                              onClick={() => addLearnedProduct(product._id)}
                              className="text-xs px-2 py-1 rounded-full border bg-gray-700 border-gray-600 hover:bg-yellow-600 hover:border-yellow-500 hover:text-white transition-colors"
                          >
                              {product.name}
                          </button>
                      ))}
                  </div>
              </div>
            )}

            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {(formData.productsUsed || []).map((p, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-900 rounded-md">
                        <select value={p.productId} onChange={(e) => handleProductChange(index, 'productId', e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md py-1 px-2 text-sm">
                            {products.map(prod => <option key={prod._id} value={prod._id}>{prod.name} (Stock: {prod.stockLevel})</option>)}
                        </select>
                        <input type="number" value={p.quantity} min="0.1" step="0.1" onChange={(e) => handleProductChange(index, 'quantity', parseFloat(e.target.value))} className="w-24 bg-gray-700 border-gray-600 rounded-md py-1 px-2 text-sm" />
                        <button type="button" onClick={() => removeProductUsed(index)} className="p-1 text-gray-500 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                    </div>
                ))}
            </div>
            <button type="button" onClick={addProductUsed} className="mt-3 flex items-center text-sm text-blue-400 hover:text-blue-300"><PlusIcon className="w-4 h-4 mr-1" />Add Product</button>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 text-gray-100 rounded-md transition-colors">Cancel</button>
          <button type="submit" className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors">Save Service</button>
        </div>
      </form>
    </Modal>
  );
};

export default ServiceFormModal;