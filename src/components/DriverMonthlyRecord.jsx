import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ArrowLeft, Download, FileText, MessageSquare, Plus } from 'lucide-react';
import {
  MONTH_NAMES,
  getDaysInMonth,
  formatCurrency,
} from '../utils/dateUtils';
import { exportDriverMonthlyPDF } from '../utils/pdfExport';
import { dataService } from '../services/dataService';
import DailyEntryModal from './DailyEntryModal';
import MonthPickerModal from './MonthPickerModal';
import EditDriverModal from './EditDriverModal';
import DriverAvatar from './DriverAvatar';
import NotePopover from './NotePopover';

export default function DriverMonthlyRecord({
  driver,
  onBack,
  initialYear,
  initialMonth,
  onMonthChange,
  initialProfileOpen = false,
}) {
  const [currentDriver, setCurrentDriver] = useState(driver);
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [recordsMap, setRecordsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Modal states
  const [selectedDateForEdit, setSelectedDateForEdit] = useState(null);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isEditDriverOpen, setIsEditDriverOpen] = useState(initialProfileOpen);

  const [focusNotes, setFocusNotes] = useState(false);
  const [expandedNote, setExpandedNote] = useState(null);
  const closeNote = useCallback(() => setExpandedNote(null), []);
  const totalDue = Object.values(recordsMap).reduce((sum, rec) => sum + Number(rec.pending_amount || 0), 0);
  const todayRowRef = useRef(null);

  // Load records for the current driver & month
  const loadRecords = useCallback(async (y, m) => {
    setLoading(true);
    setLoadError('');
    setRecordsMap({});
    setExpandedNote(null);
    try {
      const records = await dataService.getMonthlyRecords(currentDriver.id, y, m);
      const map = {};
      records.forEach((rec) => {
        map[rec.date] = rec;
      });
      setRecordsMap(map);
    } catch (err) {
      setLoadError(err.message || 'Could not load records');
    } finally {
      setLoading(false);
    }
  }, [currentDriver.id]);

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
      const val = Number(curr.amount);
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

  // Save daily record handler
  const handleSaveRecord = async (dateStr, newAmount, pendingAmount, notes) => {
    await dataService.saveDailyRecord(currentDriver.id, dateStr, newAmount, pendingAmount, notes);
    setRecordsMap((prev) => {
      const updated = { ...prev };
      if (newAmount === null) {
        delete updated[dateStr];
      } else {
        updated[dateStr] = { amount: newAmount, pending_amount: pendingAmount, notes: notes || '' };
      }
      return updated;
    });
  };

  // Update driver details handler
  const handleUpdateDriver = async (id, newName, newPhone) => {
    const updated = await dataService.updateDriver(id, newName, newPhone);
    setCurrentDriver(updated);
  };

  // Delete driver handler
  const handleDeleteDriver = async (id) => {
    const result = await dataService.deleteDriver(id);
    onBack(result?.warning || 'Driver, records and photos deleted.');
  };

  // PDF Export handler
  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      exportDriverMonthlyPDF({
        driverName: currentDriver.name,
        driverPhone: currentDriver.phone,
        year,
        month,
        daysInMonth,
        recordsMap,
        totalAmount,
        totalDue,
      });
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const currentMonthName = MONTH_NAMES[month - 1];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-28">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-md mx-auto px-4 pt-4 pb-3">
          {/* Back button + tappable driver photo + name + PDF */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                type="button"
                onClick={onBack}
                className="p-2 -ml-2 text-slate-700 hover:text-slate-900 active:bg-slate-100 rounded-xl min-h-[48px] min-w-[48px] flex items-center justify-center font-bold"
                aria-label="Back to drivers list"
              >
                <ArrowLeft size={24} className="stroke-[2.5]" />
              </button>
              <button type="button" onClick={() => setIsEditDriverOpen(true)} aria-label={`Open ${currentDriver.name} profile`} className="shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-blue-600"><DriverAvatar driver={currentDriver} /></button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-2xl font-extrabold text-slate-900 truncate">
                    {currentDriver.name}
                  </h1>

                </div>
                {currentDriver.phone && (
                  <p className="text-xs text-slate-500 font-medium">
                    {currentDriver.phone}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isExporting}
              className="px-3 py-2 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-700 border border-blue-200 rounded-xl font-bold text-xs flex items-center gap-1.5 min-h-[44px] shrink-0"
              title="Download Monthly PDF"
            >
              <FileText size={16} />
              <span>PDF</span>
            </button>
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
        {loadError && <p role="alert" className="p-3 text-red-700">{loadError} <button onClick={() => loadRecords(year, month)} className="underline">Retry</button></p>}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-500">
            <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-600 border-t-transparent mb-3"></div>
            <p className="text-base font-medium">Loading records...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Compact daily ledger with expandable notes */}
            <div className="grid grid-cols-4 gap-x-3 px-3 py-3.5 bg-slate-100/80 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wide">
              <div>Date</div>
              <div className="text-center">Amount</div><div className="text-center" title="Pending amount">Due</div><div className="text-center">Notes</div>
            </div>

            {/* Daily Table Rows - Tap any row to edit that day's amount */}
            <div className="divide-y divide-slate-100">
              {daysInMonth.map((dayItem) => {
                const record = recordsMap[dayItem.dateString];
                const amount = record?.amount;
                const hasAmount = amount !== undefined && amount !== null;
                const isToday = dayItem.isToday;

                return (
                  <React.Fragment key={dayItem.dateString}>
                  <div
                    ref={isToday ? todayRowRef : null}
                    onClick={() => { setFocusNotes(false); setSelectedDateForEdit(dayItem.dateString); }}
                    role="button" tabIndex={0} aria-label={`Edit amounts for ${dayItem.displayDate}`}
                    onKeyDown={event => { if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) { event.preventDefault(); setFocusNotes(false); setSelectedDateForEdit(dayItem.dateString); } }}
                    className={`grid grid-cols-4 gap-x-3 items-center px-3 py-3.5 cursor-pointer transition-colors active:bg-blue-100/60 min-h-[54px] ${
                      isToday
                        ? 'bg-blue-50/70 hover:bg-blue-100/50 shadow-[inset_3px_0_0_#2563eb]'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Column 1: Date */}
                    <div className="flex flex-wrap items-center gap-1">
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
                    <div className="flex min-w-0 justify-center">
                      {isToday ? (
                        /* Clearly editable button for today */
                        <div
                          className={`px-1 py-1.5 rounded-lg font-bold text-sm border-2 transition-all flex items-center justify-center min-w-[64px] min-h-[40px] ${
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
                          className={`text-sm font-semibold tabular-nums ${
                            hasAmount ? 'text-slate-900 font-bold' : 'text-slate-400'
                          }`}
                        >
                          {hasAmount ? formatCurrency(amount) : '—'}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 text-center text-sm font-bold text-amber-700 tabular-nums">{record ? formatCurrency(record.pending_amount || 0) : '—'}</div>
                    <button
                      type="button"
                      aria-label={(record?.notes ? expandedNote?.date === dayItem.dateString ? 'Collapse note for ' : 'Expand note for ' : 'Add note for ') + dayItem.displayDate}
                      aria-expanded={record?.notes ? expandedNote?.date === dayItem.dateString : undefined}
                      onClick={event => {
                        event.stopPropagation();
                        if (record?.notes) setExpandedNote({ date: dayItem.dateString, anchor: event.currentTarget.getBoundingClientRect() });
                        else { setFocusNotes(true); setSelectedDateForEdit(dayItem.dateString); }
                      }}
                      className={`flex min-h-11 min-w-0 items-center justify-center rounded-md text-xs hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-500 ${record?.notes ? 'text-blue-700' : 'text-slate-400'}`}
                    >
                      {record?.notes ? <MessageSquare size={16} /> : <Plus size={16} />}
                    </button>
                  </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {expandedNote && <NotePopover text={recordsMap[expandedNote.date]?.notes || ''} anchor={expandedNote.anchor} onClose={closeNote} />}

      {/* Sticky Bottom Total Bar with PDF Export */}
      <footer className="fixed bottom-0 inset-x-0 bg-white border-t-2 border-slate-200 py-3.5 px-5 z-20 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Monthly Amount
            </span>
            <span className="text-xl font-black text-blue-900 tracking-tight tabular-nums">
              {formatCurrency(totalAmount)}
            </span>
          </div>

          <div className="text-sm font-bold text-amber-700">Due<br />{formatCurrency(totalDue)}</div>
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExporting}
            className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-xs min-h-[48px] transition-colors"
          >
            <Download size={18} className="stroke-[2.5]" />
            <span>{isExporting ? 'Creating...' : 'PDF'}</span>
          </button>
        </div>
      </footer>

      {/* Daily Entry Modal */}
      {selectedDateForEdit && (
        <DailyEntryModal
          key={selectedDateForEdit}
          isOpen={Boolean(selectedDateForEdit)}
          onClose={() => setSelectedDateForEdit(null)}
          driverName={currentDriver.name}
          dateString={selectedDateForEdit}
          currentAmount={recordsMap[selectedDateForEdit]?.amount}
          currentPending={recordsMap[selectedDateForEdit]?.pending_amount}
          focusNotes={focusNotes}
          currentNotes={recordsMap[selectedDateForEdit]?.notes}
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

      {/* Edit Driver Details Modal */}
      {isEditDriverOpen && (
        <EditDriverModal
          key={`${currentDriver.id}-${isEditDriverOpen}`}
          isOpen={isEditDriverOpen}
          onClose={() => setIsEditDriverOpen(false)}
          driver={currentDriver}
          onUpdateDriver={handleUpdateDriver}
          onDeleteDriver={handleDeleteDriver}
          onProfileUpdated={setCurrentDriver}
        />
      )}
    </div>
  );
}
