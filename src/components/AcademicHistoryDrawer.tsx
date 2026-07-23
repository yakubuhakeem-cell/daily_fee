import React, { useState, useMemo } from 'react';
import { useApp, calculateStudentFinancialState } from '../context/AppContext';
import { motion } from 'motion/react';
import { 
  X, 
  Calendar, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  CheckCircle, 
  FileText, 
  ArrowLeftRight,
  BookOpen,
  FolderSync,
  History
} from 'lucide-react';

interface AcademicHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AcademicHistoryDrawer({ isOpen, onClose }: AcademicHistoryDrawerProps) {
  const { 
    terms = [], 
    payments = [], 
    examsPayments = [], 
    examsExpenses = [], 
    students = [], 
    expenses = [], 
    viewingTermId, 
    setViewingTermId, 
    realActiveTerm,
    currentDate,
    systemSettings
  } = useApp();

  // State to hold local selected term in drawer for analyzing
  const [selectedTermId, setSelectedTermId] = useState<string | null>(viewingTermId);

  // Active students
  const activeStudents = useMemo(() => students.filter(s => s.active), [students]);
  const activeStudentsCount = activeStudents.length;

  const baseDailyFee = systemSettings?.baselineDailyFee ?? 5.00;

  // Compute metrics for the selected term
  const selectedTermData = useMemo(() => {
    const term = terms.find(t => t.id === (selectedTermId || realActiveTerm?.id));
    if (!term) return null;

    const schoolDaysList = term.schoolDays || [];
    const publicHolidaysList = term.publicHolidays || [];
    const scheduledTeachingDays = schoolDaysList.filter(d => !publicHolidaysList.includes(d)).length;

    // Attendance & Daily collections
    const termDailyPayments = payments.filter(p => p.verified && schoolDaysList.includes(p.date));
    const termPresentPayments = termDailyPayments.filter(p => !p.isAbsent);
    
    const activeStudentIds = new Set(activeStudents.map(s => s.id));
    const termAbsentCount = payments.filter(p => 
      p.verified && 
      p.isAbsent && 
      schoolDaysList.includes(p.date) && 
      activeStudentIds.has(p.studentId)
    ).length;

    const totalPresentCheckins = Math.max(0, activeStudentsCount * scheduledTeachingDays - termAbsentCount);
    const totalPupilDaysAvailable = activeStudentsCount * scheduledTeachingDays;
    const attendanceRate = totalPupilDaysAvailable > 0 
      ? (totalPresentCheckins / totalPupilDaysAvailable) * 100 
      : 0;

    // Daily Registration Collections
    const dailyFeesCollected = termPresentPayments.reduce((sum, p) => sum + p.amount, 0);

    // Exams Payments
    const examsCollected = examsPayments
      .filter(p => p.termId === term.id)
      .reduce((sum, p) => sum + p.amountPaid, 0);

    const totalRevenueCollected = dailyFeesCollected + examsCollected;

    // Core Expenses (standard school expenses during school days)
    const dailyExpenses = expenses
      .filter(e => schoolDaysList.includes(e.date))
      .reduce((sum, e) => sum + e.amount, 0);

    // Exams Provider Bills (vendor settlement)
    const vendorExamsExpenses = examsExpenses
      .filter(e => e.termId === term.id)
      .reduce((sum, e) => sum + e.totalAmount, 0);

    const totalExpensesIncurred = dailyExpenses + vendorExamsExpenses;

    // Term Net Margin
    const netMargin = totalRevenueCollected - totalExpensesIncurred;

    // Calculate historical outstanding debt at the end of that term
    const lastDayOfTerm = schoolDaysList[schoolDaysList.length - 1] || currentDate;
    const termDebtProfile = activeStudents.reduce((sum, s) => {
      const state = calculateStudentFinancialState(s, payments, term, lastDayOfTerm, baseDailyFee, systemSettings);
      return sum + state.totalDebt;
    }, 0);

    return {
      term,
      scheduledTeachingDays,
      totalPresentCheckins,
      totalPupilDaysAvailable,
      attendanceRate,
      dailyFeesCollected,
      examsCollected,
      totalRevenueCollected,
      dailyExpenses,
      vendorExamsExpenses,
      totalExpensesIncurred,
      netMargin,
      termDebtProfile,
      lastDayOfTerm
    };
  }, [selectedTermId, terms, payments, examsPayments, examsExpenses, activeStudents, baseDailyFee, systemSettings, currentDate, realActiveTerm]);

  if (!isOpen) return null;

  const hasOverrideActive = viewingTermId !== null;
  const currentViewedTermName = terms.find(t => t.id === (viewingTermId || realActiveTerm?.id))?.name || 'Live Active Term';

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity" 
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-lg md:max-w-xl bg-neutral-950 border-l-4 border-neutral-800 shadow-2xl z-50 flex flex-col overflow-hidden text-neutral-100 font-sans">
        {/* Drawer Header */}
        <div className="p-6 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-amber-400 text-black rounded">
              <History size={20} className="stroke-[2.5]" />
            </span>
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase">Academic Archives</h2>
              <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Multi-Term Historic Debt & Analytics</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Active View Indicator Banner */}
          {hasOverrideActive ? (
            <div className="bg-amber-400 text-black p-4 border-l-4 border-amber-600 rounded-none shadow-md">
              <div className="flex gap-2.5 items-start">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase tracking-wide">Historical Archive View Enabled</p>
                  <p className="text-[11px] font-medium leading-relaxed">
                    You have rolled back the main application dashboard, reports, rosters, and financial tables to view <strong>{currentViewedTermName}</strong>. 
                  </p>
                  <button
                    onClick={() => {
                      setViewingTermId(null);
                      setSelectedTermId(null);
                    }}
                    className="mt-2.5 bg-black hover:bg-neutral-900 text-amber-400 border border-neutral-800 font-mono text-[9px] font-black uppercase tracking-wider px-3 py-1.5 transition-all shadow-md active:translate-y-0.5"
                  >
                    ⚡ Return to Live Active Term
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-950/40 text-emerald-400 p-4 border border-emerald-900/60 rounded-none">
              <div className="flex gap-2.5 items-center">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></div>
                <p className="text-[11px] font-mono uppercase font-black tracking-wider">
                  Live Mode Active &bull; Term: {realActiveTerm?.name || 'None'}
                </p>
              </div>
            </div>
          )}

          {/* Quick Term Selector Dropdown */}
          <div className="space-y-2">
            <label className="block text-[10px] font-mono font-black text-neutral-400 uppercase tracking-widest">
              Select Historic Term to Inspect
            </label>
            <div className="relative">
              <select
                value={selectedTermId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedTermId(val || null);
                }}
                className="w-full bg-neutral-900 border-2 border-neutral-800 p-3.5 font-mono text-xs uppercase text-amber-400 focus:outline-none focus:border-amber-400 rounded-none cursor-pointer"
              >
                <option value="">-- Active Working Term (Live Workspace) --</option>
                {terms.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.id === realActiveTerm?.id ? '(ACTIVE WORKSPACE)' : '(ARCHIVED)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Core Analytics Card for Selected Term */}
          {selectedTermData && (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                <h3 className="text-xs font-black uppercase tracking-widest font-mono text-neutral-400">
                  Term Report Card: <span className="text-white">{selectedTermData.term.name}</span>
                </h3>
                <span className="text-[9px] font-mono bg-neutral-900 text-neutral-500 px-2 py-0.5 uppercase">
                  {selectedTermData.term.startDate} Start
                </span>
              </div>

              {/* Grid Metrics */}
              <div className="grid grid-cols-2 gap-4">
                {/* Metric 1: Attendance */}
                <div className="bg-neutral-900 border border-neutral-850 p-4 relative overflow-hidden">
                  <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider block">Attendance Rate</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black">{selectedTermData.attendanceRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-neutral-850 h-1.5 mt-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full" 
                      style={{ width: `${Math.min(100, selectedTermData.attendanceRate)}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-neutral-500 font-mono mt-1 block">
                    {selectedTermData.totalPresentCheckins} / {selectedTermData.totalPupilDaysAvailable} pupil-days
                  </span>
                </div>

                {/* Metric 2: Historic Debt */}
                <div className="bg-neutral-900 border border-neutral-850 p-4 relative overflow-hidden">
                  <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider block">Outstanding Unpaid Debt</span>
                  <div className="flex items-baseline gap-1 mt-1 text-red-400">
                    <span className="text-[10px] font-mono uppercase font-black">GHC</span>
                    <span className="text-xl font-black">{selectedTermData.termDebtProfile.toFixed(2)}</span>
                  </div>
                  <span className="text-[9px] text-neutral-500 font-mono mt-2.5 block">
                    Debt position at end of term
                  </span>
                </div>

                {/* Metric 3: Total Collections */}
                <div className="bg-neutral-900 border border-neutral-850 p-4 relative overflow-hidden">
                  <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider block">Total Collections</span>
                  <div className="flex items-baseline gap-1 mt-1 text-emerald-400">
                    <span className="text-[10px] font-mono uppercase font-black">GHC</span>
                    <span className="text-xl font-black">{selectedTermData.totalRevenueCollected.toFixed(2)}</span>
                  </div>
                  <span className="text-[9px] text-neutral-500 font-mono mt-2 block">
                    Daily: {selectedTermData.dailyFeesCollected.toFixed(0)} • Exams: {selectedTermData.examsCollected.toFixed(0)}
                  </span>
                </div>

                {/* Metric 4: Net Balance / Position */}
                <div className="bg-neutral-900 border border-neutral-850 p-4 relative overflow-hidden">
                  <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider block">Net Profit Position</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-[10px] font-mono uppercase font-black">GHC</span>
                    <span className={`text-xl font-black ${selectedTermData.netMargin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {selectedTermData.netMargin.toFixed(2)}
                    </span>
                    {selectedTermData.netMargin >= 0 ? (
                      <TrendingUp size={14} className="text-emerald-400 ml-1 pb-0.5" />
                    ) : (
                      <TrendingDown size={14} className="text-red-400 ml-1 pb-0.5" />
                    )}
                  </div>
                  <span className="text-[9px] text-neutral-500 font-mono mt-2 block">
                    Expenses: GHC {selectedTermData.totalExpensesIncurred.toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Dynamic Warning of Read-only Action */}
              <div className="bg-neutral-900 border-2 border-neutral-800 p-4 flex flex-col gap-3">
                <div className="flex gap-2">
                  <FolderSync size={16} className="text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-neutral-300 leading-relaxed font-medium">
                    Do you want to roll back the entire interface to view records, lists, reports, registries, and exam invoice stats specifically for <strong>{selectedTermData.term.name}</strong>?
                  </p>
                </div>
                
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setViewingTermId(selectedTermId);
                      onClose();
                    }}
                    disabled={viewingTermId === selectedTermId}
                    className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-black font-mono text-[10px] font-black uppercase tracking-wider px-4 py-2 flex items-center gap-1.5 transition-all shadow-md rounded-none"
                  >
                    <ArrowLeftRight size={12} className="stroke-[3]" />
                    <span>Roll Back Workspace View</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Academic Terms Historical Archive Overview Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest font-mono text-neutral-400">
              System Academic Calendar ({terms.length} Terms)
            </h3>
            
            <div className="divide-y divide-neutral-850 border border-neutral-800 bg-neutral-900/50">
              {terms.map(t => {
                const isActiveTerm = t.id === realActiveTerm?.id;
                const isSelected = selectedTermId === t.id || (!selectedTermId && isActiveTerm);
                const days = t.schoolDays || [];
                const holidaysCount = t.publicHolidays?.length || 0;
                
                return (
                  <div 
                    key={t.id} 
                    onClick={() => setSelectedTermId(t.id)}
                    className={`p-4 transition-colors cursor-pointer flex justify-between items-center ${isSelected ? 'bg-amber-400/5' : 'hover:bg-neutral-900/40'}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold uppercase tracking-wide ${isSelected ? 'text-amber-400' : 'text-neutral-100'}`}>
                          {t.name}
                        </span>
                        {isActiveTerm && (
                          <span className="text-[8px] font-mono font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1 rounded">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] font-mono text-neutral-500 uppercase">
                        Start: {t.startDate} &bull; {days.length} working days &bull; {holidaysCount} holidays
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingTermId(t.id);
                          setSelectedTermId(t.id);
                          onClose();
                        }}
                        className={`text-[9px] font-mono uppercase font-black border px-2 py-1 transition-all ${
                          viewingTermId === t.id 
                            ? 'bg-amber-400 border-amber-400 text-black' 
                            : 'bg-transparent border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500'
                        }`}
                      >
                        {viewingTermId === t.id ? 'Viewing' : 'Activate View'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 bg-neutral-900 border-t border-neutral-800 text-center">
          <p className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">
            SAAKO HOLY CHILD ACADEMY HISTORIC DATABASE LEDGER v3.5
          </p>
        </div>
      </div>
    </>
  );
}
