import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Product } from '../types';
import Modal from './Modal';

interface InventoryLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

const InventoryLogModal: React.FC<InventoryLogModalProps> = ({ isOpen, onClose, product }) => {
  const logs = useQuery(api.inventory.getLogsForProduct, product ? { productId: product._id } : "skip");

  if (!product) return null;

  const getTypeInfo = (log) => {
    switch(log.type) {
        case 'received': return { text: `+${log.change}`, color: 'text-green-400', label: 'Received' };
        case 'job_deduction': return { text: log.change, color: 'text-red-400', label: `Job #${log.jobId?.substring(0,6)}` };
        case 'manual_adjustment': return { text: log.change > 0 ? `+${log.change}` : log.change, color: 'text-yellow-400', label: 'Adjustment' };
        default: return { text: log.change, color: 'text-gray-400', label: 'Unknown' };
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Inventory History for ${product.name}`}>
      <div className="max-h-96 overflow-y-auto pr-2">
        <table className="min-w-full">
            <thead className="bg-gray-700 sticky top-0"><tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">Type / Reference</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-300 uppercase">Change</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-300 uppercase">New Stock</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-700">
                {logs && logs.length > 0 ? logs.map(log => {
                    const typeInfo = getTypeInfo(log);
                    return (<tr key={log._id}>
                        <td className="px-4 py-2 text-sm text-gray-400">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm">{typeInfo.label}</td>
                        <td className={`px-4 py-2 text-right text-sm font-semibold ${typeInfo.color}`}>{typeInfo.text}</td>
                        <td className="px-4 py-2 text-right text-sm font-bold">{log.newStockLevel}</td>
                    </tr>);
                }) : (
                    <tr><td colSpan={4} className="text-center py-8 text-gray-500 italic">No history for this product.</td></tr>
                )}
            </tbody>
        </table>
      </div>
       <div className="flex justify-end mt-6">
          <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 text-gray-100 rounded-md">Close</button>
        </div>
    </Modal>
  );
};

export default InventoryLogModal;