import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ArrowLeft } from 'lucide-react';
import {
  MONTH_NAMES,
  getDaysInMonth,
  formatCurrency,
} from '../utils/dateUtils';
import { dataService } from '../services/dataService';
import DailyEntryModal from './DailyEntryModal';
import MonthPickerModal from './MonthPickerModal';

export default function DriverMonthlyRecord({
  driver,
  onBack,
  initialYear,
  initialMonth,
  onMonthChange,
}) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [recordsMap, setRecordsMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Modal states
  const [selectedDateForEdit, setSelectedDateForEdit] = useState(null);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  const todayRowRef = useRef(null);

  // Load records for the current driver & month
  const loadRecords = useCallback(async (y, m) => {
    setLoading(true);
    try {
      const records = await dataService.getMonthlyRecords(driver.id, y, m);
      const map = {};
      records.forEach((rec) => {
        map[rec.date] = rec.amount;
      });
      setRecordsMap(map);
    } catch (err) {
      console.error('Failed to load records:', err);
    } finally {
      setLoading(false);
    }
  }, [driver.id]);

  useEffect(() => {
    loadRecords(year, month);
  }, [year, month, loadRecords]);

  // Days list for this month
  const daysInMonth = useMemo(() => {
    return getDaysInMonth(year, month);
  }, [year, month]);

  // Total amount calculation
  const totalAmount = useMemo(() => {
    return Object.values(recordsMap).reduce((acc, curr) => {
      const val = Number(curr);
      return !isNaN(val) ? acc + val : acc;
    }, 0);
  }, [recordsMap]);

  // Auto-scroll to today's row if in current month
  useEffect(() => {
    if (!loading && todayRowRef.current) {
      const timer = setTimeout(() => {
        todayRowRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [loading, year, month]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (month === 1) {
      const nextY = year - 1;
      const nextM = 12;
      setYear(nextY);
      setMonth(nextM);
      if (onMonthChange) onMonthChange(nextY, nextM);
    } else {
      const nextM = month - 1;
      setMonth(nextM);
      if (onMonthChange) onMonthChange(year, nextM);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      const nextY = year + 1;
      const nextM = 1;
      setYear(nextY);
      setMonth(nextM);
      if (onMonthChange) onMonthChange(nextY, nextM);
    } else {
      const nextM = month + 1;
      setMonth(nextM);
      if (onMonthChange) onMonthChange(year, nextM);
    }
  };

  const handleSelectMonth = (newYear, newMonth) => {
    setYear(newYear);
    setMonth(newMonth);
    if (onMonthChange) onMonthChange(newYear, newMonth);
  };

  // Save record handler (called from DailyEntryModal)
  const handleSaveRecord = async (dateStr, newAmount) => {
    await dataService.saveDailyRecord(driver.id, dateStr, newAmount);
    setRecordsMap((prev) => {
      const updated = { ...prev };
      if (newAmount === null) {
        delete updated[dateStr];
      } else {
        updated[dateStr] = newAmount;
      }
      return updated;
    });
  };

  const currentMonthName = MONTH_NAMES[month - 1];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-28">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-md mx-auto px-4 pt-4 pb-3">
          {/* Back button + Driver Name */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-2 -ml-2 text-slate-700 hover:text-slate-900 active:bg-slate-100 rounded-xl min-h-[48px] min-w-[48px] flex items-center justify-center font-bold"
              aria-label="Back to drivers list"
            >
              <ArrowLeft size={24} className="stroke-[2.5]" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-extrabold text-slate-900 truncate">
                {driver.name}
              </h1>
              {driver.phone && (
                <p className="text-xs text-slate-500 font-medium">
                  {driver.phone}
                </p>
              )}
            </div>
          </div>

          {/* Month Navigation Row */}
          <div className="mt-3 flex items-center justify-between bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 text-slate-700 hover:text-slate-900 active:bg-slate-200 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center font-bold"
              aria-label="Previous Month"
            >
              <ChevronLeft size={22} className="stroke-[2.5]" />
            </button>

            <button
              type="button"
              onClick={() => setIsMonthPickerOpen(true)}
              className="px-4 py-2 text-base font-bold text-slate-900 hover:text-blue-700 flex items-center gap-1.5 active:bg-slate-200 rounded-lg min-h-[44px]"
            >
              <span>{currentMonthName} {year}</span>
              <ChevronDown size={18} className="text-slate-500 stroke-[2.5]" />
            </button>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 text-slate-700 hover:text-slate-900 active:bg-slate-200 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center font-bold"
              aria-label="Next Month"
            >
              <ChevronRight size={22} className="stroke-[2.5]" />
            </button>
          </div>
        </div>
      </header>

      {/* Register Table Container */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-3">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-500">
            <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent mb-3"></div>
            <p className="text-base font-medium">Loading records...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Table Header: Only 2 Columns */}
            <div className="grid grid-cols-2 px-5 py-3.5 bg-slate-100/80 border-b border-slate-200 text-sm font-bold text-slate-600 uppercase tracking-wider">
              <div>Date</div>
              <div className="text-right">Amount</div>
            </div>

            {/* Daily Table Rows */}
            <div className="divide-y divide-slate-100">
              {daysInMonth.map((dayItem) => {
                const amount = recordsMap[dayItem.dateString];
                const hasAmount = amount !== undefined && amount !== null;
                const isToday = dayItem.isToday;

                return (
                  <div
                    key={dayItem.dateString}
                    ref={isToday ? todayRowRef : null}
                    onClick={() => setSelectedDateForEdit(dayItem.dateString)}
                    className={`grid grid-cols-2 items-center px-5 py-3.5 cursor-pointer transition-colors active:bg-blue-100/60 min-h-[54px] ${
                      isToday
                        ? 'bg-blue-50/70 hover:bg-blue-100/50 border-l-4 border-l-blue-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Column 1: Date */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-base font-semibold ${
                          isToday ? 'text-blue-900 font-bold' : 'text-slate-800'
                        }`}
                      >
                        {dayItem.displayDate}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {dayItem.dayOfWeek}
                      </span>
                      {isToday && (
                        <span className="px-1.5 py-0.5 text-[10px] font-extrabold text-blue-700 bg-blue-100 rounded tracking-wider uppercase">
                          Today
                        </span>
                      )}
                    </div>

                    {/* Column 2: Amount */}
                    <div className="flex justify-end">
                      {isToday ? (
                        /* Clearly editable button for today */
                        <div
                          className={`px-3 py-1.5 rounded-lg font-bold text-base border-2 transition-all flex items-center justify-center min-w-[88px] min-h-[40px] ${
                            hasAmount
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-500 shadow-xs'
                              : 'bg-white text-blue-700 border-blue-500 border-dashed hover:bg-blue-50'
                          }`}
                        >
                          {hasAmount ? formatCurrency(amount) : '+ Enter'}
                        </div>
                      ) : (
                        /* Normal day display */
                        <span
                          className={`text-base font-semibold tabular-nums ${
                            hasAmount ? 'text-slate-900 font-bold' : 'text-slate-400'
                          }`}
                        >
                          {hasAmount ? formatCurrency(amount) : '—'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Sticky Bottom Total Bar */}
      <footer className="fixed bottom-0 inset-x-0 bg-white border-t-2 border-slate-200 py-4 px-6 z-20 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Monthly Total
            </span>
            <span className="text-xl font-extrabold text-slate-900">
              Total
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-blue-900 tracking-tight tabular-nums">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </div>
      </footer>

      {/* Daily Entry Modal */}
      {selectedDateForEdit && (
        <DailyEntryModal
          key={selectedDateForEdit}
          isOpen={Boolean(selectedDateForEdit)}
          onClose={() => setSelectedDateForEdit(null)}
          driverName={driver.name}
          dateString={selectedDateForEdit}
          currentAmount={recordsMap[selectedDateForEdit]}
          onSave={handleSaveRecord}
        />
      )}

      {/* Month Picker Modal */}
      <MonthPickerModal
        isOpen={isMonthPickerOpen}
        onClose={() => setIsMonthPickerOpen(false)}
        currentYear={year}
        currentMonth={month}
        onSelectMonth={handleSelectMonth}
      />
    </div>
  );
}
