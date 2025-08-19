import React from 'react';
import { Page, User } from '../types';
import { HomeIcon, BriefcaseIcon, CogIcon, CalendarIcon, ChartBarIcon, CubeIcon, MegaphoneIcon, BookOpenIcon, SparklesIcon } from './icons';

interface SidebarProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
  currentUser: User | null;
}

const NavLink: React.FC<{
    page: Page;
    label: string;
    icon: React.ReactNode;
    activePage: Page;
    setActivePage: (page: Page) => void;
}> = ({ page, label, icon, activePage, setActivePage }) => {
    const isActive = activePage === page;
    return (
        <button
            onClick={() => setActivePage(page)}
            className={`flex items-center w-full px-4 py-3 text-left transition-colors duration-200 rounded-lg ${
                isActive
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
        >
            <div className="mr-3">{icon}</div>
            <span className="font-medium">{label}</span>
        </button>
    );
};


const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage, currentUser }) => {
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="flex flex-col w-64 bg-gray-800 border-r border-gray-700">
      <div className="flex items-center justify-center h-20 border-b border-gray-700">
        <h1 className="text-2xl font-bold text-white">Detailing Pro</h1>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-2">
        <NavLink 
            page="dashboard"
            label="Dashboard"
            icon={<HomeIcon className="w-6 h-6" />}
            activePage={activePage}
            setActivePage={setActivePage}
        />
        <NavLink 
            page="schedule"
            label="Schedule"
            icon={<CalendarIcon className="w-6 h-6" />}
            activePage={activePage}
            setActivePage={setActivePage}
        />
        {isAdmin && (
            <>
                <NavLink 
                    page="management"
                    label="Management"
                    icon={<BriefcaseIcon className="w-6 h-6" />}
                    activePage={activePage}
                    setActivePage={setActivePage}
                />
                 <NavLink 
                    page="inventory"
                    label="Inventory"
                    icon={<CubeIcon className="w-6 h-6" />}
                    activePage={activePage}
                    setActivePage={setActivePage}
                />
                 <NavLink 
                    page="assistant"
                    label="Assistant"
                    icon={<SparklesIcon className="w-6 h-6" />}
                    activePage={activePage}
                    setActivePage={setActivePage}
                />
                 <NavLink 
                    page="marketing"
                    label="Marketing"
                    icon={<MegaphoneIcon className="w-6 h-6" />}
                    activePage={activePage}
                    setActivePage={setActivePage}
                />
                <NavLink 
                    page="knowledge-base"
                    label="Knowledge Base"
                    icon={<BookOpenIcon className="w-6 h-6" />}
                    activePage={activePage}
                    setActivePage={setActivePage}
                />
                <NavLink 
                    page="reports"
                    label="Reports"
                    icon={<ChartBarIcon className="w-6 h-6" />}
                    activePage={activePage}
                    setActivePage={setActivePage}
                />
            </>
        )}
      </nav>
      <div className="px-4 py-4 border-t border-gray-700">
         {isAdmin && (
            <NavLink 
                page="settings"
                label="Settings"
                icon={<CogIcon className="w-6 h-6" />}
                activePage={activePage}
                setActivePage={setActivePage}
            />
         )}
      </div>
    </div>
  );
};

export default Sidebar;