
import React, { useState, useMemo, useEffect } from 'react';
import { SignedIn, SignedOut, useUser } from '@clerk/clerk-react';
import { useConvexAuth, useQuery } from 'convex/react';
import { api } from './convex/_generated/api';

import Layout from './components/Layout';
import DashboardPage from './components/DashboardPage';
import ManagementPage from './components/ManagementPage';
import SchedulePage from './components/SchedulePage';
import SettingsPage from './components/SettingsPage';
import JobDetailPage from './components/JobDetailPage';
import ReportsPage from './components/ReportsPage';
import InventoryPage from './components/InventoryPage';
import MarketingPage from './components/MarketingPage';
import CustomerPortalPage from './components/CustomerPortalPage';
import StripeOnboarding from './components/StripeOnboarding';
import LandingPage from './components/LandingPage';
import KnowledgeBasePage from './components/KnowledgeBasePage';
import AssistantPage from './components/AssistantPage';
import { Page } from './types';
import BookingPage from './components/BookingPage';

function App() {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [publicJobKey, setPublicJobKey] = useState<string | null>(null);

  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(api.users.getCurrent);
  const dataForCustomerPortal = useQuery(api.jobs.getDataForCustomerPortal, publicJobKey ? { key: publicJobKey } : "skip");
  
  // Top-level routing for Public Booking Page
  if (window.location.pathname.startsWith('/book')) {
      return <BookingPage />;
  }
  
  // Top-level routing for Customer Portal
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const jobKey = urlParams.get('jobKey');
    if (jobKey) {
      setPublicJobKey(jobKey);
    }
  }, []);

  // When user switches, if they are on a page they can't access, move them to dashboard
  useEffect(() => {
    const adminPages: Page[] = ['management', 'settings', 'reports', 'inventory', 'marketing', 'stripe-onboarding', 'knowledge-base', 'assistant'];
    if (currentUser?.role === 'technician' && adminPages.includes(activePage)) {
        setActivePage('dashboard');
    }
  }, [currentUser, activePage]);

  const handleViewJobDetail = (jobId: string) => {
    setSelectedJobId(jobId);
  };

  const handleBackToList = () => {
    setSelectedJobId(null);
  };
  
  if (isAuthLoading) {
      return (
          <div className="flex items-center justify-center h-screen bg-gray-900">
              <p className="text-white">Loading Application...</p>
          </div>
      );
  }
  
  // Main application router / view renderer
  if (publicJobKey) {
    if (!dataForCustomerPortal) {
        return <div className="flex items-center justify-center h-screen"><p className="text-white">Loading Job Details...</p></div>;
    }
    if (!dataForCustomerPortal.job) {
       return <div className="flex items-center justify-center h-screen"><p className="text-red-500">Error: Could not find a job with the provided key.</p></div>;
    }

    return <CustomerPortalPage data={dataForCustomerPortal} />
  }

  const renderPage = () => {
    if (currentUser === undefined) {
      return <div className="flex items-center justify-center h-screen"><p>Loading user data...</p></div>;
    }
    if (currentUser === null) {
      return <div className="flex items-center justify-center h-screen"><p>Authenticating user...</p></div>;
    }

    if (selectedJobId) {
      return <JobDetailPage 
          jobId={selectedJobId}
          currentUser={currentUser}
          onBack={handleBackToList}
      />;
    }

    switch (activePage) {
      case 'dashboard':
        return <DashboardPage currentUser={currentUser} onViewJob={handleViewJobDetail} />;
      case 'management':
        if (currentUser.role !== 'admin') return null;
        return <ManagementPage />;
      case 'schedule':
        return <SchedulePage currentUser={currentUser} onViewJob={handleViewJobDetail} />;
       case 'settings':
        if (currentUser.role !== 'admin') return null;
        return <SettingsPage setActivePage={setActivePage} />;
       case 'stripe-onboarding':
         if (currentUser.role !== 'admin') return null;
         return <StripeOnboarding onOnboardingComplete={() => setActivePage('settings')} />;
       case 'reports':
        if (currentUser.role !== 'admin') return null;
        return <ReportsPage />;
       case 'inventory':
        if (currentUser.role !== 'admin') return null;
        return <InventoryPage />;
       case 'marketing':
        if (currentUser.role !== 'admin') return null;
        return <MarketingPage />;
       case 'knowledge-base':
        if (currentUser.role !== 'admin') return null;
        return <KnowledgeBasePage />;
       case 'assistant':
        if (currentUser.role !== 'admin') return null;
        return <AssistantPage />;
      default:
        return <DashboardPage currentUser={currentUser} onViewJob={handleViewJobDetail} />;
    }
  };

  return (
    <>
      <SignedOut>
        <LandingPage />
      </SignedOut>
      <SignedIn>
        <div className="min-h-screen bg-gray-900 text-gray-100">
          <Layout 
            activePage={activePage} 
            setActivePage={setActivePage}
            currentUser={currentUser}
          >
            {renderPage()}
          </Layout>
        </div>
      </SignedIn>
    </>
  );
}

export default App;
