
import React, { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { BriefcaseIcon, CreditCardIcon, UserGroupIcon, PlusIcon, CalendarIcon, CubeIcon } from './icons';
import { User } from '../types';
import JobFormModal from './JobFormModal';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, Title);

interface DashboardPageProps {
    currentUser: User | null;
    onViewJob: (jobId: string) => void;
}

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6 flex items-center space-x-4">
        <div className="bg-gray-700 p-3 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    </div>
);

const DashboardPage: React.FC<DashboardPageProps> = ({ currentUser, onViewJob }) => {
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  
  const dashboardData = useQuery(api.users.getDashboardData);

  if (!currentUser || !dashboardData) {
      return <div className="p-8 text-center">Loading dashboard...</div>;
  }

  const { stats, jobsForDashboard, adminDashboardData } = dashboardData;
  const isAdmin = currentUser.role === 'admin';

  const chartData = useMemo(() => {
    if (!isAdmin || !adminDashboardData?.revenueByServiceChartData) {
        return { labels: [], datasets: [] };
    }
    const chart = adminDashboardData.revenueByServiceChartData;
    return {
      labels: chart.labels,
      datasets: [
        {
          label: 'Revenue',
          data: chart.data,
          backgroundColor: [
            'rgba(59, 130, 246, 0.7)',
            'rgba(16, 185, 129, 0.7)',
            'rgba(239, 68, 68, 0.7)',
            'rgba(245, 158, 11, 0.7)',
            'rgba(139, 92, 246, 0.7)',
          ],
          borderColor: [
            '#1E1E1E',
          ],
          borderWidth: 2,
        },
      ],
    };
  }, [isAdmin, adminDashboardData]);
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { color: '#E5E7EB', padding: 15, font: { size: 12 } } },
      title: { display: true, text: 'Top 5 Services by Revenue', color: '#F9FAFB', font: { size: 16 } },
    },
  };

  return (
    <>
        <div className="container mx-auto p-4 md:p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                <p className="text-gray-400 mt-1">
                    Welcome back, {currentUser.name}! Here's a snapshot of your business activity.
                </p>
            </header>

            <div className={`grid grid-cols-1 md:grid-cols-2 ${isAdmin ? 'lg:grid-cols-5' : 'lg:grid-cols-1'} gap-6 mb-8`}>
                <StatCard 
                    title={isAdmin ? "Active Jobs" : "My Active Jobs"} 
                    value={stats.activeJobs.toString()} 
                    icon={<BriefcaseIcon className="w-6 h-6 text-blue-400" />} 
                />
                {isAdmin && (
                    <>
                        <StatCard 
                            title="Revenue (This Month)" 
                            value={(stats.revenueThisMonth || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                            icon={<CreditCardIcon className="w-6 h-6 text-green-400" />} 
                        />
                        <StatCard 
                            title="Total Customers" 
                            value={(stats.totalCustomers || 0).toString()} 
                            icon={<UserGroupIcon className="w-6 h-6 text-yellow-400" />} 
                        />
                        <StatCard 
                            title="Appointments Today" 
                            value={stats.appointmentsToday?.toString() || '0'}
                            icon={<CalendarIcon className="w-6 h-6 text-teal-400" />} 
                        />
                        <StatCard 
                            title="Low Stock Items" 
                            value={stats.lowStockItems?.toString() || '0'}
                            icon={<CubeIcon className="w-6 h-6 text-red-400" />} 
                        />
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className={`${isAdmin ? 'lg:col-span-3' : 'lg:col-span-5'}`}>
                    <div className="bg-gray-800 rounded-lg shadow-lg p-6 h-full">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white">{isAdmin ? "Recent Activity" : "My Assigned Jobs"}</h2>
                            <button
                                onClick={() => setIsJobModalOpen(true)}
                                className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105"
                            >
                                <PlusIcon className="w-5 h-5 mr-2" />
                                Create New Job
                            </button>
                        </div>
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                            {jobsForDashboard.length > 0 ? jobsForDashboard.map(job => {
                                const { customer, vehicle } = job;
                                const statusColor = {
                                    estimate: 'border-yellow-500', workOrder: 'border-blue-500', invoice: 'border-purple-500',
                                    completed: 'border-green-500', cancelled: 'border-gray-600',
                                };
                                return (
                                    <button 
                                        key={job._id} 
                                        onClick={() => onViewJob(job._id)} 
                                        className={`w-full text-left p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors border-l-4 ${statusColor[job.status]}`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold text-white">{customer?.name}</p>
                                                <p className="text-sm text-gray-400">{vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Unknown Vehicle'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-mono text-lg text-blue-400">${job.totalAmount.toFixed(2)}</p>
                                                <p className="text-xs text-gray-400 capitalize">{job.status}</p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            }) : (
                                <div className="text-center py-12 flex flex-col items-center justify-center h-full">
                                    <BriefcaseIcon className="w-12 h-12 text-gray-600 mb-4"/>
                                    <p className="text-gray-500">{isAdmin ? "No recent jobs to display." : "You have no assigned jobs."}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {isAdmin && adminDashboardData && (
                    <div className="lg:col-span-2">
                        <div className="bg-gray-800 rounded-lg shadow-lg p-6 h-full flex flex-col justify-center">
                            {adminDashboardData.revenueByServiceChartData.labels.length > 0 ? (
                                <div className="h-[400px]">
                                    <Doughnut data={chartData} options={chartOptions} />
                                </div>
                            ) : (
                                <div className="text-center">
                                    <p className="text-gray-500">No revenue data for the last 30 days to display a chart.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
        <JobFormModal
            isOpen={isJobModalOpen}
            onClose={() => setIsJobModalOpen(false)}
            jobToEdit={null}
        />
    </>
  );
};

export default DashboardPage;