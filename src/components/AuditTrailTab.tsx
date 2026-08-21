import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { AuditLog, BackupRecord } from '../types';
import { 
  FileText, 
  Search, 
  RefreshCw, 
  User, 
  CreditCard, 
  Clock, 
  Trash2, 
  AlertTriangle, 
  Download, 
  Database, 
  X, 
  Coins, 
  CheckCircle2, 
  PieChart, 
  ShieldAlert, 
  Building,
  RotateCcw,
  History,
  Save,
  Undo2,
  Check,
  PlusCircle,
  Sparkles
} from 'lucide-react';

export function AuditTrailTab() {
  const { 
    auditLogs = [], 
    fetchAuditLogs,
    students = [],
    payments = [],
    examsPayments = [],
    backups = [],
    trashItems = [],
    fetchTrashItems,
    restoreTrashItem,
    permanentlyDeleteTrashItem,
    emptyTrash,
    systemSettings,
    activeTerm,
    currentDate,
    purgeDuplicatePayments,
    sanitizeDatabaseIntegrity,
    logActivity,
    createBackup,
    restoreBackup,
    restoreDeletedRecord
  } = useApp();

  const [viewMode, setViewMode] = useState<'audit' | 'recovery'>('audit');
  const [recoverySubTab, setRecoverySubTab] = useState<'trash' | 'deletions' | 'snapshots'>('trash');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'deletions' | 'students' | 'payments' | 'database' | 'expenses' | 'settings' | 'security' | 'other'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [visibleLogsCount, setVisibleLogsCount] = useState(50);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showClassBreakdown, setShowClassBreakdown] = useState(false);

  // Recovery Modal States
  const [itemToRestore, setItemToRestore] = useState<AuditLog | null>(null);
  const [snapshotToRestore, setSnapshotToRestore] = useState<BackupRecord | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showCreateSnapshotModal, setShowCreateSnapshotModal] = useState(false);
  const [customSnapshotLabel, setCustomSnapshotLabel] = useState('');

  useEffect(() => {
    setVisibleLogsCount(50);
  }, [search, categoryFilter]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAuditLogs?.();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleCreateSnapshotAction = () => {
    const label = customSnapshotLabel.trim() || 'Manual Admin Recovery Snapshot';
    createBackup?.(label, false);
    logActivity?.('RECOVERY_SNAPSHOT_CREATED', 'settings', `Created manual point-in-time recovery snapshot: "${label}"`);
    showToast(`Recovery snapshot "${label}" created successfully!`);
    setCustomSnapshotLabel('');
    setShowCreateSnapshotModal(false);
  };

  const handleConfirmItemRestore = async () => {
    if (!itemToRestore) return;
    setIsRestoring(true);
    try {
      if (restoreDeletedRecord) {
        const res = await restoreDeletedRecord(itemToRestore);
        showToast(res.message);
        await fetchAuditLogs?.();
      } else {
        showToast('Data recovery service not available.');
      }
    } catch (err) {
      showToast('Failed to execute record recovery.');
    } finally {
      setIsRestoring(false);
      setItemToRestore(null);
    }
  };

  const handleConfirmSnapshotRollback = async () => {
    if (!snapshotToRestore) return;
    setIsRestoring(true);
    try {
      if (restoreBackup) {
        restoreBackup(snapshotToRestore.id);
        logActivity?.('DATABASE_ROLLBACK', 'settings', `Rolled back entire database state to recovery snapshot: "${snapshotToRestore.label}" (${snapshotToRestore.timestamp})`);
        showToast(`Successfully rolled back database to snapshot: "${snapshotToRestore.label}"!`);
        await fetchAuditLogs?.();
      }
    } catch (err) {
      showToast('Failed to rollback database snapshot.');
    } finally {
      setIsRestoring(false);
      setSnapshotToRestore(null);
    }
  };

  // Financial Summary Calculations
  const activeStudents = students.filter(s => s.active !== false);
  const totalStudentsCount = students.length;
  const activeStudentsCount = activeStudents.length;

  const baseDailyFee = systemSettings?.baselineDailyFee ?? 5.00;
  const expectedDailyRevenue = activeStudents.reduce((acc, s) => {
    const discount = s.discount || 0;
    return acc + Math.max(0, baseDailyFee - discount);
  }, 0);

  const termSchoolDaysCount = activeTerm?.schoolDays?.length || activeTerm?.daysCount || 75;
  const expectedTermRevenue = expectedDailyRevenue * termSchoolDaysCount;

  // Real-time Recorded Revenue
  const todayVerifiedPayments = payments.filter(p => p.date === currentDate && !p.isAbsent && p.verified !== false && Number(p.amount || 0) > 0);
  const recordedTodayRevenue = todayVerifiedPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);

  const totalRecordedDailyFees = payments.reduce((acc, p) => {
    if (!p.isAbsent && p.verified !== false && Number(p.amount || 0) > 0) {
      return acc + Number(p.amount || 0);
    }
    return acc;
  }, 0);

  const totalRecordedExamFees = examsPayments.reduce((acc, ep) => {
    return acc + Number(ep.amountPaid || ep.amount || 0);
  }, 0);

  const grandGrossRevenue = totalRecordedDailyFees + totalRecordedExamFees;

  const todayCollectionRate = expectedDailyRevenue > 0 ? (recordedTodayRevenue / expectedDailyRevenue) * 100 : 0;
  const termCollectionRate = expectedTermRevenue > 0 ? (totalRecordedDailyFees / expectedTermRevenue) * 100 : 0;
  const uncollectedTermVariance = Math.max(0, expectedTermRevenue - totalRecordedDailyFees);

  // Duplicates Detection
  const duplicateMap = new Map<string, number>();
  payments.forEach(p => {
    if (!p.isAbsent) {
      const key = `${p.studentId}_${p.date}`;
      duplicateMap.set(key, (duplicateMap.get(key) || 0) + 1);
    }
  });
  let duplicatePaymentsCount = 0;
  duplicateMap.forEach(count => {
    if (count > 1) duplicatePaymentsCount += (count - 1);
  });

  const handlePurgeDuplicatesAction = () => {
    if (purgeDuplicatePayments) {
      const res = purgeDuplicatePayments();
      showToast(res.message);
      logActivity?.('payments', 'payments', res.message);
    }
  };

  const handleSanitizeIntegrityAction = () => {
    if (sanitizeDatabaseIntegrity) {
      const res = sanitizeDatabaseIntegrity();
      showToast(res.message);
    }
  };

  // Class Breakdown Data
  const ALL_CLASSES = ['Nursery', 'KG1', 'KG2', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9'] as const;
  const classFinancials = ALL_CLASSES.map(cls => {
    const clsActive = activeStudents.filter(s => s.class === cls);
    const clsExpectedDaily = clsActive.reduce((sum, s) => sum + Math.max(0, baseDailyFee - (s.discount || 0)), 0);
    const clsRecordedDaily = payments.filter(p => p.class === cls && !p.isAbsent && p.verified !== false && Number(p.amount || 0) > 0)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const clsRecordedExams = examsPayments.filter(ep => ep.class === cls)
      .reduce((sum, ep) => sum + Number(ep.amountPaid || ep.amount || 0), 0);
    const clsTotalRecorded = clsRecordedDaily + clsRecordedExams;
    const clsRate = clsExpectedDaily > 0 ? (clsRecordedDaily / (clsExpectedDaily * termSchoolDaysCount)) * 100 : 0;

    return {
      cls,
      activeCount: clsActive.length,
      expectedDaily: clsExpectedDaily,
      recordedDaily: clsRecordedDaily,
      recordedExams: clsRecordedExams,
      totalRecorded: clsTotalRecorded,
      collectionRate: clsRate
    };
  });

  const isDeletionAction = (log: AuditLog) => {
    const act = (log.action || '').toLowerCase();
    const det = (log.details || '').toLowerCase();
    return (
      act.includes('delete') || 
      act.includes('purge') || 
      act.includes('remove') || 
      act.includes('reset') || 
      det.includes('deleted') || 
      det.includes('purged') || 
      det.includes('removed') ||
      det.includes('reset') ||
      act.includes('void')
    );
  };

  const isRestorableLog = (log: AuditLog) => {
    if (log.snapshotData) return true;
    if (isDeletionAction(log)) return true;
    return false;
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      (log.action || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.operatorName || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.details || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.studentName || '').toLowerCase().includes(search.toLowerCase());

    if (categoryFilter === 'deletions') {
      return matchesSearch && isDeletionAction(log);
    }

    if (categoryFilter === 'database') {
      const act = (log.action || '').toLowerCase();
      const det = (log.details || '').toLowerCase();
      return matchesSearch && (
        log.category === 'settings' || 
        act.includes('sync') || 
        act.includes('db') || 
        act.includes('database') || 
        det.includes('sync') || 
        det.includes('database') || 
        det.includes('seed') || 
        det.includes('restore') ||
        det.includes('rollback')
      );
    }

    const matchesCategory = categoryFilter === 'all' || log.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const displayedLogs = filteredLogs.slice(0, visibleLogsCount);
  const deletionLogsOnly = auditLogs.filter(isDeletionAction);

  // Stats Counters
  const totalCount = auditLogs.length;
  const deletionCount = deletionLogsOnly.length;
  const studentCount = auditLogs.filter(l => l.category === 'students').length;
  const paymentCount = auditLogs.filter(l => l.category === 'payments').length;
  const databaseCount = auditLogs.filter(l => {
    const act = (l.action || '').toLowerCase();
    const det = (l.details || '').toLowerCase();
    return l.category === 'settings' || act.includes('sync') || act.includes('db') || det.includes('database') || det.includes('restore');
  }).length;

  const getActionBadgeStyle = (log: AuditLog) => {
    if (isDeletionAction(log)) {
      return 'bg-rose-950 text-rose-300 border-rose-800';
    }
    switch (log.category) {
      case 'students':
        return 'bg-purple-950 text-purple-300 border-purple-800';
      case 'payments':
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
      case 'expenses':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      case 'settings':
        return 'bg-blue-950 text-blue-300 border-blue-800';
      case 'security':
        return 'bg-pink-950 text-pink-300 border-pink-800';
      default:
        return 'bg-neutral-900 text-neutral-300 border-neutral-700';
    }
  };

  const formatTimestamp = (isoString?: string) => {
    if (!isoString) return '---';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  const handleExportFinancialAuditCSV = () => {
    const lines = [
      `OFFICIAL SCHOOL FINANCIAL AUDIT & REVENUE SUMMARY`,
      `Generated At:,${new Date().toISOString()}`,
      `Active Term:,${activeTerm?.name || 'Term 1'}`,
      `Base Daily Fee (GHC):,${baseDailyFee.toFixed(2)}`,
      `Total Registered Pupils:,${totalStudentsCount}`,
      `Active Registered Pupils:,${activeStudentsCount}`,
      ``,
      `EXECUTIVE FINANCIAL KPIS`,
      `Metric,Amount (GHC),Details / Formula`,
      `Expected Daily Revenue (100% Attendance),${expectedDailyRevenue.toFixed(2)},Sum of active pupils daily rates`,
      `Expected Term Revenue (${termSchoolDaysCount} School Days),${expectedTermRevenue.toFixed(2)},Expected Daily * ${termSchoolDaysCount} Days`,
      `Real-Time Revenue Recorded Today (${currentDate}),${recordedTodayRevenue.toFixed(2)},Verified non-absent payments logged today`,
      `Total Real-Time Daily Fees Recorded (Term/Cumulative),${totalRecordedDailyFees.toFixed(2)},Cumulative fee payments in system`,
      `Total Real-Time Exam Fees Recorded,${totalRecordedExamFees.toFixed(2)},Cumulative exam fee payments in system`,
      `Grand Gross Revenue Recorded,${grandGrossRevenue.toFixed(2)},Daily Fees + Exam Fees Cumulative`,
      `Outstanding Term Fee Variance (Uncollected),${uncollectedTermVariance.toFixed(2)},Expected Term Revenue - Recorded Daily Fees`,
      `Today Collection Efficiency %,${todayCollectionRate.toFixed(1)}%,Today Recorded / Expected Daily`,
      `Term Collection Efficiency %,${termCollectionRate.toFixed(1)}%,Term Recorded / Expected Term`,
      ``,
      `CLASS-BY-CLASS FINANCIAL AUDIT BREAKDOWN`,
      `Class Name,Active Pupils,Expected Daily Fee (GHC),Recorded Daily Fees (GHC),Recorded Exam Fees (GHC),Total Recorded Revenue (GHC)`
    ];

    classFinancials.forEach(cf => {
      lines.push(`${cf.cls},${cf.activeCount},${cf.expectedDaily.toFixed(2)},${cf.recordedDaily.toFixed(2)},${cf.recordedExams.toFixed(2)},${cf.totalRecorded.toFixed(2)}`);
    });

    lines.push(``);
    lines.push(`DETAILED ACTIVITY & AUDIT LOGS`);
    lines.push(`ID,Timestamp,Action,Operator Name,Operator Role,Category,Details,Student Name,Amount (GHC)`);

    filteredLogs.forEach(l => {
      lines.push([
        l.id || '',
        l.timestamp || '',
        `"${(l.action || '').replace(/"/g, '""')}"`,
        `"${(l.operatorName || '').replace(/"/g, '""')}"`,
        `"${(l.operatorRole || '').replace(/"/g, '""')}"`,
        l.category || '',
        `"${(l.details || '').replace(/"/g, '""')}"`,
        `"${(l.studentName || '').replace(/"/g, '""')}"`,
        l.amount !== undefined ? l.amount.toFixed(2) : ''
      ].join(','));
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(lines.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `Official_School_Financial_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="audit-trail-tab">
      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-500 text-black px-4 py-3 border-2 border-emerald-400 font-mono text-xs font-black uppercase tracking-wider shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-neutral-900 gap-4">
        <div>
          <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-2 font-mono">
            <FileText className="text-amber-400 stroke-[2.5]" size={18} />
            <span>Audit Trail & Data Recovery Center</span>
          </h3>
          <p className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider mt-1">
            Real-time database mutation tracking, write/delete history, and one-click data recovery engine
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto font-mono">
          <button
            onClick={() => setShowCreateSnapshotModal(true)}
            className="py-2.5 px-3.5 bg-amber-400 hover:bg-amber-300 text-black border border-amber-400 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg font-bold"
            title="Create an instant point-in-time database recovery snapshot before performing major updates"
          >
            <PlusCircle size={13} />
            <span>Create Recovery Snapshot</span>
          </button>
          <button
            onClick={handleSanitizeIntegrityAction}
            className="py-2.5 px-3.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg"
            title="Scan and clean orphaned payment or attendance records pointing to non-existent pupil IDs"
          >
            <ShieldAlert size={12} className="text-emerald-400" />
            <span>Sanitize & Repair Integrity</span>
          </button>
          <button
            onClick={handleExportFinancialAuditCSV}
            className="py-2.5 px-3.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-200 border border-neutral-800 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg font-bold"
          >
            <Download size={12} />
            <span>Export Financial Audit (CSV)</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="py-2.5 px-4 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 border border-neutral-800 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={12} className={`${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Logs'}</span>
          </button>
        </div>
      </div>

      {/* VIEW MODE NAVIGATION TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b-2 border-neutral-850 pb-3 font-mono">
        <button
          onClick={() => setViewMode('audit')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer border-2 ${
            viewMode === 'audit'
              ? 'bg-amber-400 text-black border-amber-400 shadow-md'
              : 'bg-neutral-950 text-neutral-400 border-neutral-850 hover:border-neutral-700 hover:text-white'
          }`}
        >
          <History size={14} />
          <span>Operations Audit Trail ({totalCount})</span>
        </button>

        <button
          onClick={() => setViewMode('recovery')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer border-2 ${
            viewMode === 'recovery'
              ? 'bg-rose-600 text-white border-rose-500 shadow-md'
              : 'bg-rose-950/40 text-rose-300 border-rose-900 hover:bg-rose-900/60'
          }`}
        >
          <RotateCcw size={14} />
          <span>Data Recovery & Revert Center</span>
          {deletionCount > 0 && (
            <span className="bg-white text-rose-700 px-1.5 py-0.2 text-[10px] rounded-full font-extrabold">
              {deletionCount}
            </span>
          )}
        </button>
      </div>

      {/* OFFICIAL EXECUTIVE FINANCIAL SUMMARY & REVENUE AUDIT BANNER */}
      <div className="bg-neutral-950 border-4 border-amber-500/80 p-5 space-y-5 rounded-lg relative shadow-2xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center pb-3 border-b-2 border-neutral-850 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-amber-500 text-black text-[9px] font-mono font-black uppercase tracking-widest rounded-sm">
                OFFICIAL FINANCIAL AUDIT
              </span>
              <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
                {activeTerm?.name || 'Active Term'} • Base Rate: GHC {baseDailyFee.toFixed(2)}/day
              </span>
            </div>
            <h4 className="text-lg font-black uppercase text-white tracking-tight font-mono flex items-center gap-2">
              <Coins className="text-amber-400" size={20} />
              Revenue Expectation & Real-Time Recorded Collections Summary
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono">
            {/* Purge Duplicates Action Card Button */}
            {duplicatePaymentsCount > 0 ? (
              <button
                onClick={handlePurgeDuplicatesAction}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border-2 border-rose-400 cursor-pointer transition-all animate-pulse shadow-lg"
              >
                <Trash2 size={12} />
                <span>Purge {duplicatePaymentsCount} Duplicate Payments</span>
              </button>
            ) : (
              <span className="px-3 py-1.5 bg-emerald-950 border border-emerald-800 text-emerald-400 text-[10px] font-mono font-black uppercase tracking-wider flex items-center gap-1.5 rounded-sm">
                <CheckCircle2 size={12} />
                <span>0 Duplicate Payments Found</span>
              </span>
            )}

            <button
              onClick={() => setShowClassBreakdown(!showClassBreakdown)}
              className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-300 text-[10px] font-mono font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <PieChart size={12} className="text-amber-400" />
              <span>{showClassBreakdown ? 'Hide Class Breakdown' : 'Show Class Breakdown'}</span>
            </button>
          </div>
        </div>

        {/* 4 Core Financial KPI Quadrants */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 font-mono">
          {/* Quadrant 1: Pupil Population & Daily Revenue Expectation */}
          <div className="bg-neutral-900 border-2 border-neutral-800 p-4 space-y-2 relative">
            <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest block">
              1. ACTIVE PUPILS & EXPECTED DAILY REVENUE
            </span>
            <div className="space-y-1">
              <div className="flex justify-between items-baseline">
                <span className="text-2xl font-black text-white">GHC {expectedDailyRevenue.toFixed(2)}</span>
                <span className="text-[10px] font-bold text-neutral-400">/ day</span>
              </div>
              <p className="text-[10px] text-neutral-400 leading-tight">
                Amount expected if all <strong className="text-amber-300">{activeStudentsCount} active pupils</strong> (out of {totalStudentsCount} registered) pay their daily fee.
              </p>
            </div>
            <div className="pt-2 border-t border-neutral-800 text-[10px] text-neutral-400 flex justify-between">
              <span>Expected Full Term ({termSchoolDaysCount} days):</span>
              <strong className="text-white">GHC {expectedTermRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>
          </div>

          {/* Quadrant 2: Today's Real-Time Collection */}
          <div className="bg-neutral-900 border-2 border-emerald-900/80 p-4 space-y-2 relative">
            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block flex items-center justify-between">
              <span>2. REAL-TIME RECORDED TODAY</span>
              <span className="text-[9px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 border border-emerald-800 rounded">LIVE</span>
            </span>
            <div className="space-y-1">
              <div className="flex justify-between items-baseline">
                <span className="text-2xl font-black text-emerald-300">GHC {recordedTodayRevenue.toFixed(2)}</span>
                <span className="text-[10px] font-bold text-emerald-400">Today ({currentDate})</span>
              </div>
              <p className="text-[10px] text-neutral-400 leading-tight">
                Verified daily fee payments recorded today across {todayVerifiedPayments.length} pupil check-ins.
              </p>
            </div>
            <div className="pt-2 border-t border-neutral-800 text-[10px] text-neutral-400 flex justify-between">
              <span>Today Collection Rate:</span>
              <strong className="text-emerald-400">{todayCollectionRate.toFixed(1)}% Efficiency</strong>
            </div>
          </div>

          {/* Quadrant 3: Cumulative Real-Time Recorded Gross Revenue */}
          <div className="bg-neutral-900 border-2 border-purple-900/80 p-4 space-y-2 relative">
            <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest block">
              3. CUMULATIVE GROSS REVENUE RECORDED
            </span>
            <div className="space-y-1">
              <div className="flex justify-between items-baseline">
                <span className="text-2xl font-black text-purple-300">GHC {grandGrossRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="text-[10px] text-neutral-400 space-y-0.5">
                <div className="flex justify-between">
                  <span>Daily School Fees Recorded:</span>
                  <strong className="text-white">GHC {totalRecordedDailyFees.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Exam Fees Recorded:</span>
                  <strong className="text-white">GHC {totalRecordedExamFees.toFixed(2)}</strong>
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-neutral-800 text-[10px] text-neutral-400 flex justify-between">
              <span>Term Daily Collection Efficiency:</span>
              <strong className="text-purple-300">{termCollectionRate.toFixed(1)}%</strong>
            </div>
          </div>

          {/* Quadrant 4: Outstanding Term Fee Balance Variance */}
          <div className="bg-neutral-900 border-2 border-rose-900/80 p-4 space-y-2 relative">
            <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest block">
              4. UNCOLLECTED TERM VARIANCE
            </span>
            <div className="space-y-1">
              <div className="flex justify-between items-baseline">
                <span className="text-2xl font-black text-rose-300">GHC {uncollectedTermVariance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <p className="text-[10px] text-neutral-400 leading-tight">
                Remaining outstanding fee gap between Total Expected Term Revenue and Real-time Recorded Daily Fees.
              </p>
            </div>
            <div className="pt-2 border-t border-neutral-800 text-[10px] text-neutral-400 flex justify-between">
              <span>Ledger Status:</span>
              <span className={`font-bold ${uncollectedTermVariance === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {uncollectedTermVariance === 0 ? 'Fully Collected' : 'Collection In Progress'}
              </span>
            </div>
          </div>
        </div>

        {/* Class-by-Class Financial Summary Table (Expandable) */}
        {showClassBreakdown && (
          <div className="bg-neutral-900 border-2 border-neutral-800 p-4 space-y-3 font-mono animate-fade-in">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
              <span className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                <Building size={14} /> Class-by-Class Financial Revenue Audit Matrix
              </span>
              <span className="text-[10px] text-neutral-500 font-bold uppercase">12 Standard Class Divisions</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-950 text-neutral-400 border-b border-neutral-850 uppercase text-[9px] tracking-wider font-bold">
                    <th className="p-2.5">Class Division</th>
                    <th className="p-2.5 text-center">Active Pupils</th>
                    <th className="p-2.5 text-right">Expected Daily (GHC)</th>
                    <th className="p-2.5 text-right">Recorded Daily Fees (GHC)</th>
                    <th className="p-2.5 text-right">Recorded Exam Fees (GHC)</th>
                    <th className="p-2.5 text-right">Total Recorded (GHC)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850 text-neutral-300 text-[11px]">
                  {classFinancials.map(cf => (
                    <tr key={cf.cls} className="hover:bg-neutral-950/60 transition-colors">
                      <td className="p-2.5 font-bold text-white">{cf.cls}</td>
                      <td className="p-2.5 text-center font-bold text-purple-300">{cf.activeCount}</td>
                      <td className="p-2.5 text-right text-amber-300">GHC {cf.expectedDaily.toFixed(2)}</td>
                      <td className="p-2.5 text-right text-emerald-400 font-bold">GHC {cf.recordedDaily.toFixed(2)}</td>
                      <td className="p-2.5 text-right text-purple-400">GHC {cf.recordedExams.toFixed(2)}</td>
                      <td className="p-2.5 text-right font-black text-white">GHC {cf.totalRecorded.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODE 1: OPERATIONS AUDIT TRAIL */}
      {viewMode === 'audit' && (
        <div className="space-y-6">
          {/* Operations Metric Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-neutral-950 border-2 border-neutral-850 p-3.5 relative overflow-hidden">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block font-mono">Total System Logs</span>
                <span className="text-2xl font-mono font-black text-white block">{totalCount}</span>
              </div>
              <div className="absolute right-2 bottom-2 opacity-15">
                <FileText size={36} className="text-neutral-500" />
              </div>
            </div>

            <div 
              onClick={() => { setViewMode('recovery'); setRecoverySubTab('deletions'); }}
              className="bg-neutral-950 border-2 border-rose-900/60 hover:border-rose-500 p-3.5 relative overflow-hidden cursor-pointer transition-colors group"
            >
              <div className="space-y-1">
                <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-1 font-mono">
                  <Trash2 size={10} /> Deletions & Purges
                </span>
                <span className="text-2xl font-mono font-black text-rose-300 block">{deletionCount}</span>
              </div>
              <div className="absolute right-2 bottom-2 opacity-15 group-hover:opacity-30 transition-opacity">
                <AlertTriangle size={36} className="text-rose-500" />
              </div>
            </div>

            <div className="bg-neutral-950 border-2 border-purple-900/60 p-3.5 relative overflow-hidden">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest block font-mono">Pupil Registry</span>
                <span className="text-2xl font-mono font-black text-purple-300 block">{studentCount}</span>
              </div>
              <div className="absolute right-2 bottom-2 opacity-15">
                <User size={36} className="text-purple-500" />
              </div>
            </div>

            <div className="bg-neutral-950 border-2 border-emerald-900/60 p-3.5 relative overflow-hidden">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block font-mono">Payment Transactions</span>
                <span className="text-2xl font-mono font-black text-emerald-300 block">{paymentCount}</span>
              </div>
              <div className="absolute right-2 bottom-2 opacity-15">
                <CreditCard size={36} className="text-emerald-500" />
              </div>
            </div>

            <div className="bg-neutral-950 border-2 border-amber-900/60 p-3.5 relative overflow-hidden col-span-2 lg:col-span-1">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest block font-mono">Database & Sync</span>
                <span className="text-2xl font-mono font-black text-amber-300 block">{databaseCount}</span>
              </div>
              <div className="absolute right-2 bottom-2 opacity-15">
                <Database size={36} className="text-amber-500" />
              </div>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-neutral-900 border-2 border-neutral-800 p-4 space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" size={14} />
                <input
                  type="text"
                  placeholder="Filter by action, operator, student name, or details..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-neutral-950 border-2 border-neutral-850 hover:border-neutral-800 focus:border-amber-400 text-white font-mono text-xs pl-10 pr-4 py-3 focus:outline-none transition-all placeholder:text-neutral-600"
                />
              </div>
              {categoryFilter !== 'deletions' && (
                <button
                  onClick={() => setCategoryFilter('deletions')}
                  className="px-4 py-2.5 bg-rose-950 hover:bg-rose-900 border-2 border-rose-800 text-rose-300 font-mono text-[10px] font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Trash2 size={12} className="text-rose-400" />
                  <span>Show Deletions Only ({deletionCount})</span>
                </button>
              )}
            </div>

            {/* Categories Tab Selector */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(['all', 'deletions', 'students', 'payments', 'database', 'expenses', 'settings', 'security', 'other'] as const).map(cat => {
                const labelMap: Record<string, string> = {
                  all: 'ALL OPERATIONS',
                  deletions: 'DELETIONS & PURGES',
                  students: 'PUPIL REGISTRY',
                  payments: 'PAYMENTS',
                  database: 'DATABASE & SYNC',
                  expenses: 'EXPENSES',
                  settings: 'SETTINGS',
                  security: 'SECURITY',
                  other: 'OTHER'
                };
                const isSelected = categoryFilter === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1.5 font-mono text-[9px] font-black uppercase tracking-widest border-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? cat === 'deletions'
                          ? 'bg-rose-600 border-rose-500 text-white'
                          : 'bg-amber-400 border-amber-400 text-black'
                        : cat === 'deletions'
                          ? 'bg-rose-950/60 border-rose-900 text-rose-300 hover:bg-rose-900/80'
                          : 'bg-neutral-950 border-neutral-850 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {cat === 'deletions' && <AlertTriangle size={10} />}
                    <span>{labelMap[cat] || cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-neutral-950 border-2 border-neutral-850 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="bg-neutral-900 text-neutral-400 border-b-2 border-neutral-850 uppercase text-[9px] tracking-wider font-bold">
                    <th className="p-4 w-[170px]">Timestamp</th>
                    <th className="p-4 w-[160px]">Action</th>
                    <th className="p-4 w-[150px]">Operator</th>
                    <th className="p-4 w-[120px]">Category</th>
                    <th className="p-4">Details</th>
                    <th className="p-4 w-[140px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900 text-neutral-300">
                  {displayedLogs.length > 0 ? (
                    displayedLogs.map(log => {
                      const isDel = isDeletionAction(log);
                      const isRestorable = isRestorableLog(log);
                      return (
                        <tr 
                          key={log.id} 
                          className={`transition-colors ${
                            isDel 
                              ? 'bg-rose-950/10 hover:bg-rose-950/30 border-l-2 border-l-rose-500' 
                              : 'hover:bg-neutral-900/50'
                          }`}
                        >
                          <td className="p-4 text-neutral-400 select-none flex items-center gap-1.5">
                            <Clock size={11} className={isDel ? 'text-rose-400' : 'text-neutral-500'} />
                            <span className="text-[11px]">{formatTimestamp(log.timestamp)}</span>
                          </td>
                          <td className="p-4 font-extrabold text-white">
                            <span className={`px-2 py-0.5 border rounded-sm uppercase text-[10px] tracking-tight inline-flex items-center gap-1 ${getActionBadgeStyle(log)}`}>
                              {isDel && <AlertTriangle size={10} className="text-rose-400 shrink-0" />}
                              <span>{log.action.replace(/_/g, ' ')}</span>
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="space-y-0.5">
                              <span className="font-bold block text-white">{log.operatorName || 'System'}</span>
                              <span className="text-[9px] text-neutral-500 uppercase tracking-wider block font-black">
                                {log.operatorRole || 'Automation'}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border border-neutral-800 bg-neutral-900 text-neutral-300 rounded-sm">
                              {log.category}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1.5 leading-relaxed">
                              <p className={`text-xs ${isDel ? 'text-rose-200 font-semibold' : 'text-neutral-200'}`}>
                                {log.details}
                              </p>
                              {(log.studentName || log.amount !== undefined) && (
                                <div className="flex flex-wrap items-center gap-2">
                                  {log.studentName && (
                                    <span className="bg-neutral-900 border border-neutral-800 text-purple-300 text-[10px] px-1.5 py-0.5 rounded-sm">
                                      Pupil: {log.studentName}
                                    </span>
                                  )}
                                  {log.amount !== undefined && (
                                    <span className="bg-neutral-900 border border-neutral-800 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded-sm">
                                      GHC {log.amount.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isRestorable && (
                                <button 
                                  onClick={() => setItemToRestore(log)}
                                  className="px-2.5 py-1 text-[9px] font-black bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800 hover:border-rose-600 rounded-sm flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Revert or restore this record deletion"
                                >
                                  <RotateCcw size={10} />
                                  <span>Revert</span>
                                </button>
                              )}
                              <button 
                                onClick={() => setSelectedLog(log)}
                                className="px-2.5 py-1 text-[9px] font-black bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 rounded-sm cursor-pointer transition-colors"
                              >
                                Inspect
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-neutral-500 font-mono italic">
                        No activity audit records found matching the filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredLogs.length > visibleLogsCount && (
              <div className="p-4 bg-neutral-900 border-t-2 border-neutral-850 text-center">
                <button
                  onClick={() => setVisibleLogsCount(prev => prev + 50)}
                  className="px-4 py-2 text-[10px] font-black bg-neutral-950 hover:bg-neutral-850 text-amber-400 border border-neutral-800 hover:border-amber-400 uppercase tracking-widest cursor-pointer transition-colors"
                >
                  Show More Logs ({filteredLogs.length - visibleLogsCount} remaining)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 2: DATA RECOVERY & REVERT CENTER */}
      {viewMode === 'recovery' && (
        <div className="space-y-6 font-mono">
          {/* Recovery Center Header Banner */}
          <div className="bg-neutral-950 border-2 border-rose-600/80 p-5 space-y-4 rounded-lg shadow-xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-3 border-b border-neutral-850">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-rose-600 text-white text-[9px] font-black uppercase tracking-widest rounded-sm">
                    RECOVERY ENGINE
                  </span>
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                    Administrative Revert & Rollback Toolkit
                  </span>
                </div>
                <h4 className="text-base font-black uppercase text-white tracking-tight flex items-center gap-2">
                  <RotateCcw className="text-rose-400" size={18} />
                  Data Recovery Engine & Accidental Deletion Revert Panel
                </h4>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setRecoverySubTab('trash')}
                  className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                    recoverySubTab === 'trash'
                      ? 'bg-rose-600 border-rose-500 text-white'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <Trash2 size={12} />
                  <span>Soft Delete Trash ({trashItems.length})</span>
                </button>
                <button
                  onClick={() => setRecoverySubTab('deletions')}
                  className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border-2 transition-all cursor-pointer ${
                    recoverySubTab === 'deletions'
                      ? 'bg-rose-600 border-rose-500 text-white'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  Deletion Audit History ({deletionLogsOnly.length})
                </button>
                <button
                  onClick={() => setRecoverySubTab('snapshots')}
                  className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border-2 transition-all cursor-pointer ${
                    recoverySubTab === 'snapshots'
                      ? 'bg-amber-400 border-amber-400 text-black'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  System Restore Snapshots ({backups.length})
                </button>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              This panel enables Administrators to safely manage deleted records. The <strong>Soft Delete Trash Vault</strong> holds removed entries for 30 days before permanent deletion, giving you time to restore any accidentally removed payments or pupil records.
            </p>
          </div>

          {/* SUB-TAB 0: SOFT DELETE TRASH VAULT */}
          {recoverySubTab === 'trash' && (
            <div className="bg-neutral-950 border-2 border-neutral-850 overflow-hidden">
              <div className="p-4 bg-neutral-900 border-b border-neutral-850 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h5 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
                    <Trash2 size={14} className="text-rose-400" />
                    30-Day Soft Delete Trash Vault ({trashItems.length} items)
                  </h5>
                  <p className="text-[10px] text-neutral-400 mt-0.5">
                    Records in this vault can be fully restored to active registers or permanently removed.
                  </p>
                </div>
                {trashItems.length > 0 && (
                  <button
                    onClick={async () => {
                      if (window.confirm("ARE YOU SURE YOU WANT TO PERMANENTLY EMPTY THE TRASH?\n\nThis will permanently delete all soft-deleted records from the server storage. This action CANNOT be undone.")) {
                        const res = await emptyTrash?.();
                        if (res) showToast(res.message);
                      }
                    }}
                    className="px-3 py-1.5 bg-rose-950 hover:bg-rose-900 border border-rose-700/80 text-rose-300 hover:text-rose-100 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer self-start md:self-auto transition-colors"
                  >
                    <Trash2 size={12} />
                    <span>Empty Trash ({trashItems.length})</span>
                  </button>
                )}
              </div>

              {trashItems.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-12 h-12 bg-neutral-900 rounded-full flex items-center justify-center mx-auto text-neutral-600">
                    <Trash2 size={24} />
                  </div>
                  <h6 className="text-xs font-black uppercase text-neutral-400 tracking-wider">
                    Trash Bin is Empty
                  </h6>
                  <p className="text-[11px] text-neutral-500 max-w-md mx-auto leading-relaxed">
                    No soft-deleted records currently in trash. Any payments, pupils, or expenses deleted in the future will appear here for 30 days before permanent cleanup.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-neutral-950 text-neutral-400 border-b border-neutral-850 uppercase text-[9px] tracking-wider font-bold">
                        <th className="p-3.5 w-[130px]">Type</th>
                        <th className="p-3.5">Details & Description</th>
                        <th className="p-3.5 w-[140px]">Deleted By</th>
                        <th className="p-3.5 w-[140px]">Deleted Date</th>
                        <th className="p-3.5 w-[110px]">Vault Expires</th>
                        <th className="p-3.5 w-[180px] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-850">
                      {trashItems.map((item) => {
                        const expiresDate = new Date(item.expiresAt);
                        const daysLeft = Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                        const daysLabel = daysLeft > 0 ? `${daysLeft} days left` : 'Expires today';

                        return (
                          <tr key={item.id} className="hover:bg-neutral-900/60 transition-colors">
                            <td className="p-3.5 font-bold">
                              <span className={`px-2 py-0.5 text-[9px] uppercase tracking-wider font-black rounded-xs ${
                                item.itemType === 'payment'
                                  ? 'bg-emerald-950 border border-emerald-800 text-emerald-300'
                                  : item.itemType === 'bulk_payments'
                                  ? 'bg-amber-950 border border-amber-800 text-amber-300'
                                  : item.itemType === 'student'
                                  ? 'bg-purple-950 border border-purple-800 text-purple-300'
                                  : 'bg-blue-950 border border-blue-800 text-blue-300'
                              }`}>
                                {item.itemType === 'payment' && 'Payment'}
                                {item.itemType === 'bulk_payments' && 'Bulk Payments'}
                                {item.itemType === 'student' && 'Pupil Profile'}
                                {item.itemType === 'expense' && 'Expense'}
                              </span>
                            </td>
                            <td className="p-3.5 space-y-1">
                              <div className="font-bold text-white leading-tight">
                                {item.reason}
                              </div>
                              {item.studentName && (
                                <div className="text-[10px] text-neutral-400">
                                  Pupil: <strong className="text-neutral-200">{item.studentName}</strong> {item.class && `(${item.class})`}
                                </div>
                              )}
                              {item.amount !== undefined && item.amount > 0 && (
                                <div className="text-[10px] text-emerald-400 font-bold">
                                  Amount: GHC {item.amount.toFixed(2)}
                                </div>
                              )}
                              {item.itemCount !== undefined && item.itemCount > 0 && (
                                <div className="text-[10px] text-amber-400 font-bold">
                                  Records: {item.itemCount} items
                                </div>
                              )}
                            </td>
                            <td className="p-3.5 text-neutral-300 font-medium text-[11px]">
                              {item.deletedBy}
                            </td>
                            <td className="p-3.5 text-neutral-400 text-[11px]">
                              {new Date(item.deletedAt).toLocaleString()}
                            </td>
                            <td className="p-3.5 font-mono text-[10px]">
                              <span className={`px-1.5 py-0.5 font-bold rounded-xs ${
                                daysLeft <= 3
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : 'bg-neutral-900 text-neutral-300 border border-neutral-800'
                              }`}>
                                {daysLabel}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={async () => {
                                    if (window.confirm(`Restore this deleted item back to active database registers?\n\n"${item.reason}"`)) {
                                      const res = await restoreTrashItem?.(item.id);
                                      if (res) showToast(res.message);
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <RotateCcw size={11} />
                                  <span>Restore</span>
                                </button>
                                <button
                                  onClick={async () => {
                                    if (window.confirm(`PERMANENTLY DELETE THIS ITEM FROM TRASH?\n\nThis record will be permanently purged and cannot be recovered.`)) {
                                      const success = await permanentlyDeleteTrashItem?.(item.id);
                                      if (success) showToast("Permanently deleted item from trash vault.");
                                    }
                                  }}
                                  className="px-2 py-1 bg-neutral-900 hover:bg-rose-950 text-neutral-400 hover:text-rose-300 border border-neutral-800 hover:border-rose-800 text-[10px] font-bold uppercase cursor-pointer transition-colors"
                                  title="Permanently Delete"
                                >
                                  <X size={11} />
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
          )}

          {/* SUB-TAB 1: DELETED RECORDS RECOVERY */}
          {recoverySubTab === 'deletions' && (
            <div className="bg-neutral-950 border-2 border-neutral-850 overflow-hidden">
              <div className="p-4 bg-neutral-900 border-b border-neutral-850 flex items-center justify-between">
                <h5 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
                  <Trash2 size={14} className="text-rose-400" />
                  Recent Database Write / Delete & Purge History
                </h5>
                <span className="text-[10px] text-neutral-400 uppercase font-bold">
                  Showing {deletionLogsOnly.length} deletion logs
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-neutral-950 text-neutral-400 border-b border-neutral-850 uppercase text-[9px] tracking-wider font-bold">
                      <th className="p-3.5 w-[160px]">Date / Time</th>
                      <th className="p-3.5 w-[140px]">Deleted Item Type</th>
                      <th className="p-3.5 w-[140px]">Deleted By</th>
                      <th className="p-3.5">Record Context & Description</th>
                      <th className="p-3.5 w-[130px] text-right">Revert Deletion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900 text-neutral-300">
                    {deletionLogsOnly.length > 0 ? (
                      deletionLogsOnly.map(log => (
                        <tr key={log.id} className="hover:bg-neutral-900/50 transition-colors">
                          <td className="p-3.5 text-neutral-400 text-[11px]">
                            {formatTimestamp(log.timestamp)}
                          </td>
                          <td className="p-3.5 font-bold text-white">
                            <span className="px-2 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 text-[10px] uppercase font-black rounded-sm">
                              {log.category}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className="font-bold text-white block">{log.operatorName || 'System'}</span>
                            <span className="text-[9px] text-neutral-500 uppercase block">{log.operatorRole}</span>
                          </td>
                          <td className="p-3.5 text-neutral-200">
                            <p className="font-semibold text-rose-200">{log.details}</p>
                            {log.studentName && (
                              <span className="text-[10px] text-purple-300 block mt-0.5">
                                Affected Pupil: {log.studentName}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => setItemToRestore(log)}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-[10px] uppercase tracking-wider border border-rose-400 cursor-pointer shadow-md transition-all flex items-center gap-1.5 ml-auto"
                            >
                              <RotateCcw size={11} />
                              <span>Revert Item</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-neutral-500 italic">
                          No recent record deletions found in the system audit log.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: POINT-IN-TIME SYSTEM SNAPSHOTS */}
          {recoverySubTab === 'snapshots' && (
            <div className="bg-neutral-950 border-2 border-neutral-850 overflow-hidden">
              <div className="p-4 bg-neutral-900 border-b border-neutral-850 flex items-center justify-between">
                <h5 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
                  <Database size={14} className="text-amber-400" />
                  Point-in-Time System Restore Snapshots ({backups.length})
                </h5>
                <button
                  onClick={() => setShowCreateSnapshotModal(true)}
                  className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-black text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle size={11} />
                  <span>New Snapshot</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-neutral-950 text-neutral-400 border-b border-neutral-850 uppercase text-[9px] tracking-wider font-bold">
                      <th className="p-3.5">Snapshot Label</th>
                      <th className="p-3.5 w-[160px]">Created At</th>
                      <th className="p-3.5 w-[110px]">Type</th>
                      <th className="p-3.5">Record Counts</th>
                      <th className="p-3.5 w-[150px] text-right">Rollback Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900 text-neutral-300">
                    {backups.length > 0 ? (
                      backups.map(bk => (
                        <tr key={bk.id} className="hover:bg-neutral-900/50 transition-colors">
                          <td className="p-3.5 font-black text-white">
                            <div className="flex items-center gap-2">
                              <Save size={14} className="text-amber-400 shrink-0" />
                              <span>{bk.label}</span>
                            </div>
                          </td>
                          <td className="p-3.5 text-neutral-400 text-[11px]">
                            {bk.timestamp}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase border rounded-sm ${
                              bk.isAuto ? 'bg-blue-950 text-blue-300 border-blue-800' : 'bg-amber-950 text-amber-300 border-amber-800'
                            }`}>
                              {bk.isAuto ? 'Auto Pre-Purge' : 'Manual Admin'}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="flex flex-wrap items-center gap-2 text-[10px]">
                              <span className="bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 text-purple-300 rounded">
                                Pupils: {bk.counts.students}
                              </span>
                              <span className="bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 text-emerald-300 rounded">
                                Payments: {bk.counts.payments}
                              </span>
                              <span className="bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 text-blue-300 rounded">
                                Users: {bk.counts.users}
                              </span>
                              <span className="bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 text-amber-300 rounded">
                                Terms: {bk.counts.terms}
                              </span>
                            </div>
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => setSnapshotToRestore(bk)}
                              className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-black font-black text-[10px] uppercase tracking-wider border border-amber-400 cursor-pointer shadow-md transition-all flex items-center gap-1.5 ml-auto"
                            >
                              <Undo2 size={11} />
                              <span>Rollback System</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-neutral-500 italic">
                          No point-in-time system restore snapshots saved yet. Click "Create Recovery Snapshot" to create your first restore point.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: SELECTED LOG INSPECTOR MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-mono">
          <div className="bg-neutral-950 border-2 border-neutral-800 max-w-xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-900">
              <div className="flex items-center gap-2">
                <FileText className="text-amber-400" size={18} />
                <h4 className="text-sm font-black text-white uppercase tracking-wider">
                  Log Entry Metadata Inspection
                </h4>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 hover:bg-neutral-900 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-neutral-900 p-3 border border-neutral-850">
                <div>
                  <span className="text-[9px] font-black text-neutral-500 uppercase block">Log Reference ID</span>
                  <span className="text-neutral-200 select-all font-mono">{selectedLog.id}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-neutral-500 uppercase block">Timestamp</span>
                  <span className="text-amber-300">{formatTimestamp(selectedLog.timestamp)}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-neutral-500 uppercase block">Operator Name</span>
                  <span className="text-white font-bold">{selectedLog.operatorName || 'System'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black text-neutral-500 uppercase block">Operator Role</span>
                  <span className="text-neutral-400">{selectedLog.operatorRole || 'System'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-black text-neutral-500 uppercase block">Action Summary</span>
                <p className="p-3 bg-neutral-900 border border-neutral-800 text-white font-bold uppercase tracking-tight">
                  {selectedLog.action.replace(/_/g, ' ')}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-black text-neutral-500 uppercase block">Details & Context</span>
                <p className="p-3 bg-neutral-900 border border-neutral-800 text-neutral-200 leading-relaxed">
                  {selectedLog.details}
                </p>
              </div>

              {(selectedLog.studentName || selectedLog.amount !== undefined || selectedLog.studentId) && (
                <div className="grid grid-cols-2 gap-3 bg-neutral-900 p-3 border border-neutral-850">
                  {selectedLog.studentName && (
                    <div>
                      <span className="text-[9px] font-black text-neutral-500 uppercase block">Pupil Name</span>
                      <span className="text-purple-300 font-bold">{selectedLog.studentName}</span>
                    </div>
                  )}
                  {selectedLog.studentId && (
                    <div>
                      <span className="text-[9px] font-black text-neutral-500 uppercase block">Pupil ID</span>
                      <span className="text-neutral-400">{selectedLog.studentId}</span>
                    </div>
                  )}
                  {selectedLog.amount !== undefined && (
                    <div>
                      <span className="text-[9px] font-black text-neutral-500 uppercase block">Transaction Amount</span>
                      <span className="text-emerald-400 font-bold">GHC {selectedLog.amount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <span className="text-[9px] font-black text-neutral-500 uppercase block">Raw JSON Data</span>
                <pre className="p-3 bg-black border border-neutral-900 text-emerald-400 text-[10px] overflow-x-auto max-h-[140px]">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center">
              {isRestorableLog(selectedLog) ? (
                <button
                  onClick={() => {
                    const logToRes = selectedLog;
                    setSelectedLog(null);
                    setItemToRestore(logToRes);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw size={13} />
                  <span>Revert / Restore Deleted Record</span>
                </button>
              ) : <div />}

              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold uppercase tracking-wider cursor-pointer border border-neutral-800"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRM ITEM RECOVERY / REVERT DIALOG */}
      {itemToRestore && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-mono">
          <div className="bg-neutral-950 border-2 border-rose-500 max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 pb-3 border-b border-neutral-900">
              <div className="p-2 bg-rose-950 text-rose-400 border border-rose-800 rounded">
                <RotateCcw size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-wider">
                  Confirm Accidental Deletion Revert
                </h4>
                <p className="text-[10px] text-neutral-400 uppercase">
                  Data Recovery Engine Confirmation
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-neutral-300">
              <p className="leading-relaxed">
                You are about to reinstate this deleted record back into the active database:
              </p>

              <div className="bg-neutral-900 p-4 border border-neutral-800 space-y-2">
                <div className="flex justify-between border-b border-neutral-800 pb-1.5">
                  <span className="text-[10px] font-black text-neutral-500 uppercase">Action Log</span>
                  <span className="font-bold text-rose-300">{itemToRestore.action}</span>
                </div>
                <div className="flex justify-between border-b border-neutral-800 pb-1.5">
                  <span className="text-[10px] font-black text-neutral-500 uppercase">Timestamp</span>
                  <span className="text-neutral-300">{formatTimestamp(itemToRestore.timestamp)}</span>
                </div>
                <div className="flex justify-between border-b border-neutral-800 pb-1.5">
                  <span className="text-[10px] font-black text-neutral-500 uppercase">Deleted Details</span>
                  <span className="text-white text-right max-w-[250px] font-semibold">{itemToRestore.details}</span>
                </div>
                {itemToRestore.studentName && (
                  <div className="flex justify-between">
                    <span className="text-[10px] font-black text-neutral-500 uppercase">Pupil Name</span>
                    <span className="text-purple-300 font-bold">{itemToRestore.studentName}</span>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-amber-300 bg-amber-950/40 border border-amber-800 p-2.5 rounded">
                ⚡ Restoring this item will write the record back to local state and Firestore database.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setItemToRestore(null)}
                disabled={isRestoring}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-bold uppercase tracking-wider border border-neutral-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmItemRestore}
                disabled={isRestoring}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider border border-rose-400 cursor-pointer shadow-lg flex items-center gap-1.5 disabled:opacity-50"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Restoring Record...</span>
                  </>
                ) : (
                  <>
                    <Check size={13} />
                    <span>Confirm Restore & Revert Deletion</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIRM FULL SYSTEM SNAPSHOT ROLLBACK DIALOG */}
      {snapshotToRestore && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-mono">
          <div className="bg-neutral-950 border-2 border-amber-500 max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 pb-3 border-b border-neutral-900">
              <div className="p-2 bg-amber-950 text-amber-400 border border-amber-800 rounded">
                <Undo2 size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-wider">
                  Confirm System Database Rollback
                </h4>
                <p className="text-[10px] text-amber-400 uppercase">
                  Point-in-Time System Restore Point
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-neutral-300">
              <p className="leading-relaxed">
                You are about to roll back the entire database state to the selected recovery snapshot:
              </p>

              <div className="bg-neutral-900 p-4 border border-neutral-800 space-y-2">
                <div className="flex justify-between border-b border-neutral-800 pb-1.5">
                  <span className="text-[10px] font-black text-neutral-500 uppercase">Snapshot Name</span>
                  <span className="font-bold text-amber-300">{snapshotToRestore.label}</span>
                </div>
                <div className="flex justify-between border-b border-neutral-800 pb-1.5">
                  <span className="text-[10px] font-black text-neutral-500 uppercase">Created Timestamp</span>
                  <span className="text-neutral-300">{snapshotToRestore.timestamp}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] font-black text-neutral-500 uppercase">Restored Counts</span>
                  <span className="text-white text-right font-bold">
                    {snapshotToRestore.counts.students} pupils • {snapshotToRestore.counts.payments} payments
                  </span>
                </div>
              </div>

              <div className="p-3 bg-rose-950/50 border border-rose-800 text-rose-200 text-[11px] space-y-1">
                <div className="flex items-center gap-1 font-black text-rose-400">
                  <AlertTriangle size={13} />
                  <span>WARNING: SYSTEM STATE ROLLBACK</span>
                </div>
                <p className="leading-snug">
                  Rolling back to this snapshot will replace current register tables with the exact data captured at that moment.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSnapshotToRestore(null)}
                disabled={isRestoring}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-bold uppercase tracking-wider border border-neutral-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSnapshotRollback}
                disabled={isRestoring}
                className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-black text-xs font-black uppercase tracking-wider border border-amber-400 cursor-pointer shadow-lg flex items-center gap-1.5 disabled:opacity-50"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Rolling Back State...</span>
                  </>
                ) : (
                  <>
                    <Undo2 size={13} />
                    <span>Confirm Full System Rollback</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CREATE RECOVERY SNAPSHOT MODAL */}
      {showCreateSnapshotModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-mono">
          <div className="bg-neutral-950 border-2 border-amber-400 max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-900">
              <div className="flex items-center gap-2">
                <Sparkles className="text-amber-400" size={18} />
                <h4 className="text-sm font-black text-white uppercase tracking-wider">
                  Create Recovery Point Snapshot
                </h4>
              </div>
              <button
                onClick={() => setShowCreateSnapshotModal(false)}
                className="p-1 hover:bg-neutral-900 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-neutral-300 leading-relaxed">
                Take an instant point-in-time snapshot of pupils, transactions, terms, and settings before performing major administrative database edits.
              </p>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-neutral-400 block">
                  Snapshot Label / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pre-Term Transition Clean-up"
                  value={customSnapshotLabel}
                  onChange={e => setCustomSnapshotLabel(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-400 text-white px-3 py-2.5 text-xs focus:outline-none"
                />
              </div>

              <div className="bg-neutral-900 p-3 border border-neutral-850 text-[11px] text-neutral-400 space-y-1">
                <div className="flex justify-between">
                  <span>Registered Pupils Captured:</span>
                  <strong className="text-purple-300">{students.length}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Fee Payments Captured:</span>
                  <strong className="text-emerald-300">{payments.length}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Exams Records Captured:</span>
                  <strong className="text-amber-300">{examsPayments.length}</strong>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCreateSnapshotModal(false)}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-bold uppercase tracking-wider border border-neutral-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSnapshotAction}
                className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-black text-xs font-black uppercase tracking-wider border border-amber-400 cursor-pointer shadow-lg flex items-center gap-1.5"
              >
                <Save size={13} />
                <span>Save Recovery Snapshot</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
