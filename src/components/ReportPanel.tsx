/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp, getStudentBaselineTermFee, isTermPayer } from '../context/AppContext';
import { StudentClass, SchoolCategory, PaymentRecord, ALL_CLASSES } from '../types';
import { 
  FileSpreadsheet, Mail, Search, Calendar, ChevronRight, ChevronDown, CheckCircle2, 
  HelpCircle, Settings, CheckSquare, PlusSquare, ArrowUpDown, X, Printer,
  UserCheck, CalendarRange, AlertTriangle, TrendingUp, UserMinus, Eye,
  ZoomIn, ZoomOut, FileText, Check, Info, MessageSquare, Share2,
  Lock, Unlock, Users, Receipt, Coins, TrendingDown, Database, Utensils,
  Download, Zap, Copy
} from 'lucide-react';
import { SchoolLogo } from './SchoolLogo';
import { VoiceSearchButton } from './VoiceSearchButton';
import { AuditTrailTab } from './AuditTrailTab';
import { DatabaseTab } from './DatabaseTab';
import { CanteenBookletModal } from './CanteenBookletModal';
import { isHolidayOrVacationDate } from '../utils/termUtils';
import * as XLSX from 'xlsx';

export const ReportPanel: React.FC = React.memo(() => {
  const { 
    payments, 
    students,
    currentDate, 
    sendMonthlyEmailDraft,
    currentUser,
    verifyPayment,
    activeTerm,
    sendautomatedWhatsApp,
    examsPayments,
    examsSettings,
    terms,
    systemSettings
  } = useApp();

  const paymentsIndexed = useMemo(() => {
    const byStudentId = new Map<string, typeof payments>();
    const byStudentIdAndDate = new Map<string, typeof payments[0]>();
    
    payments.forEach(p => {
      if (!byStudentId.has(p.studentId)) {
        byStudentId.set(p.studentId, []);
      }
      byStudentId.get(p.studentId)!.push(p);
      byStudentIdAndDate.set(`${p.studentId}_${p.date}`, p);
    });

    return { byStudentId, byStudentIdAndDate };
  }, [payments]);

  const [dateFilter, setDateFilter] = useState<string>(''); // empty means All Days
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [visibleDailyCount, setVisibleDailyCount] = useState<number>(100);

  // Auditing & Month-To-Date (MTD) view states
  const [auditViewMode, setAuditViewMode] = useState<'monthly' | 'ledger' | 'teller' | 'audit' | 'database'>('monthly');

  React.useEffect(() => {
    setVisibleDailyCount(100);
  }, [searchQuery, dateFilter, classFilter, categoryFilter, auditViewMode]);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 3000);
  };
  const [auditSelectedMonth, setAuditSelectedMonth] = useState<string>(() => {
    return currentDate?.slice(0, 7) || '2026-06';
  });
  const [expandedDailyAuditDate, setExpandedDailyAuditDate] = useState<string>('');

  // Unified Students Debt Billing Profile States
  const [selectedLedgerStudentId, setSelectedLedgerStudentId] = useState<string | null>(null);
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState<string>('');
  const [ledgerClassFilter, setLedgerClassFilter] = useState<string>('ALL');
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState<string>('ALL'); // ALL, SETTLED, DEBT, HIGH_DEBT

  // End of Day Cashier Auditing & Teller Reconciliation States
  const [auditDate, setAuditDate] = useState<string>(() => currentDate || new Date().toISOString().slice(0, 10));
  const [selectedTellerForAudit, setSelectedTellerForAudit] = useState<string | null>(null);
  const [tellerPhysicalCashInputs, setTellerPhysicalCashInputs] = useState<Record<string, string>>({});
  const [tellerAuditNotes, setTellerAuditNotes] = useState<Record<string, string>>({});
  const [tellerSignOffs, setTellerSignOffs] = useState<Record<string, { signedBy: string; timestamp: string }>>({});

  // Calendar states
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('');
  const [inspectedDate, setInspectedDate] = useState<string>('');
  const [showCalendar, setShowCalendar] = useState<boolean>(true);

  // Email Summary sliding drawer state
  const [showEmailDrawer, setShowEmailDrawer] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('saakohca@gmail.com');
  const [emailStatus, setEmailStatus] = useState<{ success: boolean; message: string; textUrl: string } | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  // Bulk Print states
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showPrintFriendlyModal, setShowPrintFriendlyModal] = useState(false);
  const [showAppPrintPreviewModal, setShowAppPrintPreviewModal] = useState(false);
  const [printPreviewZoom, setPrintPreviewZoom] = useState(90);
  const [paperSize, setPaperSize] = useState<'a4' | 'letter' | 'legal'>('a4');
  const [printMargins, setPrintMargins] = useState<'normal' | 'compact' | 'wide'>('normal');
  const [selectedWatermark, setSelectedWatermark] = useState<'NONE' | 'DRAFT' | 'CONFIDENTIAL' | 'SAAKO AUDITED'>('SAAKO AUDITED');
  const [showCrest, setShowCrest] = useState(true);
  const [printFriendlySignatory, setPrintFriendlySignatory] = useState('Yakubu Hakeem (Headmaster)');
  const [printFriendlyMemo, setPrintFriendlyMemo] = useState('This is an official audited transcript of Saako Holy Child Academy daily ledger. Please verify all entries and signatures.');
  const [previewPage, setPreviewPage] = useState(1);
  const [customMemo, setCustomMemo] = useState('Official statement of student daily schooling fee collections. Please retain this signature receipt for authentication.');
  const [authorizedBy, setAuthorizedBy] = useState('Yakubu Hakeem (Headmaster)');
  const [includeUnverified, setIncludeUnverified] = useState(true);
  const [printDateMode, setPrintDateMode] = useState<'current' | 'custom'>('current');
  const [printStartDate, setPrintStartDate] = useState('');
  const [printEndDate, setPrintEndDate] = useState('');
  const [printSearchQuery, setPrintSearchQuery] = useState('');

  // Term Summary PDF states
  const [showTermSummaryModal, setShowTermSummaryModal] = useState(false);
  const [showCanteenBookletModal, setShowCanteenBookletModal] = useState(false);
  const [termSummarySearchQuery, setTermSummarySearchQuery] = useState('');
  const [termSummaryClassFilter, setTermSummaryClassFilter] = useState('ALL');
  const [termSummarySignatory, setTermSummarySignatory] = useState('Yakubu Hakeem (Headmaster)');
  const [termSummaryMemo, setTermSummaryMemo] = useState('Consolidated term billing record and verified registration statement. Please verify and resolve all outstanding balances with the administrative office.');
  const [termSummaryOnlyPending, setTermSummaryOnlyPending] = useState(false);

  // Quick Daily Export States
  const [showQuickDailyModal, setShowQuickDailyModal] = useState(false);
  const [quickDailyDate, setQuickDailyDate] = useState<string>(() => currentDate || new Date().toISOString().slice(0, 10));
  const [quickDailyClassFilter, setQuickDailyClassFilter] = useState<string>('ALL');
  const [quickDailyStatusFilter, setQuickDailyStatusFilter] = useState<'ALL' | 'VERIFIED' | 'PENDING'>('ALL');
  const [quickDailySignatory, setQuickDailySignatory] = useState<string>('Yakubu Hakeem (Headmaster)');
  const [quickDailyMemo, setQuickDailyMemo] = useState<string>('Official audited daily transactions snapshot and cashier collection statement. All collections reconciled with physical tally.');

  // Sync quickDailyDate if currentDate changes
  React.useEffect(() => {
    if (currentDate) {
      setQuickDailyDate(currentDate);
    }
  }, [currentDate]);
  
  const [selectedReportTermId, setSelectedReportTermId] = useState<string>(activeTerm?.id || '');

  React.useEffect(() => {
    if (activeTerm && !selectedReportTermId) {
      setSelectedReportTermId(activeTerm.id);
    }
  }, [activeTerm]);

  const reportTerm = useMemo(() => {
    return terms.find(t => t.id === selectedReportTermId) || activeTerm;
  }, [terms, selectedReportTermId, activeTerm]);

  // Consolidated Ledger collapsible states
  const [expandedCategories, setExpandedCategories] = useState<Record<SchoolCategory, boolean>>({
    'Pre-school': false,
    'Primary': false,
    'JHS': false,
  });
  const [expandedClasses, setExpandedClasses] = useState<Record<StudentClass, boolean>>({
    'Nursery': false,
    'KG1': false,
    'KG2': false,
    'B1': false,
    'B2': false,
    'B3': false,
    'B4': false,
    'B5': false,
    'B6': false,
    'B7': false,
    'B8': false,
    'B9': false,
  });

  // Directors' Smart Debt Report states
  const [showDirectorsDebtModal, setShowDirectorsDebtModal] = useState(false);
  const [directorsSearchQuery, setDirectorsSearchQuery] = useState('');
  const [directorsClassFilter, setDirectorsClassFilter] = useState('ALL');
  const [directorsOnlyPaymentType, setDirectorsOnlyPaymentType] = useState('ALL'); // ALL, DAILY, TERM
  const [directorsMinDebt, setDirectorsMinDebt] = useState<number>(20);
  const [directorsSignatory, setDirectorsSignatory] = useState('Yakubu Hakeem (Headmaster)');
  const [directorsChairperson, setDirectorsChairperson] = useState('Board of Directors Chairperson');
  const [directorsNotes, setDirectorsNotes] = useState('Official consolidated student debt list compiled for the Board of Directors review. These balances reflect total outstanding tuition, legacy arrears, and exam fees as of the end of the term. Prioritize these accounts for recovery actions in preparation for the upcoming academic term.');

  // Group class categories
  const classes: StudentClass[] = [
    'Nursery', 'KG1', 'KG2',
    'B1', 'B2', 'B3', 'B4', 'B5', 'B6',
    'B7', 'B8', 'B9'
  ];

  // Sorting columns
  const [sortField, setSortField] = useState<'studentName' | 'date' | 'class'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filter payments list
  const filteredPayments = useMemo(() => {
    let result = [...payments];

    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const normalizedQuery = query.replace(/[-_ ]/g, '');
      result = result.filter(p => {
        const matchesNameOrId = 
          p.studentName.toLowerCase().includes(query) ||
          p.id.toLowerCase().includes(query);

        const normalizedClass = p.class.toLowerCase().replace(/[-_ ]/g, '');
        const matchesClass = 
          normalizedClass === normalizedQuery || 
          p.class.toLowerCase().includes(query) ||
          (p.category && p.category.toLowerCase().includes(query));

        let matchesStatus = false;
        if (query === 'absent' || query === 'missing' || query === 'away') {
          matchesStatus = !!p.isAbsent;
        } else if (query === 'paid' || query === 'present' || query === 'checked' || query === 'checkin' || query === 'checked in' || query === 'checked-in' || query === 'verified') {
          matchesStatus = !p.isAbsent && p.verified;
        } else if (query === 'unverified' || query === 'pending') {
          matchesStatus = !p.isAbsent && !p.verified;
        }

        return matchesNameOrId || matchesClass || matchesStatus;
      });
    }

    // Date
    if (dateFilter) {
      result = result.filter(p => p.date === dateFilter);
    }

    // Class
    if (classFilter !== 'ALL') {
      result = result.filter(p => p.class === classFilter);
    }

    // Category
    if (categoryFilter !== 'ALL') {
      result = result.filter(p => p.category === categoryFilter);
    }

    // Sorting
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'studentName') {
        aVal = a.studentName.toLowerCase();
        bVal = b.studentName.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    return result;
  }, [payments, searchQuery, dateFilter, classFilter, categoryFilter, sortField, sortDirection]);

  const displayedDailyPayments = useMemo(() => {
    return filteredPayments.slice(0, visibleDailyCount);
  }, [filteredPayments, visibleDailyCount]);

  // Filter payments specifically for bulk printing (with dynamic range option)
  const printFilteredPayments = useMemo(() => {
    let result = [...payments];

    // Search query
    const activeSearch = printSearchQuery.trim() ? printSearchQuery : searchQuery;
    if (activeSearch.trim()) {
      const query = activeSearch.toLowerCase().trim();
      const normalizedQuery = query.replace(/[-_ ]/g, '');
      result = result.filter(p => {
        const matchesNameOrId = 
          p.studentName.toLowerCase().includes(query) ||
          p.id.toLowerCase().includes(query);

        const normalizedClass = p.class.toLowerCase().replace(/[-_ ]/g, '');
        const matchesClass = 
          normalizedClass === normalizedQuery || 
          p.class.toLowerCase().includes(query) ||
          (p.category && p.category.toLowerCase().includes(query));

        let matchesStatus = false;
        if (query === 'absent' || query === 'missing' || query === 'away') {
          matchesStatus = !!p.isAbsent;
        } else if (query === 'paid' || query === 'present' || query === 'checked' || query === 'checkin' || query === 'checked in' || query === 'checked-in' || query === 'verified') {
          matchesStatus = !p.isAbsent && p.verified;
        } else if (query === 'unverified' || query === 'pending') {
          matchesStatus = !p.isAbsent && !p.verified;
        }

        return matchesNameOrId || matchesClass || matchesStatus;
      });
    }

    if (printDateMode === 'custom') {
      if (printStartDate) {
        result = result.filter(p => p.date >= printStartDate);
      }
      if (printEndDate) {
        result = result.filter(p => p.date <= printEndDate);
      }
    } else {
      // Date
      if (dateFilter) {
        result = result.filter(p => p.date === dateFilter);
      }
    }

    // Class
    if (classFilter !== 'ALL') {
      result = result.filter(p => p.class === classFilter);
    }

    // Category
    if (categoryFilter !== 'ALL') {
      result = result.filter(p => p.category === categoryFilter);
    }

    return result;
  }, [payments, searchQuery, printSearchQuery, printDateMode, printStartDate, printEndDate, dateFilter, classFilter, categoryFilter]);

  // Group filtered payments by student for bulk printing
  const paymentsByStudent = useMemo(() => {
    const subset = printFilteredPayments.filter(p => includeUnverified || p.verified);
    const groups: Record<string, { studentName: string; studentId: string; studentClass: StudentClass; studentCategory: SchoolCategory; paymentsList: PaymentRecord[] }> = {};
    
    subset.forEach(p => {
      if (!groups[p.studentId]) {
        groups[p.studentId] = {
          studentName: p.studentName,
          studentId: p.studentId,
          studentClass: p.class,
          studentCategory: p.category,
          paymentsList: []
        };
      }
      groups[p.studentId].paymentsList.push(p);
    });
    
    return Object.values(groups).sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [printFilteredPayments, includeUnverified]);

  // Term Summary PDF data compilation
  const termSummaryReportsByStudent = useMemo(() => {
    if (!reportTerm || !reportTerm.schoolDays) return [];

    let filteredList = students.filter(s => s.active !== false);

    if (termSummaryClassFilter !== 'ALL') {
      filteredList = filteredList.filter(s => s.class === termSummaryClassFilter);
    }
    if (termSummarySearchQuery.trim()) {
      const query = termSummarySearchQuery.toLowerCase();
      filteredList = filteredList.filter(s => 
        s.name.toLowerCase().includes(query) ||
        s.id.toLowerCase().includes(query) ||
        (s.rollNumber && s.rollNumber.toLowerCase().includes(query))
      );
    }

    const holidays = reportTerm.publicHolidays || [];
    const holidaysSet = new Set(holidays);
    const termSchoolDays = reportTerm.schoolDays;
    const termSchoolDaysSet = new Set(termSchoolDays);

    return filteredList.map(student => {
      // Find payments for this student inside the active term
      const allStudentPayments = paymentsIndexed.byStudentId.get(student.id) || [];
      const studentPayments = allStudentPayments.filter(p => termSchoolDaysSet.has(p.date));
      
      const absentPayments = studentPayments.filter(p => p.isAbsent);

      const absentCount = absentPayments.length;
      
      // School days elapsed up to currentDate
      const elapsedDays = termSchoolDays.filter(d => {
        const afterEnrollment = student.enrollmentDate ? d >= student.enrollmentDate : true;
        return d <= currentDate && afterEnrollment;
      });

      const teachingDays = elapsedDays.filter(dayStr => !holidaysSet.has(dayStr));
      const presentCount = Math.max(0, teachingDays.length - absentCount);

      // Unpaid days up to currentDate
      const unpaidDays = elapsedDays.filter(dayStr => {
        if (holidaysSet.has(dayStr)) return false;
        return !paymentsIndexed.byStudentIdAndDate.has(`${student.id}_${dayStr}`);
      });
      const unpaidCount = unpaidDays.length;

      // Fees calculations
      const isTermPayerStudent = isTermPayer(student);
      const termFeeAmount = student.termFee || getStudentBaselineTermFee(student.class, systemSettings);

      let totalCharged = 0;
      let totalPaid = 0;
      let totalDue = 0;

      if (isTermPayerStudent) {
        totalCharged = termFeeAmount + (student.legacyDebt || 0);
        // Payments include any recorded payments.
        totalPaid = studentPayments.filter(p => !p.isAbsent && (includeUnverified || p.verified)).reduce((sum, p) => sum + p.amount, 0);
        totalDue = Math.max(0, totalCharged - totalPaid);
      } else {
        totalPaid = studentPayments.filter(p => !p.isAbsent && (includeUnverified || p.verified)).reduce((sum, p) => sum + p.amount, 0);
        const dailyRate = Math.max(0, 5 - (student.discount || 0));
        totalDue = (unpaidCount * dailyRate) + (student.legacyDebt || 0);
        totalCharged = totalPaid + totalDue;
      }

      // Attendance rate
      const denominator = teachingDays.length;
      const attendanceRate = denominator > 0 ? (presentCount / denominator) * 100 : 100;

      return {
        student,
        presentCount,
        absentCount,
        unpaidCount,
        attendanceRate,
        isTermPayer,
        termFeeAmount,
        totalCharged,
        totalPaid,
        totalDue,
        paymentsList: studentPayments.sort((a, b) => b.date.localeCompare(a.date))
      };
    }).filter(item => {
      if (termSummaryOnlyPending) {
        return item.totalDue > 0;
      }
      return true;
    }).sort((a, b) => a.student.name.localeCompare(b.student.name));
  }, [students, paymentsIndexed, reportTerm, currentDate, termSummarySearchQuery, termSummaryClassFilter, termSummaryOnlyPending, includeUnverified]);

  // Compiled term summary overall totals
  const termSummaryTotals = useMemo(() => {
    let kids = termSummaryReportsByStudent.length;
    let totalBilled = 0;
    let totalCleared = 0;
    let totalArrears = 0;

    termSummaryReportsByStudent.forEach(item => {
      totalBilled += item.totalCharged;
      totalCleared += item.totalPaid;
      totalArrears += item.totalDue;
    });

    return {
      kids,
      totalBilled,
      totalCleared,
      totalArrears
    };
  }, [termSummaryReportsByStudent]);

  // Directors' Smart Debt Report data compilation
  const directorsDebtCompiledData = useMemo(() => {
    if (!activeTerm || !activeTerm.schoolDays) return [];

    const holidays = activeTerm.publicHolidays || [];
    const holidaysSet = new Set(holidays);
    const termSchoolDays = activeTerm.schoolDays;
    const termSchoolDaysSet = new Set(termSchoolDays);
    const elapsedDays = termSchoolDays.filter(d => d <= currentDate);

    return students.filter(s => s.active !== false).map(student => {
      // Regular payments inside the active term
      const allStudentPayments = paymentsIndexed.byStudentId.get(student.id) || [];
      const studentPayments = allStudentPayments.filter(p => termSchoolDaysSet.has(p.date));

      // Unpaid days up to currentDate
      const unpaidDays = elapsedDays.filter(dayStr => {
        if (holidaysSet.has(dayStr)) return false;
        const afterEnrollment = student.enrollmentDate ? dayStr >= student.enrollmentDate : true;
        if (!afterEnrollment) return false;
        return !paymentsIndexed.byStudentIdAndDate.has(`${student.id}_${dayStr}`);
      });
      const unpaidCount = unpaidDays.length;

      // Fees calculations
      const isTermPayerStudent = isTermPayer(student);
      const termFeeAmount = student.termFee || getStudentBaselineTermFee(student.class, systemSettings);
      const legacyDebt = student.legacyDebt || 0;

      let tuitionBilled = 0;
      let tuitionPaid = 0;
      let tuitionDue = 0;

      if (isTermPayerStudent) {
        tuitionBilled = termFeeAmount + legacyDebt;
        tuitionPaid = studentPayments.filter(p => !p.isAbsent && (includeUnverified || p.verified)).reduce((sum, p) => sum + p.amount, 0);
        tuitionDue = Math.max(0, tuitionBilled - tuitionPaid);
      } else {
        tuitionPaid = studentPayments.filter(p => !p.isAbsent && (includeUnverified || p.verified)).reduce((sum, p) => sum + p.amount, 0);
        const dailyRate = Math.max(0, 5 - (student.discount || 0));
        tuitionDue = (unpaidCount * dailyRate) + legacyDebt;
        tuitionBilled = tuitionPaid + tuitionDue;
      }

      // Exams fees calculations (from examsPayments and examsSettings)
      const isExamsEligible = (examsSettings?.eligibleClasses || ['KG1', 'KG2', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9']).includes(student.class);
      const examsBilled = isExamsEligible ? (examsSettings?.classFees?.[student.class]?.feeCharged || 0) : 0;
      const studentExamsPayments = isExamsEligible ? (examsPayments || []).filter(p => p.studentId === student.id) : [];
      const examsPaid = isExamsEligible ? studentExamsPayments.reduce((sum, p) => sum + p.amountPaid, 0) : 0;
      const examsDue = isExamsEligible ? Math.max(0, examsBilled - examsPaid) : 0;

      const totalBilled = tuitionBilled + examsBilled;
      const totalPaid = tuitionPaid + examsPaid;
      const totalDue = tuitionDue + examsDue;

      return {
        student,
        isTermPayer,
        tuitionBilled,
        tuitionPaid,
        tuitionDue,
        legacyDebt,
        examsBilled,
        examsPaid,
        examsDue,
        totalBilled,
        totalPaid,
        totalDue,
        parentPhone: student.parentPhone || student.phone || 'N/A'
      };
    });
  }, [students, paymentsIndexed, examsPayments, examsSettings, activeTerm, currentDate, includeUnverified]);

  const filteredDirectorsDebt = useMemo(() => {
    let result = [...directorsDebtCompiledData];

    if (directorsSearchQuery.trim()) {
      const q = directorsSearchQuery.toLowerCase().trim();
      result = result.filter(item => 
        item.student.name.toLowerCase().includes(q) ||
        item.student.id.toLowerCase().includes(q)
      );
    }

    if (directorsClassFilter !== 'ALL') {
      result = result.filter(item => item.student.class === directorsClassFilter);
    }

    if (directorsOnlyPaymentType !== 'ALL') {
      const isTerm = directorsOnlyPaymentType === 'TERM';
      result = result.filter(item => item.isTermPayer === isTerm);
    }

    if (directorsMinDebt > 0) {
      result = result.filter(item => item.totalDue >= directorsMinDebt);
    }

    return result.sort((a, b) => b.totalDue - a.totalDue);
  }, [directorsDebtCompiledData, directorsSearchQuery, directorsClassFilter, directorsOnlyPaymentType, directorsMinDebt]);

  // Compute stats for directors' report
  const directorsReportTotals = useMemo(() => {
    let totalBilled = 0;
    let totalPaid = 0;
    let totalDue = 0;
    let totalTuitionDue = 0;
    let totalExamsDue = 0;
    let totalLegacyDebt = 0;
    let debtorsCount = 0;

    filteredDirectorsDebt.forEach(item => {
      totalBilled += item.totalBilled;
      totalPaid += item.totalPaid;
      totalDue += item.totalDue;
      totalTuitionDue += item.tuitionDue;
      totalExamsDue += item.examsDue;
      totalLegacyDebt += item.legacyDebt;
      if (item.totalDue > 0) {
        debtorsCount++;
      }
    });

    const recoveryRate = totalBilled > 0 ? (totalPaid / totalBilled) * 100 : 100;

    return {
      totalBilled,
      totalPaid,
      totalDue,
      totalTuitionDue,
      totalExamsDue,
      totalLegacyDebt,
      debtorsCount,
      recoveryRate
    };
  }, [filteredDirectorsDebt]);

  // Class-wise groupings for the Directors' summary report
  const directorsClassBreakdown = useMemo(() => {
    const classMap: Record<string, { class: string; pupilsCount: number; debtorsCount: number; totalBilled: number; totalPaid: number; totalDue: number; tuitionDue: number; examsDue: number }> = {};
    
    classes.forEach(cls => {
      classMap[cls] = {
        class: cls,
        pupilsCount: 0,
        debtorsCount: 0,
        totalBilled: 0,
        totalPaid: 0,
        totalDue: 0,
        tuitionDue: 0,
        examsDue: 0
      };
    });

    directorsDebtCompiledData.forEach(item => {
      const cls = item.student.class;
      if (!classMap[cls]) {
        classMap[cls] = {
          class: cls,
          pupilsCount: 0,
          debtorsCount: 0,
          totalBilled: 0,
          totalPaid: 0,
          totalDue: 0,
          tuitionDue: 0,
          examsDue: 0
        };
      }
      classMap[cls].pupilsCount++;
      if (item.totalDue > 0) {
        classMap[cls].debtorsCount++;
      }
      classMap[cls].totalBilled += item.totalBilled;
      classMap[cls].totalPaid += item.totalPaid;
      classMap[cls].totalDue += item.totalDue;
      classMap[cls].tuitionDue += item.tuitionDue;
      classMap[cls].examsDue += item.examsDue;
    });

    return Object.values(classMap);
  }, [directorsDebtCompiledData]);

  const triggerDirectorsDebtCSV = () => {
    if (filteredDirectorsDebt.length === 0) {
      alert('The filtered directors ledger is empty. Modify filters before downloading.');
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Include BOM
    csvContent += "Student ID,Student Name,Class Grade,Payment Type,Parent Contact,Tuition Billed (GHC),Tuition Paid (GHC),Tuition Arrears (GHC),Exams Billed (GHC),Exams Paid (GHC),Exams Arrears (GHC),Total Combined Debt (GHC)\r\n";

    filteredDirectorsDebt.forEach(item => {
      const row = [
        `="${item.student.id}"`,
        `"${item.student.name.replace(/"/g, '""')}"`,
        item.student.class,
        item.isTermPayer ? 'Term Payer' : 'Daily Payer',
        `="${item.parentPhone}"`,
        item.tuitionBilled.toFixed(2),
        item.tuitionPaid.toFixed(2),
        item.tuitionDue.toFixed(2),
        item.examsBilled.toFixed(2),
        item.examsPaid.toFixed(2),
        item.examsDue.toFixed(2),
        item.totalDue.toFixed(2)
      ];
      csvContent += row.join(",") + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodedUri);
    downloadAnchor.setAttribute("download", `BoardOfDirectors_StudentDebts_${activeTerm?.name.replace(/[^a-zA-Z0-9]/g, "_") || 'Term'}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
  };

  // Derived student map for quick lookups
  const studentsByIdMap = useMemo(() => {
    const map = new Map<string, typeof students[0]>();
    students.forEach(s => map.set(s.id, s));
    return map;
  }, [students]);

  // Filtered transactions for the quick daily export
  const quickDailyTransactions = useMemo(() => {
    const targetDate = quickDailyDate || currentDate;
    return payments.filter(p => {
      if (p.date !== targetDate) return false;
      if (quickDailyClassFilter !== 'ALL' && p.class !== quickDailyClassFilter) return false;
      if (quickDailyStatusFilter === 'VERIFIED' && !p.verified) return false;
      if (quickDailyStatusFilter === 'PENDING' && p.verified) return false;
      return true;
    }).sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  }, [payments, quickDailyDate, currentDate, quickDailyClassFilter, quickDailyStatusFilter]);

  // Summary totals for the quick daily export
  const quickDailyTotals = useMemo(() => {
    const totalCount = quickDailyTransactions.length;
    const grossAmount = quickDailyTransactions.reduce((sum, p) => sum + (p.amount || 0), 0);
    const verifiedAmount = quickDailyTransactions.filter(p => p.verified).reduce((sum, p) => sum + (p.amount || 0), 0);
    const pendingAmount = quickDailyTransactions.filter(p => !p.verified).reduce((sum, p) => sum + (p.amount || 0), 0);
    const verifiedCount = quickDailyTransactions.filter(p => p.verified).length;
    const pendingCount = quickDailyTransactions.filter(p => !p.verified).length;

    // Cashiers on duty
    const cashiersSet = new Set<string>();
    quickDailyTransactions.forEach(p => {
      if (p.collectedBy) cashiersSet.add(p.collectedBy);
    });

    // Class breakdown
    const classMap: Record<string, { count: number; total: number; verified: number; pending: number }> = {};
    ALL_CLASSES.forEach(cls => {
      classMap[cls] = { count: 0, total: 0, verified: 0, pending: 0 };
    });
    quickDailyTransactions.forEach(p => {
      if (!classMap[p.class]) {
        classMap[p.class] = { count: 0, total: 0, verified: 0, pending: 0 };
      }
      classMap[p.class].count += 1;
      classMap[p.class].total += p.amount || 0;
      if (p.verified) {
        classMap[p.class].verified += p.amount || 0;
      } else {
        classMap[p.class].pending += p.amount || 0;
      }
    });

    return {
      totalCount,
      grossAmount,
      verifiedAmount,
      pendingAmount,
      verifiedCount,
      pendingCount,
      cashiers: Array.from(cashiersSet),
      classBreakdown: Object.entries(classMap)
        .filter(([_, d]) => d.count > 0)
        .map(([cls, d]) => ({
          className: cls as StudentClass,
          ...d
        }))
    };
  }, [quickDailyTransactions]);

  // ⚡ 1-Click Quick Daily Export (CSV)
  const handleQuickDailyCSVExport = (targetDateOverride?: string) => {
    const targetDate = targetDateOverride || quickDailyDate || currentDate;
    const txns = payments.filter(p => p.date === targetDate);

    const totalGross = txns.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalVerified = txns.filter(p => p.verified).reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPending = txns.filter(p => !p.verified).reduce((sum, p) => sum + (p.amount || 0), 0);

    let csvContent = "";
    // Institutional Header
    csvContent += `"SAAKO HOLY CHILD ACADEMY - OFFICIAL DAILY TRANSACTIONS AUDIT REPORT"\r\n`;
    csvContent += `"Target Audit Date:","${targetDate}","Generated On:","${new Date().toLocaleString()}","Signatory:","${quickDailySignatory}"\r\n`;
    csvContent += `"Total Daily Transactions:",${txns.length},"Total Gross Revenue (GHC):",${totalGross.toFixed(2)},"Verified (GHC):",${totalVerified.toFixed(2)},"Pending Verification (GHC):",${totalPending.toFixed(2)}\r\n`;
    csvContent += `\r\n`;

    // Column headers
    csvContent += `"No.","Receipt ID","Checked Date","Time","Student ID","Pupil Full Name","Class Grade","Academic Category","Amount Paid (GHC)","Cashier / Collected By","Audit Security Status","Payment Type / Notes","Guardian Contact Phone"\r\n`;

    // Transaction rows
    txns.forEach((p, idx) => {
      const student = studentsByIdMap.get(p.studentId);
      const parentContact = student?.guardianPhone || 'N/A';
      const timeStr = p.timestamp ? (p.timestamp.includes('T') ? p.timestamp.split('T')[1].substring(0, 8) : p.timestamp) : '- -';
      const row = [
        idx + 1,
        `="${p.id}"`,
        `"${p.date}"`,
        `"${timeStr}"`,
        `="${p.studentId}"`,
        `"${(p.studentName || '').replace(/"/g, '""')}"`,
        `"${p.class}"`,
        `"${p.category || 'Standard'}"`,
        p.amount.toFixed(2),
        `"${(p.collectedBy || 'Staff').replace(/"/g, '""')}"`,
        `"${p.verified ? 'VERIFIED / APPROVED' : 'PENDING AUDIT'}"`,
        `"${(p.notes || 'Daily Schooling Fee').replace(/"/g, '""')}"`,
        `="${parentContact}"`
      ];
      csvContent += row.join(",") + "\r\n";
    });

    // Summary footer rows
    csvContent += `\r\n`;
    csvContent += `"SUMMARY","TOTAL ROWS: ${txns.length}","---","---","---","---","---","TOTAL: GHC ${totalGross.toFixed(2)}","---","VERIFIED: GHC ${totalVerified.toFixed(2)}","PENDING: GHC ${totalPending.toFixed(2)}","---"\r\n`;

    // Trigger download with UTF-8 BOM
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Daily_Transactions_Audit_${targetDate.replace(/-/g, "")}_SaakoHolyChild.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`⚡ Daily CSV Exported: ${txns.length} records (GHC ${totalGross.toFixed(2)}) for ${targetDate}`);
  };

  // 📄 1-Click Quick Daily Export (PDF / Print Snapshot)
  const handleQuickDailyPDFExport = (targetDateOverride?: string) => {
    if (targetDateOverride) {
      setQuickDailyDate(targetDateOverride);
    }
    setShowQuickDailyModal(true);
  };

  // Direct print document trigger
  const handlePrintDailyDocument = () => {
    if (typeof window !== 'undefined') {
      window.focus();
      window.print();
    }
  };

  // WhatsApp / Clipboard Share Summary
  const handleShareDailySummary = () => {
    const targetDate = quickDailyDate || currentDate;
    const lines = [
      `🏫 *SAAKO HOLY CHILD ACADEMY*`,
      `📋 *Daily Transactions Audit & Cashier Snapshot*`,
      `📅 *Date:* ${targetDate}`,
      `---------------------------------------`,
      `💰 *Total Collections:* GHC ${quickDailyTotals.grossAmount.toFixed(2)}`,
      `✅ *Verified Amount:* GHC ${quickDailyTotals.verifiedAmount.toFixed(2)} (${quickDailyTotals.verifiedCount} receipts)`,
      `⏳ *Pending Audit:* GHC ${quickDailyTotals.pendingAmount.toFixed(2)} (${quickDailyTotals.pendingCount} receipts)`,
      `👥 *Total Transactions:* ${quickDailyTotals.totalCount} entries`,
      `👨‍🏫 *Cashiers on Duty:* ${quickDailyTotals.cashiers.length > 0 ? quickDailyTotals.cashiers.join(', ') : 'Accounts Desk'}`,
      ``,
      `*Class Collections Summary:*`,
      ...quickDailyTotals.classBreakdown.map(c => `• *${c.className}*: ${c.count} pupils → GHC ${c.total.toFixed(2)} (${c.verified > 0 ? `GHC ${c.verified.toFixed(2)} ver.` : 'pending'})`),
      ``,
      `✍️ *Prepared By:* ${quickDailySignatory}`,
      `📌 *Directive:* ${quickDailyMemo}`
    ];
    const text = lines.join('\n');

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast('📋 Daily audit summary copied to clipboard! Opening WhatsApp...');
    }

    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  // Aggregate stats of filtered set
  const totalsInfo = useMemo(() => {
    const totalCollected = filteredPayments.filter(p => p.verified).reduce((sum, p) => sum + p.amount, 0);
    const unverifiedCount = filteredPayments.filter(p => !p.verified).length;
    return {
      totalCollected,
      unverifiedCount
    };
  }, [filteredPayments]);

  const handleShareReportOrInvoice = async (
    type: 'invoice-page' | 'ledger-report',
    details: {
      studentId?: string;
      studentName?: string;
      guardianPhone?: string;
      rollNumber?: string;
      studentClass?: string;
      studentCategory?: string;
      totalPaymentsAllTime?: number;
      totalDebt?: number;
      unpaidDaysCount?: number;
      schoolOwesStudent?: number;
      totalPaidRecorded?: number;
      customFootnote?: string;
      totalRowsMatched?: number;
      ledgerValuation?: number;
      unverifiedRows?: number;
      authorizedSignatory?: string;
      auditedMemo?: string;
    }
  ) => {
    let messageText = '';
    let phone = '';

    if (type === 'invoice-page') {
      const sRoll = details.rollNumber || 'FT-PUPIL-' + (details.studentId?.substring(0, 5).toUpperCase() || '');
      const classGroup = `${details.studentClass || ''} (${details.studentCategory || ''})`;
      phone = details.guardianPhone || '';

      messageText = `*SAAKO HOLY CHILD ACADEMY*\n*OFFICIAL STATEMENT OF FEES & LEDGER REPORT*\n\n` +
        `*Reference:* SHC-RE-${currentDate.replace(/-/g, '')}-${details.studentId?.substring(0,6).toUpperCase() || 'ST'}\n` +
        `*Pupil Beneficiary:* ${details.studentName}\n` +
        `*Roll Number:* ${sRoll}\n` +
        `*Class Group:* ${classGroup}\n` +
        `*Statement Date:* ${currentDate}\n\n` +
        `*Financial Summary:*\n` +
        `* All-Time Fees Collected: GHC ${(details.totalPaymentsAllTime || 0).toFixed(2)}\n` +
        `* Total Arrears (Debt): GHC ${(details.totalDebt || 0).toFixed(2)} ${details.unpaidDaysCount ? `(${details.unpaidDaysCount} register days)` : ''}\n` +
        `* Prepaid Pool Balance: GHC ${(details.schoolOwesStudent || 0).toFixed(2)}\n` +
        `* Fees Covered inside Statement: GHC ${(details.totalPaidRecorded || 0).toFixed(2)}\n\n` +
        `${details.customFootnote ? `_Notice: ${details.customFootnote}_\n\n` : ''}` +
        `_Issued by: ${currentUser ? currentUser.name : 'Authorized Registrar Registration'}_`;
    } else if (type === 'ledger-report') {
      const filterDesc = `${classFilter !== 'ALL' ? `Class: ${classFilter}` : 'All Classes'}${categoryFilter !== 'ALL' ? ` [${categoryFilter}]` : ''}${dateFilter ? ` on Date: ${dateFilter}` : ''}`;
      messageText = `*SAAKO HOLY CHILD ACADEMY*\n*OFFICIAL AUDITED TRANSCRIPT & DAILY LEDGER*\n\n` +
        `*Report Date:* ${currentDate}\n` +
        `*Roster Scope:* ${filterDesc}\n\n` +
        `*Statement Insights:*\n` +
        `* Match Ledger Entries Count: ${details.totalRowsMatched || 0} rows\n` +
        `* Valuation / Amount Verified: GHC ${(details.ledgerValuation || 0).toFixed(2)}\n` +
        `* Unverified Pending Records: ${details.unverifiedRows || 0} matching\n` +
        `* Authorized Signatory: ${details.authorizedSignatory || 'Headmaster'}\n\n` +
        `${details.auditedMemo ? `_Office Memo: ${details.auditedMemo}_\n\n` : ''}` +
        `_Validated via Gate Checkpoint Ingress System on ${currentDate}_`;
    }

    if (!messageText) return;

    let sharedViaApi = false;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: type === 'invoice-page' ? 'Pupil Fee Statement' : 'School Audited Transcript Ledger',
          text: messageText
        });
        sharedViaApi = true;
        alert("Successfully shared!");
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.log("Web Share API could not complete. Using fallback:", err);
      }
    }

    if (!sharedViaApi) {
      let targetPhone = phone.replace(/\D/g, "");
      if (targetPhone.startsWith("0") && targetPhone.length === 10) {
        targetPhone = "233" + targetPhone.substring(1);
      }
      
      const urlText = encodeURIComponent(messageText);
      const waUrl = targetPhone 
        ? `https://api.whatsapp.com/send?phone=${targetPhone}&text=${urlText}`
        : `https://api.whatsapp.com/send?text=${urlText}`;

      if (typeof window !== 'undefined') {
        window.open(waUrl, '_blank', 'noopener,noreferrer');
        alert("Pre-filled WhatsApp opened. Direct delivery to guardian initiated!");
      }
    }

    try {
      if (sendautomatedWhatsApp) {
        await sendautomatedWhatsApp(
          phone || 'N/A',
          messageText,
          details.studentId || undefined,
          details.studentName || undefined,
          type
        );
      }
    } catch (err) {
      console.error("Failed to automatically log dispatch connection:", err);
    }
  };

  // Aggregate stats for export confirmation summary modal
  const exportSummary = useMemo(() => {
    if (filteredPayments.length === 0) {
      return {
        totalRows: 0,
        minDate: 'N/A',
        maxDate: 'N/A',
        totalVolume: 0,
        verifiedVal: 0,
        pendingVal: 0
      };
    }
    const totalRows = filteredPayments.length;
    const exportDates = filteredPayments.map(p => p.date).filter(Boolean);
    const minDate = exportDates.length > 0 ? exportDates.reduce((min, d) => d < min ? d : min, exportDates[0]) : 'Continuous';
    const maxDate = exportDates.length > 0 ? exportDates.reduce((max, d) => d > max ? d : max, exportDates[0]) : 'Continuous';
    const totalVolume = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const verifiedVal = filteredPayments.filter(p => p.verified).reduce((sum, p) => sum + p.amount, 0);
    const pendingVal = filteredPayments.filter(p => !p.verified).reduce((sum, p) => sum + p.amount, 0);

    return {
      totalRows,
      minDate,
      maxDate,
      totalVolume,
      verifiedVal,
      pendingVal
    };
  }, [filteredPayments]);

  // --- Start of Monthly MTD Aggregation calculations ---
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    payments.forEach(p => {
      if (p.date && p.date.length >= 7) {
        monthsSet.add(p.date.slice(0, 7)); // "YYYY-MM"
      }
    });
    // Fallback to include current month
    const curYearMonth = currentDate.slice(0, 7);
    monthsSet.add(curYearMonth);
    
    // Sort reverse chronological (latest months first)
    return Array.from(monthsSet).sort().reverse();
  }, [payments, currentDate]);

  const monthlyPayments = useMemo(() => {
    return payments.filter(p => p.date && p.date.startsWith(auditSelectedMonth));
  }, [payments, auditSelectedMonth]);

  const aggregatedDays = useMemo(() => {
    const dayGroups: { [date: string]: {
      date: string;
      totalAmount: number;
      verifiedAmount: number;
      unverifiedAmount: number;
      totalCount: number;
      verifiedCount: number;
      classTotals: { [cls: string]: number };
    } } = {};

    monthlyPayments.forEach(p => {
      const d = p.date;
      if (!dayGroups[d]) {
        dayGroups[d] = {
          date: d,
          totalAmount: 0,
          verifiedAmount: 0,
          unverifiedAmount: 0,
          totalCount: 0,
          verifiedCount: 0,
          classTotals: {}
        };
      }
      const group = dayGroups[d];
      group.totalAmount += p.amount;
      group.totalCount += 1;
      if (p.verified) {
        group.verifiedAmount += p.amount;
        group.verifiedCount += 1;
      } else {
        group.unverifiedAmount += p.amount;
      }
      
      const clsName = p.class || 'Other';
      group.classTotals[clsName] = (group.classTotals[clsName] || 0) + p.amount;
    });

    // Sort chronologically (latest date first)
    return Object.values(dayGroups).sort((a, b) => b.date.localeCompare(a.date));
  }, [monthlyPayments]);

  const formatMonthKey = (yrMo: string) => {
    if (!yrMo) return 'No Month Selected';
    const parts = yrMo.split('-');
    if (parts.length !== 2) return yrMo;
    const yr = parseInt(parts[0], 10);
    const mo = parseInt(parts[1], 10);
    const d = new Date(yr, mo - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };
  // --- End of Monthly MTD Aggregation calculations ---

  // Pagination for pre-export preview table
  const PREVIEW_ITEMS_PER_PAGE = 10;
  const totalPreviewPages = Math.ceil(filteredPayments.length / PREVIEW_ITEMS_PER_PAGE) || 1;
  const paginatedPayments = useMemo(() => {
    const start = (previewPage - 1) * PREVIEW_ITEMS_PER_PAGE;
    return filteredPayments.slice(start, start + PREVIEW_ITEMS_PER_PAGE);
  }, [filteredPayments, previewPage]);

  // 1. Extract all months having school days in activeTerm
  const termMonths = useMemo(() => {
    if (!activeTerm || !activeTerm.schoolDays) return [];
    const monthsMap = new Map<string, { year: number; month: number; label: string }>();
    
    activeTerm.schoolDays.forEach(dayStr => {
      const parts = dayStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const key = `${y}-${m}`;
        if (!monthsMap.has(key)) {
          const dateObj = new Date(y, m - 1, 1);
          const label = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          monthsMap.set(key, { year: y, month: m - 1, label });
        }
      }
    });

    return Array.from(monthsMap.values()).sort((a, b) => {
      return a.year !== b.year ? a.year - b.year : a.month - b.month;
    });
  }, [activeTerm]);

  // 2. Automatically select the calendar month to display (matches currentDate, otherwise first month)
  React.useEffect(() => {
    if (termMonths.length > 0 && !selectedMonthKey) {
      const currentYearMonth = currentDate.slice(0, 7); // "YYYY-MM"
      const match = termMonths.find(m => {
        const key = `${m.year}-${String(m.month + 1).padStart(2, '0')}`;
        return key === currentYearMonth;
      });
      if (match) {
        setSelectedMonthKey(`${match.year}-${match.month}`);
      } else {
        setSelectedMonthKey(`${termMonths[0].year}-${termMonths[0].month}`);
      }
    }
  }, [termMonths, currentDate, selectedMonthKey]);

  // 3. Resolve current selected month's info
  const activeMonthInfo = useMemo(() => {
    if (!selectedMonthKey) return null;
    const parts = selectedMonthKey.split('-');
    if (parts.length !== 2) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const label = new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return { year, month, label };
  }, [selectedMonthKey]);

  // 4. Term-wide calendar statistics (count of settled, partial, completely missing days)
  const calendarStats = useMemo(() => {
    if (!activeTerm || !activeTerm.schoolDays || students.length === 0) {
      return { total: 0, completed: 0, partial: 0, missing: 0, future: 0 };
    }
    
    // We only evaluate active students
    const activeStudents = students.filter(s => s.active);
    const activeStudentsCount = activeStudents.length || 1;
    
    let completed = 0;
    let partial = 0;
    let missing = 0;
    let future = 0;

    const holidays = activeTerm.publicHolidays || [];
    activeTerm.schoolDays.forEach(dayStr => {
      if (holidays.includes(dayStr)) return; // Exclude public holidays

      if (dayStr > currentDate) {
        future++;
      } else {
        const paidCount = activeStudents.filter(s => 
          paymentsIndexed.byStudentIdAndDate.has(`${s.id}_${dayStr}`)
        ).length;

        if (paidCount === 0) {
          missing++;
        } else if (paidCount < activeStudentsCount) {
          partial++;
        } else {
          completed++;
        }
      }
    });

    return {
      total: activeTerm.schoolDays.length,
      completed,
      partial,
      missing,
      future
    };
  }, [activeTerm, students, payments, currentDate]);

  // 5. Calculate inspection statistics and student list for the highlighted day
  const inspectedDayDetails = useMemo(() => {
    if (!inspectedDate) return null;
    
    const isSchoolDay = activeTerm?.schoolDays.includes(inspectedDate);
    const dateObj = new Date(inspectedDate);
    
    // Format friendly label (e.g., Monday, June 1, 2026)
    const dayLabel = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    if (!isSchoolDay) {
      return { isSchoolDay: false, dayLabel };
    }

    const activeStudents = students.filter(s => s.active);
    const paidPayments = payments.filter(p => p.date === inspectedDate);
    const paidMap = new Map<string, PaymentRecord>();
    paidPayments.forEach(p => paidMap.set(p.studentId, p));

    const settledStudents = activeStudents.filter(s => paidMap.has(s.id));
    const missingStudents = activeStudents.filter(s => !paidMap.has(s.id));

    const collectedGhc = paidPayments.reduce((sum, p) => sum + p.amount, 0);
    const expectedGhc = activeStudents.reduce((sum, s) => {
      if (isTermPayer(s)) {
        return sum; // Term payers do not contribute to daily expected collections
      }
      const discount = s.discount || 0;
      return sum + Math.max(0, 5 - discount);
    }, 0);

    return {
      isSchoolDay: true,
      dayLabel,
      settledStudents,
      missingStudents,
      collectedGhc,
      expectedGhc,
      paidPayments
    };
  }, [inspectedDate, students, payments, activeTerm]);

  const handleSort = (field: 'studentName' | 'date' | 'class') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handlePrintStudentLedger = (studentId: string) => {
    const item = consolidatedLedgerData.find(x => x.student.id === studentId);
    if (!item) return;

    const printWindow = window.open('', '_blank', 'width=850,height=850');
    if (!printWindow) {
      alert("Popup blocker prevented printing. Please enable popups.");
      return;
    }

    const s = item.student;
    const txRows = item.paymentsList.map(tx => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 10px; font-family: monospace;">${tx.date}</td>
        <td style="padding: 10px; font-family: monospace;">${tx.id}</td>
        <td style="padding: 10px;">${tx.collectedBy || 'Staff'}</td>
        <td style="padding: 10px; font-weight: bold; font-family: monospace;">GHC ${tx.amount.toFixed(2)}</td>
        <td style="padding: 10px; text-transform: uppercase; font-size: 10px; font-weight: bold; color: ${tx.verified ? '#047857' : '#b45309'};">
          ${tx.verified ? 'Verified' : 'Pending'}
        </td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>LEDGER TRANSCRIPT: ${s.name}</title>
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; color: #1f2937; margin: 40px; padding: 0; line-height: 1.5; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px double #1f2937; padding-bottom: 20px; margin-bottom: 30px; }
            .school-title { font-weight: 900; font-size: 20px; text-transform: uppercase; letter-spacing: -0.02em; }
            .school-subtitle { font-size: 11px; color: #4b5563; font-weight: bold; margin-top: 4px; }
            .meta-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .meta-box { background: #f9fafb; border: 1px solid #e5e7eb; padding: 15px; }
            .meta-title { font-size: 9px; text-transform: uppercase; color: #6b7280; font-weight: 800; letter-spacing: 0.05em; margin-bottom: 6px; }
            .meta-value { font-size: 13px; font-weight: bold; }
            .invoice-summary { display: grid; grid-template-cols: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
            .summary-card { background: #f3f4f6; border-left: 4px solid #1f2937; padding: 15px; text-align: right; }
            .summary-card-debt { background: #fee2e2; border-left-color: #ef4444; }
            .summary-title { font-size: 9px; text-transform: uppercase; color: #6b7280; font-weight: 800; text-align: left; }
            .summary-value { font-size: 18px; font-weight: 900; font-family: monospace; }
            table { width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; margin-bottom: 40px; }
            th { background: #1f2937; color: white; padding: 10px; font-weight: 800; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
            .footer-notes { text-align: center; font-size: 10px; color: #6b7280; font-style: italic; border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 50px; }
            .sig-row { display: flex; justify-content: space-between; margin-top: 60px; font-size: 11px; }
            .sig-line { border-top: 1px solid #1f2937; width: 200px; text-align: center; padding-top: 5px; font-weight: bold; }
            @media print {
              body { margin: 20px; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="text-align: right; margin-bottom: 20px;">
            <button onclick="window.print()" style="background: #1f2937; color: white; border: none; padding: 10px 20px; font-weight: bold; cursor: pointer; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em;">Print Statement</button>
          </div>
          <div class="header">
            <div>
              <div class="school-title">Saako Holy Child Academy</div>
              <div class="school-subtitle">Official Student Billing & Consolidated Ledger Transcript</div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 800; font-size: 12px;">LEDGER STATEMENT</div>
              <div style="font-size: 10px; color: #4b5563; font-family: monospace; margin-top: 4px;">DATE: ${currentDate}</div>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-box">
              <div class="meta-title">Pupil Academic Profile</div>
              <div class="meta-value" style="font-size: 15px; color: #111827; margin-bottom: 4px;">${s.name}</div>
              <div style="font-size: 11px; color: #4b5563;">
                ID: <span style="font-family: monospace; font-weight: bold;">${s.id}</span> | Class: <strong>${s.class} (${s.category})</strong><br/>
                Roll Number: <strong>${s.rollNumber || 'N/A'}</strong> | Gender: <strong>${s.gender || 'N/A'}</strong>
              </div>
            </div>
            <div class="meta-box">
              <div class="meta-title">Billing Configuration</div>
              <div class="meta-value">${item.isTermPayer ? 'Term-based Scheme' : 'Daily Gate Scheme'}</div>
              <div style="font-size: 11px; color: #4b5563; margin-top: 4px;">
                Termly Flat Rate: <strong>GHC ${item.termFeeAmount.toFixed(2)}</strong><br/>
                Legacy Arrears Carried: <strong>GHC ${item.legacyDebt.toFixed(2)}</strong>
              </div>
            </div>
          </div>

          <div class="invoice-summary">
            <div class="summary-card">
              <div class="summary-title">Cumulative Billed</div>
              <div class="summary-value">GHC ${item.totalCharged.toFixed(2)}</div>
            </div>
            <div class="summary-card">
              <div class="summary-title">Total Payments Cleared</div>
              <div class="summary-value" style="color: #15803d;">GHC ${item.totalPaid.toFixed(2)}</div>
            </div>
            <div class="summary-card summary-card-debt">
              <div class="summary-title" style="color: #b91c1c;">Outstanding Debt Due</div>
              <div class="summary-value" style="color: #b91c1c;">GHC ${item.totalDue.toFixed(2)}</div>
            </div>
          </div>

          <div style="font-weight: bold; font-size: 13px; text-transform: uppercase; letter-spacing: 0.02em; margin-bottom: 12px; border-bottom: 1px solid #1f2937; padding-bottom: 5px;">Itemized Payment Ledger History</div>
          ${item.paymentsList.length === 0 ? `
            <div style="padding: 30px; text-align: center; color: #6b7280; font-weight: bold; font-size: 13px; border: 2px dashed #e5e7eb;">
              No payment ledger entries matching this academic term.
            </div>
          ` : `
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; margin-bottom: 40px;">
              <thead>
                <tr>
                  <th style="background: #1f2937; color: white; padding: 10px; font-weight: 800; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em;">Date</th>
                  <th style="background: #1f2937; color: white; padding: 10px; font-weight: 800; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em;">Receipt ID</th>
                  <th style="background: #1f2937; color: white; padding: 10px; font-weight: 800; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em;">Collected By</th>
                  <th style="background: #1f2937; color: white; padding: 10px; font-weight: 800; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em;">Amount Paid</th>
                  <th style="background: #1f2937; color: white; padding: 10px; font-weight: 800; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em;">Verification</th>
                </tr>
              </thead>
              <tbody>
                ${txRows}
              </tbody>
            </table>
          `}

          <div class="sig-row">
            <div>
              <div class="sig-line">Administrative Registrar</div>
              <div style="font-size: 9px; color: #6b7280; text-align: center; margin-top: 3px;">Billing Clearance Desk</div>
            </div>
            <div>
              <div class="sig-line">Official School Stamp</div>
              <div style="font-size: 9px; color: #6b7280; text-align: center; margin-top: 3px;">Saako Holy Child Academy</div>
            </div>
          </div>

          <div class="footer-notes" style="display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 10px; margin-top: 20px;">
            <span>"This document is an official certified billing transcript generated directly from Saako Holy Child Academy financial core. Please resolve any outstanding balances with the bursar to ensure check-in compliance."</span>
            <span style="display: inline-flex; align-items: center; gap: 4px; font-weight: bold; font-size: 9px; white-space: nowrap; margin-left: 12px;">
              Fee Tracker System
            </span>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintReport = () => {
    // Generate a dedicated window for printing audit records
    const printWindow = window.open('', '_blank', 'width=1100,height=850');
    if (!printWindow) {
      if (typeof window !== 'undefined' && window.parent !== window) {
        window.dispatchEvent(new CustomEvent('show-print-iframe-warning'));
      } else {
        alert("Popup blocker active! Please allow popups to open the dedicated print window.");
      }
      return;
    }

    const todayDateStr = new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const tableRowsHtml = filteredPayments.length === 0
      ? `<tr>
          <td colspan="8" style="text-align: center; padding: 32px; color: #737373; font-style: italic;">
            No ledger entries listed in active session.
          </td>
         </tr>`
      : filteredPayments.map((p, idx) => `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 8px 6px; border: 1px solid #d1d5db; text-align: center; font-family: monospace;">${idx + 1}</td>
            <td style="padding: 8px 6px; border: 1px solid #d1d5db; font-family: monospace; color: #4b5563;">${p.date}</td>
            <td style="padding: 8px 6px; border: 1px solid #d1d5db; font-weight: bold; text-transform: uppercase; color: #111827;">
              <div>${p.studentName}</div>
              ${p.notes ? `<div style="font-size: 8px; font-family: monospace; font-weight: 500; color: #6b7280; text-transform: none; margin-top: 3px;">(* ${p.notes})</div>` : ''}
            </td>
            <td style="padding: 8px 6px; border: 1px solid #d1d5db; text-align: center; font-family: monospace; font-weight: 600; color: #1f2937;">${p.class}</td>
            <td style="padding: 8px 6px; border: 1px solid #d1d5db; text-transform: uppercase; font-family: monospace; color: #374151;">${p.category}</td>
            <td style="padding: 8px 6px; border: 1px solid #d1d5db; text-align: right; font-family: monospace; font-weight: bold;">GHC ${p.amount.toFixed(2)}</td>
            <td style="padding: 8px 6px; border: 1px solid #d1d5db; font-family: monospace; color: #4b5563;">${p.id.toUpperCase().substring(0, 10)}...</td>
            <td style="padding: 8px 6px; border: 1px solid #d1d5db; text-align: center; font-family: monospace; font-size: 9px; font-weight: bold; color: ${p.verified ? '#047857' : '#d97706'}">
              ${p.verified ? 'APPROVED' : 'PENDING'}
            </td>
          </tr>
        `).join('');

    const watermarkHtml = selectedWatermark !== 'NONE'
      ? `<div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; pointer-events: none; user-select: none; z-index: 0;">
          <div style="font-size: 54px; font-weight: 900; letter-spacing: 0.1em; color: rgba(229, 231, 235, 0.4); text-transform: uppercase; font-family: monospace; border: 8px solid rgba(229, 231, 235, 0.4); padding: 8px 24px; border-radius: 12px; transform: rotate(-30deg); opacity: 0.35;">
            ${selectedWatermark}
          </div>
         </div>`
      : '';

    const crestHtml = showCrest
      ? `<div style="border-bottom: 4px solid #111827; padding-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
          <div style="line-height: 1.2;">
            <span style="font-size: 9px; font-weight: bold; color: #4b5563; font-family: monospace; letter-spacing: 0.1em; text-transform: uppercase; display: block;">
              OFFICIAL ADMINISTRATIVE AUDIT RECORD
            </span>
            <h2 style="font-size: 24px; font-weight: 900; text-transform: uppercase; margin: 4px 0 0 0; color: #000; letter-spacing: -0.025em;">
              SAAKO HOLY CHILD ACADEMY
            </h2>
            <p style="font-size: 10px; color: #4b5563; font-weight: bold; text-transform: uppercase; font-family: monospace; margin: 4px 0 0 0; letter-spacing: 0.05em;">
              Holiness is our Key, P. O. Box LS 15, Sawla Savannah Region • Sawla, Jelinkon street, Savannah Region. Tel: +233545029200 / +2330507274133
            </p>
          </div>
          <div style="text-align: right; font-family: monospace;">
            <span style="font-size: 10px; font-weight: 900; text-transform: uppercase; padding: 4px 10px; background-color: #e5e7eb; border: 1px solid #000; display: inline-block;">
              LEDGER STATEMENT
            </span>
            <div style="font-size: 8px; color: #6b7280; font-weight: bold; margin-top: 4px;">
              RUN DATE: ${todayDateStr}
            </div>
          </div>
         </div>`
      : '';

    const commentHtml = printFriendlyMemo
      ? `<div style="background-color: #f9fafb; padding: 14px; border: 1px solid #d1d5db; font-size: 10px; line-height: 1.5; color: #4b5563; font-style: italic; margin-top: 24px;">
          <span style="font-weight: bold; color: #111827; text-transform: uppercase; font-style: normal; display: block; margin-bottom: 4px; font-size: 8px; letter-spacing: 0.05em;">
            AUDIT STATION COMMENTS & MEMORANDUM
          </span>
          ${printFriendlyMemo}
         </div>`
      : '';

    const pageSizeString = paperSize === 'legal' ? 'legal portrait' : paperSize === 'letter' ? 'letter portrait' : 'A4 portrait';
    const pageMarginString = printMargins === 'compact' ? '8mm' : printMargins === 'wide' ? '18mm' : '12mm';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ledger Audit Statement - Saako Holy Child Academy</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=JetBrains+Mono:wght@400;700;800&display=swap');
          
          body {
            background: white !important;
            color: black !important;
            margin: 0;
            padding: 24px;
            font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          @page {
            size: ${pageSizeString};
            margin: ${pageMarginString};
            @bottom-right {
              content: "Page " counter(page) " of " counter(pages);
              font-family: 'JetBrains Mono', monospace !important;
              font-size: 8px !important;
              font-weight: bold !important;
              color: #333333 !important;
            }
          }

          @media print {
            body {
              padding: 0 !important;
            }
            .no-print {
              display: none !important;
            }
          }

          .print-card {
            background: white;
            color: black;
            box-sizing: border-box;
            width: 100%;
            position: relative;
            min-height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }

          th {
            background-color: #f3f4f6 !important;
            color: black !important;
            font-weight: bold;
            font-family: 'JetBrains Mono', monospace;
            padding: 8px 6px;
            border: 1px solid #c0c0c0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          td {
            border: 1px solid #c0c0c0;
            padding: 8px 6px;
          }

          /* Control frame inside the new window for helper actions before manual launch */
          .print-controls {
            margin-bottom: 24px;
            padding: 16px;
            background-color: #171717;
            color: white;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-radius: 4px;
            border: 2px solid #262626;
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
          }

          .print-btn {
            background-color: #f59e0b;
            color: #000;
            border: none;
            padding: 10px 20px;
            font-weight: 950;
            cursor: pointer;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.05em;
          }

          .print-btn:hover {
            background-color: #fbbf24;
          }

          .close-btn {
            background-color: #262626;
            color: #a3a3a3;
            border: 1px solid #404040;
            padding: 10px 20px;
            cursor: pointer;
            font-size: 11px;
            text-transform: uppercase;
            font-weight: bold;
          }

          .close-btn:hover {
            background-color: #404040;
            color: white;
          }
        </style>
      </head>
      <body>
        <div class="print-controls no-print">
          <div>
            <strong>🖨️ DEDICATED AUDIT STATEMENT PRINTER</strong> 
            <span style="margin-left: 12px; color: #a3a3a3; font-size: 11px;">(All non-essential admin blocks & navigation headers have been fully stripped)</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="print-btn" onclick="window.print()">Trigger Browser Print</button>
            <button class="close-btn" onclick="window.close()">Close</button>
          </div>
        </div>

        <div class="print-card">
          ${watermarkHtml}
          
          <div style="position: relative; z-index: 10;">
            ${crestHtml}

            <!-- Filters Grid -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; background-color: #f9fafb; padding: 12px; border: 1px solid #d1d5db; font-family: 'JetBrains Mono', monospace; font-size: 9px; text-transform: uppercase; margin-bottom: 24px; color: #374151;">
              <div>
                <span style="font-size: 8px; color: #6b7280; font-weight: bold; display: block;">ACADEMIC COHORT FILTER</span>
                <span style="font-weight: 800; color: #000;">${classFilter === 'ALL' ? 'ALL GRADES' : `GRADE CLASS ${classFilter}`}</span>
              </div>
              <div style="border-left: 1px solid #d1d5db; padding-left: 12px;">
                <span style="font-size: 8px; color: #6b7280; font-weight: bold; display: block;">DEMOGRAPHIC RANGE</span>
                <span style="font-weight: 800; color: #000;">${categoryFilter === 'ALL' ? 'ALL GROUPS' : categoryFilter}</span>
              </div>
              <div style="border-left: 1px solid #d1d5db; padding-left: 12px;">
                <span style="font-size: 8px; color: #6b7280; font-weight: bold; display: block;">VALUATION BALANCE</span>
                <span style="font-weight: 800; color: #047857;">GHC ${totalsInfo.totalCollected.toFixed(2)}</span>
              </div>
              <div style="border-left: 1px solid #d1d5db; padding-left: 12px;">
                <span style="font-size: 8px; color: #6b7280; font-weight: bold; display: block;">RECORD LENGTH</span>
                <span style="font-weight: 800; color: #000;">${filteredPayments.length} ROWS</span>
              </div>
            </div>

            <!-- Table -->
            <div style="border: 1px solid #d1d5db; overflow: hidden; margin-bottom: 24px;">
              <table>
                <thead>
                  <tr>
                    <th style="width: 5%;">#</th>
                    <th style="text-align: left; width: 15%;">TRANSACTION DATE</th>
                    <th style="text-align: left; width: 25%;">PUPIL BENEFICIARY</th>
                    <th style="width: 10%;">GRADE</th>
                    <th style="text-align: left; width: 15%;">DEMOGRAPHIC</th>
                    <th style="text-align: right; width: 12%;">FEE (GHC)</th>
                    <th style="text-align: left; width: 10%;">RECEIPT REF</th>
                    <th style="width: 8%;">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRowsHtml}
                </tbody>
              </table>
            </div>

            ${commentHtml}
          </div>

          <!-- Footer Seals & Signatures -->
          <div style="border-top: 1px solid #d1d5db; padding-top: 24px; margin-top: 32px; display: flex; justify-content: space-between; align-items: flex-end; position: relative; z-index: 10;">
            <div style="flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; font-size: 10px; line-height: 1.5;">
              <div>
                <span style="color: #6b7280; font-weight: 900; font-size: 8px; display: block; text-transform: uppercase;">PREPARED & VERIFIED BY:</span>
                <div style="height: 40px; border-bottom: 1px solid #000; width: 176px; margin-bottom: 8px;"></div>
                <div>
                  <span style="color: #000; font-weight: 800; text-transform: uppercase;">ASSIGNED DESK OFFICER</span>
                  <span style="color: #6b7280; display: block; font-size: 9px;">Class Gate Supervisor / Auditor</span>
                </div>
              </div>

              <div>
                <span style="color: #6b7280; font-weight: 900; font-size: 8px; display: block; text-transform: uppercase;">APPROVED & COUNTERSIGNED BY:</span>
                <div style="height: 40px; border-bottom: 1px solid #000; width: 176px; margin-bottom: 8px;"></div>
                <div>
                  <span style="color: #000; font-weight: 800; text-transform: uppercase;">${printFriendlySignatory}</span>
                  <span style="color: #6b7280; display: block; font-size: 9px;">Saako Holy Child Board Exec</span>
                </div>
              </div>
            </div>

            <!-- Seal -->
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100px;">
              <div style="height: 80px; width: 80px; border-radius: 50%; border: 2px dashed #6366f1; padding: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; background-color: #f5f3ff;">
                <div style="background-color: #fff; height: 100%; width: 100%; border-radius: 50%; border: 1px solid #f59e0b; display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; padding: 4px; line-height: 1.1;">
                  <span style="font-size: 7px; color: #312e81; font-weight: 900; display: block;">SAAKO TRUST</span>
                  <span style="font-size: 6px; color: #d97706; font-weight: 900; display: block; margin-top: 2px; letter-spacing: 0.05em;">VALID SEAL</span>
                  <span style="font-size: 5px; color: #4338ca; display: block; font-weight: bold;">SAWLA, JELINKON STREET, SAVANNAH REGION</span>
                </div>
              </div>
              <span style="font-size: 7px; font-family: monospace; color: #6366f1; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 4px; display: block; font-weight: bold;">OFFICIAL IMPRESS</span>
            </div>
          </div>
        </div>

        <script>
          // Trigger print dialog once fully painted
          window.addEventListener('load', () => {
            setTimeout(() => {
              window.print();
            }, 350);
          });
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Excel Auditor Core - Client Side CSV Generator
  const triggerExcelExport = () => {
    if (filteredPayments.length === 0) {
      alert('The filtered register is empty. Modify filters before downloading Excel sheets.');
      return;
    }
    setShowExportModal(true);
  };

  const confirmExcelExport = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Daily School Fees Ledger (current filteredPayments)
    const sheet1Data = filteredPayments.map(p => ({
      "Payment ID": p.id,
      "Student Roll/ID": p.studentId,
      "Student Name": p.studentName,
      "Class Grade": p.class,
      "Academic Group": p.category,
      "Collections (GHC)": Number(p.amount.toFixed(2)),
      "Checked Date": p.date,
      "Checked Timestamp": p.timestamp,
      "Collected By Teacher": p.collectedBy,
      "Security Audit Status": p.verified ? 'Verified Ledger' : 'Pending Verification'
    }));

    const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
    XLSX.utils.book_append_sheet(wb, ws1, "School Fees Ledger");

    // Sheet 2: Daily Attendance Records for the selected month
    const selectedYear = activeMonthInfo ? activeMonthInfo.year : new Date(currentDate).getFullYear();
    const selectedMonth = activeMonthInfo ? activeMonthInfo.month : new Date(currentDate).getMonth();
    const yearMonthPrefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

    const schoolDaysInMonth = activeTerm && activeTerm.schoolDays 
      ? activeTerm.schoolDays.filter(d => d.startsWith(yearMonthPrefix))
      : [];

    const holidays = activeTerm?.publicHolidays || [];
    const activeStudents = students.filter(s => s.active !== false);

    const sheet2Data: any[] = [];

    activeStudents.forEach(student => {
      schoolDaysInMonth.forEach(dayStr => {
        const afterEnrollment = student.enrollmentDate ? dayStr >= student.enrollmentDate : true;
        if (!afterEnrollment) return; // Skip if student not enrolled yet

        const pRecord = paymentsIndexed.byStudentIdAndDate.get(`${student.id}_${dayStr}`);
        const isHoliday = holidays.includes(dayStr);
        const isAbsent = pRecord?.isAbsent || false;
        const isVerified = pRecord?.verified || false;
        const isTermPayerStudent = isTermPayer(student);
        const isPresentZeroPay = pRecord && pRecord.amount === 0 && !pRecord.isAbsent;

        let attendanceStatus = 'Present';
        let paymentStatus = 'Unpaid';
        let amountGhc = 0;
        let collectedBy = '- -';

        if (isHoliday) {
          attendanceStatus = 'Holiday';
          paymentStatus = 'Exempt (Holiday)';
        } else if (isAbsent) {
          attendanceStatus = 'Absent';
          paymentStatus = 'Exempt (Absent)';
          collectedBy = pRecord?.collectedBy || '- -';
        } else if (isPresentZeroPay) {
          attendanceStatus = 'Present';
          paymentStatus = 'Present (¢0)';
          collectedBy = pRecord?.collectedBy || '- -';
        } else if (pRecord) {
          attendanceStatus = isVerified ? 'Present' : 'Present (Pending)';
          paymentStatus = 'Paid';
          amountGhc = pRecord.amount;
          collectedBy = pRecord.collectedBy;
        } else if (isTermPayerStudent) {
          attendanceStatus = 'Present';
          paymentStatus = 'Paid (Term Scheme)';
          collectedBy = 'System';
        } else {
          attendanceStatus = 'Present';
          paymentStatus = 'Unpaid Arrears';
        }

        sheet2Data.push({
          "Student ID": student.id,
          "Student Name": student.studentName,
          "Class Grade": student.class,
          "Academic Group": student.category || 'ALL',
          "Date": dayStr,
          "Attendance Status": attendanceStatus,
          "Payment Status": paymentStatus,
          "Amount Paid (GHC)": amountGhc,
          "Collected By": collectedBy
        });
      });
    });

    const ws2 = XLSX.utils.json_to_sheet(sheet2Data);
    XLSX.utils.book_append_sheet(wb, ws2, "Daily Attendance Records");

    // Generate XLSX file and trigger download
    const fileDateSuffix = dateFilter ? `_${dateFilter}` : "_FullHistory";
    const monthName = activeMonthInfo ? activeMonthInfo.label.replace(/\s+/g, '_') : "SelectedMonth";
    const filename = `DailySchoolFees_ExcelSheet_${monthName}${fileDateSuffix}.xlsx`;

    XLSX.writeFile(wb, filename);
    setShowExportModal(false);
  };

  // Generate automated Monthly summary & mail it via simulated triggers
  const handleSimulateEmailSend = () => {
    if (!recipientEmail.trim() || !recipientEmail.includes('@')) {
      alert('Provide a valid institutional accounting email.');
      return;
    }

    setEmailLoading(true);
    setTimeout(() => {
      const response = sendMonthlyEmailDraft(recipientEmail);
      
      // Building a true Mailto url so evaluators can test integrated outlook/g-mail
      const subject = encodeURIComponent('DAILY FEE SYSTEM: Verified Auditing Monthly Ledger');
      const body = encodeURIComponent(response.draftContent);
      const mailtoUrl = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;

      setEmailStatus({
        success: true,
        message: response.message,
        textUrl: mailtoUrl
      });
      setEmailLoading(false);
    }, 1200);
  };

  // 1. Consolidated Ledger Calculations (Unified Student Debt Billing Profile)
  const consolidatedLedgerData = useMemo(() => {
    if (!activeTerm || !activeTerm.schoolDays) return [];

    const holidays = activeTerm.publicHolidays || [];
    const holidaysSet = new Set(holidays);
    const termSchoolDays = activeTerm.schoolDays;
    const termSchoolDaysSet = new Set(termSchoolDays);

    return students.filter(s => s.active !== false).map(student => {
      // Find payments for this student inside the active term
      const allStudentPayments = paymentsIndexed.byStudentId.get(student.id) || [];
      const studentPayments = allStudentPayments.filter(p => termSchoolDaysSet.has(p.date));
      
      const absentPayments = studentPayments.filter(p => p.isAbsent);

      const absentCount = absentPayments.length;
      
      // School days elapsed up to currentDate
      const elapsedDays = termSchoolDays.filter(d => {
        const afterEnrollment = student.enrollmentDate ? d >= student.enrollmentDate : true;
        return d <= currentDate && afterEnrollment;
      });

      const teachingDays = elapsedDays.filter(dayStr => !holidaysSet.has(dayStr));
      const presentCount = Math.max(0, teachingDays.length - absentCount);

      // Unpaid days up to currentDate
      const unpaidDays = elapsedDays.filter(dayStr => {
        if (holidaysSet.has(dayStr)) return false;
        return !paymentsIndexed.byStudentIdAndDate.has(`${student.id}_${dayStr}`);
      });
      const unpaidCount = unpaidDays.length;

      // Fees calculations
      const isTermPayerStudent = isTermPayer(student);
      const termFeeAmount = student.termFee || getStudentBaselineTermFee(student.class, systemSettings);
      const legacyDebt = student.legacyDebt || 0;

      let totalCharged = 0;
      let totalPaid = 0;
      let totalDue = 0;

      if (isTermPayerStudent) {
        totalCharged = termFeeAmount + legacyDebt;
        totalPaid = studentPayments.filter(p => !p.isAbsent).reduce((sum, p) => sum + p.amount, 0);
        totalDue = Math.max(0, totalCharged - totalPaid);
      } else {
        totalPaid = studentPayments.filter(p => !p.isAbsent).reduce((sum, p) => sum + p.amount, 0);
        const dailyRate = Math.max(0, 5 - (student.discount || 0));
        totalDue = (unpaidCount * dailyRate) + legacyDebt;
        totalCharged = totalPaid + totalDue;
      }

      // Status classification
      let status: 'SETTLED' | 'ACTIVE_BALANCE' | 'HIGH_DEBT' = 'SETTLED';
      if (totalDue > 0) {
        const threshold = 50;
        status = totalDue >= threshold ? 'HIGH_DEBT' : 'ACTIVE_BALANCE';
      }

      return {
        student,
        presentCount,
        absentCount,
        unpaidCount,
        isTermPayer,
        termFeeAmount,
        legacyDebt,
        totalCharged,
        totalPaid,
        totalDue,
        status,
        paymentsList: studentPayments.sort((a, b) => b.date.localeCompare(a.date))
      };
    }).sort((a, b) => a.student.name.localeCompare(b.student.name));
  }, [students, paymentsIndexed, activeTerm, currentDate]);

  const filteredConsolidatedLedger = useMemo(() => {
    let result = [...consolidatedLedgerData];

    if (ledgerClassFilter !== 'ALL') {
      result = result.filter(item => item.student.class === ledgerClassFilter);
    }

    if (ledgerStatusFilter !== 'ALL') {
      result = result.filter(item => item.status === ledgerStatusFilter);
    }

    if (ledgerSearchQuery.trim()) {
      const q = ledgerSearchQuery.toLowerCase().trim();
      result = result.filter(item => 
        item.student.name.toLowerCase().includes(q) ||
        item.student.id.toLowerCase().includes(q) ||
        (item.student.rollNumber && item.student.rollNumber.toLowerCase().includes(q))
      );
    }

    return result;
  }, [consolidatedLedgerData, ledgerClassFilter, ledgerStatusFilter, ledgerSearchQuery]);

  // Group filtered consolidated ledger by Category and Class, and pre-calculate all stats in one optimized pass
  const ledgerStructure = useMemo(() => {
    const categories: Record<SchoolCategory, Record<StudentClass, typeof filteredConsolidatedLedger>> = {
      'Pre-school': {} as Record<StudentClass, typeof filteredConsolidatedLedger>,
      'Primary': {} as Record<StudentClass, typeof filteredConsolidatedLedger>,
      'JHS': {} as Record<StudentClass, typeof filteredConsolidatedLedger>,
    };

    const preSchoolClasses: StudentClass[] = ['Nursery', 'KG1', 'KG2'];
    const primaryClasses: StudentClass[] = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'];
    const jhsClasses: StudentClass[] = ['B7', 'B8', 'B9'];

    preSchoolClasses.forEach(cls => { categories['Pre-school'][cls] = []; });
    primaryClasses.forEach(cls => { categories['Primary'][cls] = []; });
    jhsClasses.forEach(cls => { categories['JHS'][cls] = []; });

    const categoryStats: Record<SchoolCategory, { studentCount: number; totalCharged: number; totalPaid: number; totalDue: number }> = {
      'Pre-school': { studentCount: 0, totalCharged: 0, totalPaid: 0, totalDue: 0 },
      'Primary': { studentCount: 0, totalCharged: 0, totalPaid: 0, totalDue: 0 },
      'JHS': { studentCount: 0, totalCharged: 0, totalPaid: 0, totalDue: 0 },
    };

    const classStats: Record<StudentClass, { studentCount: number; totalCharged: number; totalPaid: number; totalDue: number }> = {} as any;
    const allClassesList: StudentClass[] = [...preSchoolClasses, ...primaryClasses, ...jhsClasses];
    allClassesList.forEach(cls => {
      classStats[cls] = { studentCount: 0, totalCharged: 0, totalPaid: 0, totalDue: 0 };
    });

    filteredConsolidatedLedger.forEach(item => {
      const s = item.student;
      const cat = s.category || 'Primary';
      const cls = s.class;

      let resolvedCat = cat;
      if (!categories[resolvedCat]) {
        if (preSchoolClasses.includes(cls)) resolvedCat = 'Pre-school';
        else if (jhsClasses.includes(cls)) resolvedCat = 'JHS';
        else resolvedCat = 'Primary';
      }

      if (!categories[resolvedCat][cls]) {
        categories[resolvedCat][cls] = [];
      }
      categories[resolvedCat][cls].push(item);

      if (categoryStats[resolvedCat]) {
        categoryStats[resolvedCat].studentCount++;
        categoryStats[resolvedCat].totalCharged += item.totalCharged;
        categoryStats[resolvedCat].totalPaid += item.totalPaid;
        categoryStats[resolvedCat].totalDue += item.totalDue;
      }

      if (classStats[cls]) {
        classStats[cls].studentCount++;
        classStats[cls].totalCharged += item.totalCharged;
        classStats[cls].totalPaid += item.totalPaid;
        classStats[cls].totalDue += item.totalDue;
      }
    });

    return { categories, categoryStats, classStats };
  }, [filteredConsolidatedLedger]);

  // 2. Cashier Auditing / Teller Reconciliation Calculations
  const cashierAuditingData = useMemo(() => {
    const dailyPayments = payments.filter(p => p.date === auditDate && !p.isAbsent);
    const groups: Record<string, {
      cashierName: string;
      totalPaymentsCount: number;
      verifiedCount: number;
      unverifiedCount: number;
      systemTotalCollected: number;
      verifiedAmount: number;
      unverifiedAmount: number;
      transactionsList: PaymentRecord[];
    }> = {};

    dailyPayments.forEach(p => {
      const cashier = p.collectedBy || 'Unknown Cashier';
      if (!groups[cashier]) {
        groups[cashier] = {
          cashierName: cashier,
          totalPaymentsCount: 0,
          verifiedCount: 0,
          unverifiedCount: 0,
          systemTotalCollected: 0,
          verifiedAmount: 0,
          unverifiedAmount: 0,
          transactionsList: []
        };
      }
      
      groups[cashier].totalPaymentsCount += 1;
      groups[cashier].systemTotalCollected += p.amount;
      groups[cashier].transactionsList.push(p);

      if (p.verified) {
        groups[cashier].verifiedCount += 1;
        groups[cashier].verifiedAmount += p.amount;
      } else {
        groups[cashier].unverifiedCount += 1;
        groups[cashier].unverifiedAmount += p.amount;
      }
    });

    return Object.values(groups).sort((a, b) => b.systemTotalCollected - a.systemTotalCollected);
  }, [payments, auditDate]);

  return (
    <div className="space-y-6 font-sans">
      {/* Top action header card */}
      <div className="bg-neutral-900 border-4 border-neutral-800 p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-2xl font-black uppercase italic tracking-tight text-white leading-none">Accounts & Auditing Station</h2>
          <p className="text-xs text-neutral-400 font-bold mt-2">
            Produce administrative exports, run custom queries, and deliver summaries to the accounting desk.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {/* ⚡ Quick Daily Export (CSV) - 1-Click today's snapshot */}
          <button
            onClick={() => handleQuickDailyCSVExport(currentDate)}
            className="flex-1 sm:flex-initial text-[10px] font-black bg-amber-400 hover:bg-amber-300 text-black py-3.5 px-4 transition-all border-2 border-amber-400 uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
            title="1-Click immediate CSV export of all transactions for the current school day (simplified auditor snapshot)"
            id="btn-quick-daily-csv"
          >
            <Zap size={14} className="fill-black" /> Quick Daily Export (CSV)
          </button>

          {/* 📄 Quick Daily Export (PDF) - 1-Click today's PDF & print view */}
          <button
            onClick={() => handleQuickDailyPDFExport(currentDate)}
            className="flex-1 sm:flex-initial text-[10px] font-black bg-neutral-950 hover:bg-neutral-850 hover:text-white text-amber-400 py-3.5 px-4 transition-all border-2 border-neutral-800 hover:border-amber-400 uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1.5"
            title="1-Click printable daily transactions audit PDF & management dispatch summary"
            id="btn-quick-daily-pdf"
          >
            <FileText size={14} className="text-amber-400" /> Quick Daily Export (PDF)
          </button>

          {/* Email Summary Slider Trigger */}
          <button
            onClick={() => {
              setShowEmailDrawer(true);
              setEmailStatus(null);
            }}
            className="flex-1 sm:flex-initial text-[10px] font-black bg-neutral-950 hover:bg-neutral-850 hover:text-white text-neutral-400 py-3.5 px-4 transition-all border-2 border-neutral-800 uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Mail size={14} /> Summary Email
          </button>

          {/* Preview Report button */}
          <button
            onClick={() => {
              setPreviewPage(1);
              setShowPreviewModal(true);
            }}
            className="flex-1 sm:flex-initial text-[10px] font-black bg-neutral-950 hover:bg-neutral-850 hover:text-white text-emerald-400 py-3.5 px-4 transition-all border-2 border-neutral-800 hover:border-emerald-400 uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Eye size={14} /> Preview Report
          </button>

          {/* Print Debt Summary (PDF) button */}
          <button
            onClick={() => {
              setDirectorsSearchQuery(searchQuery);
              setShowDirectorsDebtModal(true);
            }}
            className="flex-1 sm:flex-initial text-[10px] font-black bg-neutral-950 hover:bg-neutral-850 hover:text-white text-amber-400 py-3.5 px-4 transition-all border-2 border-neutral-800 hover:border-amber-400 uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1.5"
            title={`Generate a simplified outstanding arrears statement for the board (15 pupils per page, minimum debt >= GHC ${directorsMinDebt.toFixed(2)})`}
            id="btn-directors-debt-summary"
          >
            <FileText size={14} className="text-amber-400" /> Print Debt Summary (PDF)
          </button>

          {/* Printable Term Report Card generator */}
          <button
            onClick={() => {
              setShowTermSummaryModal(true);
            }}
            className="flex-1 sm:flex-initial text-[10px] font-black bg-neutral-950 hover:bg-neutral-850 hover:text-white text-emerald-450 py-3.5 px-4 transition-all border-2 border-neutral-800 hover:border-emerald-400 uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1.5"
            title="Generate print-ready Term Report Statements for each student detailing attendance, total payments, and outstanding debt for a selected term."
            id="btn-printable-term-reports"
          >
            <Printer size={14} className="text-emerald-400" /> Print Term Reports (PDF)
          </button>

          {/* Pre-School Canteen Booklet Button */}
          <button
            onClick={() => {
              setShowCanteenBookletModal(true);
            }}
            className="flex-1 sm:flex-initial text-[10px] font-black bg-neutral-950 hover:bg-neutral-850 hover:text-white text-amber-400 py-3.5 px-4 transition-all border-2 border-neutral-800 hover:border-amber-400 uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1.5"
            title="Generate printable hardcopy daily feeding register booklets for Pre-school classes (Nursery, KG1, KG2)"
            id="btn-canteen-feeding-booklet"
          >
            <Utensils size={14} className="text-amber-400" /> Canteen Feeding Booklet (PDF)
          </button>

          {/* Download CSV audit core */}
          <button
            onClick={triggerExcelExport}
            className="flex-1 sm:flex-initial text-[10px] font-black bg-white hover:bg-amber-400 text-black py-3.5 px-4 transition-all uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1.5"
          >
            <FileSpreadsheet size={14} /> Export to Excel
          </button>
        </div>
      </div>

      {/* Aggregate balance banner */}
      <div className="bg-neutral-900 border-4 border-neutral-800 p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md font-mono">
        <div className="space-y-1">
          <p className="text-[10px] text-neutral-500 tracking-widest font-black uppercase">Audit Filter Balance Ledger</p>
          <h3 className="text-3xl font-black text-amber-400 font-mono tracking-tight">GHC {totalsInfo.totalCollected.toFixed(2)}</h3>
          <p className="text-xs text-neutral-450 mt-1 font-sans">Sums of verified check gates for selected search bounds.</p>
        </div>

        <div className="flex flex-wrap gap-4 text-xs">
          <div className="bg-neutral-950 border-2 border-neutral-850 px-5 py-3">
            <span className="text-neutral-500 uppercase text-[9px] block">Query Transactions</span>
            <span className="text-white font-bold">{filteredPayments.length} entries</span>
          </div>
          <div className="bg-neutral-950 border-2 border-neutral-850 px-5 py-3">
            <span className="text-neutral-500 uppercase text-[9px] block">Unverified Rows</span>
            <span className="text-amber-400 font-bold">{totalsInfo.unverifiedCount} rows</span>
          </div>
        </div>
      </div>

      {/* Filter Options box */}
      <div className="bg-neutral-900 border-4 border-neutral-800 p-8 space-y-4">
        <h3 className="text-xs font-black text-neutral-450 uppercase font-mono tracking-widest">Search Filter Controls</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Query search */}
          <div>
            <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">Name, ID, Class, or Status</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-3 text-neutral-500" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, ID, class, or status (paid, absent)..."
                className="w-full bg-neutral-950 border-2 border-neutral-800 py-2.5 pl-9 pr-3 text-xs outline-none text-white focus:border-amber-400 font-mono"
              />
            </div>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">Check In Date</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full bg-neutral-950 border-2 border-neutral-800 py-2.5 px-3 text-xs outline-none font-mono text-white focus:border-amber-400"
            />
          </div>

          {/* Academic categorization Filter */}
          <div>
            <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">Academic Cohort</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-neutral-950 border-2 border-neutral-800 py-2.5 px-3 text-xs outline-none text-white focus:border-amber-400"
            >
              <option value="ALL">All Categories</option>
              <option value="Pre-school">Pre-school</option>
              <option value="Primary">Primary</option>
              <option value="JHS">JHS</option>
            </select>
          </div>

          {/* Class Grade levels Filter */}
          <div>
            <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">Class Grade</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full bg-neutral-950 border-2 border-neutral-800 py-2.5 px-3 text-xs outline-none text-white focus:border-amber-400"
            >
              <option value="ALL">All Grades</option>
              {classes.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 📅 TERM FEE RECORDS COMPLETENESS CALENDAR */}
      <div className="bg-neutral-900 border-4 border-neutral-800 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-800 pb-4 font-mono">
          <div className="space-y-1">
            <span className="text-[10px] text-amber-500 font-mono tracking-widest font-black uppercase block">ACADEMIC AUDIT CENTER</span>
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              <CalendarRange size={18} className="text-amber-400" /> Term Fee Records Completeness Calendar
            </h3>
            <p className="text-xs text-neutral-400 font-sans font-medium">
              Daily visual analysis showing calendar schedules with complete, partial, or missing school fee receipts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCalendar(!showCalendar)}
            className="w-full sm:w-auto text-[9px] font-mono font-black py-2 px-4 border border-neutral-800 hover:border-neutral-700 bg-neutral-950 hover:bg-neutral-850 text-neutral-450 hover:text-white transition-all uppercase tracking-widest cursor-pointer"
          >
            {showCalendar ? '[-] COLLAPSE CALENDAR' : '[+] EXPAND CALENDAR'}
          </button>
        </div>

        {showCalendar && (
          <div className="space-y-6">
            {/* Term-wide summary status banner */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-neutral-950 p-3 border border-neutral-850 space-y-1 font-mono">
                <span className="text-[8px] text-neutral-550 uppercase block">Term School Days</span>
                <span className="text-neutral-300 font-black text-sm">{calendarStats.total} Days</span>
              </div>
              <div className="bg-neutral-950 p-3 border border-neutral-850 space-y-1 font-mono">
                <span className="text-[8px] text-emerald-500 uppercase block">100% Settled Days</span>
                <span className="text-emerald-400 font-black text-sm flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {calendarStats.completed} Days
                </span>
              </div>
              <div className="bg-neutral-950 p-3 border border-neutral-850 space-y-1 font-mono">
                <span className="text-[8px] text-amber-500 uppercase block">Overdue Arrears Days</span>
                <span className="text-amber-400 font-black text-sm flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  {calendarStats.partial} Days
                </span>
              </div>
              <div className="bg-neutral-950 p-3 border border-neutral-850 space-y-1 font-mono">
                <span className="text-[8px] text-red-500 uppercase block">Missing Fee Rows (0%)</span>
                <span className="text-red-400 font-black text-sm flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  {calendarStats.missing} Days
                </span>
              </div>
              <div className="col-span-2 md:col-span-1 bg-neutral-950 p-3 border border-neutral-850 space-y-1 font-mono">
                <span className="text-[8px] text-neutral-500 uppercase block">Future Days</span>
                <span className="text-neutral-400 font-black text-sm">{calendarStats.future} Days</span>
              </div>
            </div>

            {/* Split Pane: Left Calendar Grid, Right Detail Day Inspector */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Grid controls (7 Columns) */}
              <div className="lg:col-span-7 space-y-4">
                {/* Month Tabs */}
                {termMonths.length > 0 && (
                  <div className="flex flex-wrap gap-1 border-b border-neutral-850 pb-2">
                    {termMonths.map((m) => {
                      const mKey = `${m.year}-${m.month}`;
                      const isActive = selectedMonthKey === mKey;
                      return (
                        <button
                          key={mKey}
                          type="button"
                          onClick={() => setSelectedMonthKey(mKey)}
                          className={`px-3 py-1.5 text-[10px] uppercase font-mono tracking-wider transition-all cursor-pointer ${
                            isActive 
                              ? 'bg-amber-405 bg-amber-400 text-black font-extrabold border border-amber-400' 
                              : 'bg-neutral-950 text-neutral-400 border border-neutral-850 hover:bg-neutral-850 hover:text-white'
                          }`}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Grid Container */}
                {activeMonthInfo && (
                  <div className="bg-neutral-950 p-4 border border-neutral-850 space-y-3.5">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-mono font-black uppercase text-amber-400">
                        {activeMonthInfo.label}
                      </h4>
                      <span className="text-[8.5px] text-neutral-500 font-mono tracking-widest uppercase">
                        Select a weekday box to drill down or filter table matches
                      </span>
                    </div>

                    {/* Simple Sunday-Saturday columns header */}
                    <div className="grid grid-cols-7 gap-1.5 text-center">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(dayName => (
                        <div key={dayName} className="text-[9px] font-mono tracking-widest font-black text-neutral-500 uppercase py-1 select-none">
                          {dayName}
                        </div>
                      ))}
                    </div>

                    {/* Days box generator */}
                    <div className="grid grid-cols-7 gap-1.5">
                      {(() => {
                        const { year, month } = activeMonthInfo;
                        const daysInMonth = new Date(year, month + 1, 0).getDate();
                        const firstDayIndex = new Date(year, month, 1).getDay();
                        
                        const slots: React.ReactNode[] = [];
                        
                        // Render empty pads for previous weekdays offset
                        for (let i = 0; i < firstDayIndex; i++) {
                          slots.push(
                            <div 
                              key={`empty-${i}`} 
                              className="aspect-square bg-neutral-950/20 border border-neutral-900/30 select-none font-mono"
                            />
                          );
                        }

                        // Render each calendar month day
                        const activeStudents = students.filter(s => s.active);
                        const activeStudentsCount = activeStudents.length || 1;

                        for (let d = 1; d <= daysInMonth; d++) {
                          const pad = (n: number) => n.toString().padStart(2, '0');
                          const dStr = `${year}-${pad(month + 1)}-${pad(d)}`;
                          const isSchoolDay = activeTerm?.schoolDays.includes(dStr);
                          const isToday = dStr === currentDate;
                          const isSelectedDate = dateFilter === dStr;

                          if (!isSchoolDay) {
                            const holInfo = isHolidayOrVacationDate(dStr, terms, activeTerm);
                            if (holInfo.isHoliday) {
                              slots.push(
                                <div
                                  key={`day-${d}`}
                                  className="aspect-square bg-amber-950/20 border border-amber-500/30 flex flex-col items-center justify-center font-mono text-[10px] select-none text-amber-400 font-bold"
                                  title={`${dStr}: ${holInfo.label || 'Vacation Break / Holiday'} (Exempt - GHC 0.00 Due)`}
                                >
                                  {d}
                                  <span className="text-[7px] text-amber-500/80 font-black">VAC</span>
                                </div>
                              );
                              continue;
                            }
                            // Non-school day (weekend / off-term)
                            slots.push(
                              <div
                                key={`day-${d}`}
                                className="aspect-square bg-neutral-950/20 border border-neutral-900/40 flex flex-col items-center justify-center font-mono text-[10px] select-none text-neutral-600 font-medium"
                                title={`${dStr} (Weekend / Off-term)`}
                              >
                                {d}
                              </div>
                            );
                            continue;
                          }

                          // School Day statistics
                          const paidCountOnDay = activeStudents.filter(s => 
                            payments.some(p => p.studentId === s.id && p.date === dStr)
                          ).length;

                          const isFuture = dStr > currentDate;

                          // Color logic matching status
                          let bgClass = "bg-neutral-900 border-neutral-800 hover:border-neutral-500 text-neutral-300";
                          let dotClass = "bg-neutral-600";

                          if (isFuture) {
                            bgClass = "bg-neutral-900 border-neutral-800/40 border-dashed text-neutral-500";
                            dotClass = "bg-neutral-700";
                          } else if (paidCountOnDay === 0) {
                            // 🔴 Completely missing fee records
                            bgClass = "bg-red-950/30 border-red-900/40 hover:border-red-600 text-red-400";
                            dotClass = "bg-red-500 animate-pulse";
                          } else if (paidCountOnDay < activeStudentsCount) {
                            // 🟡 Partial fee entries
                            bgClass = "bg-amber-950/30 border-amber-900/40 hover:border-amber-600 text-amber-500";
                            dotClass = "bg-amber-500";
                          } else {
                            // 🟢 Fully settled
                            bgClass = "bg-emerald-950/25 border-emerald-900/40 hover:border-emerald-600 text-emerald-400";
                            dotClass = "bg-emerald-500";
                          }

                          slots.push(
                            <button
                              key={`day-${d}`}
                              type="button"
                              onClick={() => {
                                setInspectedDate(dStr);
                                if (dateFilter === dStr) {
                                  setDateFilter(''); // toggle filter
                                } else {
                                  setDateFilter(dStr);
                                }
                              }}
                              onMouseEnter={() => setInspectedDate(dStr)}
                              className={`aspect-square flex flex-col items-center justify-between p-1.5 border font-mono text-[10px] font-bold text-center cursor-pointer transition-all ${bgClass} ${
                                isSelectedDate ? 'ring-2 ring-amber-400 border-amber-400 font-black' : ''
                              } ${isToday ? 'outline-dashed outline-1 outline-offset-1 outline-neutral-400 shadow-lg' : ''}`}
                              title={`${dStr}: ${paidCountOnDay}/${activeStudentsCount} paid. Click to toggle active report bounds.`}
                            >
                              <div className="w-full flex justify-between items-center leading-none">
                                <span className={isToday ? 'text-white font-extrabold underline' : ''}>{d}</span>
                                {isToday && (
                                  <span className="text-[7px] font-mono tracking-tighter text-amber-400 font-black">TODAY</span>
                                )}
                              </div>
                              <div className="w-full flex justify-between items-center leading-none">
                                <span className={`${dotClass} w-2 h-2 rounded-full`} />
                                {!isFuture && (
                                  <span className="text-[7.5px] text-neutral-550 font-bold block">
                                    {paidCountOnDay}/{activeStudentsCount}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        }

                        return slots;
                      })()}
                    </div>
                  </div>
                )}

                {/* Legend bar */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-400 px-1 pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-emerald-950/80 border border-emerald-900 block rounded-xs" />
                    <span>🟢 100% Settled</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-amber-950/80 border border-amber-900 block rounded-xs" />
                    <span>🟡 Partial Days (Arrears)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-red-950/80 border border-red-900 block rounded-xs animate-pulse" />
                    <span className="font-black text-red-400">🔴 Missing Fee Records (0%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 border border-dashed border-neutral-700 block rounded-xs" />
                    <span>Future/Off-term</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Audit Checklist Inspector (5 Columns) */}
              <div className="lg:col-span-5 h-full">
                <div className="bg-neutral-950 border border-neutral-850 p-5 space-y-4 h-full min-h-[310px] flex flex-col justify-between">
                  {inspectedDayDetails ? (
                    inspectedDayDetails.isSchoolDay ? (
                      <div className="space-y-4 flex-1 flex flex-col justify-between">
                        {/* Day Header details */}
                        <div className="border-b border-neutral-850 pb-3">
                          <div className="flex justify-between items-start">
                            <span className="text-[9px] font-mono font-black uppercase tracking-widest bg-amber-950/40 text-amber-400 px-1 py-0.5 border border-amber-900">
                              SCHOOL CALENDAR DAY
                            </span>
                            {dateFilter === inspectedDate && (
                              <span className="text-[8.5px] font-mono font-black uppercase text-emerald-400 flex items-center gap-1 animate-pulse">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> FILTER LOCKED
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-black text-white font-mono uppercase tracking-wide mt-2">
                            {inspectedDayDetails.dayLabel}
                          </h4>
                          <span className="text-[9px] text-neutral-500 font-mono tracking-wider block mt-0.5">
                            Check-in Date: <strong className="text-neutral-450 font-mono">{inspectedDate}</strong>
                          </span>
                        </div>

                        {/* Financial Statistics Card */}
                        <div className="grid grid-cols-2 gap-2 font-mono">
                          <div className="bg-neutral-900/50 p-3 border border-neutral-850">
                            <span className="text-neutral-500 text-[8px] uppercase block">Expected Gates</span>
                            <span className="text-white text-xs font-black">GHC {inspectedDayDetails.expectedGhc.toFixed(2)}</span>
                          </div>
                          <div className="bg-neutral-900/50 p-3 border border-neutral-850">
                            <span className="text-neutral-400 text-[8px] uppercase block">Recorded Fees</span>
                            <span className="text-amber-400 text-xs font-black">GHC {inspectedDayDetails.collectedGhc.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Progress collection Bar */}
                        <div className="space-y-1.5 font-mono">
                          <div className="flex justify-between items-center text-[9px] font-bold text-neutral-400 uppercase">
                            <span>Deposited Ratio</span>
                            <span>
                              {inspectedDayDetails.settledStudents.length} / {inspectedDayDetails.settledStudents.length + inspectedDayDetails.missingStudents.length} Pupils
                            </span>
                          </div>
                          {(() => {
                            const total = inspectedDayDetails.settledStudents.length + inspectedDayDetails.missingStudents.length;
                            const pct = total > 0 ? (inspectedDayDetails.settledStudents.length / total) * 100 : 0;
                            let barColor = "bg-red-500";
                            if (pct >= 100) barColor = "bg-emerald-500";
                            else if (pct > 0) barColor = "bg-amber-500";

                            return (
                              <div className="h-2 w-full bg-neutral-900 border border-neutral-850 rounded-full overflow-hidden">
                                <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                              </div>
                            );
                          })()}
                        </div>

                        {/* Missing Students block inside inspection */}
                        <div className="space-y-2 flex-grow pt-2">
                          <span className="text-[9.5px] font-mono font-black uppercase text-red-400 tracking-wider block underline decoration-red-900/60 pb-1">
                            🔴 Missing Pupils on Date ({inspectedDayDetails.missingStudents.length} delinquent):
                          </span>

                          {inspectedDayDetails.missingStudents.length === 0 ? (
                            <div className="p-3 border border-emerald-900/40 bg-emerald-990/10 text-emerald-400 font-bold font-sans text-xs flex items-center gap-1.5 uppercase tracking-wide">
                              <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                              <span>No arrears! All active pupils paid.</span>
                            </div>
                          ) : (
                            <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 border border-neutral-850 p-2 bg-neutral-950/20 divide-y divide-neutral-900">
                              {inspectedDayDetails.missingStudents.map(student => (
                                <div key={student.id} className="pt-1.5 first:pt-0 pb-1 flex justify-between items-center text-[10px] font-mono">
                                  <div>
                                    <span className="text-white uppercase font-black font-sans">{student.name}</span>
                                    <span className="text-neutral-500 text-[9px] block">
                                      {student.class} | Guardian: {student.guardianPhone || 'N/A'}
                                    </span>
                                  </div>
                                  <span className="text-red-500 font-black text-[11px] shrink-0 font-mono">GHC 5.00</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Interactive Toggle Button feedback */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (dateFilter === inspectedDate) {
                                setDateFilter('');
                              } else {
                                setDateFilter(inspectedDate);
                              }
                            }}
                            className={`w-full py-2.5 text-[9px] font-mono font-black uppercase border tracking-widest cursor-pointer transition-all ${
                              dateFilter === inspectedDate
                                ? 'bg-amber-400 text-black border-amber-400 font-extrabold'
                                : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:text-white hover:border-neutral-700'
                            }`}
                          >
                            {dateFilter === inspectedDate ? '✖ CLEAR DATE FILTER' : '⚡ FOCUS LEDGER TABLE TO THIS DAY'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 flex flex-col items-center justify-center text-center space-y-2.5 flex-1 select-none font-mono">
                        <Calendar size={32} className="text-neutral-700 block animate-pulse" />
                        <h5 className="text-[11px] font-black text-neutral-400 uppercase tracking-widest">
                          Non-Academic Rest Day
                        </h5>
                        <p className="text-[10px] text-neutral-500 font-sans leading-relaxed">
                          This date ({inspectedDate}) falls on a weekend, school vacation interval, or offtrack public rest day with no fees scheduled.
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="p-4 flex flex-col items-center justify-center text-center space-y-3.5 flex-1 select-none">
                      <TrendingUp size={36} className="text-neutral-600 block" />
                      <div>
                        <h5 className="text-xs font-mono font-black text-neutral-300 uppercase tracking-wider">
                          Live Active Audit Checklist
                        </h5>
                        <p className="text-[10.5px] text-neutral-400 font-sans leading-relaxed mt-1">
                          Hover your cursor over any active grid box day to instantly inspect registered fee deposits, verify security check rates, and retrieve targeted lists of delinquent pupils.
                        </p>
                      </div>

                      {/* Cumulative integrity progress summary */}
                      <div className="w-full bg-neutral-900 border border-neutral-850 p-3 text-left space-y-2 font-mono text-[9px]">
                        <span className="text-neutral-500 font-black uppercase text-[8px] block">Current Term Health</span>
                        <div className="space-y-1">
                          <div className="flex justify-between font-bold text-neutral-400">
                            <span>TOTAL SETTLED RATES</span>
                            <span className="text-emerald-400 font-black">
                              {calendarStats.total > 0 ? Math.round((calendarStats.completed / calendarStats.total) * 100) : 0}% COMPLETENESS
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-neutral-950 border border-neutral-850 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-full transition-all" 
                              style={{ width: `${calendarStats.total > 0 ? (calendarStats.completed / calendarStats.total) * 100 : 0}%` }} 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="text-[8.5px] font-mono uppercase text-neutral-500 tracking-wider text-center pt-2.5 border-t border-neutral-900 leading-none">
                    Saako Holy Child Trust • Audits Version V1.4
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* View Selector Tabs and Header */}
      <div className="bg-neutral-900 border-4 border-neutral-800 p-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <CalendarRange size={18} className="text-amber-400" />
          <h3 className="text-xs font-black uppercase text-white font-mono tracking-widest">Fee Ledger Query Workstation</h3>
        </div>
        
        <div className="flex bg-neutral-950 p-1 border border-neutral-850 gap-1 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setAuditViewMode('monthly')}
            className={`flex-1 md:flex-initial px-4 py-2 text-[10px] uppercase font-mono font-black tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              auditViewMode === 'monthly'
                ? 'bg-amber-400 text-black'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <TrendingUp size={12} />
            Monthly Summary MTD View
          </button>
          <button
            type="button"
            onClick={() => setAuditViewMode('ledger')}
            className={`flex-1 md:flex-initial px-4 py-2 text-[10px] uppercase font-mono font-black tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              auditViewMode === 'ledger'
                ? 'bg-amber-400 text-black'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Users size={12} />
            Consolidated Ledger
          </button>
          <button
            type="button"
            onClick={() => setAuditViewMode('teller')}
            className={`flex-1 md:flex-initial px-4 py-2 text-[10px] uppercase font-mono font-black tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              auditViewMode === 'teller'
                ? 'bg-amber-400 text-black'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Coins size={12} />
            Teller Reconciliation
          </button>
          <button
            type="button"
            onClick={() => setAuditViewMode('audit')}
            className={`flex-1 md:flex-initial px-4 py-2 text-[10px] uppercase font-mono font-black tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              auditViewMode === 'audit'
                ? 'bg-amber-400 text-black'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <FileText size={12} />
            System Activity Logs
          </button>
          <button
            type="button"
            onClick={() => setAuditViewMode('database')}
            className={`flex-1 md:flex-initial px-4 py-2 text-[10px] uppercase font-mono font-black tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              auditViewMode === 'database'
                ? 'bg-amber-400 text-black'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Database size={12} />
            Database Connect & Backups
          </button>
        </div>
      </div>

      {auditViewMode === 'monthly' ? (
        /* Monthly Aggregated MTD Audit View */
        <div className="bg-neutral-900 border-4 border-neutral-800 p-6 space-y-6">
          {/* Month selector and main numbers overview */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-neutral-950 border border-neutral-850 p-4 font-mono">
            <div className="space-y-1.5 w-full lg:w-auto">
              <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest font-mono">Select Audit Month</label>
              <select
                value={auditSelectedMonth}
                onChange={(e) => {
                  setAuditSelectedMonth(e.target.value);
                  setExpandedDailyAuditDate('');
                }}
                className="w-full lg:w-64 bg-neutral-900 border-2 border-neutral-800 py-1.5 px-3 text-xs outline-none text-white focus:border-amber-400 font-bold"
              >
                {availableMonths.map(m => (
                  <option key={m} value={m}>{formatMonthKey(m)}</option>
                ))}
              </select>
            </div>

            {/* Quick stats for this month */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto text-[10px]">
              <div className="bg-neutral-900 border border-neutral-850 p-3 space-y-1">
                <span className="text-neutral-500 uppercase font-black text-[9px]">MTD Collections</span>
                <span className="text-white font-black text-xs block font-mono">
                  GHC {monthlyPayments.reduce((s, p) => s + p.amount, 0).toFixed(2)}
                </span>
              </div>
              <div className="bg-neutral-900 border border-neutral-850 p-3 space-y-1">
                <span className="text-emerald-500 uppercase font-black text-[9px]">Verified & Audited</span>
                <span className="text-emerald-400 font-black text-xs block font-mono">
                  GHC {monthlyPayments.filter(p => p.verified).reduce((s, p) => s + p.amount, 0).toFixed(2)}
                </span>
              </div>
              <div className="bg-neutral-900 border border-neutral-850 p-3 space-y-1">
                <span className="text-amber-500 uppercase font-black text-[9px]">Pending Approval</span>
                <span className={`font-black text-xs block font-mono ${monthlyPayments.some(p => !p.verified) ? 'text-amber-400 animate-pulse' : 'text-neutral-300'}`}>
                  GHC {monthlyPayments.filter(p => !p.verified).reduce((s, p) => s + p.amount, 0).toFixed(2)}
                </span>
              </div>
              <div className="bg-neutral-900 border border-neutral-850 p-3 space-y-1">
                <span className="text-cyan-500 uppercase font-black text-[9px]">Audit Match Rate</span>
                <span className="text-cyan-400 font-black text-xs block font-mono">
                  {((monthlyPayments.filter(p => p.verified).length / (monthlyPayments.length || 1)) * 100).toFixed(1)}% ({monthlyPayments.filter(p => p.verified).length}/{monthlyPayments.length})
                </span>
              </div>
            </div>
          </div>

          {/* Table of aggregated days */}
          <div className="border border-neutral-850 overflow-hidden rounded-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-neutral-950 border-b border-neutral-850 text-[10px] font-black text-neutral-450 uppercase tracking-widest font-mono">
                    <th className="p-4 font-mono">Daily Ledger Date</th>
                    <th className="p-4 text-right">Fee Rate Volume</th>
                    <th className="p-4 text-right text-emerald-400">Audited Amount</th>
                    <th className="p-4 text-right text-amber-400">Pending Amount</th>
                    <th className="p-4 text-center">Receipts / Checks Status</th>
                    <th className="p-4 text-right">Audit Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850 font-sans text-neutral-300">
                  {aggregatedDays.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-neutral-500 font-black uppercase tracking-widest text-xs font-mono">
                        No daily records found in {formatMonthKey(auditSelectedMonth)}.
                      </td>
                    </tr>
                  ) : (
                    aggregatedDays.map((day) => {
                      const isExpanded = expandedDailyAuditDate === day.date;
                      const needsAudit = day.unverifiedAmount > 0;
                      return (
                        <React.Fragment key={day.date}>
                          <tr className={`hover:bg-neutral-950/25 transition-all ${isExpanded ? 'bg-neutral-950/50 border-l-4 border-amber-400' : ''}`}>
                            <td className="p-4 font-mono flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setExpandedDailyAuditDate(isExpanded ? '' : day.date)}
                                className="text-neutral-500 hover:text-white transition-colors cursor-pointer font-black text-[10px]"
                              >
                                {isExpanded ? '▼' : '▶'}
                              </button>
                              <span className="font-extrabold text-neutral-250">{day.date}</span>
                            </td>
                            <td className="p-4 text-right font-black font-mono text-white">
                              GHC {day.totalAmount.toFixed(2)}
                            </td>
                            <td className="p-4 text-right font-black font-mono text-emerald-400 font-bold">
                              GHC {day.verifiedAmount.toFixed(2)}
                            </td>
                            <td className="p-4 text-right font-black font-mono">
                              {day.unverifiedAmount > 0 ? (
                                <span className="text-amber-400 font-black">
                                  GHC {day.unverifiedAmount.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-neutral-550">—</span>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 font-black text-[9px] uppercase tracking-wider rounded-xs font-mono border ${
                                day.verifiedCount === day.totalCount
                                  ? 'bg-emerald-950/50 text-emerald-400 border-emerald-900/60'
                                  : 'bg-amber-950/50 text-amber-400 border-amber-900/60'
                              }`}>
                                {day.verifiedCount === day.totalCount ? '✓ FULLY VERIFIED' : '⚠ PENDING AUDIT'} ({day.verifiedCount} / {day.totalCount})
                              </span>
                            </td>
                            <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setDateFilter(day.date);
                                  setAuditViewMode('daily');
                                }}
                                className="px-2.5 py-1 text-[9px] font-black bg-neutral-950 text-neutral-400 border border-neutral-800 hover:border-neutral-600 hover:text-white uppercase tracking-widest transition-all cursor-pointer font-mono"
                                title="Set Date filter and jump back to Daily List views"
                              >
                                Drill Down
                              </button>
                              
                              {needsAudit && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const unverifiedOnDate = payments.filter(p => p.date === day.date && !p.verified);
                                    unverifiedOnDate.forEach(p => verifyPayment(p.id));
                                  }}
                                  className="px-2.5 py-1 text-[9px] font-black bg-amber-400 text-black uppercase tracking-widest hover:bg-amber-300 transition-all cursor-pointer font-mono"
                                  title="Approve and verify all unapproved logs for this date"
                                >
                                  Audit Pass
                                </button>
                              )}
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="bg-neutral-950/70">
                              <td colSpan={6} className="p-4 font-mono text-[10px] text-neutral-400 space-y-3">
                                <div className="border border-neutral-850 p-4 space-y-3 bg-neutral-950">
                                  <h4 className="text-[10px] font-black tracking-widest uppercase text-neutral-300 border-b border-neutral-850 pb-2">
                                    Class-by-Class Revenue Distribution on {day.date}
                                  </h4>
                                  
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                    {Object.entries(day.classTotals).map(([clsName, rawAmount]) => {
                                      const amount = rawAmount as number;
                                      const share = (amount / day.totalAmount) * 100;
                                      return (
                                        <div key={clsName} className="p-2 bg-neutral-900 border border-neutral-850/60 space-y-1">
                                          <div className="flex justify-between font-black text-neutral-300 text-[9px]">
                                            <span>CLASS: <span className="text-amber-400">{clsName}</span></span>
                                            <span>{share.toFixed(0)}%</span>
                                          </div>
                                          <div className="text-xs font-bold text-white font-mono">
                                            GHC {amount.toFixed(2)}
                                          </div>
                                          <div className="w-full bg-neutral-950 h-1 rounded overflow-hidden">
                                            <div className="bg-amber-400 h-full" style={{ width: `${share}%` }}></div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : auditViewMode === 'ledger' ? (
        /* ==================== 1. CONSOLIDATED LEDGER VIEW ==================== */
        <div className="space-y-6">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-neutral-900 border-4 border-neutral-800 p-4 space-y-2 font-mono">
              <span className="text-neutral-500 uppercase text-[9px] block tracking-widest font-black">Total Active Pupils</span>
              <span className="text-xl font-black text-white">{students.filter(s => s.active).length} Pupils</span>
              <span className="text-[10px] text-neutral-450 block font-sans">Enrolled in database</span>
            </div>
            <div className="bg-neutral-900 border-4 border-neutral-800 p-4 space-y-2 font-mono">
              <span className="text-neutral-500 uppercase text-[9px] block tracking-widest font-black">Total Billed Charge</span>
              <span className="text-xl font-black text-amber-400">GHC {consolidatedLedgerData.reduce((sum, item) => sum + item.totalCharged, 0).toFixed(2)}</span>
              <span className="text-[10px] text-neutral-450 block font-sans">Term + Legacy + Daily</span>
            </div>
            <div className="bg-neutral-900 border-4 border-neutral-800 p-4 space-y-2 font-mono">
              <span className="text-neutral-500 uppercase text-[9px] block tracking-widest font-black">Total Payments Cleared</span>
              <span className="text-xl font-black text-emerald-400 font-mono">GHC {consolidatedLedgerData.reduce((sum, item) => sum + item.totalPaid, 0).toFixed(2)}</span>
              <span className="text-[10px] text-neutral-450 block font-sans">Verified receipts matching</span>
            </div>
            <div className="bg-neutral-900 border-4 border-neutral-800 p-4 space-y-2 font-mono">
              <span className="text-xl font-black text-red-400 font-mono">GHC {consolidatedLedgerData.reduce((sum, item) => sum + item.totalDue, 0).toFixed(2)}</span>
              <span className="text-neutral-500 uppercase text-[9px] block tracking-widest font-black">Consolidated Debt Due</span>
              <span className="text-[10px] text-neutral-450 block font-sans">Outstanding system arrears</span>
            </div>
            <div className="bg-neutral-900 border-4 border-neutral-800 p-4 space-y-2 font-mono">
              <span className="text-neutral-500 uppercase text-[9px] block tracking-widest font-black">High-Debt Accounts</span>
              <span className="text-xl font-black text-amber-500">{consolidatedLedgerData.filter(item => item.status === 'HIGH_DEBT').length} Pupils</span>
              <span className="text-[10px] text-neutral-450 block font-sans">Balance ≥ GHC 50.00</span>
            </div>
          </div>

          {/* Filters Area */}
          <div className="bg-neutral-900 border-4 border-neutral-800 p-6 space-y-4">
            <h4 className="text-xs font-black text-neutral-450 uppercase font-mono tracking-widest">Consolidated Ledger Filters</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">Search Name or ID</label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 text-neutral-500" size={14} />
                  <input
                    type="text"
                    value={ledgerSearchQuery}
                    onChange={(e) => setLedgerSearchQuery(e.target.value)}
                    placeholder="Search pupil name or ID..."
                    className="w-full bg-neutral-950 border-2 border-neutral-800 py-2.5 pl-9 pr-3 text-xs outline-none text-white focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">Class Grade Filter</label>
                <select
                  value={ledgerClassFilter}
                  onChange={(e) => setLedgerClassFilter(e.target.value)}
                  className="w-full bg-neutral-950 border-2 border-neutral-800 py-2.5 px-3 text-xs outline-none text-white focus:border-amber-400"
                >
                  <option value="ALL">All Grades</option>
                  {classes.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">Debt Status Filter</label>
                <select
                  value={ledgerStatusFilter}
                  onChange={(e) => setLedgerStatusFilter(e.target.value)}
                  className="w-full bg-neutral-950 border-2 border-neutral-800 py-2.5 px-3 text-xs outline-none text-white focus:border-amber-400"
                >
                  <option value="ALL">All Accounts</option>
                  <option value="SETTLED">Fully Settled (GHC 0.00)</option>
                  <option value="ACTIVE_BALANCE">Outstanding Arrears (&lt; GHC 50.00)</option>
                  <option value="HIGH_DEBT">High Debt Flagged (≥ GHC 50.00)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Workstation Scroll Optimization Header */}
          <div className="bg-neutral-900 border-4 border-neutral-800 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-neutral-950 border-b border-neutral-800">
              <div className="text-[10px] font-black uppercase text-neutral-400 font-mono tracking-wider">
                Workstation Scroll Control Panel
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setExpandedCategories({ 'Pre-school': true, 'Primary': true, 'JHS': true });
                    setExpandedClasses({
                      'Nursery': true, 'KG1': true, 'KG2': true,
                      'B1': true, 'B2': true, 'B3': true, 'B4': true, 'B5': true, 'B6': true,
                      'B7': true, 'B8': true, 'B9': true
                    });
                  }}
                  className="px-3 py-1.5 text-[9px] font-black bg-neutral-900 hover:bg-neutral-850 text-amber-400 border border-neutral-800 hover:border-amber-400 uppercase tracking-widest cursor-pointer transition-colors"
                >
                  Expand All Divisions
                </button>
                <button
                  onClick={() => {
                    setExpandedCategories({ 'Pre-school': false, 'Primary': false, 'JHS': false });
                    setExpandedClasses({
                      'Nursery': false, 'KG1': false, 'KG2': false,
                      'B1': false, 'B2': false, 'B3': false, 'B4': false, 'B5': false, 'B6': false,
                      'B7': false, 'B8': false, 'B9': false
                    });
                  }}
                  className="px-3 py-1.5 text-[9px] font-black bg-neutral-900 hover:bg-neutral-850 text-neutral-400 border border-neutral-800 uppercase tracking-widest cursor-pointer transition-colors"
                >
                  Collapse All
                </button>
              </div>
            </div>

            {/* Foldable Categories & Classes List */}
            <div>
              {filteredConsolidatedLedger.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 font-black uppercase tracking-widest text-xs font-mono">
                  No billing profiles match your query filters.
                </div>
              ) : (
                ((['Pre-school', 'Primary', 'JHS'] as SchoolCategory[]).map(cat => {
                  const catStats = ledgerStructure.categoryStats[cat];
                  if (!catStats || catStats.studentCount === 0) return null;

                  const isCatExpanded = expandedCategories[cat];
                  const categoryFullNames: Record<SchoolCategory, string> = {
                    'Pre-school': 'PRE-SCHOOL DIVISION (NURSERY - KG2)',
                    'Primary': 'PRIMARY SCHOOL DIVISION (B1 - B6)',
                    'JHS': 'JUNIOR HIGH SCHOOL DIVISION (B7 - B9)'
                  };
                  const categoryClasses: Record<SchoolCategory, StudentClass[]> = {
                    'Pre-school': ['Nursery', 'KG1', 'KG2'],
                    'Primary': ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'],
                    'JHS': ['B7', 'B8', 'B9']
                  };
                  const classesInThisCat = categoryClasses[cat];

                  return (
                    <div key={cat} className="border-b border-neutral-800 last:border-0">
                      {/* Category Collapsible Header */}
                      <div 
                        onClick={() => setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }))}
                        className="flex items-center justify-between p-4 bg-neutral-950 hover:bg-neutral-900 cursor-pointer transition-colors border-l-4 border-amber-500"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                          <div className="flex items-center gap-1.5">
                            {isCatExpanded ? <ChevronDown size={16} className="text-amber-400" /> : <ChevronRight size={16} className="text-amber-400" />}
                            <span className="text-xs font-black tracking-widest text-white uppercase font-mono">{categoryFullNames[cat]}</span>
                          </div>
                          <span className="text-[10px] font-mono text-neutral-400">
                            ({catStats.studentCount} active profiles)
                          </span>
                        </div>
                        
                        {/* Division Summary Stats */}
                        <div className="hidden md:flex items-center gap-6 text-[10px] font-mono">
                          <div><span className="text-neutral-500 uppercase">Charged:</span> <span className="text-neutral-300 font-bold">GHC {catStats.totalCharged.toFixed(2)}</span></div>
                          <div><span className="text-neutral-500 uppercase">Paid:</span> <span className="text-emerald-400 font-bold">GHC {catStats.totalPaid.toFixed(2)}</span></div>
                          <div><span className="text-neutral-500 uppercase">Due:</span> <span className={`${catStats.totalDue > 0 ? 'text-red-400 font-black' : 'text-neutral-400'}`}>GHC {catStats.totalDue.toFixed(2)}</span></div>
                        </div>
                      </div>

                      {/* Grade Classes under Category */}
                      {isCatExpanded && (
                        <div className="p-4 space-y-4 bg-neutral-900/40">
                          {classesInThisCat.map(cls => {
                            const classStats = ledgerStructure.classStats[cls];
                            if (!classStats || classStats.studentCount === 0) return null;

                            const isClassExpanded = expandedClasses[cls];
                            const studentsInClass = ledgerStructure.categories[cat][cls] || [];

                            return (
                              <div key={cls} className="bg-neutral-950 border border-neutral-850 rounded-sm overflow-hidden">
                                {/* Class Header */}
                                <div
                                  onClick={() => setExpandedClasses(prev => ({ ...prev, [cls]: !prev[cls] }))}
                                  className="flex items-center justify-between px-4 py-3 bg-neutral-900 hover:bg-neutral-850 cursor-pointer transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    {isClassExpanded ? <ChevronDown size={14} className="text-neutral-400" /> : <ChevronRight size={14} className="text-neutral-400" />}
                                    <span className="text-xs font-bold text-amber-400 font-mono">GRADE: {cls}</span>
                                    <span className="text-[10px] text-neutral-500">({classStats.studentCount} pupils)</span>
                                  </div>

                                  <div className="flex items-center gap-4 text-[9.5px] font-mono">
                                    <span className="hidden sm:inline text-neutral-500">Charged: GHC {classStats.totalCharged.toFixed(2)}</span>
                                    <span className="hidden sm:inline text-emerald-400">Paid: GHC {classStats.totalPaid.toFixed(2)}</span>
                                    <span className={`font-bold ${classStats.totalDue > 0 ? 'text-red-400' : 'text-neutral-400'}`}>
                                      Due: GHC {classStats.totalDue.toFixed(2)}
                                    </span>
                                  </div>
                                </div>

                                {/* Class Table of Pupils */}
                                {isClassExpanded && (
                                  <div className="overflow-x-auto border-t border-neutral-850">
                                    <table className="w-full text-left text-xs">
                                      <thead>
                                        <tr className="bg-neutral-950 border-b border-neutral-850 text-[9px] font-black text-neutral-400 uppercase tracking-widest font-mono">
                                          <th className="p-3 pl-4">Student Info</th>
                                          <th className="p-3">Class / Category</th>
                                          <th className="p-3">Billing Scheme</th>
                                          <th className="p-3 text-right">Legacy Debt</th>
                                          <th className="p-3 text-right">Total Charged</th>
                                          <th className="p-3 text-right">Total Paid</th>
                                          <th className="p-3 text-right">Balance Due</th>
                                          <th className="p-3 text-center">Audit Status</th>
                                          <th className="p-3 pr-4 text-center">Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-neutral-850 text-neutral-300">
                                        {studentsInClass.map(item => {
                                          const s = item.student;
                                          return (
                                            <tr key={s.id} className="hover:bg-neutral-900/40 transition-colors">
                                              <td className="p-3 pl-4 font-bold text-white">
                                                <div className="font-sans text-xs">{s.name}</div>
                                                <div className="text-[9px] font-mono text-neutral-400">{s.id} {s.rollNumber ? `• Roll: ${s.rollNumber}` : ''}</div>
                                              </td>
                                              <td className="p-3 font-mono">
                                                <span className="text-amber-400 font-bold text-xs">{s.class}</span>
                                                <span className="text-neutral-500 text-[9px] block font-sans">{s.category}</span>
                                              </td>
                                              <td className="p-3 font-bold text-xs">
                                                {item.isTermPayer ? (
                                                  <span className="inline-block text-[8px] uppercase px-1.5 py-0.5 bg-green-950 text-green-400 border border-green-900">
                                                    Term: GHC {item.termFeeAmount}
                                                  </span>
                                                ) : (
                                                  <span className="inline-block text-[8px] uppercase px-1.5 py-0.5 bg-blue-950 text-blue-400 border border-blue-900">
                                                    Daily: GHC 5 Gate
                                                  </span>
                                                )}
                                              </td>
                                              <td className="p-3 text-right font-mono text-neutral-400">
                                                GHC {item.legacyDebt.toFixed(2)}
                                              </td>
                                              <td className="p-3 text-right font-mono text-neutral-200">
                                                GHC {item.totalCharged.toFixed(2)}
                                              </td>
                                              <td className="p-3 text-right font-mono text-emerald-400">
                                                GHC {item.totalPaid.toFixed(2)}
                                              </td>
                                              <td className={`p-3 text-right font-mono font-black ${item.totalDue > 0 ? 'text-red-400' : 'text-neutral-400'}`}>
                                                GHC {item.totalDue.toFixed(2)}
                                              </td>
                                              <td className="p-3 text-center">
                                                {item.status === 'SETTLED' ? (
                                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-neutral-950 text-emerald-400 text-[8px] uppercase tracking-widest font-black border border-neutral-850">
                                                    <CheckCircle2 size={8} /> Settle
                                                  </span>
                                                ) : item.status === 'HIGH_DEBT' ? (
                                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-950/40 text-red-400 text-[8px] uppercase tracking-widest font-black border border-red-900/40 animate-pulse">
                                                    <AlertTriangle size={8} /> High Debt
                                                  </span>
                                                ) : (
                                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-950/40 text-amber-400 text-[8px] uppercase tracking-widest font-black border border-amber-900/40">
                                                    <Info size={8} /> Arrears
                                                  </span>
                                                )}
                                              </td>
                                              <td className="p-3 pr-4 text-center">
                                                <div className="flex justify-center items-center gap-2">
                                                  <button
                                                    onClick={() => setSelectedLedgerStudentId(s.id)}
                                                    className="px-2 py-1 text-[8px] font-black bg-neutral-950 hover:bg-neutral-850 hover:text-white border border-neutral-800 uppercase tracking-widest cursor-pointer"
                                                    title="View granular ledger details, invoices and print transcript"
                                                  >
                                                    View Ledger
                                                  </button>
                                                  
                                                  {s.guardianPhone && item.totalDue > 0 && (
                                                    <button
                                                      onClick={async () => {
                                                        const message = `Reminder: Your ward ${s.name} has an outstanding school fee balance of GHC ${item.totalDue.toFixed(2)} (Total Billed: GHC ${item.totalCharged.toFixed(2)}, Paid: GHC ${item.totalPaid.toFixed(2)}). Please settle this balance promptly. Thank you.`;
                                                        const resp = await sendautomatedWhatsApp(s.guardianPhone || '', message, s.id, s.name, 'debt-reminder');
                                                        if (resp.success) {
                                                          alert(`WhatsApp debt warning sent to guardian phone: ${s.guardianPhone}`);
                                                        } else {
                                                          alert(`Error dispatching warning: ${resp.error}`);
                                                        }
                                                      }}
                                                      className="px-2 py-1 text-[8px] font-black bg-emerald-600 hover:bg-emerald-500 text-white uppercase tracking-widest cursor-pointer flex items-center gap-1"
                                                      title="Send instant WhatsApp balance statement to guardian"
                                                    >
                                                      <MessageSquare size={8} /> Alert
                                                    </button>
                                                  )}
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
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }))
              )}
            </div>
          </div>
        </div>
      ) : auditViewMode === 'teller' ? (
        /* ==================== 2. END OF DAY CASHIER AUDITING / TELLER RECONCILIATION ==================== */
        <div className="space-y-6">
          {/* Calendar selector and stats row */}
          <div className="bg-neutral-900 border-4 border-neutral-800 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1.5">
              <span className="text-[10px] text-amber-500 font-mono tracking-widest font-black uppercase block">AUDITING COMMAND CONSOLE</span>
              <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Coins size={20} className="text-amber-400 animate-bounce" /> Cashier Auditing & Teller Reconciliation
              </h3>
              <p className="text-xs text-neutral-450 font-sans font-bold leading-normal">
                Select a business day to audit physical cash received, calculate variances, and lock teller sign-offs.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-neutral-950 p-2 border border-neutral-850 w-full md:w-auto">
              <Calendar size={14} className="text-neutral-500 ml-1" />
              <input
                type="date"
                value={auditDate}
                onChange={(e) => {
                  setAuditDate(e.target.value);
                  setSelectedTellerForAudit(null);
                }}
                className="bg-transparent border-0 text-xs font-mono font-black text-white outline-none focus:ring-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Aggregated Daily Teller Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-neutral-900 border-4 border-neutral-800 p-4 space-y-1.5 font-mono">
              <span className="text-neutral-500 uppercase text-[8.5px] block font-black">Audit Business Date</span>
              <span className="text-xl font-black text-amber-400">{auditDate}</span>
              <span className="text-[10px] text-neutral-450 font-sans block">Currently inspected day</span>
            </div>
            <div className="bg-neutral-900 border-4 border-neutral-800 p-4 space-y-1.5 font-mono">
              <span className="text-neutral-500 uppercase text-[8.5px] block font-black">Daily System Collections</span>
              <span className="text-xl font-black text-white">
                GHC {cashierAuditingData.reduce((sum, item) => sum + item.systemTotalCollected, 0).toFixed(2)}
              </span>
              <span className="text-[10px] text-neutral-450 font-sans block">
                {cashierAuditingData.reduce((sum, item) => sum + item.totalPaymentsCount, 0)} total receipts filed
              </span>
            </div>
            <div className="bg-neutral-900 border-4 border-neutral-800 p-4 space-y-1.5 font-mono">
              <span className="text-neutral-500 uppercase text-[8.5px] block font-black">Physical Cash Audited</span>
              <span className="text-xl font-black text-emerald-400">
                GHC {cashierAuditingData.reduce((sum, item) => {
                  const inputVal = parseFloat(tellerPhysicalCashInputs[item.cashierName] || '');
                  return sum + (isNaN(inputVal) ? item.systemTotalCollected : inputVal);
                }, 0).toFixed(2)}
              </span>
              <span className="text-[10px] text-neutral-450 font-sans block">Reported in drawers</span>
            </div>
            <div className="bg-neutral-900 border-4 border-neutral-800 p-4 space-y-1.5 font-mono">
              <span className="text-neutral-500 uppercase text-[8.5px] block font-black">Teller Variance Sum</span>
              {(() => {
                const totalVariance = cashierAuditingData.reduce((sum, item) => {
                  const inputVal = parseFloat(tellerPhysicalCashInputs[item.cashierName] || '');
                  const physicalVal = isNaN(inputVal) ? item.systemTotalCollected : inputVal;
                  return sum + (physicalVal - item.systemTotalCollected);
                }, 0);
                return (
                  <span className={`text-xl font-black block ${totalVariance === 0 ? 'text-neutral-300' : totalVariance > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                    GHC {totalVariance.toFixed(2)} {totalVariance === 0 ? '(Balanced)' : totalVariance > 0 ? '(Overage)' : '(Shortage)'}
                  </span>
                );
              })()}
              <span className="text-[10px] text-neutral-450 font-sans block">Total physical cash vs system ledger</span>
            </div>
          </div>

          {/* Cashier List and Reconciliation Panel */}
          <div className="bg-neutral-900 border-4 border-neutral-800 p-6 space-y-4">
            <h4 className="text-xs font-black text-neutral-450 uppercase font-mono tracking-widest">Active Tellers & Drawer Verifications</h4>
            
            {cashierAuditingData.length === 0 ? (
              <div className="p-12 text-center text-neutral-500 font-black uppercase tracking-widest font-mono border-2 border-dashed border-neutral-800 bg-neutral-950/40 text-xs">
                No fee collections logged by any cashier/teacher on this date ({auditDate}).
              </div>
            ) : (
              <div className="space-y-4">
                {cashierAuditingData.map((cashier) => {
                  const name = cashier.cashierName;
                  const physicalCash = parseFloat(tellerPhysicalCashInputs[name] || '');
                  const isInputFilled = !isNaN(physicalCash);
                  const activePhysical = isInputFilled ? physicalCash : cashier.systemTotalCollected;
                  const variance = activePhysical - cashier.systemTotalCollected;
                  const isSigned = !!tellerSignOffs[name];

                  return (
                    <div key={name} className="bg-neutral-950 border border-neutral-800 p-5 space-y-4">
                      {/* Cashier Metadata row */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-900 pb-3">
                        <div className="space-y-1">
                          <span className="text-[10px] text-amber-500 font-mono tracking-widest font-black uppercase block">Teller Profile</span>
                          <h5 className="text-base font-black text-white">{name}</h5>
                        </div>

                        <div className="flex flex-wrap gap-2 text-[10px]">
                          <div className="bg-neutral-900 px-3 py-1.5 border border-neutral-850">
                            <span className="text-neutral-500 uppercase block text-[8px]">Receipts Issued</span>
                            <span className="text-white font-extrabold">{cashier.totalPaymentsCount} check-ins</span>
                          </div>
                          <div className="bg-neutral-900 px-3 py-1.5 border border-neutral-850">
                            <span className="text-neutral-500 uppercase block text-[8px]">System GHC Amount</span>
                            <span className="text-amber-400 font-extrabold font-mono">GHC {cashier.systemTotalCollected.toFixed(2)}</span>
                          </div>
                          <div className="bg-neutral-900 px-3 py-1.5 border border-neutral-850">
                            <span className="text-neutral-500 uppercase block text-[8px]">Unverified Entries</span>
                            <span className="text-amber-500 font-extrabold">{cashier.unverifiedCount} rows</span>
                          </div>
                        </div>
                      </div>

                      {/* Audit input parameters */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Physical Drawer Cash Counter */}
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black text-neutral-450 uppercase font-mono tracking-widest">Physical Cash Audited (GHC)</label>
                          <input
                            type="number"
                            disabled={isSigned}
                            value={tellerPhysicalCashInputs[name] || ''}
                            onChange={(e) => {
                              setTellerPhysicalCashInputs({
                                ...tellerPhysicalCashInputs,
                                [name]: e.target.value
                              });
                            }}
                            placeholder={`Expected: GHC ${cashier.systemTotalCollected.toFixed(2)}`}
                            className="w-full bg-neutral-900 border-2 border-neutral-800 py-2.5 px-3 text-xs outline-none text-white focus:border-amber-400 font-mono"
                          />
                        </div>

                        {/* Audit Log Comments */}
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black text-neutral-450 uppercase font-mono tracking-widest">Teller Audit Notes</label>
                          <textarea
                            disabled={isSigned}
                            rows={1}
                            value={tellerAuditNotes[name] || ''}
                            onChange={(e) => {
                              setTellerAuditNotes({
                                ...tellerAuditNotes,
                                [name]: e.target.value
                              });
                            }}
                            placeholder="Add drawer remarks, shortages/overages justifications..."
                            className="w-full bg-neutral-900 border-2 border-neutral-800 py-2.5 px-3 text-xs outline-none text-white focus:border-amber-400 font-sans"
                          />
                        </div>

                        {/* Variance and Actions */}
                        <div className="flex flex-col justify-end space-y-1">
                          <span className="text-[10px] font-black text-neutral-450 uppercase font-mono tracking-widest block">Variance Reconciliation</span>
                          <div className="flex items-center gap-3">
                            <div className={`flex-1 py-2 px-3 border-2 font-mono text-xs font-black uppercase text-center ${
                              variance === 0 
                                ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/40' 
                                : variance > 0 
                                ? 'bg-amber-950/20 text-amber-400 border-amber-900/40' 
                                : 'bg-red-950/20 text-red-400 border-red-900/40'
                            }`}>
                              {variance === 0 ? 'Balanced' : variance > 0 ? `Overage: +GHC ${variance.toFixed(2)}` : `Shortage: GHC ${variance.toFixed(2)}`}
                            </div>

                            {/* Sign-off locking triggers */}
                            {isSigned ? (
                              <button
                                onClick={() => {
                                  const updated = { ...tellerSignOffs };
                                  delete updated[name];
                                  setTellerSignOffs(updated);
                                }}
                                className="px-3 py-2.5 text-[9px] font-black bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/40 uppercase tracking-widest cursor-pointer flex items-center gap-1 shrink-0"
                              >
                                <Unlock size={12} /> Unlock
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setTellerSignOffs({
                                    ...tellerSignOffs,
                                    [name]: {
                                      signedBy: currentUser?.name || 'Administrator',
                                      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                                    }
                                  });
                                }}
                                className="px-3 py-2.5 text-[9px] font-black bg-white hover:bg-amber-400 text-black uppercase tracking-widest cursor-pointer flex items-center gap-1 shrink-0"
                              >
                                <Lock size={12} /> Sign & Lock
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Cashier Sign-off Banner if locked */}
                      {isSigned && (
                        <div className="p-3 bg-neutral-900 border border-neutral-850 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[10px] font-mono">
                          <span className="text-emerald-400 font-extrabold flex items-center gap-1.5 uppercase tracking-wider">
                            <CheckCircle2 size={12} /> Reconciliation Audited and Locked
                          </span>
                          <span className="text-neutral-400">
                            Signed off by <strong className="text-white">{tellerSignOffs[name].signedBy}</strong> at {tellerSignOffs[name].timestamp}
                          </span>
                        </div>
                      )}

                      {/* Transaction details drawer selection */}
                      <div className="flex justify-between items-center bg-neutral-900/40 border border-neutral-850/40 p-3">
                        <span className="text-[10px] text-neutral-400 font-semibold font-mono">Inspect teller payments list for granular verification:</span>
                        <button
                          onClick={() => {
                            if (selectedTellerForAudit === name) {
                              setSelectedTellerForAudit(null);
                            } else {
                              setSelectedTellerForAudit(name);
                            }
                          }}
                          className="px-3 py-1.5 text-[9px] font-black bg-neutral-950 hover:bg-neutral-850 text-neutral-300 border border-neutral-800 uppercase tracking-widest cursor-pointer"
                        >
                          {selectedTellerForAudit === name ? 'Collapse List' : 'Expand Transactions'}
                        </button>
                      </div>

                      {/* Selected Teller's Daily Transaction List */}
                      {selectedTellerForAudit === name && (
                        <div className="border border-neutral-850 overflow-hidden bg-neutral-950">
                          <div className="bg-neutral-900 p-3 border-b border-neutral-850 flex justify-between items-center">
                            <span className="text-[10px] font-black text-white uppercase tracking-wider font-mono">Granular Payments Sheet ({name})</span>
                            <span className="text-[9.5px] text-amber-500 font-mono font-bold">Unverified items can be approved directly below</span>
                          </div>
                          
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="bg-neutral-950 border-b border-neutral-850 text-[9px] font-black text-neutral-500 uppercase tracking-widest font-mono">
                                  <th className="p-3">Student Name</th>
                                  <th className="p-3 font-mono">Grade</th>
                                  <th className="p-3 font-mono">Timestamp</th>
                                  <th className="p-3 text-right">Fee (GHC)</th>
                                  <th className="p-3 text-center">Audit Check</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-neutral-850 text-neutral-300">
                                {cashier.transactionsList.map((tx) => (
                                  <tr key={tx.id} className="hover:bg-neutral-900/40 transition-colors">
                                    <td className="p-3 font-bold text-white">{tx.studentName}</td>
                                    <td className="p-3 font-mono text-amber-400 font-bold">{tx.class}</td>
                                    <td className="p-3 font-mono text-[10px] text-neutral-400">{new Date(tx.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                                    <td className="p-3 text-right font-mono font-black">GHC {tx.amount.toFixed(2)}</td>
                                    <td className="p-3 text-center">
                                      {tx.verified ? (
                                        <span className="inline-block px-2 py-0.5 bg-neutral-900 text-emerald-400 border border-neutral-800 font-black text-[9px] uppercase tracking-widest">
                                          Approved
                                        </span>
                                      ) : (
                                        <button
                                          onClick={() => verifyPayment(tx.id)}
                                          className="px-2 py-1 text-[8.5px] font-black bg-white hover:bg-amber-400 text-black uppercase tracking-widest cursor-pointer transition-colors"
                                        >
                                          Approve Check
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : auditViewMode === 'audit' ? (
        <div className="bg-neutral-900 border-4 border-neutral-800 p-6 space-y-6">
          <AuditTrailTab />
        </div>
      ) : (
        <div className="bg-neutral-900 border-4 border-neutral-800 p-6 space-y-6">
          <DatabaseTab showToast={showToast} setActiveTab={(tab) => {
            showToast("Security & MFA Hub configuration can be managed from the Pupil Enrollment Core tab.");
          }} />
        </div>
      )}

      {/* Automated Email summary slider drawer */}
      {showEmailDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop screen */}
          <div 
            onClick={() => setShowEmailDrawer(false)}
            className="absolute inset-0 bg-neutral-950/80 backdrop-blur-xs transition-opacity" 
          />

          {/* Drawer container body */}
          <div className="relative w-full max-w-lg bg-neutral-900 h-full shadow-2xl flex flex-col z-10 border-l-4 border-neutral-800">
            <div className="p-6 bg-neutral-950 text-white flex justify-between items-center border-b-2 border-neutral-850">
              <div className="space-y-0.5">
                <span className="text-[10px] text-neutral-500 font-mono tracking-widest font-black uppercase">Accounting Automated summarize dispatch</span>
                <h3 className="text-base font-black flex items-center gap-1.5 uppercase italic tracking-wider text-white"><Mail size={18} className="text-amber-400" /> Send Monthly Ledger Summary</h3>
              </div>
              <button 
                onClick={() => setShowEmailDrawer(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-neutral-400 uppercase font-mono tracking-widest mb-1.5">
                  Accounting Department Email
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="saakohca@gmail.com"
                  className="w-full bg-neutral-950 border-2 border-neutral-800 py-3.5 px-4 text-xs font-mono outline-none focus:border-amber-400 text-white font-bold"
                />
              </div>

              <div className="bg-neutral-950 p-5 border border-neutral-850 space-y-1.5 font-sans">
                <span className="text-[10px] font-black text-neutral-400 font-mono uppercase tracking-widest block">Security & Ledger Verification</span>
                <p className="text-[11px] text-neutral-450 font-bold leading-relaxed">
                  Upon dispatch, this generates a formatted auditing report utilizing the verified checkpoint numbers in core memory. You can also click 
                  the direct mail client link below to launch Outlook/Gmail instantly preloaded.
                </p>
              </div>

              {emailStatus ? (
                <div className="space-y-4">
                  <div className="p-5 bg-neutral-950 border border-neutral-850 text-white text-xs space-y-3 font-sans">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-amber-400">
                      <CheckCircle2 size={16} />
                      <span>{emailStatus.message}</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      The core daily check-in ledger summary is formatted. To trigger a real local email dispatch through your official school account, click the button below:
                    </p>
                    <a
                      href={emailStatus.textUrl}
                      className="inline-block mt-1 font-mono text-[10px] font-black bg-white hover:bg-amber-400 text-black py-3 px-5 transition-colors uppercase tracking-widest cursor-pointer"
                    >
                      COMPOSE EMAIL IN CLIENT (MAILTO)
                    </a>
                  </div>

                  <div>
                    <span className="text-[10px] font-black text-neutral-500 uppercase font-mono block mb-1.5">Rendered Transmission Ledger:</span>
                    <pre className="p-5 bg-neutral-950 text-emerald-400 font-mono text-[10px] border-2 border-neutral-850 overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                      {sendMonthlyEmailDraft(recipientEmail).draftContent}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <button
                    onClick={handleSimulateEmailSend}
                    disabled={emailLoading}
                    className="w-full text-xs font-black uppercase tracking-widest bg-white hover:bg-amber-400 text-black py-4 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {emailLoading ? 'Formatting Ledger Account Summary...' : 'Process & Generate Summary'}
                  </button>

                  <div>
                    <span className="text-[10px] font-black text-neutral-500 uppercase font-mono block mb-1.5">Preview Email Template Structure:</span>
                    <pre className="p-5 bg-neutral-950 text-neutral-500 font-mono text-[9px] border-2 border-neutral-850 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {`SUBJECT: Daily School Fee Tracker - Automated Monthly Audit Summary
TO: ${recipientEmail}

Saako educational trust Daily Fee Tracker Report
-------------------------------------------------------
Scope Period: May 2026 Monthly Summary
Total Verified Fees Collected: GHC [SUM]
Nursery to KG2: GHC [SUM]
B1 to B6: GHC [SUM]
B7 to B9: GHC [SUM]`}
                    </pre>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-5 border-t border-neutral-850 bg-neutral-950 text-center text-[10px] text-neutral-500 font-mono tracking-widest font-black uppercase">
              SECURE SHA-2 TRANSACTION LEDGER PORTAL
            </div>
          </div>
        </div>
      )}

      {/* Individual Student Consolidated Ledger Detail Drawer */}
      {selectedLedgerStudentId && (() => {
        const item = consolidatedLedgerData.find(x => x.student.id === selectedLedgerStudentId);
        if (!item) return null;
        const s = item.student;

        return (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            {/* Backdrop screen */}
            <div 
              onClick={() => setSelectedLedgerStudentId(null)}
              className="absolute inset-0 bg-neutral-950/80 backdrop-blur-xs transition-opacity" 
            />

            {/* Drawer container body */}
            <div className="relative w-full max-w-2xl bg-neutral-900 h-full shadow-2xl flex flex-col z-10 border-l-4 border-neutral-800">
              <div className="p-6 bg-neutral-950 text-white flex justify-between items-center border-b-2 border-neutral-850">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-neutral-500 font-mono tracking-widest font-black uppercase">Student Billing Statement of Account</span>
                  <h3 className="text-base font-black flex items-center gap-1.5 uppercase italic tracking-wider text-white">
                    <Receipt size={18} className="text-amber-400" /> {s.name}
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedLedgerStudentId(null)}
                  className="p-1 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {/* Academic Profile metadata grid */}
                <div className="bg-neutral-950 border border-neutral-850 p-4 space-y-3 font-sans">
                  <span className="text-[10px] font-black text-neutral-400 font-mono uppercase tracking-widest block">Ward Academic Profile</span>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <span className="text-neutral-500 font-mono block text-[9px]">PUPIL UNIQUE ID:</span>
                      <strong className="text-white font-mono">{s.id}</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500 font-mono block text-[9px]">GRADE / CLASS:</span>
                      <strong className="text-amber-400 font-mono">{s.class}</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500 font-mono block text-[9px]">SECTION CATEGORY:</span>
                      <strong className="text-neutral-200">{s.category}</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500 font-mono block text-[9px]">BILLING SCHEME:</span>
                      <strong className="text-neutral-200">{item.isTermPayer ? 'Term-based Scheme' : 'Daily Gate Scheme'}</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500 font-mono block text-[9px]">ROLL NUMBER:</span>
                      <strong className="text-neutral-200">{s.rollNumber || 'Not Configured'}</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500 font-mono block text-[9px]">GUARDIAN PHONE:</span>
                      <strong className="text-neutral-200">{s.guardianPhone || 'Not Configured'}</strong>
                    </div>
                  </div>
                </div>

                {/* Ledger Financial Highlights */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-neutral-950 border border-neutral-850 p-3 text-right">
                    <span className="text-neutral-500 text-[9px] font-mono block text-left uppercase font-black">Total Billed</span>
                    <span className="text-base font-black text-white font-mono">GHC {item.totalCharged.toFixed(2)}</span>
                  </div>
                  <div className="bg-neutral-950 border border-neutral-850 p-3 text-right">
                    <span className="text-neutral-500 text-[9px] font-mono block text-left uppercase font-black">Cleared Paid</span>
                    <span className="text-base font-black text-emerald-400 font-mono">GHC {item.totalPaid.toFixed(2)}</span>
                  </div>
                  <div className="bg-neutral-950 border border-neutral-850 p-3 text-right">
                    <span className="text-neutral-500 text-[9px] font-mono block text-left uppercase font-black">Outstanding</span>
                    <span className="text-base font-black text-red-400 font-mono">GHC {item.totalDue.toFixed(2)}</span>
                  </div>
                </div>

                {/* Itemized Payments Ledger */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-neutral-400 font-mono uppercase tracking-widest block">Itemized Payment Log Summary</span>
                  
                  {item.paymentsList.length === 0 ? (
                    <div className="p-8 text-center text-neutral-500 font-bold font-mono border-2 border-dashed border-neutral-800 bg-neutral-950 text-xs">
                      No payment ledger entries recorded matching this academic term.
                    </div>
                  ) : (
                    <div className="border border-neutral-850 bg-neutral-950 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-neutral-900 border-b border-neutral-850 text-[9px] font-black text-neutral-500 uppercase tracking-widest font-mono">
                              <th className="p-3">Payment Date</th>
                              <th className="p-3 font-mono">Receipt ID</th>
                              <th className="p-3">Received By</th>
                              <th className="p-3 text-right">GHC Paid</th>
                              <th className="p-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-850 text-neutral-300">
                            {item.paymentsList.map((tx) => (
                              <tr key={tx.id} className="hover:bg-neutral-900/30 transition-colors">
                                <td className="p-3 font-mono text-[11px]">{tx.date}</td>
                                <td className="p-3 font-mono text-[10px] text-neutral-450">{tx.id}</td>
                                <td className="p-3">{tx.collectedBy || 'Admin Desk'}</td>
                                <td className="p-3 text-right font-mono font-bold text-emerald-400">GHC {tx.amount.toFixed(2)}</td>
                                <td className="p-3 text-center">
                                  {tx.verified ? (
                                    <span className="inline-block px-2 py-0.5 bg-neutral-900 text-emerald-400 text-[8.5px] uppercase font-black tracking-widest border border-neutral-800">
                                      Cleared
                                    </span>
                                  ) : (
                                    <span className="inline-block px-2 py-0.5 bg-neutral-900 text-amber-500 text-[8.5px] uppercase font-black tracking-widest border border-neutral-800">
                                      Pending
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5 border-t border-neutral-850 bg-neutral-950 flex justify-between items-center">
                <button
                  onClick={() => handlePrintStudentLedger(s.id)}
                  className="px-5 py-3 text-xs font-black bg-white hover:bg-amber-400 text-black uppercase tracking-widest cursor-pointer transition-colors"
                >
                  Print Official Statement
                </button>
                <button
                  onClick={() => setSelectedLedgerStudentId(null)}
                  className="px-5 py-3 text-xs font-black bg-neutral-900 hover:bg-neutral-800 text-white uppercase tracking-widest border border-neutral-800 cursor-pointer transition-colors"
                >
                  Close Statement
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* BULK PRINT INVOICES MODAL OUTLET */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-neutral-950 flex flex-col md:flex-row">
          {/* STYLESHEET OVERRIDES FOR PRINTER SYSTEM */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: portrait;
                margin: 15mm;
                @bottom-right {
                  content: "Page " counter(page) " of " counter(pages);
                  font-family: 'JetBrains Mono', monospace !important;
                  font-size: 8px !important;
                  font-weight: bold !important;
                  color: #333333 !important;
                }
              }
              /* Hide app UI */
              body * {
                visibility: hidden !important;
                background: none !important;
                color: #000 !important;
                box-shadow: none !important;
              }
              /* Show ONLY the printable invoice pages container */
              #print-bulk-invoices-area, #print-bulk-invoices-area * {
                visibility: visible !important;
              }
              #print-bulk-invoices-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
              }
              /* Force strict page-break after each client card */
              .print-invoice-page {
                page-break-after: always !important;
                break-after: page !important;
                margin: 0 !important;
                padding: 15mm !important;
                border: none !important;
                box-shadow: none !important;
                height: auto !important;
                min-height: 297mm !important;
                box-sizing: border-box !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}} />

          {/* LEFT COLUMN: Controls Dashboard Panel */}
          <div className="w-full md:w-96 bg-neutral-900 border-r-4 border-neutral-800 flex flex-col h-full overflow-y-auto no-print p-6 space-y-6">
            <div className="border-b border-neutral-800 pb-4">
              <span className="text-[10px] text-amber-500 font-mono tracking-widest font-black uppercase block">ACCOUNTS DEPARTMENT</span>
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mt-1">
                <Printer size={18} className="text-amber-400" /> BULK PRINT STATION
              </h3>
            </div>

            {/* Quick configuration parameters */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-mono uppercase font-black text-neutral-400 tracking-wider font-mono">Configure Invoices</h4>

              {/* Search filter */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase font-black text-neutral-400 tracking-wider">Search Student</span>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-neutral-500" size={13} />
                    <input
                      id="reports-student-search"
                      type="text"
                      value={printSearchQuery}
                      onChange={(e) => setPrintSearchQuery(e.target.value)}
                      placeholder="Search by name, ID, class, or status (paid, absent)..."
                      className="w-full bg-neutral-950 border-2 border-neutral-800 py-2 pl-9 pr-16 text-xs outline-none text-white focus:border-amber-400 font-mono"
                    />
                    <div className="absolute right-2 top-1.5 flex items-center gap-1.5">
                      <VoiceSearchButton
                        inputId="reports-student-search"
                        onTranscript={(text) => setPrintSearchQuery(text)}
                      />
                      {!printSearchQuery ? (
                        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 border border-neutral-800 bg-neutral-950 font-mono text-[8px] text-neutral-500 rounded-xs leading-none pointer-events-none uppercase font-bold tracking-wider select-none">
                          Ctrl+K
                        </kbd>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPrintSearchQuery('')}
                          className="text-neutral-500 hover:text-white cursor-pointer p-1 rounded-full hover:bg-neutral-800 flex items-center justify-center"
                          title="Clear Search"
                        >
                          <X size={13} className="stroke-[2.5]" />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Keyboard shortcut info indicator reminder */}
                  <div 
                    className="hidden md:flex items-center justify-center text-neutral-500 hover:text-amber-400 border border-neutral-800 bg-neutral-950 hover:border-amber-400 transition-all cursor-help h-[34px] w-9 shrink-0 select-none"
                    title="Keyboard Shortcut Reminder: Press 'Ctrl+K' (or 'Cmd+K' on macOS) from anywhere at any time to focus this invoice search box instantly"
                  >
                    <Info size={13} className="stroke-[2.5]" />
                  </div>
                </div>
              </div>

              {/* Date Filter Selection Mode */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase font-black text-neutral-400 tracking-wider">Date Selection Mode</span>
                <div className="grid grid-cols-2 gap-1 bg-neutral-950 p-1 border border-neutral-850">
                  <button
                    type="button"
                    onClick={() => setPrintDateMode('current')}
                    className={`py-2 text-[9px] font-mono font-black uppercase transition-all cursor-pointer text-center ${
                      printDateMode === 'current'
                        ? 'bg-amber-400 text-black font-extrabold'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                    }`}
                  >
                    Active Filter ({dateFilter || 'All time'})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintDateMode('custom')}
                    className={`py-2 text-[9px] font-mono font-black uppercase transition-all cursor-pointer text-center ${
                      printDateMode === 'custom'
                        ? 'bg-amber-400 text-black font-extrabold'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                    }`}
                  >
                    Custom Range
                  </button>
                </div>
              </div>

              {/* Custom Date Inputs */}
              {printDateMode === 'custom' && (
                <div className="bg-neutral-950 p-3.5 border border-neutral-850 space-y-3.5">
                  <span className="text-[9px] font-mono font-black uppercase text-amber-400 block tracking-widest">SELECT CUSTOM RANGE</span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[8px] font-mono uppercase font-black text-neutral-500 block">Start Date</label>
                      <input
                        type="date"
                        value={printStartDate}
                        onChange={(e) => setPrintStartDate(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 px-2 py-1.5 font-mono text-[10px] text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-mono uppercase font-black text-neutral-500 block">End Date</label>
                      <input
                        type="date"
                        value={printEndDate}
                        onChange={(e) => setPrintEndDate(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 px-2 py-1.5 font-mono text-[10px] text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-neutral-900">
                    <button
                      type="button"
                      onClick={() => {
                        setPrintStartDate('');
                        setPrintEndDate('');
                      }}
                      className="text-[8px] font-mono uppercase text-neutral-500 hover:text-red-400 transition-colors"
                    >
                      CLEAR DATES
                    </button>
                    {(printStartDate || printEndDate) && (
                      <span className="text-[8.5px] font-mono text-emerald-400 font-bold uppercase">
                        RANGE ACTIVE
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {/* Unverified toggle custom check */}
              <div className="bg-neutral-950 p-4 border border-neutral-850 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 block uppercase">Include Unverified</span>
                    <p className="text-[9px] text-neutral-500 leading-normal">Pull daily fees awaiting approval.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIncludeUnverified(!includeUnverified)}
                    className={`px-3 py-1.5 text-[9px] font-mono font-black uppercase border-2 transition-all ${
                      includeUnverified 
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' 
                        : 'bg-neutral-900 border-neutral-800 text-neutral-500'
                    }`}
                  >
                    {includeUnverified ? '🟢 ACTIVE' : '⚪ EXCLUDED'}
                  </button>
                </div>
              </div>

              {/* Authorized signatory */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase font-black text-neutral-400 font-mono">Authorized Signature Block</label>
                <input
                  type="text"
                  value={authorizedBy}
                  onChange={(e) => setAuthorizedBy(e.target.value)}
                  placeholder="name or title..."
                  className="w-full bg-neutral-950 border-2 border-neutral-800 px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Custom Bottom Note */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase font-black text-neutral-400 font-mono">Statement Footnote / Terms</label>
                <textarea
                  rows={4}
                  value={customMemo}
                  onChange={(e) => setCustomMemo(e.target.value)}
                  className="w-full bg-neutral-950 border-2 border-neutral-800 px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400 text-[11px] leading-relaxed resize-none"
                />
              </div>
            </div>

            {/* Print metadata statistics summary board */}
            <div className="bg-neutral-950 border border-neutral-800 p-4 space-y-2">
              <span className="text-[9px] font-mono uppercase text-neutral-500 font-extrabold block">Print Run Summary</span>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono font-bold text-neutral-300">
                <div className="bg-neutral-900 p-2 border border-neutral-850">
                  <span className="text-neutral-500 text-[8px] block">PUPILS</span>
                  <span className="text-white text-xs font-black">{paymentsByStudent.length} STUDENTS</span>
                </div>
                <div className="bg-neutral-900 p-2 border border-neutral-850">
                  <span className="text-neutral-500 text-[8px] block">PAYMENTS</span>
                  <span className="text-amber-400 text-xs font-black">
                    {paymentsByStudent.reduce((acc, s) => acc + s.paymentsList.length, 0)} TX
                  </span>
                </div>
              </div>
            </div>

            {/* Instructions box */}
            <div className="text-[10px] text-neutral-500 leading-normal font-medium bg-neutral-950/40 p-4 border border-neutral-850 space-y-1.5">
              <p className="font-bold text-neutral-400">🖨️ SYSTEM PRINT MANUAL:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Click <strong>LAUNCH PRINTER PANEL</strong> to bring up the browser systems page.</li>
                <li>Set destination to <strong>Save as PDF</strong> or select your physical classroom printer.</li>
                <li>Ensure <strong>"Headers & Footers"</strong> option is unchecked under settings, and color mode is set to grayscale or custom.</li>
              </ul>
            </div>

            {/* Action buttons */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.focus();
                    window.print();
                  }
                }}
                disabled={paymentsByStudent.length === 0}
                className="w-full py-4 text-xs font-black uppercase text-black bg-emerald-400 hover:bg-emerald-300 disabled:bg-neutral-800 disabled:text-neutral-500 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer size={16} /> LAUNCH PRINTER PANEL
              </button>

              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="w-full py-3.5 text-xs font-black uppercase text-neutral-400 hover:text-white bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 transition-colors cursor-pointer"
              >
                CLOSE ENGINE & RETURN
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Continuous high-fidelity print documents catalog container */}
          <div className="flex-1 overflow-y-auto bg-neutral-950 p-4 md:p-8 space-y-8 no-print-scroll scrollbar-thin">
            <div className="max-w-[210mm] mx-auto flex items-center justify-between no-print border-b border-neutral-850 pb-3">
              <span className="text-[10px] font-mono font-black uppercase text-neutral-400 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                LIVE SHEET COMPILATION STENCIL ({paymentsByStudent.length} PAGES PRELOADED)
              </span>
              <span className="text-[10px] font-mono text-neutral-500">STANDARD A4 DIMENSIONS</span>
            </div>

            {/* Container mapping our printable documents */}
            <div id="print-bulk-invoices-area" className="space-y-8">
              {paymentsByStudent.length === 0 ? (
                <div className="bg-neutral-900 border-2 border-dashed border-neutral-800 p-12 text-center max-w-[210mm] mx-auto text-neutral-400 no-print">
                  <Printer className="mx-auto text-neutral-600 mb-3" size={32} />
                  <p className="text-[11px] font-mono font-black uppercase text-amber-500">No payment data meets the filter limits.</p>
                  <p className="text-[10px] text-neutral-500 mt-1">Change class filter, date filter, or toggle unverified payments to preload.</p>
                </div>
              ) : (
                paymentsByStudent.map((group, sectionIndex) => {
                  const sProfile = students.find(s => s.id === group.studentId);
                  const sRoll = sProfile?.rollNumber || 'FT-PUPIL-' + group.studentId.substring(0, 5).toUpperCase();
                  const sGuardian = sProfile?.guardianPhone || 'No Guardian Verified';
                  const totalPaid = group.paymentsList.reduce((sum, p) => sum + p.amount, 0);

                  const allStudentPayments = sProfile ? (paymentsIndexed.byStudentId.get(sProfile.id) || []) : [];

                  // Calculate Student overall historical total collected fees and arrears/outstanding debt
                  const totalPaymentsAllTime = allStudentPayments
                    .filter(p => p.verified)
                    .reduce((sum, p) => sum + p.amount, 0);

                  let totalDebt = 0;
                  let unpaidDaysCount = 0;
                  if (activeTerm && activeTerm.schoolDays && sProfile) {
                    const holidays = activeTerm.publicHolidays || [];
                    const pastSchoolDays = activeTerm.schoolDays.filter(d => {
                      const afterEnrollment = sProfile.enrollmentDate ? d >= sProfile.enrollmentDate : true;
                      return d < currentDate && !holidays.includes(d) && afterEnrollment;
                    });
                    const unpaidDays = pastSchoolDays.filter(dStr => {
                      return !paymentsIndexed.byStudentIdAndDate.has(`${sProfile.id}_${dStr}`);
                    });
                    unpaidDaysCount = unpaidDays.length;
                    if (isTermPayer(sProfile)) {
                      const tFee = sProfile.termFee || getStudentBaselineTermFee(sProfile.class, systemSettings);
                      const legacyD = sProfile.legacyDebt || 0;
                      const totalPaidAllTime = allStudentPayments
                        .filter(p => !p.isAbsent)
                        .reduce((sum, p) => sum + p.amount, 0);
                      totalDebt = Math.max(0, tFee + legacyD - totalPaidAllTime);
                    } else {
                      const dailyRate = Math.max(0, 5 - (sProfile.discount || 0));
                      totalDebt = (unpaidDaysCount * dailyRate) + (sProfile.legacyDebt || 0);
                    }
                  }

                  const schoolOwesStudent = allStudentPayments
                    .filter(p => p.verified && p.date > currentDate)
                    .reduce((sum, p) => sum + p.amount, 0);

                  const studentHistoryList = (() => {
                    if (!activeTerm || !activeTerm.schoolDays || !sProfile) return [];
                    const holidays = activeTerm.publicHolidays || [];
                    const pastSchoolDays = activeTerm.schoolDays.filter(d => {
                      const afterEnrollment = sProfile.enrollmentDate ? d >= sProfile.enrollmentDate : true;
                      return d <= currentDate && afterEnrollment;
                    });

                    return pastSchoolDays.map((dayStr) => {
                      const pRecord = paymentsIndexed.byStudentIdAndDate.get(`${group.studentId}_${dayStr}`);
                      const isHoliday = holidays.includes(dayStr);
                      const isAbsent = pRecord?.isAbsent || false;
                      const isVerified = pRecord?.verified || false;
                      const isTermPayerStudent = isTermPayer(sProfile);

                      let statusLabel = 'Unpaid Arrears';
                      let feeLabel = 'GHC 5.00';
                      let paymentRef = '- -';
                      let collector = '- -';

                      if (isHoliday) {
                        statusLabel = 'Holiday';
                        feeLabel = 'Exempt';
                      } else if (isAbsent) {
                        statusLabel = 'Absent';
                        feeLabel = 'Exempt';
                        paymentRef = pRecord?.id.substring(0, 8).toUpperCase() || 'EXCUSED';
                        collector = pRecord?.collectedBy || '- -';
                      } else if (pRecord) {
                        statusLabel = isVerified ? 'Present (Paid)' : 'Present (Pending)';
                        feeLabel = `GHC ${pRecord.amount.toFixed(2)}`;
                        paymentRef = pRecord.id.substring(0, 8).toUpperCase();
                        collector = pRecord.collectedBy;
                      } else if (isTermPayerStudent) {
                        statusLabel = 'Present (Term Paid)';
                        feeLabel = 'Covered (Term)';
                        paymentRef = 'TERM-SCHEME';
                        collector = 'System';
                      } else {
                        const isDayUnpaid = !paymentsIndexed.byStudentIdAndDate.has(`${sProfile.id}_${dayStr}`);
                        if (!isDayUnpaid) {
                          statusLabel = 'Present (Pre-paid)';
                          feeLabel = 'Covered (Prepaid)';
                          paymentRef = 'PREPAID';
                          collector = 'System';
                        }
                      }

                      return {
                        date: dayStr,
                        statusLabel,
                        feeLabel,
                        paymentRef,
                        collector,
                        isHoliday,
                        isAbsent,
                        pRecord
                      };
                    }).sort((a, b) => b.date.localeCompare(a.date));
                  })();

                  return (
                    <div 
                      key={group.studentId} 
                      className="print-invoice-page bg-white text-black p-10 shadow-2xl max-w-[210mm] mx-auto min-h-[297mm] flex flex-col justify-between relative border border-neutral-300 font-sans"
                    >
                      {/* Interactive Sheet Share Bar */}
                      <div className="no-print bg-neutral-100 border-b border-neutral-250 p-2.5 mb-4 flex items-center justify-between font-mono text-[9px] -mx-10 -mt-10 rounded-t-xs">
                        <span className="font-bold uppercase text-neutral-500">
                          📄 Sheet {sectionIndex + 1} of {paymentsByStudent.length}: Invoice Document
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            handleShareReportOrInvoice('invoice-page', {
                              studentId: group.studentId,
                              studentName: group.studentName,
                              guardianPhone: sGuardian,
                              rollNumber: sRoll,
                              studentClass: group.studentClass,
                              studentCategory: group.studentCategory,
                              totalPaymentsAllTime: totalPaymentsAllTime,
                              totalDebt: totalDebt,
                              unpaidDaysCount: unpaidDaysCount,
                              schoolOwesStudent: schoolOwesStudent,
                              totalPaidRecorded: totalPaid,
                              customFootnote: customMemo
                            });
                          }}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-3 py-1 font-mono uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 rounded-xs"
                        >
                          <Share2 size={10} />
                          Share via WhatsApp
                        </button>
                      </div>

                      {/* Inner invoice sheet header component */}
                      <div className="space-y-6">
                        {/* Header banner structure */}
                        <div className="border-b-4 border-black pb-4 flex justify-between items-start">
                          <div className="flex items-center gap-3 text-left">
                            <SchoolLogo size={42} className="shrink-0" lightBackground={true} />
                            <div className="space-y-1">
                              <span className="text-[11px] font-black uppercase tracking-wider text-black bg-neutral-200 px-2 py-0.5 font-mono">
                                SAAKO HOLY CHILD ACADEMY
                              </span>
                              <h2 className="text-xl font-black uppercase tracking-tight leading-none mt-1">STATEMENT OF SCHOOLING FEE</h2>
                              <p className="text-[9px] text-neutral-600 font-black uppercase tracking-widest font-mono">
                                ONLINE SYNCHRONIZED CLOUD DATABASE SYSTEM
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right space-y-1 font-mono">
                            <span className="text-[11px] font-black uppercase px-2.5 py-1 bg-black text-white inline-block mt-0.5">
                              RECEIPT PRINT OUT
                            </span>
                            <div className="text-[8px] text-neutral-600 uppercase font-bold mt-1">
                              INVOICE REF: FT-RE-{currentDate.replace(/-/g, '')}-{group.studentId.substring(0,6).toUpperCase()}
                            </div>
                          </div>
                        </div>

                        {/* Customer pupil details block */}
                        <div className="grid grid-cols-3 gap-6 text-[11px] leading-relaxed border-b border-neutral-350 pb-5">
                          <div>
                            <span className="text-[8px] font-black uppercase text-neutral-500 block">STUDENT BENEFICIARY</span>
                            <div className="text-xs font-black text-black uppercase">{group.studentName}</div>
                            <div className="font-mono mt-0.5 text-neutral-700 font-bold">Roll / ID: {sRoll}</div>
                            <div className="font-bold mt-0.5">Class Cohort: {group.studentClass} ({group.studentCategory})</div>
                          </div>

                          <div className="border-l pl-6 border-neutral-200 font-mono">
                            <span className="text-[8px] font-black uppercase text-neutral-500 block font-sans">ACCOUNT AUDIT SUMMARY</span>
                            <div className="flex justify-between mt-0.5 font-bold">
                              <span className="text-neutral-500 uppercase text-[9.5px] font-sans">Total Collected:</span>
                              <span className="text-emerald-700">GHC {totalPaymentsAllTime.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between mt-0.5 font-bold">
                              <span className="text-neutral-500 uppercase text-[9.5px] font-sans">Total Arrears (Debt):</span>
                              <span className="text-red-700">GHC {totalDebt.toFixed(2)} {totalDebt > 0 ? `(${unpaidDaysCount}d)` : ''}</span>
                            </div>
                            <div className="flex justify-between mt-0.5 font-bold">
                              <span className="text-neutral-500 uppercase text-[9.5px] font-sans font-bold">School Owes (Prepaid):</span>
                              <span className="text-blue-700">GHC {schoolOwesStudent.toFixed(2)}</span>
                            </div>
                          </div>

                          <div className="text-right border-l pl-6 border-neutral-200">
                            <span className="text-[8px] font-black uppercase text-neutral-500 block">LEDGER ISSUANCE INFORMATION</span>
                            <div className="font-bold">Date Verified: {currentDate}</div>
                            <div className="font-mono text-neutral-700 text-[10px]">Guardian Contact: {sGuardian}</div>
                            <div className="mt-0.5 text-neutral-600 text-[10px] uppercase font-bold">
                              Audited By: {currentUser ? currentUser.name : 'System Host Auditor'}
                            </div>
                          </div>
                        </div>

                        {/* Daily collections check points list log */}
                        <div className="space-y-2">
                          <span className="text-[9px] font-black uppercase tracking-widest text-black font-mono block">
                            📋 CHRONOLOGICAL FEES & ATTENDANCE LEDGER ({studentHistoryList.length} DAYS)
                          </span>
                          
                          <table className="w-full text-[9.5px] table-auto">
                            <thead>
                              <tr className="border-b-2 border-black text-left uppercase text-neutral-500 font-black tracking-wider font-mono text-[8px]">
                                <th className="py-2 print-col-date">DATE CHECKED</th>
                                <th className="py-2 print-col-ref">REF CODE</th>
                                <th className="py-2 text-center font-sans font-bold print-col-status">ATT STATUS</th>
                                <th className="py-2 text-right print-col-fee">FEES</th>
                                <th className="py-2 text-right print-col-auditor">AUDITOR</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200">
                              {studentHistoryList.map((record) => {
                                const isHoliday = record.isHoliday;
                                const isAbsent = record.isAbsent;
                                const attStatusLabel = isHoliday ? 'HOLIDAY' : isAbsent ? 'ABSENT' : 'PRESENT';
                                
                                const statusBadgeColor = isHoliday 
                                  ? 'bg-neutral-100 text-neutral-600 border-neutral-300' 
                                  : isAbsent 
                                    ? 'bg-red-50 text-red-700 font-extrabold border-red-200' 
                                    : 'bg-emerald-50 text-emerald-800 font-extrabold border-emerald-250';

                                return (
                                  <tr key={record.date} className="font-medium text-neutral-800">
                                    <td className="py-2 font-mono text-black font-bold whitespace-nowrap print-col-date">{record.date}</td>
                                    <td className="py-2 font-mono text-[8.5px] text-neutral-600 uppercase max-w-[80px] truncate print-col-ref" title={record.paymentRef}>
                                      {record.paymentRef}
                                    </td>
                                    <td className="py-2 text-center print-col-status">
                                      <span className={`inline-block text-[7.5px] font-black px-1.5 py-0.5 uppercase rounded-xs border ${statusBadgeColor}`}>
                                        {attStatusLabel}
                                      </span>
                                    </td>
                                    <td className="py-2 text-right font-mono font-bold text-black whitespace-nowrap print-col-fee">{record.feeLabel}</td>
                                    <td className="py-2 text-right font-mono text-neutral-600 text-[9px] truncate max-w-[100px] print-col-auditor" title={record.collector}>
                                      {record.collector}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Cumulative balances block and signature lines */}
                      <div className="mt-12 space-y-6">
                        {/* Summary panel columns */}
                        <div className="grid grid-cols-2 gap-6 items-end">
                          <div className="space-y-2 bg-neutral-100 p-4 border border-neutral-300">
                            <span className="text-[8px] font-black uppercase text-neutral-600 font-mono block">PRINT FOOTNOTE MEMO</span>
                            <p className="text-[10px] text-neutral-700 leading-normal font-medium h-12 overflow-hidden">
                              {customMemo}
                            </p>
                          </div>

                          <div className="space-y-1 text-right font-mono">
                            <div className="flex justify-between items-center text-xs font-bold border-b border-neutral-200 py-1">
                              <span className="text-[10px] text-neutral-500 font-sans tracking-wide">DAYS CREDITED (STATEMENT):</span>
                              <span className="text-black font-black">{group.paymentsList.length} DAYS</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-bold border-b border-neutral-200 py-1">
                              <span className="text-[10px] text-neutral-500 font-sans tracking-wide">FEES RECORDED (STATEMENT):</span>
                              <span className="text-black font-black">GHC {totalPaid.toFixed(2)}</span>
                            </div>
                             <div className="flex justify-between items-center text-xs font-bold border-b border-neutral-200 py-1">
                               <span className="text-[10px] text-emerald-750 font-sans tracking-wide">ALL-TIME TOTAL COLLECTED:</span>
                               <span className="text-emerald-750 font-black">GHC {totalPaymentsAllTime.toFixed(2)}</span>
                             </div>
                             <div className="flex justify-between items-center text-xs font-bold border-b border-neutral-200 py-1">
                               <span className="text-[10px] text-blue-700 font-sans tracking-wide">SCHOOL OWES STUDENT (PREPAID):</span>
                               <span className="text-blue-700 font-black">GHC {schoolOwesStudent.toFixed(2)}</span>
                             </div>
                             <div className="flex justify-between items-center text-sm font-black border-b-2 border-black py-2 bg-neutral-100 px-2 mt-1">
                               <span className="text-[10px] text-red-700 font-sans tracking-wide">TOTAL ARREARS OUTSTANDING:</span>
                               <span className="text-red-700 text-sm font-black font-mono">
                                 GHC {totalDebt.toFixed(2)} {totalDebt > 0 ? `(${unpaidDaysCount} Days)` : '(SETTLED)'}
                               </span>
                             </div>
                          </div>
                        </div>

                        {/* Stamping signatures zone */}
                        <div className="pt-8 border-t-2 border-dashed border-neutral-300 flex justify-between items-center">
                          <div className="border border-neutral-400 p-4 px-6 text-center shrink-0 rounded-sm">
                            <div className="text-[9px] text-neutral-450 font-black uppercase tracking-wider mb-8 font-mono">
                              OFFICIAL SCHOOL CASHIER STAMP
                            </div>
                            <div className="text-[8px] text-neutral-300 uppercase font-mono tracking-widest leading-none">
                              SHCA-Sawla
                            </div>
                          </div>

                          <div className="text-right space-y-2 shrink-0 w-64 pr-4">
                            <div className="border-b border-black w-full h-8 flex items-end justify-end">
                              {/* Empty line space for physical pen signature */}
                            </div>
                            <span className="text-[9.5px] font-black uppercase text-black block tracking-wide font-sans mt-1">
                              {authorizedBy}
                            </span>
                            <span className="text-[8.5px] font-bold text-neutral-500 uppercase block tracking-widest font-mono leading-none">
                              ACCREDITED ACCOUNTS DESK
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-neutral-200 text-[8px] font-mono text-neutral-400 uppercase tracking-widest">
                          <span>PRINT SUITE REF: FEEPORTAL-V2</span>
                          <span>PAGE {sectionIndex + 1} OF {paymentsByStudent.length}</span>
                          <span>TRANSCRIPT CONFIRMED</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* EXPORT CONFIRMATION SUMMARY MODAL */}
      {showExportModal && (
        <div 
          id="export-confirmation-modal" 
          className="fixed inset-0 z-50 bg-neutral-950/85 backdrop-blur-sm flex items-center justify-center p-4 font-sans"
        >
          <div className="relative w-full max-w-lg bg-neutral-900 border-4 border-amber-400 p-6 md:p-8 space-y-6 shadow-[8px_8px_0px_0px_rgba(251,191,36,0.15)] text-white">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-400/10 border-2 border-amber-400 text-amber-400 shrink-0">
                <FileSpreadsheet size={24} />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-amber-400 font-mono tracking-widest font-black uppercase">Ledger Export Auditor</p>
                <h3 className="text-lg font-black uppercase tracking-tight">Excel Export Pre-Audit Summary</h3>
              </div>
            </div>

            <p className="text-xs text-neutral-400 font-semibold leading-relaxed">
              Verify your spreadsheet bounds and filter limits below. The administrative file will be composed immediately upon approval.
            </p>

            {/* Audit Numbers Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-neutral-950 border border-neutral-850 p-4 rounded-sm space-y-1">
                <span className="text-[9px] text-neutral-500 font-mono font-black uppercase block">Total Export Rows</span>
                <span className="text-xl font-black text-white font-mono">{exportSummary.totalRows}</span>
                <span className="text-[9px] text-neutral-450 block font-medium">Record lines in sheet</span>
              </div>

              <div className="bg-neutral-950 border border-neutral-850 p-4 rounded-sm space-y-1">
                <span className="text-[9px] text-neutral-500 font-mono font-black uppercase block">Financial Volume</span>
                <span className="text-xl font-black text-amber-400 font-mono">GHC {exportSummary.totalVolume.toFixed(2)}</span>
                <span className="text-[9px] text-neutral-450 block font-medium">Total transaction value</span>
              </div>
            </div>

            {/* More detailed status values */}
            <div className="bg-neutral-950 border border-neutral-850 p-4 rounded-sm font-sans space-y-2">
              <span className="text-[9px] text-neutral-500 font-mono font-black uppercase block">Financial Breakdown</span>
              <div className="flex justify-between items-center text-xs border-b border-neutral-900 pb-1.5 font-semibold">
                <span className="text-neutral-450">Verified Collections:</span>
                <span className="text-emerald-400 font-mono font-bold">GHC {exportSummary.verifiedVal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-0.5 font-semibold">
                <span className="text-neutral-450">Pending Verification:</span>
                <span className="text-amber-500 font-mono font-bold">GHC {exportSummary.pendingVal.toFixed(2)}</span>
              </div>
            </div>

            {/* Query Filter Bounds */}
            <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-sm space-y-2.5">
              <span className="text-[9px] text-neutral-500 font-mono font-black uppercase block">Active Query Bounds</span>
              <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-[10px] font-mono leading-relaxed text-neutral-300">
                <div>
                  <span className="text-neutral-500 font-black block uppercase">Date Coverage:</span>
                  <span className="font-extrabold text-amber-400 whitespace-nowrap">
                    {exportSummary.minDate === exportSummary.maxDate 
                      ? exportSummary.minDate 
                      : `${exportSummary.minDate} to ${exportSummary.maxDate}`}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 font-black block uppercase">Class Group:</span>
                  <span className="font-extrabold text-neutral-200">
                    {classFilter === 'ALL' ? 'All Classes' : `Grade: ${classFilter}`}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 font-black block uppercase">Student search:</span>
                  <span className="font-extrabold text-neutral-200 break-all">
                    {searchQuery.trim() ? `"${searchQuery.trim()}"` : 'All Pupil Profiles'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 font-black block uppercase">Demographic Category:</span>
                  <span className="font-extrabold text-neutral-200">
                    {categoryFilter === 'ALL' ? 'All Demographics' : categoryFilter}
                  </span>
                </div>
              </div>
            </div>

            {/* Warning note */}
            <div className="p-3 bg-amber-400/10 border border-amber-400/20 text-[10px] font-mono text-amber-300 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping shrink-0"></span>
              <span>Excel workbook triggers physical browser download immediately.</span>
            </div>

            {/* Actions block */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2 font-mono">
              <button
                type="button"
                id="btn-confirm-export"
                onClick={confirmExcelExport}
                className="w-full sm:w-7/12 py-4 bg-emerald-400 hover:bg-emerald-300 hover:text-black text-neutral-950 text-xs font-black uppercase tracking-widest text-center cursor-pointer transition-all border border-transparent shadow-[4px_4px_0px_0px_rgba(16,185,129,0.2)]"
              >
                Confirm & Download
              </button>
              <button
                type="button"
                id="btn-cancel-export"
                onClick={() => setShowExportModal(false)}
                className="w-full sm:w-5/12 py-4 bg-neutral-950 hover:bg-neutral-850 text-neutral-400 hover:text-white text-[11px] font-black uppercase tracking-widest text-center cursor-pointer transition-all border border-neutral-800"
              >
                Abort Export
              </button>
            </div>

            {/* Helper Table Link */}
            <div className="text-center pt-1 border-t border-neutral-850">
              <button
                type="button"
                onClick={() => {
                  setShowExportModal(false);
                  setPreviewPage(1);
                  setShowPreviewModal(true);
                }}
                className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 hover:text-emerald-300 underline cursor-pointer transition-colors"
              >
                🔍 Live Row-by-Row Table Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEDGER REPORT DATA PREVIEW MODAL */}
      {showPreviewModal && (
        <div 
          id="report-preview-modal" 
          className="fixed inset-0 z-50 bg-neutral-950/85 backdrop-blur-sm flex items-center justify-center p-4 font-sans"
        >
          <div className="relative w-full max-w-4xl bg-neutral-900 border-4 border-emerald-400 p-6 md:p-8 space-y-6 shadow-[8px_8px_0px_0px_rgba(16,185,129,0.15)] text-white flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-neutral-800 pb-4 shrink-0">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-emerald-400/10 border border-emerald-400 text-emerald-400 shrink-0">
                  <Eye size={20} />
                </div>
                <div>
                  <span className="text-[9px] text-emerald-400 font-mono tracking-widest font-black uppercase block">Ledger Verification Desk</span>
                  <h3 className="text-base font-black uppercase tracking-tight">Current Report Data Live Preview</h3>
                  <p className="text-[11px] text-neutral-450 mt-1">
                    Showing filtered entries from the current query view. Verify all name registers and receipt amounts below.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowPreviewModal(false)}
                className="p-1 cursor-pointer text-neutral-450 hover:text-white transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick stats ribbon */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-neutral-950/60 p-3.5 border border-neutral-850 shrink-0 font-mono text-[10px]">
              <div>
                <span className="text-neutral-500 block text-[8px] uppercase">Matching Records</span>
                <span className="text-white font-extrabold">{filteredPayments.length} rows</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[8px] uppercase">Report Valuation</span>
                <span className="text-amber-400 font-extrabold">GHC {totalsInfo.totalCollected.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[8px] uppercase">Active Grade Filter</span>
                <span className="text-white font-extrabold">{classFilter === 'ALL' ? 'ALL GRADES' : classFilter}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[8px] uppercase">Demographic Bounds</span>
                <span className="text-white font-extrabold">{categoryFilter === 'ALL' ? 'ALL COHORTS' : categoryFilter}</span>
              </div>
            </div>

            {/* Preview Table Container (with vertical scrolling if many) */}
            <div className="flex-1 overflow-y-auto border border-neutral-850 bg-neutral-950/40">
              <div className="min-w-[600px]">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="bg-neutral-950 sticky top-0 border-b border-neutral-850 font-mono text-[9px] uppercase tracking-widest text-neutral-450">
                    <tr>
                      <th className="p-3">Date Check</th>
                      <th className="p-3">Student Name</th>
                      <th className="p-3 text-center">Class</th>
                      <th className="p-3">Group</th>
                      <th className="p-3 text-right">Fee (GHC)</th>
                      <th className="p-3 font-mono">Collected By</th>
                      <th className="p-3 text-center font-mono">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900 leading-relaxed font-sans">
                    {paginatedPayments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-neutral-500 font-bold uppercase tracking-widest text-xs font-mono">
                          No matching ledger entries for preview.
                        </td>
                      </tr>
                    ) : (
                      paginatedPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-neutral-900/40">
                          <td className="p-3 font-mono text-neutral-500">{p.date}</td>
                          <td className="p-3 font-extrabold text-white uppercase text-[11px] tracking-wide">{p.studentName}</td>
                          <td className="p-3 font-mono font-black text-amber-400 text-center">{p.class}</td>
                          <td className="p-3 text-neutral-450 text-[10px] uppercase font-black tracking-wider">{p.category}</td>
                          <td className="p-3 text-right font-black font-mono text-white">GHC {p.amount.toFixed(2)}</td>
                          <td className="p-3 text-neutral-400 text-[10.5px] font-bold uppercase max-w-[120px] truncate">{p.collectedBy}</td>
                          <td className="p-3 text-center">
                            {p.verified ? (
                              <span className="inline-block px-2 py-0.5 bg-emerald-950/40 text-emerald-400 border border-emerald-900 text-[8.5px] uppercase font-black font-mono tracking-widest">
                                Approved
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 bg-amber-950/40 text-amber-400 border border-amber-900 text-[8.5px] uppercase font-black font-mono tracking-widest">
                                Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination Controls Footer */}
            {totalPreviewPages > 1 && (
              <div className="flex justify-between items-center bg-neutral-950 border border-neutral-850 p-3 shrink-0 font-mono text-[10px]">
                <div className="text-neutral-450 font-semibold">
                  Showing <span className="text-white font-extrabold">{(previewPage - 1) * PREVIEW_ITEMS_PER_PAGE + 1}</span> - <span className="text-white font-extrabold">{Math.min(previewPage * PREVIEW_ITEMS_PER_PAGE, filteredPayments.length)}</span> of <span className="text-emerald-400 font-extrabold">{filteredPayments.length}</span> results
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewPage(prev => Math.max(1, prev - 1))}
                    disabled={previewPage === 1}
                    className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-800 hover:text-white transition-all cursor-pointer font-bold rounded-xs"
                  >
                    PREV
                  </button>
                  <span className="text-neutral-400 font-bold px-1 select-none">
                    Page <strong className="text-white">{previewPage}</strong> of {totalPreviewPages}
                  </span>
                  <button
                    onClick={() => setPreviewPage(prev => Math.min(totalPreviewPages, prev + 1))}
                    disabled={previewPage === totalPreviewPages}
                    className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-800 hover:text-white transition-all cursor-pointer font-bold rounded-xs"
                  >
                    NEXT
                  </button>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-neutral-800 shrink-0 font-mono">
              <button
                type="button"
                onClick={() => {
                  setShowPreviewModal(false);
                  triggerExcelExport();
                }}
                disabled={filteredPayments.length === 0}
                className="w-full sm:w-7/12 py-4 bg-emerald-400 hover:bg-emerald-300 hover:text-black text-neutral-950 text-xs font-black uppercase tracking-widest text-center cursor-pointer transition-all border border-transparent shadow-[4px_4px_0px_0px_rgba(16,185,129,0.2)] flex items-center justify-center gap-1.5 font-bold"
              >
                <FileSpreadsheet size={14} /> Download Excel Spreadsheet
              </button>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="w-full sm:w-5/12 py-4 bg-neutral-950 hover:bg-neutral-850 text-neutral-400 hover:text-white text-[11px] font-black uppercase tracking-widest text-center cursor-pointer transition-all border border-neutral-800"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT FRIENDLY MODAL - PDF/PRINTER READY STRUCTURE FOR CURRENT FILTERED DATA */}
      {showPrintFriendlyModal && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-neutral-950 flex flex-col md:flex-row font-sans">
          {/* CUSTOM STYLE INJECTIONS FOR FLUID AND RELIABLE A4 PORTRAIT PRINTING */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: portrait;
                margin: 15mm;
                @bottom-right {
                  content: "Page " counter(page) " of " counter(pages);
                  font-family: 'JetBrains Mono', monospace !important;
                  font-size: 8px !important;
                  font-weight: bold !important;
                  color: #333333 !important;
                }
              }
              body * {
                visibility: hidden !important;
              }
              #print-friendly-area, #print-friendly-area * {
                visibility: visible !important;
              }
              #print-friendly-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100% !important;
                margin: 0 !important;
                padding: 12mm !important;
                background: white !important;
                color: black !important;
                font-family: ui-sans-serif, system-ui, -apple-system, sans-serif !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .no-print {
                display: none !important;
              }
              /* Standard high-fidelity styling rules for printed sheets */
              table {
                width: 100% !important;
                border-collapse: collapse !important;
              }
              th, td {
                border: 1px solid #c0c0c0 !important;
                padding: 6px 8px !important;
                font-size: 10px !important;
              }
              th {
                background-color: #f3f4f6 !important;
                font-weight: bold !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `}} />

          {/* CONTROL PANEL COLUMN (HIDDEN IN PRINTING) */}
          <div className="w-full md:w-96 bg-neutral-900 border-r-4 border-neutral-800 flex flex-col h-full overflow-y-auto no-print p-6 space-y-6 text-white shrink-0">
            <div className="border-b border-neutral-855 pb-4">
              <span className="text-[10px] text-blue-400 font-mono tracking-widest font-black uppercase block">Saako Holy Child Trust</span>
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mt-1">
                <Printer size={18} className="text-blue-400" /> PRINT FRIENDLY LEDGER
              </h3>
            </div>

            {/* Config Fields */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-mono uppercase font-black text-neutral-450 tracking-wider">Document Settings</h4>
              
              {/* Authorized Signatory field */}
              <div className="space-y-1">
                <label className="text-[9px] font-mono uppercase font-black text-neutral-500 block">Authorized Signatory Name</label>
                <input
                  type="text"
                  value={printFriendlySignatory}
                  onChange={(e) => setPrintFriendlySignatory(e.target.value)}
                  className="w-full bg-neutral-950 border-2 border-neutral-850 hover:border-neutral-700 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-400 font-bold"
                  placeholder="e.g. Yakubu Hakeem (Headmaster)"
                />
              </div>

              {/* Custom Footnotes / Verification Memos */}
              <div className="space-y-1">
                <label className="text-[9px] font-mono uppercase font-black text-neutral-500 block">Statement Annotation Memo</label>
                <textarea
                  rows={4}
                  value={printFriendlyMemo}
                  onChange={(e) => setPrintFriendlyMemo(e.target.value)}
                  className="w-full bg-neutral-950 border-2 border-neutral-850 hover:border-neutral-700 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-400 text-[11px] leading-relaxed resize-none"
                  placeholder="Add custom annotations or compliance guidelines..."
                />
              </div>
            </div>

            {/* Document Statistics Board */}
            <div className="bg-neutral-950 border border-neutral-850 p-4 space-y-3 font-mono">
              <span className="text-[9px] font-mono uppercase text-neutral-500 font-extrabold block">Print Batch Valuation</span>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Total Entries:</span>
                  <span className="text-white font-extrabold">{filteredPayments.length} rows</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-550">Sum Amount:</span>
                  <span className="text-emerald-400 font-extrabold">GHC {totalsInfo.totalCollected.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-550">Unverified rows:</span>
                  <span className="text-amber-500 font-extrabold">{totalsInfo.unverifiedCount} matching</span>
                </div>
              </div>
            </div>

            {/* Manual actions area */}
            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.focus();
                    window.print();
                  }
                }}
                disabled={filteredPayments.length === 0}
                className="w-full py-4 text-xs font-black uppercase text-neutral-950 bg-amber-400 hover:bg-amber-300 disabled:bg-neutral-800 disabled:text-neutral-550 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg font-mono"
              >
                <Printer size={15} /> PRINT DIRECTLY FROM PAGE (FAST)
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAppPrintPreviewModal(true);
                }}
                disabled={filteredPayments.length === 0}
                className="w-full py-3 text-xs font-black uppercase text-white bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 disabled:text-neutral-550 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm font-mono"
              >
                <FileText size={14} /> ADAPT IN INTERACTIVE PREVIEW
              </button>

              <button
                type="button"
                onClick={() => {
                  handleShareReportOrInvoice('ledger-report', {
                    totalRowsMatched: filteredPayments.length,
                    ledgerValuation: totalsInfo.totalCollected,
                    unverifiedRows: totalsInfo.unverifiedCount,
                    authorizedSignatory: printFriendlySignatory,
                    auditedMemo: printFriendlyMemo
                  });
                }}
                disabled={filteredPayments.length === 0}
                className="w-full py-3 text-xs font-black uppercase text-white bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-550 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm font-mono"
              >
                <Share2 size={14} /> SHARE LEDGER REPORT
              </button>

              <button
                type="button"
                onClick={() => setShowPrintFriendlyModal(false)}
                className="w-full py-3 text-xs font-black uppercase text-neutral-450 hover:text-white bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 transition-colors cursor-pointer font-mono"
              >
                DISMISS SYSTEM
              </button>
            </div>
          </div>

          {/* HIGH-FIDELITY LIVE A4 SHEET WORKSPACE */}
          <div className="flex-1 overflow-y-auto bg-neutral-950 p-4 md:p-8 no-print-scroll scrollbar-thin">
            
            {/* Real-time Document Compilation Indicator */}
            <div className="max-w-[210mm] mx-auto flex items-center justify-between no-print border-b border-neutral-850 pb-3 mb-6 font-mono">
              <span className="text-[10px] font-black uppercase text-neutral-400 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                LIVE REPORT PREPARATION HARNESS • {filteredPayments.length} ENTRIES LOADED
              </span>
              <span className="text-[10px] text-neutral-500">GRAYSCALE PRINT-SAFE GRAPHICS</span>
            </div>

            {/* PRINT PORTRAIT SKELETON CANVAS */}
            <div 
              id="print-friendly-area" 
              className={`bg-white text-black shadow-2xl mx-auto flex flex-col justify-between border border-neutral-300 font-sans relative overflow-hidden ${
                printMargins === 'compact' ? 'p-6 space-y-4' :
                printMargins === 'wide' ? 'p-14 md:p-16 space-y-8' :
                'p-10 md:p-12 space-y-6'
              } ${
                paperSize === 'letter' ? 'max-w-[216mm] min-h-[279mm]' :
                paperSize === 'legal' ? 'max-w-[216mm] min-h-[356mm]' :
                'max-w-[210mm] min-h-[297mm]'
              }`}
            >
              {/* Optional diagonal watermark overlay */}
              {selectedWatermark !== 'NONE' && (
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none select-none z-0">
                  <div className="text-[48px] md:text-[64px] font-black tracking-widest text-neutral-150/40 uppercase font-mono border-8 border-neutral-150/40 px-6 py-2 rounded-xl rotate-[-30deg] opacity-[0.25]">
                    {selectedWatermark}
                  </div>
                </div>
              )}
              
              {/* UPPER SECTION: Headings, Metadata, and Financial Matrix */}
              <div className="space-y-6 z-10 relative">
                
                {/* Official Crest Headings Banner */}
                {showCrest && (
                  <div className="border-b-4 border-neutral-900 pb-4 flex justify-between items-start">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-neutral-600 font-mono tracking-widest uppercase block">
                        OFFICIAL ADMINISTRATIVE AUDIT RECORD
                      </span>
                      <h2 className="text-2xl font-black uppercase tracking-tight leading-none text-black">
                        SAAKO HOLY CHILD ACADEMY
                      </h2>
                      <p className="text-[10px] text-neutral-600 font-black uppercase tracking-widest font-mono leading-none mt-1">
                        Holiness is our Key, P. O. Box LS 15, Sawla Savannah Region • Sawla, Jelinkon street, Savannah Region. Tel: +233545029200 / +2330507274133
                      </p>
                    </div>

                    <div className="text-right space-y-1 font-mono">
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-neutral-200 border border-black text-black inline-block leading-none">
                        LEDGER STATEMENT
                      </span>
                      <div className="text-[8px] text-neutral-500 font-bold mt-1">
                        RUN DATE: {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Scope Filters and Transaction Summary Metrics */}
                <div className="grid grid-cols-4 gap-4 bg-neutral-50 p-4 border border-neutral-300 font-mono text-[10px] uppercase leading-relaxed text-neutral-800">
                  <div className="space-y-0.5">
                    <span className="text-[8px] text-neutral-500 font-black block">ACADEMIC COHORT FILTER</span>
                    <span className="font-extrabold text-black">{classFilter === 'ALL' ? 'ALL GRADES / CLASSES' : `GRADE CLASS ${classFilter}`}</span>
                  </div>
                  <div className="space-y-0.5 border-l border-neutral-300 pl-3">
                    <span className="text-[8px] text-neutral-500 font-black block">DEMOGRAPHIC RANGE</span>
                    <span className="font-extrabold text-black">{categoryFilter === 'ALL' ? 'ALL GROUPS (BOARD/DAY)' : categoryFilter}</span>
                  </div>
                  <div className="space-y-0.5 border-l border-neutral-300 pl-3">
                    <span className="text-[8px] text-neutral-500 font-black block">VALUATION BALANCE</span>
                    <span className="font-extrabold text-emerald-700 text-xs">GHC {totalsInfo.totalCollected.toFixed(2)}</span>
                  </div>
                  <div className="space-y-0.5 border-l border-neutral-300 pl-3">
                    <span className="text-[8px] text-neutral-500 font-black block">RECORD LENGTH</span>
                    <span className="font-extrabold text-black">{filteredPayments.length} ROWS MATCHED</span>
                  </div>
                </div>

                {/* LEDGER GRID TABLE */}
                <div className="overflow-hidden border border-neutral-300">
                  <table className="w-full text-left text-[11px] border-collapse leading-normal font-sans">
                    <thead className="bg-neutral-100 font-mono text-[9px] uppercase tracking-wider text-black border-b-2 border-neutral-400">
                      <tr>
                        <th className="p-2 border border-neutral-300 text-center font-bold w-10">#</th>
                        <th className="p-2 border border-neutral-300 font-bold">TRANSACTION DATE</th>
                        <th className="p-2 border border-neutral-300 font-bold">PUPIL BENEFICIARY</th>
                        <th className="p-2 border border-neutral-300 text-center font-bold">GRADE</th>
                        <th className="p-2 border border-neutral-300 font-bold">DEMOGRAPHIC</th>
                        <th className="p-2 border border-neutral-300 text-right font-bold flex-1">FEE (GHC)</th>
                        <th className="p-2 border border-neutral-300 font-bold">RECEIPT ID / REF</th>
                        <th className="p-2 border border-neutral-300 text-center font-bold">VERIFICATION STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-300">
                      {filteredPayments.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-8 text-neutral-400 italic">
                            No ledger entries listed in active session.
                          </td>
                        </tr>
                      ) : (
                        filteredPayments.map((p, idx) => (
                          <tr key={p.id} className="hover:bg-neutral-50">
                            <td className="p-2 border border-neutral-300 text-center font-mono">{idx + 1}</td>
                            <td className="p-2 border border-neutral-300 font-mono text-neutral-600">{p.date}</td>
                            <td className="p-2 border border-neutral-300 font-bold uppercase">
                              <div>{p.studentName}</div>
                              {p.notes && (
                                <div className="text-[9px] font-mono font-medium text-neutral-500 uppercase leading-snug mt-0.5 whitespace-normal normal-case">
                                  (* {p.notes})
                                </div>
                              )}
                            </td>
                            <td className="p-2 border border-neutral-300 text-center font-mono font-semibold text-neutral-800">{p.class}</td>
                            <td className="p-2 border border-neutral-300 text-xs text-neutral-700 font-medium uppercase font-mono">{p.category}</td>
                            <td className="p-2 border border-neutral-300 text-right font-mono font-bold">GHC {p.amount.toFixed(2)}</td>
                            <td className="p-2 border border-neutral-300 font-mono text-[9px] text-neutral-600">{p.id.toUpperCase().substring(0, 10)}...</td>
                            <td className="p-2 border border-neutral-300 text-center font-mono text-[9px]">
                              {p.verified ? 'APPROVED' : 'PENDING APPROVAL'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Custom annotations and regulatory stamps */}
                {printFriendlyMemo && (
                  <div className="bg-neutral-50 p-3.5 border border-neutral-300 rounded-px text-[10px] leading-relaxed text-neutral-600 italic">
                    <span className="font-bold text-neutral-800 uppercase not-italic block mb-1 text-[8px] tracking-wide">
                      AUDIT STATION COMMENTS & MEMORANDUM
                    </span>
                    {printFriendlyMemo}
                  </div>
                )}
              </div>

              {/* LOWER SECTION: Signature Blocks & Security Seals */}
              <div className="pt-8 mt-8 border-t border-neutral-300 flex justify-between items-end gap-6 shrink-0 z-10 relative">
                
                {/* Signatures Structure */}
                <div className="flex-1 grid grid-cols-2 gap-6 text-[10px] leading-relaxed">
                  <div className="space-y-4">
                    <span className="text-neutral-500 font-black uppercase text-[8px] block">PREPARED & VERIFIED BY:</span>
                    <div className="h-10 border-b border-black w-44"></div>
                    <div>
                      <span className="text-black font-extrabold uppercase">ASSIGNED DESK OFFICER</span>
                      <span className="text-neutral-500 block text-[9px]">Class Gate Supervisor / Auditor</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <span className="text-neutral-500 font-black uppercase text-[8px] block">APPROVED & COUNTERSIGNED BY:</span>
                    <div className="h-10 border-b border-black w-44"></div>
                    <div>
                      <span className="text-black font-extrabold uppercase">{printFriendlySignatory}</span>
                      <span className="text-neutral-500 block text-[9px]">Saako Holy Child Board Exec</span>
                    </div>
                  </div>
                </div>

                {/* SAAKO HOLY CHILD ACADEMY SEAL */}
                <div className="shrink-0 flex flex-col items-center justify-center bg-white text-black p-1 rounded-full">
                  <svg width="68" height="68" viewBox="0 0 100 100" className="opacity-100 select-none bg-white">
                    {/* Nice green outer boundary ring */}
                    <circle cx="50" cy="50" r="48" fill="#14532d" stroke="#166534" strokeWidth="4" />
                    <circle cx="50" cy="50" r="42" fill="#22c55e" stroke="#14532d" strokeWidth="1.5" />
                    {/* Green inside filled details */}
                    <circle cx="50" cy="50" r="39" fill="#dcfce7" />
                    <circle cx="50" cy="50" r="36" fill="none" stroke="#16a34a" strokeWidth="1" strokeDasharray="2 1.5" />
                    <defs>
                      <path id="reportSealInnerArcTop" d="M 22 50 A 28 28 0 0 1 78 50" fill="none" />
                      <path id="reportSealInnerArcBottom" d="M 78 50 A 28 28 0 0 1 22 50" fill="none" />
                    </defs>
                    <text className="font-sans font-black text-[5.8px] fill-[#14532d] tracking-[0.02em]">
                      <textPath href="#reportSealInnerArcTop" startOffset="50%" textAnchor="middle">
                        SAAKO TRUST
                      </textPath>
                    </text>
                    <text className="font-sans font-black text-[5px] fill-emerald-955 tracking-[0.05em]">
                      <textPath href="#reportSealInnerArcBottom" startOffset="50%" textAnchor="middle">
                        * EXCELLENCE *
                      </textPath>
                    </text>
                    {/* Beautiful Coiled Python */}
                    <g transform="translate(42, 42) scale(0.16)" stroke="#14532d" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      {/* Main deep forest green coiled body */}
                      <path d="M 12 70 C 12 40, 24 15, 50 15 C 76 15, 88 35, 88 55 C 88 75, 70 85, 50 85 C 30 85, 20 70, 25 55 C 30 40, 45 40, 50 45 C 55 50, 52 65, 45 65 C 38 65, 38 52, 44 48" strokeWidth="6.5" stroke="#14532d" />
                      
                      {/* Elegant light emerald-green dorsal spot patterns */}
                      <path d="M 12 70 C 12 40, 24 15, 50 15 C 76 15, 88 35, 88 55 C 88 75, 70 85, 50 85 C 30 85, 20 70, 25 55 C 30 40, 45 40, 50 45 C 55 50, 52 65, 45 65 C 38 65, 38 52, 44 48" stroke="#86efac" strokeWidth="1.5" strokeDasharray="3 5" />

                      {/* Accent highlight outline for 3D depth */}
                      <path d="M 12 70 C 12 40, 24 15, 50 15 C 76 15, 88 35, 88 55" stroke="#f0fdf4" strokeWidth="1.2" opacity="0.65" />

                      {/* Adorable little golden crown for the champion python */}
                      <path d="M 40 41.5 L 38.5 38 L 42 39.5 L 44 36 L 46 39.5 L 49.5 38 L 48 41.5 Z" fill="#fbbf24" stroke="#14532d" strokeWidth="0.8" strokeLinejoin="miter" />

                      {/* Cute chibified head */}
                      <circle cx="44" cy="47" r="6" fill="#14532d" stroke="none" />
                      
                      {/* Generous sweet rosy blush cheeks */}
                      <circle cx="38" cy="48.5" r="1.3" fill="#f43f5e" opacity="0.8" stroke="none" />
                      <circle cx="50" cy="48.5" r="1.3" fill="#f43f5e" opacity="0.8" stroke="none" />

                      {/* Happy sparkling big anime eyes */}
                      <circle cx="41.5" cy="45.5" r="1.8" fill="white" stroke="none" />
                      <circle cx="46.5" cy="45.5" r="1.8" fill="white" stroke="none" />
                      <circle cx="41.5" cy="45.5" r="1" fill="#14532d" stroke="none" />
                      <circle cx="46.5" cy="45.5" r="1" fill="#14532d" stroke="none" />
                      <circle cx="41" cy="44.8" r="0.45" fill="white" stroke="none" />
                      <circle cx="46" cy="44.8" r="0.45" fill="white" stroke="none" />

                      {/* Sweet cheerful smile */}
                      <path d="M 41.5 49 Q 44 51.5, 46.5 49" stroke="#f0fdf4" strokeWidth="0.8" strokeLinecap="round" fill="none" />

                      {/* Delightful small pink tongue */}
                      <path d="M 43.5 50.2 Q 43.5 52.5, 44.2 52.5" stroke="#f43f5e" strokeWidth="0.8" strokeLinecap="round" fill="none" />

                      {/* Floating romantic pink heart */}
                      <path d="M 55 36 C 54 34, 52 34, 52 36 C 52 38, 55 40, 55 40 C 55 40, 58 38, 58 36 C 58 34, 56 34, 55 36 Z" fill="#ec4899" opacity="0.95" stroke="none" />
                    </g>
                  </svg>
                  <span className="text-[7px] font-mono text-emerald-800 uppercase tracking-widest mt-1 block font-bold">OFFICIAL IMPRESS</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* HIGH-FIDELITY INTERACTIVE PRINT PREVIEW MODAL DESK */}
      {showAppPrintPreviewModal && (
        <div className="fixed inset-0 z-[100] bg-neutral-950 flex flex-col md:flex-row overflow-hidden font-sans text-white border-2 border-neutral-850">
          
          {/* LEFT INTERACTIVE PANEL: Controls and Configuration Bench */}
          <div className="w-full md:w-96 bg-neutral-900 border-r border-neutral-800 flex flex-col h-full overflow-y-auto p-5 space-y-5 shrink-0 no-print">
            <div className="border-b border-neutral-850 pb-3">
              <span className="text-[9px] text-amber-400 font-mono tracking-widest font-black uppercase block">Saako Auditing Suite</span>
              <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2 mt-0.5">
                <Printer size={16} className="text-amber-400" /> PRINT PREVIEW BENCH
              </h3>
            </div>

            {/* Document stats */}
            <div className="bg-neutral-950 p-4 border border-neutral-850 space-y-2 rounded-xs font-mono text-[10px]">
              <span className="text-neutral-500 font-bold block text-[8px] tracking-wide uppercase">COMPILED STATEMENT INSIGHTS</span>
              <div className="flex justify-between border-b border-neutral-900 pb-1.5">
                <span className="text-neutral-400">Total Rows Matched:</span>
                <span className="text-white font-extrabold">{filteredPayments.length} entries</span>
              </div>
              <div className="flex justify-between border-b border-neutral-900 pb-1.5">
                <span className="text-neutral-400">Ledger Valuation:</span>
                <span className="text-emerald-400 font-extrabold">GHC {totalsInfo.totalCollected.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">System Checklist:</span>
                <span className="text-amber-400 font-extrabold">Grayscale Safe</span>
              </div>
            </div>

            {/* Page Setup Options */}
            <div className="space-y-4 bg-neutral-950/40 p-4 border border-neutral-850 rounded-xs">
              <h4 className="text-[10px] font-mono uppercase font-black text-amber-400/80 tracking-wider">Page Customizer Desk</h4>
              
              {/* Paper Dimension Selection */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono uppercase text-neutral-450 block font-bold">Paper Dimensions</label>
                <div className="grid grid-cols-3 gap-1">
                  {(['a4', 'letter', 'legal'] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setPaperSize(size)}
                      className={`py-1.5 px-2 text-[9px] font-mono font-black uppercase border transition-all cursor-pointer ${
                        paperSize === size
                          ? 'bg-amber-400 border-amber-400 text-black'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-450 hover:text-white'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Layout Margins Selection */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono uppercase text-neutral-450 block font-bold">Layout Margins</label>
                <div className="grid grid-cols-3 gap-1">
                  {(['compact', 'normal', 'wide'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPrintMargins(m)}
                      className={`py-1.5 px-2 text-[9px] font-mono font-black uppercase border transition-all cursor-pointer ${
                        printMargins === m
                          ? 'bg-amber-400 border-amber-400 text-black'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-450 hover:text-white'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Security Watermark Stamp selection */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono uppercase text-neutral-450 block font-bold">Watermark Overlay Stamp</label>
                <select
                  value={selectedWatermark}
                  onChange={(e: any) => setSelectedWatermark(e.target.value)}
                  className="w-full text-[10px] font-mono bg-neutral-900 border border-neutral-800 text-white p-2 focus:border-amber-400 outline-none uppercase font-bold"
                >
                  <option value="NONE">NO WATERMARK</option>
                  <option value="DRAFT">DRAFT PREVIEW</option>
                  <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                  <option value="SAAKO AUDITED">SAAKO AUDITED</option>
                </select>
              </div>

              {/* Academic Crest Toggle */}
              <div className="flex items-center justify-between pt-1 border-t border-neutral-900">
                <span className="text-[9px] font-mono uppercase text-neutral-400 font-bold">Show School Banner</span>
                <button
                  type="button"
                  onClick={() => setShowCrest(!showCrest)}
                  className={`px-3 py-1 text-[8px] font-mono font-black uppercase transition-colors rounded-3xs border ${
                    showCrest 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-black' 
                      : 'bg-neutral-900 border-neutral-800 text-neutral-500'
                  }`}
                >
                  {showCrest ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>
            </div>

            {/* Interactive Zoom Controls */}
            <div className="space-y-2">
              <label className="text-[9px] font-mono uppercase text-neutral-450 block font-bold flex justify-between">
                <span>PREVIEW WORKSPACE ZOOM</span>
                <span className="text-amber-400 font-black">{printPreviewZoom}%</span>
              </label>
              <div className="flex items-center gap-1.5 bg-neutral-950 p-2 border border-neutral-855">
                <button
                  type="button"
                  onClick={() => setPrintPreviewZoom(Math.max(40, printPreviewZoom - 10))}
                  className="p-1 px-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-855 cursor-pointer text-xs font-bold"
                  title="Zoom Out"
                >
                  <ZoomOut size={12} />
                </button>
                <div className="flex-1 grid grid-cols-4 gap-1 text-[8px] font-mono text-center">
                  {[55, 75, 90, 100].map((z) => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => setPrintPreviewZoom(z)}
                      className={`py-1 cursor-pointer border ${
                        printPreviewZoom === z
                          ? 'border-amber-400 text-amber-400 bg-amber-400/5'
                          : 'border-transparent text-neutral-500'
                      }`}
                    >
                      {z}%
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setPrintPreviewZoom(Math.min(150, printPreviewZoom + 10))}
                  className="p-1 px-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-855 cursor-pointer text-xs font-bold"
                  title="Zoom In"
                >
                  <ZoomIn size={12} />
                </button>
              </div>
            </div>

            {/* Helpful instructions layout */}
            <div className="bg-neutral-950/70 p-4 border border-dashed border-neutral-800 rounded-px space-y-2 text-[9px] text-neutral-450 font-mono tracking-wide leading-relaxed">
              <span className="font-extrabold text-neutral-300 block uppercase">⚙️ PRINTER DISPATCH PROTOCOLS:</span>
              <ul className="list-disc pl-3.5 space-y-1">
                <li>Check <strong className="text-neutral-300">Background Graphics</strong> inside your OS Print Options to retain official gray tables.</li>
                <li>Set paper destination to <strong className="text-amber-400">Save as PDF</strong> inside the native system print workflow.</li>
                <li>Use <strong className="text-neutral-300">Grayscale Mode</strong> for high contrast physical receipt handouts.</li>
              </ul>
            </div>

            {/* Print Confirmation Actions Panel */}
            <div className="pt-2 space-y-2 mt-auto">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.focus();
                    window.print();
                  }
                }}
                className="w-full py-4 text-xs font-black uppercase text-black bg-amber-400 hover:bg-amber-300 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl font-mono"
              >
                <Printer size={15} /> DISPATCH PRINTER SYSTEM
              </button>

              <button
                type="button"
                onClick={() => {
                  handleShareReportOrInvoice('ledger-report', {
                    totalRowsMatched: filteredPayments.length,
                    ledgerValuation: totalsInfo.totalCollected,
                    unverifiedRows: totalsInfo.unverifiedCount,
                    authorizedSignatory: printFriendlySignatory,
                    auditedMemo: printFriendlyMemo
                  });
                }}
                className="w-full py-3.5 text-xs font-black uppercase text-white bg-emerald-600 hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md font-mono"
              >
                <Share2 size={14} /> SHARE LEDGER REPORT
              </button>

              <button
                type="button"
                onClick={() => setShowAppPrintPreviewModal(false)}
                className="w-full py-3 text-xs font-black uppercase text-neutral-450 hover:text-white bg-neutral-900 border border-neutral-800 hover:bg-neutral-850 transition-all cursor-pointer font-mono"
              >
                RETURN TO LEDGER BUILDER
              </button>
            </div>
          </div>

          {/* RIGHT VIEWPORT: Interactive Simulated Sheet Workspace */}
          <div className="flex-1 overflow-auto bg-neutral-950 p-6 md:p-12 flex flex-col items-center">
            
            {/* Control stats headers banner */}
            <div className="w-full max-w-[210mm] flex items-center justify-between no-print border-b border-neutral-855 pb-2.5 mb-8 font-mono text-[10px]">
              <span className="font-bold text-neutral-400 flex items-center gap-2 transition-all">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                SIMULATING HIGH FIDELITY OUTPUT CANVAS ({paperSize.toUpperCase()})
              </span>
              <div className="flex items-center gap-2 text-neutral-500">
                <span>SCALED AT {printPreviewZoom}%</span>
              </div>
            </div>

            {/* A4 PORTRAIT PREVIEW PAPER SHEET CONTAINER WITH INLINE ROTATION & ZOOM SCALING */}
            <div 
              style={{ 
                transform: `scale(${printPreviewZoom / 100})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              className="bg-white text-black shadow-2xl flex flex-col justify-between border border-neutral-300 font-sans relative overflow-hidden shrink-0"
            >
              
              {/* INTERNALS CLONED PREVIEW SKELETON */}
              <div 
                className={`flex-1 flex flex-col justify-between h-full ${
                  printMargins === 'compact' ? 'p-6 space-y-4' :
                  printMargins === 'wide' ? 'p-14 md:p-16 space-y-8' :
                  'p-10 md:p-12 space-y-6'
                } ${
                  paperSize === 'letter' ? 'w-[216mm] min-h-[279mm]' :
                  paperSize === 'legal' ? 'w-[216mm] min-h-[356mm]' :
                  'w-[210mm] min-h-[297mm]'
                }`}
              >
                {/* Simulated diagonal watermark overlay inside workspace sheet */}
                {selectedWatermark !== 'NONE' && (
                  <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none select-none z-0">
                    <div className="text-[48px] md:text-[64px] font-black tracking-widest text-neutral-150/40 uppercase font-mono border-8 border-neutral-150/40 px-6 py-2 rounded-xl rotate-[-30deg] opacity-[0.25]">
                      {selectedWatermark}
                    </div>
                  </div>
                )}

                {/* UPPER CONTENT BLOCK */}
                <div className="space-y-6 z-10 relative">
                  
                  {/* Cloned Crest Academic Banner */}
                  {showCrest && (
                    <div className="border-b-4 border-neutral-900 pb-4 flex justify-between items-start">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-neutral-600 font-mono tracking-widest uppercase block">
                          OFFICIAL ADMINISTRATIVE AUDIT RECORD
                        </span>
                        <h2 className="text-2xl font-black uppercase tracking-tight leading-none text-black">
                          SAAKO HOLY CHILD ACADEMY
                        </h2>
                        <p className="text-[10px] text-neutral-600 font-black uppercase tracking-widest font-mono leading-none mt-1">
                          Holiness is our Key, P. O. Box LS 15, Sawla Savannah Region • Sawla, Jelinkon street, Savannah Region. Tel: +233545029200 / +2330507274133
                        </p>
                      </div>

                      <div className="text-right space-y-1 font-mono">
                        <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-neutral-200 border border-black text-black inline-block leading-none">
                          LEDGER STATEMENT
                        </span>
                        <div className="text-[8px] text-neutral-500 font-bold mt-1">
                          RUN DATE: {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Summary grid */}
                  <div className="grid grid-cols-4 gap-4 bg-neutral-50 p-4 border border-neutral-300 font-mono text-[10px] uppercase leading-relaxed text-neutral-800">
                    <div className="space-y-0.5">
                      <span className="text-[8px] text-neutral-500 font-black block">ACADEMIC COHORT FILTER</span>
                      <span className="font-extrabold text-black">{classFilter === 'ALL' ? 'ALL GRADES / CLASSES' : `GRADE CLASS ${classFilter}`}</span>
                    </div>
                    <div className="space-y-0.5 border-l border-neutral-300 pl-3">
                      <span className="text-[8px] text-neutral-500 font-black block">DEMOGRAPHIC RANGE</span>
                      <span className="font-extrabold text-black">{categoryFilter === 'ALL' ? 'ALL GROUPS (BOARD/DAY)' : categoryFilter}</span>
                    </div>
                    <div className="space-y-0.5 border-l border-neutral-300 pl-3">
                      <span className="text-[8px] text-neutral-500 font-black block">VALUATION BALANCE</span>
                      <span className="font-extrabold text-emerald-700 text-xs">GHC {totalsInfo.totalCollected.toFixed(2)}</span>
                    </div>
                    <div className="space-y-0.5 border-l border-neutral-300 pl-3">
                      <span className="text-[8px] text-neutral-500 font-black block">RECORD LENGTH</span>
                      <span className="font-extrabold text-black">{filteredPayments.length} ROWS MATCHED</span>
                    </div>
                  </div>

                  {/* Ledger Table */}
                  <div className="overflow-hidden border border-neutral-300">
                    <table className="w-full text-left text-[11px] border-collapse leading-normal font-sans">
                      <thead className="bg-neutral-100 font-mono text-[9px] uppercase tracking-wider text-black border-b-2 border-neutral-400">
                        <tr>
                          <th className="p-2 border border-neutral-300 text-center font-bold w-10">#</th>
                          <th className="p-2 border border-neutral-300 font-bold font-mono text-center">Ref ID</th>
                          <th className="p-2 border border-neutral-300 font-bold font-mono">Date</th>
                          <th className="p-2 border border-neutral-300 font-bold">Student Name</th>
                          <th className="p-2 border border-neutral-300 font-bold font-mono text-center">Grade</th>
                          <th className="p-2 border border-neutral-300 font-bold font-mono">Group</th>
                          <th className="p-2 border border-neutral-300 font-bold text-right">Fee (GHC)</th>
                          <th className="p-2 border border-neutral-300 font-bold font-mono">Receipt Index</th>
                          <th className="p-2 border border-neutral-300 font-bold text-center font-mono">Verification</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {filteredPayments.slice(0, 10).map((p, idx) => (
                          <tr key={p.id} className="hover:bg-neutral-50 transition-colors">
                            <td className="p-2 border border-neutral-300 text-center font-mono font-bold text-neutral-500">{idx + 1}</td>
                            <td className="p-2 border border-neutral-300 font-mono text-[8px] text-neutral-800 text-center font-semibold">#{p.id.substring(2, 8).toUpperCase()}</td>
                            <td className="p-2 border border-neutral-300 font-mono text-neutral-800 text-center">{p.date}</td>
                            <td className="p-2 border border-neutral-300 text-neutral-900 font-bold text-center uppercase tracking-tight">{p.studentName}</td>
                            <td className="p-2 border border-neutral-300 text-center font-mono font-semibold text-neutral-800">{p.class}</td>
                            <td className="p-2 border border-neutral-300 text-xs text-neutral-700 font-medium uppercase font-mono">{p.category}</td>
                            <td className="p-2 border border-neutral-300 text-right font-mono font-bold font-black">GHC {p.amount.toFixed(2)}</td>
                            <td className="p-2 border border-neutral-300 font-mono text-[9px] text-neutral-600">{p.id.toUpperCase().substring(0, 10)}...</td>
                            <td className="p-2 border border-neutral-300 text-center font-mono text-[9px]">
                              {p.verified ? 'APPROVED' : 'PENDING'}
                            </td>
                          </tr>
                        ))}
                        {filteredPayments.length > 10 && (
                          <tr>
                            <td colSpan={9} className="p-3 text-center bg-neutral-50 border border-neutral-300 text-neutral-500 font-mono text-[9px] uppercase tracking-wider">
                              ... AND {filteredPayments.length - 10} ADDITIONAL STENCILS COMPILED FOR BULK RECIPIENTS OUT ...
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Memorandum block */}
                  {printFriendlyMemo && (
                    <div className="bg-neutral-50 p-3.5 border border-neutral-300 rounded-px text-[10px] leading-relaxed text-neutral-600 italic">
                      <span className="font-bold text-neutral-800 uppercase not-italic block mb-1 text-[8px] tracking-wide">
                        AUDIT STATION COMMENTS & MEMORANDUM
                      </span>
                      {printFriendlyMemo}
                    </div>
                  )}
                </div>

                {/* SIGNATURES SEGMENT */}
                <div className="pt-8 mt-8 border-t border-neutral-300 flex justify-between items-end gap-6 shrink-0 z-10 relative">
                  <div className="flex-1 grid grid-cols-2 gap-6 text-[10px] leading-relaxed">
                    <div className="space-y-4">
                      <span className="text-neutral-500 font-black uppercase text-[8px] block">PREPARED & VERIFIED BY:</span>
                      <div className="h-10 border-b border-black w-44"></div>
                      <div>
                        <span className="text-black font-extrabold uppercase">ASSIGNED DESK OFFICER</span>
                        <span className="text-neutral-500 block text-[9px]">Class Gate Supervisor / Auditor</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <span className="text-neutral-500 font-black uppercase text-[8px] block">APPROVED & COUNTERSIGNED BY:</span>
                      <div className="h-10 border-b border-black w-44"></div>
                      <div>
                        <span className="text-black font-extrabold uppercase">{printFriendlySignatory}</span>
                        <span className="text-neutral-500 block text-[9px]">Saako Holy Child Board Exec</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-center justify-center bg-white text-black p-1 rounded-full">
                    <svg width="68" height="68" viewBox="0 0 100 100" className="opacity-100 select-none bg-white">
                      {/* Nice green outer boundary ring */}
                      <circle cx="50" cy="50" r="48" fill="#14532d" stroke="#166534" strokeWidth="4" />
                      <circle cx="50" cy="50" r="42" fill="#22c55e" stroke="#14532d" strokeWidth="1.5" />
                      {/* Green inside filled details */}
                      <circle cx="50" cy="50" r="39" fill="#dcfce7" />
                      <circle cx="50" cy="50" r="36" fill="none" stroke="#16a34a" strokeWidth="1" strokeDasharray="2 1.5" />
                      <defs>
                        <path id="financialSealInnerArcTop" d="M 22 50 A 28 28 0 0 1 78 50" fill="none" />
                        <path id="financialSealInnerArcBottom" d="M 78 50 A 28 28 0 0 1 22 50" fill="none" />
                      </defs>
                      <text className="font-sans font-black text-[5.8px] fill-[#14532d] tracking-[0.02em]">
                        <textPath href="#financialSealInnerArcTop" startOffset="50%" textAnchor="middle">
                          SAAKO TRUST
                        </textPath>
                      </text>
                      <text className="font-sans font-black text-[5px] fill-emerald-955 tracking-[0.05em]">
                        <textPath href="#financialSealInnerArcBottom" startOffset="50%" textAnchor="middle">
                          * EXCELLENCE *
                        </textPath>
                      </text>
                      {/* Beautiful Coiled Python */}
                      <g transform="translate(42, 42) scale(0.16)" stroke="#14532d" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        {/* Main deep forest green coiled body */}
                        <path d="M 12 70 C 12 40, 24 15, 50 15 C 76 15, 88 35, 88 55 C 88 75, 70 85, 50 85 C 30 85, 20 70, 25 55 C 30 40, 45 40, 50 45 C 55 50, 52 65, 45 65 C 38 65, 38 52, 44 48" strokeWidth="6.5" stroke="#14532d" />
                        
                        {/* Elegant light emerald-green dorsal spot patterns */}
                        <path d="M 12 70 C 12 40, 24 15, 50 15 C 76 15, 88 35, 88 55 C 88 75, 70 85, 50 85 C 30 85, 20 70, 25 55 C 30 40, 45 40, 50 45 C 55 50, 52 65, 45 65 C 38 65, 38 52, 44 48" stroke="#86efac" strokeWidth="1.5" strokeDasharray="3 5" />

                        {/* Accent highlight outline for 3D depth */}
                        <path d="M 12 70 C 12 40, 24 15, 50 15 C 76 15, 88 35, 88 55" stroke="#f0fdf4" strokeWidth="1.2" opacity="0.65" />

                        {/* Adorable little golden crown for the champion python */}
                        <path d="M 40 41.5 L 38.5 38 L 42 39.5 L 44 36 L 46 39.5 L 49.5 38 L 48 41.5 Z" fill="#fbbf24" stroke="#14532d" strokeWidth="0.8" strokeLinejoin="miter" />

                        {/* Cute chibified head */}
                        <circle cx="44" cy="47" r="6" fill="#14532d" stroke="none" />
                        
                        {/* Generous sweet rosy blush cheeks */}
                        <circle cx="38" cy="48.5" r="1.3" fill="#f43f5e" opacity="0.8" stroke="none" />
                        <circle cx="50" cy="48.5" r="1.3" fill="#f43f5e" opacity="0.8" stroke="none" />

                        {/* Happy sparkling big anime eyes */}
                        <circle cx="41.5" cy="45.5" r="1.8" fill="white" stroke="none" />
                        <circle cx="46.5" cy="45.5" r="1.8" fill="white" stroke="none" />
                        <circle cx="41.5" cy="45.5" r="1" fill="#14532d" stroke="none" />
                        <circle cx="46.5" cy="45.5" r="1" fill="#14532d" stroke="none" />
                        <circle cx="41" cy="44.8" r="0.45" fill="white" stroke="none" />
                        <circle cx="46" cy="44.8" r="0.45" fill="white" stroke="none" />

                        {/* Sweet cheerful smile */}
                        <path d="M 41.5 49 Q 44 51.5, 46.5 49" stroke="#f0fdf4" strokeWidth="0.8" strokeLinecap="round" fill="none" />

                        {/* Delightful small pink tongue */}
                        <path d="M 43.5 50.2 Q 43.5 52.5, 44.2 52.5" stroke="#f43f5e" strokeWidth="0.8" strokeLinecap="round" fill="none" />

                        {/* Floating romantic pink heart */}
                        <path d="M 55 36 C 54 34, 52 34, 52 36 C 52 38, 55 40, 55 40 C 55 40, 58 38, 58 36 C 58 34, 56 34, 55 36 Z" fill="#ec4899" opacity="0.95" stroke="none" />
                      </g>
                    </svg>
                    <span className="text-[7px] font-mono text-emerald-800 uppercase tracking-widest mt-1 block font-bold">OFFICIAL IMPRESS</span>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* TERM SUMMARY PDF REPORT DISPLAY MODAL */}
      {showTermSummaryModal && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-neutral-950 flex flex-col md:flex-row">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: portrait;
                margin: 15mm;
              }
              body * {
                visibility: hidden !important;
                background: none !important;
                color: #000 !important;
                box-shadow: none !important;
              }
              #print-term-summaries-area, #print-term-summaries-area * {
                visibility: visible !important;
              }
              #print-term-summaries-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
              }
              .print-term-page {
                page-break-after: always !important;
                break-after: page !important;
                margin: 0 !important;
                padding: 15mm !important;
                border: none !important;
                box-shadow: none !important;
                height: auto !important;
                min-height: 297mm !important;
                box-sizing: border-box !important;
                background: white !important;
                color: black !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}} />

          {/* LEFT COLUMN: Controls Dashboard Panel */}
          <div className="w-full md:w-96 bg-neutral-900 border-r-4 border-neutral-800 flex flex-col h-full overflow-y-auto no-print p-6 space-y-6 shrink-0">
            <div className="border-b border-neutral-800 pb-4">
              <span className="text-[10px] text-emerald-450 font-mono tracking-widest font-black uppercase block">ACCOUNTS DEPARTMENT</span>
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mt-1">
                <FileText size={18} className="text-emerald-450" /> TERM SUMMARY PDF
              </h3>
            </div>

            {/* Config & Filters */}
            <div className="space-y-4 flex-1">
              {/* Academic Term Filter */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase font-black text-amber-400 tracking-wider">Select Academic Term</span>
                <select
                  value={selectedReportTermId}
                  onChange={(e) => setSelectedReportTermId(e.target.value)}
                  className="w-full bg-neutral-950 border-2 border-amber-500/25 px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer font-mono font-bold"
                >
                  {terms.map(t => (
                    <option key={t.id} value={t.id} className="bg-neutral-950 text-white">
                      {t.name} {t.active ? '(Active Term)' : '(Archived Term)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search filter */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase font-black text-neutral-400 tracking-wider">Search Student</span>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-neutral-500" size={13} />
                  <input
                    type="text"
                    value={termSummarySearchQuery}
                    onChange={(e) => setTermSummarySearchQuery(e.target.value)}
                    placeholder="Search name or ID..."
                    className="w-full bg-neutral-950 border-2 border-neutral-800 py-2 pl-9 pr-8 text-xs outline-none text-white focus:border-emerald-400 font-mono"
                  />
                  {termSummarySearchQuery && (
                    <button
                      type="button"
                      onClick={() => setTermSummarySearchQuery('')}
                      className="absolute right-3 top-2.5 text-neutral-500 hover:text-white"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Class Filter */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase font-black text-neutral-400 tracking-wider font-mono">Class Grade</span>
                <select
                  value={termSummaryClassFilter}
                  onChange={(e) => setTermSummaryClassFilter(e.target.value)}
                  className="w-full bg-neutral-950 border-2 border-neutral-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 cursor-pointer font-mono"
                >
                  <option value="ALL">ALL CLASSES / GRADES</option>
                  {classes.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              {/* Outstanding checkboxes */}
              <div className="bg-neutral-950 p-4 border border-neutral-850 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 block uppercase">Only Unpaid Arrears</span>
                    <p className="text-[9px] text-neutral-500 leading-normal">Limit to pupils with outstanding debt.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTermSummaryOnlyPending(!termSummaryOnlyPending)}
                    className={`px-3 py-1.5 text-[9px] font-mono font-black uppercase border-2 transition-all ${
                      termSummaryOnlyPending 
                        ? 'bg-red-500/10 border-red-500 text-red-500' 
                        : 'bg-neutral-900 border-neutral-800 text-neutral-500'
                    }`}
                  >
                    {termSummaryOnlyPending ? '🔴 ON' : '⚪ OFF'}
                  </button>
                </div>
              </div>

              {/* Signatory */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase font-black text-neutral-400">Authorized Signature Block</label>
                <input
                  type="text"
                  value={termSummarySignatory}
                  onChange={(e) => setTermSummarySignatory(e.target.value)}
                  className="w-full bg-neutral-950 border-2 border-neutral-800 px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* Footnote */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase font-black text-neutral-400">Disclaimer Statement Footnote</label>
                <textarea
                  rows={4}
                  value={termSummaryMemo}
                  onChange={(e) => setTermSummaryMemo(e.target.value)}
                  className="w-full bg-neutral-950 border-2 border-neutral-800 px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-400 text-[11px] leading-relaxed resize-none"
                />
              </div>

              {/* Statistics summary card */}
              <div className="bg-neutral-950 border border-neutral-800 p-4 space-y-2">
                <span className="text-[9px] font-mono uppercase text-neutral-500 font-extrabold block">Term Summary Run Details</span>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono font-bold text-neutral-300">
                  <div className="bg-neutral-900 p-2 border border-neutral-850">
                    <span className="text-neutral-500 text-[8px] block">PUPILS GENERATING</span>
                    <span className="text-white text-xs font-black">{termSummaryTotals.kids} PUPILS</span>
                  </div>
                  <div className="bg-neutral-900 p-2 border border-neutral-850">
                    <span className="text-neutral-500 text-[8px] block">TOTAL BILLED</span>
                    <span className="text-amber-400 text-xs font-black">GHC {termSummaryTotals.totalBilled.toFixed(2)}</span>
                  </div>
                  <div className="bg-neutral-900 p-2 border border-neutral-850">
                    <span className="text-neutral-500 text-[8px] block font-mono">FUNDS RECOVERED</span>
                    <span className="text-emerald-400 text-xs font-black">GHC {termSummaryTotals.totalCleared.toFixed(2)}</span>
                  </div>
                  <div className="bg-neutral-900 p-2 border border-neutral-850">
                    <span className="text-neutral-500 text-[8px] block">TOTAL ARREARS</span>
                    <span className="text-red-400 text-xs font-black">GHC {termSummaryTotals.totalArrears.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 space-y-2 shrink-0 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.focus();
                    window.print();
                  }
                }}
                disabled={termSummaryReportsByStudent.length === 0}
                className="w-full py-4 text-xs font-black uppercase text-black bg-emerald-400 hover:bg-emerald-300 disabled:bg-neutral-800 disabled:text-neutral-500 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer size={16} /> LAUNCH PRINTER PANEL
              </button>

              <button
                type="button"
                onClick={() => setShowTermSummaryModal(false)}
                className="w-full py-3.5 text-xs font-black uppercase text-neutral-400 hover:text-white bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 transition-colors cursor-pointer"
              >
                CLOSE PORTAL
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Continuous high-fidelity print documents catalog container */}
          <div className="flex-1 overflow-y-auto bg-neutral-950 p-4 md:p-8 space-y-8 no-print-scroll scrollbar-thin">
            <div className="max-w-[210mm] mx-auto flex items-center justify-between no-print border-b border-neutral-850 pb-3">
              <span className="text-[10px] font-mono font-black uppercase text-neutral-450 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                TERM TRANSCRIPT LEDGERS ({termSummaryReportsByStudent.length} STUDENTS DETECTED)
              </span>
              <span className="text-[10px] font-mono text-neutral-500">A4 PORTRAIT PRINTER SHEETS</span>
            </div>

            {/* Container mapping our printable documents */}
            <div id="print-term-summaries-area" className="space-y-8">
              {termSummaryReportsByStudent.length === 0 ? (
                <div className="bg-neutral-900 border-2 border-dashed border-neutral-800 p-12 text-center max-w-[210mm] mx-auto text-neutral-400 no-print">
                  <FileText className="mx-auto text-neutral-600 mb-3" size={32} />
                  <p className="text-[11px] font-mono font-black uppercase text-emerald-400">No pupil records match parameters.</p>
                  <p className="text-[10px] text-neutral-500 mt-1">Adjust search input or toggle Arrears checking filters on the left.</p>
                </div>
              ) : (
                termSummaryReportsByStudent.map((item, index) => {
                  const student = item.student;
                  const refCode = `SHC-TERM-${(reportTerm?.id || 'TERM').substring(0,6).toUpperCase()}-${student.id.substring(0,6).toUpperCase()}`;
                  
                  return (
                    <div 
                      key={student.id} 
                      className="print-term-page bg-white text-black p-10 shadow-2xl max-w-[210mm] mx-auto min-h-[297mm] flex flex-col justify-between relative border border-neutral-300 font-sans text-left"
                    >
                      {/* Top notification bar */}
                      <div className="no-print bg-neutral-100 border-b border-neutral-250 p-2.5 mb-6 flex items-center justify-between font-mono text-[9px] -mx-10 -mt-10 rounded-t-xs">
                        <span className="font-bold uppercase text-neutral-500">
                          📄 Page {index + 1} of {termSummaryReportsByStudent.length}: Term Statement for {student.name}
                        </span>
                        <span className="font-bold text-emerald-600">
                          READY TO PRINT
                        </span>
                      </div>

                      <div className="space-y-6">
                        {/* Header Banner */}
                        <div className="border-b-4 border-black pb-4 flex justify-between items-start">
                          <div className="flex items-center gap-3 text-left">
                            <SchoolLogo size={42} className="shrink-0" lightBackground={true} />
                            <div className="space-y-1">
                              <span className="text-[11px] font-black uppercase tracking-wider text-black bg-neutral-200 px-2 py-0.5 font-mono">
                                SAAKO HOLY CHILD ACADEMY
                              </span>
                              <h1 className="text-xl font-black text-black uppercase tracking-tight">
                                Term Summary Ledger Statement
                              </h1>
                              <p className="text-[8px] font-mono uppercase text-neutral-500 tracking-wider">
                                Excellence, faith & Discipline • Ghana Education Service Registered
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-[8px] font-black uppercase bg-black text-amber-400 px-2.5 py-1 font-mono tracking-widest inline-block mb-1">
                              CONSOLIDATED TRANSCRIPT
                            </div>
                            <div className="text-[9px] font-mono text-neutral-500">
                              Statement Date: {currentDate}
                            </div>
                            <div className="text-[9px] font-mono text-neutral-500 font-bold uppercase">
                              Term Period: {reportTerm?.name || 'Academic Semester'}
                            </div>
                          </div>
                        </div>

                        {/* Student profile grids */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-2 border border-neutral-300 bg-neutral-50/50 p-4 font-mono text-[10px] leading-relaxed uppercase">
                          <div>
                            <span className="text-[8px] text-neutral-500 font-black block">PUPIL BENEFICIARY:</span>
                            <span className="font-extrabold text-black text-xs">{student.name}</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-neutral-500 font-black block">GRADE / CLASS:</span>
                            <span className="font-extrabold text-black">{student.class} ({student.category})</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-neutral-500 font-black block">LEDGER REFERENCE:</span>
                            <span className="font-extrabold text-black font-mono">{refCode}</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-neutral-500 font-black block">ROLL REGISTER ID:</span>
                            <span className="font-extrabold text-black font-mono">{student.rollNumber || `FT-${student.class.toUpperCase()}-${student.id.substring(0,5).toUpperCase()}`}</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-neutral-500 font-black block">BILLING PLAN MODEL:</span>
                            <span className="font-extrabold text-black">
                              {item.isTermPayer ? 'Term Subscription Scheme' : 'Daily Gate Ingress Scheme'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[8px] text-neutral-500 font-black block">GUARDIAN CONTACT:</span>
                            <span className="font-extrabold text-black font-mono">{student.guardianPhone || 'No registered contact'}</span>
                          </div>
                        </div>

                        {/* SCORECARDS GRIDS */}
                        <div className="space-y-2">
                          <h3 className="text-xs font-black uppercase tracking-widest border-b-2 border-neutral-800 pb-1 font-mono text-neutral-800 flex items-center justify-between">
                            <span>1. Registration & Attendance Tracker</span>
                            <span className="text-[9px] font-normal text-neutral-500 font-mono tracking-normal capitalize">Up to School date {currentDate}</span>
                          </h3>
                          <div className="grid grid-cols-4 gap-3 text-center">
                            <div className="bg-neutral-50 border border-neutral-300 p-2.5">
                              <span className="text-[8px] text-neutral-500 font-black block font-mono">DAYS PRESENT</span>
                              <span className="text-lg font-black text-emerald-700 font-mono">{item.presentCount} school days</span>
                            </div>
                            <div className="bg-neutral-50 border border-neutral-300 p-2.5">
                              <span className="text-[8px] text-neutral-500 font-black block font-mono">DAYS ABSENT (EXCUSED)</span>
                              <span className="text-lg font-black text-neutral-600 font-mono">{item.absentCount} school days</span>
                            </div>
                            <div className="bg-neutral-50 border border-neutral-300 p-2.5">
                              <span className="text-[8px] text-neutral-500 font-black block font-mono">UNPAID OVERDUE DAYS</span>
                              <span className="text-lg font-black text-red-600 font-mono">{item.unpaidCount} school days</span>
                            </div>
                            <div className="bg-neutral-50 border border-neutral-300 p-2.5">
                              <span className="text-[8px] text-neutral-500 font-black block font-mono font-bold">ATTENDANCE RATE</span>
                              <span className="text-lg font-black text-blue-700 font-mono">{item.attendanceRate.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>

                        {/* FINANCIAL SECTION */}
                        <div className="space-y-2">
                          <h3 className="text-xs font-black uppercase tracking-widest border-b-2 border-neutral-800 pb-1 font-mono text-neutral-800">
                            2. Term Financial Statement Summary
                          </h3>
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="bg-neutral-50 border border-neutral-300 p-3">
                              <span className="text-[8px] text-neutral-500 font-black block font-mono">CUMULATIVE FEES CHARGED</span>
                              <span className="text-xl font-black text-black font-mono">GHC {item.totalCharged.toFixed(2)}</span>
                              <span className="text-[8.5px] text-neutral-500 block font-mono mt-1">
                                {item.isTermPayer ? 'Flat term subscription rate' : `Calculated check-ins (@ GHC 5.00)`}
                              </span>
                            </div>
                            <div className="bg-emerald-50/40 border border-emerald-300 p-3">
                              <span className="text-[8px] text-emerald-800 font-black block font-mono">TOTAL FUNDS RECOVERED</span>
                              <span className="text-xl font-black text-emerald-700 font-mono">GHC {item.totalPaid.toFixed(2)}</span>
                              <span className="text-[8.5px] text-emerald-600 block font-mono mt-1">
                                Verified fees cleared to date
                              </span>
                            </div>
                            <div className="bg-red-50/40 border border-red-300 p-3">
                              <span className="text-[8px] text-red-800 font-black block font-mono">OUTSTANDING ARREARS</span>
                              <span className={`text-xl font-black font-mono ${item.totalDue > 0 ? 'text-red-605 font-bold' : 'text-emerald-700 font-black'}`}>
                                GHC {item.totalDue.toFixed(2)}
                              </span>
                              <span className="text-[8.5px] text-red-500 block font-mono mt-1">
                                {item.totalDue > 0 ? 'Due for immediate settlement' : 'Account current & fully cleared'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* RECENT HISTORICAL ENTRIES */}
                        <div className="space-y-2">
                          <h3 className="text-xs font-black uppercase tracking-widest border-b-2 border-neutral-800 pb-1 font-mono text-neutral-800 flex items-center justify-between">
                            <span>3. Audit Record Verification Logs</span>
                            <span className="text-[8.5px] font-mono text-neutral-500 leading-normal font-normal">Showing up to latest 6 check-in payments</span>
                          </h3>
                          <div className="overflow-hidden border border-neutral-300 font-mono">
                            <table className="w-full text-left text-[9.5px] border-collapse">
                              <thead className="bg-neutral-100 text-black border-b border-neutral-300">
                                <tr>
                                  <th className="p-2 border-r border-neutral-300 font-bold">Ledger Date</th>
                                  <th className="p-2 border-r border-neutral-300 font-bold">Secure ID Receipt Range</th>
                                  <th className="p-2 border-r border-neutral-300 font-bold">Status Detail</th>
                                  <th className="p-2 border-r border-neutral-300 text-right font-bold w-32">Daily Fee Collected</th>
                                  <th className="p-2 text-right font-bold w-36">Audited By</th>
                                </tr>
                              </thead>
                              <tbody>
                                {item.paymentsList.length === 0 ? (
                                  <tr>
                                    <td colSpan={5} className="p-4 text-center text-neutral-400 font-bold">
                                      No direct verified daily school payments are logged inside current active term parameters.
                                    </td>
                                  </tr>
                                ) : (
                                  item.paymentsList.slice(0, 6).map((log, lIdx) => (
                                    <tr key={log.id} className={lIdx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}>
                                      <td className="p-2 border-r border-neutral-250 font-bold">{log.date}</td>
                                      <td className="p-2 border-r border-neutral-250 select-all font-bold uppercase text-[9px] text-neutral-600">
                                        SHC-{log.id.substring(0, 10).toUpperCase()}
                                      </td>
                                      <td className="p-2 border-r border-neutral-250">
                                        {log.isAbsent ? (
                                          <span className="font-extrabold text-neutral-500 uppercase">Excused Absence</span>
                                        ) : (
                                          <span className="font-extrabold text-emerald-600 uppercase">Present & Verified</span>
                                        )}
                                      </td>
                                      <td className="p-2 border-r border-neutral-250 text-right font-bold">
                                        GHC {log.amount.toFixed(2)}
                                      </td>
                                      <td className="p-2 text-right text-neutral-500 text-[9px] truncate max-w-[120px]" title={log.collectedBy}>
                                        {log.collectedBy}
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* Bottom signatures and footnotes section */}
                      <div className="space-y-8 pt-6 border-t-2 border-neutral-800 mt-6 shrink-0">
                        {/* Custom Memo text */}
                        <div className="text-[10px] text-neutral-500 leading-relaxed font-bold italic text-center max-w-2xl mx-auto">
                          "{termSummaryMemo}"
                        </div>

                        {/* Signatures Row */}
                        <div className="flex justify-between items-end gap-6 pt-4">
                          <div className="space-y-4 text-[10px] font-mono leading-relaxed">
                            <span className="text-neutral-500 font-black uppercase text-[8px] block">PARENT / GUARDIAN ATTESTATION:</span>
                            <div className="h-10 border-b border-black w-44"></div>
                            <div>
                              <span className="text-black font-extrabold uppercase block font-sans">Authorized Signatory</span>
                              <span className="text-neutral-500 block text-[9px]">Receipt Signature Acknowledgement</span>
                            </div>
                          </div>

                          {/* Beautiful official seal of school */}
                          <div className="shrink-0 flex flex-col items-center justify-center bg-white text-black p-1 rounded-full col-span-1">
                            <svg width="68" height="68" viewBox="0 0 100 100" className="opacity-100 select-none bg-white">
                              <circle cx="50" cy="50" r="48" fill="#14532d" stroke="#166534" strokeWidth="4" />
                              <circle cx="50" cy="50" r="42" fill="#22c55e" stroke="#14532d" strokeWidth="1.5" />
                              <circle cx="50" cy="50" r="39" fill="#dcfce7" />
                              <circle cx="50" cy="50" r="36" fill="none" stroke="#16a34a" strokeWidth="1" strokeDasharray="2 1.5" />
                              <defs>
                                <path id="tsealInnerArcTop" d="M 22 50 A 28 28 0 0 1 78 50" fill="none" />
                                <path id="tsealInnerArcBottom" d="M 78 50 A 28 28 0 0 1 22 50" fill="none" />
                              </defs>
                              <text className="font-sans font-black text-[5.8px] fill-[#14532d] tracking-[0.02em]">
                                <textPath href="#tsealInnerArcTop" startOffset="50%" textAnchor="middle">
                                  SAAKO TRUST
                                </textPath>
                              </text>
                              <text className="font-sans font-black text-[5px] fill-emerald-955 tracking-[0.05em]">
                                <textPath href="#tsealInnerArcBottom" startOffset="50%" textAnchor="middle">
                                  * EXCELLENCE *
                                </textPath>
                              </text>
                              {/* Beautiful Coiled Python */}
                              <g transform="translate(42, 42) scale(0.16)" stroke="#14532d" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                {/* Main deep forest green coiled body */}
                                <path d="M 12 70 C 12 40, 24 15, 50 15 C 76 15, 88 35, 88 55 C 88 75, 70 85, 50 85 C 30 85, 20 70, 25 55 C 30 40, 45 40, 50 45 C 55 50, 52 65, 45 65 C 38 65, 38 52, 44 48" strokeWidth="6.5" stroke="#14532d" />
                                
                                {/* Elegant light emerald-green dorsal spot patterns */}
                                <path d="M 12 70 C 12 40, 24 15, 50 15 C 76 15, 88 35, 88 55 C 88 75, 70 85, 50 85 C 30 85, 20 70, 25 55 C 30 40, 45 40, 50 45 C 55 50, 52 65, 45 65 C 38 65, 38 52, 44 48" stroke="#86efac" strokeWidth="1.5" strokeDasharray="3 5" />

                                {/* Accent highlight outline for 3D depth */}
                                <path d="M 12 70 C 12 40, 24 15, 50 15 C 76 15, 88 35, 88 55" stroke="#f0fdf4" strokeWidth="1.2" opacity="0.65" />

                                {/* Adorable little golden crown for the champion python */}
                                <path d="M 40 41.5 L 38.5 38 L 42 39.5 L 44 36 L 46 39.5 L 49.5 38 L 48 41.5 Z" fill="#fbbf24" stroke="#14532d" strokeWidth="0.8" strokeLinejoin="miter" />

                                {/* Cute chibified head */}
                                <circle cx="44" cy="47" r="6" fill="#14532d" stroke="none" />
                                
                                {/* Generous sweet rosy blush cheeks */}
                                <circle cx="38" cy="48.5" r="1.3" fill="#f43f5e" opacity="0.8" stroke="none" />
                                <circle cx="50" cy="48.5" r="1.3" fill="#f43f5e" opacity="0.8" stroke="none" />

                                {/* Happy sparkling big anime eyes */}
                                <circle cx="41.5" cy="45.5" r="1.8" fill="white" stroke="none" />
                                <circle cx="46.5" cy="45.5" r="1.8" fill="white" stroke="none" />
                                <circle cx="41.5" cy="45.5" r="1" fill="#14532d" stroke="none" />
                                <circle cx="46.5" cy="45.5" r="1" fill="#14532d" stroke="none" />
                                <circle cx="41" cy="44.8" r="0.45" fill="white" stroke="none" />
                                <circle cx="46" cy="44.8" r="0.45" fill="white" stroke="none" />

                                {/* Sweet cheerful smile */}
                                <path d="M 41.5 49 Q 44 51.5, 46.5 49" stroke="#f0fdf4" strokeWidth="0.8" strokeLinecap="round" fill="none" />

                                {/* Delightful small pink tongue */}
                                <path d="M 43.5 50.2 Q 43.5 52.5, 44.2 52.5" stroke="#f43f5e" strokeWidth="0.8" strokeLinecap="round" fill="none" />

                                {/* Floating romantic pink heart */}
                                <path d="M 55 36 C 54 34, 52 34, 52 36 C 52 38, 55 40, 55 40 C 55 40, 58 38, 58 36 C 58 34, 56 34, 55 36 Z" fill="#ec4899" opacity="0.95" stroke="none" />
                              </g>
                            </svg>
                            <span className="text-[7px] font-mono text-emerald-800 uppercase tracking-widest mt-1 block font-black">OFFICIAL IMPRESS</span>
                          </div>

                          <div className="space-y-4 text-[10px] font-mono leading-relaxed text-right">
                            <span className="text-neutral-500 font-black uppercase text-[8px] block">APPROVED & STAMPED BY:</span>
                            <div className="h-10 border-b border-black w-44 ml-auto"></div>
                            <div>
                              <span className="text-black font-extrabold uppercase block font-sans">{termSummarySignatory}</span>
                              <span className="text-neutral-500 block text-[9px] font-sans">Institutional Auditor & registrar</span>
                            </div>
                          </div>
                        </div>

                        {/* Print run unique document tracker code */}
                        <div className="flex justify-between items-center text-[8px] font-mono font-black text-neutral-400 pt-3 border-t border-neutral-200">
                          <span>SYSTEM RUN DOCUMENT: {student.id.toUpperCase()}-{(activeTerm?.id || 'TERM').toUpperCase()}</span>
                          <span>PRINT SUITE VERSION: SAAKO-SUMMARY-V2</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* DIRECTORS' SMART DEBT SUMMARY MODAL */}
      {showDirectorsDebtModal && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-neutral-950 flex flex-col md:flex-row">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: A4 portrait;
                margin: 0 !important;
              }
              body * {
                visibility: hidden !important;
                background: none !important;
                color: #000 !important;
                box-shadow: none !important;
              }
              #print-directors-debt-area, #print-directors-debt-area * {
                visibility: visible !important;
              }
              #print-directors-debt-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 210mm !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
              }
              .print-directors-page {
                page-break-after: always !important;
                break-after: always !important;
                margin: 0 !important;
                padding: 15mm !important;
                border: none !important;
                box-shadow: none !important;
                background: white !important;
                color: black !important;
                width: 210mm !important;
                min-height: 297mm !important;
                box-sizing: border-box !important;
                display: block !important;
              }
              .print-avoid-break {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}} />

          {/* LEFT COLUMN: Controls Dashboard Panel */}
          <div className="w-full md:w-96 bg-neutral-900 border-r-4 border-neutral-800 flex flex-col h-full overflow-y-auto no-print p-6 space-y-5 shrink-0">
            <div className="border-b border-neutral-800 pb-3">
              <span className="text-[9px] text-amber-400 font-mono tracking-widest font-black uppercase block">BOARDROOM PREPARATION TOOL</span>
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mt-1">
                <FileText size={18} className="text-amber-400" /> BOARD DEBT STUDY
              </h3>
            </div>

            {/* Config & Filters */}
            <div className="space-y-4 flex-1">
              {/* Search filter */}
              <div className="space-y-1">
                <span className="text-[9px] font-mono uppercase font-black text-neutral-400 tracking-wider">Search Student</span>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-neutral-500" size={13} />
                  <input
                    type="text"
                    value={directorsSearchQuery}
                    onChange={(e) => setDirectorsSearchQuery(e.target.value)}
                    placeholder="Search name or ID..."
                    className="w-full bg-neutral-950 border-2 border-neutral-800 py-1.5 pl-9 pr-8 text-xs outline-none text-white focus:border-amber-400 font-mono"
                  />
                  {directorsSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setDirectorsSearchQuery('')}
                      className="absolute right-3 top-2 text-neutral-500 hover:text-white"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Class Filter */}
              <div className="space-y-1">
                <span className="text-[9px] font-mono uppercase font-black text-neutral-400 tracking-wider">Filter Class Grade</span>
                <select
                  value={directorsClassFilter}
                  onChange={(e) => setDirectorsClassFilter(e.target.value)}
                  className="w-full bg-neutral-950 border-2 border-neutral-800 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer font-mono"
                >
                  <option value="ALL">ALL CLASSES / GRADES</option>
                  {classes.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              {/* Payment Type Filter */}
              <div className="space-y-1">
                <span className="text-[9px] font-mono uppercase font-black text-neutral-400 tracking-wider">Payment Structure Filter</span>
                <select
                  value={directorsOnlyPaymentType}
                  onChange={(e) => setDirectorsOnlyPaymentType(e.target.value)}
                  className="w-full bg-neutral-950 border-2 border-neutral-800 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer font-mono"
                >
                  <option value="ALL">ALL PUPILS (Daily & Term)</option>
                  <option value="DAILY">DAILY PAYERS ONLY</option>
                  <option value="TERM">TERM PAYERS ONLY</option>
                </select>
              </div>

              {/* Minimum Debt Size */}
              <div className="space-y-1">
                <span className="text-[9px] font-mono uppercase font-black text-neutral-400 tracking-wider">Minimum Arrears Size (GHC)</span>
                <input
                  type="number"
                  min="0"
                  value={directorsMinDebt || ''}
                  onChange={(e) => setDirectorsMinDebt(Number(e.target.value))}
                  placeholder="e.g. 50 (only show debts >= GHC 50)"
                  className="w-full bg-neutral-950 border-2 border-neutral-800 px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Signatories config */}
              <div className="space-y-1">
                <label className="text-[9px] font-mono uppercase font-black text-neutral-400">Board Chairperson Title</label>
                <input
                  type="text"
                  value={directorsChairperson}
                  onChange={(e) => setDirectorsChairperson(e.target.value)}
                  className="w-full bg-neutral-950 border-2 border-neutral-800 px-3.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-mono uppercase font-black text-neutral-400">Administrative Signatory</label>
                <input
                  type="text"
                  value={directorsSignatory}
                  onChange={(e) => setDirectorsSignatory(e.target.value)}
                  className="w-full bg-neutral-950 border-2 border-neutral-800 px-3.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Memo/Notes */}
              <div className="space-y-1">
                <label className="text-[9px] font-mono uppercase font-black text-neutral-400">Board study instruction directive</label>
                <textarea
                  rows={3}
                  value={directorsNotes}
                  onChange={(e) => setDirectorsNotes(e.target.value)}
                  className="w-full bg-neutral-950 border-2 border-neutral-800 px-3.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-amber-400 text-[10px] leading-relaxed resize-none"
                />
              </div>

              {/* Run Metrics info */}
              <div className="bg-neutral-950 border border-neutral-800 p-3 space-y-1.5">
                <span className="text-[8px] font-mono uppercase text-neutral-500 font-extrabold block">Directors' Financial Ledger Metrics</span>
                <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono font-bold text-neutral-300">
                  <div className="bg-neutral-900 p-1.5 border border-neutral-850">
                    <span className="text-neutral-500 text-[8px] block">TOTAL DEBT</span>
                    <span className="text-red-400 text-xs font-black font-mono">GHC {directorsReportTotals.totalDue.toFixed(2)}</span>
                  </div>
                  <div className="bg-neutral-900 p-1.5 border border-neutral-850">
                    <span className="text-neutral-500 text-[8px] block font-mono">RECOVERY RATE</span>
                    <span className="text-emerald-400 text-xs font-black font-mono">{directorsReportTotals.recoveryRate.toFixed(1)}%</span>
                  </div>
                  <div className="bg-neutral-900 p-1.5 border border-neutral-850">
                    <span className="text-neutral-500 text-[8px] block font-mono">DEBT ACCOUNTS</span>
                    <span className="text-amber-400 text-xs font-black">{directorsReportTotals.debtorsCount} PUPILS</span>
                  </div>
                  <div className="bg-neutral-900 p-1.5 border border-neutral-850">
                    <span className="text-neutral-500 text-[8px] block">LEGACY DEBT</span>
                    <span className="text-neutral-400 text-xs font-black font-mono font-mono">GHC {directorsReportTotals.totalLegacyDebt.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom actions */}
            <div className="pt-3 space-y-2 shrink-0 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.focus();
                    window.print();
                  }
                }}
                className="w-full py-3.5 text-xs font-black uppercase text-black bg-amber-400 hover:bg-amber-300 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer size={16} /> PRINT BOARD SHEETS
              </button>

              <button
                type="button"
                onClick={triggerDirectorsDebtCSV}
                className="w-full py-3 text-xs font-black uppercase text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileSpreadsheet size={15} className="text-emerald-400" /> EXPORT BOARD CSV
              </button>

              <button
                type="button"
                onClick={() => setShowDirectorsDebtModal(false)}
                className="w-full py-2.5 text-xs font-black uppercase text-neutral-500 hover:text-neutral-350 transition-colors cursor-pointer"
              >
                CLOSE BOARD ROOM
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Continuous high-fidelity print documents catalog container */}
          <div className="flex-1 overflow-y-auto bg-neutral-950 p-4 md:p-8 space-y-8 no-print-scroll scrollbar-thin">
            <div className="max-w-[210mm] mx-auto flex items-center justify-between no-print border-b border-neutral-850 pb-3">
              <span className="text-[10px] font-mono font-black uppercase text-neutral-450 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
                BOARD STUDY RECONCILIATION DOCUMENT ({filteredDirectorsDebt.length} ACCOUNTS MATCHED)
              </span>
              <span className="text-[10px] font-mono text-neutral-500">A4 PAPER PORTRAIT PREVIEW</span>
            </div>

            {/* Print Area */}
            <div id="print-directors-debt-area" className="space-y-6">
              {(() => {
                const finalPrintList = filteredDirectorsDebt.filter(item => item.totalDue >= directorsMinDebt);

                const classesWithDebtors = classes.map(cls => {
                  const debtors = finalPrintList.filter(item => item.student.class === cls);
                  return { class: cls, debtors };
                }).filter(g => g.debtors.length > 0);

                if (classesWithDebtors.length === 0) {
                  return (
                    <div className="print-directors-page bg-white text-black p-10 shadow-2xl max-w-[210mm] mx-auto min-h-[297mm] flex flex-col justify-between border border-neutral-300 font-sans text-center">
                      <div className="my-auto">
                        <p className="text-sm font-bold text-neutral-500">No debtor records found matching the filters with balance &gt;= GHC {directorsMinDebt.toFixed(2)}.</p>
                      </div>
                    </div>
                  );
                }

                return classesWithDebtors.map(({ class: cls, debtors }) => {
                  return (
                    <div 
                      key={cls} 
                      className="print-directors-page bg-white text-black p-10 shadow-2xl max-w-[210mm] mx-auto min-h-[297mm] flex flex-col justify-between border border-neutral-300 font-sans text-left relative"
                      style={{ pageBreakAfter: 'always', breakAfter: 'always' }}
                    >
                      <div className="space-y-6 flex-1 flex flex-col">
                        {/* Print Document Header */}
                        <div className="border-b-4 border-black pb-4 flex justify-between items-start">
                          <div className="flex items-center gap-3 text-left">
                            <SchoolLogo size={36} className="shrink-0" lightBackground={true} />
                            <div className="space-y-1">
                              <span className="text-[9px] font-black uppercase tracking-wider text-black bg-neutral-200 px-2 py-0.5 font-mono">
                                SAAKO HOLY CHILD ACADEMY
                              </span>
                              <h1 className="text-sm font-black text-black uppercase tracking-tight">
                                Outstanding Arrears Statement
                              </h1>
                              <p className="text-[7.5px] font-mono uppercase text-neutral-500 tracking-wider">
                                Faith, Discipline & Academic Excellence • GES Registered No. G/GAR/AN/12/342
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="text-[8px] font-black uppercase bg-black text-amber-400 px-2 py-0.5 font-mono tracking-wider inline-block">
                              BOARD STUDY SHEETS
                            </div>
                            <div className="text-[8.5px] font-mono text-neutral-500 mt-1">
                              Date Compiled: {currentDate}
                            </div>
                            <div className="text-[8.5px] font-mono text-neutral-500 font-bold uppercase">
                              Grade: {cls}
                            </div>
                          </div>
                        </div>

                        {/* Directive Notice */}
                        <div className="bg-neutral-50 border-l-4 border-amber-400 p-2.5 text-[8.5px] font-sans leading-relaxed text-neutral-700">
                          <span className="text-black uppercase text-[7.5px] font-mono block font-black mb-0.5">BOARDROOM DIRECTIVE SUMMARY:</span>
                          This statement contains only the names of pupils in <strong>{cls}</strong> and their total outstanding balance left to be paid. Detailed payment logs and adding sheets are available on request from the Accounts Department. Pupils with balances under GHC {directorsMinDebt.toFixed(2)} have been excluded.
                        </div>

                        {/* Simplified Debtors Table */}
                        <div className="flex-1 mt-2">
                          <table className="w-full text-left text-[9px] font-sans border-collapse">
                            <thead>
                              <tr className="border-b-2 border-black font-extrabold uppercase text-[8px] text-black bg-neutral-100">
                                <th className="py-2 px-2 text-center w-12">No.</th>
                                <th className="py-2 px-2">Pupil Student Name</th>
                                <th className="py-2 px-2">Parent Contact</th>
                                <th className="py-2 px-2 text-right w-48">Outstanding Balance (GHC)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {debtors.map((item, idx) => {
                                return (
                                  <tr key={item.student.id} className="border-b border-neutral-200 hover:bg-neutral-50">
                                    <td className="py-2 px-2 text-center text-neutral-500 font-mono text-[8px]">{idx + 1}</td>
                                    <td className="py-2 px-2 font-black text-black text-[9px] tracking-wide">{item.student.name}</td>
                                    <td className="py-2 px-2 font-mono text-neutral-600 text-[8.5px]">{item.student.guardianPhone || 'No Contact Listed'}</td>
                                    <td className="py-2 px-2 text-right font-mono font-black text-[10px] text-red-600 bg-red-50/10">
                                      GHC {item.totalDue.toFixed(2)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Footer & Signature Section */}
                      <div className="space-y-4 pt-4 border-t border-neutral-300 mt-8 print-avoid-break">
                        <div className="grid grid-cols-2 gap-10 text-[9px] leading-relaxed">
                          <div className="space-y-3">
                            <span className="text-neutral-500 font-bold uppercase text-[7.5px] block">PREPARED BY (ADMINISTRATOR):</span>
                            <div className="h-6 border-b border-neutral-400 w-36"></div>
                            <div>
                              <span className="text-black font-extrabold uppercase block font-sans">{directorsSignatory}</span>
                              <span className="text-neutral-500 block text-[8px] font-sans">Institutional Auditor & Registrar</span>
                            </div>
                          </div>

                          <div className="space-y-3 text-right">
                            <span className="text-neutral-500 font-bold uppercase text-[7.5px] block">APPROVED FOR BOARD ROOM STUDY BY:</span>
                            <div className="h-6 border-b border-neutral-400 w-36 ml-auto"></div>
                            <div>
                              <span className="text-black font-extrabold uppercase block font-sans">{directorsChairperson}</span>
                              <span className="text-neutral-500 block text-[8px] font-sans">Governing Board Authority</span>
                            </div>
                          </div>
                        </div>

                        {/* Running footer info */}
                        <div className="flex justify-between items-center text-[7px] font-mono text-neutral-400 pt-2 border-t border-neutral-150">
                          <span>RUN CODE: SAAKO-BOARD-{currentDate.replace(/-/g, "")}-{(activeTerm?.id || 'TERM').substring(0, 8).toUpperCase()}</span>
                          <span>SYSTEM PORTAL GENERATION • CONFIDENTIAL FOR BOARD STUDY ONLY</span>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
      {/* Pre-School Canteen Feeding Booklet Modal */}
      {/* Quick Daily Transactions Audit & PDF/CSV Export Modal */}
      {showQuickDailyModal && (
        <div className="fixed inset-0 z-[9990] bg-black/90 flex flex-col backdrop-blur-sm overflow-hidden animate-fade-in font-sans">
          {/* Modal Navigation & Action Header */}
          <div className="bg-neutral-950 border-b-4 border-neutral-800 p-4 sm:px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0 font-mono">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-400 text-black font-black">
                <Zap size={20} className="fill-black" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-white uppercase tracking-tight">Quick Daily Audit Snapshot (CSV & PDF)</h3>
                  <span className="text-[10px] bg-amber-400/20 text-amber-400 font-bold px-2 py-0.5 border border-amber-400/40">
                    {quickDailyDate}
                  </span>
                </div>
                <p className="text-xs text-neutral-450 font-sans mt-0.5">
                  1-Click auditor downloads, PDF print snapshots, and instant management dispatch for single-day fee collections.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* ⚡ Download CSV Button */}
              <button
                type="button"
                onClick={() => handleQuickDailyCSVExport(quickDailyDate)}
                className="flex-1 sm:flex-initial text-xs font-black bg-amber-400 hover:bg-amber-300 text-black px-4 py-2.5 uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md font-mono"
                title="Download full CSV of all transactions on this date for Excel or audit tools"
                id="btn-modal-quick-daily-csv"
              >
                <Download size={15} className="stroke-[2.5]" /> Download Daily CSV
              </button>

              {/* 🖨️ Print / PDF Button */}
              <button
                type="button"
                onClick={handlePrintDailyDocument}
                className="flex-1 sm:flex-initial text-xs font-black bg-white hover:bg-neutral-200 text-black px-4 py-2.5 uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md font-mono"
                title="Print or Save as PDF using system printer dialogue"
                id="btn-modal-quick-daily-print"
              >
                <Printer size={15} /> Print / Save PDF
              </button>

              {/* 📲 WhatsApp / Clipboard Share */}
              <button
                type="button"
                onClick={handleShareDailySummary}
                className="flex-1 sm:flex-initial text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer font-mono"
                title="Copy daily executive financial brief & open WhatsApp to share with management"
                id="btn-modal-quick-daily-share"
              >
                <Share2 size={15} /> Share Brief
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setShowQuickDailyModal(false)}
                className="text-xs font-black bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white p-2.5 transition-all border border-neutral-750 cursor-pointer"
                title="Close Daily Snapshot"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Modal Body: Sidebar Controls + A4 Document Sheet */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left Sidebar: Controls & Live Daily KPIs */}
            <div className="w-full md:w-80 lg:w-96 bg-neutral-900 border-r-4 border-neutral-800 p-5 overflow-y-auto shrink-0 space-y-6 font-mono text-xs">
              {/* Target Date Picker */}
              <div className="space-y-2 bg-neutral-950 p-4 border-2 border-neutral-800">
                <label className="block text-[10px] font-black uppercase text-amber-400 tracking-wider">
                  Audit Snapshot Date
                </label>
                <input
                  type="date"
                  value={quickDailyDate}
                  onChange={(e) => setQuickDailyDate(e.target.value)}
                  className="w-full bg-neutral-900 border-2 border-neutral-750 text-white font-mono px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                />
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setQuickDailyDate(currentDate)}
                    className="flex-1 py-1 text-[9px] font-black uppercase bg-neutral-850 hover:bg-neutral-750 text-neutral-300 border border-neutral-700 transition-all cursor-pointer"
                  >
                    Current Day ({currentDate})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 1);
                      setQuickDailyDate(d.toISOString().slice(0, 10));
                    }}
                    className="flex-1 py-1 text-[9px] font-black uppercase bg-neutral-850 hover:bg-neutral-750 text-neutral-300 border border-neutral-700 transition-all cursor-pointer"
                  >
                    Yesterday
                  </button>
                </div>
              </div>

              {/* Filter Options */}
              <div className="space-y-4 bg-neutral-950 p-4 border-2 border-neutral-800">
                <span className="block text-[10px] font-black uppercase text-neutral-400 tracking-wider">
                  Auditor Display Filters
                </span>

                {/* Class Filter */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase text-neutral-500 font-bold">Class Grade</label>
                  <select
                    value={quickDailyClassFilter}
                    onChange={(e) => setQuickDailyClassFilter(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-750 text-white font-mono px-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
                  >
                    <option value="ALL">All Classes (Whole School)</option>
                    {ALL_CLASSES.map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>

                {/* Verification Status */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase text-neutral-500 font-bold">Audit Status</label>
                  <select
                    value={quickDailyStatusFilter}
                    onChange={(e) => setQuickDailyStatusFilter(e.target.value as any)}
                    className="w-full bg-neutral-900 border border-neutral-750 text-white font-mono px-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
                  >
                    <option value="ALL">All Transactions (Verified + Pending)</option>
                    <option value="VERIFIED">Verified Receipts Only</option>
                    <option value="PENDING">Pending Audit Verification Only</option>
                  </select>
                </div>

                {/* Authorized Signatory */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase text-neutral-500 font-bold">Authorized Signatory</label>
                  <input
                    type="text"
                    value={quickDailySignatory}
                    onChange={(e) => setQuickDailySignatory(e.target.value)}
                    placeholder="Headmaster / Bursar Name"
                    className="w-full bg-neutral-900 border border-neutral-750 text-white font-sans px-2.5 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
                  />
                </div>

                {/* Official Memo */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase text-neutral-500 font-bold">Auditor Directive Memo</label>
                  <textarea
                    rows={2}
                    value={quickDailyMemo}
                    onChange={(e) => setQuickDailyMemo(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-750 text-white font-sans px-2.5 py-1.5 text-xs focus:border-amber-400 focus:outline-none resize-none"
                  />
                </div>
              </div>

              {/* Financial Snapshot Summary KPI Block */}
              <div className="bg-neutral-950 p-4 border-2 border-neutral-800 space-y-3 font-mono">
                <span className="block text-[10px] font-black uppercase text-amber-400 tracking-wider">
                  Daily Reconciled Financials
                </span>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-neutral-900 p-2.5 border border-neutral-800">
                    <span className="text-[8px] text-neutral-400 uppercase block font-bold">Total Inflow</span>
                    <span className="text-sm font-black text-amber-400 font-mono">GHC {quickDailyTotals.grossAmount.toFixed(2)}</span>
                  </div>
                  <div className="bg-neutral-900 p-2.5 border border-neutral-800">
                    <span className="text-[8px] text-neutral-400 uppercase block font-bold">Total Receipts</span>
                    <span className="text-sm font-black text-white font-mono">{quickDailyTotals.totalCount}</span>
                  </div>
                  <div className="bg-neutral-900 p-2.5 border border-neutral-800">
                    <span className="text-[8px] text-emerald-400 uppercase block font-bold">Verified</span>
                    <span className="text-xs font-black text-emerald-400 font-mono">GHC {quickDailyTotals.verifiedAmount.toFixed(2)}</span>
                    <span className="text-[8px] text-neutral-500 block">({quickDailyTotals.verifiedCount} receipts)</span>
                  </div>
                  <div className="bg-neutral-900 p-2.5 border border-neutral-800">
                    <span className="text-[8px] text-amber-400 uppercase block font-bold">Pending Reconcile</span>
                    <span className="text-xs font-black text-amber-300 font-mono">GHC {quickDailyTotals.pendingAmount.toFixed(2)}</span>
                    <span className="text-[8px] text-neutral-500 block">({quickDailyTotals.pendingCount} receipts)</span>
                  </div>
                </div>

                {quickDailyTotals.cashiers.length > 0 && (
                  <div className="pt-2 border-t border-neutral-850">
                    <span className="text-[8.5px] uppercase text-neutral-500 font-bold block mb-1">Cashiers on Duty:</span>
                    <div className="flex flex-wrap gap-1">
                      {quickDailyTotals.cashiers.map(c => (
                        <span key={c} className="text-[9px] bg-neutral-850 text-neutral-300 px-1.5 py-0.5 border border-neutral-750">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Class Collections Distribution */}
              {quickDailyTotals.classBreakdown.length > 0 && (
                <div className="bg-neutral-950 p-4 border-2 border-neutral-800 space-y-2">
                  <span className="block text-[10px] font-black uppercase text-neutral-400 tracking-wider">
                    Class Collections Summary
                  </span>
                  <div className="space-y-1 max-h-48 overflow-y-auto text-[10px]">
                    {quickDailyTotals.classBreakdown.map(c => (
                      <div key={c.className} className="flex justify-between items-center py-1 border-b border-neutral-850">
                        <span className="font-bold text-neutral-300">{c.className} ({c.count} txns)</span>
                        <span className="font-mono font-black text-amber-400">GHC {c.total.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Side: A4 Printable Document View */}
            <div className="flex-1 bg-neutral-800/80 p-4 sm:p-8 overflow-y-auto flex justify-center">
              <div
                id="print-quick-daily-area"
                className="w-full max-w-[210mm] bg-white text-black p-8 sm:p-12 shadow-2xl border border-neutral-300 font-sans min-h-[297mm] flex flex-col justify-between"
              >
                <div className="space-y-6">
                  {/* Institutional Header */}
                  <div className="flex items-start justify-between border-b-2 border-neutral-900 pb-5">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 shrink-0">
                        <SchoolLogo className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <h1 className="text-xl font-black uppercase tracking-tight text-black font-sans leading-none">
                          SAAKO HOLY CHILD ACADEMY
                        </h1>
                        <p className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest mt-1">
                          Holiness is our Key • GES Reg. No. G/GAR/AN/12/342
                        </p>
                        <p className="text-[8px] text-neutral-500 font-mono mt-0.5">
                          P. O. Box LS 15, Sawla, Savannah Region • Tel: +233 54 502 9200 / +233 50 727 4133
                        </p>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <span className="inline-block bg-black text-white text-[9px] font-black uppercase px-2.5 py-1 tracking-wider">
                        OFFICIAL DAILY AUDIT
                      </span>
                      <p className="text-[9px] text-neutral-600 mt-1 font-bold">
                        DATE: <span className="text-black font-black">{quickDailyDate}</span>
                      </p>
                      <p className="text-[7.5px] text-neutral-500">
                        REF: SHC-DAY-{quickDailyDate.replace(/-/g, '')}
                      </p>
                    </div>
                  </div>

                  {/* Document Title Banner */}
                  <div className="bg-neutral-100 border border-neutral-300 p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <h2 className="text-xs font-black uppercase tracking-wider text-black font-mono">
                        DAILY TRANSACTIONS AUDIT & CASHIER RECONCILIATION STATEMENT
                      </h2>
                      <p className="text-[8.5px] text-neutral-600 font-sans mt-0.5">
                        Itemized financial transcript of daily fee collections, verified cashier receipts, and audit trail.
                      </p>
                    </div>
                    <span className="text-[8px] font-mono font-black bg-neutral-900 text-white px-2 py-0.5 shrink-0 uppercase">
                      STATUS: AUDITED TRANSCRIPT
                    </span>
                  </div>

                  {/* Executive KPI Summary Grid */}
                  <div className="grid grid-cols-4 gap-2 text-center font-mono">
                    <div className="bg-neutral-50 border border-neutral-300 p-2.5">
                      <span className="text-[7.5px] text-neutral-500 uppercase font-bold block">Total Collections</span>
                      <span className="text-sm font-black text-black">GHC {quickDailyTotals.grossAmount.toFixed(2)}</span>
                    </div>
                    <div className="bg-neutral-50 border border-neutral-300 p-2.5">
                      <span className="text-[7.5px] text-neutral-500 uppercase font-bold block">Verified Inflow</span>
                      <span className="text-sm font-black text-emerald-700">GHC {quickDailyTotals.verifiedAmount.toFixed(2)}</span>
                    </div>
                    <div className="bg-neutral-50 border border-neutral-300 p-2.5">
                      <span className="text-[7.5px] text-neutral-500 uppercase font-bold block">Pending Audit</span>
                      <span className="text-sm font-black text-amber-700">GHC {quickDailyTotals.pendingAmount.toFixed(2)}</span>
                    </div>
                    <div className="bg-neutral-50 border border-neutral-300 p-2.5">
                      <span className="text-[7.5px] text-neutral-500 uppercase font-bold block">Total Entries</span>
                      <span className="text-sm font-black text-black">{quickDailyTotals.totalCount} Receipts</span>
                    </div>
                  </div>

                  {/* Class Deposit Summary Row (if multiple classes) */}
                  {quickDailyTotals.classBreakdown.length > 0 && (
                    <div className="border border-neutral-300 p-2.5 bg-neutral-50/50">
                      <span className="text-[8px] font-black uppercase tracking-wider text-neutral-700 block mb-1.5 font-mono">
                        Class Collections Summary Breakdown:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[8px] font-mono">
                        {quickDailyTotals.classBreakdown.map(c => (
                          <div key={c.className} className="bg-white p-1.5 border border-neutral-200 flex justify-between items-center">
                            <span className="font-bold">{c.className}:</span>
                            <span className="font-black text-black">GHC {c.total.toFixed(2)} ({c.count})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Itemized Transactions Table */}
                  <div className="space-y-1">
                    <span className="text-[8.5px] font-black uppercase tracking-wider text-black font-mono block">
                      Itemized Transactions Ledger ({quickDailyTransactions.length} records)
                    </span>
                    <table className="w-full text-left text-[8px] border-collapse border border-neutral-300">
                      <thead>
                        <tr className="bg-neutral-900 text-white font-mono text-[7.5px] uppercase">
                          <th className="p-1.5 border border-neutral-800 text-center w-8">No.</th>
                          <th className="p-1.5 border border-neutral-800 w-16">Receipt ID</th>
                          <th className="p-1.5 border border-neutral-800">Pupil Full Name</th>
                          <th className="p-1.5 border border-neutral-800 w-12">Class</th>
                          <th className="p-1.5 border border-neutral-800 text-right w-16">Amount (GHC)</th>
                          <th className="p-1.5 border border-neutral-800 w-18">Cashier</th>
                          <th className="p-1.5 border border-neutral-800 text-center w-16">Status</th>
                          <th className="p-1.5 border border-neutral-800">Notes / Purpose</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {quickDailyTransactions.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="p-6 text-center text-neutral-400 font-mono italic text-[9px]">
                              No transactions recorded for the selected audit parameters on {quickDailyDate}.
                            </td>
                          </tr>
                        ) : (
                          quickDailyTransactions.map((p, idx) => (
                            <tr key={p.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}>
                              <td className="p-1.5 border border-neutral-200 text-center font-mono font-bold text-neutral-500">
                                {idx + 1}
                              </td>
                              <td className="p-1.5 border border-neutral-200 font-mono font-bold text-neutral-800">
                                {p.id.substring(0, 8)}
                              </td>
                              <td className="p-1.5 border border-neutral-200 font-bold uppercase text-black">
                                {p.studentName}
                              </td>
                              <td className="p-1.5 border border-neutral-200 font-mono text-neutral-700">
                                {p.class}
                              </td>
                              <td className="p-1.5 border border-neutral-200 font-mono font-black text-right text-black">
                                {p.amount.toFixed(2)}
                              </td>
                              <td className="p-1.5 border border-neutral-200 font-mono text-neutral-600">
                                {p.collectedBy || 'Staff'}
                              </td>
                              <td className="p-1.5 border border-neutral-200 text-center font-mono">
                                <span className={`inline-block px-1 py-0.2 text-[7px] font-black uppercase ${
                                  p.verified 
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}>
                                  {p.verified ? 'VERIFIED' : 'PENDING'}
                                </span>
                              </td>
                              <td className="p-1.5 border border-neutral-200 text-neutral-600 italic">
                                {p.notes || 'Daily Schooling Fee'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="bg-neutral-100 font-mono font-black text-[8px] border-t-2 border-neutral-900">
                          <td colSpan={4} className="p-2 border border-neutral-300 text-right uppercase">
                            TOTAL AUDITED REVENUE ({quickDailyTransactions.length} entries):
                          </td>
                          <td className="p-2 border border-neutral-300 text-right text-black text-[9px]">
                            GHC {quickDailyTotals.grossAmount.toFixed(2)}
                          </td>
                          <td colSpan={3} className="p-2 border border-neutral-300 text-neutral-600 text-[7.5px]">
                            Verified: GHC {quickDailyTotals.verifiedAmount.toFixed(2)} | Pending: GHC {quickDailyTotals.pendingAmount.toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Auditor Directive Memo */}
                  {quickDailyMemo && (
                    <div className="bg-neutral-50 border border-neutral-300 p-2.5 font-sans">
                      <span className="text-[7.5px] font-black uppercase tracking-wider text-neutral-500 font-mono block">
                        ADMINISTRATIVE MEMORANDUM & DIRECTIVE:
                      </span>
                      <p className="text-[8.5px] text-neutral-700 mt-0.5 italic">
                        "{quickDailyMemo}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Official Quad Signature Block */}
                <div className="mt-8 pt-4 border-t-2 border-neutral-900 space-y-4 print-avoid-break">
                  <div className="grid grid-cols-3 gap-6 text-[8px]">
                    {/* Prepared by */}
                    <div className="space-y-3">
                      <span className="text-neutral-500 font-bold uppercase text-[7px] block font-mono">
                        1. PREPARED BY (CASHIER / DESK):
                      </span>
                      <div className="h-6 border-b border-neutral-400 w-32"></div>
                      <div>
                        <span className="text-black font-extrabold uppercase block font-sans">
                          {quickDailyTotals.cashiers.length > 0 ? quickDailyTotals.cashiers[0] : 'Accounting Officer'}
                        </span>
                        <span className="text-neutral-500 block text-[7.5px] font-sans">Revenue Officer</span>
                      </div>
                    </div>

                    {/* Audited by */}
                    <div className="space-y-3">
                      <span className="text-neutral-500 font-bold uppercase text-[7px] block font-mono">
                        2. VERIFIED & AUDITED BY:
                      </span>
                      <div className="h-6 border-b border-neutral-400 w-32"></div>
                      <div>
                        <span className="text-black font-extrabold uppercase block font-sans">Internal Auditor</span>
                        <span className="text-neutral-500 block text-[7.5px] font-sans">Bursary & Accounts Desk</span>
                      </div>
                    </div>

                    {/* Approved by */}
                    <div className="space-y-3 text-right">
                      <span className="text-neutral-500 font-bold uppercase text-[7px] block font-mono">
                        3. APPROVED BY (HEADMASTER):
                      </span>
                      <div className="h-6 border-b border-neutral-400 w-32 ml-auto"></div>
                      <div>
                        <span className="text-black font-extrabold uppercase block font-sans">
                          {quickDailySignatory}
                        </span>
                        <span className="text-neutral-500 block text-[7.5px] font-sans">Headmaster & Administration</span>
                      </div>
                    </div>
                  </div>

                  {/* Running Document Footer */}
                  <div className="flex justify-between items-center text-[7px] font-mono text-neutral-400 pt-2 border-t border-neutral-200">
                    <span>GEN: {new Date().toLocaleString()} • SAAKO HOLY CHILD ACADEMY</span>
                    <span>CONFIDENTIAL AUDIT TRANSCRIPT • SAAKO EDUCATION CLOUD</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pre-School Canteen Feeding Booklet Modal */}
      <CanteenBookletModal
        isOpen={showCanteenBookletModal}
        onClose={() => setShowCanteenBookletModal(false)}
        students={students}
        activeTerm={activeTerm}
      />

      {/* Toast Alert Header */}
      {successMsg && (
        <div className="fixed bottom-4 right-4 z-[9999] bg-amber-400 text-black border-4 border-neutral-800 p-4 text-xs font-black flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] font-mono uppercase tracking-widest animate-fade-in">
          <div className="flex items-center gap-2">
            <Check size={16} className="bg-black/10 p-0.5" />
            <span>{successMsg}</span>
          </div>
        </div>
      )}
    </div>
  );
});
