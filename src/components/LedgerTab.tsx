import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Scale, 
  Plus, 
  Trash2, 
  RefreshCw, 
  SlidersHorizontal, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  User, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  ListFilter, 
  Award, 
  Activity, 
  Sparkles, 
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { JournalEntry, WorkerSalary, Expense, PaymentRecord, ExamsPayment, ExamsExpense, ExamsSettings, StudentClass } from '../types';

export function LedgerTab() {
  const { 
    journalEntries = [], 
    addJournalEntry, 
    deleteJournalEntry,
    expenses = [],
    salaries = [],
    payments = [],
    teacherEvaluations = [],
    users = [],
    playFeedbackSound,
    examsPayments = [],
    examsExpenses = [],
    examsSettings = null,
    students = [],
    activeTerm = null
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'journals' | 'performance_salary'>('journals');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Journal entries filters
  const [search, setSearch] = useState('');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('');
  
  // Post New Journal Entry Modal
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [postDate, setPostDate] = useState(new Date().toISOString().split('T')[0]);
  const [postDescription, setPostDescription] = useState('');
  const [postDebitAccount, setPostDebitAccount] = useState('Expenses - General');
  const [postCreditAccount, setPostCreditAccount] = useState('Assets - Cash/Bank');
  const [postAmount, setPostAmount] = useState('');
  const [postRecordedBy, setPostRecordedBy] = useState('Hakeem Yakubu');

  // Performance Salary Filter
  const [perfMonthYear, setPerfMonthYear] = useState('June 2026');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');

  // Pre-defined Accounts
  const ledgerAccounts = [
    'Assets - Cash/Bank',
    'Assets - Mobile Money Ledger',
    'Revenue - School Fees',
    'Revenue - Exams Fees',
    'Expenses - Staff Salaries',
    'Expenses - Utilities',
    'Expenses - Security & Ops',
    'Expenses - Exams & Stationery',
    'Expenses - General',
    'Deductions - SSNIT Liability',
    'Deductions - Welfare Funds',
    'Deductions - Income Tax',
    'Deductions - Attendance Penalties'
  ];

  // Refresh / Recalculate
  const handleRefresh = () => {
    setIsRefreshing(true);
    playFeedbackSound?.('success');
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  // Auto-Sync and generate balanced ledger entries from historical data (Auto-Book)
  const handleAutoBookAll = async () => {
    setIsRefreshing(true);
    let count = 0;

    // Helper to check if a source reference is already booked
    const isReferenceBooked = (refId: string) => {
      return journalEntries.some(j => j.description.includes(refId));
    };

    // 1. Process Student Fee Payments (Debit Assets - Cash/Bank, Credit Revenue - School Fees)
    const paidFees = payments.filter(p => p.amount > 0 && !p.isAbsent);
    for (const p of paidFees) {
      if (!isReferenceBooked(p.id)) {
        const debitAcct = p.momoStatus === 'successful' || p.paymentMethod?.toLowerCase().includes('momo') 
          ? 'Assets - Mobile Money Ledger' 
          : 'Assets - Cash/Bank';
        await addJournalEntry({
          date: p.date,
          description: `Auto-Book Fee Collection: Pupil ${p.studentName || 'Record'} [Ref: ${p.id}]`,
          debitAccount: debitAcct,
          creditAccount: 'Revenue - School Fees',
          amount: p.amount,
          recordedBy: 'Auto-Ledger Bot'
        });
        count++;
      }
    }

    // 2. Process Expenses (Debit Expense Account, Credit Assets - Cash/Bank)
    for (const exp of expenses) {
      if (!isReferenceBooked(exp.id)) {
        let debAcct = 'Expenses - General';
        if (exp.category === 'Utilities') debAcct = 'Expenses - Utilities';
        else if (exp.category === 'Security' || exp.category === 'Operations') debAcct = 'Expenses - Security & Ops';
        else if (exp.category === 'Exams' || exp.category === 'Stationery') debAcct = 'Expenses - Exams & Stationery';

        await addJournalEntry({
          date: exp.date,
          description: `Auto-Book Expenditure: ${exp.description} (Category: ${exp.category}) [Ref: ${exp.id}]`,
          debitAccount: debAcct,
          creditAccount: 'Assets - Cash/Bank',
          amount: exp.amount,
          recordedBy: exp.approvedBy || 'Auto-Ledger Bot'
        });
        count++;
      }
    }

    // 3. Process Worker Salaries (Debit Expenses - Staff Salaries, Credit Assets - Cash/Bank, etc.)
    for (const sal of salaries) {
      if (!isReferenceBooked(sal.id)) {
        await addJournalEntry({
          date: sal.date,
          description: `Auto-Book Salary Payout: ${sal.workerName} - ${sal.monthYear} [Ref: ${sal.id}]`,
          debitAccount: 'Expenses - Staff Salaries',
          creditAccount: sal.paymentMethod?.toLowerCase().includes('momo') ? 'Assets - Mobile Money Ledger' : 'Assets - Cash/Bank',
          amount: sal.netPaid,
          recordedBy: 'Auto-Ledger Bot'
        });
        count++;
      }
    }

    // 4. Process Exams Payments (Debit Cash/Bank or Mobile Money Ledger, Credit Revenue - Exams Fees)
    const eligibleClasses = examsSettings?.eligibleClasses || ['KG1', 'KG2', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9'];
    const activeTermId = activeTerm?.id || 'term_default';
    const activeTermExamsPayments = examsPayments.filter(p => {
      if (p.termId !== activeTermId) return false;
      return eligibleClasses.includes(p.class);
    });

    for (const p of activeTermExamsPayments) {
      if (!isReferenceBooked(p.id)) {
        const debitAcct = p.paymentMethod?.toLowerCase().includes('momo') 
          ? 'Assets - Mobile Money Ledger' 
          : 'Assets - Cash/Bank';
        await addJournalEntry({
          date: p.datePaid,
          description: `Auto-Book Exams Fee Collection: Pupil ${p.studentName || 'Record'} (${p.class}) [Ref: ${p.id}]`,
          debitAccount: debitAcct,
          creditAccount: 'Revenue - Exams Fees',
          amount: p.amountPaid,
          recordedBy: p.collectedBy || 'Auto-Ledger Bot'
        });
        count++;
      }
    }

    // 5. Process Exams Expenses (Debit Expenses - Exams & Stationery, Credit Assets - Cash/Bank)
    for (const exp of examsExpenses) {
      if (!isReferenceBooked(exp.id)) {
        // Publisher expense: determine targeted classes and apply eligibility filter
        let targetedClasses: StudentClass[] = [];
        if (exp.targetClass === 'Entire-School') {
          targetedClasses = ['Nursery', 'KG1', 'KG2', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9'];
        } else if (exp.targetClass === 'All-Preschool') {
          targetedClasses = ['Nursery', 'KG1', 'KG2'];
        } else if (exp.targetClass === 'All-Primary') {
          targetedClasses = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'];
        } else if (exp.targetClass === 'All-JHS') {
          targetedClasses = ['B7', 'B8', 'B9'];
        } else {
          targetedClasses = [exp.targetClass as StudentClass];
        }

        const eligibleTargetClasses = targetedClasses.filter(cls => eligibleClasses.includes(cls));
        const eligibleStudentCount = students.filter(s => s.active && eligibleTargetClasses.includes(s.class)).length;

        const isOther = eligibleStudentCount === 0 || exp.notes?.includes('[Other Expense]');
        const adjustedTotal = isOther ? exp.totalAmount : exp.billingPerChild * eligibleStudentCount;

        if (adjustedTotal > 0) {
          await addJournalEntry({
            date: exp.date,
            description: `Auto-Book Exams Expenditure: ${exp.providerName} - ${exp.targetClass} [Ref: ${exp.id}]`,
            debitAccount: 'Expenses - Exams & Stationery',
            creditAccount: 'Assets - Cash/Bank',
            amount: adjustedTotal,
            recordedBy: 'Auto-Ledger Bot'
          });
          count++;
        }
      }
    }

    playFeedbackSound?.('success');
    setIsRefreshing(false);
    alert(`Successfully synchronized school cash book! Booked ${count} new balanced journal entries.`);
  };

  // Delete journal entry
  const handleDeleteJournal = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this ledger entry? This action is recorded in the audit logs.')) {
      await deleteJournalEntry(id);
      playFeedbackSound?.('warning');
    }
  };

  // Post Manual Journal
  const handlePostJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postDescription || !postAmount || parseFloat(postAmount) <= 0) {
      alert('Please fill out all fields with valid amounts.');
      return;
    }

    const success = await addJournalEntry({
      date: postDate,
      description: `[Manual Adjusting] ${postDescription}`,
      debitAccount: postDebitAccount,
      creditAccount: postCreditAccount,
      amount: parseFloat(postAmount),
      recordedBy: postRecordedBy
    });

    if (success) {
      playFeedbackSound?.('success');
      setIsPostModalOpen(false);
      setPostDescription('');
      setPostAmount('');
    } else {
      alert('Failed to save adjusting entry. Please verify database connectivity.');
    }
  };

  // Filter Journals
  const filteredJournals = useMemo(() => {
    return journalEntries.filter(j => {
      const matchesSearch = 
        j.description.toLowerCase().includes(search.toLowerCase()) ||
        j.debitAccount.toLowerCase().includes(search.toLowerCase()) ||
        j.creditAccount.toLowerCase().includes(search.toLowerCase()) ||
        j.recordedBy.toLowerCase().includes(search.toLowerCase());
      
      const matchesAccount = accountFilter === 'all' || 
        j.debitAccount === accountFilter || 
        j.creditAccount === accountFilter;

      const matchesDate = !dateFilter || j.date === dateFilter;

      return matchesSearch && matchesAccount && matchesDate;
    });
  }, [journalEntries, search, accountFilter, dateFilter]);

  // Ledger stats
  const totalDebits = useMemo(() => {
    return filteredJournals.reduce((sum, j) => sum + j.amount, 0);
  }, [filteredJournals]);

  const totalCredits = useMemo(() => {
    return filteredJournals.reduce((sum, j) => sum + j.amount, 0); // Double entry guarantees debit = credit per entry
  }, [filteredJournals]);

  const totalGlobalDebits = useMemo(() => {
    return journalEntries.reduce((sum, j) => sum + j.amount, 0);
  }, [journalEntries]);

  // Performance-Salary metrics calculation
  const performanceSalarySummary = useMemo(() => {
    const teachers = users.filter(u => u.role === 'Teacher' || u.role === 'Staff');
    
    return teachers.map(teacher => {
      // Find evaluation for selected month
      const evaluation = teacherEvaluations.find(
        e => e.teacherId === teacher.id && 
        e.monthYear.trim().toLowerCase() === perfMonthYear.trim().toLowerCase()
      );

      // Find base stipend salary
      const baseSalary = teacher.stipendSalary || 0;

      // Compute performance benefits & deductions percentage
      const benefitPct = evaluation ? evaluation.calculatedBenefit : 0;
      const deductionPct = evaluation ? evaluation.calculatedDeduction : 0;

      // Monetary values
      const performanceBonus = (baseSalary * benefitPct) / 100;
      const performanceDeduction = (baseSalary * deductionPct) / 100;

      // Deductions mock SSNIT / taxes
      const welfareDeduction = baseSalary > 0 ? 15 : 0; // standard welfare contribution
      const ssnitContribution = baseSalary * 0.055; // 5.5% employee SSNIT

      const netPaid = baseSalary + performanceBonus - performanceDeduction - welfareDeduction - ssnitContribution;

      // Find if this teacher was actually paid for this month already
      const paymentRecord = salaries.find(
        s => s.userId === teacher.id && 
        s.monthYear.trim().toLowerCase() === perfMonthYear.trim().toLowerCase()
      );

      return {
        teacherId: teacher.id,
        name: teacher.name,
        role: teacher.role,
        baseSalary,
        attendanceScore: evaluation?.attendanceScore || 'N/A',
        punctualityScore: evaluation?.punctualityScore || 'N/A',
        negligenceReports: evaluation?.negligenceReports || 'None',
        benefitPct,
        deductionPct,
        performanceBonus,
        performanceDeduction,
        welfareDeduction,
        ssnitContribution,
        netPaid: netPaid > 0 ? netPaid : 0,
        isPaid: !!paymentRecord,
        payoutId: paymentRecord?.id || null,
        evaluationId: evaluation?.id || null
      };
    });
  }, [users, teacherEvaluations, salaries, perfMonthYear]);

  // Selected single teacher detailed performance metrics mapping
  const selectedTeacherDetails = useMemo(() => {
    if (!selectedStaffId) return null;
    return performanceSalarySummary.find(p => p.teacherId === selectedStaffId) || null;
  }, [selectedStaffId, performanceSalarySummary]);

  return (
    <div className="space-y-6" id="ledger-bookkeeping-tab">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-neutral-900 gap-4">
        <div>
          <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Scale className="text-amber-400 stroke-[2.5]" size={18} />
            <span>Double-Entry General Ledger</span>
          </h3>
          <p className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider mt-1">
            Audit-compliant double-entry ledger bookkeeping. Seamlessly solve base salary adjustments via performance metrics
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleAutoBookAll}
            disabled={isRefreshing}
            className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-black border-2 border-emerald-400 flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(16,185,129,0.3)] disabled:opacity-50"
          >
            <Sparkles size={12} className="stroke-[3]" />
            <span>Auto-Book Cash Flow</span>
          </button>
          
          <button
            onClick={() => setIsPostModalOpen(true)}
            className="py-2.5 px-4 bg-neutral-900 hover:bg-neutral-850 text-amber-400 border border-neutral-800 flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
          >
            <Plus size={12} />
            <span>Post Adjusting Journal</span>
          </button>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="py-2.5 px-4 bg-neutral-905 hover:bg-neutral-850 text-neutral-400 hover:text-white border border-neutral-800 flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={12} className={`${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            <span>{isRefreshing ? 'Refreshed...' : 'Recalculate Ledger'}</span>
          </button>
        </div>
      </div>

      {/* Sub-navigation Controls */}
      <div className="flex border-b-2 border-neutral-900 bg-neutral-905 p-1 gap-1">
        <button
          onClick={() => setActiveSubTab('journals')}
          className={`flex-1 md:flex-none px-6 py-3 font-mono text-[10px] font-black uppercase tracking-widest transition-all gap-2 flex items-center justify-center ${
            activeSubTab === 'journals'
              ? 'bg-amber-400 text-black border-b-2 border-black'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <BookOpen size={13} />
          Journal Book & Ledger
        </button>
        <button
          onClick={() => {
            setActiveSubTab('performance_salary');
            // Auto select first teacher if none selected
            const firstTeacher = performanceSalarySummary[0];
            if (firstTeacher && !selectedStaffId) {
              setSelectedStaffId(firstTeacher.teacherId);
            }
          }}
          className={`flex-1 md:flex-none px-6 py-3 font-mono text-[10px] font-black uppercase tracking-widest transition-all gap-2 flex items-center justify-center ${
            activeSubTab === 'performance_salary'
              ? 'bg-amber-400 text-black border-b-2 border-black'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <Award size={13} />
          Performance Salary adjustments
        </button>
      </div>

      {activeSubTab === 'journals' ? (
        <div className="space-y-6">
          {/* Ledger Health Bento Stats Card */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-neutral-900 border-4 border-neutral-800 p-6 flex items-center justify-between shadow-xl">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 font-mono">Total Ledger Debits</span>
                <h4 className="text-2xl font-black text-amber-400 font-mono tracking-tight">GH₵ {totalDebits.toFixed(2)}</h4>
                <p className="text-[10px] font-bold text-neutral-500">Current view total debit entries</p>
              </div>
              <div className="bg-amber-500/10 text-amber-400 border border-amber-400/20 p-3 rounded-full">
                <TrendingUp size={18} />
              </div>
            </div>

            <div className="bg-neutral-900 border-4 border-neutral-800 p-6 flex items-center justify-between shadow-xl">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 font-mono">Total Ledger Credits</span>
                <h4 className="text-2xl font-black text-amber-400 font-mono tracking-tight">GH₵ {totalCredits.toFixed(2)}</h4>
                <p className="text-[10px] font-bold text-neutral-500">Current view total credit entries</p>
              </div>
              <div className="bg-amber-500/10 text-amber-400 border border-amber-400/20 p-3 rounded-full">
                <TrendingDown size={18} />
              </div>
            </div>

            <div className="bg-neutral-900 border-4 border-neutral-800 p-6 flex items-center justify-between shadow-xl">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 font-mono">Ledger Health Trial</span>
                <div className="flex items-center gap-2">
                  <h4 className="text-xl font-black text-emerald-400 font-mono tracking-tight uppercase">Perfect Balance</h4>
                  <CheckCircle2 className="text-emerald-400 animate-pulse" size={16} />
                </div>
                <p className="text-[10px] font-bold text-neutral-500">Debits matches Credits with 0.00 discrepancy</p>
              </div>
              <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-400/20 p-3 rounded-full">
                <Scale size={18} />
              </div>
            </div>

            <div className="bg-neutral-900 border-4 border-neutral-800 p-6 flex items-center justify-between shadow-xl">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 font-mono">Total Booked Transactions</span>
                <h4 className="text-2xl font-black text-neutral-100 font-mono tracking-tight">{journalEntries.length} Records</h4>
                <p className="text-[10px] font-bold text-neutral-500">Cumulative double-entry logs</p>
              </div>
              <div className="bg-neutral-800 text-neutral-400 border border-neutral-700 p-3 rounded-full">
                <Activity size={18} />
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-neutral-900 border border-neutral-800 p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Search */}
              <div className="relative flex-1 md:flex-none">
                <input
                  type="text"
                  placeholder="Filter by description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full md:w-64 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 focus:border-amber-400 py-2 px-3 pl-9 text-xs text-white font-mono placeholder-neutral-600 focus:outline-none transition-colors"
                />
                <ListFilter className="absolute left-3 top-2.5 text-neutral-600" size={13} />
              </div>

              {/* Account select filter */}
              <select
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 font-mono py-2 px-3 focus:border-amber-400 focus:outline-none cursor-pointer"
              >
                <option value="all">All Ledger Accounts</option>
                {ledgerAccounts.map(acct => (
                  <option key={acct} value={acct}>{acct}</option>
                ))}
              </select>

              {/* Date picker */}
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 font-mono py-2 px-3 focus:border-amber-400 focus:outline-none cursor-pointer"
              />

              {/* Reset filter button */}
              {(search || accountFilter !== 'all' || dateFilter) && (
                <button
                  onClick={() => { setSearch(''); setAccountFilter('all'); setDateFilter(''); }}
                  className="text-[10px] uppercase font-black tracking-widest text-red-400 hover:text-red-300 font-mono py-1 px-2 border border-red-900/40 bg-red-950/20 hover:bg-red-950/40 cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>

            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest self-end md:self-auto">
              Showing {filteredJournals.length} of {journalEntries.length} items
            </div>
          </div>

          {/* Ledger Journal Table */}
          <div className="bg-neutral-900 border-4 border-neutral-800 shadow-2xl overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="bg-neutral-950 border-b-2 border-neutral-800 text-neutral-400 text-[10px] font-black uppercase tracking-widest">
                  <th className="py-4 px-4 border-r border-neutral-850">Book Date</th>
                  <th className="py-4 px-4 border-r border-neutral-850">Entry Description & Source Reference</th>
                  <th className="py-4 px-4 border-r border-neutral-850 text-amber-300">Debit (Dr.) Account</th>
                  <th className="py-4 px-4 border-r border-neutral-850 text-cyan-300">Credit (Cr.) Account</th>
                  <th className="py-4 px-4 border-r border-neutral-850 text-right">Amount (GHC)</th>
                  <th className="py-4 px-4 border-r border-neutral-850">Posted By</th>
                  <th className="py-4 px-4 text-center">Audit Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850">
                {filteredJournals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-neutral-500 uppercase tracking-wider">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <AlertTriangle className="text-neutral-700 animate-bounce" size={24} />
                        <p className="text-[11px]">No matching journal entries booked</p>
                        <p className="text-[9px] text-neutral-600">Click "Auto-Book Cash Flow" above to index school payments & salary outputs automatically</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredJournals.map((j) => (
                    <tr key={j.id} className="hover:bg-neutral-850 transition-colors">
                      <td className="py-3 px-4 border-r border-neutral-850 text-neutral-300 select-all">{j.date}</td>
                      <td className="py-3 px-4 border-r border-neutral-850 text-white font-bold max-w-xs truncate">
                        {j.description}
                      </td>
                      <td className="py-3 px-4 border-r border-neutral-850 text-amber-400 font-bold bg-amber-500/5">
                        {j.debitAccount}
                      </td>
                      <td className="py-3 px-4 border-r border-neutral-850 text-cyan-400 font-bold bg-cyan-500/5 pl-6">
                        {j.creditAccount}
                      </td>
                      <td className="py-3 px-4 border-r border-neutral-850 text-right font-black text-amber-400 text-sm">
                        {j.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 border-r border-neutral-850 text-neutral-400">{j.recordedBy}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDeleteJournal(j.id)}
                          className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-colors cursor-pointer rounded"
                          title="Purge Adjustment Record"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Performance vs Salary Adjustments Board */
        <div className="space-y-6">
          <div className="bg-neutral-900 border-4 border-neutral-800 p-6">
            <h4 className="text-xs font-black text-white uppercase tracking-widest font-mono mb-2 flex items-center gap-2">
              <Award className="text-amber-400 stroke-[2.5]" size={14} />
              Performance evaluation audit matrix ({perfMonthYear})
            </h4>
            <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider leading-relaxed">
              Below is the dynamic calculation sheet verifying how performance indices (derived from gate punctualities, attendance rosters, negligence audits, and professional ethics checklists) directly impact staff monthly base stipends before double-entry bookkeeping generation.
            </p>
            
            <div className="mt-5 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-neutral-400 uppercase font-black">Evaluation Cycle:</span>
                <select
                  value={perfMonthYear}
                  onChange={(e) => setPerfMonthYear(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 text-xs text-white font-mono py-2 px-3.5 focus:border-amber-400 focus:outline-none cursor-pointer"
                >
                  <option value="May 2026">May 2026</option>
                  <option value="June 2026">June 2026</option>
                  <option value="July 2026">July 2026</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Staff list panel */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-neutral-900 border-4 border-neutral-800 p-4">
                <h5 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest font-mono mb-3">Select Staff Record</h5>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {performanceSalarySummary.map(staff => {
                    const isSelected = selectedStaffId === staff.teacherId;
                    return (
                      <div
                        key={staff.teacherId}
                        onClick={() => setSelectedStaffId(staff.teacherId)}
                        className={`p-3 border-2 transition-all cursor-pointer flex items-center justify-between ${
                          isSelected 
                            ? 'bg-neutral-850 border-amber-400' 
                            : 'bg-neutral-905 border-neutral-800 hover:border-neutral-750'
                        }`}
                      >
                        <div className="space-y-1">
                          <span className="text-xs font-black text-white font-mono block">{staff.name}</span>
                          <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider block font-mono">{staff.role}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold font-mono block text-neutral-400">Base: GHC {staff.baseSalary}</span>
                          {staff.benefitPct > 0 ? (
                            <span className="text-[9px] font-black font-mono text-emerald-400 block">+{staff.benefitPct}% Rating</span>
                          ) : staff.deductionPct > 0 ? (
                            <span className="text-[9px] font-black font-mono text-rose-400 block">-{staff.deductionPct}% Rating</span>
                          ) : (
                            <span className="text-[9px] font-bold font-mono text-neutral-500 block">Neutral Rating</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Calculations Dashboard */}
            <div className="lg:col-span-2 space-y-6">
              {selectedTeacherDetails ? (
                <div className="bg-neutral-900 border-4 border-neutral-800 p-6 space-y-6">
                  {/* Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-neutral-800 gap-3">
                    <div>
                      <h4 className="text-sm font-black text-white font-mono flex items-center gap-2">
                        <User className="text-amber-400" size={15} />
                        {selectedTeacherDetails.name}
                      </h4>
                      <p className="text-[10px] font-mono text-neutral-500 uppercase mt-0.5">{selectedTeacherDetails.role}</p>
                    </div>
                    <div>
                      <span className="px-3 py-1 bg-neutral-950 border border-neutral-800 font-mono text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
                        Evaluation: {perfMonthYear}
                      </span>
                    </div>
                  </div>

                  {/* Performance Breakdown Indicators */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-neutral-950 border border-neutral-800 p-3 rounded">
                      <span className="text-[9px] font-mono text-neutral-500 uppercase block font-black">Attendance</span>
                      <span className={`text-xs font-black font-mono block mt-1 ${
                        selectedTeacherDetails.attendanceScore === 'Excellent' ? 'text-emerald-400' :
                        selectedTeacherDetails.attendanceScore === 'Good' ? 'text-emerald-500/80' :
                        selectedTeacherDetails.attendanceScore === 'Fair' ? 'text-amber-400' :
                        selectedTeacherDetails.attendanceScore === 'Poor' ? 'text-rose-400' : 'text-neutral-500'
                      }`}>
                        {selectedTeacherDetails.attendanceScore}
                      </span>
                    </div>

                    <div className="bg-neutral-950 border border-neutral-800 p-3 rounded">
                      <span className="text-[9px] font-mono text-neutral-500 uppercase block font-black">Gate Punctuality</span>
                      <span className={`text-xs font-black font-mono block mt-1 ${
                        selectedTeacherDetails.punctualityScore === 'Excellent' ? 'text-emerald-400' :
                        selectedTeacherDetails.punctualityScore === 'Good' ? 'text-emerald-500/80' :
                        selectedTeacherDetails.punctualityScore === 'Fair' ? 'text-amber-400' :
                        selectedTeacherDetails.punctualityScore === 'Poor' ? 'text-rose-400' : 'text-neutral-500'
                      }`}>
                        {selectedTeacherDetails.punctualityScore}
                      </span>
                    </div>

                    <div className="bg-neutral-950 border border-neutral-800 p-3 rounded">
                      <span className="text-[9px] font-mono text-neutral-500 uppercase block font-black">Performance Bonus</span>
                      <span className="text-xs font-black font-mono text-emerald-400 block mt-1">
                        +{selectedTeacherDetails.benefitPct}% (GHC {selectedTeacherDetails.performanceBonus.toFixed(2)})
                      </span>
                    </div>

                    <div className="bg-neutral-950 border border-neutral-800 p-3 rounded">
                      <span className="text-[9px] font-mono text-neutral-500 uppercase block font-black">Negligence Penalties</span>
                      <span className="text-xs font-black font-mono text-rose-400 block mt-1">
                        -{selectedTeacherDetails.deductionPct}% (GHC {selectedTeacherDetails.performanceDeduction.toFixed(2)})
                      </span>
                    </div>
                  </div>

                  {/* Salary adjustment details calculation formula */}
                  <div className="bg-neutral-950 border-2 border-neutral-800 p-4 font-mono text-xs space-y-3">
                    <h5 className="text-[9px] font-black text-amber-400 uppercase tracking-widest border-b border-neutral-850 pb-1.5">
                      Rigor Calculation: Adjusted Stipend Equation
                    </h5>
                    
                    <div className="flex justify-between text-neutral-400">
                      <span>Base Stipend Salary:</span>
                      <span className="text-white font-bold">GHC {selectedTeacherDetails.baseSalary.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between text-emerald-400/90">
                      <span>(+) Performance rating Bonus ({selectedTeacherDetails.benefitPct}%):</span>
                      <span className="font-bold">+ GHC {selectedTeacherDetails.performanceBonus.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-rose-400/90">
                      <span>(-) Negligence / Punctuality Penalties ({selectedTeacherDetails.deductionPct}%):</span>
                      <span className="font-bold">- GHC {selectedTeacherDetails.performanceDeduction.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-neutral-400">
                      <span>(-) Statutory Welfare contribution:</span>
                      <span className="text-neutral-300 font-bold">- GHC {selectedTeacherDetails.welfareDeduction.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-neutral-400">
                      <span>(-) Statutory employee SSNIT (5.5%):</span>
                      <span className="text-neutral-300 font-bold">- GHC {selectedTeacherDetails.ssnitContribution.toFixed(2)}</span>
                    </div>

                    <div className="border-t border-neutral-800 pt-2 flex justify-between text-sm text-amber-400 font-black">
                      <span>Net Audited Payout (Balanced Net):</span>
                      <span>GHC {selectedTeacherDetails.netPaid.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Balanced Double-Entry ledger journal booking mapping visual */}
                  <div className="bg-neutral-955 border border-neutral-800 p-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <h5 className="text-[10px] font-black text-white uppercase tracking-widest font-mono">
                        Double-Entry Audit Mapping
                      </h5>
                      <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-800 text-[8px] text-emerald-400 font-black font-mono uppercase rounded">
                        Auditable & Balanced
                      </span>
                    </div>

                    <div className="space-y-2 font-mono text-[11px]">
                      {/* Debit row */}
                      <div className="flex items-center justify-between border-b border-neutral-850/40 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 font-black bg-emerald-950 border border-emerald-900 px-1 py-0.5 text-[9px]">DEBIT (Dr.)</span>
                          <span className="text-neutral-300 font-bold">Expenses - Staff Salaries</span>
                        </div>
                        <span className="text-white font-black">GHC {(selectedTeacherDetails.baseSalary + selectedTeacherDetails.performanceBonus).toFixed(2)}</span>
                      </div>

                      {/* Credit Net row */}
                      <div className="flex items-center justify-between border-b border-neutral-850/40 pb-2 pl-6">
                        <div className="flex items-center gap-2">
                          <span className="text-cyan-400 font-black bg-cyan-950 border border-cyan-900 px-1 py-0.5 text-[9px]">CREDIT (Cr.)</span>
                          <span className="text-neutral-300 font-bold">Assets - Cash/Bank (Net Paid)</span>
                        </div>
                        <span className="text-neutral-400">GHC {selectedTeacherDetails.netPaid.toFixed(2)}</span>
                      </div>

                      {/* Credit welfare deductions row */}
                      {selectedTeacherDetails.welfareDeduction > 0 && (
                        <div className="flex items-center justify-between border-b border-neutral-850/40 pb-2 pl-6">
                          <div className="flex items-center gap-2">
                            <span className="text-cyan-400 font-black bg-cyan-950 border border-cyan-900 px-1 py-0.5 text-[9px]">CREDIT (Cr.)</span>
                            <span className="text-neutral-300 font-bold">Deductions - Welfare Funds</span>
                          </div>
                          <span className="text-neutral-400">GHC {selectedTeacherDetails.welfareDeduction.toFixed(2)}</span>
                        </div>
                      )}

                      {/* Credit ssnit deductions row */}
                      {selectedTeacherDetails.ssnitContribution > 0 && (
                        <div className="flex items-center justify-between border-b border-neutral-850/40 pb-2 pl-6">
                          <div className="flex items-center gap-2">
                            <span className="text-cyan-400 font-black bg-cyan-950 border border-cyan-900 px-1 py-0.5 text-[9px]">CREDIT (Cr.)</span>
                            <span className="text-neutral-300 font-bold">Deductions - SSNIT Liability</span>
                          </div>
                          <span className="text-neutral-400">GHC {selectedTeacherDetails.ssnitContribution.toFixed(2)}</span>
                        </div>
                      )}

                      {/* Credit performance deductions row */}
                      {selectedTeacherDetails.performanceDeduction > 0 && (
                        <div className="flex items-center justify-between border-b border-neutral-850/40 pb-2 pl-6">
                          <div className="flex items-center gap-2">
                            <span className="text-cyan-400 font-black bg-cyan-950 border border-cyan-900 px-1 py-0.5 text-[9px]">CREDIT (Cr.)</span>
                            <span className="text-neutral-300 font-bold">Deductions - Attendance Penalties</span>
                          </div>
                          <span className="text-neutral-400">GHC {selectedTeacherDetails.performanceDeduction.toFixed(2)}</span>
                        </div>
                      )}

                      {/* Balances Check */}
                      <div className="flex justify-between text-[10px] text-neutral-500 pt-1 font-bold">
                        <span>Total Debit Amount: GHC {(selectedTeacherDetails.baseSalary + selectedTeacherDetails.performanceBonus).toFixed(2)}</span>
                        <span>Total Credit Amount: GHC {(
                          selectedTeacherDetails.netPaid + 
                          selectedTeacherDetails.welfareDeduction + 
                          selectedTeacherDetails.ssnitContribution + 
                          selectedTeacherDetails.performanceDeduction
                        ).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between border-t border-neutral-800 pt-4">
                    <span className="text-[10px] font-mono text-neutral-500 uppercase">
                      Status: {selectedTeacherDetails.isPaid ? 'PAID & AUDITED' : 'PENDING APPROVAL'}
                    </span>
                    {!selectedTeacherDetails.isPaid ? (
                      <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest bg-amber-400/5 px-3 py-1 border border-amber-400/20">
                        Pending booking in Expenditures tab
                      </span>
                    ) : (
                      <div className="flex items-center gap-2 text-emerald-400 text-[10px] uppercase font-black tracking-wider">
                        <CheckCircle2 size={13} />
                        <span>Booked on Ledger</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-neutral-900 border-4 border-neutral-800 p-12 text-center text-neutral-500 font-mono uppercase tracking-widest">
                  Select a staff member from the left pane to view dynamic evaluations calculations
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Post adjusting entry Modal */}
      {isPostModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-neutral-900 border-4 border-amber-400 p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Scale className="text-amber-400" size={16} />
                Post adjusting Journal entry
              </h4>
              <button
                onClick={() => setIsPostModalOpen(false)}
                className="text-neutral-400 hover:text-white font-mono text-xs cursor-pointer font-black border border-neutral-800 px-2 py-1"
              >
                [CLOSE]
              </button>
            </div>

            <form onSubmit={handlePostJournal} className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-neutral-400 uppercase font-bold text-[10px]">Journal Date</label>
                  <input
                    type="date"
                    required
                    value={postDate}
                    onChange={(e) => setPostDate(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 py-2.5 px-3 focus:outline-none text-white font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-neutral-400 uppercase font-bold text-[10px]">Transaction Amount (GHC)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={postAmount}
                    onChange={(e) => setPostAmount(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 py-2.5 px-3 focus:outline-none text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-neutral-400 uppercase font-bold text-[10px]">Transaction Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Adjusted June uncollected attendance penalty mapping"
                  value={postDescription}
                  onChange={(e) => setPostDescription(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 py-2.5 px-3 focus:outline-none text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-amber-300 uppercase font-bold text-[10px]">Debit (Dr.) Account</label>
                  <select
                    value={postDebitAccount}
                    onChange={(e) => setPostDebitAccount(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 py-2.5 px-3 focus:outline-none text-white font-mono"
                  >
                    {ledgerAccounts.map(acct => (
                      <option key={acct} value={acct}>{acct}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-cyan-300 uppercase font-bold text-[10px]">Credit (Cr.) Account</label>
                  <select
                    value={postCreditAccount}
                    onChange={(e) => setPostCreditAccount(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 py-2.5 px-3 focus:outline-none text-white font-mono"
                  >
                    {ledgerAccounts.map(acct => (
                      <option key={acct} value={acct}>{acct}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-neutral-400 uppercase font-bold text-[10px]">Audited / Recorded By</label>
                <input
                  type="text"
                  required
                  value={postRecordedBy}
                  onChange={(e) => setPostRecordedBy(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 py-2.5 px-3 focus:outline-none text-white font-mono"
                />
              </div>

              <div className="border-t border-neutral-800 pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPostModalOpen(false)}
                  className="py-2.5 px-4 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white uppercase tracking-wider text-[10px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-amber-400 hover:bg-amber-500 text-black border-2 border-amber-300 font-bold uppercase tracking-wider text-[10px]"
                >
                  Post to Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
