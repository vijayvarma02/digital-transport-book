import LoginGate from './components/LoginGate';
import React, { useState, useEffect } from 'react';
import DriverList from './components/DriverList';
import DriverMonthlyRecord from './components/DriverMonthlyRecord';
import InstallPrompt from './components/InstallPrompt';

export default function App() {
  const [initialDate] = useState(() => new Date());
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [openProfile, setOpenProfile] = useState(false);
  const [notice, setNotice] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => initialDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => initialDate.getFullYear());

  // Handle phone physical/browser back button gesture smoothly
  useEffect(() => {
    const handlePopState = () => {
      if (selectedDriver) {
        setSelectedDriver(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedDriver]);

  const handleSelectDriver = (driver, profile = false) => {
    setNotice('');
    setOpenProfile(Boolean(profile));
    // Push history state so Android back button returns to list
    window.history.pushState({ screen: 'record', driverId: driver.id }, '');
    setSelectedDriver(driver);
  };

  const handleBackToList = (message) => {
    if (typeof message === 'string') setNotice(message);
    if (window.history.state && window.history.state.screen === 'record') {
      window.history.back();
    } else {
      setSelectedDriver(null);
    }
  };

  return (
    <LoginGate><div className="min-h-screen bg-slate-100 font-sans text-slate-900 select-none antialiased">
      {/* Mobile container - full bleed on phone screens, centered comfortable max-width on wider screens */}
      <div className="w-full max-w-md mx-auto min-h-screen bg-slate-50 shadow-md">
        <InstallPrompt />
        {notice && !selectedDriver && <div role="status" className="flex items-start justify-between gap-3 border-b border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900"><p>{notice}</p><button type="button" onClick={() => setNotice('')} aria-label="Dismiss message" className="min-h-9 min-w-9 font-bold">×</button></div>}
        {selectedDriver ? (
          <DriverMonthlyRecord
            driver={selectedDriver}
            initialProfileOpen={openProfile}
            onBack={handleBackToList}
            initialYear={selectedYear}
            initialMonth={selectedMonth}
            onMonthChange={(y, m) => {
              setSelectedYear(y);
              setSelectedMonth(m);
            }}
          />
        ) : (
          <DriverList onSelectDriver={handleSelectDriver} />
        )}
      </div>
    </div></LoginGate>
  );
}
