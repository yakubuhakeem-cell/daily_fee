/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useApp, getStudentBaselineTermFee } from '../context/AppContext';
import { UserAccount, UserRole } from '../types';
import { SchoolLogo } from './SchoolLogo';
import {
  TrendingUp,
  Percent,
  Printer,
  Download,
  Check,
  RotateCcw,
  Search,
  Users,
  Calendar,
  DollarSign,
  Briefcase,
  AlertCircle,
  X,
  Sparkles,
  Sliders,
  ChevronDown,
  Layers,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  PieChart,
  Scale,
  Target,
  Wallet,
  Coins,
  ArrowUpRight,
  Activity,
  HelpCircle,
  BookOpen
} from 'lucide-react';

interface WorkerIncrementState {
  userId: string;
  workerName: string;
  role: UserRole;
  employeeId?: string;
  assignedGate?: string;
  oldSalary: number;
  percentage: number;
  newSalary: number;
  selected: boolean;
}

interface TeacherSalaryIncrementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeacherSalaryIncrementModal: React.FC<TeacherSalaryIncrementModalProps> = ({
  isOpen,
  onClose
}) => {
  const { 
    users, 
    students,
    payments,
    examsPayments,
    examsSettings,
    currentTerm, 
    systemSettings, 
    adjustStaffSalariesByPercentage, 
    playFeedbackSound 
  } = useApp();

  const currency = systemSettings?.currencySymbol || 'GH₵';
  const schoolName = (systemSettings?.schoolName || 'SAAKO HOLY CHILD ACADEMY').toUpperCase();
  const schoolMotto = systemSettings?.customMotto || 'Holiness Is Our Key';
  const schoolLocation = systemSettings?.customLocation || 'Sawla, Savannah Region';

  // Configurable term length in months (Default: 3 months for a standard school term in Ghana)
  const [monthsInTerm, setMonthsInTerm] = useState<number>(3);

  // Search & Role Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('All');

  // Global Quick Adjuster state
  const [globalPercentage, setGlobalPercentage] = useState<number>(10);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('Annual School Term Wage Increment & Performance Review');

  // Success message after committing to database
  const [commitSuccessMsg, setCommitSuccessMsg] = useState<string | null>(null);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);

  // Active view tab inside modal (Summary & Increment Table vs Deep Financial Ratio Analysis)
  const [activeAnalysisView, setActiveAnalysisView] = useState<'all' | 'schedule' | 'comparison'>('all');

  // Per-worker increment state list
  const [workerRows, setWorkerRows] = useState<WorkerIncrementState[]>([]);

  // Initialize workers when modal opens or users change
  useEffect(() => {
    if (isOpen && users && users.length > 0) {
      const initial: WorkerIncrementState[] = users.map((u) => {
        const oldSalary = Number(u.stipendSalary) || 0;
        // Default initial 10% increment or 0 if base is 0
        const defaultPct = oldSalary > 0 ? 10 : 0;
        const newSalary = Math.round(oldSalary * (1 + defaultPct / 100) * 100) / 100;
        
        let assignedGate = '';
        if (u.role === 'Teacher') {
          if (u.assignedClasses && u.assignedClasses.length > 0) {
            assignedGate = u.assignedClasses.join(', ');
          } else if (u.assignedClass) {
            assignedGate = u.assignedClass;
          }
        }

        return {
          userId: u.id,
          workerName: u.name,
          role: u.role,
          employeeId: u.employeeId || `EMP-${u.id.substring(u.id.indexOf('_') + 1).slice(0, 5).toUpperCase()}`,
          assignedGate,
          oldSalary,
          percentage: defaultPct,
          newSalary,
          selected: true
        };
      });
      setWorkerRows(initial);
    }
  }, [isOpen, users]);

  // Handle individual percentage change
  const handlePercentageChange = (userId: string, newPct: number) => {
    const safePct = isNaN(newPct) ? 0 : newPct;
    setWorkerRows((prev) =>
      prev.map((w) => {
        if (w.userId === userId) {
          const calculatedNewSalary = Math.max(0, Math.round(w.oldSalary * (1 + safePct / 100) * 100) / 100);
          return {
            ...w,
            percentage: safePct,
            newSalary: calculatedNewSalary
          };
        }
        return w;
      })
    );
  };

  // Handle individual new salary direct edit (auto-calculates the percentage)
  const handleNewSalaryChange = (userId: string, newSal: number) => {
    const safeSal = isNaN(newSal) ? 0 : Math.max(0, newSal);
    setWorkerRows((prev) =>
      prev.map((w) => {
        if (w.userId === userId) {
          let calculatedPct = 0;
          if (w.oldSalary > 0) {
            calculatedPct = Math.round(((safeSal - w.oldSalary) / w.oldSalary) * 1000) / 10;
          }
          return {
            ...w,
            newSalary: safeSal,
            percentage: calculatedPct
          };
        }
        return w;
      })
    );
  };

  // Handle individual old salary direct edit if correcting records
  const handleOldSalaryChange = (userId: string, oldSal: number) => {
    const safeOld = isNaN(oldSal) ? 0 : Math.max(0, oldSal);
    setWorkerRows((prev) =>
      prev.map((w) => {
        if (w.userId === userId) {
          const calculatedNew = Math.max(0, Math.round(safeOld * (1 + w.percentage / 100) * 100) / 100);
          return {
            ...w,
            oldSalary: safeOld,
            newSalary: calculatedNew
          };
        }
        return w;
      })
    );
  };

  // Toggle selection
  const handleToggleSelect = (userId: string) => {
    setWorkerRows((prev) =>
      prev.map((w) => (w.userId === userId ? { ...w, selected: !w.selected } : w))
    );
  };

  // Apply uniform percentage to all currently selected or filtered workers
  const handleApplyGlobalPercentage = (pct: number) => {
    playFeedbackSound?.('click');
    setWorkerRows((prev) =>
      prev.map((w) => {
        // Only apply to matching filter/selection
        const matchesFilter = selectedRoleFilter === 'All' || w.role === selectedRoleFilter;
        if (w.selected && matchesFilter) {
          const calculatedNew = Math.max(0, Math.round(w.oldSalary * (1 + pct / 100) * 100) / 100);
          return {
            ...w,
            percentage: pct,
            newSalary: calculatedNew
          };
        }
        return w;
      })
    );
  };

  // Reset all percentages to 0% (maintain old salaries)
  const handleResetToZero = () => {
    playFeedbackSound?.('click');
    setWorkerRows((prev) =>
      prev.map((w) => ({
        ...w,
        percentage: 0,
        newSalary: w.oldSalary
      }))
    );
  };

  // Filtered workers list
  const filteredWorkers = useMemo(() => {
    return workerRows.filter((w) => {
      const matchesRole = selectedRoleFilter === 'All' || w.role === selectedRoleFilter;
      const matchesSearch =
        w.workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w.employeeId && w.employeeId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (w.assignedGate && w.assignedGate.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesRole && matchesSearch;
    });
  }, [workerRows, selectedRoleFilter, searchQuery]);

  // Financial aggregates calculation (Salary side)
  const totals = useMemo(() => {
    // Only calculate for active selected workers
    const activeSelected = workerRows.filter((w) => w.selected);

    const count = activeSelected.length;
    const oldMonthlyTotal = activeSelected.reduce((sum, w) => sum + w.oldSalary, 0);
    const newMonthlyTotal = activeSelected.reduce((sum, w) => sum + w.newSalary, 0);
    const monthlyIncrementVariance = newMonthlyTotal - oldMonthlyTotal;

    const oldTermTotal = oldMonthlyTotal * monthsInTerm;
    const newTermTotal = newMonthlyTotal * monthsInTerm;
    const termIncrementVariance = newTermTotal - oldTermTotal;

    const overallPctIncrease =
      oldMonthlyTotal > 0
        ? Math.round((monthlyIncrementVariance / oldMonthlyTotal) * 1000) / 10
        : 0;

    const avgMonthlyIncrement = count > 0 ? monthlyIncrementVariance / count : 0;

    return {
      count,
      oldMonthlyTotal,
      newMonthlyTotal,
      monthlyIncrementVariance,
      oldTermTotal,
      newTermTotal,
      termIncrementVariance,
      overallPctIncrease,
      avgMonthlyIncrement
    };
  }, [workerRows, monthsInTerm]);

  // ==========================================
  // EXPECTED TERM REVENUE & INCOME CALCULATION
  // ==========================================
  const incomeMetrics = useMemo(() => {
    const activeStudents = (students || []).filter((s) => s.active !== false);
    const activePupilsCount = activeStudents.length;

    // A. Expected Tuition & Term Baseline Fees for all enrolled active pupils
    const expectedTuitionRevenue = activeStudents.reduce((sum, s) => {
      const baseFee = s.termFee || getStudentBaselineTermFee(s.class, systemSettings);
      const discount = s.discount || 0;
      return sum + Math.max(0, baseFee - discount);
    }, 0);

    // B. Expected Daily Feeding & Check-in Dues (Estimated ~20 school days per month)
    const schoolDaysEstimate = monthsInTerm * 20;
    const baseDailyRate = systemSettings?.baselineDailyFee ?? 5.00;
    const dailyPayers = activeStudents.filter((s) => s.paymentType !== 'Term');
    const expectedDailyFeedingRevenue = dailyPayers.reduce((sum, s) => {
      const dailyRate = Math.max(0, baseDailyRate - (s.discount || 0));
      return sum + (dailyRate * schoolDaysEstimate);
    }, 0);

    // C. Expected Exams & Assessment Revenue
    const expectedExamsRevenue = activeStudents.reduce((sum, s) => {
      const classExamsFee = examsSettings?.classFees?.[s.class]?.feeCharged ?? 35.00;
      return sum + classExamsFee;
    }, 0);

    // Total Projected Gross Term Revenue (Tuition + Daily Feeding + Exams)
    const totalExpectedRevenue = expectedTuitionRevenue + expectedDailyFeedingRevenue + expectedExamsRevenue;

    // D. Actual Live Collected Income in Current Active Term
    const activeTermId = currentTerm?.id;
    const targetPayments = (payments || []).filter(
      (p) => (!activeTermId || p.termId === activeTermId) && p.verified !== false && !p.isAbsent
    );
    const liveFeesCollected = targetPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const targetExamsPayments = (examsPayments || []).filter(
      (ep) => !activeTermId || ep.termId === activeTermId
    );
    const liveExamsCollected = targetExamsPayments.reduce((sum, ep) => sum + (Number(ep.amountPaid) || 0), 0);

    const totalLiveIncomeCollected = liveFeesCollected + liveExamsCollected;

    const liveCollectionRate = totalExpectedRevenue > 0
      ? Math.round((totalLiveIncomeCollected / totalExpectedRevenue) * 1000) / 10
      : 0;

    return {
      activePupilsCount,
      dailyPayersCount: dailyPayers.length,
      termPayersCount: activeStudents.filter((s) => s.paymentType === 'Term').length,
      schoolDaysEstimate,
      expectedTuitionRevenue,
      expectedDailyFeedingRevenue,
      expectedExamsRevenue,
      totalExpectedRevenue,
      liveFeesCollected,
      liveExamsCollected,
      totalLiveIncomeCollected,
      liveCollectionRate
    };
  }, [students, payments, examsPayments, currentTerm, systemSettings, examsSettings, monthsInTerm]);

  // ==============================================================
  // TERM SALARY VS EXPECTED INCOME COMPARISON RATIOS & PROJECTIONS
  // ==============================================================
  const comparison = useMemo(() => {
    const expectedIncome = incomeMetrics.totalExpectedRevenue || 1; // avoid divide by zero
    const oldTermSalary = totals.oldTermTotal;
    const newTermSalary = totals.newTermTotal;
    const salaryVariance = totals.termIncrementVariance;

    // 1. Payroll Absorption Rate (% of Expected Gross Revenue dedicated to Staff Salaries)
    const oldAbsorptionRate = Math.round((oldTermSalary / expectedIncome) * 1000) / 10;
    const newAbsorptionRate = Math.round((newTermSalary / expectedIncome) * 1000) / 10;
    const absorptionShift = Math.round((newAbsorptionRate - oldAbsorptionRate) * 10) / 10;

    // 2. Projected Net Operational Surplus / Reserve Remaining After Staff Compensation
    const oldProjectedSurplus = expectedIncome - oldTermSalary;
    const newProjectedSurplus = expectedIncome - newTermSalary;
    const surplusShift = newProjectedSurplus - oldProjectedSurplus; // Negative when salaries increase
    const newSurplusMargin = Math.round((newProjectedSurplus / expectedIncome) * 1000) / 10;
    const oldSurplusMargin = Math.round((oldProjectedSurplus / expectedIncome) * 1000) / 10;

    // 3. Pupil Headcount Allocation & Break-Even Coverage
    const avgRevenuePerPupil = incomeMetrics.activePupilsCount > 0 
      ? expectedIncome / incomeMetrics.activePupilsCount 
      : 0;
    const breakEvenPupilsCount = avgRevenuePerPupil > 0 
      ? Math.min(incomeMetrics.activePupilsCount, Math.ceil(newTermSalary / avgRevenuePerPupil)) 
      : 0;
    const surplusPupilsCount = Math.max(0, incomeMetrics.activePupilsCount - breakEvenPupilsCount);
    const breakEvenPupilPct = incomeMetrics.activePupilsCount > 0 
      ? Math.round((breakEvenPupilsCount / incomeMetrics.activePupilsCount) * 1000) / 10 
      : 0;

    // 4. Live Realized Collections vs New Term Salary Commitment
    const livePayrollCoverage = newTermSalary > 0 
      ? Math.round((incomeMetrics.totalLiveIncomeCollected / newTermSalary) * 1000) / 10 
      : 0;

    // 5. Educational Financial Sustainability Health Rating
    let healthBadge = 'SUSTAINABLE / HEALTHY';
    let healthDesc = 'Payroll burden is well balanced (<50% of expected term revenue), leaving ample operational margin for facility expansion, utilities, and reserves.';
    let healthColor = 'text-emerald-400 border-emerald-500/50 bg-emerald-950/50';
    let healthPrintColor = 'text-emerald-900 bg-emerald-50 border-emerald-400';

    if (newAbsorptionRate > 75) {
      healthBadge = 'CRITICAL OVERBURDEN';
      healthDesc = 'Payroll commitments consume over 75% of expected gross revenue. High risk of operational cash flow deficits if student collections lag.';
      healthColor = 'text-rose-400 border-rose-500/60 bg-rose-950/50';
      healthPrintColor = 'text-rose-900 bg-rose-50 border-rose-400';
    } else if (newAbsorptionRate > 60) {
      healthBadge = 'ELEVATED WAGE RATIO';
      healthDesc = 'Salaries consume 60%–75% of projected revenue. Close monitoring of fee collection timelines and non-payroll expenditure is recommended.';
      healthColor = 'text-amber-400 border-amber-500/60 bg-amber-950/50';
      healthPrintColor = 'text-amber-900 bg-amber-50 border-amber-400';
    } else if (newAbsorptionRate > 50) {
      healthBadge = 'MODERATE BENCHMARK';
      healthDesc = 'Within standard private educational institution parameters (50%–60% of revenue allocated to academic and auxiliary staff).';
      healthColor = 'text-sky-400 border-sky-500/50 bg-sky-950/50';
      healthPrintColor = 'text-sky-900 bg-sky-50 border-sky-400';
    }

    return {
      expectedIncome,
      oldTermSalary,
      newTermSalary,
      salaryVariance,
      oldAbsorptionRate,
      newAbsorptionRate,
      absorptionShift,
      oldProjectedSurplus,
      newProjectedSurplus,
      surplusShift,
      newSurplusMargin,
      oldSurplusMargin,
      avgRevenuePerPupil,
      breakEvenPupilsCount,
      surplusPupilsCount,
      breakEvenPupilPct,
      livePayrollCoverage,
      healthBadge,
      healthDesc,
      healthColor,
      healthPrintColor
    };
  }, [incomeMetrics, totals]);

  // Export to CSV including Expected Income Comparisons
  const handleExportCSV = () => {
    playFeedbackSound?.('success');
    const headers = [
      'S/N',
      'Worker / Teacher Name',
      'Employee ID',
      'Role / Designation',
      'Assigned Gate / Classes',
      'Old Monthly Salary (GHC)',
      'Increment Percentage (%)',
      'Monthly Increase Amount (GHC)',
      'New Monthly Salary (GHC)',
      `Old Term Spend (${monthsInTerm} Months) (GHC)`,
      `New Term Total Expected (${monthsInTerm} Months) (GHC)`,
      'Net Term Outflow Shift (GHC)'
    ];

    const rows = filteredWorkers.map((w, index) => {
      const monthlyIncrease = w.newSalary - w.oldSalary;
      const oldTermSpend = w.oldSalary * monthsInTerm;
      const newTermSpend = w.newSalary * monthsInTerm;
      const termShift = newTermSpend - oldTermSpend;

      return [
        index + 1,
        `"${w.workerName.replace(/"/g, '""')}"`,
        `"${(w.employeeId || '').replace(/"/g, '""')}"`,
        `"${w.role}"`,
        `"${(w.assignedGate || 'Core Staff').replace(/"/g, '""')}"`,
        w.oldSalary.toFixed(2),
        `${w.percentage.toFixed(1)}%`,
        monthlyIncrease.toFixed(2),
        w.newSalary.toFixed(2),
        oldTermSpend.toFixed(2),
        newTermSpend.toFixed(2),
        termShift.toFixed(2)
      ];
    });

    // Summary row
    rows.push([
      '',
      'TOTAL AGGREGATE SUMMARY',
      '',
      '',
      '',
      totals.oldMonthlyTotal.toFixed(2),
      `${totals.overallPctIncrease.toFixed(1)}% (Avg)`,
      totals.monthlyIncrementVariance.toFixed(2),
      totals.newMonthlyTotal.toFixed(2),
      totals.oldTermTotal.toFixed(2),
      totals.newTermTotal.toFixed(2),
      totals.termIncrementVariance.toFixed(2)
    ]);

    // Comparison rows
    const comparisonRows = [
      '',
      '# === TERM SALARY EXPENDITURE VS EXPECTED INCOME COMPARATIVE ANALYSIS ===',
      `# Total Active Pupils Enrolled: ${incomeMetrics.activePupilsCount} Pupils`,
      `# Projected Gross Term Tuition Revenue: GHC ${incomeMetrics.expectedTuitionRevenue.toFixed(2)}`,
      `# Projected Daily Feeding / Attendance Dues: GHC ${incomeMetrics.expectedDailyFeedingRevenue.toFixed(2)}`,
      `# Projected Examination Revenue: GHC ${incomeMetrics.expectedExamsRevenue.toFixed(2)}`,
      `# TOTAL EXPECTED GROSS TERM INCOME (100%): GHC ${incomeMetrics.totalExpectedRevenue.toFixed(2)}`,
      `# Live Realized Income Collected To Date: GHC ${incomeMetrics.totalLiveIncomeCollected.toFixed(2)} (${incomeMetrics.liveCollectionRate}% of Expected)`,
      `# Previous Term Salary Commitment: GHC ${comparison.oldTermSalary.toFixed(2)} (${comparison.oldAbsorptionRate}% of Expected Income)`,
      `# NEW APPROVED TERM SALARY COMMITMENT: GHC ${comparison.newTermSalary.toFixed(2)} (${comparison.newAbsorptionRate}% of Expected Income)`,
      `# Net Payroll Outflow Increase: +GHC ${comparison.salaryVariance.toFixed(2)} (+${comparison.absorptionShift}% Revenue Shift)`,
      `# PROJECTED NET OPERATIONAL SURPLUS AFTER PAYROLL: GHC ${comparison.newProjectedSurplus.toFixed(2)} (${comparison.newSurplusMargin}% Margin)`,
      `# Break-Even Pupil Allocation: ${comparison.breakEvenPupilsCount} Pupils (${comparison.breakEvenPupilPct}% of Total School Roll)`,
      `# Surplus Generating Pupils: ${comparison.surplusPupilsCount} Pupils`,
      `# Financial Health Rating: ${comparison.healthBadge}`
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [`# ${schoolName} - TEACHER & WORKER SALARY INCREMENT SCHEDULE`, `# Term Duration: ${monthsInTerm} Months | Generated on: ${new Date().toLocaleDateString()}`, '']
        .concat([headers.join(',')])
        .concat(rows.map((e) => e.join(',')))
        .concat([''])
        .concat(comparisonRows)
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Salary_Increment_and_Income_Comparison_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report Handler
  const handlePrint = () => {
    playFeedbackSound?.('click');
    window.print();
  };

  // Commit and Save New Base Salaries to App Database
  const handleCommitToDatabase = async () => {
    const selectedToCommit = workerRows.filter((w) => w.selected);
    if (selectedToCommit.length === 0) {
      alert('Please select at least one staff member to update.');
      return;
    }

    const confirmMsg = `Are you sure you want to permanently update the base salary for ${selectedToCommit.length} staff member(s)?\n\n• New monthly payroll total: ${currency} ${totals.newMonthlyTotal.toFixed(2)} / month\n• Full Term Expenditure: ${currency} ${totals.newTermTotal.toFixed(2)} (${comparison.newAbsorptionRate}% of Expected Gross Term Revenue)\n• Projected Term Net Surplus: ${currency} ${comparison.newProjectedSurplus.toFixed(2)}`;
    if (!window.confirm(confirmMsg)) return;

    setIsCommitting(true);
    setCommitSuccessMsg(null);

    try {
      const adjustments = selectedToCommit.map((w) => ({
        userId: w.userId,
        percentage: w.percentage,
        newSalary: w.newSalary,
        reason: adjustmentReason
      }));

      const res = adjustStaffSalariesByPercentage(adjustments);
      if (res.success) {
        playFeedbackSound?.('success');
        setCommitSuccessMsg(
          `Successfully updated wages for ${res.count} staff members! New base salaries are now active across payroll and ledger systems.`
        );
        setTimeout(() => {
          setCommitSuccessMsg(null);
        }, 5000);
      }
    } catch (err) {
      console.error('Error committing salary adjustments:', err);
      alert('Failed to update staff salaries. Please check your connection.');
    } finally {
      setIsCommitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 md:p-6 overflow-y-auto print:p-0 print:bg-white print:static">
      {/* Modal Container */}
      <div className="bg-neutral-950 border-4 border-amber-500 max-w-6xl w-full p-4 sm:p-6 md:p-8 space-y-6 shadow-[12px_12px_0px_0px_rgba(245,158,11,0.25)] relative my-2 sm:my-4 print:border-none print:shadow-none print:p-0 print:w-full print:max-w-none print:bg-white text-white print:text-black">
        
        {/* Screen Only: Close & Quick Actions Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-neutral-850 pb-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-amber-400/10 border-2 border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-black uppercase bg-amber-400 text-black px-2 py-0.5 rounded-xs">
                  Financial Payroll & Revenue Projection
                </span>
                <span className="text-[10px] font-mono text-neutral-400">
                  {currentTerm?.name || 'Academic Term'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white font-mono mt-0.5">
                Salary Increment & Expected Income Comparison
              </h2>
              <p className="text-xs text-neutral-400 font-sans">
                Analyze individual staff wage increments, monthly budget shifts, and term salary commitments compared against expected school gross income.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-850 border border-neutral-700 text-neutral-200 hover:text-white text-xs font-mono font-bold uppercase rounded flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="Print official printable increment and revenue comparison sheet"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Print Sheet</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-850 border border-neutral-700 text-neutral-200 hover:text-white text-xs font-mono font-bold uppercase rounded flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="Download Excel / CSV spreadsheet with income comparisons"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 rounded transition-colors cursor-pointer"
              title="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* PRINT ONLY: OFFICIAL SCHOOL LETTERHEAD & PROJECTED REPORT */}
        {/* ========================================================= */}
        <div className="hidden print:block border-b-2 border-black pb-4 mb-4 text-black font-sans">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <SchoolLogo size={70} />
              <div>
                <h1 className="text-xl font-black uppercase tracking-wider">{schoolName}</h1>
                <p className="text-xs font-bold italic">{schoolMotto}</p>
                <p className="text-[10px] text-gray-700">{schoolLocation} • Bursary & Financial Administration</p>
              </div>
            </div>
            <div className="text-right text-xs font-mono">
              <div className="font-bold uppercase text-[11px] bg-black text-white px-2 py-0.5 inline-block">
                OFFICIAL PAYROLL & REVENUE AUDIT
              </div>
              <p className="mt-1 font-bold">Academic Session: {currentTerm?.name || 'Active Term'}</p>
              <p className="text-[10px] text-gray-600">Date Generated: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              <p className="text-[10px] text-gray-600">Term Calculation: {monthsInTerm} Month(s) (~{incomeMetrics.schoolDaysEstimate} Days)</p>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t-2 border-black text-center">
            <h2 className="text-sm font-black uppercase tracking-wider">
              STAFF SALARY INCREMENT SCHEDULE AND TERM EXPENDITURE VS. EXPECTED INCOME COMPARISON REPORT
            </h2>
          </div>
        </div>

        {/* Screen Only: Success Alert */}
        {commitSuccessMsg && (
          <div className="bg-emerald-950/80 border-2 border-emerald-500 p-4 rounded text-xs text-emerald-300 font-mono flex items-start gap-3 print:hidden">
            <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="block text-white uppercase tracking-wider">Payroll Database Synchronized:</strong>
              {commitSuccessMsg}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* COMPONENT 1: EXECUTIVE SALARY VS EXPECTED INCOME COMPARISON PANEL (SCREEN) */}
        {/* ========================================================================= */}
        <div className="bg-neutral-900/90 border-2 border-amber-500/60 p-4 sm:p-5 rounded-lg space-y-4 shadow-lg print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-400/10 border border-amber-400/30 rounded text-amber-400">
                <Scale size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase font-mono tracking-wider text-white flex items-center gap-2">
                  <span>Term Salary vs Expected Income Comparison</span>
                  <span className="text-[10px] bg-amber-400 text-black px-1.5 py-0.2 rounded font-bold">
                    {monthsInTerm} Mo. Term
                  </span>
                </h3>
                <p className="text-[11px] text-neutral-400 font-sans">
                  Comprehensive financial ratio comparing gross pupil revenue commitments to total teacher and worker compensation.
                </p>
              </div>
            </div>

            {/* Health Badge */}
            <div className={`px-3 py-1.5 rounded border text-xs font-mono font-black uppercase flex items-center gap-2 ${comparison.healthColor}`}>
              <Activity size={14} className="animate-pulse" />
              <span>{comparison.healthBadge}</span>
            </div>
          </div>

          {/* 4-Pillar Comparison Bento Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Pillar 1: Total Expected Term Gross Income */}
            <div className="bg-neutral-950 p-3.5 rounded border border-neutral-800 space-y-1.5">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider flex items-center gap-1">
                  <Coins size={13} className="text-emerald-400" />
                  Expected Gross Income
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">100% Target</span>
              </div>
              <div className="text-xl font-black font-mono text-emerald-300">
                {currency} {incomeMetrics.totalExpectedRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="pt-1.5 border-t border-neutral-850 text-[10px] font-mono text-neutral-400 space-y-0.5">
                <div className="flex justify-between">
                  <span>Tuition / Subscriptions:</span>
                  <span className="text-neutral-200 font-bold">{currency} {incomeMetrics.expectedTuitionRevenue.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Feeding & Attendance:</span>
                  <span className="text-neutral-200 font-bold">{currency} {incomeMetrics.expectedDailyFeedingRevenue.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Exams & Assessments:</span>
                  <span className="text-neutral-200 font-bold">{currency} {incomeMetrics.expectedExamsRevenue.toFixed(0)}</span>
                </div>
              </div>
            </div>

            {/* Pillar 2: New Term Salary Commitment */}
            <div className="bg-neutral-950 p-3.5 rounded border border-amber-500/40 space-y-1.5 ring-1 ring-amber-500/20">
              <div className="flex items-center justify-between text-amber-400">
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider flex items-center gap-1">
                  <Briefcase size={13} />
                  New Term Wage Outflow
                </span>
                <span className="text-[10px] font-mono font-black bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded">
                  {comparison.newAbsorptionRate}% of Income
                </span>
              </div>
              <div className="text-xl font-black font-mono text-amber-300">
                {currency} {totals.newTermTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="pt-1.5 border-t border-neutral-850 text-[10px] font-mono space-y-0.5">
                <div className="flex justify-between text-neutral-400">
                  <span>Old Term Salary Spend:</span>
                  <span className="text-neutral-500 line-through">{currency} {totals.oldTermTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-300">
                  <span>Net Budget Increase:</span>
                  <span className="text-amber-400 font-black">+{currency} {totals.termIncrementVariance.toFixed(2)} (+{comparison.absorptionShift}%)</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Monthly Payroll:</span>
                  <span className="text-white font-bold">{currency} {totals.newMonthlyTotal.toFixed(2)} / mo</span>
                </div>
              </div>
            </div>

            {/* Pillar 3: Projected Net Operating Surplus */}
            <div className="bg-neutral-950 p-3.5 rounded border border-neutral-800 space-y-1.5">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider flex items-center gap-1">
                  <Wallet size={13} className="text-sky-400" />
                  Net Operating Surplus
                </span>
                <span className="text-[10px] font-mono text-sky-400 font-bold">
                  {comparison.newSurplusMargin}% Margin
                </span>
              </div>
              <div className={`text-xl font-black font-mono ${comparison.newProjectedSurplus >= 0 ? 'text-sky-300' : 'text-rose-400'}`}>
                {currency} {comparison.newProjectedSurplus.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="pt-1.5 border-t border-neutral-850 text-[10px] font-mono text-neutral-400 space-y-0.5">
                <div className="flex justify-between">
                  <span>Previous Surplus:</span>
                  <span className="text-neutral-300">{currency} {comparison.oldProjectedSurplus.toFixed(2)} ({comparison.oldSurplusMargin}%)</span>
                </div>
                <div className="flex justify-between">
                  <span>Operating Reserve Shift:</span>
                  <span className="text-rose-400 font-bold">-{currency} {Math.abs(comparison.surplusShift).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Funds for Utilities & Ops:</span>
                  <span className="text-emerald-400 font-bold">{comparison.newSurplusMargin > 0 ? 'Adequate' : 'Deficit'}</span>
                </div>
              </div>
            </div>

            {/* Pillar 4: Pupil Coverage & Break-Even Allocation */}
            <div className="bg-neutral-950 p-3.5 rounded border border-neutral-800 space-y-1.5">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider flex items-center gap-1">
                  <Users size={13} className="text-amber-400" />
                  Pupil Payroll Coverage
                </span>
                <span className="text-[10px] font-mono text-neutral-300 font-bold">
                  {incomeMetrics.activePupilsCount} Pupils Roll
                </span>
              </div>
              <div className="text-xl font-black font-mono text-white">
                {comparison.breakEvenPupilsCount} <span className="text-xs text-neutral-400 font-sans">Break-even</span>
              </div>
              <div className="pt-1.5 border-t border-neutral-850 text-[10px] font-mono text-neutral-400 space-y-0.5">
                <div className="flex justify-between">
                  <span>Wages Headcount Ratio:</span>
                  <span className="text-amber-400 font-bold">{comparison.breakEvenPupilPct}% of School</span>
                </div>
                <div className="flex justify-between">
                  <span>Surplus Generating Pupils:</span>
                  <span className="text-emerald-400 font-bold">{comparison.surplusPupilsCount} Pupils</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg. Revenue Per Pupil:</span>
                  <span className="text-neutral-200 font-bold">{currency} {comparison.avgRevenuePerPupil.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Income Allocation Bar */}
          <div className="bg-neutral-950 p-3.5 rounded border border-neutral-800 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
              <span className="text-neutral-300 font-bold flex items-center gap-1.5">
                <PieChart size={14} className="text-amber-400" />
                Expected Gross Term Revenue Absorption Distribution:
              </span>
              <div className="flex items-center gap-4 text-[11px]">
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-xs inline-block"></span>
                  Staff Payroll ({comparison.newAbsorptionRate}%)
                </span>
                <span className="flex items-center gap-1 text-sky-400">
                  <span className="w-2.5 h-2.5 bg-sky-500 rounded-xs inline-block"></span>
                  Net Operational Surplus ({comparison.newSurplusMargin}%)
                </span>
              </div>
            </div>

            {/* Split Progress Bar */}
            <div className="h-4 w-full bg-neutral-900 rounded-full overflow-hidden flex border border-neutral-700">
              <div
                style={{ width: `${Math.min(100, Math.max(0, comparison.newAbsorptionRate))}%` }}
                className="bg-gradient-to-r from-amber-600 to-amber-400 transition-all relative group flex items-center justify-center text-[9px] font-mono font-black text-black"
                title={`Payroll: ${currency} ${totals.newTermTotal.toFixed(2)} (${comparison.newAbsorptionRate}%)`}
              >
                {comparison.newAbsorptionRate > 15 && `${comparison.newAbsorptionRate}% Payroll`}
              </div>
              <div
                style={{ width: `${Math.min(100, Math.max(0, comparison.newSurplusMargin))}%` }}
                className="bg-gradient-to-r from-sky-500 to-emerald-400 transition-all relative group flex items-center justify-center text-[9px] font-mono font-black text-black"
                title={`Operational Surplus: ${currency} ${comparison.newProjectedSurplus.toFixed(2)} (${comparison.newSurplusMargin}%)`}
              >
                {comparison.newSurplusMargin > 15 && `${comparison.newSurplusMargin}% Surplus`}
              </div>
            </div>

            {/* Sub-note: Live Realized Progress */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] font-mono text-neutral-400 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-neutral-500">Live Term Inflows Collected:</span>
                <span className="text-emerald-400 font-bold">{currency} {incomeMetrics.totalLiveIncomeCollected.toFixed(2)}</span>
                <span className="text-neutral-500">({incomeMetrics.liveCollectionRate}% of Expected Income)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-500">Live Payroll Coverage:</span>
                <span className="text-amber-400 font-bold">{comparison.livePayrollCoverage}% of New Term Salaries</span>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* COMPONENT 2: INTERACTIVE CONTROLS & BULK PRESET ADJUSTER BAR (SCREEN) */}
        {/* ==================================================================== */}
        <div className="bg-neutral-900/90 border-2 border-neutral-800 p-4 rounded-lg space-y-4 print:hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-neutral-800">
            {/* Left: Term Duration Selector */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold uppercase text-neutral-300 flex items-center gap-1.5">
                <Calendar size={14} className="text-amber-400" />
                Term Duration:
              </span>
              <div className="flex items-center gap-1.5 bg-neutral-950 p-1 rounded border border-neutral-800">
                {[1, 3, 4, 12].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setMonthsInTerm(m);
                      playFeedbackSound?.('click');
                    }}
                    className={`px-2.5 py-1 text-xs font-mono font-black uppercase rounded transition-all cursor-pointer ${
                      monthsInTerm === m
                        ? 'bg-amber-400 text-black'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {m === 1 ? '1 Mo.' : m === 3 ? '3 Mo. (1 Term)' : m === 4 ? '4 Mo.' : '12 Mo. (Year)'}
                  </button>
                ))}
                <div className="flex items-center pl-1 border-l border-neutral-800">
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={monthsInTerm}
                    onChange={(e) => setMonthsInTerm(Math.max(1, parseInt(e.target.value) || 1))}
                    title="Custom months count"
                    className="w-12 bg-neutral-900 text-white text-xs font-mono font-black text-center py-0.5 rounded border border-neutral-750 focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-[10px] text-neutral-500 font-mono px-1">Mo.</span>
                </div>
              </div>
            </div>

            {/* Right: Quick % Bulk Presets */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase text-neutral-400 flex items-center gap-1">
                <Sliders size={13} className="text-amber-400" />
                Quick % Presets:
              </span>
              {[5, 10, 15, 20, 25].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleApplyGlobalPercentage(pct)}
                  className="px-2 py-1 bg-neutral-950 hover:bg-neutral-800 border border-neutral-750 text-neutral-300 hover:text-white text-xs font-mono font-bold rounded transition-colors cursor-pointer"
                >
                  +{pct}%
                </button>
              ))}

              <div className="flex items-center gap-1 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                <input
                  type="number"
                  min="-100"
                  max="500"
                  step="0.5"
                  value={globalPercentage}
                  onChange={(e) => setGlobalPercentage(parseFloat(e.target.value) || 0)}
                  className="w-12 bg-neutral-900 text-white text-xs font-mono font-bold text-center py-0.5 rounded border border-neutral-700 focus:outline-none focus:border-amber-400"
                />
                <span className="text-xs font-mono text-neutral-400">%</span>
                <button
                  type="button"
                  onClick={() => handleApplyGlobalPercentage(globalPercentage)}
                  className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-mono font-black uppercase rounded cursor-pointer transition-colors ml-1"
                >
                  Apply
                </button>
              </div>

              <button
                type="button"
                onClick={handleResetToZero}
                className="px-2.5 py-1 text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 text-xs font-mono rounded transition-colors cursor-pointer flex items-center gap-1"
                title="Reset all increments to 0%"
              >
                <RotateCcw size={12} />
                <span>Reset 0%</span>
              </button>
            </div>
          </div>

          {/* Search, Filter by Department & Select All */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-2.5 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search worker by name, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 py-1.5 pl-9 pr-3 text-xs font-mono text-white focus:outline-none focus:border-amber-400 rounded"
                />
              </div>

              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 py-1.5 px-3 text-xs font-mono text-neutral-300 focus:outline-none focus:border-amber-400 rounded"
              >
                <option value="All">All Staff Roles ({workerRows.length})</option>
                <option value="Teacher">Teachers Only ({workerRows.filter((w) => w.role === 'Teacher').length})</option>
                <option value="Administrator">Administrators ({workerRows.filter((w) => w.role === 'Administrator').length})</option>
                <option value="Accountant">Finance & Accountants ({workerRows.filter((w) => w.role === 'Accountant').length})</option>
                <option value="Director">Directors & Board ({workerRows.filter((w) => w.role === 'Director').length})</option>
                <option value="Driver">Drivers & Transport ({workerRows.filter((w) => w.role === 'Driver').length})</option>
                <option value="Kitchen Staff">Kitchen & Catering ({workerRows.filter((w) => w.role === 'Kitchen Staff').length})</option>
                <option value="Security">Security Personnel ({workerRows.filter((w) => w.role === 'Security').length})</option>
              </select>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setWorkerRows((prev) => prev.map((w) => ({ ...w, selected: true })))}
                className="text-[11px] font-mono text-amber-400 hover:text-amber-300 uppercase font-bold cursor-pointer"
              >
                Select All ({workerRows.length})
              </button>
              <span className="text-neutral-700">|</span>
              <button
                type="button"
                onClick={() => setWorkerRows((prev) => prev.map((w) => ({ ...w, selected: false })))}
                className="text-[11px] font-mono text-neutral-400 hover:text-white uppercase font-bold cursor-pointer"
              >
                Deselect All
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COMPONENT 3: MAIN SALARY INCREMENT SCHEDULE TABLE (SCREEN & PRINT)        */}
        {/* ========================================================================= */}
        <div className="border-2 border-neutral-800 print:border-black rounded overflow-hidden">
          <div className="overflow-x-auto max-h-[380px] print:max-h-none overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse font-mono print:text-black">
              <thead className="bg-neutral-900 text-neutral-300 print:bg-gray-100 print:text-black border-b-2 border-neutral-800 print:border-black sticky top-0 z-10 text-[10px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="p-3 text-center w-10 print:hidden">Sel</th>
                  <th className="p-3 w-8 text-center">#</th>
                  <th className="p-3">Staff / Teacher Name</th>
                  <th className="p-3">Role / Gate</th>
                  <th className="p-3 text-right">Old Salary (Mo.)</th>
                  <th className="p-3 text-center">Increment (%)</th>
                  <th className="p-3 text-right">Monthly +Inc</th>
                  <th className="p-3 text-right bg-amber-400/5 print:bg-transparent">New Salary (Mo.)</th>
                  <th className="p-3 text-right hidden sm:table-cell print:table-cell">Old Term Spend</th>
                  <th className="p-3 text-right bg-amber-400/10 print:bg-transparent font-black">
                    Expected End of Term
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850 print:divide-gray-300 bg-neutral-950 print:bg-white">
                {filteredWorkers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-neutral-500 font-sans">
                      No matching staff members found.
                    </td>
                  </tr>
                ) : (
                  filteredWorkers.map((worker, index) => {
                    const isSelected = worker.selected;
                    const monthlyInc = worker.newSalary - worker.oldSalary;
                    const oldTermSpend = worker.oldSalary * monthsInTerm;
                    const newTermSpend = worker.newSalary * monthsInTerm;
                    const isIncrease = monthlyInc > 0;

                    return (
                      <tr
                        key={worker.userId}
                        className={`transition-colors ${
                          isSelected
                            ? 'hover:bg-neutral-900/50 print:bg-white'
                            : 'opacity-40 hover:opacity-70 bg-neutral-950/40 print:opacity-100'
                        }`}
                      >
                        {/* Checkbox (Screen Only) */}
                        <td className="p-3 text-center print:hidden">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(worker.userId)}
                            className="w-4 h-4 accent-amber-500 cursor-pointer"
                          />
                        </td>

                        {/* S/N */}
                        <td className="p-3 text-center text-neutral-500 print:text-black">
                          {index + 1}
                        </td>

                        {/* Name & ID */}
                        <td className="p-3 font-sans">
                          <div className="font-bold text-white print:text-black text-xs">
                            {worker.workerName}
                          </div>
                          <div className="text-[10px] text-neutral-500 print:text-gray-600 font-mono">
                            {worker.employeeId}
                          </div>
                        </td>

                        {/* Role & Gate */}
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-neutral-900 print:bg-gray-100 border border-neutral-800 print:border-gray-300 text-[10px] font-bold text-amber-400 print:text-black rounded">
                            {worker.role}
                          </span>
                          {worker.assignedGate && (
                            <span className="block text-[9px] text-neutral-400 print:text-gray-600 mt-0.5">
                              {worker.assignedGate}
                            </span>
                          )}
                        </td>

                        {/* Old Salary */}
                        <td className="p-3 text-right font-bold text-neutral-300 print:text-black">
                          <span className="print:inline hidden">
                            {currency} {worker.oldSalary.toFixed(2)}
                          </span>
                          <div className="print:hidden flex items-center justify-end gap-1">
                            <span className="text-neutral-500 text-[10px]">{currency}</span>
                            <input
                              type="number"
                              min="0"
                              step="10"
                              value={worker.oldSalary}
                              onChange={(e) =>
                                handleOldSalaryChange(worker.userId, parseFloat(e.target.value))
                              }
                              className="w-20 bg-neutral-900 border border-neutral-800 text-right px-2 py-1 text-xs text-white rounded focus:border-amber-400 focus:outline-none"
                            />
                          </div>
                        </td>

                        {/* Individual Percentage */}
                        <td className="p-3 text-center">
                          <span className="print:inline hidden font-bold">
                            {worker.percentage >= 0 ? `+${worker.percentage}%` : `${worker.percentage}%`}
                          </span>
                          <div className="print:hidden flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min="-100"
                              max="500"
                              step="0.5"
                              value={worker.percentage}
                              onChange={(e) =>
                                handlePercentageChange(worker.userId, parseFloat(e.target.value))
                              }
                              className={`w-16 text-center font-bold px-1.5 py-1 text-xs rounded border focus:outline-none ${
                                worker.percentage > 0
                                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400 focus:border-emerald-400'
                                  : worker.percentage < 0
                                  ? 'bg-rose-950/60 border-rose-500 text-rose-400 focus:border-rose-400'
                                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 focus:border-amber-400'
                              }`}
                            />
                            <span className="text-[10px] text-neutral-500">%</span>
                          </div>
                        </td>

                        {/* Monthly Increase */}
                        <td
                          className={`p-3 text-right font-bold ${
                            isIncrease
                              ? 'text-emerald-400 print:text-black'
                              : monthlyInc < 0
                              ? 'text-rose-400 print:text-black'
                              : 'text-neutral-500 print:text-black'
                          }`}
                        >
                          {isIncrease ? `+${currency} ${monthlyInc.toFixed(2)}` : `${currency} ${monthlyInc.toFixed(2)}`}
                        </td>

                        {/* New Monthly Salary */}
                        <td className="p-3 text-right bg-amber-400/5 print:bg-transparent">
                          <span className="print:inline hidden font-black">
                            {currency} {worker.newSalary.toFixed(2)}
                          </span>
                          <div className="print:hidden flex items-center justify-end gap-1">
                            <span className="text-amber-400 text-[10px]">{currency}</span>
                            <input
                              type="number"
                              min="0"
                              step="10"
                              value={worker.newSalary}
                              onChange={(e) =>
                                handleNewSalaryChange(worker.userId, parseFloat(e.target.value))
                              }
                              className="w-24 bg-neutral-900 border border-amber-400/60 font-black text-amber-400 text-right px-2 py-1 text-xs rounded focus:border-amber-400 focus:outline-none"
                            />
                          </div>
                        </td>

                        {/* Old Term Spend */}
                        <td className="p-3 text-right text-neutral-400 print:text-gray-700 hidden sm:table-cell print:table-cell">
                          {currency} {oldTermSpend.toFixed(2)}
                        </td>

                        {/* New Term Total Expected */}
                        <td className="p-3 text-right font-black text-amber-400 print:text-black bg-amber-400/10 print:bg-transparent text-sm">
                          {currency} {newTermSpend.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Table Footer Totals Summary */}
              <tfoot className="bg-neutral-900 text-white print:bg-gray-100 print:text-black border-t-2 border-neutral-700 print:border-black font-mono font-black text-xs">
                <tr>
                  <td className="p-3 text-center print:hidden"></td>
                  <td className="p-3 text-center font-bold text-[10px]">TOTAL</td>
                  <td className="p-3 uppercase" colSpan={2}>
                    Active Workers: {totals.count} Staff
                  </td>
                  <td className="p-3 text-right">
                    {currency} {totals.oldMonthlyTotal.toFixed(2)}
                  </td>
                  <td className="p-3 text-center text-amber-400 print:text-black">
                    +{totals.overallPctIncrease}% (Avg)
                  </td>
                  <td className="p-3 text-right text-emerald-400 print:text-black">
                    +{currency} {totals.monthlyIncrementVariance.toFixed(2)}
                  </td>
                  <td className="p-3 text-right text-amber-400 print:text-black bg-amber-400/10 print:bg-transparent text-sm">
                    {currency} {totals.newMonthlyTotal.toFixed(2)}
                  </td>
                  <td className="p-3 text-right hidden sm:table-cell print:table-cell text-neutral-400 print:text-black">
                    {currency} {totals.oldTermTotal.toFixed(2)}
                  </td>
                  <td className="p-3 text-right text-amber-300 print:text-black bg-amber-400/20 print:bg-transparent text-base">
                    {currency} {totals.newTermTotal.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ========================================================================================= */}
        {/* COMPONENT 4: DETAILED TERM SALARY VS EXPECTED INCOME COMPARATIVE ANALYSIS (PRINT & SCREEN) */}
        {/* ========================================================================================= */}
        <div className="border-2 border-neutral-800 print:border-black p-4 rounded bg-neutral-900/50 print:bg-white text-xs font-mono space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-neutral-800 print:border-black pb-2.5 gap-2">
            <div>
              <span className="font-black uppercase tracking-wider text-amber-400 print:text-black text-xs block">
                TERM SALARY EXPENDITURE VS. EXPECTED INCOME COMPARATIVE ANALYSIS
              </span>
              <span className="text-[11px] text-neutral-400 print:text-gray-700">
                School Roll: <strong>{incomeMetrics.activePupilsCount} Active Students</strong> | Term Length: <strong>{monthsInTerm} Months (~{incomeMetrics.schoolDaysEstimate} School Days)</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded border text-[11px] font-black uppercase ${comparison.healthColor} print:${comparison.healthPrintColor}`}>
                Status: {comparison.healthBadge}
              </span>
            </div>
          </div>

          {/* Structured Comparative Table (Both Print & Screen) */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse border border-neutral-800 print:border-black print:text-black font-mono">
              <thead className="bg-neutral-950 print:bg-gray-100 text-neutral-300 print:text-black text-[10px] uppercase font-bold border-b border-neutral-800 print:border-black">
                <tr>
                  <th className="p-2.5 border-r border-neutral-800 print:border-black">Financial Revenue / Expenditure Metric</th>
                  <th className="p-2.5 text-right border-r border-neutral-800 print:border-black">Previous Term Benchmark</th>
                  <th className="p-2.5 text-right border-r border-neutral-800 print:border-black bg-amber-400/5 print:bg-transparent">New Proposed Term Model</th>
                  <th className="p-2.5 text-right border-r border-neutral-800 print:border-black">Net Budget Shift / Variance</th>
                  <th className="p-2.5 text-right">Revenue Allocation %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850 print:divide-gray-300 text-xs">
                {/* Row 1: Expected Gross Revenue */}
                <tr className="bg-neutral-900/30 print:bg-white font-bold">
                  <td className="p-2.5 border-r border-neutral-800 print:border-black text-white print:text-black flex items-center gap-2">
                    <Coins size={14} className="text-emerald-400 print:text-black" />
                    <span>Total Expected Gross Term Revenue (100%)</span>
                  </td>
                  <td className="p-2.5 text-right border-r border-neutral-800 print:border-black text-neutral-300 print:text-black">
                    {currency} {incomeMetrics.totalExpectedRevenue.toFixed(2)}
                  </td>
                  <td className="p-2.5 text-right border-r border-neutral-800 print:border-black font-black text-emerald-400 print:text-black bg-emerald-950/20 print:bg-transparent">
                    {currency} {incomeMetrics.totalExpectedRevenue.toFixed(2)}
                  </td>
                  <td className="p-2.5 text-right border-r border-neutral-800 print:border-black text-neutral-400 print:text-gray-600">
                    -- (Base Gross)
                  </td>
                  <td className="p-2.5 text-right font-black text-emerald-400 print:text-black">
                    100.0% Target
                  </td>
                </tr>

                {/* Sub-row: Revenue Breakdown */}
                <tr className="text-[10px] text-neutral-400 print:text-gray-700 bg-neutral-950/60 print:bg-gray-50">
                  <td className="p-2 pl-6 border-r border-neutral-800 print:border-black" colSpan={2}>
                    • Tuition Subscriptions: <strong>{currency} {incomeMetrics.expectedTuitionRevenue.toFixed(2)}</strong> | • Feeding & Check-in Dues: <strong>{currency} {incomeMetrics.expectedDailyFeedingRevenue.toFixed(2)}</strong> | • Exams Fees: <strong>{currency} {incomeMetrics.expectedExamsRevenue.toFixed(2)}</strong>
                  </td>
                  <td className="p-2 text-right border-r border-neutral-800 print:border-black font-mono text-[10px] text-neutral-300 print:text-black" colSpan={2}>
                    Live Collected To Date: <strong>{currency} {incomeMetrics.totalLiveIncomeCollected.toFixed(2)}</strong> ({incomeMetrics.liveCollectionRate}%)
                  </td>
                  <td className="p-2 text-right font-mono text-[10px] text-emerald-400 print:text-black">
                    {incomeMetrics.activePupilsCount} Enrolled
                  </td>
                </tr>

                {/* Row 2: Term Wage Outflow */}
                <tr className="font-bold">
                  <td className="p-2.5 border-r border-neutral-800 print:border-black text-white print:text-black flex items-center gap-2">
                    <Briefcase size={14} className="text-amber-400 print:text-black" />
                    <span>Total Term Staff Payroll Expenditure ({monthsInTerm} Mo.)</span>
                  </td>
                  <td className="p-2.5 text-right border-r border-neutral-800 print:border-black text-neutral-400 print:text-gray-700">
                    {currency} {comparison.oldTermSalary.toFixed(2)}
                  </td>
                  <td className="p-2.5 text-right border-r border-neutral-800 print:border-black font-black text-amber-300 print:text-black bg-amber-400/10 print:bg-transparent text-sm">
                    {currency} {comparison.newTermSalary.toFixed(2)}
                  </td>
                  <td className="p-2.5 text-right border-r border-neutral-800 print:border-black font-bold text-emerald-400 print:text-black">
                    +{currency} {comparison.salaryVariance.toFixed(2)} (+{totals.overallPctIncrease}%)
                  </td>
                  <td className="p-2.5 text-right font-black text-amber-400 print:text-black">
                    {comparison.newAbsorptionRate}% of Revenue
                  </td>
                </tr>

                {/* Row 3: Monthly Breakdown */}
                <tr className="text-[11px] text-neutral-300 print:text-gray-800">
                  <td className="p-2.5 pl-6 border-r border-neutral-800 print:border-black">
                    Monthly Wage Outflow (Per Month Commitment)
                  </td>
                  <td className="p-2.5 text-right border-r border-neutral-800 print:border-black text-neutral-400 print:text-gray-600">
                    {currency} {totals.oldMonthlyTotal.toFixed(2)} / mo
                  </td>
                  <td className="p-2.5 text-right border-r border-neutral-800 print:border-black font-bold text-white print:text-black bg-amber-400/5 print:bg-transparent">
                    {currency} {totals.newMonthlyTotal.toFixed(2)} / mo
                  </td>
                  <td className="p-2.5 text-right border-r border-neutral-800 print:border-black text-emerald-400 print:text-black font-bold">
                    +{currency} {totals.monthlyIncrementVariance.toFixed(2)} / mo
                  </td>
                  <td className="p-2.5 text-right text-neutral-400 print:text-gray-700 font-mono">
                    +{comparison.absorptionShift}% Net Shift
                  </td>
                </tr>

                {/* Row 4: Net Operating Surplus */}
                <tr className="bg-neutral-900/60 print:bg-gray-100 font-black">
                  <td className="p-2.5 border-r border-neutral-800 print:border-black text-white print:text-black flex items-center gap-2">
                    <Wallet size={14} className="text-sky-400 print:text-black" />
                    <span>Projected Net Operating Surplus (After Staff Payroll)</span>
                  </td>
                  <td className="p-2.5 text-right border-r border-neutral-800 print:border-black text-neutral-300 print:text-gray-800">
                    {currency} {comparison.oldProjectedSurplus.toFixed(2)}
                  </td>
                  <td className="p-2.5 text-right border-r border-neutral-800 print:border-black text-sky-300 print:text-black bg-sky-950/20 print:bg-transparent text-sm">
                    {currency} {comparison.newProjectedSurplus.toFixed(2)}
                  </td>
                  <td className="p-2.5 text-right border-r border-neutral-800 print:border-black font-bold text-rose-400 print:text-black">
                    -{currency} {Math.abs(comparison.surplusShift).toFixed(2)}
                  </td>
                  <td className="p-2.5 text-right text-sky-400 print:text-black">
                    {comparison.newSurplusMargin}% Margin
                  </td>
                </tr>

                {/* Row 5: Break-Even Coverage */}
                <tr className="text-[11px] text-neutral-300 print:text-gray-800">
                  <td className="p-2.5 border-r border-neutral-800 print:border-black flex items-center gap-2">
                    <Users size={14} className="text-amber-400 print:text-black" />
                    <span>Pupil Roll Coverage: Break-Even vs. Surplus Generating</span>
                  </td>
                  <td className="p-2.5 text-right border-r border-neutral-800 print:border-black text-neutral-400 print:text-gray-600">
                    {Math.ceil(comparison.oldTermSalary / (comparison.avgRevenuePerPupil || 1))} Pupils
                  </td>
                  <td className="p-2.5 text-right border-r border-neutral-800 print:border-black font-bold text-white print:text-black bg-amber-400/5 print:bg-transparent">
                    {comparison.breakEvenPupilsCount} Pupils ({comparison.breakEvenPupilPct}%)
                  </td>
                  <td className="p-2.5 text-right border-r border-neutral-800 print:border-black text-neutral-300 print:text-black font-mono">
                    {comparison.surplusPupilsCount} Surplus Pupils
                  </td>
                  <td className="p-2.5 text-right text-emerald-400 print:text-black font-mono">
                    {currency} {comparison.avgRevenuePerPupil.toFixed(0)} / pupil
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Executive Narrative & Sustainability Assessment */}
          <div className="bg-neutral-950 print:bg-gray-50 p-3.5 rounded border border-neutral-800 print:border-gray-400 space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 print:text-black flex items-center gap-1.5">
              <ShieldCheck size={14} />
              Executive Financial Feasibility Summary:
            </div>
            <p className="text-[11px] text-neutral-300 print:text-black font-sans leading-relaxed">
              With <strong>{totals.count} staff members</strong> included in this increment review, the school's monthly payroll increases by <strong>+{currency} {totals.monthlyIncrementVariance.toFixed(2)}</strong> (+{totals.overallPctIncrease}%), resulting in a total term wage commitment of <strong>{currency} {comparison.newTermSalary.toFixed(2)}</strong> over {monthsInTerm} months. This represents <strong>{comparison.newAbsorptionRate}% of the total expected gross term income</strong> ({currency} {incomeMetrics.totalExpectedRevenue.toFixed(2)}), leaving a projected operational surplus of <strong>{currency} {comparison.newProjectedSurplus.toFixed(2)}</strong> ({comparison.newSurplusMargin}% margin) to cover school utilities, student feeding, exams, and infrastructure maintenance.
            </p>
          </div>
        </div>

        {/* ========================================================= */}
        {/* PRINT ONLY: OFFICIAL SIGNATURES & AUTHORIZATION BLOCKS   */}
        {/* ========================================================= */}
        <div className="hidden print:grid grid-cols-3 gap-6 pt-10 mt-6 border-t-2 border-black text-black font-sans text-xs">
          <div className="space-y-10">
            <p className="font-bold uppercase text-[10px] text-gray-700">Prepared By (Bursar / Accountant):</p>
            <div className="border-b border-black pt-6"></div>
            <p className="text-[10px]">Name: ____________________</p>
            <p className="text-[10px]">Date: ____________________</p>
          </div>

          <div className="space-y-10">
            <p className="font-bold uppercase text-[10px] text-gray-700">Verified By (Headteacher / Principal):</p>
            <div className="border-b border-black pt-6"></div>
            <p className="text-[10px]">Name: ____________________</p>
            <p className="text-[10px]">Date: ____________________</p>
          </div>

          <div className="space-y-10">
            <p className="font-bold uppercase text-[10px] text-gray-700">Approved By (School Director / Board):</p>
            <div className="border-b border-black pt-6"></div>
            <p className="text-[10px]">Official Stamp & Signature</p>
            <p className="text-[10px]">Date: ____________________</p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SCREEN ONLY: BOTTOM ACTION TOOLBAR (COMMIT, EXPORT, PRINT, CLOSE)        */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t-2 border-neutral-850 print:hidden">
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Adjust individual worker % or new salary cells directly. All income comparison ratios update immediately.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 text-xs font-mono font-bold uppercase border border-neutral-800 rounded transition-colors cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2.5 bg-neutral-850 hover:bg-neutral-800 text-white text-xs font-mono font-bold uppercase border border-neutral-700 rounded flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer size={15} className="text-amber-400" />
              <span>Print Official Sheet</span>
            </button>

            <button
              type="button"
              disabled={isCommitting || totals.count === 0}
              onClick={handleCommitToDatabase}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-40 text-black text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2 rounded shadow-lg transition-all cursor-pointer"
              title="Apply these new base wages to staff profiles in the active database"
            >
              <Check size={16} className="stroke-[3]" />
              <span>
                {isCommitting ? 'Applying to Database...' : `Apply & Save New Wages (${totals.count})`}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
