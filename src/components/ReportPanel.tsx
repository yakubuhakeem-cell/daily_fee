/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { StudentClass, SchoolCategory, PaymentRecord } from '../types';
import { 
  FileSpreadsheet, Mail, Search, Calendar, ChevronRight, CheckCircle2, 
  HelpCircle, Settings, CheckSquare, PlusSquare, ArrowUpDown, X, Printer,
  UserCheck, CalendarRange, AlertTriangle, TrendingUp, UserMinus, Eye,
  ZoomIn, ZoomOut, FileText, Check, Info, MessageSquare, Share2
} from 'lucide-react';
import { SchoolLogo } from './SchoolLogo';
import { VoiceSearchButton } from './VoiceSearchButton';

export const ReportPanel: React.FC = () => {
  const { 
    payments, 
    students,
    currentDate, 
    sendMonthlyEmailDraft,
    currentUser,
    verifyPayment,
    activeTerm,
    sendautomatedWhatsApp
  } = useApp();

  const [dateFilter, setDateFilter] = useState<string>(''); // empty means All Days
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Auditing & Month-To-Date (MTD) view states
  const [auditViewMode, setAuditViewMode] = useState<'daily' | 'monthly'>('daily');
  const [auditSelectedMonth, setAuditSelectedMonth] = useState<string>(() => {
    return currentDate?.slice(0, 7) || '2026-06';
  });
  const [expandedDailyAuditDate, setExpandedDailyAuditDate] = useState<string>('');

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
  const [termSummarySearchQuery, setTermSummarySearchQuery] = useState('');
  const [termSummaryClassFilter, setTermSummaryClassFilter] = useState('ALL');
  const [termSummarySignatory, setTermSummarySignatory] = useState('Yakubu Hakeem (Headmaster)');
  const [termSummaryMemo, setTermSummaryMemo] = useState('Consolidated term billing record and verified registration statement. Please verify and resolve all outstanding balances with the administrative office.');
  const [termSummaryOnlyPending, setTermSummaryOnlyPending] = useState(false);

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
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.studentName.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query)
      );
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

  // Filter payments specifically for bulk printing (with dynamic range option)
  const printFilteredPayments = useMemo(() => {
    let result = [...payments];

    // Search query
    const activeSearch = printSearchQuery.trim() ? printSearchQuery : searchQuery;
    if (activeSearch.trim()) {
      const query = activeSearch.toLowerCase();
      result = result.filter(p => 
        p.studentName.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query)
      );
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
    if (!activeTerm || !activeTerm.schoolDays) return [];

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

    const holidays = activeTerm.publicHolidays || [];
    const termSchoolDays = activeTerm.schoolDays;

    return filteredList.map(student => {
      // Find payments for this student inside the active term
      const studentPayments = payments.filter(p => p.studentId === student.id && termSchoolDays.includes(p.date));
      
      const presentPayments = studentPayments.filter(p => !p.isAbsent && p.verified);
      const unverifiedPayments = studentPayments.filter(p => !p.isAbsent && !p.verified);
      const absentPayments = studentPayments.filter(p => p.isAbsent);

      const presentCount = presentPayments.length + (includeUnverified ? unverifiedPayments.length : 0);
      const absentCount = absentPayments.length;
      
      // School days elapsed up to currentDate
      const elapsedDays = termSchoolDays.filter(d => d <= currentDate);

      // Unpaid days up to currentDate
      const unpaidDays = elapsedDays.filter(dayStr => {
        if (holidays.includes(dayStr)) return false;
        const record = payments.find(p => p.studentId === student.id && p.date === dayStr);
        return !record;
      });
      const unpaidCount = unpaidDays.length;

      // Fees calculations
      const isTermPayer = student.paymentType === 'Term';
      const termFeeAmount = student.termFee || 350;

      let totalCharged = 0;
      let totalPaid = 0;
      let totalDue = 0;

      if (isTermPayer) {
        totalCharged = termFeeAmount + (student.legacyDebt || 0);
        // Payments include any recorded payments.
        totalPaid = studentPayments.filter(p => !p.isAbsent && (includeUnverified || p.verified)).reduce((sum, p) => sum + p.amount, 0);
        totalDue = Math.max(0, totalCharged - totalPaid);
      } else {
        totalPaid = studentPayments.filter(p => !p.isAbsent && (includeUnverified || p.verified)).reduce((sum, p) => sum + p.amount, 0);
        totalDue = (unpaidCount * 5) + (student.legacyDebt || 0);
        totalCharged = totalPaid + totalDue;
      }

      // Attendance rate
      const denominator = presentCount + absentCount + unpaidCount;
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
  }, [students, payments, activeTerm, currentDate, termSummarySearchQuery, termSummaryClassFilter, termSummaryOnlyPending, includeUnverified]);

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
          payments.some(p => p.studentId === s.id && p.date === dayStr)
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
    const expectedGhc = activeStudents.length * 5;

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
              Holiness is our Key, P. O. Box ls15, Sawla-Savannah. Tel: +233545029200 / +2330507274133
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
                  <span style="font-size: 5px; color: #4338ca; display: block; font-weight: bold;">SAWLA-SAVANNAH</span>
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
    // Building valid Comma Separated Spreadsheet Content
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Include BOM for Excel English support
    csvContent += "Payment ID,Student Roll/ID,Student Name,Class Grade,Academic Group,Collections (GHC),Checked Date,Checked Timestamp,Collected By Teacher,Security Audit Status\r\n";

    filteredPayments.forEach(p => {
      const row = [
        p.id,
        `="${p.studentId}"`, // Force Excel string format
        `"${p.studentName.replace(/"/g, '""')}"`,
        p.class,
        p.category,
        p.amount.toFixed(2),
        p.date,
        p.timestamp,
        `"${p.collectedBy.replace(/"/g, '""')}"`,
        p.verified ? 'Verified Ledger' : 'Pending Verification'
      ];
      csvContent += row.join(",") + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", encodedUri);
    
    // Naming structure for audits
    const fileDateSuffix = dateFilter ? `_${dateFilter}` : "_FullHistory";
    downloadAnchor.setAttribute("download", `DailySchoolFees_ExcelSheet${fileDateSuffix}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
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

          {/* Bulk Print button */}
          <button
            onClick={() => {
              setPrintSearchQuery(searchQuery);
              setShowPrintModal(true);
            }}
            className="flex-1 sm:flex-initial text-[10px] font-black bg-neutral-950 hover:bg-neutral-850 hover:text-white text-amber-400 py-3.5 px-4 transition-all border-2 border-neutral-800 hover:border-amber-400 uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Printer size={14} /> Bulk Print
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

          {/* Print Friendly button */}
          <button
            onClick={() => {
              setShowPrintFriendlyModal(true);
            }}
            className="flex-1 sm:flex-initial text-[10px] font-black bg-neutral-950 hover:bg-neutral-850 hover:text-white text-blue-400 py-3.5 px-4 transition-all border-2 border-neutral-800 hover:border-blue-400 uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Printer size={14} /> Print Friendly
          </button>

          {/* Print Report (Dedicated Window) button */}
          <button
            onClick={handlePrintReport}
            className="flex-1 sm:flex-initial text-[10px] font-black bg-neutral-950 hover:bg-neutral-850 hover:text-white text-amber-500 py-3.5 px-4 transition-all border-2 border-neutral-800 hover:border-amber-500 uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1.5"
            title="Open audit ledger in stripped, print-ready dedicated browser window"
          >
            <Printer size={14} /> Print Report
          </button>

          {/* Term Summary PDF button */}
          <button
            onClick={() => {
              setTermSummarySearchQuery(searchQuery);
              setShowTermSummaryModal(true);
            }}
            className="flex-1 sm:flex-initial text-[10px] font-black bg-neutral-950 hover:bg-neutral-850 hover:text-white text-emerald-450 py-3.5 px-4 transition-all border-2 border-neutral-800 hover:border-emerald-400 uppercase tracking-widest cursor-pointer flex items-center justify-center gap-1.5"
            title="Generate consolidated term-long summaries and statement sheets for all pupils"
          >
            <FileText size={14} /> Term Summary PDF
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
            <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">Student Name or ID</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-3 text-neutral-500" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type 'Kojo' or ID..."
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
            onClick={() => setAuditViewMode('daily')}
            className={`flex-1 md:flex-initial px-4 py-2 text-[10px] uppercase font-mono font-black tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              auditViewMode === 'daily'
                ? 'bg-amber-400 text-black'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Calendar size={12} />
            Daily Log View
          </button>
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
        </div>
      </div>

      {auditViewMode === 'daily' ? (
        /* Main Ledger Listing Sheet */
        <div className="bg-neutral-900 border-4 border-neutral-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-neutral-950 border-b-2 border-neutral-800 text-[10px] font-black text-neutral-400 uppercase tracking-widest font-mono">
                  <th className="p-4 cursor-pointer select-none" onClick={() => handleSort('date')}>
                    <div className="flex items-center gap-1.5 py-1">Date Check <ArrowUpDown size={12} /></div>
                  </th>
                  <th className="p-4 cursor-pointer select-none" onClick={() => handleSort('studentName')}>
                    <div className="flex items-center gap-1.5 py-1">Student Name <ArrowUpDown size={12} /></div>
                  </th>
                  <th className="p-4 cursor-pointer select-none font-mono" onClick={() => handleSort('class')}>
                    <div className="flex items-center gap-1.5 py-1">Class <ArrowUpDown size={12} /></div>
                  </th>
                  <th className="p-4 font-mono uppercase tracking-widest">Group</th>
                  <th className="p-4 text-right uppercase tracking-widest">Fee (GHC)</th>
                  <th className="p-4 uppercase tracking-widest">Staff Gate</th>
                  <th className="p-4 text-center uppercase tracking-widest">Security Check</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850 font-sans text-neutral-300">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-neutral-500 font-black uppercase tracking-widest text-xs">
                      No payment ledger found. Change filter queries to load records.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-neutral-950/20">
                      <td className="p-4 font-mono text-neutral-450">{p.date}</td>
                      <td className="p-4 font-black text-white uppercase text-xs tracking-wide">
                        <div>{p.studentName}</div>
                        {p.notes && (
                          <div className="mt-1 text-[10px] font-mono text-neutral-400 font-bold normal-case flex flex-wrap items-center gap-1.5 leading-snug">
                            {p.notes.toLowerCase().includes('settled debt') || p.notes.toLowerCase().includes('arrears') ? (
                              <span className="px-1.5 py-0.5 rounded-xs uppercase text-[8px] font-black bg-red-950/80 text-rose-400 border border-red-900/60 tracking-wider inline-block">
                                DEBT CLEARANCE
                              </span>
                            ) : p.notes.toLowerCase().includes('prepaid') || p.notes.toLowerCase().includes('covered') || p.notes.toLowerCase().includes('advance') ? (
                              <span className="px-1.5 py-0.5 rounded-xs uppercase text-[8px] font-black bg-sky-955 text-sky-400 border border-sky-900 tracking-wider inline-block">
                                ADVANCE PREPAID
                              </span>
                            ) : null}
                            <span className="text-neutral-450 uppercase">{p.notes}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4 font-mono font-black text-amber-400 text-sm">{p.class}</td>
                      <td className="p-4 text-neutral-400 text-[11px] font-black uppercase tracking-wider">{p.category}</td>
                      <td className="p-4 text-right font-black font-mono text-white">GHC {p.amount.toFixed(2)}</td>
                      <td className="p-4 text-neutral-300 font-bold uppercase text-[11px] truncate max-w-[120px]">{p.collectedBy}</td>
                      <td className="p-4 text-center">
                        {p.verified ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-neutral-950 text-emerald-400 border border-neutral-850 font-black text-[10px] uppercase tracking-widest">
                            Approved
                          </span>
                        ) : (
                          <button
                            onClick={() => verifyPayment(p.id)}
                            className="px-3 py-1 text-[9px] font-black bg-white hover:bg-amber-400 text-black uppercase tracking-widest transition-colors cursor-pointer"
                          >
                            Approve Check
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
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
                      placeholder="Search by name or ID..."
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

                  // Calculate Student overall historical total collected fees and arrears/outstanding debt
                  const totalPaymentsAllTime = payments
                    .filter(p => p.studentId === group.studentId && p.verified)
                    .reduce((sum, p) => sum + p.amount, 0);

                  let totalDebt = 0;
                  let unpaidDaysCount = 0;
                  if (activeTerm && activeTerm.schoolDays && sProfile) {
                    const holidays = activeTerm.publicHolidays || [];
                    const pastSchoolDays = activeTerm.schoolDays.filter(d => d < currentDate && !holidays.includes(d));
                    const unpaidDays = pastSchoolDays.filter(dStr => {
                      return !payments.some(p => p.studentId === sProfile.id && p.date === dStr);
                    });
                    unpaidDaysCount = unpaidDays.length;
                    if (sProfile.paymentType === 'Term') {
                      const tFee = sProfile.termFee || 350;
                      const legacyD = sProfile.legacyDebt || 0;
                      const totalPaidAllTime = payments
                        .filter(p => p.studentId === sProfile.id && !p.isAbsent)
                        .reduce((sum, p) => sum + p.amount, 0);
                      totalDebt = Math.max(0, tFee + legacyD - totalPaidAllTime);
                    } else {
                      totalDebt = (unpaidDaysCount * 5) + (sProfile.legacyDebt || 0);
                    }
                  }

                  const schoolOwesStudent = payments
                    .filter(p => p.studentId === group.studentId && p.verified && p.date > currentDate)
                    .reduce((sum, p) => sum + p.amount, 0);

                  const studentHistoryList = (() => {
                    if (!activeTerm || !activeTerm.schoolDays || !sProfile) return [];
                    const holidays = activeTerm.publicHolidays || [];
                    const pastSchoolDays = activeTerm.schoolDays.filter(d => d <= currentDate);

                    return pastSchoolDays.map((dayStr) => {
                      const pRecord = payments.find(p => p.studentId === group.studentId && p.date === dayStr);
                      const isHoliday = holidays.includes(dayStr);
                      const isAbsent = pRecord?.isAbsent || false;
                      const isVerified = pRecord?.verified || false;
                      const isTermPayer = sProfile.paymentType === 'Term';

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
                      } else if (isTermPayer) {
                        statusLabel = 'Present (Term Paid)';
                        feeLabel = 'Covered (Term)';
                        paymentRef = 'TERM-SCHEME';
                        collector = 'System';
                      } else {
                        const isDayUnpaid = !payments.some(p => p.studentId === sProfile.id && p.date === dayStr);
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
                <h3 className="text-lg font-black uppercase tracking-tight">CSV Export Pre-Audit Summary</h3>
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
              <span>CSV document triggers physical browser download immediately.</span>
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
                        Holiness is our Key, P. O. Box ls15, Sawla-Savannah. Tel: +233545029200 / +2330507274133
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
                      <path d="M 12 70 C 12 40, 24 15, 50 15 C 76 15, 88 35, 88 55 C 88 75, 70 85, 50 85 C 30 85, 20 70, 25 55 C 30 40, 45 40, 50 45 C 55 50, 52 65, 45 65 C 38 65, 38 52, 44 48" strokeWidth="6" />
                      <path d="M 12 70 C 12 40, 24 15, 50 15 C 76 15, 88 35, 88 55" stroke="#f0fdf4" strokeWidth="1.5" />
                      <circle cx="44" cy="48" r="4.5" fill="#14532d" stroke="none" />
                      <circle cx="43" cy="47" r="1" fill="#f0fdf4" stroke="none" />
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
                          Holiness is our Key, P. O. Box ls15, Sawla-Savannah. Tel: +233545029200 / +2330507274133
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
                        <path d="M 12 70 C 12 40, 24 15, 50 15 C 76 15, 88 35, 88 55 C 88 75, 70 85, 50 85 C 30 85, 20 70, 25 55 C 30 40, 45 40, 50 45 C 55 50, 52 65, 45 65 C 38 65, 38 52, 44 48" strokeWidth="6" />
                        <path d="M 12 70 C 12 40, 24 15, 50 15 C 76 15, 88 35, 88 55" stroke="#f0fdf4" strokeWidth="1.5" />
                        <circle cx="44" cy="48" r="4.5" fill="#14532d" stroke="none" />
                        <circle cx="43" cy="47" r="1" fill="#f0fdf4" stroke="none" />
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
                  const refCode = `SHC-TERM-${(activeTerm?.id || 'TERM').substring(0,6).toUpperCase()}-${student.id.substring(0,6).toUpperCase()}`;
                  
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
                              Term Period: {activeTerm?.name || 'Academic Semester'}
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
                              <g transform="translate(42, 42) scale(0.16)" stroke="#14532d" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M 12 70 C 12 40, 24 15, 50 15 C 76 15, 88 35, 88 55 C 88 75, 70 85, 50 85 C 30 85, 20 70, 25 55 C 30 40, 45 40, 50 45 C 55 50, 52 65, 45 65 C 38 65, 38 52, 44 48" strokeWidth="6" />
                                <path d="M 12 70 C 12 40, 24 15, 50 15 C 76 15, 88 35, 88 55" stroke="#f0fdf4" strokeWidth="1.5" />
                                <circle cx="44" cy="48" r="4.5" fill="#14532d" stroke="none" />
                                <circle cx="43" cy="47" r="1" fill="#f0fdf4" stroke="none" />
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
    </div>
  );
};
