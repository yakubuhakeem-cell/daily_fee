/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { StudentClass } from '../types';
import { 
  Trash2, 
  AlertTriangle, 
  Calendar, 
  Users, 
  CheckSquare, 
  Square, 
  X, 
  ShieldAlert, 
  Coins, 
  ArrowRight,
  Filter,
  Layers,
  Sparkles,
  Info,
  RotateCcw
} from 'lucide-react';

interface ClearClassFeesModalProps {
  initialClass?: StudentClass;
  isOpen: boolean;
  onClose: () => void;
}

export const ClearClassFeesModal: React.FC<ClearClassFeesModalProps> = ({
  initialClass = 'B5',
  isOpen,
  onClose
}) => {
  const {
    students,
    payments,
    examsPayments,
    activeTerm,
    terms,
    deleteClassFeeRecords,
    showToast,
    currencySymbol
  } = useApp();

  const [selectedClass, setSelectedClass] = useState<StudentClass | 'ALL'>(initialClass);
  const [scope, setScope] = useState<'full_term' | 'specific_weeks' | 'custom_range' | 'all_time'>('full_term');
  const [feeCategory, setFeeCategory] = useState<'daily_only' | 'exams_only' | 'both'>('daily_only');
  const [selectedWeeks, setSelectedWeeks] = useState<number[]>([]);
  const [customStartDate, setCustomStartDate] = useState<string>(activeTerm?.startDate || '');
  const [customEndDate, setCustomEndDate] = useState<string>(
    activeTerm?.schoolDays?.[activeTerm.schoolDays.length - 1] || activeTerm?.endDate || ''
  );
  const [confirmedSafety, setConfirmedSafety] = useState<boolean>(false);
  const [verificationInput, setVerificationInput] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [resultSummary, setResultSummary] = useState<{
    dailyCount: number;
    examsCount: number;
    amount: number;
    pupilsCount: number;
    message: string;
  } | null>(null);

  // Compute total weeks in active term
  const totalTermWeeks = useMemo(() => {
    if (!activeTerm || !activeTerm.schoolDays) return 12;
    return Math.max(1, Math.ceil(activeTerm.schoolDays.length / 5));
  }, [activeTerm]);

  // Initialize selected weeks if empty
  React.useEffect(() => {
    if (selectedWeeks.length === 0 && totalTermWeeks > 0) {
      const allWeeks = Array.from({ length: totalTermWeeks }, (_, i) => i + 1);
      setSelectedWeeks(allWeeks);
    }
  }, [totalTermWeeks]);

  const allClasses: Array<StudentClass | 'ALL'> = [
    'Nursery', 'KG1', 'KG2', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', 'ALL'
  ];

  // Calculate matching date range info
  const dateRangeInfo = useMemo(() => {
    if (scope === 'full_term') {
      if (activeTerm) {
        const start = activeTerm.startDate;
        const days = activeTerm.schoolDays || [];
        const end = days.length > 0 ? days[days.length - 1] : (activeTerm.endDate || 'N/A');
        return {
          title: `Full Active Term: ${activeTerm.name}`,
          rangeStr: `${start} to ${end}`,
          weeksCount: totalTermWeeks,
          daysCount: days.length
        };
      }
      return { title: 'Full Term', rangeStr: 'Active Term Dates', weeksCount: 12, daysCount: 60 };
    }

    if (scope === 'specific_weeks') {
      if (activeTerm && activeTerm.schoolDays && activeTerm.schoolDays.length > 0 && selectedWeeks.length > 0) {
        const sortedWeeks = [...selectedWeeks].sort((a, b) => a - b);
        const matchingDays: string[] = [];
        sortedWeeks.forEach(w => {
          const startIdx = (w - 1) * 5;
          const endIdx = startIdx + 5;
          const weekDays = activeTerm.schoolDays.slice(startIdx, endIdx);
          matchingDays.push(...weekDays);
        });
        const start = matchingDays[0] || 'N/A';
        const end = matchingDays[matchingDays.length - 1] || 'N/A';
        return {
          title: `Weeks ${sortedWeeks.join(', ')}`,
          rangeStr: `${start} to ${end}`,
          weeksCount: sortedWeeks.length,
          daysCount: matchingDays.length
        };
      }
      return { title: 'Specific Weeks', rangeStr: 'No weeks selected', weeksCount: 0, daysCount: 0 };
    }

    if (scope === 'custom_range') {
      return {
        title: 'Custom Date Range',
        rangeStr: `${customStartDate || 'Start'} to ${customEndDate || 'End'}`,
        weeksCount: 0,
        daysCount: 0
      };
    }

    return {
      title: 'Entire History',
      rangeStr: 'All Recorded Academic Dates',
      weeksCount: 0,
      daysCount: 0
    };
  }, [scope, activeTerm, totalTermWeeks, selectedWeeks, customStartDate, customEndDate]);

  // Date matcher
  const isDateInScope = React.useCallback((dStr: string) => {
    if (scope === 'all_time') return true;
    if (scope === 'custom_range') {
      const s = customStartDate || '1970-01-01';
      const e = customEndDate || '2099-12-31';
      return dStr >= s && dStr <= e;
    }
    if (scope === 'full_term' && activeTerm) {
      const start = activeTerm.startDate;
      const days = activeTerm.schoolDays || [];
      const end = days.length > 0 ? days[days.length - 1] : (activeTerm.endDate || '2099-12-31');
      return (days.length > 0 ? days.includes(dStr) : (dStr >= start && dStr <= end));
    }
    if (scope === 'specific_weeks' && activeTerm && activeTerm.schoolDays) {
      const matchingDays = new Set<string>();
      selectedWeeks.forEach(w => {
        const startIdx = (w - 1) * 5;
        const endIdx = startIdx + 5;
        const weekDays = activeTerm.schoolDays.slice(startIdx, endIdx);
        weekDays.forEach(d => matchingDays.add(d));
      });
      return matchingDays.has(dStr);
    }
    return true;
  }, [scope, activeTerm, selectedWeeks, customStartDate, customEndDate]);

  // Students in selected class
  const classStudents = useMemo(() => {
    return students
      .filter(s => selectedClass === 'ALL' || s.class === selectedClass)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [students, selectedClass]);

  const classStudentIds = useMemo(() => new Set(classStudents.map(s => s.id)), [classStudents]);

  // Calculate matching payment records and totals
  const previewImpact = useMemo(() => {
    let matchingDailyPayments = 0;
    let totalDailyAmount = 0;
    let matchingExamsPayments = 0;
    let totalExamsAmount = 0;

    const studentRecordBreakdown: Record<string, { dailyCount: number; dailyTotal: number; examsCount: number; examsTotal: number }> = {};

    classStudents.forEach(s => {
      studentRecordBreakdown[s.id] = { dailyCount: 0, dailyTotal: 0, examsCount: 0, examsTotal: 0 };
    });

    if (feeCategory === 'daily_only' || feeCategory === 'both') {
      payments.forEach(p => {
        const matchesClass = selectedClass === 'ALL' || p.class === selectedClass || classStudentIds.has(p.studentId);
        if (matchesClass && classStudentIds.has(p.studentId) && isDateInScope(p.date)) {
          matchingDailyPayments++;
          totalDailyAmount += (p.amount || 0);
          if (studentRecordBreakdown[p.studentId]) {
            studentRecordBreakdown[p.studentId].dailyCount++;
            studentRecordBreakdown[p.studentId].dailyTotal += (p.amount || 0);
          }
        }
      });
    }

    if (feeCategory === 'exams_only' || feeCategory === 'both') {
      examsPayments.forEach(ep => {
        const matchesClass = selectedClass === 'ALL' || ep.class === selectedClass || classStudentIds.has(ep.studentId);
        const matchesTerm = !activeTerm || !ep.termId || ep.termId === activeTerm.id;
        if (matchesClass && classStudentIds.has(ep.studentId) && (scope === 'all_time' || matchesTerm || isDateInScope(ep.datePaid))) {
          matchingExamsPayments++;
          totalExamsAmount += (ep.amountPaid || 0);
          if (studentRecordBreakdown[ep.studentId]) {
            studentRecordBreakdown[ep.studentId].examsCount++;
            studentRecordBreakdown[ep.studentId].examsTotal += (ep.amountPaid || 0);
          }
        }
      });
    }

    const pupilsWithRecords = classStudents.filter(s => {
      const b = studentRecordBreakdown[s.id];
      return b && (b.dailyCount > 0 || b.examsCount > 0);
    });

    return {
      matchingDailyPayments,
      totalDailyAmount,
      matchingExamsPayments,
      totalExamsAmount,
      totalRecords: matchingDailyPayments + matchingExamsPayments,
      totalAmount: totalDailyAmount + totalExamsAmount,
      pupilsWithRecordsCount: pupilsWithRecords.length,
      studentRecordBreakdown
    };
  }, [payments, examsPayments, classStudents, classStudentIds, selectedClass, feeCategory, scope, activeTerm, isDateInScope]);

  // Filter students for preview table
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return classStudents;
    const term = searchTerm.toLowerCase();
    return classStudents.filter(s => 
      s.name.toLowerCase().includes(term) ||
      (s.rollNumber || '').toLowerCase().includes(term) ||
      s.class.toLowerCase().includes(term)
    );
  }, [classStudents, searchTerm]);

  const handleToggleWeek = (weekNum: number) => {
    setSelectedWeeks(prev => 
      prev.includes(weekNum) ? prev.filter(w => w !== weekNum) : [...prev, weekNum]
    );
  };

  const handleSelectAllWeeks = () => {
    const all = Array.from({ length: totalTermWeeks }, (_, i) => i + 1);
    setSelectedWeeks(all);
  };

  const handleDeselectAllWeeks = () => {
    setSelectedWeeks([]);
  };

  const handleDelete = () => {
    if (previewImpact.totalRecords === 0) {
      showToast("No fee records found matching this class and date scope.");
      return;
    }

    if (!confirmedSafety && verificationInput.trim().toUpperCase() !== 'DELETE') {
      showToast("Please confirm the safety checkbox or type DELETE to proceed.");
      return;
    }

    setIsDeleting(true);

    try {
      const res = deleteClassFeeRecords({
        targetClass: selectedClass,
        scope,
        selectedWeeks: scope === 'specific_weeks' ? selectedWeeks : undefined,
        startDate: scope === 'custom_range' ? customStartDate : undefined,
        endDate: scope === 'custom_range' ? customEndDate : undefined,
        feeCategory
      });

      if (res.success) {
        setResultSummary({
          dailyCount: res.deletedDailyPaymentsCount,
          examsCount: res.deletedExamsPaymentsCount,
          amount: res.totalAmountCleared,
          pupilsCount: res.affectedStudentsCount,
          message: res.message
        });
        showToast(res.message);
      } else {
        showToast(res.message || "Failed to delete class fee records.");
      }
    } catch (e: any) {
      console.error("Delete class fees error:", e);
      showToast(e.message || "An unexpected error occurred while deleting fee records.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-neutral-950 border-4 border-red-600/90 max-w-4xl w-full my-auto rounded-none shadow-[0_0_50px_rgba(220,38,38,0.3)] flex flex-col max-h-[92vh] overflow-hidden font-mono">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-red-950/80 via-neutral-900 to-neutral-950 p-5 border-b-2 border-red-700/80 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-600 text-black font-black">
              <Trash2 size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/40 px-2 py-0.5 font-black uppercase tracking-widest">
                  BULK CLASS CLEARANCE
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 font-bold uppercase">
                  AUTO-BACKUP PROTECTED
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white mt-0.5">
                Delete Class Fee Records & Term Reset
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 transition rounded-none cursor-pointer"
            title="Close"
          >
            <X size={20} className="stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-neutral-200 custom-scrollbar flex-1">

          {resultSummary ? (
            /* Success Summary View */
            <div className="p-6 bg-neutral-900 border-2 border-emerald-500/80 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-400/40">
                <CheckSquare size={28} />
              </div>
              <h3 className="text-lg font-black uppercase text-white tracking-wide">
                Class Fee Records Successfully Cleared!
              </h3>
              <p className="text-xs text-neutral-300 max-w-xl mx-auto leading-relaxed">
                {resultSummary.message}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 max-w-2xl mx-auto">
                <div className="bg-neutral-950 border border-neutral-800 p-3 text-center">
                  <span className="text-[9px] text-neutral-500 uppercase block font-bold">Class</span>
                  <span className="text-sm font-black text-amber-400">{selectedClass === 'ALL' ? 'All Classes' : selectedClass}</span>
                </div>
                <div className="bg-neutral-950 border border-neutral-800 p-3 text-center">
                  <span className="text-[9px] text-neutral-500 uppercase block font-bold">Daily Records</span>
                  <span className="text-sm font-black text-white">{resultSummary.dailyCount}</span>
                </div>
                <div className="bg-neutral-950 border border-neutral-800 p-3 text-center">
                  <span className="text-[9px] text-neutral-500 uppercase block font-bold">Pupils Reset</span>
                  <span className="text-sm font-black text-white">{resultSummary.pupilsCount}</span>
                </div>
                <div className="bg-neutral-950 border border-neutral-800 p-3 text-center">
                  <span className="text-[9px] text-neutral-500 uppercase block font-bold">Amount Voided</span>
                  <span className="text-sm font-black text-emerald-400">{currencySymbol} {resultSummary.amount.toFixed(2)}</span>
                </div>
              </div>

              <div className="p-3 bg-blue-950/30 border border-blue-800/60 rounded text-left max-w-2xl mx-auto text-[11px] text-blue-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-blue-200">
                  <ShieldAlert size={14} /> Safe Backup Created:
                </p>
                <p className="text-neutral-400">
                  A complete snapshot backup was automatically captured before deletion. If you ever need to roll back, visit <strong>Database &gt; Stored Snapshots</strong> or the <strong>Trash Bin</strong>.
                </p>
              </div>

              <div className="pt-4 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setResultSummary(null);
                    setConfirmedSafety(false);
                    setVerificationInput('');
                  }}
                  className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs uppercase cursor-pointer"
                >
                  Clear Another Scope
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase cursor-pointer shadow-lg"
                >
                  Done & Close
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Step 1: Select Target Class */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <span>1. Select Target Class</span>
                  </label>
                  <span className="text-[10px] text-neutral-400">
                    {classStudents.length} Active Pupils Enrolled
                  </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {allClasses.map(cls => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => {
                        setSelectedClass(cls);
                        setConfirmedSafety(false);
                      }}
                      className={`py-2 px-1 text-center font-mono font-black text-xs uppercase transition border cursor-pointer ${
                        selectedClass === cls
                          ? 'bg-amber-400 text-black border-amber-300 shadow-md font-extrabold'
                          : 'bg-neutral-900 hover:bg-neutral-850 text-neutral-300 border-neutral-800'
                      }`}
                    >
                      {cls === 'ALL' ? '⭐ ALL' : cls}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Select Date Range / Scope */}
              <div className="space-y-3 bg-neutral-900/70 border border-neutral-850 p-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Calendar size={14} />
                    <span>2. Select Academic Fee Date Range</span>
                  </label>
                  <span className="text-[10px] text-neutral-400 font-bold">
                    {dateRangeInfo.rangeStr}
                  </span>
                </div>

                {/* Scope Selection Tabs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setScope('full_term')}
                    className={`p-3 text-left border cursor-pointer transition ${
                      scope === 'full_term'
                        ? 'bg-red-950/40 border-red-500 text-white shadow-sm'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-black block uppercase text-amber-400">Full Active Term</span>
                    <span className="text-[9.5px] text-neutral-400 block mt-0.5 leading-tight">
                      Week 1 to Final Term Week
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScope('specific_weeks')}
                    className={`p-3 text-left border cursor-pointer transition ${
                      scope === 'specific_weeks'
                        ? 'bg-red-950/40 border-red-500 text-white shadow-sm'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-black block uppercase text-amber-400">Specific Weeks</span>
                    <span className="text-[9.5px] text-neutral-400 block mt-0.5 leading-tight">
                      Pick Week 1, 2, 3, etc.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScope('custom_range')}
                    className={`p-3 text-left border cursor-pointer transition ${
                      scope === 'custom_range'
                        ? 'bg-red-950/40 border-red-500 text-white shadow-sm'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-black block uppercase text-amber-400">Custom Dates</span>
                    <span className="text-[9.5px] text-neutral-400 block mt-0.5 leading-tight">
                      Pick Start & End Dates
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScope('all_time')}
                    className={`p-3 text-left border cursor-pointer transition ${
                      scope === 'all_time'
                        ? 'bg-red-950/40 border-red-500 text-white shadow-sm'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-black block uppercase text-amber-400">Entire History</span>
                    <span className="text-[9.5px] text-neutral-400 block mt-0.5 leading-tight">
                      All Dates Across All Terms
                    </span>
                  </button>
                </div>

                {/* Sub-controls based on scope */}
                {scope === 'specific_weeks' && (
                  <div className="p-3 bg-neutral-950 border border-neutral-800 space-y-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase text-neutral-400">
                        Toggle Weeks to Clear ({selectedWeeks.length}/{totalTermWeeks} selected):
                      </span>
                      <div className="flex gap-2 text-[9px]">
                        <button
                          type="button"
                          onClick={handleSelectAllWeeks}
                          className="text-amber-400 hover:underline cursor-pointer font-bold"
                        >
                          Select All
                        </button>
                        <span className="text-neutral-600">|</span>
                        <button
                          type="button"
                          onClick={handleDeselectAllWeeks}
                          className="text-neutral-400 hover:underline cursor-pointer"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 pt-1">
                      {Array.from({ length: totalTermWeeks }, (_, idx) => {
                        const weekNum = idx + 1;
                        const isSelected = selectedWeeks.includes(weekNum);
                        return (
                          <button
                            key={weekNum}
                            type="button"
                            onClick={() => handleToggleWeek(weekNum)}
                            className={`py-1.5 px-2 text-xs font-bold uppercase border transition flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-red-600 text-white border-red-500 font-extrabold'
                                : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border-neutral-800'
                            }`}
                          >
                            <span>W{weekNum}</span>
                            {isSelected ? <CheckSquare size={12} /> : <Square size={12} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {scope === 'custom_range' && (
                  <div className="p-3 bg-neutral-950 border border-neutral-800 grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    <div>
                      <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">
                        Start Date:
                      </label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={e => setCustomStartDate(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 text-white p-2 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">
                        End Date:
                      </label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={e => setCustomEndDate(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 text-white p-2 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Fee Type Scope */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Coins size={14} />
                  <span>3. Fee Records to Remove</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFeeCategory('daily_only')}
                    className={`p-3 text-left border cursor-pointer transition ${
                      feeCategory === 'daily_only'
                        ? 'bg-amber-400 text-black border-amber-300 font-extrabold shadow-sm'
                        : 'bg-neutral-900 hover:bg-neutral-850 text-neutral-300 border-neutral-800'
                    }`}
                  >
                    <span className="text-xs font-black block uppercase">Daily Fees Only</span>
                    <span className={`text-[9px] block mt-0.5 ${feeCategory === 'daily_only' ? 'text-neutral-900' : 'text-neutral-400'}`}>
                      Standard daily check-ins & feeding collections
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeeCategory('exams_only')}
                    className={`p-3 text-left border cursor-pointer transition ${
                      feeCategory === 'exams_only'
                        ? 'bg-amber-400 text-black border-amber-300 font-extrabold shadow-sm'
                        : 'bg-neutral-900 hover:bg-neutral-850 text-neutral-300 border-neutral-800'
                    }`}
                  >
                    <span className="text-xs font-black block uppercase">Terminal Exams Fees Only</span>
                    <span className={`text-[9px] block mt-0.5 ${feeCategory === 'exams_only' ? 'text-neutral-900' : 'text-neutral-400'}`}>
                      Terminal examination fee payments only
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeeCategory('both')}
                    className={`p-3 text-left border cursor-pointer transition ${
                      feeCategory === 'both'
                        ? 'bg-amber-400 text-black border-amber-300 font-extrabold shadow-sm'
                        : 'bg-neutral-900 hover:bg-neutral-850 text-neutral-300 border-neutral-800'
                    }`}
                  >
                    <span className="text-xs font-black block uppercase">Both Daily & Exams Fees</span>
                    <span className={`text-[9px] block mt-0.5 ${feeCategory === 'both' ? 'text-neutral-900' : 'text-neutral-400'}`}>
                      Complete clean wipe of all fee types
                    </span>
                  </button>
                </div>
              </div>

              {/* Dynamic Live Impact Summary Box */}
              <div className="bg-red-950/30 border-2 border-red-600/70 p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-red-400 tracking-wider flex items-center gap-1.5">
                    <AlertTriangle size={14} />
                    <span>Live Clearance Impact Calculation</span>
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    Target: <strong className="text-white">{selectedClass === 'ALL' ? 'All Classes' : `Class ${selectedClass}`}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
                  <div className="bg-neutral-950 border border-neutral-800 p-2.5 text-center">
                    <span className="text-[9px] text-neutral-500 uppercase block font-bold">Pupils in Class</span>
                    <span className="text-base font-black text-white">{classStudents.length}</span>
                  </div>
                  <div className="bg-neutral-950 border border-neutral-800 p-2.5 text-center">
                    <span className="text-[9px] text-neutral-500 uppercase block font-bold">Affected Pupils</span>
                    <span className="text-base font-black text-amber-400">{previewImpact.pupilsWithRecordsCount}</span>
                  </div>
                  <div className="bg-neutral-950 border border-neutral-800 p-2.5 text-center">
                    <span className="text-[9px] text-neutral-500 uppercase block font-bold">Records to Delete</span>
                    <span className="text-base font-black text-red-400">{previewImpact.totalRecords}</span>
                  </div>
                  <div className="bg-neutral-950 border border-neutral-800 p-2.5 text-center">
                    <span className="text-[9px] text-neutral-500 uppercase block font-bold">Total Amount Cleared</span>
                    <span className="text-base font-black text-emerald-400">
                      {currencySymbol} {previewImpact.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {previewImpact.totalRecords === 0 && (
                  <p className="text-[11px] text-neutral-400 text-center italic">
                    ℹ️ No payment records currently match this class and date scope.
                  </p>
                )}
              </div>

              {/* Pupil Roster Breakdown Table */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <span className="text-[10px] font-bold uppercase text-neutral-400 font-mono">
                    Pupils in {selectedClass === 'ALL' ? 'All Classes' : `Class ${selectedClass}`} ({filteredStudents.length}):
                  </span>
                  <input
                    type="text"
                    placeholder="Search pupil name or roll..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="bg-neutral-900 border border-neutral-800 text-white text-xs px-2.5 py-1 w-full sm:w-48 font-mono"
                  />
                </div>

                <div className="border border-neutral-850 max-h-44 overflow-y-auto custom-scrollbar bg-neutral-950 divide-y divide-neutral-900">
                  {filteredStudents.map(s => {
                    const info = previewImpact.studentRecordBreakdown[s.id] || { dailyCount: 0, dailyTotal: 0, examsCount: 0, examsTotal: 0 };
                    const hasRecords = info.dailyCount > 0 || info.examsCount > 0;
                    const studentTotal = info.dailyTotal + info.examsTotal;
                    return (
                      <div key={s.id} className={`p-2.5 flex items-center justify-between text-xs font-mono ${hasRecords ? 'bg-neutral-900/40' : 'opacity-60'}`}>
                        <div className="min-w-0 flex-1 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white uppercase truncate">{s.name}</span>
                            <span className="text-[9px] bg-neutral-800 text-neutral-400 px-1 py-0.2 uppercase">{s.class}</span>
                          </div>
                          <span className="text-[9px] text-neutral-500 block">
                            Roll: #{s.rollNumber || 'N/A'} • {s.paymentType === 'Term' ? 'Term Payer' : 'Daily Scheme'}
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          {hasRecords ? (
                            <div>
                              <span className="text-red-400 font-black">
                                -{info.dailyCount + info.examsCount} records
                              </span>
                              <span className="text-[10px] text-emerald-400 block font-bold">
                                {currencySymbol} {studentTotal.toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-neutral-600 font-bold">0 records</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Safety Confirmation Guard */}
              <div className="p-4 bg-neutral-900 border border-neutral-800 space-y-3 font-mono">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmedSafety}
                    onChange={e => setConfirmedSafety(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-neutral-700 bg-neutral-950 text-red-600 focus:ring-0 cursor-pointer"
                  />
                  <div className="text-xs space-y-1">
                    <span className="text-white font-bold block">
                      I understand this action will permanently clear {previewImpact.totalRecords} fee records totaling {currencySymbol} {previewImpact.totalAmount.toFixed(2)} for {selectedClass === 'ALL' ? 'All Classes' : `Class ${selectedClass}`}.
                    </span>
                    <span className="text-[11px] text-neutral-400 block">
                      An automated restorable backup snapshot will be saved in your database before deletion.
                    </span>
                  </div>
                </label>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1 border-t border-neutral-800">
                  <span className="text-[10px] text-neutral-400 uppercase font-bold">
                    Or type <strong className="text-red-400">DELETE</strong> to authorize:
                  </span>
                  <input
                    type="text"
                    value={verificationInput}
                    onChange={e => setVerificationInput(e.target.value)}
                    placeholder="Type DELETE"
                    className="bg-neutral-950 border border-neutral-800 px-3 py-1 text-xs text-red-400 font-black uppercase tracking-wider w-32 focus:border-red-500 focus:outline-none font-mono"
                  />
                </div>
              </div>
            </>
          )}

        </div>

        {/* Modal Footer */}
        {!resultSummary && (
          <div className="p-4 bg-neutral-950 border-t-2 border-neutral-850 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-300 font-bold text-xs uppercase cursor-pointer transition"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={
                isDeleting || 
                previewImpact.totalRecords === 0 || 
                (!confirmedSafety && verificationInput.trim().toUpperCase() !== 'DELETE')
              }
              onClick={handleDelete}
              className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-500 disabled:bg-neutral-900 disabled:text-neutral-600 disabled:border-neutral-800 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-wider border-2 border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.5)] transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Deleting Fee Records...</span>
                </>
              ) : (
                <>
                  <Trash2 size={15} />
                  <span>Delete {selectedClass === 'ALL' ? 'All Classes' : selectedClass} Fee Records ({previewImpact.totalRecords})</span>
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
