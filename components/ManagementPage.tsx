import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { Service, PricingMatrix, Upcharge, Checklist, Customer, Vehicle, Job, Payment, Appointment, User, Promotion, Product, Supplier, Subscription } from '../types';
import { PlusIcon, EditIcon, TrashIcon, PackageIcon, DealerIcon, SearchIcon, CalculatorIcon, UpchargeIcon, ChecklistIcon, UserGroupIcon, CarIcon, BriefcaseIcon, ArrowRightCircleIcon, ReceiptPercentIcon, CreditCardIcon, CalendarIcon, LinkIcon, ExclamationTriangleIcon, BuildingStorefrontIcon, CubeIcon, RefreshIcon } from './icons';
import ServiceFormModal from './ServiceFormModal';
import PricingMatrixFormModal from './PricingMatrixFormModal';
import UpchargeFormModal from './UpchargeFormModal';
import ChecklistFormModal from './ChecklistFormModal';
import CustomerFormModal from './CustomerFormModal';
import JobFormModal from './JobFormModal';
import PaymentFormModal from './PaymentFormModal';
import AppointmentFormModal from './AppointmentFormModal';
import SupplierFormModal from './SupplierFormModal';
import SubscriptionFormModal from './SubscriptionFormModal';
import SubscriptionCard from './SubscriptionCard';
import EmptyState from './EmptyState';

type ManagementTab = 'jobs' | 'customers' | 'services' | 'pricing' | 'upcharges' | 'checklists' | 'suppliers' | 'subscriptions';

const TabButton: React.FC<{
  tab: ManagementTab;
  activeTab: ManagementTab;
  setActiveTab: (tab: ManagementTab) => void;
  children: React.ReactNode;
  icon: React.ReactNode;
}> = ({ tab, activeTab, setActiveTab, children, icon }) => (
    <button
        onClick={() => setActiveTab(tab)}
        className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
            activeTab === tab 
            ? 'bg-primary text-white' 
            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        }`}
    >
        {icon}
        <span>{children}</span>
    </button>
);

const ServiceCard: React.FC<{ 
    service: Service;
    allServices: Service[];
    appliedMatrices: PricingMatrix[];
    hasChecklist: boolean;
    onEdit: (service: Service) => void;
    onDelete: (serviceId: Id<'services'>) => void;
}> = ({ service, allServices, appliedMatrices, hasChecklist, onEdit, onDelete }) => (
    <div className="bg-gray-800 rounded-lg shadow-lg p-5 flex flex-col justify-between hover:shadow-primary/20 hover:-translate-y-1 transition-all duration-300">
        <div>
            <div className="flex justify-between items-start">
                <h3 className="text-lg font-bold text-white pr-4">{service.name}</h3>
                <span className="text-xl font-semibold text-primary">${service.basePrice}</span>
            </div>
            <div className="flex items-center space-x-4 mt-2 mb-3">
                {service.isPackage && <div className="flex items-center text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full"><PackageIcon className="w-4 h-4 mr-1" />Package</div>}
                {service.isDealerPackage && <div className="flex items-center text-xs bg-purple-900 text-purple-200 px-2 py-1 rounded-full"><DealerIcon className="w-4 h-4 mr-1" />Dealer</div>}
                {hasChecklist && <div className="flex items-center text-xs bg-green-900 text-green-200 px-2 py-1 rounded-full"><ChecklistIcon className="w-4 h-4 mr-1" />Checklist</div>}
            </div>
            <p className="text-gray-400 text-sm mt-1 mb-4">{service.description}</p>
            {service.isPackage && service.serviceIds && service.serviceIds.length > 0 && (
                <div className="mb-4 pt-3 border-t border-gray-700/50">
                    <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Included Services</h4>
                    <ul className="space-y-1">{service.serviceIds.map(id => { const s = allServices.find(s => s._id === id); return s ? <li key={id} className="text-sm text-gray-300 bg-gray-700/40 px-2 py-1 rounded-md">{s.name}</li> : null; })}</ul>
                </div>
            )}
            {appliedMatrices.length > 0 && (
                 <div className="mb-4 pt-3 border-t border-gray-700/50">
                    <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Pricing Rules Applied</h4>
                    <div className="flex flex-wrap gap-2">{appliedMatrices.map(matrix => <div key={matrix._id} className="flex items-center text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full"><CalculatorIcon className="w-4 h-4 mr-1.5" />{matrix.name}</div>)}</div>
                </div>
            )}
        </div>
        <div className="flex justify-end space-x-2 border-t border-gray-700 pt-3 mt-auto">
            <button onClick={() => onEdit(service)} className="p-2 text-gray-400 hover:text-blue-400 transition-colors rounded-full hover:bg-gray-700"><EditIcon className="w-5 h-5" /></button>
            <button onClick={() => onDelete(service._id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-gray-700"><TrashIcon className="w-5 h-5" /></button>
        </div>
    </div>
);

const PricingMatrixCard: React.FC<{ matrix: PricingMatrix; allServices: Service[]; onEdit: (matrix: PricingMatrix) => void; onDelete: (matrixId: Id<'pricingMatrices'>) => void; }> = ({ matrix, allServices, onEdit, onDelete }) => (
    <div className="bg-gray-800 rounded-lg shadow-lg p-5 flex flex-col justify-between">
        <div>
            <h3 className="text-lg font-bold text-white mb-3">{matrix.name}</h3>
            <div className="mb-4">
                <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Rules</h4>
                <ul className="space-y-1 text-sm">{matrix.rules.map(rule => (<li key={rule.id} className="flex justify-between items-center bg-gray-700/40 px-2 py-1 rounded-md"><span>{rule.factor}</span><span className="font-mono text-primary">{rule.adjustmentType === 'percentage' ? `${rule.adjustmentValue}%` : `$${rule.adjustmentValue.toFixed(2)}`}</span></li>))}</ul>
            </div>
            <div className="mb-4">
                <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Applied to {matrix.appliesToServiceIds.length} Service(s)</h4>
                <div className="flex flex-wrap gap-2">{matrix.appliesToServiceIds.map(serviceId => { const service = allServices.find(s => s._id === serviceId); return service ? <span key={serviceId} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full">{service.name}</span> : null; })}</div>
            </div>
        </div>
        <div className="flex justify-end space-x-2 border-t border-gray-700 pt-3 mt-4">
            <button onClick={() => onEdit(matrix)} className="p-2 text-gray-400 hover:text-blue-400 transition-colors rounded-full hover:bg-gray-700"><EditIcon className="w-5 h-5" /></button>
            <button onClick={() => onDelete(matrix._id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-gray-700"><TrashIcon className="w-5 h-5" /></button>
        </div>
    </div>
);

const UpchargeCard: React.FC<{ upcharge: Upcharge; onEdit: (upcharge: Upcharge) => void; onDelete: (upchargeId: Id<'upcharges'>) => void; }> = ({ upcharge, onEdit, onDelete }) => (
    <div className="bg-gray-800 rounded-lg shadow-lg p-5 flex flex-col justify-between">
        <div>
            <div className="flex justify-between items-start">
                <h3 className="text-lg font-bold text-white pr-4">{upcharge.name}</h3>
                <span className="text-xl font-semibold text-primary">{upcharge.isPercentage ? `${upcharge.defaultAmount}%` : `$${upcharge.defaultAmount.toFixed(2)}`}</span>
            </div>
            <p className="text-gray-400 text-sm mt-2 mb-4">{upcharge.description}</p>
        </div>
        <div className="flex justify-end space-x-2 border-t border-gray-700 pt-3 mt-auto">
            <button onClick={() => onEdit(upcharge)} className="p-2 text-gray-400 hover:text-blue-400 transition-colors rounded-full hover:bg-gray-700"><EditIcon className="w-5 h-5" /></button>
            <button onClick={() => onDelete(upcharge._id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-gray-700"><TrashIcon className="w-5 h-5" /></button>
        </div>
    </div>
);

const ChecklistCard: React.FC<{ checklist: Checklist; allServices: Service[]; onEdit: (checklist: Checklist) => void; onDelete: (checklistId: Id<'checklists'>) => void; }> = ({ checklist, allServices, onEdit, onDelete }) => {
    const associatedService = allServices.find(s => s._id === checklist.serviceId);
    return (
        <div className="bg-gray-800 rounded-lg shadow-lg p-5 flex flex-col justify-between">
            <div>
                <h3 className="text-lg font-bold text-white mb-2">{checklist.name}</h3>
                {associatedService && (<div className="mb-4"><span className="text-xs font-semibold uppercase text-gray-500 mr-2">APPLIES TO:</span><span className="text-sm text-primary bg-gray-700/50 px-2 py-1 rounded">{associatedService.name}</span></div>)}
                <div className="mb-4">
                    <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Tasks ({checklist.tasks.length})</h4>
                    <ul className="space-y-1 text-sm list-disc list-inside text-gray-400 max-h-32 overflow-y-auto pr-2">{checklist.tasks.map((task, index) => (<li key={index} className="truncate">{task}</li>))}</ul>
                </div>
            </div>
            <div className="flex justify-end space-x-2 border-t border-gray-700 pt-3 mt-4">
                <button onClick={() => onEdit(checklist)} className="p-2 text-gray-400 hover:text-blue-400 transition-colors rounded-full hover:bg-gray-700"><EditIcon className="w-5 h-5" /></button>
                <button onClick={() => onDelete(checklist._id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-gray-700"><TrashIcon className="w-5 h-5" /></button>
            </div>
        </div>
    );
};

const CustomerCard: React.FC<{ customer: Customer; vehicles: Vehicle[]; onEdit: (customer: Customer) => void; onDelete: (customerId: Id<'customers'>) => void; }> = ({ customer, vehicles, onEdit, onDelete }) => (
    <div className="bg-gray-800 rounded-lg shadow-lg p-5 flex flex-col justify-between">
        <div>
            <h3 className="text-lg font-bold text-white">{customer.name}</h3>
            <p className="text-sm text-gray-400">{customer.phone}</p>
            <p className="text-sm text-gray-400">{customer.email}</p>
            <div className="mt-4 pt-4 border-t border-gray-700/50">
                <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Vehicles ({vehicles.length})</h4>
                <ul className="space-y-1">{vehicles.map(v => (<li key={v._id} className="flex items-center text-sm text-gray-300 bg-gray-700/40 px-2 py-1 rounded-md"><CarIcon className="w-4 h-4 mr-2 text-gray-400" />{v.year} {v.make} {v.model}</li>))}</ul>
            </div>
        </div>
        <div className="flex justify-end space-x-2 border-t border-gray-700 pt-3 mt-4">
            <button onClick={() => onEdit(customer)} className="p-2 text-gray-400 hover:text-blue-400 transition-colors rounded-full hover:bg-gray-700"><EditIcon className="w-5 h-5" /></button>
            <button onClick={() => onDelete(customer._id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-gray-700"><TrashIcon className="w-5 h-5" /></button>
        </div>
    </div>
);

const JobCard: React.FC<{ job: Job; customer: Customer | undefined; vehicle: Vehicle | undefined; isScheduled: boolean; onEdit: (job: Job) => void; onConvertToWorkOrder: (jobId: Id<'jobs'>) => void; onGenerateInvoice: (jobId: Id<'jobs'>) => void; onRecordPayment: (job: Job) => void; onSchedule: (jobId: Id<'jobs'>) => void; onShare: (job: Job) => void; onDelete: (jobId: Id<'jobs'>) => void; }> = ({ job, customer, vehicle, isScheduled, onEdit, onConvertToWorkOrder, onGenerateInvoice, onRecordPayment, onSchedule, onShare, onDelete }) => {
    const statusColors = { estimate: 'bg-yellow-800 text-yellow-200', workOrder: 'bg-blue-800 text-blue-200', invoice: 'bg-purple-800 text-purple-200', completed: 'bg-green-800 text-green-200', cancelled: 'bg-gray-700 text-gray-300' };
    const paymentStatusColors = { unpaid: 'text-red-400', partial: 'text-yellow-400', paid: 'text-green-400' };

    const renderAction = () => {
        if (!isScheduled && (job.status === 'estimate' || job.status === 'workOrder')) {
            return <button onClick={() => onSchedule(job._id)} className="w-full flex items-center justify-center bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-3 rounded-lg transition-colors text-sm"><CalendarIcon className="w-5 h-5 mr-2" />Schedule Job</button>;
        }
        switch (job.status) {
            case 'estimate': return <button onClick={() => onConvertToWorkOrder(job._id)} className="w-full flex items-center justify-center bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-3 rounded-lg transition-colors text-sm"><ArrowRightCircleIcon className="w-5 h-5 mr-2" />Convert to Work Order</button>;
            case 'workOrder': return <button onClick={() => onGenerateInvoice(job._id)} className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-lg transition-colors text-sm"><ReceiptPercentIcon className="w-5 h-5 mr-2" />Generate Invoice</button>;
            case 'invoice': return <button onClick={() => onRecordPayment(job)} className="w-full flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-3 rounded-lg transition-colors text-sm"><CreditCardIcon className="w-5 h-5 mr-2" />Record Payment</button>;
            default: return <div className="h-[38px]"></div>;
        }
    };

    const renderVisualQuoteStatus = () => {
        switch(job.visualQuoteStatus) {
            case 'pending':
                return <div className="flex items-center text-xs text-blue-300 animate-pulse mt-1"><svg className="animate-spin h-3 w-3 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>AI Quote...</div>;
            case 'failed':
                return <div className="flex items-center text-xs text-red-400 mt-1"><ExclamationTriangleIcon className="w-3 h-3 mr-1.5" />AI Failed</div>;
            default:
                return null;
        }
    };

    return (
        <div className="bg-gray-800 rounded-lg shadow-lg flex flex-col justify-between">
            <div className="p-5">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-bold text-white">{customer?.name || 'N/A'}</h3>
                        <p className="text-sm text-gray-400">{vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'N/A'}</p>
                        {renderVisualQuoteStatus()}
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                        <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${statusColors[job.status]}`}>{job.status}</span>
                        {isScheduled && <span className="text-xs font-semibold flex items-center bg-teal-800 text-teal-200 px-2 py-1 rounded-full"><CalendarIcon className="w-3 h-3 mr-1.5" />Scheduled</span>}
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-700/50">
                    <div className="flex justify-between items-baseline"><h4 className="text-sm font-semibold text-gray-300">Total:</h4><span className="text-2xl font-bold text-primary">${job.totalAmount.toFixed(2)}</span></div>
                    <div className="flex justify-between items-baseline mt-2"><h4 className="text-sm font-semibold text-gray-300">Paid:</h4><span className={`text-lg font-semibold ${paymentStatusColors[job.paymentStatus]}`}>${job.paymentReceived.toFixed(2)}</span></div>
                    <div className="flex justify-between items-baseline mt-1"><h4 className="text-xs text-gray-500">Created:</h4><span className="text-xs text-gray-400">{new Date(job.estimateDate).toLocaleDateString()}</span></div>
                </div>
            </div>
            <div className="bg-gray-900/50 p-3 mt-auto">
                <div className="flex justify-between items-center">
                    <div className="flex-grow pr-3">{renderAction()}</div>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                        <button onClick={() => onShare(job)} className="p-2 text-gray-400 hover:text-green-400 transition-colors rounded-full hover:bg-gray-700" title="Share Customer Link"><LinkIcon className="w-5 h-5" /></button>
                        <button onClick={() => onEdit(job)} className="p-2 text-gray-400 hover:text-blue-400 transition-colors rounded-full hover:bg-gray-700" title="Edit Job" disabled={job.status === 'completed' || job.status === 'cancelled'}><EditIcon className="w-5 h-5" /></button>
                        <button onClick={() => onDelete(job._id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-gray-700" title="Delete Job"><TrashIcon className="w-5 h-5" /></button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SupplierCard: React.FC<{ supplier: Supplier; products: Product[]; onEdit: (supplier: Supplier) => void; onDelete: (supplierId: Id<'suppliers'>) => void; }> = ({ supplier, products, onEdit, onDelete }) => (
    <div className="bg-gray-800 rounded-lg shadow-lg p-5 flex flex-col justify-between">
        <div>
            <h3 className="text-lg font-bold text-white">{supplier.name}</h3>
            <p className="text-sm text-gray-400">{supplier.contactEmail}</p>
            <div className="mt-4 pt-4 border-t border-gray-700/50">
                <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Products Supplied ({products.length})</h4>
                <ul className="space-y-1">{products.map(p => (<li key={p._id} className="flex items-center text-sm text-gray-300 bg-gray-700/40 px-2 py-1 rounded-md"><CubeIcon className="w-4 h-4 mr-2 text-gray-400" />{p.name}</li>))}</ul>
            </div>
        </div>
        <div className="flex justify-end space-x-2 border-t border-gray-700 pt-3 mt-4">
            <button onClick={() => onEdit(supplier)} className="p-2 text-gray-400 hover:text-blue-400 transition-colors rounded-full hover:bg-gray-700"><EditIcon className="w-5 h-5" /></button>
            <button onClick={() => onDelete(supplier._id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-gray-700"><TrashIcon className="w-5 h-5" /></button>
        </div>
    </div>
);


const ManagementPage: React.FC = () => {
    const data = useQuery(api.management.getPageData);
    const services = data?.services ?? [];
    const pricingMatrices = data?.pricingMatrices ?? [];
    const upcharges = data?.upcharges ?? [];
    const checklists = data?.checklists ?? [];
    const customers = data?.customers ?? [];
    const vehicles = data?.vehicles ?? [];
    const jobs = data?.jobs ?? [];
    const appointments = data?.appointments ?? [];
    const products = data?.products ?? [];
    const suppliers = data?.suppliers ?? [];
    const subscriptions = data?.subscriptions ?? [];

    const deleteService = useMutation(api.services.remove);
    const deleteMatrix = useMutation(api.pricing.deleteMatrix);
    const deleteUpcharge = useMutation(api.pricing.deleteUpcharge);
    const deleteChecklist = useMutation(api.checklists.remove);
    const deleteCustomer = useMutation(api.customers.remove);
    const deleteJob = useMutation(api.jobs.remove);
    const deleteSupplier = useMutation(api.suppliers.remove);
    const convertToWorkOrder = useMutation(api.jobs.convertToWorkOrder);
    const generateInvoice = useMutation(api.jobs.generateInvoice);
    
    const [activeTab, setActiveTab] = useState<ManagementTab>('jobs');

    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [serviceToEdit, setServiceToEdit] = useState<Service | null>(null);
    const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);
    const [matrixToEdit, setMatrixToEdit] = useState<PricingMatrix | null>(null);
    const [isUpchargeModalOpen, setIsUpchargeModalOpen] = useState(false);
    const [upchargeToEdit, setUpchargeToEdit] = useState<Upcharge | null>(null);
    const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
    const [checklistToEdit, setChecklistToEdit] = useState<Checklist | null>(null);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
    const [isJobModalOpen, setIsJobModalOpen] = useState(false);
    const [jobToEdit, setJobToEdit] = useState<Job | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [jobForPayment, setJobForPayment] = useState<Job | null>(null);
    const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
    const [jobToScheduleId, setJobToScheduleId] = useState<Id<'jobs'> | null>(null);
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
    const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
    const [subscriptionToEdit, setSubscriptionToEdit] = useState<Subscription | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [serviceSearchQuery, setServiceSearchQuery] = useState('');
    const searchResults = useQuery(api.services.search, serviceSearchQuery ? { query: serviceSearchQuery } : "skip");
    
    const handleCloseModals = () => {
        setIsServiceModalOpen(false); setServiceToEdit(null);
        setIsMatrixModalOpen(false); setMatrixToEdit(null);
        setIsUpchargeModalOpen(false); setUpchargeToEdit(null);
        setIsChecklistModalOpen(false); setChecklistToEdit(null);
        setIsCustomerModalOpen(false); setCustomerToEdit(null);
        setIsJobModalOpen(false); setJobToEdit(null);
        setIsPaymentModalOpen(false); setJobForPayment(null);
        setIsAppointmentModalOpen(false); setJobToScheduleId(null);
        setIsSupplierModalOpen(false); setSupplierToEdit(null);
        setIsSubscriptionModalOpen(false); setSubscriptionToEdit(null);
    };

    const handleShareJobLink = (job: Job) => {
        if (job.publicLinkKey) {
            const url = `${window.location.origin}${window.location.pathname}?jobKey=${job.publicLinkKey}`;
            navigator.clipboard.writeText(url).then(() => alert('Customer portal link copied!'), () => alert('Failed to copy link.'));
        } else {
            alert('Could not find a shareable link for this job.');
        }
    };
    
    const handleDeleteService = (id: Id<'services'>) => window.confirm('Are you sure?') && deleteService({ id });
    const handleDeleteMatrix = (id: Id<'pricingMatrices'>) => window.confirm('Are you sure?') && deleteMatrix({ id });
    const handleDeleteUpcharge = (id: Id<'upcharges'>) => window.confirm('Are you sure?') && deleteUpcharge({ id });
    const handleDeleteChecklist = (id: Id<'checklists'>) => window.confirm('Are you sure?') && deleteChecklist({ id });
    const handleDeleteCustomer = (id: Id<'customers'>) => window.confirm('Are you sure?') && deleteCustomer({ id });
    const handleDeleteJob = (id: Id<'jobs'>) => window.confirm('Are you sure?') && deleteJob({ id });
    const handleDeleteSupplier = (id: Id<'suppliers'>) => {
        if (window.confirm('Are you sure?')) {
            deleteSupplier({ id }).catch((err: unknown) => alert(String((err as any)?.data) || "An unexpected error occurred."));
        }
    };

    const displayedServices = serviceSearchQuery ? searchResults : services;
    const scheduledJobIds = useMemo(() => new Set(appointments.map(a => a.jobId)), [appointments]);
    const vehiclesByCustomer = useMemo(() => vehicles.reduce((acc, v) => {
        if (!acc[v.customerId]) acc[v.customerId] = [];
        acc[v.customerId].push(v);
        return acc;
    }, {} as Record<Id<'customers'>, Vehicle[]>), [vehicles]);

    const productsBySupplier = useMemo(() => products.reduce((acc, p) => {
        if (!acc[p.supplierId]) acc[p.supplierId] = [];
        acc[p.supplierId].push(p);
        return acc;
    }, {} as Record<Id<'suppliers'>, Product[]>), [products]);
    
    const customerMap = useMemo(() => new Map(customers.map(c => [c._id, c.name])), [customers]);
    const serviceMap = useMemo(() => new Map(services.map(s => [s._id, s.name])), [services]);

    if (!data) return <div className="p-8 text-center">Loading management data...</div>;
    
    const renderContent = () => {
        switch(activeTab) {
            case 'jobs':
                return (
                    <section id="jobs">
                        {jobs.length > 0 ? (
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{jobs.map(job => (<JobCard key={job._id} job={job} customer={customers.find(c => c._id === job.customerId)} vehicle={vehicles.find(v => v._id === job.vehicleId)} isScheduled={scheduledJobIds.has(job._id)} onEdit={(j) => {setJobToEdit(j); setIsJobModalOpen(true);}} onDelete={handleDeleteJob} onConvertToWorkOrder={convertToWorkOrder} onGenerateInvoice={generateInvoice} onRecordPayment={(j) => {setJobForPayment(j); setIsPaymentModalOpen(true);}} onSchedule={(id) => {setJobToScheduleId(id); setIsAppointmentModalOpen(true);}} onShare={handleShareJobLink}/>))}</div>
                        ) : (
                            <EmptyState icon={<BriefcaseIcon className="w-12 h-12 text-gray-600"/>} title="No Jobs Yet" message="Create your first job to get started." action={{ label: "Create New Job", onClick: () => { setJobToEdit(null); setIsJobModalOpen(true); }}}/>
                        )}
                    </section>
                );
            case 'customers':
                return (
                    <section id="customers">
                         {customers.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{customers.map(customer => (<CustomerCard key={customer._id} customer={customer} vehicles={vehiclesByCustomer[customer._id] || []} onEdit={(c) => {setCustomerToEdit(c); setIsCustomerModalOpen(true);}} onDelete={handleDeleteCustomer}/>))}</div>
                         ) : (
                             <EmptyState icon={<UserGroupIcon className="w-12 h-12 text-gray-600"/>} title="No Customers" message="Add your first customer to their information here." action={{ label: "Add Customer", onClick: () => {setCustomerToEdit(null); setIsCustomerModalOpen(true);}}}/>
                         )}
                    </section>
                );
            case 'services':
                 return (
                    <section id="services">
                        <div className="mb-8 p-4 bg-gray-800 rounded-lg relative"><input type="text" placeholder="Search services..." value={serviceSearchQuery} onChange={e => setServiceSearchQuery(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 pl-10 text-white"/><SearchIcon className="w-5 h-5 text-gray-400 absolute left-7 top-1/2 -translate-y-1/2" /></div>
                        {(displayedServices || []).length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{(displayedServices || []).map(service => (<ServiceCard key={service._id} service={service} allServices={services} appliedMatrices={pricingMatrices.filter(m => m.appliesToServiceIds.includes(service._id))} hasChecklist={checklists.some(c => c.serviceId === service._id)} onEdit={(s) => {setServiceToEdit(s); setIsServiceModalOpen(true);}} onDelete={handleDeleteService}/>))}</div>
                        ) : (
                            <EmptyState icon={<PackageIcon className="w-12 h-12 text-gray-600"/>} title="No Services Found" message="Create services and packages for your customers." action={{ label: "Add Service", onClick: () => {setServiceToEdit(null); setIsServiceModalOpen(true);}}}/>
                        )}
                    </section>
                 );
            case 'pricing':
                return (
                    <section id="pricing">
                        {pricingMatrices.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{pricingMatrices.map(matrix => (<PricingMatrixCard key={matrix._id} matrix={matrix} allServices={services} onEdit={(m) => {setMatrixToEdit(m); setIsMatrixModalOpen(true);}} onDelete={handleDeleteMatrix}/>))}</div>
                        ) : (
                            <EmptyState icon={<CalculatorIcon className="w-12 h-12 text-gray-600"/>} title="No Pricing Matrices" message="Create rules to automatically adjust service prices based on factors like vehicle size." action={{ label: "Add Matrix", onClick: () => {setMatrixToEdit(null); setIsMatrixModalOpen(true);}}}/>
                        )}
                    </section>
                );
            case 'upcharges':
                return (
                    <section id="upcharges">
                        {upcharges.length > 0 ? (
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{upcharges.map(upcharge => (<UpchargeCard key={upcharge._id} upcharge={upcharge} onEdit={(u) => {setUpchargeToEdit(u); setIsUpchargeModalOpen(true);}} onDelete={handleDeleteUpcharge}/>))}</div>
                        ) : (
                            <EmptyState icon={<UpchargeIcon className="w-12 h-12 text-gray-600"/>} title="No Upcharges" message="Define common upcharges like 'Excessive Pet Hair' to easily add them to jobs." action={{ label: "Add Upcharge", onClick: () => {setUpchargeToEdit(null); setIsUpchargeModalOpen(true);}}}/>
                        )}
                    </section>
                );
            case 'checklists':
                return (
                    <section id="checklists">
                        {checklists.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{checklists.map(checklist => (<ChecklistCard key={checklist._id} checklist={checklist} allServices={services} onEdit={(c) => {setChecklistToEdit(c); setIsChecklistModalOpen(true);}} onDelete={handleDeleteChecklist}/>))}</div>
                        ) : (
                             <EmptyState icon={<ChecklistIcon className="w-12 h-12 text-gray-600"/>} title="No Checklists" message="Create procedural checklists for your services to ensure quality and consistency." action={{ label: "Add Checklist", onClick: () => {setChecklistToEdit(null); setIsChecklistModalOpen(true);}}}/>
                        )}
                    </section>
                );
            case 'suppliers':
                return (
                    <section id="suppliers">
                        {suppliers.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{suppliers.map(supplier => (<SupplierCard key={supplier._id} supplier={supplier} products={productsBySupplier[supplier._id] || []} onEdit={(s) => {setSupplierToEdit(s); setIsSupplierModalOpen(true);}} onDelete={handleDeleteSupplier}/>))}</div>
                        ) : (
                            <EmptyState icon={<BuildingStorefrontIcon className="w-12 h-12 text-gray-600"/>} title="No Suppliers" message="Add your product suppliers to keep your inventory organized." action={{ label: "Add Supplier", onClick: () => {setSupplierToEdit(null); setIsSupplierModalOpen(true);}}}/>
                        )}
                    </section>
                );
             case 'subscriptions':
                return (
                    <section id="subscriptions">
                        {subscriptions.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{subscriptions.map(sub => (<SubscriptionCard key={sub._id} subscription={sub} customerName={customerMap.get(sub.customerId)} serviceNames={sub.serviceIds.map(id => serviceMap.get(id) || '')} onEdit={(s) => {setSubscriptionToEdit(s); setIsSubscriptionModalOpen(true);}}/>))}</div>
                        ) : (
                            <EmptyState icon={<RefreshIcon className="w-12 h-12 text-gray-600"/>} title="No Subscriptions" message="Create recurring service plans for your customers to build predictable revenue." action={{ label: "New Subscription", onClick: () => {setSubscriptionToEdit(null); setIsSubscriptionModalOpen(true);}}}/>
                        )}
                    </section>
                );
            default:
                return null;
        }
    }

    return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div><h1 className="text-3xl font-bold text-white">Management</h1><p className="text-gray-400 mt-1">Manage all aspects of your auto detailing business.</p></div>
      </header>

       <div className="bg-gray-800 rounded-lg p-2 mb-8">
            <div className="flex flex-wrap items-center gap-2">
                <TabButton tab="jobs" activeTab={activeTab} setActiveTab={setActiveTab} icon={<BriefcaseIcon className="w-5 h-5" />}>Jobs</TabButton>
                <TabButton tab="customers" activeTab={activeTab} setActiveTab={setActiveTab} icon={<UserGroupIcon className="w-5 h-5" />}>Customers</TabButton>
                <TabButton tab="services" activeTab={activeTab} setActiveTab={setActiveTab} icon={<PackageIcon className="w-5 h-5" />}>Services</TabButton>
                <TabButton tab="subscriptions" activeTab={activeTab} setActiveTab={setActiveTab} icon={<RefreshIcon className="w-5 h-5" />}>Subscriptions</TabButton>
                <TabButton tab="pricing" activeTab={activeTab} setActiveTab={setActiveTab} icon={<CalculatorIcon className="w-5 h-5" />}>Pricing</TabButton>
                <TabButton tab="upcharges" activeTab={activeTab} setActiveTab={setActiveTab} icon={<UpchargeIcon className="w-5 h-5" />}>Upcharges</TabButton>
                <TabButton tab="checklists" activeTab={activeTab} setActiveTab={setActiveTab} icon={<ChecklistIcon className="w-5 h-5" />}>Checklists</TabButton>
                <TabButton tab="suppliers" activeTab={activeTab} setActiveTab={setActiveTab} icon={<BuildingStorefrontIcon className="w-5 h-5" />}>Suppliers</TabButton>
            </div>
       </div>

      {renderContent()}
      
      {/* Modals */}
      <ServiceFormModal isOpen={isServiceModalOpen} onClose={handleCloseModals} serviceToEdit={serviceToEdit} products={products} />
      <PricingMatrixFormModal isOpen={isMatrixModalOpen} onClose={handleCloseModals} matrixToEdit={matrixToEdit} />
      <UpchargeFormModal isOpen={isUpchargeModalOpen} onClose={handleCloseModals} upchargeToEdit={upchargeToEdit} />
      <ChecklistFormModal isOpen={isChecklistModalOpen} onClose={handleCloseModals} checklistToEdit={checklistToEdit} />
      <CustomerFormModal isOpen={isCustomerModalOpen} onClose={handleCloseModals} customerToEdit={customerToEdit} vehiclesForCustomer={customerToEdit ? vehiclesByCustomer[customerToEdit._id] : null} />
      <JobFormModal isOpen={isJobModalOpen} onClose={handleCloseModals} jobToEdit={jobToEdit} />
      <PaymentFormModal isOpen={isPaymentModalOpen} onClose={handleCloseModals} job={jobForPayment} />
      <AppointmentFormModal isOpen={isAppointmentModalOpen} onClose={handleCloseModals} appointmentToEdit={null} jobToScheduleId={jobToScheduleId} />
      <SupplierFormModal isOpen={isSupplierModalOpen} onClose={handleCloseModals} supplierToEdit={supplierToEdit} />
      <SubscriptionFormModal isOpen={isSubscriptionModalOpen} onClose={handleCloseModals} subscriptionToEdit={subscriptionToEdit} customers={customers} services={services.filter(s => !s.isPackage)} />
    </div>
  );
};

export default ManagementPage;