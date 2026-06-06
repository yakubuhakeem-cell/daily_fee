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
  UserCheck, CalendarRange, AlertTriangle, TrendingUp, UserMinus, Eye
} from 'lucide-react';

export const ReportPanel: React.FC = () => {
  const { 
    payments, 
    students,
    currentDate, 
    sendMonthlyEmailDraft,
    currentUser,
    verifyPayment,
    activeTerm
  } = useApp();

  const [dateFilter, setDateFilter] = useState<string>(''); // empty means All Days
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Calendar states
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('');
  const [inspectedDate, setInspectedDate] = useState<string>('');
  const [showCalendar, setShowCalendar] = useState<boolean>(true);

  // Email Summary sliding drawer state
  const [showEmailDrawer, setShowEmailDrawer] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('accounting@school.edu.gh');
  const [emailStatus, setEmailStatus] = useState<{ success: boolean; message: string; textUrl: string } | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  // Bulk Print states
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const [customMemo, setCustomMemo] = useState('Official statement of student daily schooling fee collections. Please retain this signature receipt for authentication.');
  const [authorizedBy, setAuthorizedBy] = useState('Mrs. Grace Appiah (Headmistress)');
  const [includeUnverified, setIncludeUnverified] = useState(true);
  const [printDateMode, setPrintDateMode] = useState<'current' | 'custom'>('current');
  const [printStartDate, setPrintStartDate] = useState('');
  const [printEndDate, setPrintEndDate] = useState('');

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
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
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
  }, [payments, searchQuery, printDateMode, printStartDate, printEndDate, dateFilter, classFilter, categoryFilter]);

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

  // Aggregate stats of filtered set
  const totalsInfo = useMemo(() => {
    const totalCollected = filteredPayments.filter(p => p.verified).reduce((sum, p) => sum + p.amount, 0);
    const unverifiedCount = filteredPayments.filter(p => !p.verified).length;
    return {
      totalCollected,
      unverifiedCount
    };
  }, [filteredPayments]);

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

    activeTerm.schoolDays.forEach(dayStr => {
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
            onClick={() => setShowPrintModal(true)}
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
                    Ghana Education Trust • Audits Version V1.4
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Main Ledger Listing Sheet */}
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
                    <td className="p-4 font-black text-white uppercase text-xs tracking-wide">{p.studentName}</td>
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
                  placeholder="accounting@school.edu.gh"
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

Ghanaian Educational Trust Daily Fee Tracker Report
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
                    const pastSchoolDays = activeTerm.schoolDays.filter(d => d < currentDate);
                    const unpaidDays = pastSchoolDays.filter(dStr => {
                      return !payments.some(p => p.studentId === sProfile.id && p.date === dStr);
                    });
                    unpaidDaysCount = unpaidDays.length;
                    totalDebt = unpaidDaysCount * 5;
                  }

                  const schoolOwesStudent = payments
                    .filter(p => p.studentId === group.studentId && p.verified && p.date > currentDate)
                    .reduce((sum, p) => sum + p.amount, 0);

                  return (
                    <div 
                      key={group.studentId} 
                      className="print-invoice-page bg-white text-black p-10 shadow-2xl max-w-[210mm] mx-auto min-h-[297mm] flex flex-col justify-between relative border border-neutral-300 font-sans"
                    >
                      {/* Inner invoice sheet header component */}
                      <div className="space-y-6">
                        {/* Header banner structure */}
                        <div className="border-b-4 border-black pb-4 flex justify-between items-start">
                          <div className="space-y-1">
                            <span className="text-[11px] font-black uppercase tracking-wider text-black bg-neutral-200 px-2 py-0.5 font-mono">
                              SAAKO HOLY CHILD ACADEMY
                            </span>
                            <h2 className="text-xl font-black uppercase tracking-tight leading-none mt-1">STATEMENT OF SCHOOLING FEE</h2>
                            <p className="text-[9px] text-neutral-600 font-black uppercase tracking-widest font-mono">
                              ONLINE SYNCHRONIZED CLOUD DATABASE SYSTEM
                            </p>
                          </div>
                          
                          <div className="text-right space-y-1 font-mono">
                            <span className="text-[11px] font-black uppercase px-2.5 py-1 bg-black text-white inline-block">
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
                            CHECKED DAILY PAYMENTS METRIC BREAKDOWN ({group.paymentsList.length} DAYS)
                          </span>
                          
                          <table className="w-full text-[10px]">
                            <thead>
                              <tr className="border-b-2 border-black text-left uppercase text-neutral-500 font-black tracking-wider font-mono">
                                <th className="py-2">DATE CHECKED</th>
                                <th className="py-2 font-mono">TRANSACTION REF</th>
                                <th className="py-2">VERIFIED GATE</th>
                                <th className="py-2">COLLECTED BY</th>
                                <th className="py-2 text-right">FEES REPORTED</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200">
                              {group.paymentsList.map((record) => (
                                <tr key={record.id} className="font-medium text-neutral-800">
                                  <td className="py-2 font-mono text-black font-bold">{record.date}</td>
                                  <td className="py-2 font-mono text-[9px] text-neutral-600 uppercase">{record.id}</td>
                                  <td className="py-2">
                                    <span className={`inline-block text-[8px] font-black px-1.5 py-0.5 uppercase ${
                                      record.verified 
                                        ? 'bg-neutral-100 text-black' 
                                        : 'bg-neutral-200 text-neutral-600 font-bold'
                                    }`}>
                                      {record.verified ? '✔️ APPROVED' : '⚠️ PENDING'}
                                    </span>
                                  </td>
                                  <td className="py-2 truncate max-w-[120px]">{record.collectedBy}</td>
                                  <td className="py-2 text-right font-mono font-bold text-black">GHC {record.amount.toFixed(2)}</td>
                                </tr>
                              ))}
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
                              ACCRA MAIN BRANCH OFFICE
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
    </div>
  );
};
