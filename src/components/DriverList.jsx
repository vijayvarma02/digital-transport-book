import React, { useState, useEffect } from 'react';
import { ChevronRight, Plus, Settings } from 'lucide-react';
import { MONTH_NAMES, getTodayDateString, formatCurrency } from '../utils/dateUtils';
import { dataService } from '../services/dataService';
import AddDriverModal from './AddDriverModal';
import DatabaseSettingsModal from './DatabaseSettingsModal';

export default function DriverList({ onSelectDriver, selectedMonth, selectedYear }) {
  const [drivers, setDrivers] = useState([]);
  const [todayRecords, setTodayRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);

  const todayStr = getTodayDateString();
  const currentMonthName = MONTH_NAMES[selectedMonth - 1];

  const loadDriversData = React.useCallback(async () => {
    setLoading(true);
    try {
      const driverList = await dataService.getDrivers();
      setDrivers(driverList);
      const todayMap = await dataService.getTodayRecordsForAllDrivers(todayStr);
      setTodayRecords(todayMap);
    } catch (err) {
      console.error('Failed to load drivers:', err);
    } finally {
      setLoading(false);
    }
  }, [todayStr]);

  useEffect(() => {
    loadDriversData();
  }, [loadDriversData]);

  const handleAddDriver = async (name, phone) => {
    const newDriver = await dataService.addDriver(name, phone);
    setDrivers((prev) => [...prev, newDriver]);
  };

  const handleResetDemo = () => {
    dataService.resetDemoData();
    loadDriversData();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-12">
      {/* Top Header Bar */}
      <header className="bg-white border-b border-slate-200 px-5 pt-6 pb-5 sticky top-0 z-10 shadow-xs">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Driver Records
            </h1>
            <button
              onClick={() => setIsDbModalOpen(true)}
              className="p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-full active:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Database / Settings"
              aria-label="Settings"
            >
              <Settings size={20} />
            </button>
          </div>
          <p className="text-base font-semibold text-blue-800 mt-1">
            {currentMonthName} {selectedYear}
          </p>
        </div>
      </header>

      {/* Main Driver List */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-4">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-500">
            <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent mb-3"></div>
            <p className="text-base font-medium">Opening register...</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {drivers.map((driver) => {
              const todayAmount = todayRecords[driver.id];
              const hasTodayEntry = todayAmount !== undefined && todayAmount !== null;

              return (
                <button
                  key={driver.id}
                  onClick={() => onSelectDriver(driver)}
                  className="w-full bg-white hover:bg-blue-50/50 active:bg-blue-100/70 border border-slate-200 hover:border-blue-300 rounded-xl px-5 py-4 flex items-center justify-between transition-colors text-left shadow-xs min-h-[64px]"
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <span className="text-xl font-bold text-slate-900 block truncate">
                      {driver.name}
                    </span>
                    {driver.phone && (
                      <span className="text-xs text-slate-400 font-medium block mt-0.5">
                        {driver.phone}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {hasTodayEntry ? (
                      <span className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-100 rounded-md">
                        Today: {formatCurrency(todayAmount)}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-medium text-slate-400 bg-slate-100 rounded-md">
                        Today: —
                      </span>
                    )}
                    <ChevronRight size={22} className="text-slate-400" />
                  </div>
                </button>
              );
            })}

            {/* Add Driver Button */}
            <div className="pt-3">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="w-full py-4 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl flex items-center justify-center gap-2 text-slate-700 font-bold text-base transition-colors min-h-[56px]"
              >
                <Plus size={20} className="text-blue-700 stroke-[2.5]" />
                Add Driver
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <AddDriverModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddDriver={handleAddDriver}
      />

      <DatabaseSettingsModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        onConfigChanged={loadDriversData}
        onResetDemo={handleResetDemo}
      />
    </div>
  );
}
