import React, { useState, useEffect } from 'react';
import DriverList from './components/DriverList';
import DriverMonthlyRecord from './components/DriverMonthlyRecord';

export default function App() {
  const [initialDate] = useState(() => new Date());
  const [selectedDriver, setSelectedDriver] = useState(null);
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

  const handleSelectDriver = (driver) => {
    // Push history state so Android back button returns to list
    window.history.pushState({ screen: 'record', driverId: driver.id }, '');
    setSelectedDriver(driver);
  };

  const handleBackToList = () => {
    if (window.history.state && window.history.state.screen === 'record') {
      window.history.back();
    } else {
      setSelectedDriver(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 select-none antialiased">
      {/* Mobile container - full bleed on phone screens, centered comfortable max-width on wider screens */}
      <div className="w-full max-w-md mx-auto min-h-screen bg-slate-50 shadow-md">
        {selectedDriver ? (
          <DriverMonthlyRecord
            driver={selectedDriver}
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
    </div>
  );
}
