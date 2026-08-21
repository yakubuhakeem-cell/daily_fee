import React, { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, Download, Clock, Database, CheckCircle2, X, FileJson, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const BackupNoticeModal: React.FC = () => {
  const {
    students,
    payments,
    users,
    terms,
    expenses,
    salaries,
    whatsappLogs,
    budgetTargets,
    journalEntries,
    teacherEvaluations,
    examsPayments,
    examsExpenses,
    examsSettings,
    systemSettings,
    activeTerm,
    currentDate,
    storageMode,
    currentUser,
    backups,
    showToast
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [lastDownloadedAt, setLastDownloadedAt] = useState<string | null>(() => {
    return localStorage.getItem('s_last_backup_download_timestamp');
  });

  useEffect(() => {
    // Check local storage for initial notice baseline time
    let lastNoticeTime = parseInt(localStorage.getItem('s_last_backup_notice_time') || '0', 10);
    
    // If no timestamp was recorded yet, set baseline to now so user gets first prompt in 30 days
    if (!lastNoticeTime) {
      lastNoticeTime = Date.now();
      localStorage.setItem('s_last_backup_notice_time', String(lastNoticeTime));
    }

    const checkTimer = () => {
      const now = Date.now();
      const storedTime = parseInt(localStorage.getItem('s_last_backup_notice_time') || '0', 10);
      if (storedTime > 0 && now - storedTime >= THIRTY_DAYS_MS) {
        setIsOpen(true);
      }
    };

    // Check every 15 seconds
    const interval = setInterval(checkTimer, 15000);

    // Global event listener to open backup notice on demand
    const handleManualTrigger = () => {
      setIsOpen(true);
    };
    window.addEventListener('open-backup-notice-modal', handleManualTrigger);

    return () => {
      clearInterval(interval);
      window.removeEventListener('open-backup-notice-modal', handleManualTrigger);
    };
  }, []);

  const executeDownloadBackup = () => {
    try {
      const now = new Date();
      const timeStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
      const backupFilename = `feetrack-firebase-backup-${timeStr}.json`;

      const backupPayload = {
        app: "FEETRACK",
        description: "School Administration Financial Ledger Database Backup",
        backupType: "Proactive Monthly Local Snapshot",
        exportedAt: now.toISOString(),
        exportedBy: currentUser?.name || currentUser?.email || "System Operator",
        ledgerMode: storageMode,
        activeTerm: activeTerm,
        currentDate: currentDate,
        systemSettings: systemSettings,
        data: {
          students,
          payments,
          users,
          terms,
          expenses,
          salaries,
          whatsappLogs,
          budgetTargets,
          journalEntries,
          teacherEvaluations,
          examsPayments,
          examsExpenses,
          examsSettings,
          backups
        }
      };

      const jsonString = JSON.stringify(backupPayload, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = backupFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const timestampFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' on ' + now.toLocaleDateString();
      localStorage.setItem('s_last_backup_download_timestamp', timestampFormatted);
      localStorage.setItem('s_last_backup_notice_time', String(Date.now()));
      setLastDownloadedAt(timestampFormatted);

      showToast('Database backup downloaded successfully!');
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to generate database backup download:', error);
      showToast('Error generating database backup file.');
    }
  };

  const handleSnooze = () => {
    localStorage.setItem('s_last_backup_notice_time', String(Date.now()));
    showToast('Backup notice snoozed. Next reminder in 30 days.');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const totalRecords = students.length + payments.length + (expenses?.length || 0) + (salaries?.length || 0);

  return (
    <div className="fixed inset-0 z-[999] bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-neutral-900 border border-amber-500/30 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl shadow-amber-950/20 text-neutral-100 flex flex-col">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-amber-950/60 via-amber-900/40 to-neutral-900 p-5 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <ShieldAlert size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-black uppercase tracking-widest bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                  Monthly Protection Notice
                </span>
              </div>
              <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                Proactive Monthly Database Backup
              </h3>
            </div>
          </div>
          <button
            onClick={handleSnooze}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            title="Snooze for 30 days"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          <div className="text-sm text-neutral-300 leading-relaxed bg-neutral-950/60 p-4 rounded-xl border border-neutral-800/80">
            <p className="font-medium text-neutral-200 mb-1">
              🛡️ Prevent accidental data loss!
            </p>
            <p className="text-xs text-neutral-400">
              30 days have elapsed since your last monthly prompt. Downloading a local JSON copy ensures your pupil records and fee payment ledgers remain safe on your hard drive as a physical offline copy.
            </p>
          </div>

          {/* Current Ledger Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-neutral-950/80 rounded-xl border border-neutral-800">
              <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">Pupils Registered</span>
              <span className="text-lg font-black text-amber-400 font-mono">{students.length} Pupils</span>
            </div>
            <div className="p-3 bg-neutral-950/80 rounded-xl border border-neutral-800">
              <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">Payment Receipts</span>
              <span className="text-lg font-black text-emerald-400 font-mono">{payments.length} Payments</span>
            </div>
            <div className="p-3 bg-neutral-950/80 rounded-xl border border-neutral-800">
              <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">Active Term</span>
              <span className="text-xs font-bold text-neutral-200 truncate block mt-1">{activeTerm?.name || 'Standard Term'}</span>
            </div>
            <div className="p-3 bg-neutral-950/80 rounded-xl border border-neutral-800">
              <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase block">Total Database Records</span>
              <span className="text-xs font-mono font-bold text-neutral-300 block mt-1">{totalRecords.toLocaleString()} entries</span>
            </div>
          </div>

          {/* Last Download Status */}
          {lastDownloadedAt && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-800/50 p-2.5 rounded-lg">
              <CheckCircle2 size={14} className="shrink-0" />
              <span>Last download completed at <strong>{lastDownloadedAt}</strong></span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-neutral-950/80 border-t border-neutral-800/80 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <button
            onClick={handleSnooze}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800/80 hover:bg-neutral-800 rounded-xl transition-all border border-neutral-700/60"
          >
            Remind Me in 30 Days
          </button>
          
          <button
            onClick={executeDownloadBackup}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 border border-emerald-400/30"
          >
            <Download size={15} className="stroke-[2.5]" />
            <span>Download Backup (.JSON)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
