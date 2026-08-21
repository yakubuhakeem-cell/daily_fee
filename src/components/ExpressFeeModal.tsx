import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { isDateInTermGap } from '../utils/termUtils';
import { Student, StudentClass, ALL_CLASSES } from '../types';
import { VoiceSearchButton } from './VoiceSearchButton';
import { 
  Zap, 
  Search, 
  Check, 
  X, 
  RotateCcw, 
  Users, 
  CheckSquare, 
  Square, 
  AlertCircle, 
  CheckCircle2, 
  Printer, 
  MessageSquare,
  DollarSign,
  UserCheck,
  UserX,
  Volume2,
  ChevronLeft,
  ChevronRight,
  CalendarDays
} from 'lucide-react';

interface ExpressFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExpressFeeModal({ isOpen, onClose }: ExpressFeeModalProps) {
  const { 
    students, 
    payments, 
    recordPayment, 
    recordAbsent, 
    deletePayment, 
    bulkRecordPayments,
    recordPupilBulkDates,
    terms,
    activeTerm,
    currentDate, 
    setCurrentDate,
    systemSettings, 
    showToast,
    playFeedbackSound 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
  
  // Single Entry States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [sessionLog, setSessionLog] = useState<Array<{
    paymentId?: string;
    studentId: string;
    studentName: string;
    studentClass: string;
    amount: number;
    time: string;
    type: 'payment' | 'absent';
  }>>([]);

  // Batch Collector States
  const [selectedClass, setSelectedClass] = useState<StudentClass>(ALL_CLASSES[0] || 'Basic 1');
  const [batchAmount, setBatchAmount] = useState<string>('5.00');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isDateRangeMode, setIsDateRangeMode] = useState<boolean>(false);
  const [batchStartDate, setBatchStartDate] = useState<string>('');
  const [batchEndDate, setBatchEndDate] = useState<string>('');

  useEffect(() => {
    if (currentDate) {
      if (!batchEndDate) setBatchEndDate(currentDate);
      if (!batchStartDate) {
        try {
          const d = new Date(currentDate);
          d.setDate(d.getDate() - 4);
          setBatchStartDate(d.toISOString().split('T')[0]);
        } catch (e) {
          setBatchStartDate(currentDate);
        }
      }
    }
  }, [currentDate]);

  const getBatchDateRange = (startStr: string, endStr: string) => {
    if (!startStr || !endStr) return [currentDate];
    const start = startStr <= endStr ? startStr : endStr;
    const end = startStr <= endStr ? endStr : startStr;

    let rangeDays = (activeTerm?.schoolDays ?? []).filter(d => d >= start && d <= end);
    if (rangeDays.length === 0) {
      const generated: string[] = [];
      let curr = new Date(start);
      const stop = new Date(end);
      while (curr <= stop) {
        const dayOfWeek = curr.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          const y = curr.getFullYear();
          const m = String(curr.getMonth() + 1).padStart(2, '0');
          const d = String(curr.getDate()).padStart(2, '0');
          generated.push(`${y}-${m}-${d}`);
        }
        curr.setDate(curr.getDate() + 1);
      }
      rangeDays = generated;
    }
    const publicHolidays = new Set(activeTerm?.publicHolidays || []);
    return rangeDays.filter(d => !publicHolidays.has(d) && !isDateInTermGap(d, terms));
  };

  const searchInputRef = useRef<HTMLInputElement>(null);

  const baseDailyFee = systemSettings?.baselineDailyFee ?? 5.00;
  const currencySymbol = systemSettings?.currencyCode || 'GHC';

  // Date Navigation Stepper Handlers
  const handlePrevDate = () => {
    const parts = currentDate.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const dateObj = new Date(year, month, day);
      dateObj.setDate(dateObj.getDate() - 1);
      
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const d = String(dateObj.getDate()).padStart(2, '0');
      const newDateStr = `${y}-${m}-${d}`;
      setCurrentDate(newDateStr);
      showToast(`Active fee collection date updated to ${newDateStr}.`);
    }
  };

  const handleNextDate = () => {
    const parts = currentDate.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const dateObj = new Date(year, month, day);
      dateObj.setDate(dateObj.getDate() + 1);
      
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const d = String(dateObj.getDate()).padStart(2, '0');
      const newDateStr = `${y}-${m}-${d}`;
      setCurrentDate(newDateStr);
      showToast(`Active fee collection date updated to ${newDateStr}.`);
    }
  };

  const handleResetToToday = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setCurrentDate(todayStr);
    showToast(`Active fee collection date reset to Today (${todayStr}).`);
  };

  // Calculate today's total collected fees
  const todayPayments = payments.filter(p => p.date === currentDate && !p.isAbsent && p.verified !== false && p.amount > 0);
  const todayTotalCollected = todayPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

  // Focus search input when modal opens or single tab is selected
  useEffect(() => {
    if (isOpen && activeTab === 'single') {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, activeTab]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter students for single entry
  const matchingStudents = searchQuery.trim() === '' ? [] : students.filter(s => {
    const q = searchQuery.toLowerCase().trim();
    return (
      s.name.toLowerCase().includes(q) ||
      s.rollNumber.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.class.toLowerCase().includes(q)
    );
  }).slice(0, 8);

  // Auto-select student if single match or exact roll match
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    const trimmed = val.trim().toLowerCase();
    const exactRoll = students.find(s => s.rollNumber.toLowerCase() === trimmed);
    if (exactRoll) {
      setSelectedStudent(exactRoll);
    } else if (val.trim().length >= 2) {
      const matches = students.filter(s => s.name.toLowerCase().includes(trimmed) || s.rollNumber.toLowerCase() === trimmed);
      if (matches.length === 1) {
        setSelectedStudent(matches[0]);
      } else {
        setSelectedStudent(null);
      }
    } else {
      setSelectedStudent(null);
    }
  };

  // Record single payment
  const handleExecutePayment = (studentToPay: Student, amountToLog: number) => {
    if (!studentToPay) return;
    
    const paidToday = payments.some(p => p.studentId === studentToPay.id && p.date === currentDate && !p.isAbsent);
    
    recordPayment(studentToPay.id, true, amountToLog, undefined, paidToday);
    playFeedbackSound?.('click');

    const newLogItem = {
      paymentId: payments.find(p => p.studentId === studentToPay.id && p.date === currentDate)?.id,
      studentId: studentToPay.id,
      studentName: studentToPay.name,
      studentClass: studentToPay.class,
      amount: amountToLog,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type: 'payment' as const
    };

    setSessionLog(prev => [newLogItem, ...prev]);
    showToast(`⚡ Collected ${currencySymbol} ${amountToLog.toFixed(2)} for ${studentToPay.name}!`);

    // Reset fields for immediate next entry
    setSearchQuery('');
    setSelectedStudent(null);
    setCustomAmount('');
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };

  // Record absent
  const handleExecuteAbsent = (studentToMark: Student) => {
    if (!studentToMark) return;
    recordAbsent(studentToMark.id);
    playFeedbackSound?.('click');

    setSessionLog(prev => [{
      studentId: studentToMark.id,
      studentName: studentToMark.name,
      studentClass: studentToMark.class,
      amount: 0,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'absent' as const
    }, ...prev]);

    showToast(`Marked ${studentToMark.name} as ABSENT.`);
    setSearchQuery('');
    setSelectedStudent(null);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };

  // Undo recent item from session log
  const handleUndoLogItem = (itemIndex: number) => {
    const item = sessionLog[itemIndex];
    if (!item) return;

    if (item.type === 'payment') {
      const matchPayment = payments.find(p => p.studentId === item.studentId && p.date === currentDate);
      if (matchPayment) {
        deletePayment(matchPayment.id);
        showToast(`Undone payment for ${item.studentName}.`);
      }
    } else {
      const matchAbsent = payments.find(p => p.studentId === item.studentId && p.date === currentDate && p.isAbsent);
      if (matchAbsent) {
        deletePayment(matchAbsent.id);
        showToast(`Undone absent mark for ${item.studentName}.`);
      }
    }

    setSessionLog(prev => prev.filter((_, idx) => idx !== itemIndex));
  };

  // Batch class logic
  const classStudents = students.filter(s => s.class === selectedClass);
  const unpaidClassStudents = classStudents.filter(s => {
    const p = payments.find(pay => pay.studentId === s.id && pay.date === currentDate);
    return !p || p.isAbsent;
  });

  const handleSelectAllUnpaidInClass = () => {
    const ids = new Set(unpaidClassStudents.map(s => s.id));
    setSelectedStudentIds(ids);
  };

  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExecuteBatchCollection = () => {
    if (selectedStudentIds.size === 0) {
      showToast('Please select at least one pupil to collect fees.');
      return;
    }

    const amt = parseFloat(batchAmount);
    if (isNaN(amt) || amt < 0) {
      showToast('Please enter a valid non-negative batch fee amount.');
      return;
    }

    const idsArray = Array.from(selectedStudentIds);

    if (isDateRangeMode) {
      const dateList = getBatchDateRange(batchStartDate, batchEndDate);
      if (dateList.length === 0) {
        showToast('Selected date range contains no valid school days.');
        return;
      }

      idsArray.forEach(studentId => {
        recordPupilBulkDates(studentId, dateList, 'paid', amt);
      });

      const totalGrandCollected = amt * dateList.length * idsArray.length;
      showToast(`⚡ Bulk collected ${currencySymbol} ${totalGrandCollected.toFixed(2)} across ${dateList.length} school days for ${idsArray.length} pupil(s)!`);

      const newLogItem = {
        studentId: 'batch',
        studentName: `Batch Class (${selectedClass}) - ${dateList.length} Days`,
        studentClass: selectedClass,
        amount: totalGrandCollected,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type: 'payment' as const
      };
      setSessionLog(prev => [newLogItem, ...prev]);
    } else {
      bulkRecordPayments(idsArray, true, amt);
      showToast(`⚡ Batch collected ${currencySymbol} ${(amt * idsArray.length).toFixed(2)} for ${idsArray.length} pupil(s) on ${currentDate}!`);
    }

    setSelectedStudentIds(new Set());
    playFeedbackSound?.('click');
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto font-mono text-white animate-fade-in">
      <div className="bg-neutral-900 border-2 border-amber-400 w-full max-w-4xl shadow-[12px_12px_0px_0px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Bar */}
        <div className="bg-neutral-950 p-4 border-b-2 border-amber-400/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400 text-black font-black rounded-none flex items-center justify-center shadow-md">
              <Zap className="w-5 h-5 fill-black stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black uppercase tracking-tight text-white font-mono">
                  Speed Fee Collector
                </h3>
                <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-amber-400/20 text-amber-400 border border-amber-400/40 rounded">
                  Express Teller Mode
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-mono">
                Ultra-fast, one-touch fee logging station with instant lookup.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-neutral-800 pt-2 sm:pt-0">
            {/* Active Ledger Date Stepper Toolbar */}
            <div className="flex items-center gap-1.5 bg-neutral-900 p-1.5 border border-amber-400/50 rounded-xs">
              <button
                type="button"
                onClick={handlePrevDate}
                className="px-2 py-1 bg-neutral-950 hover:bg-neutral-800 text-amber-400 border border-neutral-700 hover:border-amber-400 text-xs font-black uppercase transition-all cursor-pointer flex items-center gap-1"
                title="Previous Date (Step back 1 day)"
              >
                <ChevronLeft className="w-4 h-4 stroke-[3]" />
                <span className="hidden sm:inline text-[10px]">Prev Day</span>
              </button>

              <div className="flex items-center gap-1.5 px-2 py-1 bg-neutral-950 border border-neutral-800 text-xs font-mono font-bold text-white">
                <CalendarDays className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <input
                  type="date"
                  value={currentDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      setCurrentDate(e.target.value);
                      showToast(`Active fee collection date updated to ${e.target.value}.`);
                    }
                  }}
                  className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer [color-scheme:dark]"
                />
              </div>

              <button
                type="button"
                onClick={handleNextDate}
                className="px-2 py-1 bg-neutral-950 hover:bg-neutral-800 text-amber-400 border border-neutral-700 hover:border-amber-400 text-xs font-black uppercase transition-all cursor-pointer flex items-center gap-1"
                title="Next Date (Step forward 1 day)"
              >
                <span className="hidden sm:inline text-[10px]">Next Day</span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>

              <button
                type="button"
                onClick={handleResetToToday}
                className="px-2 py-1 bg-amber-400/20 hover:bg-amber-400 text-amber-300 hover:text-black border border-amber-400/40 text-[10px] font-mono font-black uppercase transition-all cursor-pointer"
                title="Reset date to Today"
              >
                Today
              </button>
            </div>

            <div className="text-right">
              <span className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Active Date Revenue</span>
              <span className="text-sm font-black text-emerald-400 font-mono">
                {currencySymbol} {todayTotalCollected.toFixed(2)} <span className="text-[10px] text-neutral-400 font-normal">({todayPayments.length} receipts)</span>
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white border border-neutral-800 hover:border-red-500 hover:bg-red-950/40 transition-colors cursor-pointer"
              title="Close Express Fee Collector (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/60 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('single')}
            className={`flex-1 py-3 px-4 text-xs font-black uppercase tracking-wider font-mono flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'single'
                ? 'border-amber-400 text-amber-400 bg-neutral-900 shadow-inner'
                : 'border-transparent text-neutral-400 hover:text-white hover:bg-neutral-900/50'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>⚡ Single Pupil Express</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('batch')}
            className={`flex-1 py-3 px-4 text-xs font-black uppercase tracking-wider font-mono flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'batch'
                ? 'border-amber-400 text-amber-400 bg-neutral-900 shadow-inner'
                : 'border-transparent text-neutral-400 hover:text-white hover:bg-neutral-900/50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>👥 Batch Class Collector</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'single' ? (
            <div className="space-y-6">
              
              {/* Search Box & Voice Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between font-mono">
                  <span>1. Search Pupil (Name, Roll #, or Class)</span>
                  <span className="text-[10px] text-neutral-400">Press ENTER to collect standard daily fee</span>
                </label>

                <div className="relative">
                  <Search className="absolute left-3.5 top-3.5 text-neutral-500 w-5 h-5 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (selectedStudent) {
                          const effectiveRate = Math.max(0, baseDailyFee - (selectedStudent.discount || 0));
                          handleExecutePayment(selectedStudent, effectiveRate);
                        } else if (matchingStudents.length > 0) {
                          const topMatch = matchingStudents[0];
                          const effectiveRate = Math.max(0, baseDailyFee - (topMatch.discount || 0));
                          handleExecutePayment(topMatch, effectiveRate);
                        }
                      }
                    }}
                    placeholder="TYPE STUDENT NAME OR ROLL NUMBER..."
                    className="w-full bg-neutral-950 border-2 border-neutral-800 focus:border-amber-400 text-sm font-black text-white pl-11 pr-24 py-3 focus:outline-none placeholder:text-neutral-600 font-mono uppercase tracking-wide"
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-1.5">
                    <VoiceSearchButton
                      inputId="express-fee-search"
                      onTranscript={(text) => handleSearchChange(text)}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedStudent(null);
                          searchInputRef.current?.focus();
                        }}
                        className="p-1 text-neutral-500 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Multiple Search Results Grid Dropdown */}
                {matchingStudents.length > 0 && !selectedStudent && (
                  <div className="border border-neutral-800 bg-neutral-950 divide-y divide-neutral-900 max-h-48 overflow-y-auto">
                    <div className="px-3 py-1.5 bg-neutral-900 text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex justify-between">
                      <span>Matches Found ({matchingStudents.length})</span>
                      <span>Click student to view options</span>
                    </div>
                    {matchingStudents.map(st => {
                      const paidInfo = payments.find(p => p.studentId === st.id && p.date === currentDate);
                      const isPaidToday = !!paidInfo && !paidInfo.isAbsent;
                      const isAbsent = !!paidInfo && paidInfo.isAbsent;
                      const effectiveRate = Math.max(0, baseDailyFee - (st.discount || 0));

                      return (
                        <div
                          key={st.id}
                          className="p-3 hover:bg-neutral-900/90 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                          onClick={() => setSelectedStudent(st)}
                        >
                          <div>
                            <span className="block text-xs font-black text-white uppercase">{st.name}</span>
                            <span className="block text-[10px] text-neutral-500 font-bold uppercase">
                              Class: {st.class} • Roll: {st.rollNumber} • {st.paymentType} Scheme
                            </span>
                          </div>

                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {isPaidToday ? (
                              <span className="px-2 py-1 bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-black uppercase rounded">
                                PAID ({currencySymbol} {paidInfo.amount.toFixed(2)})
                              </span>
                            ) : isAbsent ? (
                              <span className="px-2 py-1 bg-red-950 text-red-400 border border-red-800 text-[10px] font-black uppercase rounded">
                                ABSENT
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleExecutePayment(st, effectiveRate)}
                                className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-black text-[10px] font-black uppercase tracking-wider rounded-xs cursor-pointer shadow-sm transition-all"
                              >
                                ⚡ PAY {currencySymbol} {effectiveRate.toFixed(2)}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected Student Detail Card & One-Touch Payment Actions */}
              {selectedStudent && (() => {
                const paidInfo = payments.find(p => p.studentId === selectedStudent.id && p.date === currentDate);
                const isPaidToday = !!paidInfo && !paidInfo.isAbsent;
                const isAbsentToday = !!paidInfo && paidInfo.isAbsent;
                const effectiveRate = Math.max(0, baseDailyFee - (selectedStudent.discount || 0));

                return (
                  <div className="p-4 bg-neutral-950 border-2 border-amber-400/80 space-y-4 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-black text-white uppercase font-mono">{selectedStudent.name}</h4>
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-neutral-800 text-amber-300 uppercase rounded">
                            {selectedStudent.class}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-400 font-mono">
                          Roll #: {selectedStudent.rollNumber} • ID: {selectedStudent.id} • Parent: {selectedStudent.parentPhone || 'N/A'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {isPaidToday ? (
                          <div className="px-3 py-1.5 bg-emerald-950 border border-emerald-600 text-emerald-400 text-xs font-black uppercase font-mono flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Paid Today ({currencySymbol} {paidInfo.amount.toFixed(2)})</span>
                          </div>
                        ) : isAbsentToday ? (
                          <div className="px-3 py-1.5 bg-red-950 border border-red-600 text-red-400 text-xs font-black uppercase font-mono flex items-center gap-1.5">
                            <UserX className="w-4 h-4" />
                            <span>Marked Absent</span>
                          </div>
                        ) : (
                          <div className="px-3 py-1.5 bg-amber-950 border border-amber-600 text-amber-300 text-xs font-black uppercase font-mono flex items-center gap-1.5 animate-pulse">
                            <AlertCircle className="w-4 h-4 text-amber-400" />
                            <span>Unmarked Today</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Amount Presets Bar */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block font-mono">
                        Select Quick Preset Amount:
                      </label>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                        {/* Standard Daily Rate */}
                        <button
                          type="button"
                          onClick={() => handleExecutePayment(selectedStudent, effectiveRate)}
                          className="p-2.5 bg-amber-400 hover:bg-amber-300 text-black border border-amber-300 font-black text-xs uppercase font-mono transition-all cursor-pointer shadow-md text-center flex flex-col items-center justify-center"
                        >
                          <span className="text-[9px] opacity-80">Full Daily Fee</span>
                          <span>{currencySymbol} {effectiveRate.toFixed(2)}</span>
                        </button>

                        {/* GHC 2.00 */}
                        <button
                          type="button"
                          onClick={() => handleExecutePayment(selectedStudent, 2.00)}
                          className="p-2.5 bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700 font-black text-xs uppercase font-mono transition-all cursor-pointer text-center flex flex-col items-center justify-center"
                        >
                          <span className="text-[9px] text-neutral-400">Half Day</span>
                          <span>{currencySymbol} 2.00</span>
                        </button>

                        {/* GHC 10.00 */}
                        <button
                          type="button"
                          onClick={() => handleExecutePayment(selectedStudent, 10.00)}
                          className="p-2.5 bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700 font-black text-xs uppercase font-mono transition-all cursor-pointer text-center flex flex-col items-center justify-center"
                        >
                          <span className="text-[9px] text-neutral-400">2 Days</span>
                          <span>{currencySymbol} 10.00</span>
                        </button>

                        {/* GHC 20.00 */}
                        <button
                          type="button"
                          onClick={() => handleExecutePayment(selectedStudent, 20.00)}
                          className="p-2.5 bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700 font-black text-xs uppercase font-mono transition-all cursor-pointer text-center flex flex-col items-center justify-center"
                        >
                          <span className="text-[9px] text-neutral-400">4 Days</span>
                          <span>{currencySymbol} 20.00</span>
                        </button>

                        {/* GHC 50.00 */}
                        <button
                          type="button"
                          onClick={() => handleExecutePayment(selectedStudent, 50.00)}
                          className="p-2.5 bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700 font-black text-xs uppercase font-mono transition-all cursor-pointer text-center flex flex-col items-center justify-center"
                        >
                          <span className="text-[9px] text-neutral-400">10 Days</span>
                          <span>{currencySymbol} 50.00</span>
                        </button>

                        {/* Mark Absent */}
                        <button
                          type="button"
                          onClick={() => handleExecuteAbsent(selectedStudent)}
                          className="p-2.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800 font-black text-xs uppercase font-mono transition-all cursor-pointer text-center flex flex-col items-center justify-center"
                        >
                          <span className="text-[9px] text-red-400">Mark Attendance</span>
                          <span>Mark Absent</span>
                        </button>
                      </div>
                    </div>

                    {/* Custom Amount Entry */}
                    <div className="pt-2 border-t border-neutral-800 flex flex-col sm:flex-row items-center gap-3">
                      <div className="flex-1 w-full space-y-1">
                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block font-mono">
                          Or Enter Custom Amount:
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-amber-400 font-mono">{currencySymbol}</span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={customAmount}
                            onChange={(e) => setCustomAmount(e.target.value)}
                            placeholder="0.00"
                            className="bg-neutral-900 border border-neutral-700 text-white text-sm font-black font-mono px-3 py-2 w-full focus:outline-none focus:border-amber-400"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const amt = parseFloat(customAmount);
                                if (!isNaN(amt) && amt >= 0) {
                                  handleExecutePayment(selectedStudent, amt);
                                } else {
                                  showToast("Please enter a valid non-negative amount.");
                                }
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const amt = parseFloat(customAmount);
                              if (!isNaN(amt) && amt >= 0) {
                                handleExecutePayment(selectedStudent, amt);
                              } else {
                                showToast("Please enter a valid non-negative amount.");
                              }
                            }}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase font-mono shrink-0 cursor-pointer shadow-md"
                          >
                            Log Custom Payment
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Session Live Log Ticker */}
              {sessionLog.length > 0 && (
                <div className="p-4 bg-neutral-950 border border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <span className="text-xs font-black text-amber-400 uppercase tracking-wider font-mono flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Session Live Log ({sessionLog.length} Collections)
                    </span>
                    <button
                      type="button"
                      onClick={() => setSessionLog([])}
                      className="text-[10px] font-bold text-neutral-500 hover:text-white uppercase font-mono"
                    >
                      Clear Log
                    </button>
                  </div>

                  <div className="divide-y divide-neutral-900 max-h-40 overflow-y-auto font-mono">
                    {sessionLog.map((item, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] text-neutral-500">{item.time}</span>
                          <span className="font-bold text-white truncate">{item.studentName}</span>
                          <span className="text-[10px] text-neutral-400">({item.studentClass})</span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {item.type === 'payment' ? (
                            <span className="font-black text-emerald-400">
                              + {currencySymbol} {item.amount.toFixed(2)}
                            </span>
                          ) : (
                            <span className="font-black text-red-400 uppercase text-[10px]">
                              Marked Absent
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleUndoLogItem(idx)}
                            className="p-1 text-neutral-500 hover:text-red-400 transition-colors flex items-center gap-1 text-[10px] font-bold uppercase border border-neutral-800 hover:border-red-500/50"
                            title="Undo this session item"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Undo</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* BATCH CLASS COLLECTOR TAB */
            <div className="space-y-6">
              <div className="p-4 bg-neutral-950 border border-neutral-800 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Select Class */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block font-mono">
                      1. Select Target Class:
                    </label>
                    <select
                      value={selectedClass}
                      onChange={(e) => {
                        setSelectedClass(e.target.value as StudentClass);
                        setSelectedStudentIds(new Set());
                      }}
                      className="w-full bg-neutral-900 border-2 border-neutral-800 text-white font-mono font-bold text-xs p-2.5 focus:outline-none focus:border-amber-400 uppercase"
                    >
                      {ALL_CLASSES.map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>

                  {/* Batch Amount */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block font-mono">
                      2. Daily Batch Amount Per Student:
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-amber-400 font-mono">{currencySymbol}</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={batchAmount}
                        onChange={(e) => setBatchAmount(e.target.value)}
                        className="w-full bg-neutral-900 border-2 border-neutral-800 text-white font-mono font-bold text-xs p-2.5 focus:outline-none focus:border-amber-400"
                        placeholder="5.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Single Date vs Date Range Mode Selector */}
                <div className="bg-neutral-900 border border-neutral-800 p-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] text-amber-400 font-black uppercase font-mono tracking-wider">
                      3. ENTRY DATE MODE:
                    </span>
                    <div className="inline-flex rounded-xs border border-neutral-800 bg-neutral-950 p-0.5">
                      <button
                        type="button"
                        onClick={() => setIsDateRangeMode(false)}
                        className={`px-3 py-1 text-[10px] font-black uppercase font-mono cursor-pointer transition-all ${
                          !isDateRangeMode
                            ? 'bg-amber-400 text-black shadow-xs'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        ⚡ Single Date ({currentDate})
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsDateRangeMode(true)}
                        className={`px-3 py-1 text-[10px] font-black uppercase font-mono cursor-pointer transition-all flex items-center gap-1 ${
                          isDateRangeMode
                            ? 'bg-amber-400 text-black shadow-xs'
                            : 'text-amber-400 hover:text-white'
                        }`}
                      >
                        <CalendarDays size={12} className="stroke-[2.5]" />
                        <span>📅 Date Range (Multi-Day Bulk)</span>
                      </button>
                    </div>
                  </div>

                  {isDateRangeMode && (
                    <span className="text-[10px] font-mono text-emerald-400 font-black bg-emerald-950/80 px-2.5 py-1 border border-emerald-800/80">
                      {getBatchDateRange(batchStartDate, batchEndDate).length} School Days Active in Range
                    </span>
                  )}
                </div>

                {/* If Date Range mode is active, render Start Date and End Date range pickers */}
                {isDateRangeMode && (
                  <div className="p-3.5 bg-neutral-950 border-2 border-amber-400/60 space-y-3 font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-amber-300 font-black uppercase tracking-wider flex items-center gap-1.5">
                        <CalendarDays size={14} className="text-amber-400" />
                        <span>BATCH FEE ENTRY DATE RANGE (START DATE ➔ END DATE)</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-end">
                      <div className="space-y-1">
                        <label className="text-[9px] text-neutral-400 uppercase font-black block">Start Date</label>
                        <input
                          type="date"
                          value={batchStartDate}
                          onChange={(e) => setBatchStartDate(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-700 text-white font-mono text-xs p-2 focus:outline-none focus:border-amber-400 [color-scheme:dark]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] text-neutral-400 uppercase font-black block">End Date</label>
                        <input
                          type="date"
                          value={batchEndDate}
                          onChange={(e) => setBatchEndDate(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-700 text-white font-mono text-xs p-2 focus:outline-none focus:border-amber-400 [color-scheme:dark]"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date(currentDate);
                            const day = d.getDay();
                            const diffToMon = d.getDate() - day + (day === 0 ? -6 : 1);
                            const mon = new Date(d.setDate(diffToMon));
                            setBatchStartDate(mon.toISOString().split('T')[0]);
                            setBatchEndDate(currentDate);
                          }}
                          className="flex-1 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-[10px] text-amber-300 font-black uppercase transition-all cursor-pointer text-center"
                          title="Set range to current week (Monday to today)"
                        >
                          This Week
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const past10 = (activeTerm?.schoolDays ?? []).filter(d => d <= currentDate).slice(-10);
                            if (past10.length > 0) {
                              setBatchStartDate(past10[0]);
                              setBatchEndDate(past10[past10.length - 1]);
                            }
                          }}
                          className="flex-1 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-[10px] text-neutral-300 font-black uppercase transition-all cursor-pointer text-center"
                          title="Set range to last 10 school days"
                        >
                          Past 10 Days
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const past15 = (activeTerm?.schoolDays ?? []).filter(d => d <= currentDate).slice(-15);
                            if (past15.length > 0) {
                              setBatchStartDate(past15[0]);
                              setBatchEndDate(past15[past15.length - 1]);
                            }
                          }}
                          className="flex-1 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-[10px] text-neutral-300 font-black uppercase transition-all cursor-pointer text-center"
                          title="Set range to last 15 school days"
                        >
                          Past 15 Days
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Selection Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800 font-mono">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllUnpaidInClass}
                      className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-amber-300 border border-amber-800 text-[10px] font-black uppercase transition-all cursor-pointer"
                    >
                      Select Unpaid Only ({unpaidClassStudents.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedStudentIds(new Set(classStudents.map(s => s.id)))}
                      className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 text-[10px] font-black uppercase transition-all cursor-pointer"
                    >
                      Select All ({classStudents.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedStudentIds(new Set())}
                      className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border border-neutral-800 text-[10px] font-black uppercase transition-all cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>

                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    {selectedStudentIds.size} Pupil(s) Selected
                  </span>
                </div>
              </div>

              {/* Class Pupil Selection Roster */}
              <div className="border border-neutral-800 bg-neutral-950 divide-y divide-neutral-900 max-h-72 overflow-y-auto">
                {classStudents.length === 0 ? (
                  <div className="p-6 text-center text-xs text-neutral-500 font-mono">
                    No pupils registered in {selectedClass}.
                  </div>
                ) : (
                  classStudents.map(st => {
                    const isSelected = selectedStudentIds.has(st.id);
                    const paidInfo = payments.find(p => p.studentId === st.id && p.date === currentDate);
                    const isPaidToday = !!paidInfo && !paidInfo.isAbsent;

                    return (
                      <div
                        key={st.id}
                        onClick={() => handleToggleSelectStudent(st.id)}
                        className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                          isSelected ? 'bg-amber-950/30 border-l-4 border-amber-400' : 'hover:bg-neutral-900/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-amber-400 shrink-0" />
                          ) : (
                            <Square className="w-5 h-5 text-neutral-600 shrink-0" />
                          )}
                          <div>
                            <span className="block text-xs font-black text-white uppercase">{st.name}</span>
                            <span className="block text-[10px] text-neutral-500 font-bold uppercase">
                              Roll: {st.rollNumber} • {st.paymentType}
                            </span>
                          </div>
                        </div>

                        <div>
                          {isPaidToday ? (
                            <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 text-[9px] font-black uppercase rounded">
                              PAID TODAY ({currencySymbol} {paidInfo.amount.toFixed(2)})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-neutral-900 text-neutral-400 border border-neutral-800 text-[9px] font-black uppercase rounded">
                              UNMARKED
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Batch Action Submit Bar */}
              <div className="p-4 bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
                <div className="text-xs text-neutral-400">
                  {selectedStudentIds.size > 0 ? (
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span>Total Batch Collection:</span>
                        <strong className="text-amber-400 font-black text-sm">
                          {currencySymbol}{' '}
                          {(
                            selectedStudentIds.size *
                            (parseFloat(batchAmount) || 0) *
                            (isDateRangeMode ? getBatchDateRange(batchStartDate, batchEndDate).length : 1)
                          ).toFixed(2)}
                        </strong>
                      </div>
                      {isDateRangeMode && (
                        <div className="text-[10px] text-emerald-400 font-bold">
                          ({selectedStudentIds.size} pupils × {getBatchDateRange(batchStartDate, batchEndDate).length} days @ {currencySymbol} {parseFloat(batchAmount) || 0}/day)
                        </div>
                      )}
                    </div>
                  ) : (
                    <span>Select pupils above to execute batch collection.</span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={selectedStudentIds.size === 0}
                  onClick={handleExecuteBatchCollection}
                  className="w-full sm:w-auto px-6 py-3 bg-amber-400 hover:bg-amber-300 disabled:opacity-30 disabled:cursor-not-allowed text-black text-xs font-black uppercase tracking-wider cursor-pointer shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4 fill-black" />
                  <span>
                    Execute Batch Collection ({selectedStudentIds.size}
                    {isDateRangeMode ? ` × ${getBatchDateRange(batchStartDate, batchEndDate).length} Days` : ''})
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Shortcut Tip */}
        <div className="p-3 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between text-[10px] text-neutral-500 font-mono shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-neutral-900 border border-neutral-800 text-amber-400 font-bold">ESC</span>
            <span>Close Express Collector</span>
          </div>
          <div>
            <span>School Daily Rate: <strong>{currencySymbol} {baseDailyFee.toFixed(2)}</strong></span>
          </div>
        </div>

      </div>
    </div>
  );
}
