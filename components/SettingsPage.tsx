import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { User, Company, Page, Snapshot } from '../types';
import { PlusIcon, EditIcon, TrashIcon, UserCircleIcon, OfficeBuildingIcon, StripeIcon, LinkIcon, EnvelopeIcon, ShieldCheckIcon, ArchiveBoxIcon } from './icons';
import UserFormModal from './UserFormModal';

interface SettingsPageProps {
    setActivePage: (page: Page) => void;
}

const StripeConnectManager: React.FC<{ company: Company | null | undefined }> = ({ company }) => {
    const createStripeAccount = useAction(api.company.createStripeConnectAccount);
    const createDashboardLink = useAction(api.company.createStripeDashboardLink);
    const [isConnecting, setIsConnecting] = useState(false);
    
    const handleConnect = async () => {
        setIsConnecting(true);
        try {
            const url = await createStripeAccount();
            if (url) window.location.href = url;
        } catch (error) {
            console.error(error);
            alert("Failed to start Stripe connection.");
        } finally {
            setIsConnecting(false);
        }
    };
    
    const handleDashboard = async () => {
        setIsConnecting(true);
         try {
            const url = await createDashboardLink();
            if (url) window.open(url, '_blank');
        } catch (error) {
            console.error(error);
            alert("Failed to get dashboard link.");
        } finally {
            setIsConnecting(false);
        }
    }
    
    const getStatusContent = () => {
        switch (company?.stripeConnectStatus) {
            case 'complete':
                return { text: "Payments Active", color: "text-green-400", button: <button type="button" onClick={handleDashboard} disabled={isConnecting} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">{isConnecting ? '...' : 'Manage on Stripe'}</button> };
            case 'in_progress':
                return { text: "Onboarding In Progress...", color: "text-yellow-400", button: <a href="#" onClick={handleConnect} className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg">Continue Onboarding</a> };
            case 'needs_attention':
                 return { text: "Action Required", color: "text-red-400", button: <button type="button" onClick={handleDashboard} disabled={isConnecting} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">{isConnecting ? '...' : 'Update Details on Stripe'}</button> };
            default:
                return { text: "Not Connected", color: "text-gray-400", button: <button type="button" onClick={handleConnect} disabled={isConnecting} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">{isConnecting ? 'Connecting...' : 'Connect with Stripe'}</button> };
        }
    };
    
    const { text, color, button } = getStatusContent();

    return (
        <div className="bg-gray-700/50 p-6 rounded-lg flex items-center justify-between">
            <div>
                <h3 className="text-lg font-semibold text-white flex items-center"><StripeIcon className="w-16 mr-4 text-white"/> Payments Powered by Stripe</h3>
                <p className="text-sm text-gray-300 mt-1">Securely accept online payments and manage your payouts.</p>
                <p className={`text-sm font-bold mt-2 ${color}`}>{text}</p>
            </div>
            {button}
        </div>
    );
};

const BusinessHoursEditor: React.FC<{
    hours: Company['businessHours'];
    onChange: (day: string, field: 'start' | 'end' | 'enabled', value: string | boolean) => void;
}> = ({ hours, onChange }) => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return (
        <div className="space-y-3">
            {days.map(day => {
                const dayConfig = hours?.[day];
                return (
                    <div key={day} className="grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-3">
                            <label className="flex items-center">
                                <input type="checkbox" checked={dayConfig?.enabled || false} onChange={e => onChange(day, 'enabled', e.target.checked)} className="h-4 w-4 text-blue-600 bg-gray-800 border-gray-600 rounded" />
                                <span className="ml-2 capitalize">{day}</span>
                            </label>
                        </div>
                        <div className="col-span-4">
                            <input type="time" value={dayConfig?.start || '09:00'} onChange={e => onChange(day, 'start', e.target.value)} disabled={!dayConfig?.enabled} className="w-full bg-gray-800 border-gray-600 rounded-md py-1 px-2 text-sm disabled:opacity-50" />
                        </div>
                        <div className="col-span-1 text-center">-</div>
                        <div className="col-span-4">
                            <input type="time" value={dayConfig?.end || '17:00'} onChange={e => onChange(day, 'end', e.target.value)} disabled={!dayConfig?.enabled} className="w-full bg-gray-800 border-gray-600 rounded-md py-1 px-2 text-sm disabled:opacity-50" />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};


const SettingsPage: React.FC<SettingsPageProps> = ({ setActivePage }) => {
    const data = useQuery(api.users.getSettingsData);
    const currentUser = data?.currentUser;
    const users = data?.allUsers ?? [];
    const company = data?.company;
    const snapshots = useQuery(api.dataManagement.listSnapshots) ?? [];
    
    const saveCompany = useMutation(api.company.save);
    const createSnapshot = useAction(api.dataManagement.createSnapshot);

    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);
    const [companyData, setCompanyData] = useState<Company | null>(company || null);
    const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
    
    useEffect(() => {
        if (company) {
            setCompanyData(company);
        }
    }, [company]);

    const handleOpenUserModal = (user: User | null) => {
        setUserToEdit(user);
        setIsUserModalOpen(true);
    };

    const handleCloseUserModal = () => {
        setUserToEdit(null);
        setIsUserModalOpen(false);
    };
    
    const handleDeleteUser = (userId: string) => {
        // This function would be implemented if user deletion is required.
    };

    const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!companyData) return;
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox') {
            setCompanyData(prev => ({...prev!, [name]: checked }));
        } else {
            setCompanyData(prev => ({ ...prev!, [name]: ['defaultLaborRate', 'bookingLeadTimeDays', 'slotDurationMinutes'].includes(name) ? parseFloat(value) || 0 : value }));
        }
    };

    const handleHoursChange = (day: string, field: 'start' | 'end' | 'enabled', value: string | boolean) => {
        setCompanyData(prev => {
            if (!prev) return null;
            const newHours = { ...(prev.businessHours || {}) };
            const currentDay = newHours[day] || { start: '09:00', end: '17:00', enabled: false };
            (newHours[day] as any)[field] = value;
            return { ...prev, businessHours: newHours };
        });
    };
    
    const handleCompanySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (companyData) {
            await saveCompany({
                id: companyData._id,
                name: companyData.name,
                defaultLaborRate: companyData.defaultLaborRate,
                enableSmartInventory: !!companyData.enableSmartInventory,
                enableEmailReminders: !!companyData.enableEmailReminders,
                businessHours: companyData.businessHours,
                bookingLeadTimeDays: companyData.bookingLeadTimeDays,
                slotDurationMinutes: companyData.slotDurationMinutes,
            });
            alert('Company profile saved!');
        }
    };

    const handleCreateSnapshot = async () => {
        if (window.confirm("This will create a named recovery point. This is NOT a substitute for Convex's built-in point-in-time recovery but can be used to mark important events. Are you sure?")) {
            setIsCreatingSnapshot(true);
            try {
                await createSnapshot();
                alert("Snapshot created successfully!");
            } catch (error) {
                console.error(error);
                alert("Failed to create snapshot.");
            } finally {
                setIsCreatingSnapshot(false);
            }
        }
    };
    
    const bookingUrl = `${window.location.origin}/book`;

    if (!data) return <div className="p-8 text-center">Loading settings...</div>;

    return (
        <div className="container mx-auto p-4 md:p-8">
            <header className="mb-8"><h1 className="text-3xl font-bold text-white">Settings</h1><p className="text-gray-400 mt-1">Manage company profile and user accounts.</p></header>

            <form onSubmit={handleCompanySubmit}>
                {companyData && (
                  <section id="company-profile" className="mb-12">
                      <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                          <h2 className="text-xl font-bold text-white flex items-center mb-6"><OfficeBuildingIcon className="w-6 h-6 mr-3 text-gray-400"/>Company Profile</h2>
                          <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div><label htmlFor="name" className="block text-sm font-medium text-gray-300">Company Name</label><input type="text" name="name" id="name" value={companyData.name} onChange={handleCompanyChange} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white"/></div>
                                  <div><label htmlFor="defaultLaborRate" className="block text-sm font-medium text-gray-300">Default Labor Rate ($/hr)</label><input type="number" name="defaultLaborRate" id="defaultLaborRate" value={companyData.defaultLaborRate} onChange={handleCompanyChange} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white"/></div>
                              </div>
                               <div className="pt-4 border-t border-gray-700">
                                    <label className="flex items-center cursor-pointer">
                                        <input type="checkbox" name="enableSmartInventory" checked={!!companyData.enableSmartInventory} onChange={handleCompanyChange} className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500" />
                                        <span className="ml-3 text-sm font-medium text-gray-300">Enable Smart Inventory Mode</span>
                                    </label>
                                    <p className="text-xs text-gray-500 ml-7">Turns on AI-powered features like auto-fill for products, service-to-product suggestions, and automatic stock deduction.</p>
                                </div>
                          </div>
                      </div>
                  </section>
                )}

                 <section id="billing-payments" className="mb-12">
                     <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                         <h2 className="text-xl font-bold text-white flex items-center mb-6">Billing & Payments</h2>
                         <StripeConnectManager company={company} />
                     </div>
                </section>

                <section id="communications" className="mb-12">
                     <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                         <h2 className="text-xl font-bold text-white flex items-center mb-6"><EnvelopeIcon className="w-6 h-6 mr-3 text-gray-400"/>Communications</h2>
                         <div className="pt-4">
                              <label className="flex items-center cursor-pointer">
                                  <input type="checkbox" name="enableEmailReminders" checked={!!companyData?.enableEmailReminders} onChange={handleCompanyChange} className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500" />
                                  <span className="ml-3 text-sm font-medium text-gray-300">Enable Automated 24-Hour Email Reminders</span>
                              </label>
                              <p className="text-xs text-gray-500 ml-7">Automatically send a reminder email to customers 24 hours before their scheduled appointment to reduce no-shows.</p>
                          </div>
                     </div>
                </section>

                <section id="online-booking" className="mb-12">
                    <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                        <h2 className="text-xl font-bold text-white flex items-center mb-6">Online Booking</h2>
                         <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Your Public Booking Link</label>
                                <div className="flex items-center space-x-2">
                                    <input type="text" readOnly value={bookingUrl} className="w-full bg-gray-900 border-gray-700 rounded-md py-2 px-3 text-gray-400" />
                                    <button type="button" onClick={() => navigator.clipboard.writeText(bookingUrl)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md"><LinkIcon className="w-5 h-5" /></button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-700">
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-3">Booking Rules</h3>
                                    <div className="space-y-4">
                                        <div><label htmlFor="bookingLeadTimeDays" className="block text-sm font-medium text-gray-300">Lead Time (Days)</label><input type="number" name="bookingLeadTimeDays" id="bookingLeadTimeDays" value={companyData?.bookingLeadTimeDays || 1} onChange={handleCompanyChange} className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white"/><p className="text-xs text-gray-500 mt-1">How many days in advance customers can book.</p></div>
                                        <div><label htmlFor="slotDurationMinutes" className="block text-sm font-medium text-gray-300">Time Slot Granularity (Mins)</label><input type="number" name="slotDurationMinutes" id="slotDurationMinutes" value={companyData?.slotDurationMinutes || 30} onChange={handleCompanyChange} step="15" className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-white"/><p className="text-xs text-gray-500 mt-1">The length of each available time slot (e.g., 30, 60).</p></div>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-3">Business Hours</h3>
                                    <BusinessHoursEditor hours={companyData?.businessHours} onChange={handleHoursChange} />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                
                <section id="data-management" className="mb-12">
                    <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                        <h2 className="text-xl font-bold text-white flex items-center mb-6">
                            <ShieldCheckIcon className="w-6 h-6 mr-3 text-gray-400" />
                            Data Management & Security
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3">Data Snapshots</h3>
                                <p className="text-sm text-gray-400 mb-4">
                                    Create a manual backup of your data. Convex automatically provides point-in-time recovery, but snapshots are useful for marking specific events like before a major data import.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleCreateSnapshot}
                                    disabled={isCreatingSnapshot}
                                    className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-500"
                                >
                                    <ArchiveBoxIcon className="w-5 h-5 mr-2" />
                                    {isCreatingSnapshot ? 'Creating...' : 'Create New Snapshot'}
                                </button>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3">Recent Snapshots</h3>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                    {snapshots.length > 0 ? snapshots.map(snap => (
                                        <div key={snap._id} className="bg-gray-700/50 p-2 rounded-md text-sm">
                                            <p className="font-semibold text-gray-200">{snap.name}</p>
                                            <p className="text-xs text-gray-400">Created by {snap.createdBy} on {new Date(snap.timestamp).toLocaleString()}</p>
                                        </div>
                                    )) : (
                                        <p className="text-sm text-gray-500 italic">No recent snapshots found.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 pt-6 border-t border-gray-700">
                            <h3 className="text-lg font-semibold text-white mb-3">Security Best Practices</h3>
                            <p className="text-sm text-gray-400">
                                All sensitive API keys (Clerk, Stripe, Gemini, Convex) are configured via secure environment variables on the Convex dashboard and are not exposed in the frontend code, ensuring production-level security.
                            </p>
                        </div>
                    </div>
                </section>

                <div className="flex justify-end mb-12"><button type="submit" className="py-2 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-lg font-semibold">Save All Settings</button></div>
            </form>

            <UserFormModal isOpen={isUserModalOpen} onClose={handleCloseUserModal} userToEdit={userToEdit} />
        </div>
    );
};

export default SettingsPage;