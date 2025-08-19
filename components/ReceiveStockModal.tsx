import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Product } from '../types';
import Modal from './Modal';
import { Id } from '../convex/_generated/dataModel';
import { BarcodeIcon, TrashIcon } from './icons';
import BarcodeScannerModal from './BarcodeScannerModal';

interface ReceiveStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

type ReceiveItem = {
    productId: Id<'products'>;
    productName: string;
    quantity: number;
    costPerUnit?: number;
    notes?: string;
};

const ReceiveStockModal: React.FC<ReceiveStockModalProps> = ({ isOpen, onClose, products }) => {
  const [items, setItems] = useState<ReceiveItem[]>([]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [manualAddProductId, setManualAddProductId] = useState<Id<'products'> | ''>('');
  
  const receiveStock = useMutation(api.inventory.receiveMultipleStockItems);
  const productByBarcode = useQuery(api.inventory.getProductByBarcode, 'skip');

  useEffect(() => {
    if (isOpen) {
        setItems([]);
        setManualAddProductId(products[0]?._id || '');
    }
  }, [isOpen, products]);

  const handleAddItem = (product: Product) => {
    if (items.some(item => item.productId === product._id)) {
        alert(`${product.name} is already in the list.`);
        return;
    }
    setItems(prev => [...prev, {
        productId: product._id,
        productName: product.name,
        quantity: 1,
    }]);
  };

  const handleManualAdd = () => {
    if (!manualAddProductId) return;
    const product = products.find(p => p._id === manualAddProductId);
    if (product) handleAddItem(product);
  };
  
  const handleItemChange = (index: number, field: 'quantity' | 'costPerUnit' | 'notes', value: string | number) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };
  
  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleScanSuccess = async (decodedText: string) => {
      setIsScannerOpen(false);
      const product = await productByBarcode({ barcode: decodedText });
      if (product) {
          handleAddItem(product);
      } else {
          alert(`No product found with barcode: ${decodedText}`);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return alert("Please add at least one product to receive.");
    
    await receiveStock({ items: items.map(({ productName, ...rest }) => rest) });
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Receive Stock">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center gap-2">
            <select value={manualAddProductId} onChange={e => setManualAddProductId(e.target.value as Id<'products'>)} className="w-full bg-gray-700 rounded-md py-2 px-3 text-white">
                {products.map(p => (<option key={p._id} value={p._id}>{p.name}</option>))}
            </select>
            <button type="button" onClick={handleManualAdd} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-sm">Add</button>
            <button type="button" onClick={() => setIsScannerOpen(true)} className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg" title="Scan Barcode">
                <BarcodeIcon className="w-6 h-6 text-white"/>
            </button>
          </div>
          
          <div className="space-y-3 max-h-80 overflow-y-auto pr-2 border-t border-b border-gray-700 py-4">
              {items.length > 0 ? items.map((item, index) => (
                  <div key={item.productId} className="p-3 bg-gray-900 rounded-md grid grid-cols-12 gap-x-3 gap-y-2 relative">
                    <div className="col-span-12 font-semibold">{item.productName}</div>
                    <div className="col-span-4"><label className="text-xs text-gray-400">Quantity</label><input type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)} required min="1" className="mt-1 w-full bg-gray-700 border-gray-600 rounded-md py-1 px-2 text-sm"/></div>
                    <div className="col-span-4"><label className="text-xs text-gray-400">Cost/Unit</label><input type="number" value={item.costPerUnit || ''} onChange={e => handleItemChange(index, 'costPerUnit', parseFloat(e.target.value) || 0)} min="0" step="0.01" className="mt-1 w-full bg-gray-700 border-gray-600 rounded-md py-1 px-2 text-sm"/></div>
                    <div className="col-span-4"><label className="text-xs text-gray-400">Notes</label><input type="text" value={item.notes || ''} onChange={e => handleItemChange(index, 'notes', e.target.value)} placeholder="e.g., PO #123" className="mt-1 w-full bg-gray-700 border-gray-600 rounded-md py-1 px-2 text-sm"/></div>
                    <button type="button" onClick={() => handleRemoveItem(index)} className="absolute top-2 right-2 p-1 text-gray-500 hover:text-red-500"><TrashIcon className="w-4 h-4" /></button>
                  </div>
              )) : (
                <p className="text-center text-gray-500 py-8">Add products to the list using the controls above.</p>
              )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 text-gray-100 rounded-md">Cancel</button>
            <button type="submit" disabled={items.length === 0} className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:bg-gray-500">Add to Inventory</button>
          </div>
        </form>
      </Modal>
      <BarcodeScannerModal 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        onScanSuccess={handleScanSuccess} 
      />
    </>
  );
};

export default ReceiveStockModal;