import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { StudentClass, SchoolCategory, PaymentMethod, ExamsExpense } from '../types';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  GraduationCap, 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  Search, 
  Plus, 
  Trash2, 
  Settings, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  BookOpen, 
  Building2, 
  Users, 
  ArrowUpRight,
  ClipboardCheck,
  RefreshCw,
  X,
  Sliders,
  DollarSign,
  FileSpreadsheet,
  Calendar,
  History,
  Check,
  Eye
} from 'lucide-react';

export function ExamsDashboardTab() {
  const { 
    students = [], 
    currentUser, 
    activeTerm, 
    currentDate,
    examsPayments = [], 
    examsExpenses = [], 
    examsSettings, 
    addExamsPayment, 
    deleteExamsPayment, 
    addExamsExpense, 
    deleteExamsExpense, 
    updateExamsExpense,
    updateExamsSettings,
    playFeedbackSound
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'insights' | 'collection' | 'companies' | 'configuration'>('insights');
  
  // Local custom toast system
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };
  
  // States for fee collection
  const [selectedClass, setSelectedClass] = useState<StudentClass>('B1');
  const [searchQuery, setSearchQuery] = useState('');
  const [collectModalStudent, setCollectModalStudent] = useState<any | null>(null);
  const [collectAmount, setCollectAmount] = useState<string>('');
  const [collectMethod, setCollectMethod] = useState<PaymentMethod>('Cash');
  const [collectNotes, setCollectNotes] = useState('');
  const [collectDate, setCollectDate] = useState<string>('');

  // States for company invoice
  const [invoiceProvider, setInvoiceProvider] = useState('');
  const [invoiceClass, setInvoiceClass] = useState<StudentClass | 'All-Preschool' | 'All-Primary' | 'All-JHS' | 'Entire-School'>('Entire-School');
  const [invoiceBillingPerChild, setInvoiceBillingPerChild] = useState<string>('15');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [invoicePaymentOption, setInvoicePaymentOption] = useState<'paid' | 'unpaid'>('paid');
  const [expenseType, setExpenseType] = useState<'publisher' | 'other'>('publisher');
  const [otherExpenseAmount, setOtherExpenseAmount] = useState<string>('');

  // Receipt visual Modal
  const [receiptToPrint, setReceiptToPrint] = useState<any | null>(null);

  // Print class collection sheet state
  const [classToPrint, setClassToPrint] = useState<StudentClass | null>(null);

  // Expanded state for installment ledger details
  const [expandedInstallments, setExpandedInstallments] = useState<Record<string, boolean>>({});

  // Daily totals auditing states
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [selectedClassDetail, setSelectedClassDetail] = useState<{ date: string; class: StudentClass } | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'this-week'>('all');
  const [verifiedDates, setVerifiedDates] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('s_exams_verified_dates');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleVerifyDate = (date: string) => {
    setVerifiedDates(prev => {
      const updated = prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date];
      localStorage.setItem('s_exams_verified_dates', JSON.stringify(updated));
      return updated;
    });
    if (playFeedbackSound) {
      playFeedbackSound('success');
    }
  };

  // Classes listing
  const CLASSES_LIST: StudentClass[] = [
    'Nursery', 'KG1', 'KG2',
    'B1', 'B2', 'B3', 'B4', 'B5', 'B6',
    'B7', 'B8', 'B9'
  ];

  // Helper to resolve student category
  const getClassCategory = (cls: StudentClass): SchoolCategory => {
    if (['Nursery', 'KG1', 'KG2'].includes(cls)) return 'Pre-school';
    if (['B1', 'B2', 'B3', 'B4', 'B5', 'B6'].includes(cls)) return 'Primary';
    return 'JHS';
  };

  // Safe standard settings loader
  const safeSettings = useMemo(() => {
    const defaultEligible = [...CLASSES_LIST];
    const base = (examsSettings && examsSettings.classFees) ? examsSettings : {
      classFees: CLASSES_LIST.reduce((acc, cls) => {
        const cat = getClassCategory(cls);
        if (cat === 'Pre-school') acc[cls] = { feeCharged: 20, companyBilling: 12 };
        else if (cat === 'Primary') acc[cls] = { feeCharged: 30, companyBilling: 18 };
        else acc[cls] = { feeCharged: 45, companyBilling: 25 };
        return acc;
      }, {} as Record<StudentClass, { feeCharged: number; companyBilling: number }>),
      eligibleClasses: defaultEligible
    };
    return {
      classFees: base.classFees,
      eligibleClasses: base.eligibleClasses ?? defaultEligible
    };
  }, [examsSettings]);

  // Filter terms
  const currentTermId = activeTerm?.id || 'term_default';

  // Group exams fee payments by date and then by class for easy daily auditing
  const dailyClassTotals = useMemo(() => {
    const activeTermPayments = examsPayments.filter(p => {
      if (p.termId && p.termId !== currentTermId) return false;
      return true;
    });
    
    // Grouping structure: { "YYYY-MM-DD": { "B1": total_amount, "KG1": total_amount } }
    const dateMap: Record<string, Record<StudentClass, number>> = {};
    
    activeTermPayments.forEach(p => {
      const date = p.datePaid;
      const cls = p.class;
      const amt = p.amountPaid;
      
      if (!dateMap[date]) {
        dateMap[date] = {} as Record<StudentClass, number>;
      }
      if (!dateMap[date][cls]) {
        dateMap[date][cls] = 0;
      }
      dateMap[date][cls] += amt;
    });
    
    // Convert grouping to sorted list of daily records
    return Object.keys(dateMap).map(date => {
      const classTotals = dateMap[date];
      const totalCollected = Object.values(classTotals).reduce((sum, v) => sum + v, 0);
      return {
        date,
        classTotals,
        totalCollected
      };
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [examsPayments, currentTermId, safeSettings]);

  // Filtered daily class collections based on query and quick filters
  const filteredDailyClassTotals = useMemo(() => {
    let list = dailyClassTotals;

    // Apply date preset filter
    if (dateFilter === 'today') {
      list = list.filter(item => item.date === currentDate);
    } else if (dateFilter === 'yesterday') {
      const yesterdayStr = (() => {
        try {
          const d = new Date(currentDate);
          d.setDate(d.getDate() - 1);
          return d.toISOString().split('T')[0];
        } catch {
          return '';
        }
      })();
      list = list.filter(item => item.date === yesterdayStr);
    } else if (dateFilter === 'this-week') {
      const sevenDaysAgoStr = (() => {
        try {
          const d = new Date(currentDate);
          d.setDate(d.getDate() - 7);
          return d.toISOString().split('T')[0];
        } catch {
          return '';
        }
      })();
      list = list.filter(item => item.date >= sevenDaysAgoStr && item.date <= currentDate);
    }

    if (!auditSearchQuery.trim()) return list;
    const query = auditSearchQuery.toLowerCase();
    return list.filter(item => 
      item.date.includes(query) || 
      Object.keys(item.classTotals).some(cls => cls.toLowerCase().includes(query))
    );
  }, [dailyClassTotals, auditSearchQuery, dateFilter, currentDate]);

  // Modal payments breakdown for the clicked class & date
  const modalPayments = useMemo(() => {
    if (!selectedClassDetail) return [];
    return examsPayments.filter(p => 
      p.datePaid === selectedClassDetail.date && 
      p.class === selectedClassDetail.class &&
      (!p.termId || p.termId === currentTermId)
    );
  }, [examsPayments, selectedClassDetail, currentTermId]);

  // Active student list
  const activeStudents = useMemo(() => {
    return students.filter(s => s.active);
  }, [students]);

  // Dynamic adjusted company/publisher expenses based on class eligibility
  const adjustedExamsExpenses = useMemo(() => {
    return examsExpenses.map(expense => {
      const isOther = expense.studentCount === 0 || expense.notes?.includes('[Other Expense]');
      if (isOther) {
        return expense;
      }

      // Publisher expense: determine targeted classes
      let targetedClasses: StudentClass[] = [];
      if (expense.targetClass === 'Entire-School') {
        targetedClasses = CLASSES_LIST;
      } else if (expense.targetClass === 'All-Preschool') {
        targetedClasses = ['Nursery', 'KG1', 'KG2'];
      } else if (expense.targetClass === 'All-Primary') {
        targetedClasses = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'];
      } else if (expense.targetClass === 'All-JHS') {
        targetedClasses = ['B7', 'B8', 'B9'];
      } else {
        targetedClasses = [expense.targetClass as StudentClass];
      }

      // Filter only currently eligible classes
      const eligibleTargetClasses = targetedClasses.filter(cls => safeSettings.eligibleClasses?.includes(cls));

      // Count active students in these eligible classes
      const eligibleStudentCount = activeStudents.filter(s => eligibleTargetClasses.includes(s.class)).length;

      const adjustedTotal = expense.billingPerChild * eligibleStudentCount;
      const adjustedAmountPaid = expense.status === 'Paid' ? adjustedTotal : Math.min(expense.amountPaid, adjustedTotal);
      
      let adjustedStatus = expense.status;
      if (adjustedAmountPaid >= adjustedTotal) {
        adjustedStatus = 'Paid';
      } else if (adjustedAmountPaid > 0) {
        adjustedStatus = 'Partially Paid';
      } else {
        adjustedStatus = 'Unpaid';
      }

      return {
        ...expense,
        studentCount: eligibleStudentCount,
        totalAmount: adjustedTotal,
        amountPaid: adjustedAmountPaid,
        status: adjustedStatus
      };
    });
  }, [examsExpenses, safeSettings, activeStudents]);

  // Calculations
  const metrics = useMemo(() => {
    const activeTermPayments = examsPayments.filter(p => {
      if (p.termId && p.termId !== currentTermId) return false;
      return true;
    });
    
    let totalRevenueExpected = 0;
    let totalCompanyBillingExpected = 0;

    activeStudents.forEach(student => {
      const isEligible = safeSettings.eligibleClasses?.includes(student.class);
      if (!isEligible) return;
      const classFee = safeSettings.classFees[student.class]?.feeCharged || 0;
      const compCost = safeSettings.classFees[student.class]?.companyBilling || 0;
      totalRevenueExpected += classFee;
      totalCompanyBillingExpected += compCost;
    });

    const totalRevenueCollected = activeTermPayments.reduce((sum, p) => sum + p.amountPaid, 0);
    const totalCompanyBillingInvoiced = adjustedExamsExpenses.reduce((sum, e) => sum + e.totalAmount, 0);
    const totalCompanyBillingPaid = adjustedExamsExpenses.reduce((sum, e) => sum + e.amountPaid, 0);

    const netProfitCollected = totalRevenueCollected - totalCompanyBillingPaid;
    const netProfitProjected = totalRevenueExpected - totalCompanyBillingInvoiced;

    const totalPupilsPaidCount = new Set(activeTermPayments.map(p => p.studentId)).size;
    const eligibleStudents = activeStudents.filter(s => safeSettings.eligibleClasses?.includes(s.class));
    const totalPupilsUnpaidCount = Math.max(0, eligibleStudents.length - totalPupilsPaidCount);
    const collectionPercentage = eligibleStudents.length > 0 
      ? Math.round((totalPupilsPaidCount / eligibleStudents.length) * 100) 
      : 0;

    return {
      expectedRevenue: totalRevenueExpected,
      collectedRevenue: totalRevenueCollected,
      expectedCompanyBill: totalCompanyBillingExpected,
      actualCompanyBill: totalCompanyBillingInvoiced,
      companyBillPaid: totalCompanyBillingPaid,
      netProfit: netProfitCollected,
      projectedNetProfit: netProfitProjected,
      paidCount: totalPupilsPaidCount,
      unpaidCount: totalPupilsUnpaidCount,
      collectionRate: collectionPercentage
    };
  }, [activeStudents, examsPayments, adjustedExamsExpenses, safeSettings, currentTermId]);

  // Class level breakdown data
  const classBreakdowns = useMemo(() => {
    const activeTermPayments = examsPayments.filter(p => {
      if (p.termId !== currentTermId) return false;
      return safeSettings.eligibleClasses?.includes(p.class);
    });
    
    return CLASSES_LIST.map(cls => {
      const isEligible = safeSettings.eligibleClasses?.includes(cls);
      const clsStudents = activeStudents.filter(s => s.class === cls);
      const studentCount = clsStudents.length;
      
      const config = safeSettings.classFees[cls] || { feeCharged: 0, companyBilling: 0 };
      const feeCharged = isEligible ? config.feeCharged : 0;
      const companyBilling = isEligible ? config.companyBilling : 0;

      const expectedRevenue = studentCount * feeCharged;
      const expectedCompanyBill = studentCount * companyBilling;

      const clsPayments = activeTermPayments.filter(p => p.class === cls);
      const actualCollected = isEligible ? clsPayments.reduce((sum, p) => sum + p.amountPaid, 0) : 0;
      const paidPupilsCount = isEligible ? new Set(clsPayments.map(p => p.studentId)).size : 0;
      const unpaidPupilsCount = isEligible ? Math.max(0, studentCount - paidPupilsCount) : 0;

      const netMargin = isEligible ? (actualCollected - (studentCount * companyBilling)) : 0;

      return {
        class: cls,
        category: getClassCategory(cls),
        studentCount,
        feeCharged,
        companyBilling,
        expectedRevenue,
        expectedCompanyBill,
        actualCollected,
        paidCount: paidPupilsCount,
        unpaidCount: unpaidPupilsCount,
        netMargin,
        isEligible
      };
    });
  }, [activeStudents, examsPayments, safeSettings, currentTermId]);

  // Formatted data for Recharts
  const chartData = useMemo(() => {
    return classBreakdowns.map(cb => ({
      class: cb.class,
      Revenue: cb.actualCollected,
      Invoiced: cb.expectedCompanyBill
    }));
  }, [classBreakdowns]);

  // Filter students for Selected Class
  const classRosterFiltered = useMemo(() => {
    const list = activeStudents.filter(s => s.class === selectedClass);
    if (!searchQuery.trim()) return list;
    return list.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [activeStudents, selectedClass, searchQuery]);

  // Quick helper to check if a student has paid exams fee in current term
  const studentPaymentState = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    const studentClass = student?.class || 'B1' as StudentClass;
    const isEligible = safeSettings.eligibleClasses?.includes(studentClass);
    const activeTermPayments = examsPayments.filter(p => p.termId === currentTermId);
    const payments = activeTermPayments.filter(p => p.studentId === studentId);
    const totalPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0);
    const expectedFee = isEligible ? (safeSettings.classFees[studentClass]?.feeCharged || 0) : 0;
    
    let paidStatus: 'unpaid' | 'partial' | 'fully_paid' | 'exempt' = 'unpaid';
    if (!isEligible) {
      paidStatus = 'exempt';
    } else if (payments.length > 0) {
      if (totalPaid >= expectedFee) {
        paidStatus = 'fully_paid';
      } else {
        paidStatus = 'partial';
      }
    }

    return {
      paid: paidStatus === 'fully_paid' || paidStatus === 'exempt',
      isPartial: paidStatus === 'partial',
      isExempt: paidStatus === 'exempt',
      paidStatus,
      amount: totalPaid,
      records: payments,
      record: payments[0] || null
    };
  };

  // Open Collect Modal
  const handleOpenCollect = (student: any) => {
    const isEligible = safeSettings.eligibleClasses?.includes(student.class);
    const config = safeSettings.classFees[student.class] || { feeCharged: 0 };
    const payState = studentPaymentState(student.id);
    const expectedFee = isEligible ? config.feeCharged : 0;
    const remaining = Math.max(0, expectedFee - payState.amount);
    setCollectModalStudent(student);
    setCollectAmount(remaining.toString());
    setCollectMethod('Cash');
    setCollectNotes('');
    setCollectDate(currentDate || new Date().toISOString().split('T')[0]);
  };

  // Handle Collect Submit
  const handleCollectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectModalStudent) return;
    const amount = parseFloat(collectAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    try {
      await addExamsPayment(collectModalStudent.id, amount, collectMethod, collectNotes || undefined, collectDate || undefined);
      playFeedbackSound('success');
      setCollectModalStudent(null);
    } catch (err: any) {
      playFeedbackSound('error');
      alert(err.message || "Failed to collect exams fee.");
    }
  };

  // Calculate Student Counts for Invoice Targets
  const getTargetClassCount = (target: string) => {
    const eligibleStudents = activeStudents.filter(s => safeSettings.eligibleClasses?.includes(s.class));
    if (target === 'Entire-School') return eligibleStudents.length;
    if (target === 'All-Preschool') return eligibleStudents.filter(s => ['Nursery', 'KG1', 'KG2'].includes(s.class)).length;
    if (target === 'All-Primary') return eligibleStudents.filter(s => ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'].includes(s.class)).length;
    if (target === 'All-JHS') return eligibleStudents.filter(s => ['B7', 'B8', 'B9'].includes(s.class)).length;
    
    const isEligible = safeSettings.eligibleClasses?.includes(target as StudentClass);
    if (!isEligible) return 0;
    return eligibleStudents.filter(s => s.class === target).length;
  };

  // Handle Log Company Bill/Expense
  const handleLogInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceProvider.trim()) {
      alert(expenseType === 'publisher' ? "Please enter the Exams company name." : "Please enter the payee or description.");
      return;
    }

    let rate = 0;
    let childCount = 0;
    let totalAmount = 0;

    if (expenseType === 'publisher') {
      rate = parseFloat(invoiceBillingPerChild);
      if (isNaN(rate) || rate < 0) {
        alert("Please enter a valid billing rate.");
        return;
      }
      childCount = getTargetClassCount(invoiceClass);
      totalAmount = rate * childCount;
    } else {
      totalAmount = parseFloat(otherExpenseAmount);
      if (isNaN(totalAmount) || totalAmount < 0) {
        alert("Please enter a valid expense amount.");
        return;
      }
      rate = 0;
      childCount = 0;
    }

    const amountPaid = invoicePaymentOption === 'paid' ? totalAmount : 0;
    const status = invoicePaymentOption === 'paid' ? 'Paid' : 'Unpaid';

    try {
      await addExamsExpense(
        invoiceProvider.trim(),
        invoiceClass,
        rate,
        childCount,
        totalAmount,
        amountPaid,
        status,
        invoiceNotes ? (expenseType === 'other' ? `[Other Expense] ${invoiceNotes}` : invoiceNotes) : (expenseType === 'other' ? '[Other Expense]' : undefined),
        currentDate
      );
      playFeedbackSound('success');
      setInvoiceProvider('');
      setInvoiceClass('Entire-School');
      setInvoiceNotes('');
      setOtherExpenseAmount('');
      setInvoicePaymentOption('paid'); // Reset payment option too
    } catch (err: any) {
      playFeedbackSound('error');
      alert("Failed to record company invoice.");
    }
  };

  // Delete invoice
  const handleDeleteInvoice = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this company billing record?")) {
      await deleteExamsExpense(id);
      playFeedbackSound('success');
    }
  };

  // Confirm / Pay an unpaid or partially paid exams expense
  const handleConfirmExpensePayment = async (expense: ExamsExpense) => {
    if (window.confirm(`Are you sure you want to confirm payment of GHC ${expense.totalAmount.toFixed(2)} for ${expense.providerName}? This will mark it as PAID and affect the actual cash flow metrics.`)) {
      try {
        const updatedExpense: ExamsExpense = {
          ...expense,
          amountPaid: expense.totalAmount,
          status: 'Paid'
        };
        await updateExamsExpense(updatedExpense);
        playFeedbackSound('success');
      } catch (err) {
        playFeedbackSound('error');
        alert("Failed to confirm payment.");
      }
    }
  };

  // Delete payment
  const handleDeletePayment = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this payment record? This will revert the student to Unpaid status.")) {
      await deleteExamsPayment(id);
      playFeedbackSound('success');
    }
  };

  // Update Settings
  const handleUpdateConfig = async (cls: StudentClass, field: 'feeCharged' | 'companyBilling', val: string) => {
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) return;

    const currentFees = { ...safeSettings.classFees };
    currentFees[cls] = {
      ...currentFees[cls],
      [field]: num
    };

    await updateExamsSettings({ 
      classFees: currentFees, 
      eligibleClasses: safeSettings.eligibleClasses 
    });
  };

  // Toggle Eligibility
  const handleToggleEligibility = async (cls: StudentClass) => {
    const currentEligible = [...(safeSettings.eligibleClasses || [])];
    const index = currentEligible.indexOf(cls);
    
    if (index > -1) {
      currentEligible.splice(index, 1);
    } else {
      currentEligible.push(cls);
    }

    await updateExamsSettings({ 
      classFees: safeSettings.classFees, 
      eligibleClasses: currentEligible 
    });
    playFeedbackSound?.('success');
  };

  // Bulk toggling eligibility
  const handleBulkToggleCategory = async (category: SchoolCategory, eligible: boolean) => {
    const currentEligible = [...(safeSettings.eligibleClasses || [])];
    CLASSES_LIST.forEach(cls => {
      const cat = getClassCategory(cls);
      if (cat === category) {
        const idx = currentEligible.indexOf(cls);
        if (eligible && idx === -1) {
          currentEligible.push(cls);
        } else if (!eligible && idx > -1) {
          currentEligible.splice(idx, 1);
        }
      }
    });

    await updateExamsSettings({ 
      classFees: safeSettings.classFees, 
      eligibleClasses: currentEligible 
    });
    playFeedbackSound?.('success');
  };

  const activeTermName = activeTerm?.name || "No Active Term Set";

  // Pie chart stats
  const pieData = [
    { name: 'Paid Students', value: metrics.paidCount, color: '#10B981' },
    { name: 'Unpaid Students', value: metrics.unpaidCount, color: '#EF4444' }
  ];

  // Print Receipt Helper
  const triggerPrintReceipt = (payment: any) => {
    setReceiptToPrint(payment);
    setTimeout(() => {
      window.print();
    }, 400);
  };

  // Print Class Worksheet Helper
  const triggerPrintClassSheet = (cls: StudentClass) => {
    setClassToPrint(cls);
    setTimeout(() => {
      window.print();
    }, 400);
  };

  return (
    <>
      <div id="exams-dashboard-container" className={`flex-1 p-6 md:p-8 space-y-8 overflow-y-auto ${(classToPrint || receiptToPrint) ? 'print:hidden' : ''}`}>
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-amber-400 text-black rounded-lg">
              <GraduationCap size={24} className="animate-pulse" />
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase">Exams Fees & Invoices</h1>
              <p className="text-xs text-neutral-400 font-mono">End-of-Term Assessment Financial Ledger & Vendor Settlement</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 bg-neutral-900 border border-neutral-800 px-4 py-2.5 rounded-lg shadow-inner">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 font-mono block">Current Academic Cycle</span>
            <span className="text-xs font-black text-amber-400 uppercase">{activeTermName}</span>
          </div>
        </div>
      </div>

      {/* METRICS GRID SECTION */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Exam Fees Collected</span>
              <h3 className="text-2xl font-black mt-1 text-white">GHC {metrics.collectedRevenue.toFixed(2)}</h3>
            </div>
            <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <TrendingUp size={18} />
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-neutral-800/60 flex items-center justify-between">
            <span className="text-[10px] font-mono text-neutral-500">Target expected: GHC {metrics.expectedRevenue.toFixed(2)}</span>
            <span className="text-xs font-bold text-neutral-300">{(metrics.expectedRevenue > 0 ? (metrics.collectedRevenue / metrics.expectedRevenue * 100) : 0).toFixed(0)}%</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Vendor Cost Billed</span>
              <h3 className="text-2xl font-black mt-1 text-white">GHC {metrics.actualCompanyBill.toFixed(2)}</h3>
            </div>
            <span className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <Building2 size={18} />
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-neutral-800/60 flex items-center justify-between">
            <span className="text-[10px] font-mono text-neutral-500">Settled: GHC {metrics.companyBillPaid.toFixed(2)}</span>
            <span className="text-xs font-bold text-neutral-400">Rate cost per child</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Exam Profit Margin</span>
              <h3 className="text-2xl font-black mt-1 text-emerald-400">GHC {metrics.netProfit.toFixed(2)}</h3>
            </div>
            <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Coins size={18} />
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-neutral-800/60 flex items-center justify-between">
            <span className="text-[10px] font-mono text-neutral-500">Projected target: GHC {metrics.projectedNetProfit.toFixed(2)}</span>
            <span className="text-xs font-bold text-emerald-400">GHC</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">Collection Progress</span>
              <h3 className="text-2xl font-black mt-1 text-white">{metrics.collectionRate}% Paid</h3>
            </div>
            <span className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <ClipboardCheck size={18} />
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-neutral-800/60 flex items-center justify-between">
            <span className="text-[10px] font-mono text-neutral-500">Paid: {metrics.paidCount} | Unpaid: {metrics.unpaidCount}</span>
            <span className="text-xs font-bold text-neutral-300">Active roster: {activeStudents.length}</span>
          </div>
        </div>
      </div>

      {/* SUB-TAB NAVIGATION NAVIGATION */}
      <div className="flex border-b border-neutral-800">
        <button 
          onClick={() => setActiveSubTab('insights')}
          title="Insights & Financials: View exam fee collections vs printing costs, net balance, and payment statistics"
          className={`px-5 py-3 text-xs uppercase tracking-wider font-mono border-b-2 font-black transition ${activeSubTab === 'insights' ? 'border-amber-400 text-amber-400' : 'border-transparent text-neutral-400 hover:text-white'}`}
        >
          Insights & Financials
        </button>
        <button 
          onClick={() => setActiveSubTab('collection')}
          title="Pupil Fee Collection: Record individual exam payments, filter paid/unpaid status, and issue receipts"
          className={`px-5 py-3 text-xs uppercase tracking-wider font-mono border-b-2 font-black transition ${activeSubTab === 'collection' ? 'border-amber-400 text-amber-400' : 'border-transparent text-neutral-400 hover:text-white'}`}
        >
          Pupil Fee Collection
        </button>
        <button 
          onClick={() => setActiveSubTab('companies')}
          title="Company Invoices: Track exam printing vendor invoices, production bills, and corporate expenses"
          className={`px-5 py-3 text-xs uppercase tracking-wider font-mono border-b-2 font-black transition ${activeSubTab === 'companies' ? 'border-amber-400 text-amber-400' : 'border-transparent text-neutral-400 hover:text-white'}`}
        >
          Company Invoices ({adjustedExamsExpenses.length})
        </button>
        <button 
          onClick={() => setActiveSubTab('configuration')}
          title="Fee Configuration: Set exam fee amounts per pupil, term targets, and assessment guidelines"
          className={`px-5 py-3 text-xs uppercase tracking-wider font-mono border-b-2 font-black transition ${activeSubTab === 'configuration' ? 'border-amber-400 text-amber-400' : 'border-transparent text-neutral-400 hover:text-white'}`}
        >
          Fee Configuration
        </button>
      </div>

      {/* MAIN TABBED INTERACTIVE SECTIONS */}
      {activeSubTab === 'insights' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          {/* Chart column */}
          <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h2 className="text-sm font-black uppercase font-mono tracking-wider flex items-center gap-2">
                <TrendingUp size={16} className="text-amber-400" /> Exam Fees Collected vs. Company Billing per Class
              </h2>
              <span className="text-[10px] text-neutral-500 font-mono">GHC Currency</span>
            </div>
            
            <div className="h-80 w-full font-mono text-[10px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="class" stroke="#a3a3a3" />
                  <YAxis stroke="#a3a3a3" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', color: '#fff', fontSize: '11px', fontFamily: 'monospace' }} 
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="Revenue" fill="#10B981" name="Exams Fee Collected" />
                  <Bar dataKey="Invoiced" fill="#EF4444" name="Exams Company Bill" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Side quick metrics or Pie progress */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="border-b border-neutral-800 pb-3 mb-4">
                <h2 className="text-sm font-black uppercase font-mono tracking-wider">Fee Collection Ratio</h2>
                <p className="text-[10px] text-neutral-500">Percentage distribution of end-of-term payments</p>
              </div>

              {metrics.paidCount + metrics.unpaidCount > 0 ? (
                <div className="h-56 flex justify-center items-center font-mono">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col justify-center items-center">
                    <span className="text-3xl font-black text-white">{metrics.collectionRate}%</span>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-neutral-500 font-mono">Cleared</span>
                  </div>
                </div>
              ) : (
                <div className="h-56 flex items-center justify-center text-neutral-500 text-xs">
                  No registered active students.
                </div>
              )}
            </div>

            <div className="space-y-2 font-mono text-xs border-t border-neutral-800 pt-4 mt-2">
              <div className="flex justify-between items-center text-neutral-400">
                <span>Active Pupil Roster:</span>
                <span className="font-bold text-white">{activeStudents.length}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-400">
                <span>Total Cleared / Paid:</span>
                <span className="font-bold">{metrics.paidCount}</span>
              </div>
              <div className="flex justify-between items-center text-rose-400">
                <span>Outstanding Unpaid:</span>
                <span className="font-bold">{metrics.unpaidCount}</span>
              </div>
            </div>
          </div>

          {/* Classes detail breakdown ledger */}
          <div className="lg:col-span-3 bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="border-b border-neutral-800 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black uppercase font-mono tracking-wider flex items-center gap-2">
                  <FileSpreadsheet size={16} className="text-amber-400" /> Class Level Fee Ledger Summaries
                </h2>
                <p className="text-[10px] text-neutral-400">Calculated expected revenue vs. publisher billing and realized margins</p>
              </div>
            </div>

            {/* School-Wide Summary Cards (Expected, Paid, Balance) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-neutral-950/60 border border-neutral-850 p-4 rounded-xl">
              <div className="space-y-1">
                <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-black block">Total Exams Fee Expected</span>
                <div className="text-xl font-black text-white font-mono">
                  GHC {classBreakdowns.reduce((sum, cb) => sum + cb.expectedRevenue, 0).toFixed(2)}
                </div>
                <p className="text-[9px] text-neutral-500">Based on active cohort sizes & fee charge levels</p>
              </div>

              <div className="space-y-1 border-t sm:border-t-0 sm:border-x border-neutral-850 pt-2.5 sm:pt-0 sm:px-4">
                <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-black block font-bold">Total Exams Fee Paid</span>
                <div className="text-xl font-black text-emerald-400 font-mono">
                  GHC {classBreakdowns.reduce((sum, cb) => sum + cb.actualCollected, 0).toFixed(2)}
                </div>
                <p className="text-[9px] text-neutral-500">Realized collected payments to-date</p>
              </div>

              <div className="space-y-1 border-t sm:border-t-0 pt-2.5 sm:pt-0 pl-0 sm:pl-4">
                <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-black block font-bold">Total Outstanding Balance</span>
                <div className="text-xl font-black text-amber-500 font-mono">
                  GHC {classBreakdowns.reduce((sum, cb) => sum + (cb.expectedRevenue - cb.actualCollected), 0).toFixed(2)}
                </div>
                <p className="text-[9px] text-neutral-500">Unpaid end-of-term assessment balances</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400 bg-neutral-950/40">
                    <th className="py-2.5 px-3">Class</th>
                    <th className="py-2.5 px-3">Level</th>
                    <th className="py-2.5 px-3 text-center">Pupils Count</th>
                    <th className="py-2.5 px-3 text-right">Fee/Child</th>
                    <th className="py-2.5 px-3 text-right">Expected</th>
                    <th className="py-2.5 px-3 text-right">Paid</th>
                    <th className="py-2.5 px-3 text-right">Balance</th>
                    <th className="py-2.5 px-3 text-right">Cost/Child</th>
                    <th className="py-2.5 px-3 text-right">Company Bill</th>
                    <th className="py-2.5 px-3 text-right">Net Margin</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {classBreakdowns.map((cb) => {
                    const balance = cb.expectedRevenue - cb.actualCollected;
                    return (
                      <tr key={cb.class} className="hover:bg-neutral-800/20 transition">
                        <td className="py-2 px-3 font-bold text-white">{cb.class}</td>
                        <td className="py-2 px-3 text-neutral-500 text-[10px]">{cb.category}</td>
                        <td className="py-2 px-3 text-center text-neutral-300 font-bold">{cb.studentCount}</td>
                        <td className="py-2 px-3 text-right text-neutral-400">GHC {cb.feeCharged.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right text-neutral-300 font-bold">GHC {cb.expectedRevenue.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-400 font-mono">GHC {cb.actualCollected.toFixed(2)}</td>
                        <td className={`py-2 px-3 text-right font-black font-mono ${balance > 0 ? 'text-amber-500' : 'text-emerald-500/80'}`}>
                          GHC {balance.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right text-neutral-500">GHC {cb.companyBilling.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right text-neutral-500">GHC {cb.expectedCompanyBill.toFixed(2)}</td>
                        <td className={`py-2 px-3 text-right font-black ${cb.netMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          GHC {cb.netMargin.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button 
                            onClick={() => {
                              setSelectedClass(cb.class);
                              setActiveSubTab('collection');
                            }}
                            className="bg-neutral-800 hover:bg-neutral-700 text-[10px] font-bold text-amber-400 px-2.5 py-1 rounded cursor-pointer"
                          >
                            Roster
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-neutral-800 bg-neutral-950/60 font-bold text-white text-[11px]">
                    <td className="py-3 px-3" colSpan={2}>TOTALS</td>
                    <td className="py-3 px-3 text-center text-neutral-300">
                      {classBreakdowns.reduce((sum, cb) => sum + cb.studentCount, 0)}
                    </td>
                    <td className="py-3 px-3 text-right text-neutral-500">-</td>
                    <td className="py-3 px-3 text-right text-neutral-300 font-black">
                      GHC {classBreakdowns.reduce((sum, cb) => sum + cb.expectedRevenue, 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-emerald-400 font-mono">
                      GHC {classBreakdowns.reduce((sum, cb) => sum + cb.actualCollected, 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-amber-500 font-mono">
                      GHC {classBreakdowns.reduce((sum, cb) => sum + (cb.expectedRevenue - cb.actualCollected), 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right text-neutral-500">-</td>
                    <td className="py-3 px-3 text-right text-neutral-500">
                      GHC {classBreakdowns.reduce((sum, cb) => sum + cb.expectedCompanyBill, 0).toFixed(2)}
                    </td>
                    <td className={`py-3 px-3 text-right font-black ${classBreakdowns.reduce((sum, cb) => sum + cb.netMargin, 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      GHC {classBreakdowns.reduce((sum, cb) => sum + cb.netMargin, 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Daily Class-by-Class Collection Auditing Ledger */}
          <div className="lg:col-span-3 bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
            
            {/* Auditing Overview Summary stats bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-neutral-950 border border-neutral-850 p-4 rounded-xl">
              <div className="space-y-1">
                <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-black font-mono">Total Filtered Inflow</span>
                <div className="text-xl font-black text-emerald-400 font-mono">
                  GHC {filteredDailyClassTotals.reduce((sum, item) => sum + item.totalCollected, 0).toFixed(2)}
                </div>
                <p className="text-[9px] text-neutral-400">Sum of selected daily fee collections</p>
              </div>

              <div className="space-y-1 border-y sm:border-y-0 sm:border-x border-neutral-850 py-2 sm:py-0 sm:px-4">
                <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-black font-mono">Audit Verification Pace</span>
                <div className="text-xl font-black text-white font-mono flex items-center gap-1.5">
                  {filteredDailyClassTotals.filter(item => verifiedDates.includes(item.date)).length} <span className="text-neutral-500 text-sm">of</span> {filteredDailyClassTotals.length} <span className="text-[10px] text-emerald-400 font-bold font-mono">Days</span>
                </div>
                <div className="w-full bg-neutral-850 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-350"
                    style={{ width: `${filteredDailyClassTotals.length > 0 ? (filteredDailyClassTotals.filter(item => verifiedDates.includes(item.date)).length / filteredDailyClassTotals.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1 sm:pl-4">
                <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-black font-mono">Average Inflow Rate</span>
                <div className="text-xl font-black text-amber-400 font-mono">
                  GHC {(filteredDailyClassTotals.length > 0 ? (filteredDailyClassTotals.reduce((sum, item) => sum + item.totalCollected, 0) / filteredDailyClassTotals.length) : 0).toFixed(2)}
                </div>
                <p className="text-[9px] text-neutral-400">Average per school day recorded</p>
              </div>
            </div>

            <div className="border-b border-neutral-800 pb-3 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-black uppercase font-mono tracking-wider flex items-center gap-2 text-white">
                  <History size={16} className="text-amber-400" /> Daily Class Collection Auditing Ledger
                </h2>
                <p className="text-[10px] text-neutral-400">Click any class badge to inspect or delete individual transaction logs.</p>
              </div>

              {/* Filtering bar */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Preset filter tabs */}
                <div className="flex bg-neutral-950 border border-neutral-800 rounded-lg p-0.5">
                  {(['all', 'today', 'yesterday', 'this-week'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setDateFilter(filter)}
                      className={`px-3 py-1 text-[10px] uppercase font-mono font-black rounded-md transition-all ${dateFilter === filter ? 'bg-amber-400 text-black shadow' : 'text-neutral-400 hover:text-white hover:bg-neutral-900/40'}`}
                    >
                      {filter === 'this-week' ? 'Last 7 Days' : filter}
                    </button>
                  ))}
                </div>

                {/* Search query bar */}
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-3 top-2 text-neutral-500" size={12} />
                  <input
                    type="text"
                    placeholder="Search YYYY-MM-DD or class..."
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                    className="w-full bg-neutral-950 text-white border border-neutral-800 rounded-lg py-1 pl-7 pr-3 text-[10px] font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

            {filteredDailyClassTotals.length === 0 ? (
              <div className="h-40 flex flex-col justify-center items-center border-2 border-dashed border-neutral-800 rounded-xl text-neutral-500 p-4">
                <History size={28} className="mb-2 text-neutral-600 animate-pulse" />
                <p className="text-xs font-mono text-center font-bold">No exams fee daily collections match your parameters.</p>
                <p className="text-[10px] text-neutral-600 text-center">Adjust filter presets or clear search filter queries.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400 bg-neutral-950/40 text-[10px] uppercase tracking-wider">
                      <th className="py-2.5 px-3 w-1/12 text-center">Audit</th>
                      <th className="py-2.5 px-3 w-2/12">Collection Date</th>
                      <th className="py-2.5 px-3 w-7/12">Daily Totals per Class (Click Badge to Inspect)</th>
                      <th className="py-2.5 px-3 text-right w-2/12">Grand Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {filteredDailyClassTotals.map((item) => {
                      const isVerified = verifiedDates.includes(item.date);
                      return (
                        <tr 
                          key={item.date} 
                          className={`hover:bg-neutral-800/20 transition-all duration-150 ${isVerified ? 'bg-emerald-950/10 border-l-4 border-emerald-500' : ''}`}
                        >
                          {/* Verify Audit Action */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleVerifyDate(item.date)}
                              className={`p-1.5 rounded transition-all cursor-pointer ${isVerified ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-500 hover:text-white'}`}
                              title={isVerified ? "Audited & Verified. Click to cancel audit." : "Mark as audited & verified"}
                            >
                              <Check size={12} className={isVerified ? "stroke-[3px]" : "stroke-[2px]"} />
                            </button>
                          </td>

                          {/* Date column */}
                          <td className="py-3 px-3 font-bold text-white">
                            <div className="flex items-center gap-1.5">
                              <Calendar size={13} className="text-neutral-500" />
                              <span>{item.date}</span>
                              {isVerified && (
                                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                                  Verified
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Class Totals column */}
                          <td className="py-3 px-3">
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(item.classTotals).map(([cls, amount]) => (
                                <button
                                  key={cls}
                                  type="button"
                                  onClick={() => setSelectedClassDetail({ date: item.date, class: cls as StudentClass })}
                                  className="bg-neutral-950 border border-neutral-850 hover:border-amber-400/50 hover:bg-neutral-900 px-2.5 py-1 rounded text-[10px] font-bold text-neutral-300 flex items-center gap-1.5 shadow-sm transition group"
                                  title={`Click to inspect pupil breakdowns for ${cls}`}
                                >
                                  <span className="text-amber-400 uppercase font-mono font-black group-hover:text-amber-300">{cls}</span>
                                  <span className="text-neutral-700 font-normal">|</span>
                                  <span className="text-white font-mono">GHC {(amount as number).toFixed(2)}</span>
                                  <Eye size={10} className="text-neutral-500 group-hover:text-amber-400 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                              ))}
                            </div>
                          </td>

                          {/* Grand Total column */}
                          <td className="py-3 px-3 text-right font-black text-emerald-400 text-sm">
                            GHC {item.totalCollected.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'collection' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fadeIn">
          {/* left: class selection list & search */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="border-b border-neutral-800 pb-3">
              <h2 className="text-sm font-black uppercase font-mono tracking-wider">Class Selection</h2>
              <p className="text-[10px] text-neutral-400">Filter pupil records by grade</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {CLASSES_LIST.map((cls) => (
                <button
                  key={cls}
                  onClick={() => setSelectedClass(cls)}
                  className={`py-2.5 text-xs font-mono font-black border uppercase transition rounded-lg ${selectedClass === cls ? 'bg-amber-400 border-amber-400 text-black shadow-lg' : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white'}`}
                >
                  {cls}
                </button>
              ))}
            </div>

            <div className="pt-2">
              <label className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block mb-1">Search Pupil Name</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-neutral-500" size={16} />
                <input
                  type="text"
                  placeholder="Type name to filter..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-950 text-white border border-neutral-800 rounded-lg py-2 pl-9 pr-4 text-xs font-mono focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* right: class roster & collection actions */}
          <div className="xl:col-span-2 bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="border-b border-neutral-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black uppercase font-mono tracking-wider flex items-center gap-2">
                  <Users size={16} className="text-amber-400" /> Pupil Roster: Class {selectedClass}
                </h2>
                <p className="text-[10px] text-neutral-400">Enrolled active pupils and exams fee status</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  id="btn-print-collection-sheet"
                  onClick={() => triggerPrintClassSheet(selectedClass)}
                  className="bg-amber-400 hover:bg-amber-500 text-black text-[11px] font-mono font-black uppercase px-3 py-1.5 rounded transition flex items-center gap-1.5 shadow-md"
                  title="Generate print-ready hardcopy collection sheet for class teacher"
                >
                  <Printer size={13} />
                  <span>Teacher Hardcopy Sheet</span>
                </button>
                <span className="text-[10px] font-mono px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 text-neutral-400 rounded font-bold">
                  Count: {classRosterFiltered.length}
                </span>
              </div>
            </div>

            {classRosterFiltered.length === 0 ? (
              <div className="h-60 flex flex-col justify-center items-center border-2 border-dashed border-neutral-800 rounded-xl text-neutral-500 p-4">
                <Users size={32} className="mb-2 text-neutral-600" />
                <p className="text-xs font-mono text-center">No active pupils found matching current filters in Class {selectedClass}.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400 bg-neutral-950/40">
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3 text-center">Gender</th>
                      <th className="py-2.5 px-3 text-right">Fee Expected</th>
                      <th className="py-2.5 px-3 text-center">Payment Status</th>
                      <th className="py-2.5 px-3 text-right">Amount Paid</th>
                      <th className="py-2.5 px-3 text-right">Balance Due</th>
                      <th className="py-2.5 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {classRosterFiltered.map((student) => {
                      const payState = studentPaymentState(student.id);
                      const isEligible = safeSettings.eligibleClasses?.includes(student.class);
                      const expectedFee = isEligible ? (safeSettings.classFees[student.class]?.feeCharged || 0) : 0;
                      const balanceDue = Math.max(0, expectedFee - payState.amount);
                      const isExpanded = !!expandedInstallments[student.id];

                      return (
                        <React.Fragment key={student.id}>
                          <tr className="hover:bg-neutral-800/20 transition">
                            <td className="py-2 px-3 font-bold text-white">
                              <div>
                                <span>{student.name}</span>
                                {payState.records.length > 0 && (
                                  <div className="mt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => setExpandedInstallments(prev => ({ ...prev, [student.id]: !prev[student.id] }))}
                                      className="text-[8px] uppercase tracking-wider font-extrabold text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20"
                                    >
                                      {isExpanded ? 'Hide' : 'View'} Installments ({payState.records.length})
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-center text-neutral-500 text-[10px]">{student.gender || 'Male'}</td>
                            <td className="py-2 px-3 text-right text-neutral-400">GHC {expectedFee.toFixed(2)}</td>
                            <td className="py-2 px-3 text-center">
                              {payState.isExempt ? (
                                <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-neutral-950 text-neutral-500 border border-neutral-800/40">
                                  Exempt
                                </span>
                              ) : payState.paid ? (
                                <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-900/30">
                                  <CheckCircle2 size={10} /> Paid / Cleared
                                </span>
                              ) : payState.isPartial ? (
                                <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-900/30">
                                  <AlertCircle size={10} /> Part Paid
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-900/30">
                                  <AlertCircle size={10} /> Unpaid
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-neutral-200">
                              GHC {payState.amount.toFixed(2)}
                            </td>
                            <td className={`py-2 px-3 text-right font-bold ${balanceDue > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                              GHC {balanceDue.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-center flex items-center justify-center gap-1.5">
                              {!payState.paid && !payState.isExempt && (
                                <button
                                  onClick={() => handleOpenCollect(student)}
                                  className="bg-emerald-500 hover:bg-emerald-600 text-black text-[10px] font-bold px-2 py-1 rounded transition flex items-center gap-1"
                                >
                                  <Coins size={12} /> {payState.isPartial ? 'Pay Balance' : 'Collect Fee'}
                                </button>
                              )}
                              {payState.amount > 0 && (
                                <>
                                  <button
                                    onClick={() => setExpandedInstallments(prev => ({ ...prev, [student.id]: !prev[student.id] }))}
                                    className={`text-[10px] font-bold px-2 py-1 rounded transition flex items-center gap-1 border ${
                                      isExpanded 
                                        ? 'bg-amber-400 text-black border-amber-500' 
                                        : 'bg-neutral-800 hover:bg-neutral-700 text-amber-400 border-neutral-700'
                                    }`}
                                    title="View detailed installment ledger"
                                  >
                                    Ledger ({payState.records.length})
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>

                          {/* EXPANDABLE LEDGER VIEW FOR INDIVIDUAL PUPIL INSTALLMENTS */}
                          {isExpanded && payState.records.length > 0 && (
                            <tr className="bg-neutral-950/40">
                              <td colSpan={7} className="p-3">
                                <div className="border border-neutral-800/80 rounded-xl p-3 bg-neutral-950/60 space-y-2.5 text-left">
                                  <div className="flex items-center justify-between border-b border-neutral-800/60 pb-1.5">
                                    <span className="text-[10px] uppercase font-black text-amber-400 tracking-wider flex items-center gap-1.5">
                                      <Coins size={12} /> Detailed Assessment Installments Ledger
                                    </span>
                                    <span className="text-[9px] text-neutral-500">
                                      Cumulative Total Paid: <strong className="text-emerald-400 font-bold">GHC {payState.amount.toFixed(2)}</strong> / GHC {expectedFee.toFixed(2)}
                                    </span>
                                  </div>

                                  <div className="space-y-1.5">
                                    {payState.records.map((p, idx) => (
                                      <div 
                                        key={p.id} 
                                        className="flex items-center justify-between text-[11px] font-mono bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800/40 rounded-lg p-2 transition"
                                      >
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                          <span className="text-neutral-500 font-black">#{idx + 1}</span>
                                          <span className="text-neutral-300 font-bold">{p.datePaid}</span>
                                          <span className="text-emerald-400 font-extrabold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                            GHC {p.amountPaid.toFixed(2)}
                                          </span>
                                          <span className="text-neutral-400 font-medium">({p.paymentMethod})</span>
                                          {p.notes && (
                                            <span className="text-neutral-500 italic text-[10px] max-w-xs truncate">
                                              "{p.notes}"
                                            </span>
                                          )}
                                          <span className="text-[9px] text-neutral-500 font-mono">by {p.collectedBy}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <button
                                            onClick={() => triggerPrintReceipt(p)}
                                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[9px] font-black px-2 py-1 rounded transition flex items-center gap-1 border border-neutral-700"
                                            title="Print official receipt for this specific installment"
                                          >
                                            <Printer size={10} /> Print Receipt
                                          </button>
                                          <button
                                            onClick={() => handleDeletePayment(p.id)}
                                            className="text-neutral-500 hover:text-rose-400 p-1.5 hover:bg-rose-500/10 rounded transition"
                                            title="Delete this specific payment installment"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'companies' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          {/* left: company billing input */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="border-b border-neutral-800 pb-3">
              <h2 className="text-sm font-black uppercase font-mono tracking-wider flex items-center gap-2">
                <Plus size={16} className="text-amber-400" /> Log Exams Expense
              </h2>
              <p className="text-[10px] text-neutral-400">Record external assessment bills and general exams overheads</p>
            </div>

            {/* Expense Type Switcher */}
            <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-800 gap-1">
              <button
                type="button"
                onClick={() => setExpenseType('publisher')}
                className={`flex-1 text-center py-1.5 px-2 rounded-md font-bold text-[10px] uppercase tracking-wider transition ${
                  expenseType === 'publisher'
                    ? 'bg-amber-400 text-black font-black'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                Publisher Bill
              </button>
              <button
                type="button"
                onClick={() => setExpenseType('other')}
                className={`flex-1 text-center py-1.5 px-2 rounded-md font-bold text-[10px] uppercase tracking-wider transition ${
                  expenseType === 'other'
                    ? 'bg-amber-400 text-black font-black'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                Other Expense
              </button>
            </div>

            <form onSubmit={handleLogInvoiceSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                  {expenseType === 'publisher' ? 'Assessment Publisher Name' : 'Expense / Payee Name'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={expenseType === 'publisher' ? 'e.g. Oxford Ghana, Standard Exam Co' : 'e.g. Invigilator allowances, Answer Sheets'}
                  value={invoiceProvider}
                  onChange={(e) => setInvoiceProvider(e.target.value)}
                  className="w-full bg-neutral-950 text-white border border-neutral-800 rounded-lg py-2 px-3 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                  {expenseType === 'publisher' ? 'Target Class Selection' : 'Associated Scope'}
                </label>
                <select
                  value={invoiceClass}
                  onChange={(e: any) => setInvoiceClass(e.target.value)}
                  className="w-full bg-neutral-950 text-white border border-neutral-800 rounded-lg py-2 px-3 focus:outline-none focus:border-amber-400"
                >
                  <option value="Entire-School">Entire School ({getTargetClassCount('Entire-School')} pupils)</option>
                  <option value="All-Preschool">All Pre-school ({getTargetClassCount('All-Preschool')} pupils)</option>
                  <option value="All-Primary">All Primary ({getTargetClassCount('All-Primary')} pupils)</option>
                  <option value="All-JHS">All JHS ({getTargetClassCount('All-JHS')} pupils)</option>
                  {CLASSES_LIST.map(cls => (
                    <option key={cls} value={cls}>{cls} ({getTargetClassCount(cls)} pupils)</option>
                  ))}
                </select>
              </div>

              {expenseType === 'publisher' ? (
                <>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">Billing Cost Per Child (GHC)</label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={invoiceBillingPerChild}
                      onChange={(e) => setInvoiceBillingPerChild(e.target.value)}
                      className="w-full bg-neutral-950 text-white border border-neutral-800 rounded-lg py-2 px-3 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="bg-neutral-950/80 border border-neutral-800 p-3.5 rounded-lg text-center">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-widest block">Auto-Estimated Bill Amount</span>
                    <span className="text-2xl font-black text-amber-400 block mt-1">
                      GHC {(parseFloat(invoiceBillingPerChild || '0') * getTargetClassCount(invoiceClass)).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-neutral-400 block mt-0.5">Based on {getTargetClassCount(invoiceClass)} registered active pupils</span>
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">Expense Cost Amount (GHC)</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    placeholder="Enter fixed amount in GHC"
                    value={otherExpenseAmount}
                    onChange={(e) => setOtherExpenseAmount(e.target.value)}
                    className="w-full bg-neutral-950 text-white border border-neutral-800 rounded-lg py-2 px-3 focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                  Payment Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInvoicePaymentOption('paid')}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition ${
                      invoicePaymentOption === 'paid'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-wider">Confirm Payment</span>
                    <span className="text-[8px] opacity-75 mt-0.5">Paid Now / Affects Cash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoicePaymentOption('unpaid')}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition ${
                      invoicePaymentOption === 'unpaid'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                        : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-wider">Expected Cost Only</span>
                    <span className="text-[8px] opacity-75 mt-0.5">Pay Later / No Cash Out</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">Notes / Description</label>
                <textarea
                  placeholder={expenseType === 'publisher' ? "Log invoice description, printing specifications, terms..." : "Log purpose, proof details, reference number..."}
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  className="w-full bg-neutral-950 text-white border border-neutral-800 rounded-lg py-2 px-3 h-20 focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-amber-400 hover:bg-amber-500 text-black font-black uppercase py-2.5 rounded-lg transition tracking-wider flex items-center justify-center gap-1"
              >
                <Coins size={16} /> {expenseType === 'publisher' ? 'Record Publisher Expense' : 'Record Other Expense'}
              </button>
            </form>
          </div>

          {/* right: bills ledger list */}
          <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
            <div className="border-b border-neutral-800 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black uppercase font-mono tracking-wider">Company Invoices & Expenses Ledger</h2>
                <p className="text-[10px] text-neutral-400">Chronological history of assessments print ordering and overhead expenditures</p>
              </div>
              <span className="text-xs font-bold font-mono text-neutral-400">
                Total Expenses logged: GHC {adjustedExamsExpenses.reduce((sum, e) => sum + e.totalAmount, 0).toFixed(2)}
              </span>
            </div>

            {/* Income & Expenses Summary Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-neutral-950 p-4 rounded-xl border border-neutral-800">
              {/* Income */}
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Collected Income
                </span>
                <div className="text-lg font-black text-white">
                  GHC {metrics.collectedRevenue.toFixed(2)}
                </div>
                <div className="text-[9px] text-neutral-500 font-mono">
                  Target expected: GHC {metrics.expectedRevenue.toFixed(2)}
                </div>
              </div>

              {/* Expenses */}
              <div className="space-y-1 border-t md:border-t-0 md:border-l border-neutral-800 pt-3 md:pt-0 md:pl-4">
                <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Total Expenses
                </span>
                <div className="text-lg font-black text-white">
                  GHC {metrics.actualCompanyBill.toFixed(2)}
                </div>
                <div className="text-[9px] text-neutral-500 font-mono">
                  Settled: GHC {metrics.companyBillPaid.toFixed(2)}
                </div>
              </div>

              {/* Net Surplus */}
              <div className="space-y-1 border-t md:border-t-0 md:border-l border-neutral-800 pt-3 md:pt-0 md:pl-4">
                {metrics.collectedRevenue - metrics.actualCompanyBill >= 0 ? (
                  <span className="text-[9px] font-black uppercase text-cyan-400 tracking-wider flex items-center gap-1">
                    <TrendingUp size={10} className="text-cyan-400" />
                    Exams Net Surplus
                  </span>
                ) : (
                  <span className="text-[9px] font-black uppercase text-rose-400 tracking-wider flex items-center gap-1">
                    <TrendingDown size={10} className="text-rose-400" />
                    Exams Net Deficit
                  </span>
                )}
                <div className={`text-lg font-black ${
                  metrics.collectedRevenue - metrics.actualCompanyBill >= 0 ? 'text-cyan-400' : 'text-rose-400'
                }`}>
                  GHC {(metrics.collectedRevenue - metrics.actualCompanyBill).toFixed(2)}
                </div>
                <div className="text-[9px] text-neutral-500 font-mono">
                  Realised: GHC {metrics.netProfit.toFixed(2)} (Paid vs Settled)
                </div>
              </div>
            </div>

            {adjustedExamsExpenses.length === 0 ? (
              <div className="h-80 flex flex-col justify-center items-center border-2 border-dashed border-neutral-800 rounded-xl text-neutral-500 p-4">
                <Building2 size={40} className="mb-2 text-neutral-600" />
                <p className="text-xs font-mono text-center">No exams company billing or overhead records found in current ledger.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400 bg-neutral-950/40">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Item / Publisher</th>
                      <th className="py-2.5 px-3">Target Scope</th>
                      <th className="py-2.5 px-3 text-center">Pupil Count</th>
                      <th className="py-2.5 px-3 text-right">Cost/Child</th>
                      <th className="py-2.5 px-3 text-right">Total Bill</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {adjustedExamsExpenses.map((expense) => {
                      const isOther = expense.studentCount === 0 || expense.notes?.includes('[Other Expense]');
                      return (
                        <tr key={expense.id} className="hover:bg-neutral-800/20 transition">
                          <td className="py-2.5 px-3 text-neutral-400">{expense.date}</td>
                          <td className="py-2.5 px-3 font-bold text-white">
                            <span className="block">{expense.providerName}</span>
                            {isOther && (
                              <span className="inline-block text-[9px] font-black text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded mt-1 uppercase tracking-widest text-[8px] font-sans">
                                Other Expense
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-neutral-300 font-bold">{expense.targetClass}</td>
                          <td className="py-2.5 px-3 text-center text-neutral-400">{isOther ? '—' : expense.studentCount}</td>
                          <td className="py-2.5 px-3 text-right text-neutral-400">
                            {isOther ? '—' : `GHC ${expense.billingPerChild.toFixed(2)}`}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-amber-400">GHC {expense.totalAmount.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-center">
                            {expense.status === 'Paid' ? (
                              <span className="inline-flex text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-900/30">
                                {expense.status}
                              </span>
                            ) : (
                              <span className="inline-flex text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-900/30">
                                {expense.status}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {expense.status !== 'Paid' && (
                                <button
                                  onClick={() => handleConfirmExpensePayment(expense)}
                                  className="text-emerald-400 hover:text-emerald-300 p-1 bg-emerald-500/10 rounded transition"
                                  title="Confirm payment (Mark Paid)"
                                >
                                  <CheckCircle2 size={14} />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteInvoice(expense.id)}
                                className="text-neutral-500 hover:text-rose-400 p-1 transition"
                                title="Delete billing log"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'configuration' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-6 animate-fadeIn">
          <div className="border-b border-neutral-800 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black uppercase font-mono tracking-wider flex items-center gap-2">
                <Settings size={16} className="text-amber-400" /> Assessment Pricing and Cost Structure Configuration
              </h2>
              <p className="text-[10px] text-neutral-400">Define expected parent payments, company pricing models per child, and class-level eligibility</p>
            </div>
          </div>

          {/* ELIGIBILITY & BULK TOGGLES BOX */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-4 font-mono text-xs">
            <div className="flex items-start gap-2.5">
              <span className="p-1.5 bg-amber-400/10 text-amber-400 rounded mt-0.5">
                <ClipboardCheck size={16} />
              </span>
              <div>
                <h3 className="text-xs font-black uppercase text-white tracking-wider">Class Exams Eligibility</h3>
                <p className="text-[10px] text-neutral-400 leading-relaxed mt-0.5">
                  Excluding specific classes (e.g., Nursery or KG) exempts their pupils from assessment charges. This filters them out of unpaid counts, expected revenue targets, and billing statistics, resulting in a cleaner and easier final auditing process.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-800/40 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-neutral-400">Bulk Category Controls:</span>
              <div className="flex flex-wrap gap-2">
                {['Pre-school', 'Primary', 'JHS'].map((cat) => {
                  const categoryClasses = CLASSES_LIST.filter(cls => getClassCategory(cls) === cat);
                  const allEligible = categoryClasses.every(cls => safeSettings.eligibleClasses?.includes(cls));
                  
                  return (
                    <div key={cat} className="bg-neutral-900 border border-neutral-800 rounded p-1.5 flex items-center gap-2">
                      <span className="text-[9px] uppercase font-bold text-neutral-400 px-1">{cat}</span>
                      <button
                        type="button"
                        onClick={() => handleBulkToggleCategory(cat as SchoolCategory, !allEligible)}
                        className={`text-[9px] uppercase font-black tracking-wider px-2 py-1 rounded transition-colors ${
                          allEligible 
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-950 hover:bg-rose-500/20' 
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-950 hover:bg-emerald-500/20'
                        }`}
                      >
                        {allEligible ? 'Disable All' : 'Enable All'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-mono text-xs">
            {CLASSES_LIST.map((cls) => {
              const conf = safeSettings.classFees[cls] || { feeCharged: 0, companyBilling: 0 };
              const category = getClassCategory(cls);
              const isEligible = safeSettings.eligibleClasses?.includes(cls);

              return (
                <div key={cls} className={`border p-4 rounded-xl space-y-3 shadow-inner transition ${
                  isEligible 
                    ? 'bg-neutral-950 border-neutral-800 hover:border-neutral-700' 
                    : 'bg-neutral-950/40 border-neutral-900/60 opacity-60'
                }`}>
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-white text-sm">{cls}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-neutral-900 text-neutral-500">{category}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleEligibility(cls)}
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border transition-all ${
                        isEligible 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                      }`}
                    >
                      {isEligible ? 'Eligible' : 'Exempted'}
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">Exams Fee Charged to Parent (GHC)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        disabled={!isEligible}
                        value={isEligible ? conf.feeCharged : 0}
                        onChange={(e) => handleUpdateConfig(cls, 'feeCharged', e.target.value)}
                        className={`w-full bg-neutral-900 text-white border border-neutral-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-400 font-bold ${
                          !isEligible ? 'opacity-40 cursor-not-allowed bg-neutral-950' : ''
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-neutral-400 uppercase block mb-1">Company Cost per Child (GHC)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        disabled={!isEligible}
                        value={isEligible ? conf.companyBilling : 0}
                        onChange={(e) => handleUpdateConfig(cls, 'companyBilling', e.target.value)}
                        className={`w-full bg-neutral-900 text-white border border-neutral-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-400 font-bold text-neutral-300 ${
                          !isEligible ? 'opacity-40 cursor-not-allowed bg-neutral-950' : ''
                        }`}
                      />
                    </div>
                  </div>

                  <div className="text-[10px] text-neutral-500 text-right pt-1 border-t border-neutral-800 flex justify-between items-center">
                    <span>
                      {!isEligible && <span className="text-rose-400/80 font-bold">No Obligations</span>}
                    </span>
                    <span>
                      Net Markup: <span className="font-bold text-emerald-400">GHC {isEligible ? (conf.feeCharged - conf.companyBilling).toFixed(2) : '0.00'}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-neutral-950 border border-neutral-800/80 p-4 rounded-lg flex items-center gap-3.5">
            <span className="p-2 bg-amber-400/10 text-amber-400 rounded">
              <Sliders size={18} />
            </span>
            <div className="text-xs font-mono">
              <span className="font-bold text-white uppercase block">Configurations auto-saved</span>
              <span className="text-neutral-400 text-[10px]">Updates to standard rates apply instantly across child billing estimates and expected revenue calculations.</span>
            </div>
          </div>
        </div>
      )}

      {/* QUICK COLLECT FEE MODAL OVERLAY */}
      {collectModalStudent && (() => {
        const payState = studentPaymentState(collectModalStudent.id);
        const config = safeSettings.classFees[collectModalStudent.class] || { feeCharged: 0 };
        const remaining = Math.max(0, config.feeCharged - payState.amount);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative font-mono text-xs">
              <div className="border-b border-neutral-800 pb-3.5 mb-4">
                <h3 className="text-base font-black text-white uppercase">Collect Exams Fee</h3>
                <p className="text-[10px] text-neutral-400">Recording assessment payment for student</p>
              </div>

              <form onSubmit={handleCollectSubmit} className="space-y-4">
                <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/60">
                  <span className="text-[10px] text-neutral-500 uppercase block">Pupil Name & Class</span>
                  <span className="text-sm font-black text-white block mt-0.5">{collectModalStudent.name}</span>
                  <span className="text-[10px] text-amber-400 uppercase tracking-widest font-bold">Class {collectModalStudent.class} ({getClassCategory(collectModalStudent.class)})</span>
                </div>

                <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/60 space-y-2">
                  <span className="text-[10px] text-neutral-500 uppercase block font-black tracking-wider">Financial Status Summary</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-neutral-500 block">Total Expected:</span>
                      <span className="text-white font-bold font-mono">GHC {config.feeCharged.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Paid to Date:</span>
                      <span className="text-emerald-400 font-bold font-mono">GHC {payState.amount.toFixed(2)}</span>
                    </div>
                    <div className="col-span-2 border-t border-neutral-800/60 pt-1.5 mt-1 flex justify-between items-center">
                      <span className="text-neutral-400 font-bold uppercase text-[9px]">Remaining Balance:</span>
                      <span className="text-amber-500 font-black text-sm font-mono">GHC {remaining.toFixed(2)}</span>
                    </div>
                  </div>

                  {payState.records.length > 0 && (
                    <div className="border-t border-neutral-800/60 pt-2 mt-2">
                      <span className="text-[9px] text-neutral-400 uppercase font-bold block mb-1">Recorded Installments ({payState.records.length})</span>
                      <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                        {payState.records.map((p, idx) => (
                          <div key={p.id} className="flex justify-between items-center text-[9px] text-neutral-400 font-mono bg-neutral-900 px-2 py-1 rounded border border-neutral-800/40">
                            <span>Inst. #{idx + 1} ({p.datePaid})</span>
                            <span className="text-emerald-400 font-bold">GHC {p.amountPaid.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">Fee Amount Received (GHC)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={collectAmount}
                    onChange={(e) => setCollectAmount(e.target.value)}
                    className="w-full bg-neutral-950 text-white border border-neutral-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-amber-400 font-bold"
                  />
                  
                  {/* Quick Preset Buttons for Easy Installments Selection */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={() => setCollectAmount(remaining.toFixed(2))}
                      className="bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 text-[9px] font-bold px-2 py-1 rounded transition border border-amber-400/20"
                    >
                      Remaining Balance ({remaining.toFixed(2)})
                    </button>
                    {remaining > 5 && (
                      <button
                        type="button"
                        onClick={() => setCollectAmount("5.00")}
                        className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[9px] font-bold px-2 py-1 rounded transition"
                      >
                        GHC 5
                      </button>
                    )}
                    {remaining > 10 && (
                      <button
                        type="button"
                        onClick={() => setCollectAmount("10.00")}
                        className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[9px] font-bold px-2 py-1 rounded transition"
                      >
                        GHC 10
                      </button>
                    )}
                    {remaining > 15 && (
                      <button
                        type="button"
                        onClick={() => setCollectAmount("15.00")}
                        className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[9px] font-bold px-2 py-1 rounded transition"
                      >
                        GHC 15
                      </button>
                    )}
                    {remaining > 20 && (
                      <button
                        type="button"
                        onClick={() => setCollectAmount("20.00")}
                        className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[9px] font-bold px-2 py-1 rounded transition"
                      >
                        GHC 20
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">Payment Date / Record Date</label>
                  <input
                    type="date"
                    required
                    value={collectDate}
                    onChange={(e) => setCollectDate(e.target.value)}
                    className="w-full bg-neutral-950 text-white border border-neutral-800 rounded-lg py-2 px-3 focus:outline-none focus:border-amber-400 font-bold"
                  />
                  <span className="text-[9.5px] text-neutral-500 mt-1 block">
                    Defaults to today. Adjust this date to record past payments (e.g. 2026-07-09).
                  </span>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">Payment Method</label>
                  <select
                    value={collectMethod}
                    onChange={(e: any) => setCollectMethod(e.target.value)}
                    className="w-full bg-neutral-950 text-white border border-neutral-800 rounded-lg py-2 px-3 focus:outline-none focus:border-amber-400"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Mobile Money">Mobile Money</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">Collector Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. 1st installment, final balance, Momo ID..."
                    value={collectNotes}
                    onChange={(e) => setCollectNotes(e.target.value)}
                    className="w-full bg-neutral-950 text-white border border-neutral-800 rounded-lg py-2 px-3 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCollectModalStudent(null)}
                    className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white py-2.5 rounded-lg transition uppercase font-black tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black py-2.5 rounded-lg transition uppercase font-black tracking-wider"
                  >
                    Save Record
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>

      {/* PRINT-READY EXAM RECEIPT OVERLAY (HIDDEN IN STANDARD UI, VISIBLE ON WINDOW.PRINT) */}
      {receiptToPrint && (() => {
        const studentObj = students.find(s => s.id === receiptToPrint.studentId);
        const targetClass = studentObj?.class || receiptToPrint.class || 'B1';
        const expectedFee = safeSettings.classFees[targetClass]?.feeCharged || 0;
        const studentPayments = examsPayments.filter(p => p.termId === currentTermId && p.studentId === receiptToPrint.studentId);
        const totalPaid = studentPayments.reduce((sum, p) => sum + p.amountPaid, 0);
        const balanceDue = Math.max(0, expectedFee - totalPaid);

        return (
          <div className="hidden print:block fixed inset-0 z-50 bg-white text-black p-8 font-sans">
            <div className="border-4 border-double border-black p-6 space-y-6 max-w-xl mx-auto text-left">
              {/* Header */}
              <div className="text-center space-y-1">
                <h1 className="text-xl font-extrabold uppercase tracking-wide">Saako Holy Child Academy</h1>
                <p className="text-xs uppercase font-bold text-gray-700">Daily Attendance and Fee Ledger System</p>
                <p className="text-[10px] text-gray-500 italic">P. O. Box LS 15, Sawla Savannah Region • Sawla, Jelinkon street, Savannah Region, Ghana</p>
                <div className="border-b-2 border-black my-2"></div>
                <h2 className="text-sm font-black uppercase bg-gray-200 py-1 tracking-widest">Official Assessment Fee Receipt</h2>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-y-3 text-xs">
                <div>
                  <span className="font-bold text-gray-600 block text-[10px] uppercase">Receipt Reference</span>
                  <span className="font-mono font-bold text-gray-900">{receiptToPrint.id}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-gray-600 block text-[10px] uppercase">Date Issued</span>
                  <span className="font-mono font-bold text-gray-900">{receiptToPrint.datePaid}</span>
                </div>
                <div className="col-span-2 border-t border-gray-300 pt-2">
                  <span className="font-bold text-gray-600 block text-[10px] uppercase">Pupil Name</span>
                  <span className="text-sm font-extrabold text-black uppercase">{receiptToPrint.studentName}</span>
                </div>
                <div>
                  <span className="font-bold text-gray-600 block text-[10px] uppercase">Class Grade</span>
                  <span className="text-xs font-bold text-black">Class {receiptToPrint.class} ({receiptToPrint.category})</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-gray-600 block text-[10px] uppercase">Active Academic Cycle</span>
                  <span className="text-xs font-bold text-black uppercase">{activeTermName}</span>
                </div>
              </div>

              {/* Financial table */}
              <div className="border border-black rounded mt-4">
                <div className="grid grid-cols-3 bg-gray-100 font-bold text-[10px] uppercase p-2 border-b border-black">
                  <span>Description</span>
                  <span className="text-center">Method</span>
                  <span className="text-right">Amount Received</span>
                </div>
                <div className="grid grid-cols-3 text-xs p-2">
                  <span className="font-medium">End of Term Examination Fee</span>
                  <span className="text-center font-mono">{receiptToPrint.paymentMethod}</span>
                  <span className="text-right font-bold">GHC {receiptToPrint.amountPaid.toFixed(2)}</span>
                </div>
                
                {/* Installment breakdown detail lines */}
                <div className="border-t border-black bg-gray-50/50 p-2 space-y-1 text-[11px] font-medium text-gray-700">
                  <div className="flex justify-between">
                    <span>Total Class Fee Obligation:</span>
                    <span className="font-mono">GHC {expectedFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>This Installment Amount Paid:</span>
                    <span className="font-mono font-bold text-black">GHC {receiptToPrint.amountPaid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cumulative Amount Paid to Date:</span>
                    <span className="font-mono text-emerald-700">GHC {totalPaid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-300 pt-1 text-xs font-bold text-black">
                    <span>Remaining Balance Outstanding:</span>
                    <span className="font-mono text-rose-700">GHC {balanceDue.toFixed(2)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 border-t border-black bg-gray-200 font-black text-xs p-2">
                  <span className="col-span-2">Receipt Payment Applied</span>
                  <span className="text-right">GHC {receiptToPrint.amountPaid.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-[10px] text-gray-600 space-y-1">
                {receiptToPrint.notes && <p><span className="font-bold">Memo:</span> {receiptToPrint.notes}</p>}
                <p><span className="font-bold">Authorized Collector Signature:</span> {receiptToPrint.collectedBy}</p>
              </div>

              <div className="border-t border-dashed border-black pt-4 text-center text-[9px] text-gray-500 uppercase tracking-widest">
                Thank you for supporting Holy Child Academic Excellence!
              </div>
            </div>
            {/* Action to dismiss printer layout afterwards */}
            <button 
              onClick={() => setReceiptToPrint(null)}
              className="mt-6 bg-black hover:bg-neutral-800 text-white font-bold py-2 px-4 rounded text-xs mx-auto block print:hidden"
            >
              Return to Dashboard
            </button>
          </div>
        );
      })()}

      {/* PRINT-READY CLASS COLLECTION SHEET OVERLAY (PREVIEW ON SCREEN, CRISP HIGH-FIDELITY MULTI-PAGE ON PRINT) */}
      {classToPrint && (() => {
        const roster = activeStudents.filter(s => s.class === classToPrint);
        const expectedFee = safeSettings.classFees[classToPrint]?.feeCharged || 0;
        
        return (
          <div className="printable-sheet-parent fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto font-sans print:p-0 print:bg-white print:relative print:block print:z-auto print:overflow-visible">
            {/* Custom injected print style block to ensure flawless pagination across multiple pages */}
            <style>{`
              @media print {
                /* 1. Hide all non-printable layout elements completely to free up space */
                header, 
                aside, 
                nav, 
                footer, 
                #exams-dashboard-container,
                .no-print {
                  display: none !important;
                }

                /* 2. Reset layout of ALL ancestors & parents of the printable sheet to simple blocks */
                html, body, #root, #root > div, #root > div > div, main, .printable-sheet-parent {
                  display: block !important;
                  position: relative !important;
                  height: auto !important;
                  min-height: 0 !important;
                  overflow: visible !important;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  background: white !important;
                  color: black !important;
                  border: none !important;
                  box-shadow: none !important;
                  inset: auto !important; /* Clear inset-0 */
                }

                /* 3. Style the printable-sheet-wrapper itself to be standard full width with natural flow */
                .printable-sheet-wrapper {
                  display: block !important;
                  position: relative !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  height: auto !important;
                  overflow: visible !important;
                  margin: 0 !important;
                  padding: 10mm 15mm !important; /* Professional print margins */
                  border: none !important;
                  box-shadow: none !important;
                  background: white !important;
                  color: black !important;
                }

                /* 4. Flawless row pagination and table headers */
                tr {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
                }
                thead {
                  display: table-header-group !important;
                }
              }
            `}</style>

            <div className="my-8 bg-white text-black border-2 border-neutral-300 p-6 md:p-8 space-y-6 w-full max-w-4xl mx-auto shadow-2xl rounded-sm printable-sheet-wrapper print:my-0 print:p-0 print:border-none print:shadow-none">
              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-black pb-4">
                <div className="space-y-1">
                  <h1 className="text-xl font-extrabold uppercase tracking-tight text-gray-900">Saako Holy Child Academy</h1>
                  <p className="text-[11px] uppercase font-bold text-gray-600">End-of-Term Assessment Fee Collection Worksheet (Class Teacher Copy)</p>
                  <p className="text-[9px] text-gray-500 font-mono">Academic Term: {activeTermName}</p>
                </div>
                <div className="text-right font-mono text-[10px] space-y-1">
                  <div><strong>Class Grade:</strong> {classToPrint}</div>
                  <div><strong>Standard Fee:</strong> GHC {expectedFee.toFixed(2)}</div>
                  <div><strong>Date Generated:</strong> {currentDate}</div>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-gray-100 p-3 border border-gray-300 rounded text-[10px] leading-relaxed text-gray-800">
                <strong>Instructions for Class Teacher:</strong> Use this official paper sheet to track end-of-term examinations fee collection. 
                Payments can be accepted in <strong>instalments</strong>. Write down any newly collected amounts in the <strong>"Amount Collected (Now)"</strong> column, specify the date, and sign. Present the physical cash along with this sheet to the bursar/administration desk to issue system receipts.
              </div>

              {/* Table */}
              <table className="w-full text-left border-collapse border border-gray-400 text-[10px]">
                <thead>
                  <tr className="bg-gray-200 uppercase font-bold text-[9px] border-b border-gray-400">
                    <th className="border border-gray-400 py-1.5 px-2 text-center w-8">#</th>
                    <th className="border border-gray-400 py-1.5 px-2">Pupil Name</th>
                    <th className="border border-gray-400 py-1.5 px-2 text-center w-12">Gender</th>
                    <th className="border border-gray-400 py-1.5 px-2 text-right w-20">Fee Due</th>
                    <th className="border border-gray-400 py-1.5 px-2 text-right w-20">Paid Online</th>
                    <th className="border border-gray-400 py-1.5 px-2 text-right w-20">Balance Due</th>
                    <th className="border border-gray-400 py-1.5 px-2 text-center w-28">Amount Collected (Now)</th>
                    <th className="border border-gray-400 py-1.5 px-2 text-center w-36">Remarks / Signature</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="border border-gray-400 py-6 text-center text-gray-500 italic">
                        No active pupils registered in Class {classToPrint}.
                      </td>
                    </tr>
                  ) : (
                    roster.map((student, idx) => {
                      const payState = studentPaymentState(student.id);
                      const balance = Math.max(0, expectedFee - payState.amount);
                      
                      return (
                        <tr key={student.id} className="h-8 hover:bg-gray-50">
                          <td className="border border-gray-400 py-1 px-2 text-center font-mono text-[9px]">{idx + 1}</td>
                          <td className="border border-gray-400 py-1 px-2 font-bold uppercase text-[9px]">{student.name}</td>
                          <td className="border border-gray-400 py-1 px-2 text-center">{student.gender || 'M'}</td>
                          <td className="border border-gray-400 py-1 px-2 text-right font-mono">GHC {expectedFee.toFixed(2)}</td>
                          <td className="border border-gray-400 py-1 px-2 text-right font-mono text-gray-600">GHC {payState.amount.toFixed(2)}</td>
                          <td className="border border-gray-400 py-1 px-2 text-right font-mono font-bold text-gray-900">
                            {balance === 0 ? 'CLEARED' : `GHC ${balance.toFixed(2)}`}
                          </td>
                          <td className="border border-gray-400 py-1 px-2 bg-gray-50 text-center font-mono text-gray-400 text-[9px]">
                            GHC .....................
                          </td>
                          <td className="border border-gray-400 py-1 px-2 bg-gray-50 text-center text-gray-400 text-[9px]">
                            ...................................
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Signature section */}
              <div className="grid grid-cols-2 gap-8 pt-6 text-[10px]">
                <div className="space-y-3">
                  <p><strong>Class Teacher Acknowledgement:</strong></p>
                  <div className="border-b border-black w-48 h-4"></div>
                  <p className="text-[8px] text-gray-500 uppercase">Signature & Date</p>
                </div>
                <div className="space-y-3 text-right">
                  <p><strong>Bursar Receipt confirmation:</strong></p>
                  <div className="border-b border-black w-48 h-4 ml-auto"></div>
                  <p className="text-[8px] text-gray-500 uppercase">Signature & Stamp</p>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-400 pt-3 text-center text-[8px] text-gray-400 uppercase tracking-widest font-mono">
                Holy Child Academy Ledger &bull; System Generated Hardcopy Print &bull; Save as PDF option enabled
              </div>

              {/* Print action controls inside the modal - strictly hidden when printed */}
              <div className="mt-8 pt-4 border-t border-gray-250 flex flex-col sm:flex-row justify-center gap-4 print:hidden">
                <button 
                  type="button"
                  onClick={() => window.print()}
                  className="bg-amber-500 hover:bg-amber-600 text-black font-mono font-black uppercase py-2.5 px-6 rounded text-xs transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer border-none"
                >
                  <Printer size={14} />
                  <span>Send to Printer / Save as PDF</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setClassToPrint(null)}
                  className="bg-neutral-800 hover:bg-neutral-900 text-white font-mono font-black uppercase py-2.5 px-6 rounded text-xs transition cursor-pointer border-none"
                >
                  Close Print Desk
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Interactive Daily Audit Pupil Breakdown Modal */}
      {selectedClassDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-neutral-900 border border-neutral-800 max-w-2xl w-full rounded-2xl shadow-2xl overflow-hidden font-mono text-xs">
            {/* Header */}
            <div className="bg-neutral-950 border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[9px] text-amber-400 font-black tracking-widest uppercase">Granular Audit Journal</span>
                <h3 className="text-sm font-black text-white uppercase flex items-center gap-2">
                  <ClipboardCheck size={16} className="text-emerald-400" />
                  {selectedClassDetail.class} Payments on {selectedClassDetail.date}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedClassDetail(null)}
                className="text-neutral-500 hover:text-white transition p-1 hover:bg-neutral-800 rounded-lg cursor-pointer border-none bg-transparent"
              >
                <X size={18} />
              </button>
            </div>

            {/* List */}
            <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
              {modalPayments.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 space-y-2">
                  <AlertCircle size={32} className="mx-auto text-neutral-600 animate-pulse" />
                  <p className="font-bold">No registered pupil collections found.</p>
                  <p className="text-[10px]">Payments might have been deleted, or are recorded under a different class or date.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-5 text-neutral-500 border-b border-neutral-850 pb-2 text-[10px] font-black uppercase tracking-wider">
                    <span className="col-span-2">Pupil Name</span>
                    <span className="text-right">Amount Paid</span>
                    <span className="pl-4">Method</span>
                    <span className="text-right">Action</span>
                  </div>
                  
                  {modalPayments.map((p) => (
                    <div key={p.id} className="grid grid-cols-5 items-center py-2.5 border-b border-neutral-850/40 hover:bg-neutral-850/10 rounded px-1.5 transition">
                      {/* Name */}
                      <div className="col-span-2 font-bold text-white pr-2 truncate">
                        {p.studentName}
                      </div>
                      
                      {/* Amount */}
                      <div className="text-right font-black text-amber-400 pr-4">
                        GHC {p.amountPaid.toFixed(2)}
                      </div>

                      {/* Method */}
                      <div className="pl-4">
                        <span className="px-2 py-0.5 bg-neutral-950 border border-neutral-800 rounded text-[9px] font-bold text-neutral-400">
                          {p.paymentMethod}
                        </span>
                      </div>

                      {/* Action */}
                      <div className="text-right">
                        <button
                          onClick={async () => {
                            if (window.confirm(`Are you sure you want to delete this payment of GHC ${p.amountPaid.toFixed(2)} for ${p.studentName}?`)) {
                              await deleteExamsPayment(p.id);
                              showToast(`Deleted payment of GHC ${p.amountPaid.toFixed(2)} for ${p.studentName}.`);
                            }
                          }}
                          className="text-rose-400 hover:text-rose-500 transition p-1 hover:bg-rose-950/20 rounded cursor-pointer border-none bg-transparent"
                          title="Delete payment record"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Notes / Collector */}
                      {p.notes && (
                        <div className="col-span-5 text-[10px] text-neutral-500 mt-1 pl-1 italic">
                          Notes: {p.notes} (Collected by {p.collectedBy})
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Summary */}
            <div className="bg-neutral-950 border-t border-neutral-800 px-6 py-4 flex justify-between items-center text-[11px]">
              <span className="text-neutral-500">Total Transactions: {modalPayments.length}</span>
              <span className="text-white font-black">
                Sum: <span className="text-emerald-400 font-black text-sm">GHC {modalPayments.reduce((sum, p) => sum + p.amountPaid, 0).toFixed(2)}</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Floating custom toast alert container */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 border-2 border-emerald-500 text-white font-mono text-xs px-4 py-3 shadow-2xl rounded-xl flex items-center gap-2 max-w-sm animate-fadeIn">
          <span className="text-emerald-400 font-black">✔</span>
          <span className="font-bold">{toastMessage}</span>
        </div>
      )}
    </>
  );
}
