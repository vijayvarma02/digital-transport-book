import React, { useState } from 'react';
import { MONTH_NAMES } from '../utils/dateUtils';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function MonthPickerModal({
  isOpen,
  onClose,
  currentYear,
  currentMonth,
  onSelectMonth,
}) {
  const [selectedYear, setSelectedYear] = useState(currentYear);

  if (!isOpen) return null;

  const handlePrevYear = () => setSelectedYear(selectedYear - 1);
  const handleNextYear = () => setSelectedYear(selectedYear + 1);

  const handleChoose = (monthIndex) => {
    onSelectMonth(selectedYear, monthIndex + 1);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Select Month</h3>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-700 rounded-full active:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        {/* Year Selector */}
        <div className="flex items-center justify-between my-4 px-2">
          <button
            type="button"
            onClick={handlePrevYear}
            className="p-3 text-slate-700 hover:bg-slate-100 rounded-xl active:scale-95 min-h-[48px] min-w-[48px] flex items-center justify-center font-bold"
            aria-label="Previous Year"
          >
            <ChevronLeft size={24} />
          </button>
          <span className="text-xl font-bold text-slate-900 tracking-wide">
            {selectedYear}
          </span>
          <button
            type="button"
            onClick={handleNextYear}
            className="p-3 text-slate-700 hover:bg-slate-100 rounded-xl active:scale-95 min-h-[48px] min-w-[48px] flex items-center justify-center font-bold"
            aria-label="Next Year"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* 12 Months Grid */}
        <div className="grid grid-cols-3 gap-2">
          {MONTH_NAMES.map((name, index) => {
            const isSelected = selectedYear === currentYear && index + 1 === currentMonth;
            return (
              <button
                key={name}
                type="button"
                onClick={() => handleChoose(index)}
                className={`py-3 px-2 text-sm font-bold rounded-xl transition-all active:scale-95 min-h-[48px] flex items-center justify-center ${
                  isSelected
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {name.substring(0, 3)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
