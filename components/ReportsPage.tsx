import React, { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { ClipboardListIcon, SearchIcon, DocumentDownloadIcon, ChartBarIcon, DocumentMagnifyingGlassIcon } from './icons';
import { exportToCsv } from '../utils/csv';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const toInputDateString = (date: Date) => date.toISOString().split('T')[0];
type ReportTab = 'performance' | 'history' | 'audit';

const TabButton: React.FC<{
  tab: ReportTab;
  activeTab: ReportTab;
  setActiveTab: (tab: ReportTab) => void;
  children: React.ReactNode;
  icon: React.ReactNode;
}> = ({ tab, activeTab, setActiveTab, children, icon }) => (
    <button
        onClick={() => setActiveTab(tab)}
        className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
            activeTab === tab 
            ? 'bg-blue-600 text-white' 
            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        }`}
    >
        {icon}
        <span>{children}</span>
    </button>
);


const PerformanceTab = () => {
    const [filters, setFilters] = useState({
        startDate: toInputDateString(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
        endDate: toInputDateString(new Date()),
        technicianId: 'all',
    });

    const reportsData = useQuery(api.reports.getReportsData, { 
        startDate: new Date(filters.startDate).getTime(),
        endDate: new Date(`${filters.endDate}T23:59:59.999Z`).getTime(),
        technicianId: filters.technicianId,
    });
    
     const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const setDateRange = (days: number | 'quarter' | 'year') => {
        const end = new Date();
        const start = new Date();
        if (days === 'quarter') {
            const quarter = Math.floor(start.getMonth() / 3);
            start.setMonth(quarter * 3, 1);
            start.setHours(0,0,0,0);
        } else if (days === 'year') {
            start.setMonth(0, 1);
            start.setHours(0,0,0,0);
        } else {
             start.setDate(end.getDate() - days);
        }
        setFilters(prev => ({
            ...prev,
            startDate: toInputDateString(start),
            endDate: toInputDateString(end),
        }));
    };

    const handleExportServicePerformance = () => {
        if (!reportsData) return;
        const dataToExport = reportsData.servicePerformance.map(({ service, count, revenue }) => ({
            Service: service.name,
            "Times Performed": count,
            "Total Revenue": revenue.toFixed(2),
        }));
        exportToCsv('service-performance.csv', dataToExport);
    };

    const handleExportTechnicianLeaderboard = () => {
        if (!reportsData) return;
        const dataToExport = reportsData.technicianLeaderboard.map(({ technician, completedJobs, revenue, averageJobValue }) => ({
            Technician: technician.name,
            "Jobs Completed": completedJobs,
            "Total Revenue": revenue.toFixed(2),
            "Average Job Value": averageJobValue.toFixed(2),
        }));
        exportToCsv('technician-leaderboard.csv', dataToExport);
    };

    const technicians = reportsData?.technicians ?? [];
    
    const revenueData = useMemo(() => {
        if (!reportsData) return { labels: [], datasets: [] };
        const { labels, data } = reportsData.revenueOverTime;
        return { labels, datasets: [{ label: 'Daily Revenue', data, borderColor: 'rgb(59, 130, 246)', backgroundColor: 'rgba(59, 130, 246, 0.5)', tension: 0.1 }] };
    }, [reportsData]);

    const chartOptions = { responsive: true, plugins: { legend: { display: false } }, scales: { y: { ticks: { color: '#9CA3AF' } }, x: { ticks: { color: '#9CA3AF' } } } };
    if (!reportsData) return <div className="p-8 text-center">Loading performance data...</div>;
    
    return (
        <>
            <section className="mb-12 bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4">Filters</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div><label htmlFor="startDate" className="block text-sm font-medium text-gray-400">Start Date</label><input type="date" name="startDate" id="startDate" value={filters.startDate} onChange={handleFilterChange} className="mt-1 w-full bg-gray-700 rounded-md py-2 px-3 text-white"/></div>
                    <div><label htmlFor="endDate" className="block text-sm font-medium text-gray-400">End Date</label><input type="date" name="endDate" id="endDate" value={filters.endDate} onChange={handleFilterChange} className="mt-1 w-full bg-gray-700 rounded-md py-2 px-3 text-white"/></div>
                    <div><label htmlFor="technicianId" className="block text-sm font-medium text-gray-400">Technician</label><select name="technicianId" id="technicianId" value={filters.technicianId} onChange={handleFilterChange} className="mt-1 w-full bg-gray-700 rounded-md py-2 px-3 text-white"><option value="all">All</option>{technicians.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}</select></div>
                </div>
                 <div className="flex flex-wrap gap-2 mt-4">
                    <button onClick={() => setDateRange(7)} className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-full">Last 7 Days</button>
                    <button onClick={() => setDateRange(30)} className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-full">Last 30 Days</button>
                    <button onClick={() => setDateRange('quarter')} className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-full">This Quarter</button>
                    <button onClick={() => setDateRange('year')} className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-full">This Year</button>
                </div>
            </section>
            <section className="mb-12 bg-gray-800 rounded-lg shadow-lg p-6"><h2 className="text-xl font-bold text-white mb-4">Revenue Over Time</h2><Line options={chartOptions} data={revenueData} /></section>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                <section>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white">Service Performance</h2>
                        <button onClick={handleExportServicePerformance} className="flex items-center text-xs text-blue-400 hover:text-blue-300"><DocumentDownloadIcon className="w-4 h-4 mr-1" />Export CSV</button>
                    </div>
                    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden"><table className="min-w-full"><thead className="bg-gray-700"><tr><th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Service</th><th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Times</th><th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Revenue</th></tr></thead><tbody className="divide-y divide-gray-700">{reportsData.servicePerformance.map(({ service, count, revenue }) => (<tr key={service._id} className="hover:bg-gray-700/50"><td className="px-4 py-4 text-sm font-medium text-white">{service.name}</td><td className="px-4 py-4 text-sm text-gray-300 text-right">{count}</td><td className="px-4 py-4 text-sm text-blue-400 text-right font-semibold">${revenue.toFixed(2)}</td></tr>))}</tbody></table></div>
                </section>
                <section>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-white">Technician Leaderboard</h2>
                        <button onClick={handleExportTechnicianLeaderboard} className="flex items-center text-xs text-blue-400 hover:text-blue-300"><DocumentDownloadIcon className="w-4 h-4 mr-1" />Export CSV</button>
                    </div>
                    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden"><table className="min-w-full"><thead className="bg-gray-700"><tr><th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Technician</th><th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Jobs</th><th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Revenue</th><th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase">Avg Value</th></tr></thead><tbody className="divide-y divide-gray-700">{reportsData.technicianLeaderboard.map(({ technician, completedJobs, revenue, averageJobValue }) => (<tr key={technician._id} className="hover:bg-gray-700/50"><td className="px-4 py-4 text-sm font-medium text-white">{technician.name}</td><td className="px-4 py-4 text-sm text-gray-300 text-right">{completedJobs}</td><td className="px-4 py-4 text-sm text-blue-400 text-right font-semibold">${revenue.toFixed(2)}</td><td className="px-4 py-4 text-sm text-gray-300 text-right">${averageJobValue.toFixed(2)}</td></tr>))}</tbody></table></div>
                </section>
            </div>
        </>
    );
};

const VehicleHistoryTab = () => {
    const [vehicleSearch, setVehicleSearch] = useState('');
    const vehicleHistory = useQuery(api.reports.getVehicleHistory, vehicleSearch ? { query: vehicleSearch } : "skip");

    return (
        <section>
             <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="relative mb-4"><input type="text" placeholder="Search by VIN, make, model, or customer name..." value={vehicleSearch} onChange={e => setVehicleSearch(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 pl-10 text-white"/><SearchIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"/></div>
                {vehicleSearch.trim() ? (
                    vehicleHistory ? (
                        <div>
                            <h3 className="text-lg font-bold text-white">{`${vehicleHistory.vehicle.year} ${vehicleHistory.vehicle.make} ${vehicleHistory.vehicle.model}`}</h3>
                            <p className="text-sm text-gray-400">Owner: {vehicleHistory.customerName}</p>
                            <div className="mt-4 border-t border-gray-700 pt-4"><table className="min-w-full"><thead className="bg-gray-700/50"><tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">Date</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase">Services</th><th className="px-4 py-2 text-right text-xs font-medium text-gray-300 uppercase">Total</th></tr></thead><tbody className="divide-y divide-gray-700">{vehicleHistory.jobs.map(job => (<tr key={job._id}><td className="px-4 py-3 text-sm">{new Date(job.estimateDate).toLocaleDateString()}</td><td className="px-4 py-3 text-sm">{job.serviceNames.join(', ')}</td><td className="px-4 py-3 text-right text-sm font-semibold text-blue-400">${job.totalAmount.toFixed(2)}</td></tr>))}</tbody></table></div>
                        </div>
                    ) : ( <p className="text-center text-gray-500 py-4">No vehicle found matching your search.</p> )
                ) : ( <p className="text-center text-gray-500 py-4">Enter a search term to find a vehicle's history.</p> )}
             </div>
        </section>
    );
};

const AuditLogTab = () => {
    const [auditSearch, setAuditSearch] = useState('');
    const logs = useQuery(api.auditLog.getLogs, { search: auditSearch || undefined });

    return (
        <section>
            <div className="relative mb-4">
                <input type="text" placeholder="Search logs by user, action, or target..." value={auditSearch} onChange={e => setAuditSearch(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 pl-10 text-white"/>
                <SearchIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"/>
            </div>
            <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden max-h-[60vh] overflow-y-auto">
                <table className="min-w-full">
                    <thead className="bg-gray-700 sticky top-0">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Timestamp</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">User</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Action</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {logs?.map(log => (
                            <tr key={log._id} className="hover:bg-gray-700/50">
                                <td className="px-4 py-2 text-sm text-gray-400 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                <td className="px-4 py-2 text-sm font-medium text-white">{log.userName}</td>
                                <td className="px-4 py-2 text-sm text-gray-300">{log.action}</td>
                                <td className="px-4 py-2 text-sm text-gray-400">{log.details.targetName ? `${log.details.targetName} (${log.details.targetId?.slice(-6)})` : 'System Level'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {logs?.length === 0 && <p className="text-center text-gray-500 py-8">No audit logs found.</p>}
            </div>
        </section>
    );
};

const ReportsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ReportTab>('performance');

    const renderContent = () => {
        switch(activeTab) {
            case 'performance': return <PerformanceTab />;
            case 'history': return <VehicleHistoryTab />;
            case 'audit': return <AuditLogTab />;
            default: return null;
        }
    }

    return (
        <div className="container mx-auto p-4 md:p-8">
            <header className="mb-8"><h1 className="text-3xl font-bold text-white">Reports & Analytics</h1><p className="text-gray-400 mt-1">Key insights into your business performance and activity.</p></header>
            
            <div className="bg-gray-800 rounded-lg p-2 mb-8">
                <div className="flex flex-wrap items-center gap-2">
                    <TabButton tab="performance" activeTab={activeTab} setActiveTab={setActiveTab} icon={<ChartBarIcon className="w-5 h-5" />}>Performance</TabButton>
                    <TabButton tab="history" activeTab={activeTab} setActiveTab={setActiveTab} icon={<ClipboardListIcon className="w-5 h-5" />}>Vehicle History</TabButton>
                    <TabButton tab="audit" activeTab={activeTab} setActiveTab={setActiveTab} icon={<DocumentMagnifyingGlassIcon className="w-5 h-5" />}>Audit Log</TabButton>
                </div>
            </div>
            
            {renderContent()}
        </div>
    );
};

export default ReportsPage;