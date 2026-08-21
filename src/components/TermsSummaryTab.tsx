import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Term, ExpenseCategory, PaymentRecord, Expense, WorkerSalary, ExamsPayment, ExamsExpense } from '../types';
import { SchoolLogo } from './SchoolLogo';
import { TeacherSalaryIncrementModal } from './TeacherSalaryIncrementModal';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  Search, 
  Printer, 
  Download, 
  Calendar, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ArrowUpRight, 
  PieChart as PieIcon, 
  DollarSign, 
  Building2, 
  Users, 
  Receipt, 
  Filter, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  FileSpreadsheet, 
  ShieldCheck, 
  Info,
  Clock,
  ArrowRightLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const COLORS = [
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#6366f1', // Indigo
  '#ef4444'  // Red
];

function deduplicateById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function TermsSummaryTab() {
  const { 
    terms = [], 
    activeTerm, 
    payments = [], 
    expenses = [], 
    salaries = [], 
    examsPayments = [], 
    examsExpenses = [], 
    students = [], 
    systemSettings,
    theme,
    currentDate
  } = useApp();

  const isDaylight = theme === 'daylight';

  // Local states
  const [selectedYear, setSelectedYear] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTermId, setExpandedTermId] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showSalaryIncrementModal, setShowSalaryIncrementModal] = useState(false);
  const [printWatermark, setPrintWatermark] = useState<'OFFICIAL' | 'CONFIDENTIAL' | 'AUDITED'>('AUDITED');
  const [printSignatory, setPrintSignatory] = useState('Yakubu Hakeem (Headmaster)');

  // Extract available academic years from terms
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    terms.forEach(t => {
      const yearMatch = t.name.match(/\d{4}/) || t.startDate.match(/^\d{4}/);
      if (yearMatch) {
        years.add(yearMatch[0]);
      }
    });
    return Array.from(years).sort().reverse();
  }, [terms]);

  // Filter terms by search & year
  const filteredTerms = useMemo(() => {
    return terms.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
      const yearMatch = t.name.match(/\d{4}/) || t.startDate.match(/^\d{4}/);
      const termYear = yearMatch ? yearMatch[0] : '';
      const matchesYear = selectedYear === 'All' || termYear === selectedYear;
      return matchesSearch && matchesYear;
    });
  }, [terms, searchQuery, selectedYear]);

  // Helper to determine date boundaries for each term
  const termBoundsMap = useMemo(() => {
    const sortedTerms = [...terms].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const bounds = new Map<string, { start: string; end: string; schoolDaysCount: number }>();

    sortedTerms.forEach((t, idx) => {
      const start = t.startDate || (t.schoolDays && t.schoolDays[0]) || '1970-01-01';
      let end = t.schoolDays && t.schoolDays.length > 0 ? t.schoolDays[t.schoolDays.length - 1] : t.startDate;
      
      // If there's a next term, use day before next term's start date as upper boundary if end is earlier
      if (idx < sortedTerms.length - 1) {
        const nextStart = sortedTerms[idx + 1].startDate;
        if (nextStart && nextStart > end) {
          end = nextStart;
        }
      } else {
        // Last term extends into future
        if (!end || end < start) end = '2099-12-31';
      }

      bounds.set(t.id, {
        start,
        end,
        schoolDaysCount: t.daysCount || (t.schoolDays ? t.schoolDays.length : 1)
      });
    });

    return bounds;
  }, [terms]);

  // Detailed term calculations
  const termCalculations = useMemo(() => {
    return terms.map(term => {
      const bound = termBoundsMap.get(term.id) || { 
        start: term.startDate, 
        end: term.startDate, 
        schoolDaysCount: term.daysCount || 1 
      };

      // 1. Daily Check-Ins & Term Payments attributed to this term
      const termPayments = payments.filter((p: PaymentRecord) => {
        if (p.verified === false || p.isAbsent === true || p.amount <= 0) return false;
        if (p.termId) return p.termId === term.id;
        return p.date >= bound.start && p.date <= bound.end;
      });
      const uniqueTermPayments = deduplicateById<PaymentRecord>(termPayments);

      const dailyCheckInIncome = uniqueTermPayments
        .filter((p: PaymentRecord) => !p.id.includes('term_payer'))
        .reduce((sum: number, p: PaymentRecord) => sum + (Number(p.amount) || 0), 0);

      const termPayerIncome = uniqueTermPayments
        .filter((p: PaymentRecord) => p.id.includes('term_payer'))
        .reduce((sum: number, p: PaymentRecord) => sum + (Number(p.amount) || 0), 0);

      const totalPaymentsIncome = dailyCheckInIncome + termPayerIncome;

      // 2. Exam Payments attributed to this term (strictly matched and deduplicated)
      const termExamPayments = examsPayments.filter((ep: ExamsPayment) => {
        if (ep.termId) return ep.termId === term.id;
        return ep.datePaid >= bound.start && ep.datePaid <= bound.end;
      });
      const uniqueExamPayments = deduplicateById<ExamsPayment>(termExamPayments);
      const examsIncome = uniqueExamPayments.reduce((sum: number, ep: ExamsPayment) => sum + (Number(ep.amountPaid) || 0), 0);

      // Total Term Income
      const totalIncome = totalPaymentsIncome + examsIncome;

      // 3. Operational Expenses attributed to this term
      const termExpenses = expenses.filter((e: Expense) => {
        if ((e as any).termId) return (e as any).termId === term.id;
        return e.date >= bound.start && e.date <= bound.end;
      });
      const uniqueTermExpenses = deduplicateById<Expense>(termExpenses);
      const opExpensesAmount = uniqueTermExpenses.reduce((sum: number, e: Expense) => sum + (Number(e.amount) || 0), 0);

      // Expense Breakdown by Category
      const expensesByCategory: Record<string, number> = {};
      uniqueTermExpenses.forEach((e: Expense) => {
        const cat = e.category || 'Others';
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + (Number(e.amount) || 0);
      });

      // 4. Staff Payroll & Salaries attributed to this term
      const termSalaries = salaries.filter((s: WorkerSalary) => {
        if ((s as any).termId) return (s as any).termId === term.id;
        return s.date >= bound.start && s.date <= bound.end;
      });
      const uniqueTermSalaries = deduplicateById<WorkerSalary>(termSalaries);
      const payrollAmount = uniqueTermSalaries.reduce((sum: number, s: WorkerSalary) => sum + (Number(s.netPaid) || 0), 0);
      if (payrollAmount > 0) {
        expensesByCategory['Payroll'] = (expensesByCategory['Payroll'] || 0) + payrollAmount;
      }

      // 5. Exam Expenses attributed to this term
      const termExamExpenses = examsExpenses.filter((ee: ExamsExpense) => {
        if ((ee as any).termId) return (ee as any).termId === term.id;
        return ee.date >= bound.start && ee.date <= bound.end;
      });
      const uniqueExamExpenses = deduplicateById<ExamsExpense>(termExamExpenses);
      const examsExpenseAmount = uniqueExamExpenses.reduce((sum: number, ee: ExamsExpense) => sum + (Number(ee.amountPaid) || 0), 0);
      if (examsExpenseAmount > 0) {
        expensesByCategory['Exams'] = (expensesByCategory['Exams'] || 0) + examsExpenseAmount;
      }

      // Total Term Expense
      const totalExpense = opExpensesAmount + payrollAmount + examsExpenseAmount;

      // Net Surplus / Financial Performance
      const netSurplus = totalIncome - totalExpense;
      const profitMargin = totalIncome > 0 ? (netSurplus / totalIncome) * 100 : 0;
      const avgDailyIncome = bound.schoolDaysCount > 0 ? totalIncome / bound.schoolDaysCount : 0;
      const avgDailyExpense = bound.schoolDaysCount > 0 ? totalExpense / bound.schoolDaysCount : 0;

      // Pupil attendance count during this term
      const uniqueCheckInStudents = new Set(termPayments.map(p => p.studentId)).size;

      return {
        term,
        bound,
        dailyCheckInIncome,
        termPayerIncome,
        examsIncome,
        totalIncome,
        opExpensesAmount,
        payrollAmount,
        examsExpenseAmount,
        totalExpense,
        netSurplus,
        profitMargin,
        avgDailyIncome,
        avgDailyExpense,
        uniqueCheckInStudents,
        termPaymentsCount: termPayments.length,
        termExpensesCount: termExpenses.length,
        expensesByCategory,
        termExpensesList: termExpenses,
        termSalariesList: termSalaries,
        termExamExpensesList: termExamExpenses
      };
    });
  }, [terms, termBoundsMap, payments, expenses, salaries, examsPayments, examsExpenses]);

  // Overall Totals (Covering ALL terms combined)
  const grandTotals = useMemo(() => {
    let totalIncome = 0;
    let totalDailyIncome = 0;
    let totalTermPayerIncome = 0;
    let totalExamsIncome = 0;
    let totalExpense = 0;
    let totalOpExpenses = 0;
    let totalPayroll = 0;
    let totalExamsExpenses = 0;
    const categoryTotals: Record<string, number> = {};

    termCalculations.forEach(tc => {
      totalIncome += tc.totalIncome;
      totalDailyIncome += tc.dailyCheckInIncome;
      totalTermPayerIncome += tc.termPayerIncome;
      totalExamsIncome += tc.examsIncome;

      totalExpense += tc.totalExpense;
      totalOpExpenses += tc.opExpensesAmount;
      totalPayroll += tc.payrollAmount;
      totalExamsExpenses += tc.examsExpenseAmount;

      Object.entries(tc.expensesByCategory).forEach(([cat, amt]) => {
        categoryTotals[cat] = (categoryTotals[cat] || 0) + (amt as number);
      });
    });

    // Check if there are any unassigned payments or expenses that fall outside term bounds
    const assignedPaymentIds = new Set(
      termCalculations.flatMap(tc => tc.termPaymentsCount)
    );

    // Any standalone payments outside terms
    const uniqueAllPayments = deduplicateById<PaymentRecord>(payments);
    const allVerifiedPaymentsSum = uniqueAllPayments
      .filter((p: PaymentRecord) => p.verified !== false && !p.isAbsent && (Number(p.amount) || 0) > 0)
      .reduce((sum: number, p: PaymentRecord) => sum + (Number(p.amount) || 0), 0);
    const uniqueAllExamsPayments = deduplicateById<ExamsPayment>(examsPayments);
    const allExamsPaymentsSum = uniqueAllExamsPayments.reduce((sum: number, ep: ExamsPayment) => sum + (Number(ep.amountPaid) || 0), 0);
    const absoluteAllIncome = allVerifiedPaymentsSum + allExamsPaymentsSum;

    const uniqueAllExpenses = deduplicateById<Expense>(expenses);
    const allOpExpensesSum = uniqueAllExpenses.reduce((sum: number, e: Expense) => sum + (Number(e.amount) || 0), 0);
    const uniqueAllSalaries = deduplicateById<WorkerSalary>(salaries);
    const allSalariesSum = uniqueAllSalaries.reduce((sum: number, s: WorkerSalary) => sum + (Number(s.netPaid) || 0), 0);
    const uniqueAllExamsExpenses = deduplicateById<ExamsExpense>(examsExpenses);
    const allExamsExpensesSum = uniqueAllExamsExpenses.reduce((sum: number, ee: ExamsExpense) => sum + (Number(ee.amountPaid) || 0), 0);
    const absoluteAllExpenses = allOpExpensesSum + allSalariesSum + allExamsExpensesSum;

    const netSurplus = absoluteAllIncome - absoluteAllExpenses;
    const profitMargin = absoluteAllIncome > 0 ? (netSurplus / absoluteAllIncome) * 100 : 0;

    return {
      totalIncome: absoluteAllIncome,
      totalDailyIncome,
      totalTermPayerIncome,
      totalExamsIncome,
      totalExpense: absoluteAllExpenses,
      totalOpExpenses: allOpExpensesSum,
      totalPayroll: allSalariesSum,
      totalExamsExpenses: allExamsExpensesSum,
      netSurplus,
      profitMargin,
      categoryTotals
    };
  }, [termCalculations, payments, examsPayments, expenses, salaries, examsExpenses]);

  // Format Recharts Chart Data
  const chartData = useMemo(() => {
    return termCalculations.map(tc => ({
      name: tc.term.name.replace('Term ', 'T'),
      fullName: tc.term.name,
      Income: Math.round(tc.totalIncome),
      Expenses: Math.round(tc.totalExpense),
      NetProfit: Math.round(tc.netSurplus),
      DailyIncome: Math.round(tc.dailyCheckInIncome),
      TermSubscriptions: Math.round(tc.termPayerIncome),
      ExamFees: Math.round(tc.examsIncome)
    }));
  }, [termCalculations]);

  // Pie Chart Data for Expense Categories across terms
  const categoryPieData = useMemo(() => {
    return Object.entries(grandTotals.categoryTotals)
      .map(([name, value]) => ({ name, value: Math.round(value as number) }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [grandTotals.categoryTotals]);

  // Export CSV Summary handler
  const handleExportCSV = () => {
    let csv = `SAAKO HOLY CHILD ACADEMY - TERMS FINANCIAL COMPARISON SUMMARY\n`;
    csv += `Export Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n\n`;
    csv += `Term Name,Start Date,Days Count,Live Income (GHC),Daily Check-Ins (GHC),Term Payers (GHC),Exams Revenue (GHC),Total Expenses (GHC),Op Expenses (GHC),Payroll (GHC),Exams Expenses (GHC),Net Surplus (GHC),Profit Margin (%)\n`;

    termCalculations.forEach(tc => {
      csv += `"${tc.term.name}","${tc.term.startDate}",${tc.bound.schoolDaysCount},${tc.totalIncome.toFixed(2)},${tc.dailyCheckInIncome.toFixed(2)},${tc.termPayerIncome.toFixed(2)},${tc.examsIncome.toFixed(2)},${tc.totalExpense.toFixed(2)},${tc.opExpensesAmount.toFixed(2)},${tc.payrollAmount.toFixed(2)},${tc.examsExpenseAmount.toFixed(2)},${tc.netSurplus.toFixed(2)},${tc.profitMargin.toFixed(1)}%\n`;
    });

    csv += `\nOVERALL GRAND TOTALS COVERING ALL TERMS\n`;
    csv += `Total Combined Income: GHC ${grandTotals.totalIncome.toFixed(2)}\n`;
    csv += `Total Combined Expenses: GHC ${grandTotals.totalExpense.toFixed(2)}\n`;
    csv += `Total Net Surplus / Reserve: GHC ${grandTotals.netSurplus.toFixed(2)} (${grandTotals.profitMargin.toFixed(1)}% Margin)\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Terms_Financial_Summary_${currentDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`p-4 md:p-8 space-y-8 max-w-7xl mx-auto ${isDaylight ? 'text-neutral-900' : 'text-white'}`}>
      {/* Top Banner Header */}
      <div className={`p-6 border-4 ${isDaylight ? 'bg-amber-50 border-amber-200' : 'bg-neutral-900 border-neutral-800'} shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col lg:flex-row lg:items-center justify-between gap-6`}>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400 text-black font-black">
              <Layers size={24} className="stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight font-mono">
                Terms Financial & Revenue Comparison
              </h1>
              <p className={`text-xs font-bold uppercase tracking-wider ${isDaylight ? 'text-neutral-600' : 'text-amber-400'}`}>
                Multi-Term Financial Analytics • Live Term Income vs Expenses • Total School Reserve
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowSalaryIncrementModal(true)}
            className="bg-neutral-900 hover:bg-neutral-850 text-amber-400 font-mono font-black text-xs uppercase px-4 py-2.5 border-2 border-amber-500/50 shadow-[3px_3px_0px_0px_rgba(245,158,11,0.3)] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] flex items-center gap-2 cursor-pointer transition-all"
            title="Teacher & Worker Salary Increment Summary, Individual % Variations & Term Outflow Projection"
            id="btn-salary-increment-summary"
          >
            <TrendingUp size={16} className="stroke-[2.5]" />
            <span>Salary Increment Summary</span>
          </button>

          <button
            onClick={() => setShowPrintModal(true)}
            className="bg-amber-400 hover:bg-amber-300 text-neutral-950 font-mono font-black text-xs uppercase px-4 py-2.5 border-2 border-neutral-950 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] flex items-center gap-2 cursor-pointer transition-all"
            title="Print Official Terms Summary Board Report"
            id="btn-print-terms-summary"
          >
            <Printer size={16} className="stroke-[2.5]" />
            <span>Print Report</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-black text-xs uppercase px-4 py-2.5 border-2 border-neutral-950 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[2px] active:translate-y-[2px] flex items-center gap-2 cursor-pointer transition-all"
            title="Export Terms Financial Summary to Excel / CSV"
            id="btn-export-terms-csv"
          >
            <FileSpreadsheet size={16} className="stroke-[2.5]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Ribbon & Quick Controls */}
      <div className={`p-4 border-2 ${isDaylight ? 'bg-neutral-100 border-neutral-300' : 'bg-neutral-900 border-neutral-800'} flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs`}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-neutral-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search term name..."
              className={`p-2 border font-mono text-xs w-48 focus:outline-none focus:border-amber-400 ${
                isDaylight ? 'bg-white border-neutral-300 text-neutral-900' : 'bg-neutral-950 border-neutral-700 text-white'
              }`}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-neutral-400" />
            <span className="font-bold uppercase text-[11px] text-neutral-500">Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className={`p-2 border font-mono text-xs font-bold focus:outline-none ${
                isDaylight ? 'bg-white border-neutral-300 text-neutral-900' : 'bg-neutral-950 border-neutral-700 text-white'
              }`}
            >
              <option value="All">All Years</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr}>{yr} Academic Year</option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-right text-[11px] font-bold text-neutral-400">
          Showing <span className="text-amber-400 font-black">{filteredTerms.length}</span> of <span className="text-white font-black">{terms.length}</span> terms defined in system
        </div>
      </div>

      {/* EXECUTIVE SUMMARY KPI CARDS (COVERING ALL TERMS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income Card */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-5 border-2 ${
            isDaylight ? 'bg-emerald-50 border-emerald-300 text-neutral-900' : 'bg-neutral-900 border-emerald-500/40 text-white'
          } shadow-[4px_4px_0px_0px_rgba(16,185,129,0.3)] relative overflow-hidden`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1.5">
              <TrendingUp size={14} className="stroke-[3]" />
              Live Income (All Terms)
            </span>
            <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-full">
              <Coins size={16} />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black font-mono tracking-tight text-emerald-500">
            GH₵ {grandTotals.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-3 pt-3 border-t border-emerald-500/20 flex items-center justify-between text-[10px] font-mono text-neutral-400">
            <span>Check-Ins: GH₵ {grandTotals.totalDailyIncome.toLocaleString()}</span>
            <span>Terms: GH₵ {grandTotals.totalTermPayerIncome.toLocaleString()}</span>
          </div>
        </motion.div>

        {/* Total Expense Card */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={`p-5 border-2 ${
            isDaylight ? 'bg-rose-50 border-rose-300 text-neutral-900' : 'bg-neutral-900 border-rose-500/40 text-white'
          } shadow-[4px_4px_0px_0px_rgba(244,63,94,0.3)] relative overflow-hidden`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 flex items-center gap-1.5">
              <TrendingDown size={14} className="stroke-[3]" />
              Total Expense (All Terms)
            </span>
            <div className="p-1.5 bg-rose-500/20 text-rose-400 rounded-full">
              <Receipt size={16} />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black font-mono tracking-tight text-rose-400">
            GH₵ {grandTotals.totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-3 pt-3 border-t border-rose-500/20 flex items-center justify-between text-[10px] font-mono text-neutral-400">
            <span>Ops: GH₵ {grandTotals.totalOpExpenses.toLocaleString()}</span>
            <span>Payroll: GH₵ {grandTotals.totalPayroll.toLocaleString()}</span>
          </div>
        </motion.div>

        {/* Net Surplus Card */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`p-5 border-2 ${
            grandTotals.netSurplus >= 0
              ? isDaylight ? 'bg-amber-50 border-amber-300 text-neutral-900' : 'bg-neutral-900 border-amber-400/50 text-white'
              : isDaylight ? 'bg-red-50 border-red-300 text-neutral-900' : 'bg-neutral-900 border-red-500/50 text-white'
          } shadow-[4px_4px_0px_0px_rgba(245,158,11,0.3)] relative overflow-hidden`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
              <ShieldCheck size={14} className="stroke-[3]" />
              Net Reserve / Surplus
            </span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded font-mono ${
              grandTotals.netSurplus >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
            }`}>
              {grandTotals.profitMargin.toFixed(1)}% Margin
            </span>
          </div>
          <div className={`text-2xl lg:text-3xl font-black font-mono tracking-tight ${
            grandTotals.netSurplus >= 0 ? 'text-amber-400' : 'text-rose-400'
          }`}>
            GH₵ {grandTotals.netSurplus.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-3 pt-3 border-t border-amber-400/20 flex items-center justify-between text-[10px] font-mono text-neutral-400">
            <span>Retained School Liquidity</span>
            <span className="text-emerald-400 font-bold">
              {grandTotals.totalIncome > 0 ? `${((grandTotals.netSurplus / grandTotals.totalIncome) * 100).toFixed(0)}% Saved` : '0%'}
            </span>
          </div>
        </motion.div>

        {/* Academic Terms Tracked Card */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={`p-5 border-2 ${
            isDaylight ? 'bg-blue-50 border-blue-300 text-neutral-900' : 'bg-neutral-900 border-blue-500/40 text-white'
          } shadow-[4px_4px_0px_0px_rgba(59,130,246,0.3)] relative overflow-hidden`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
              <Calendar size={14} className="stroke-[3]" />
              Terms Tracked
            </span>
            <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-full">
              <Layers size={16} />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black font-mono tracking-tight text-blue-400">
            {terms.length} <span className="text-sm font-normal text-neutral-400">Terms</span>
          </div>
          <div className="mt-3 pt-3 border-t border-blue-500/20 flex items-center justify-between text-[10px] font-mono text-neutral-400">
            <span>Active: {activeTerm?.name || 'None'}</span>
            <span className="text-blue-400 font-bold">
              {terms.reduce((sum, t) => sum + (t.daysCount || (t.schoolDays ? t.schoolDays.length : 0)), 0)} Days
            </span>
          </div>
        </motion.div>
      </div>

      {/* RECHARTS COMPARISON VISUALIZATIONS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Bar Chart: Term Income vs Expense vs Net Profit */}
        <div className={`lg:col-span-2 p-6 border-4 ${
          isDaylight ? 'bg-white border-neutral-300' : 'bg-neutral-900 border-neutral-800'
        } shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4`}>
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider font-mono flex items-center gap-2">
                <BarChart3 size={18} className="text-amber-400" />
                Term-by-Term Financial Comparison
              </h2>
              <p className="text-[11px] text-neutral-400 font-bold">
                Comparison of Live Income, Total Expenses, and Net Surplus per Term
              </p>
            </div>
            <span className="bg-amber-400/10 text-amber-400 text-[10px] font-mono font-black px-2.5 py-1 border border-amber-400/30 uppercase">
              Side-by-Side Analysis
            </span>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDaylight ? "#e5e7eb" : "#262626"} />
                <XAxis 
                  dataKey="name" 
                  stroke={isDaylight ? "#4b5563" : "#a3a3a3"} 
                  tick={{ fontSize: 11, fontWeight: 'bold' }} 
                />
                <YAxis 
                  stroke={isDaylight ? "#4b5563" : "#a3a3a3"} 
                  tick={{ fontSize: 10 }}
                  tickFormatter={(val) => `GH₵ ${val}`} 
                />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: isDaylight ? '#ffffff' : '#09090b', 
                    borderColor: '#f59e0b', 
                    borderWidth: '2px', 
                    borderRadius: '0px',
                    color: isDaylight ? '#000000' : '#ffffff',
                    fontFamily: 'monospace',
                    fontSize: '11px'
                  }}
                  formatter={(value: any) => [`GH₵ ${Number(value).toLocaleString()}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                <Bar dataKey="Income" fill="#10b981" name="Live Income (GHC)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Expenses" fill="#f43f5e" name="Total Expense (GHC)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="NetProfit" fill="#f59e0b" name="Net Surplus (GHC)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Allocations Pie Chart */}
        <div className={`p-6 border-4 ${
          isDaylight ? 'bg-white border-neutral-300' : 'bg-neutral-900 border-neutral-800'
        } shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4 flex flex-col justify-between`}>
          <div className="border-b border-neutral-800 pb-3">
            <h2 className="text-sm font-black uppercase tracking-wider font-mono flex items-center gap-2">
              <PieIcon size={18} className="text-emerald-400" />
              Expense Distribution
            </h2>
            <p className="text-[11px] text-neutral-400 font-bold">
              Combined Expense Categories Across All Terms
            </p>
          </div>

          {categoryPieData.length > 0 ? (
            <div className="h-56 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: isDaylight ? '#ffffff' : '#09090b', 
                      borderColor: '#10b981', 
                      borderWidth: '2px', 
                      fontFamily: 'monospace',
                      fontSize: '11px'
                    }}
                    formatter={(val: any) => [`GH₵ ${Number(val).toLocaleString()}`, 'Amount']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="p-8 text-center text-xs font-mono text-neutral-500">
              No expense entries recorded yet.
            </div>
          )}

          <div className="space-y-1.5 pt-2 border-t border-neutral-800 text-[10px] font-mono max-h-36 overflow-y-auto">
            {categoryPieData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                  <span className="font-bold">{item.name}</span>
                </div>
                <span className="font-mono text-neutral-400">GH₵ {item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DETAILED TERM-BY-TERM FINANCIAL CARDS & COMPARISON GRID */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black uppercase tracking-wider font-mono flex items-center gap-2">
            <Layers size={20} className="text-amber-400" />
            Term-by-Term Financial Breakdown
          </h2>
          <span className="text-xs font-mono font-bold text-neutral-400">
            Click any term to inspect detailed expense & transaction logs
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {filteredTerms.map((term) => {
            const calc = termCalculations.find(c => c.term.id === term.id);
            if (!calc) return null;

            const isExpanded = expandedTermId === term.id;
            const isTermActive = activeTerm?.id === term.id;

            return (
              <motion.div
                key={term.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border-4 ${
                  isTermActive
                    ? 'border-amber-400 shadow-[8px_8px_0px_0px_rgba(245,158,11,0.2)]'
                    : isDaylight ? 'bg-white border-neutral-300 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]' : 'bg-neutral-900 border-neutral-800 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'
                } transition-all`}
              >
                {/* Term Header Strip */}
                <div className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 ${
                  isTermActive 
                    ? isDaylight ? 'bg-amber-100 border-amber-300' : 'bg-neutral-950 border-amber-400/40' 
                    : isDaylight ? 'bg-neutral-100 border-neutral-300' : 'bg-neutral-950 border-neutral-800'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 font-mono font-black text-sm uppercase ${
                      isTermActive ? 'bg-amber-400 text-black' : 'bg-neutral-800 text-amber-400'
                    }`}>
                      {term.name.match(/Term \d+/) ? term.name.match(/Term \d+/)?.[0] : 'TERM'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black uppercase font-mono tracking-tight">
                          {term.name}
                        </h3>
                        {isTermActive && (
                          <span className="bg-amber-400 text-black text-[9px] font-mono font-black uppercase px-2 py-0.5 border border-black animate-pulse">
                            Active Live Term
                          </span>
                        )}
                        {term.isCompleted && (
                          <span className="bg-neutral-800 text-neutral-400 text-[9px] font-mono font-black uppercase px-2 py-0.5 border border-neutral-700">
                            Completed Term
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-neutral-400">
                        Start: <strong className="text-white">{term.startDate}</strong> • School Days: <strong className="text-amber-400">{calc.bound.schoolDaysCount} Days</strong>
                      </p>
                    </div>
                  </div>

                  {/* Summary Metric Chips */}
                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                    <div className="text-right">
                      <span className="text-[10px] text-neutral-500 uppercase block font-bold">Income</span>
                      <strong className="text-emerald-400 text-base font-black">
                        GH₵ {calc.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </strong>
                    </div>

                    <div className="h-8 w-[1px] bg-neutral-800 hidden sm:block" />

                    <div className="text-right">
                      <span className="text-[10px] text-neutral-500 uppercase block font-bold">Expenses</span>
                      <strong className="text-rose-400 text-base font-black">
                        GH₵ {calc.totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </strong>
                    </div>

                    <div className="h-8 w-[1px] bg-neutral-800 hidden sm:block" />

                    <div className="text-right">
                      <span className="text-[10px] text-neutral-500 uppercase block font-bold">Net Surplus</span>
                      <strong className={`text-base font-black ${calc.netSurplus >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                        GH₵ {calc.netSurplus.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </strong>
                    </div>

                    <button
                      onClick={() => setExpandedTermId(isExpanded ? null : term.id)}
                      className="p-2 bg-neutral-800 hover:bg-amber-400 hover:text-black text-amber-400 border border-neutral-700 font-mono text-xs font-bold uppercase flex items-center gap-1 cursor-pointer transition-colors ml-2"
                    >
                      <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Term Financial Breakdown Grid */}
                <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Column 1: Live Income Sources */}
                  <div className={`p-4 border-2 ${
                    isDaylight ? 'bg-emerald-50/50 border-emerald-200' : 'bg-neutral-950/60 border-emerald-950/80'
                  } space-y-3 font-mono`}>
                    <div className="flex items-center justify-between border-b border-emerald-900/40 pb-2">
                      <span className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1.5">
                        <TrendingUp size={14} />
                        Income Sources
                      </span>
                      <span className="text-xs font-black text-emerald-400">
                        GH₵ {calc.totalIncome.toLocaleString()}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center text-neutral-300">
                        <span>Daily Check-Ins (GHC 5):</span>
                        <span className="font-bold text-white">GH₵ {calc.dailyCheckInIncome.toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between items-center text-neutral-300">
                        <span>Term Subscriptions:</span>
                        <span className="font-bold text-white">GH₵ {calc.termPayerIncome.toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between items-center text-neutral-300">
                        <span>Exams Revenue:</span>
                        <span className="font-bold text-white">GH₵ {calc.examsIncome.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-emerald-900/30 text-[11px] text-neutral-400 flex justify-between">
                      <span>Check-In Students:</span>
                      <span className="text-emerald-400 font-bold">{calc.uniqueCheckInStudents} Active Pupils</span>
                    </div>
                  </div>

                  {/* Column 2: Term Expenses Breakdown */}
                  <div className={`p-4 border-2 ${
                    isDaylight ? 'bg-rose-50/50 border-rose-200' : 'bg-neutral-950/60 border-rose-950/80'
                  } space-y-3 font-mono`}>
                    <div className="flex items-center justify-between border-b border-rose-900/40 pb-2">
                      <span className="text-xs font-black uppercase text-rose-400 flex items-center gap-1.5">
                        <TrendingDown size={14} />
                        Expense Allocations
                      </span>
                      <span className="text-xs font-black text-rose-400">
                        GH₵ {calc.totalExpense.toLocaleString()}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center text-neutral-300">
                        <span>Operational Expenses:</span>
                        <span className="font-bold text-white">GH₵ {calc.opExpensesAmount.toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between items-center text-neutral-300">
                        <span>Payroll & Salaries:</span>
                        <span className="font-bold text-white">GH₵ {calc.payrollAmount.toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between items-center text-neutral-300">
                        <span>Exams Expenses:</span>
                        <span className="font-bold text-white">GH₵ {calc.examsExpenseAmount.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-rose-900/30 text-[11px] text-neutral-400 flex justify-between">
                      <span>Expense Records:</span>
                      <span className="text-rose-400 font-bold">{calc.termExpensesCount} Entries</span>
                    </div>
                  </div>

                  {/* Column 3: Performance & Daily Averages */}
                  <div className={`p-4 border-2 ${
                    isDaylight ? 'bg-amber-50/50 border-amber-200' : 'bg-neutral-950/60 border-amber-950/80'
                  } space-y-3 font-mono`}>
                    <div className="flex items-center justify-between border-b border-amber-900/40 pb-2">
                      <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                        <ShieldCheck size={14} />
                        Term Net Health
                      </span>
                      <span className={`text-xs font-black ${calc.netSurplus >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {calc.profitMargin.toFixed(1)}% Margin
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center text-neutral-300">
                        <span>Net Surplus/Deficit:</span>
                        <span className={`font-bold ${calc.netSurplus >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          GH₵ {calc.netSurplus.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-neutral-300">
                        <span>Avg Daily Income:</span>
                        <span className="font-bold text-white">GH₵ {calc.avgDailyIncome.toFixed(2)}/day</span>
                      </div>

                      <div className="flex justify-between items-center text-neutral-300">
                        <span>Avg Daily Expense:</span>
                        <span className="font-bold text-white">GH₵ {calc.avgDailyExpense.toFixed(2)}/day</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-amber-900/30 text-[11px] text-neutral-400 flex justify-between">
                      <span>Daily Operational Rate:</span>
                      <span className="text-amber-400 font-bold">
                        GH₵ {(calc.avgDailyIncome - calc.avgDailyExpense).toFixed(2)}/day Net
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded Detailed Category & Transaction Breakdown */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t-2 border-neutral-800 p-6 bg-neutral-950/90 space-y-6 font-mono"
                    >
                      <h4 className="text-xs font-black uppercase text-amber-400 flex items-center gap-2 border-b border-neutral-800 pb-2">
                        <FileSpreadsheet size={16} />
                        Detailed Category Expense Breakdown for {term.name}
                      </h4>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {Object.entries(calc.expensesByCategory).map(([cat, amt]) => {
                          const categoryAmount = Number(amt) || 0;
                          return (
                            <div key={cat} className="p-3 bg-neutral-900 border border-neutral-800 space-y-1">
                              <span className="text-[10px] text-neutral-400 uppercase block font-bold">{cat}</span>
                              <span className="text-sm font-black text-white">GH₵ {categoryAmount.toLocaleString()}</span>
                              <span className="text-[9px] text-neutral-500 block">
                                {calc.totalExpense > 0 ? `${((categoryAmount / calc.totalExpense) * 100).toFixed(1)}% of expenses` : '0%'}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Recent Expense Entries in this Term */}
                      {calc.termExpensesList.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="text-[11px] font-black uppercase text-neutral-400">
                            Logged Operational Expenses ({calc.termExpensesList.length})
                          </h5>
                          <div className="max-h-48 overflow-y-auto space-y-1 pr-2">
                            {calc.termExpensesList.map((exp) => (
                              <div key={exp.id} className="p-2 bg-neutral-900 border border-neutral-800 text-xs flex justify-between items-center">
                                <div>
                                  <span className="text-amber-400 font-bold mr-2">[{exp.date}]</span>
                                  <span className="text-white">{exp.description}</span>
                                  <span className="text-[10px] text-neutral-500 ml-2">({exp.category})</span>
                                </div>
                                <span className="font-bold text-rose-400">GH₵ {exp.amount.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* PRINT BOARD REPORT MODAL */}
      <AnimatePresence>
        {showPrintModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          >
            <div className="bg-white text-black max-w-4xl w-full p-8 space-y-6 rounded-none shadow-2xl font-sans border-4 border-neutral-950">
              {/* Institutional Header */}
              <div className="flex items-center justify-between border-b-4 border-black pb-4">
                <div className="flex items-center gap-4">
                  <SchoolLogo size={60} className="border-2 border-black" lightBackground={true} />
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">
                      {systemSettings?.schoolName || 'SAAKO HOLY CHILD ACADEMY'}
                    </h2>
                    <p className="text-xs font-mono font-bold text-neutral-600">
                      OFFICIAL TERMS FINANCIAL & REVENUE COMPARISON REPORT
                    </p>
                    <p className="text-[10px] font-mono text-neutral-500">
                      Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()} • Audit Ref: SAAKO-BOARD-{Date.now().toString().slice(-6)}
                    </p>
                  </div>
                </div>

                <div className="text-right font-mono text-xs">
                  <span className="bg-black text-amber-400 font-black px-2.5 py-1 block uppercase">
                    {printWatermark}
                  </span>
                </div>
              </div>

              {/* Grand Total Summary Grid */}
              <div className="grid grid-cols-3 gap-4 font-mono text-xs border-2 border-black p-4 bg-neutral-50">
                <div>
                  <span className="text-[10px] text-neutral-500 font-bold uppercase block">Total Live Income</span>
                  <strong className="text-base font-black text-emerald-700">
                    GH₵ {grandTotals.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                <div>
                  <span className="text-[10px] text-neutral-500 font-bold uppercase block">Total School Expenses</span>
                  <strong className="text-base font-black text-rose-700">
                    GH₵ {grandTotals.totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                <div>
                  <span className="text-[10px] text-neutral-500 font-bold uppercase block">Net Retained Reserve</span>
                  <strong className="text-base font-black text-black">
                    GH₵ {grandTotals.netSurplus.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({grandTotals.profitMargin.toFixed(1)}%)
                  </strong>
                </div>
              </div>

              {/* Term Comparison Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono border-collapse border border-black">
                  <thead>
                    <tr className="bg-neutral-900 text-white">
                      <th className="p-2 border border-black text-left">Term Name</th>
                      <th className="p-2 border border-black text-center">Days</th>
                      <th className="p-2 border border-black text-right">Income (GHC)</th>
                      <th className="p-2 border border-black text-right">Expenses (GHC)</th>
                      <th className="p-2 border border-black text-right">Net Surplus (GHC)</th>
                      <th className="p-2 border border-black text-center">Margin %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {termCalculations.map((tc) => (
                      <tr key={tc.term.id} className="border-b border-neutral-300">
                        <td className="p-2 border border-black font-bold">{tc.term.name}</td>
                        <td className="p-2 border border-black text-center">{tc.bound.schoolDaysCount}</td>
                        <td className="p-2 border border-black text-right font-bold text-emerald-800">
                          {tc.totalIncome.toFixed(2)}
                        </td>
                        <td className="p-2 border border-black text-right font-bold text-rose-800">
                          {tc.totalExpense.toFixed(2)}
                        </td>
                        <td className="p-2 border border-black text-right font-bold">
                          {tc.netSurplus.toFixed(2)}
                        </td>
                        <td className="p-2 border border-black text-center font-bold">
                          {tc.profitMargin.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div className="pt-8 border-t-2 border-black flex justify-between items-end text-xs font-mono">
                <div>
                  <p className="font-bold border-b border-black pb-1 w-64">{printSignatory}</p>
                  <p className="text-[10px] text-neutral-500 uppercase mt-0.5">Authorized Signatory & Headmaster</p>
                </div>

                <div className="text-right">
                  <p className="font-bold border-b border-black pb-1 w-64">Official School Stamp</p>
                  <p className="text-[10px] text-neutral-500 uppercase mt-0.5">Saako Holy Child Academy</p>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 no-print">
                <button
                  onClick={() => window.print()}
                  className="bg-black hover:bg-neutral-800 text-white font-mono font-black text-xs uppercase px-5 py-2.5 cursor-pointer"
                >
                  Print Report
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="bg-neutral-200 hover:bg-neutral-300 text-black font-mono font-bold text-xs uppercase px-4 py-2.5 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Teacher & Worker Salary Increment Summary Modal */}
      <TeacherSalaryIncrementModal
        isOpen={showSalaryIncrementModal}
        onClose={() => setShowSalaryIncrementModal(false)}
      />
    </div>
  );
}
