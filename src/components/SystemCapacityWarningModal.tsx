import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { StudentClass } from '../types';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Database, 
  Users, 
  TrendingUp, 
  RefreshCw, 
  CheckCircle2, 
  X, 
  ChevronRight, 
  HardDrive, 
  WifiOff, 
  Archive, 
  Download,
  BarChart2,
  Info
} from 'lucide-react';

export const ALL_CLASSES: StudentClass[] = [
  'Nursery',
  'KG1',
  'KG2',
  'B1',
  'B2',
  'B3',
  'B4',
  'B5',
  'B6',
  'B7',
  'B8',
  'B9'
];

interface LimitStatus {
  key: string;
  title: string;
  current: number;
  max: number;
  percentage: number;
  unit: string;
  level: 'safe' | 'warning' | 'critical';
  recommendation: string;
}

export function useSystemLimits() {
  const { students, payments, expenses, auditLogs, pendingLocalEdits, storageMode, terms } = useApp();

  // 1. Class capacity analysis (Nursery/KG1/KG2: 75 pupils, B1-B9: 50 pupils)
  const classLimits = ALL_CLASSES.map(c => {
    const activeCount = students ? students.filter(s => s.active && s.class === c).length : 0;
    const isPreSchool = ['Nursery', 'KG1', 'KG2'].includes(c);
    const maxCapacity = isPreSchool ? 75 : 50;
    const pct = Math.round((activeCount / maxCapacity) * 100);
    let level: 'safe' | 'warning' | 'critical' = 'safe';
    if (pct >= 90) level = 'critical';
    else if (pct >= 80) level = 'warning';

    return {
      className: c,
      count: activeCount,
      max: maxCapacity,
      pct,
      level
    };
  });

  const overloadedClasses = classLimits.filter(c => c.level !== 'safe');

  // 2. Database Record Count Limit (Recommended threshold: 5,000 total records before archiving or cloud sync)
  const studentCount = students ? students.length : 0;
  const paymentCount = payments ? payments.length : 0;
  const expenseCount = expenses ? expenses.length : 0;
  const auditCount = auditLogs ? auditLogs.length : 0;
  const totalDbRecords = studentCount + paymentCount + expenseCount + auditCount;

  const maxRecordLimit = 5000;
  const dbPct = Math.round((totalDbRecords / maxRecordLimit) * 100);
  let dbLevel: 'safe' | 'warning' | 'critical' = 'safe';
  if (dbPct >= 90) dbLevel = 'critical';
  else if (dbPct >= 75) dbLevel = 'warning';

  // Estimate approx byte size in KB
  const estimatedKb = Math.round((totalDbRecords * 0.45)); // ~0.45KB per record
  const estimatedMb = (estimatedKb / 1024).toFixed(2);

  // 3. Offline Unsynced Local Queue Limit (Max recommended offline edits before syncing: 20)
  const pendingCount = pendingLocalEdits ? pendingLocalEdits.length : 0;
  const maxPendingLimit = 20;
  const pendingPct = Math.round((pendingCount / maxPendingLimit) * 100);
  let pendingLevel: 'safe' | 'warning' | 'critical' = 'safe';
  if (pendingPct >= 100) pendingLevel = 'critical';
  else if (pendingPct >= 50) pendingLevel = 'warning';

  // 4. Financial Spending vs Income Safety Ratio Limit (Expenses > 80% of Income)
  const totalRevenue = payments ? payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0) : 0;
  const totalExpenses = expenses ? expenses.reduce((sum, e) => sum + (e.amount || 0), 0) : 0;
  const expRatio = totalRevenue > 0 ? Math.round((totalExpenses / totalRevenue) * 100) : 0;
  let expLevel: 'safe' | 'warning' | 'critical' = 'safe';
  if (expRatio >= 85) expLevel = 'critical';
  else if (expRatio >= 70) expLevel = 'warning';

  // Overall highest warning level
  const levels = [dbLevel, pendingLevel, expLevel, ...classLimits.map(c => c.level)];
  const hasCritical = levels.includes('critical');
  const hasWarning = levels.includes('warning');
  const overallLevel: 'safe' | 'warning' | 'critical' = hasCritical ? 'critical' : hasWarning ? 'warning' : 'safe';

  const overallMaxPercentage = Math.max(dbPct, pendingPct, expRatio, ...classLimits.map(c => c.pct));

  return {
    classLimits,
    overloadedClasses,
    totalDbRecords,
    maxRecordLimit,
    dbPct,
    dbLevel,
    estimatedMb,
    pendingCount,
    maxPendingLimit,
    pendingPct,
    pendingLevel,
    totalRevenue,
    totalExpenses,
    expRatio,
    expLevel,
    overallLevel,
    overallMaxPercentage,
    storageMode
  };
}

/**
 * Top Warning Banner to visually alert user when any limit is approaching or breached.
 */
export function SystemCapacityBanner({ onOpenDetails }: { onOpenDetails: () => void }) {
  const limits = useSystemLimits();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || limits.overallLevel === 'safe') return null;

  const isCritical = limits.overallLevel === 'critical';

  return (
    <div className={`w-full text-xs sm:text-sm font-medium px-4 py-2.5 transition-all shadow-md flex flex-wrap items-center justify-between gap-3 ${
      isCritical 
        ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white animate-pulse' 
        : 'bg-gradient-to-r from-amber-500 via-yellow-600 to-amber-600 text-slate-900 font-semibold'
    }`}>
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <ShieldAlert className={`w-5 h-5 flex-shrink-0 ${isCritical ? 'text-amber-300' : 'text-slate-950'}`} />
        <div className="truncate">
          <span className="font-extrabold uppercase tracking-wider mr-1">
            {isCritical ? 'CRITICAL SYSTEM CAPACITY ALERT:' : 'CAPACITY LIMIT WARNING:'}
          </span>
          {limits.overloadedClasses.length > 0 && (
            <span>Class enrollment limit approaching ({limits.overloadedClasses.map(c => `${c.className}: ${c.count}/${c.max}`).join(', ')}). </span>
          )}
          {limits.dbPct >= 75 && (
            <span>Database record count is at {limits.dbPct}% of local storage threshold ({limits.totalDbRecords}/{limits.maxRecordLimit} records). </span>
          )}
          {limits.pendingPct >= 50 && (
            <span>Offline unsynced queue has {limits.pendingCount} pending edits. </span>
          )}
          {limits.expRatio >= 70 && (
            <span>Term expenditure ratio is high ({limits.expRatio}% of revenue). </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onOpenDetails}
          className={`px-3 py-1 rounded-md text-xs font-bold transition-all shadow-sm flex items-center gap-1 ${
            isCritical
              ? 'bg-white text-red-700 hover:bg-slate-100'
              : 'bg-slate-900 text-amber-300 hover:bg-slate-800'
          }`}
        >
          View Limits & Actions
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-md hover:bg-black/10 transition-colors opacity-80 hover:opacity-100"
          title="Dismiss warning bar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Detailed System Capacity & Limits Modal Dialog
 */
export function SystemCapacityWarningModal({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const limits = useSystemLimits();
  const { seedFirebaseFromLocal, storageMode, setStorageMode } = useApp();
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  if (!isOpen) return null;

  const handleEnableCloudSync = async () => {
    setSyncingCloud(true);
    setSyncMsg('Migrating local database to Cloud Firestore...');
    try {
      const res = await seedFirebaseFromLocal();
      if (res.success) {
        setStorageMode('cloud');
        setSyncMsg('Successfully synced to Cloud! Limits expanded indefinitely.');
      } else {
        setSyncMsg(`Sync error: ${res.message}`);
      }
    } catch (e: any) {
      setSyncMsg(`Error: ${e?.message || 'Cloud sync failed'}`);
    } finally {
      setSyncingCloud(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 text-slate-100 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${
              limits.overallLevel === 'critical'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : limits.overallLevel === 'warning'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                System Capacity & Capacity Limits
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wider ${
                  limits.overallLevel === 'critical'
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                    : limits.overallLevel === 'warning'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {limits.overallLevel === 'critical' ? 'CRITICAL WARNING' : limits.overallLevel === 'warning' ? 'CAPACITY WARNING' : 'SYSTEM HEALTHY'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Real-time monitoring of class enrollments, database size, offline queues, and financial thresholds.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* Main Status Alert Box if Warning */}
          {limits.overallLevel !== 'safe' && (
            <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
              limits.overallLevel === 'critical'
                ? 'bg-red-950/40 border-red-800/60 text-red-200'
                : 'bg-amber-950/40 border-amber-800/60 text-amber-200'
            }`}>
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
              <div className="text-xs sm:text-sm space-y-1">
                <p className="font-bold uppercase tracking-wider text-white">Proactive System Safety Warning</p>
                <p className="leading-relaxed opacity-90">
                  Some operational parameters are approaching recommended capacity thresholds. To prevent slowness or data truncation, review the capacity indicators below and follow the recommended optimization actions.
                </p>
              </div>
            </div>
          )}

          {/* Grid of 4 Key Limit Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. Database Storage & Record Limit */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-sky-400" />
                  <h3 className="text-sm font-semibold text-slate-200">Database Record Limit</h3>
                </div>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  limits.dbLevel === 'critical' ? 'bg-red-500/20 text-red-400' : limits.dbLevel === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {limits.dbPct}% Used
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      limits.dbLevel === 'critical' ? 'bg-red-500' : limits.dbLevel === 'warning' ? 'bg-amber-500' : 'bg-sky-500'
                    }`}
                    style={{ width: `${Math.min(100, limits.dbPct)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>{limits.totalDbRecords.toLocaleString()} / {limits.maxRecordLimit.toLocaleString()} records</span>
                  <span>~{limits.estimatedMb} MB</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {limits.dbLevel === 'critical'
                  ? '⚠️ Database is near maximum local capacity. Enable Cloud Database Sync or archive past term records.'
                  : limits.dbLevel === 'warning'
                  ? '⚡ Record volume is high. Consider syncing to Cloud Firestore for unlimited expansion.'
                  : '✓ Database size is optimal for local browser storage.'}
              </p>
            </div>

            {/* 2. Offline Sync Queue Limit */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <WifiOff className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-semibold text-slate-200">Offline Sync Queue</h3>
                </div>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  limits.pendingLevel === 'critical' ? 'bg-red-500/20 text-red-400' : limits.pendingLevel === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {limits.pendingCount} Pending
                </span>
              </div>

              <div className="space-y-1">
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      limits.pendingLevel === 'critical' ? 'bg-red-500' : limits.pendingLevel === 'warning' ? 'bg-amber-500' : 'bg-purple-500'
                    }`}
                    style={{ width: `${Math.min(100, limits.pendingPct)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>{limits.pendingCount} unsynced local edits</span>
                  <span>Limit: {limits.maxPendingLimit} edits</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {limits.pendingCount > 0
                  ? 'Local edits are saved locally. Connect online to flush unsynced records to server.'
                  : '✓ All local edits are fully synchronized.'}
              </p>
            </div>

            {/* 3. Financial Spending Safety Ratio Limit */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-slate-200">Expenditure / Revenue Ratio</h3>
                </div>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  limits.expLevel === 'critical' ? 'bg-red-500/20 text-red-400' : limits.expLevel === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {limits.expRatio}% Ratio
                </span>
              </div>

              <div className="space-y-1">
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      limits.expLevel === 'critical' ? 'bg-red-500' : limits.expLevel === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, limits.expRatio)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>Spent: GHC {limits.totalExpenses.toLocaleString()}</span>
                  <span>Rev: GHC {limits.totalRevenue.toLocaleString()}</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {limits.expRatio >= 85
                  ? '⚠️ Expenditures exceed 85% of total collected revenue. Exercise cash flow controls.'
                  : limits.expRatio >= 70
                  ? '⚡ Spending ratio is high relative to current fee collections.'
                  : '✓ Financial spending is within healthy operational budget margin.'}
              </p>
            </div>

            {/* 4. Overloaded Classes Count */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-slate-200">Class Capacities</h3>
                </div>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  limits.overloadedClasses.length > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {limits.overloadedClasses.length} Approaching Cap
                </span>
              </div>

              <p className="text-xs text-slate-400">
                Class section limits are <strong>75 for Nursery & KG</strong> and <strong>50 for Basic 1 to Basic 9</strong> to ensure optimal teacher ratio and system performance.
              </p>

              {limits.overloadedClasses.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {limits.overloadedClasses.map(c => (
                    <span key={c.className} className="text-[11px] bg-amber-950/60 border border-amber-800/80 text-amber-300 px-2 py-0.5 rounded font-mono">
                      {c.className}: {c.count}/{c.max} ({c.pct}%)
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-emerald-400 font-medium">✓ All class streams are within recommended pupil capacities.</p>
              )}
            </div>

          </div>

          {/* Class Breakdown List Table */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center justify-between">
              <span>Pupil Capacity Breakdown by Class</span>
              <span className="text-xs font-normal text-slate-400">Nur & KG: 75 | B1-B9: 50</span>
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
              {limits.classLimits.map(c => (
                <div key={c.className} className={`p-2.5 rounded-lg border text-xs space-y-1.5 ${
                  c.level === 'critical'
                    ? 'bg-red-950/30 border-red-800/60 text-red-200'
                    : c.level === 'warning'
                    ? 'bg-amber-950/30 border-amber-800/60 text-amber-200'
                    : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}>
                  <div className="flex justify-between items-center font-bold">
                    <span>{c.className}</span>
                    <span className="font-mono text-[11px]">{c.count} / {c.max}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${
                        c.level === 'critical' ? 'bg-red-500' : c.level === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, c.pct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Preventive Actions */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400" />
              Proactive Optimization Recommendations
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="font-bold text-sky-300 flex items-center gap-1.5">
                  <CloudIcon className="w-4 h-4" />
                  1. Enable Cloud Firestore Database
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Seamlessly bypass browser local storage limits by syncing data directly to cloud database storage.
                </p>
                {storageMode === 'local' ? (
                  <button
                    onClick={handleEnableCloudSync}
                    disabled={syncingCloud}
                    className="mt-2 w-full py-1.5 px-3 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold transition-colors text-[11px] disabled:opacity-50"
                  >
                    {syncingCloud ? 'Migrating to Cloud...' : 'Migrate Database to Cloud'}
                  </button>
                ) : (
                  <span className="inline-block mt-1 text-[11px] text-emerald-400 font-bold">✓ Cloud Firestore Active</span>
                )}
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Archive className="w-4 h-4" />
                  2. Archive & Export Old Terms
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Export JSON/CSV backups of historical academic terms to keep current database light and lightning fast.
                </p>
              </div>
            </div>
            {syncMsg && (
              <p className="text-xs text-sky-400 font-mono mt-2">{syncMsg}</p>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold transition-colors"
          >
            Close Limit Monitor
          </button>
        </div>
      </div>
    </div>
  );
}

function CloudIcon(props: any) {
  return (
    <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 001-9.9M7 15a3 3 0 01-1-5.9 5 5 0 019.2-2.3 4.5 4.5 0 013.8 4.2" />
    </svg>
  );
}
