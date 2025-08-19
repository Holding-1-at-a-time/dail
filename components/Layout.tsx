import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { Page, User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activePage: Page;
  setActivePage: (page: Page) => void;
  currentUser: User | null;
}

const Layout: React.FC<LayoutProps> = ({ children, activePage, setActivePage, currentUser }) => {
  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar activePage={activePage} setActivePage={setActivePage} currentUser={currentUser} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header currentUser={currentUser} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;