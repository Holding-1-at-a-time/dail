import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { Job, Customer, Vehicle, Service, PricingMatrix, Upcharge, JobItem, PricingRule, Promotion, Product } from '../types';
import Modal from './Modal';
import { PlusIcon, TrashIcon, SparklesIcon, ExclamationTriangleIcon } from './icons';
import CustomerFormModal from './CustomerFormModal';

interface JobFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobToEdit: Job | null;
}

const JobFormModal: React.FC<JobFormModalProps> = ({ isOpen, onClose, jobToEdit }) => {
  const [formData, setFormData] = useState<Partial<Omit<Job, '_id' | '_creationTime' | 'jobItems' | 'totalAmount' | 'paymentReceived' | 'paymentStatus'>>>({
    customerId: undefined,
    vehicleId: undefined,
    status: 'estimate',
    estimateDate: Date.now(),
    notes: '',
    appliedPromotionId: undefined,
    discountAmount: 0,
  });
  const [jobItems, setJobItems] = useState<JobItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<Id<'customers'> | ''>('');
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  
  const [visualQuoteFiles, setVisualQuoteFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const [currentJobId, setCurrentJobId] = useState<Id<'jobs'> | null>(null);
  
  const data = useQuery(api.jobs.getDataForForm);
  const currentJob = useQuery(api.jobs.get, currentJobId ? { id: currentJobId } : "skip");

  const saveJob = useMutation(api.jobs.save);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const createDraftJob = useMutation(api.jobs.createDraft);
  const initiateVisualQuote = useMutation(api.jobs.initiateVisualQuote);

  const customers = data?.customers ?? [];
  const vehicles = data?.vehicles ?? [];
  const services = data?.services ?? [];
  const pricingMatrices = data?.pricingMatrices ?? [];
  const upcharges = data?.upcharges ?? [];
  const promotions = data?.promotions ?? [];
  const products = data?.products ?? [];

  const availableVehicles = useMemo(() => {
    return vehicles.filter(v => v.customerId === selectedCustomerId);
  }, [selectedCustomerId, vehicles]);

  useEffect(() => {
    if (isOpen) {
      if (jobToEdit) {
        setCurrentJobId(jobToEdit._id);
        setFormData({
          customerId: jobToEdit.customerId,
          vehicleId: jobToEdit.vehicleId,
          status: jobToEdit.status,
          estimateDate: jobToEdit.estimateDate,
          notes: jobToEdit.notes || '',
          appliedPromotionId: jobToEdit.appliedPromotionId,
          discountAmount: jobToEdit.discountAmount,
        });
        setSelectedCustomerId(jobToEdit.customerId);
        setJobItems(jobToEdit.jobItems);
        const appliedPromo = promotions.find(p => p._id === jobToEdit.appliedPromotionId);
        setPromoCode(appliedPromo?.code || '');
      } else {
        setCurrentJobId(null);
        setFormData({ status: 'estimate', estimateDate: Date.now(), notes: '', discountAmount: 0 });
        setJobItems([]);
        setSelectedCustomerId('');
        setPromoCode('');
      }
      setVisualQuoteFiles([]);
      setIsUploading(false);
    }
  }, [jobToEdit, isOpen, promotions]);

  useEffect(() => {
      if (currentJob) {
        setJobItems(currentJob.jobItems);
        setFormData(prev => ({ ...prev, totalAmount: currentJob.totalAmount }));
      }
  }, [currentJob]);
  
  const subtotal = useMemo(() => jobItems.reduce((acc, item) => acc + item.total, 0), [jobItems]);

  const { discountAmount, appliedPromotionId } = useMemo(() => {
    const promo = promotions.find(p => p.code.toLowerCase() === promoCode.toLowerCase() && p.isActive);
    if (!promo) return { discountAmount: 0, appliedPromotionId: undefined };

    let discount = promo.type === 'percentage' ? subtotal * (promo.value / 100) : promo.value;
    discount = Math.min(discount, subtotal);
    return { discountAmount: discount, appliedPromotionId: promo._id };
  }, [promoCode, promotions, subtotal]);

  const totalAmount = useMemo(() => subtotal - discountAmount, [subtotal, discountAmount]);

  const inventoryWarnings = useMemo(() => {
    const warnings = new Set<string>();
    jobItems.forEach(item => {
        const service = services.find(s => s._id === item.serviceId);
        service?.productsUsed?.forEach(pu => {
            const product = products.find(p => p._id === pu.productId);
            if (product && product.stockLevel <= 0) {
                warnings.add(`'${product.name}' is out of stock.`);
            }
        });
    });
    return Array.from(warnings);
  }, [jobItems, services, products]);

  const handleMainChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'customerId') {
      setSelectedCustomerId(value as Id<'customers'>);
      setFormData(prev => ({...prev, vehicleId: undefined}));
    }
  };

  const addServiceItem = (serviceId: Id<'services'>) => {
    const service = services.find(s => s._id === serviceId);
    if (!service) return;

    const newItem: JobItem = {
        id: `item_${Date.now()}`,
        serviceId: service._id,
        quantity: 1,
        unitPrice: service.basePrice,
        appliedPricingRuleIds: [],
        addedUpchargeIds: [],
        total: service.basePrice
    };
    setJobItems(prev => [...prev, newItem]);
  };
  
  const removeJobItem = (itemId: string) => {
    setJobItems(prev => prev.filter(item => item.id !== itemId));
  };
  
  const getApplicableRules = (serviceId: Id<'services'>) => {
    return pricingMatrices
      .filter(matrix => matrix.appliesToServiceIds.includes(serviceId))
      .map(matrix => ({ matrixId: matrix._id, matrixName: matrix.name, rules: matrix.rules }));
  }

  const handleRuleToggle = (itemId: string, ruleId: string) => {
    setJobItems(items => items.map(item => {
        if (item.id !== itemId) return item;
        const newRuleIds = item.appliedPricingRuleIds.includes(ruleId) ? item.appliedPricingRuleIds.filter(id => id !== ruleId) : [...item.appliedPricingRuleIds, ruleId];
        return { ...item, appliedPricingRuleIds: newRuleIds };
    }));
  };
  
  const handleUpchargeToggle = (itemId: string, upchargeId: Id<'upcharges'>) => {
      setJobItems(items => items.map(item => {
        if (item.id !== itemId) return item;
        const newUpchargeIds = item.addedUpchargeIds.includes(upchargeId) ? item.addedUpchargeIds.filter(id => id !== upchargeId) : [...item.addedUpchargeIds, upchargeId];
        return { ...item, addedUpchargeIds: newUpchargeIds };
    }));
  };

  useEffect(() => {
    const allRules = pricingMatrices.flatMap(m => m.rules);
    setJobItems(currentItems => currentItems.map(item => {
        let newTotal = item.unitPrice * item.quantity;
        item.appliedPricingRuleIds.forEach(ruleId => {
            const rule = allRules.find(r => r.id === ruleId);
            if (!rule) return;
            newTotal += rule.adjustmentType === 'fixedAmount' ? rule.adjustmentValue : newTotal * (rule.adjustmentValue / 100);
        });
        item.addedUpchargeIds.forEach(upchargeId => {
            const upcharge = upcharges.find(u => u._id === upchargeId);
            if (!upcharge) return;
            newTotal += upcharge.isPercentage ? newTotal * (upcharge.defaultAmount / 100) : upcharge.defaultAmount;
        });
        return { ...item, total: newTotal };
    }));
  }, [jobItems.map(i=>i.appliedPricingRuleIds).join(','), jobItems.map(i=>i.addedUpchargeIds).join(','), pricingMatrices, upcharges]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || !formData.vehicleId) {
      alert("Please select a customer and vehicle.");
      return;
    }
    const finalJobData = {
        ...formData,
        customerId: formData.customerId as Id<'customers'>,
        vehicleId: formData.vehicleId as Id<'vehicles'>,
        jobItems,
        appliedPromotionId,
        discountAmount,
        totalAmount,
    };
    await saveJob({ id: currentJobId ?? undefined, ...finalJobData });
    onClose();
  };
  
  const alreadyAddedServiceIds = useMemo(() => new Set(jobItems.map(item => item.serviceId)), [jobItems]);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => e.target.files && setVisualQuoteFiles(Array.from(e.target.files));

  const handleVisualQuote = async () => {
    if (visualQuoteFiles.length === 0) return alert("Please upload at least one photo.");
    if (!formData.customerId || !formData.vehicleId) {
        return alert("Please select a customer and vehicle first.");
    }
    setIsUploading(true);
    try {
        let jobIdToUse = currentJobId;
        if (!jobIdToUse) {
            jobIdToUse = await createDraftJob({
                customerId: formData.customerId as Id<'customers'>,
                vehicleId: formData.vehicleId as Id<'vehicles'>,
            });
            setCurrentJobId(jobIdToUse);
        }

        const storageIds = await Promise.all(visualQuoteFiles.map(async (file) => {
            const postUrl = await generateUploadUrl();
            const result = await fetch(postUrl, { method: "POST", headers: { 'Content-Type': file.type }, body: file });
            const { storageId } = await result.json();
            return storageId;
        }));

        await initiateVisualQuote({ jobId: jobIdToUse, storageIds });
        setVisualQuoteFiles([]);
    } catch (error: any) {
        console.error("Error with Visual Quoting:", error);
        if (error?.data?.kind === 'RateLimitError') {
            alert("You have exceeded the limit for photo analysis. Please wait a moment before trying again.");
        } else {
            alert("Failed to start photo analysis. Please check the console for details.");
        }
    } finally {
        setIsUploading(false);
    }
  };

  const renderVisualQuoteStatus = () => {
    if (isUploading) {
      return <p className="text-center text-sm text-blue-300 animate-pulse">Uploading photos...</p>;
    }
    switch(currentJob?.visualQuoteStatus) {
        case 'pending':
            return <div className="flex items-center justify-center text-sm text-blue-300 animate-pulse"><svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Analyzing in background...</div>;
        case 'failed':
            return <div className="text-center"><p className="text-sm text-red-400 mb-2">Analysis failed. Please try again.</p><button type="button" onClick={handleVisualQuote} className="w-full flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"><SparklesIcon className="w-5 h-5 mr-2" />Retry Analysis</button></div>
        case 'complete':
            return <p className="text-center text-sm text-green-400">AI analysis complete. Review suggested items below.</p>;
        default:
             return <button type="button" onClick={handleVisualQuote} disabled={isUploading || visualQuoteFiles.length === 0} className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm disabled:bg-gray-500 disabled:cursor-not-allowed"><SparklesIcon className="w-5 h-5 mr-2" />Analyze Photos & Suggest Services</button>;
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={jobToEdit ? 'Edit Job/Estimate' : 'Create New Job/Estimate'}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <label htmlFor="customerId" className="block text-sm font-medium text-gray-300">Customer</label>
                  <div className="flex items-center space-x-2 mt-1">
                      <select id="customerId" name="customerId" value={selectedCustomerId} onChange={handleMainChange} required className="block w-full bg-gray-700 rounded-md py-2 px-3 text-white focus:ring-blue-500 focus:border-blue-500">
                          <option value="" disabled>Select a customer...</option>
                          {customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                       <button type="button" onClick={() => setIsCustomerModalOpen(true)} className="flex-shrink-0 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-3 rounded-lg text-sm transition-colors">New</button>
                  </div>
              </div>
              <div>
                  <label htmlFor="vehicleId" className="block text-sm font-medium text-gray-300">Vehicle</label>
                  <select id="vehicleId" name="vehicleId" value={formData.vehicleId || ''} onChange={handleMainChange} required disabled={!selectedCustomerId} className="mt-1 block w-full bg-gray-700 rounded-md py-2 px-3 text-white focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-800 disabled:text-gray-500">
                      <option value="" disabled>Select a vehicle...</option>
                      {availableVehicles.map(v => <option key={v._id} value={v._id}>{`${v.year} ${v.make} ${v.model}`}</option>)}
                  </select>
              </div>
          </div>
          
          <div className="pt-4 border-t border-gray-700">
            <h3 className="text-lg font-medium text-gray-200 mb-2">Visual Quoting (AI Assist)</h3>
            <div className="p-4 bg-gray-900 rounded-md space-y-3">
              <div>
                <label htmlFor="visual-quote-files" className={`cursor-pointer bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg text-center text-sm w-full block ${(!formData.customerId || !formData.vehicleId) && 'opacity-50 cursor-not-allowed'}`}>{visualQuoteFiles.length > 0 ? `${visualQuoteFiles.length} photo(s) selected` : "Upload Vehicle Photos"}</label>
                <input id="visual-quote-files" type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" disabled={!formData.customerId || !formData.vehicleId} />
                {(!formData.customerId || !formData.vehicleId) && <p className="text-xs text-center text-yellow-400 mt-2">Please select a customer and vehicle to enable uploads.</p>}
              </div>
              {visualQuoteFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">{visualQuoteFiles.map((file, index) => <img key={index} src={URL.createObjectURL(file)} alt={`preview ${index}`} className="w-16 h-16 rounded-md object-cover" />)}</div>
              )}
              {renderVisualQuoteStatus()}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-700">
              <h3 className="text-lg font-medium text-gray-200 mb-2">Line Items</h3>
              {inventoryWarnings.length > 0 && (
                  <div className="p-3 bg-yellow-900/50 border border-yellow-700 rounded-lg mb-4">
                      <h4 className="font-bold text-yellow-300 text-sm flex items-center"><ExclamationTriangleIcon className="w-5 h-5 mr-2" />Inventory Warning</h4>
                      <ul className="list-disc list-inside text-yellow-200 text-sm mt-1">
                          {inventoryWarnings.map(warning => <li key={warning}>{warning}</li>)}
                      </ul>
                  </div>
              )}
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                  {jobItems.map(item => {
                      const service = services.find(s => s._id === item.serviceId);
                      const applicableRules = getApplicableRules(item.serviceId);
                      if (!service) return null;
                      return (
                          <div key={item.id} className="p-3 bg-gray-900 rounded-md space-y-3">
                              <div className="flex justify-between items-start">
                                  <div>
                                      <h4 className="font-bold text-white">{service.name}</h4>
                                      <p className="text-xs text-gray-400">Base: ${item.unitPrice.toFixed(2)}</p>
                                  </div>
                                  <div className="text-right">
                                      <p className="font-mono text-lg text-blue-400">${item.total.toFixed(2)}</p>
                                      <button type="button" onClick={() => removeJobItem(item.id)} className="p-1 text-gray-500 hover:text-red-500 -mr-1 mt-1"><TrashIcon className="w-4 h-4" /></button>
                                  </div>
                              </div>
                              {applicableRules.length > 0 && (<div>{applicableRules.map(({matrixName, rules}) => (<div key={matrixName}><label className="text-xs font-semibold text-gray-500 uppercase">{matrixName}</label><div className="flex flex-wrap gap-2 mt-1">{rules.map(rule => (<button type="button" key={rule.id} onClick={() => handleRuleToggle(item.id, rule.id)} className={`text-xs px-2 py-1 rounded-full border transition-colors ${item.appliedPricingRuleIds.includes(rule.id) ? 'bg-blue-500 border-blue-400 text-white' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}>{rule.factor} (+{rule.adjustmentType === 'percentage' ? `${rule.adjustmentValue}%` : `$${rule.adjustmentValue}`})</button>))}</div></div>))}</div>)}
                              {upcharges.length > 0 && (<div><label className="text-xs font-semibold text-gray-500 uppercase">Add Upcharges</label><div className="flex flex-wrap gap-2 mt-1">{upcharges.map(upcharge => (<button type="button" key={upcharge._id} onClick={() => handleUpchargeToggle(item.id, upcharge._id)} className={`text-xs px-2 py-1 rounded-full border transition-colors ${item.addedUpchargeIds.includes(upcharge._id) ? 'bg-green-500 border-green-400 text-white' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}>{upcharge.name} (+{upcharge.isPercentage ? `${upcharge.defaultAmount}%` : `$${upcharge.defaultAmount}`})</button>))}</div></div>)}
                          </div>
                      );
                  })}
              </div>
              <div className="mt-4">
                  <select id="service-adder" value="" onChange={e => addServiceItem(e.target.value as Id<'services'>)} className="w-full bg-gray-700 rounded-md py-2 px-3 text-white focus:ring-blue-500 focus:border-blue-500">
                      <option value="" disabled>+ Add a service...</option>
                      {services.filter(s => !alreadyAddedServiceIds.has(s._id)).map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-300">Notes</label>
                  <textarea name="notes" id="notes" value={formData.notes} onChange={handleMainChange} rows={3} className="mt-1 block w-full bg-gray-700 rounded-md py-2 px-3 text-white focus:ring-blue-500 focus:border-blue-500"></textarea>
              </div>
              <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-300">Status</label>
                  <select id="status" name="status" value={formData.status} onChange={handleMainChange} className="mt-1 block w-full bg-gray-700 rounded-md py-2 px-3 text-white focus:ring-blue-500 focus:border-blue-500">
                      <option value="estimate">Estimate</option><option value="workOrder">Work Order</option><option value="invoice">Invoice</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
                  </select>
                  <div className="mt-2">
                    <label htmlFor="promoCode" className="block text-sm font-medium text-gray-300">Promotion Code</label>
                    <input type="text" id="promoCode" value={promoCode} onChange={e => setPromoCode(e.target.value)} className="mt-1 block w-full bg-gray-700 rounded-md py-2 px-3 text-white" />
                  </div>
              </div>
          </div>
          
          <div className="pt-4 border-t border-gray-700 text-right space-y-1">
              <div className="flex justify-end items-center"><span className="text-md text-gray-400 mr-4">Subtotal:</span><span className="text-lg font-semibold text-gray-300">${subtotal.toFixed(2)}</span></div>
               {discountAmount > 0 && (<div className="flex justify-end items-center"><span className="text-md text-green-400 mr-4">Discount:</span><span className="text-lg font-semibold text-green-400">-${discountAmount.toFixed(2)}</span></div>)}
               <div className="flex justify-end items-center"><span className="text-lg font-medium text-gray-300 mr-4">Total:</span><span className="text-3xl font-bold text-blue-400">${totalAmount.toFixed(2)}</span></div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 text-gray-100 rounded-md transition-colors">Cancel</button>
            <button type="submit" className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors">Save Job</button>
          </div>
        </form>
      </Modal>
      <CustomerFormModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        customerToEdit={null}
        vehiclesForCustomer={null}
      />
    </>
  );
};

export default JobFormModal;