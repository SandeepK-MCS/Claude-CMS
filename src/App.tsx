import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/layout/Header';
import { Sidebar, NavigationPage } from './components/layout/Sidebar';
import { LeadsPage } from './pages/LeadsPage';
import { StudentsPage } from './pages/StudentsPage';
import { MasterUpdatesPage } from './pages/MasterUpdatesPage';
import { WorkingHoursPage } from './pages/WorkingHoursPage';
import { MeetingsPage } from './pages/MeetingsPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { AncillaryServicesPage } from './pages/AncillaryServicesPage';
import { TechnicalDocumentationPage } from './pages/TechnicalDocumentationPage';

const MainLayout: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<NavigationPage>('leads');

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'leads':
        return <LeadsPage />;
      case 'students':
        return <StudentsPage />;
      case 'master_updates':
        return <MasterUpdatesPage />;
      case 'working_hours':
        return <WorkingHoursPage />;
      case 'meetings':
        return <MeetingsPage />;
      case 'applications':
        return <ApplicationsPage />;
      case 'services':
      case 'visa':
        return <AncillaryServicesPage />;
      case 'docs':
        return <TechnicalDocumentationPage />;
      default:
        return <LeadsPage />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar currentPage={currentPage} onSelectPage={setCurrentPage} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto">
            {renderCurrentPage()}
          </div>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
};

export default App;
