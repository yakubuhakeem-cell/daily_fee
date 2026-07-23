import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Database, 
  RefreshCw, 
  Copy, 
  Users, 
  Trash2, 
  Share2, 
  Download, 
  X, 
  ShieldAlert,
  Upload,
  UploadCloud 
} from 'lucide-react';

interface DatabaseTabProps {
  showToast: (msg: string) => void;
  setActiveTab: (tab: any) => void;
}

const getSafeOrigin = () => {
  try {
    if (window.location.origin && window.location.origin !== 'null') {
      return window.location.origin;
    }
    const parsed = new URL(window.location.href);
    if (parsed.origin && parsed.origin !== 'null') {
      return parsed.origin;
    }
  } catch (e) {
    console.warn("Unable to parse origin, falling back to empty string", e);
  }
  return '';
};

export const DatabaseTab: React.FC<DatabaseTabProps> = ({ showToast, setActiveTab }) => {
  const {
    students,
    users,
    firebaseConnected,
    firebaseError,
    retryFirebaseConnection,
    seedFirebaseFromLocal,
    storageMode,
    setStorageMode,
    bgSyncEnabled,
    setBgSyncEnabled,
    bgSyncStatus,
    lastBgSyncTime,
    clearSampleStudents,
    purgeOnlyDemoData,
    currentDate,
    activeTerm,
    terms,
    payments,
    resetData,
    backups,
    createBackup,
    restoreBackup,
    deleteBackup,
    clearAllBackups,
    audioMuted,
    setAudioMuted,
    salaries,
    expenses,
    whatsappLogs,
    budgetTargets,
    systemSettings,
    updateSystemSettings,
    currentUser,
    examsPayments,
    examsExpenses,
    examsSettings,
    importDatabaseBackup
  } = useApp();

  // Local States
  const [localTimeLeft, setLocalTimeLeft] = useState<number>(30 * 60);
  const [backupLabel, setBackupLabel] = useState('');
  const [showBackupPurgeConfirm, setShowBackupPurgeConfirm] = useState(false);
  const [showRestoreConfirmId, setShowRestoreConfirmId] = useState<string | null>(null);
  const [showPurgeDemoConfirm, setShowPurgeDemoConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [showLedgerSwitchModal, setShowLedgerSwitchModal] = useState(false);
  const [isSyncingTransition, setIsSyncingTransition] = useState(false);

  // Snapshot Timer Effect
  useEffect(() => {
    const timer = setInterval(() => {
      setLocalTimeLeft(prev => {
        if (prev <= 1) return 30 * 60;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const downloadDatabaseBackup = () => {
    try {
      const now = new Date();
      const backupFilename = `feetrack-backup-${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}.json`;
      
      const backupData = {
        app: "FEETRACK",
        description: "School Administration Financial Ledger Database Backup",
        backupType: "Manual JSON State Export",
        exportedAt: now.toISOString(),
        exportedBy: currentUser?.name || currentUser?.email || "System",
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
          backups,
          examsPayments,
          examsExpenses,
          examsSettings
        }
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = backupFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast('Database backup downloaded successfully!');
    } catch (error) {
      console.error('Database backup failed:', error);
      showToast('Error generating database backup file.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Ledger Switch & Sync Safeguard Modal */}
      {showLedgerSwitchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in animate-duration-200">
          <div className="bg-neutral-950 border-4 border-amber-500 max-w-xl w-full p-8 space-y-6 shadow-[10px_10px_0px_0px_rgba(245,158,11,0.25)] relative">
            <div className="flex items-center gap-3 border-b-2 border-neutral-850 pb-4">
              <ShieldAlert className="text-amber-500 animate-pulse" size={28} />
              <div>
                <span className="text-[10px] font-mono tracking-widest text-amber-500 uppercase font-black">Ledger Precaution Guard</span>
                <h3 className="text-lg font-black uppercase tracking-tight text-white font-mono">Unsynced Database Conflict Check</h3>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed font-semibold">
              You are switching from <span className="text-amber-400">📁 Local Ledger Only</span> to <span className="text-emerald-400">☁️ Firestore Cloud Sync</span>.
            </p>

            <div className="p-4 bg-amber-950/20 border-2 border-amber-900/60 rounded text-xs text-neutral-300 leading-normal space-y-2">
              <p className="font-extrabold text-amber-500 text-xs">🚨 Unsynced Data Loss Protection!</p>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Any student records or fee payments you logged in Local mode are stored in your browser cache. Connecting directly to Firestore will trigger a remote fetch which would replace your local list!
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                id="modal-btn-sync"
                disabled={isSyncingTransition}
                onClick={async () => {
                  try {
                    setIsSyncingTransition(true);
                    showToast('Beginning relational seeding transition...');
                    const response = await seedFirebaseFromLocal();
                    showToast(response.message);
                    if (response.success) {
                      setStorageMode('cloud');
                    }
                  } catch (err) {
                    console.error('Transition seeding error:', err);
                    showToast('Sync failure. Checking database credentials...');
                  } finally {
                    setIsSyncingTransition(false);
                    setShowLedgerSwitchModal(false);
                  }
                }}
                className="w-full py-4 px-4 bg-emerald-500 hover:bg-emerald-450 disabled:bg-neutral-800 disabled:text-neutral-500 text-black font-black uppercase text-xs tracking-wider transition-all cursor-pointer font-mono flex items-center justify-between"
              >
                <span>🚀 Option A: Publish & Sync Local to Cloud</span>
                <span className="text-[9px] bg-black/15 text-black px-2.5 py-0.5 rounded font-bold font-sans">SAFE & MERGE</span>
              </button>

              <button
                type="button"
                id="modal-btn-overwrite"
                disabled={isSyncingTransition}
                onClick={() => {
                  setStorageMode('cloud');
                  showToast('Cloud Sync active. Overwritten with remote collection.');
                  setShowLedgerSwitchModal(false);
                }}
                className="w-full py-3.5 px-4 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 hover:text-white font-bold uppercase text-xs tracking-wider transition-colors cursor-pointer font-mono text-left"
              >
                📥 Option B: Download Cloud (Discard Unsynced Local)
              </button>

              <button
                type="button"
                id="modal-btn-cancel"
                disabled={isSyncingTransition}
                onClick={() => setShowLedgerSwitchModal(false)}
                className="w-full py-3.5 px-4 bg-transparent hover:bg-neutral-900 border border-neutral-800 text-neutral-500 hover:text-neutral-300 text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer font-mono text-left"
              >
                ✕ Cancel and Stay in Local Ledger Mode
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-neutral-900 border-4 border-neutral-800 p-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b-2 border-neutral-800 gap-4">
          <div className="flex items-center gap-3">
            <Database size={24} className="text-amber-400" />
            <h3 className="text-xl font-black uppercase text-white tracking-tight font-mono">Firebase Firestore Status</h3>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${firebaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            <span className={`text-xs font-black uppercase tracking-widest font-mono ${firebaseConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
              {firebaseConnected ? 'FIREBASE CLOUD ACTIVE' : 'LOCAL LEDGER OFFLINE-MODE'}
            </span>
          </div>
        </div>

        {/* Ledger Mode Selection Controller */}
        <div className="p-4 bg-neutral-950 border-2 border-neutral-800 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-black uppercase text-white tracking-wider font-mono">Select Database Ledger Mode</h4>
            <p className="text-[11px] text-neutral-400 leading-normal max-w-2xl font-medium">
              Choose <span className="text-amber-400 font-extrabold">📁 Local Ledger Only</span> to bypass cloud lookups entirely for instantaneous execution and zero network timeouts. Choose <span className="text-emerald-400 font-extrabold">☁️ Firestore Cloud Sync</span> to link with Google Cloud Firestore database.
            </p>
          </div>
          <div className="flex gap-2.5 w-full xl:w-auto">
            <button
              type="button"
              id="btn-ledger-local"
              onClick={() => {
                setStorageMode('local');
                showToast('Switched to Standard Local Ledger mode. Blazing-fast and light!');
              }}
              className={`flex-1 xl:flex-initial px-4 py-2.5 text-xs font-black uppercase tracking-wider font-mono transition-all border-2 cursor-pointer ${
                storageMode === 'local'
                  ? 'bg-amber-500 text-black border-amber-500 font-extrabold'
                  : 'bg-transparent text-neutral-400 border-neutral-700 hover:text-white hover:border-neutral-500'
              }`}
            >
              📁 Local Ledger Only
            </button>
            <button
              type="button"
              id="btn-ledger-cloud"
              onClick={() => {
                if (storageMode === 'local') {
                  setShowLedgerSwitchModal(true);
                } else {
                  setStorageMode('cloud');
                  showToast('Switched to Cloud Database Sync mode.');
                }
              }}
              className={`flex-1 xl:flex-initial px-4 py-2.5 text-xs font-black uppercase tracking-wider font-mono transition-all border-2 cursor-pointer ${
                storageMode === 'cloud'
                  ? 'bg-emerald-500 text-black border-emerald-500 font-extrabold'
                  : 'bg-transparent text-neutral-400 border-neutral-700 hover:text-white hover:border-neutral-500'
              }`}
            >
              ☁️ Firestore Cloud Sync
            </button>
          </div>
        </div>

        {/* Periodic Background Sync Settings */}
        <div className={`p-4 border-2 transition-all ${
          bgSyncEnabled && storageMode === 'cloud'
            ? 'bg-emerald-950/20 border-emerald-900/60'
            : 'bg-neutral-950/50 border-neutral-850'
        } flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-3">
              <h4 className="text-sm font-black uppercase text-white tracking-wider font-mono flex items-center gap-2">
                🔄 Periodic Background Sync
              </h4>
              {storageMode === 'cloud' && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono leading-none border uppercase tracking-wider font-bold ${
                  bgSyncEnabled
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-900 animate-pulse'
                    : 'bg-neutral-900 text-neutral-500 border-neutral-800'
                }`}>
                  {bgSyncEnabled ? 'ENABLED' : 'DISABLED'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed font-semibold">
              Refresh pupil rosters, student details, and cash check-ins automatically in the background (every 30 seconds) while online. Ensures multi-device changes persist in near-realtime.
            </p>
            
            {bgSyncEnabled && storageMode === 'cloud' && (
              <div className="flex items-center gap-3 text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500">
                <span className="flex items-center gap-1.5">
                  Status: 
                  {bgSyncStatus === 'syncing' ? (
                    <span className="text-amber-400 animate-pulse flex items-center gap-1">
                      <span className="inline-block animate-spin">⌛</span> Syncing...
                    </span>
                  ) : bgSyncStatus === 'success' ? (
                    <span className="text-emerald-400">✓ Sync Active & Clean</span>
                  ) : bgSyncStatus === 'error' ? (
                    <span className="text-red-400">✗ Sync Timeout / Error</span>
                  ) : (
                    <span className="text-neutral-400">Idle</span>
                  )}
                </span>
                {lastBgSyncTime && (
                  <span className="border-l border-neutral-800 pl-3">
                    Last Active Handshake: <strong className="text-neutral-300">{lastBgSyncTime}</strong>
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={bgSyncEnabled}
                onChange={(e) => {
                  if (storageMode !== 'cloud' && e.target.checked) {
                    showToast('Please enable Firestore Cloud Sync first to trigger background syncing.');
                    return;
                  }
                  setBgSyncEnabled(e.target.checked);
                  showToast(
                    e.target.checked
                      ? 'Background sync enabled. The system will sync with Firebase every 30 seconds.'
                      : 'Background sync disabled. Switched back to manual-only synchronization.'
                  );
                }}
                disabled={storageMode !== 'cloud'}
                className="sr-only peer"
                id="toggle-background-sync"
              />
              <div className={`w-11 h-6 bg-neutral-800 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-neutral-400 after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-white peer-disabled:opacity-50 peer-disabled:cursor-not-allowed ${
                storageMode !== 'cloud' ? 'opacity-40' : ''
              }`}></div>
              <span className={`ml-3 text-xs font-black uppercase tracking-wider font-mono ${
                storageMode !== 'cloud' ? 'text-neutral-600' : 'text-neutral-300'
              }`}>
                {bgSyncEnabled && storageMode === 'cloud' ? 'ON' : 'OFF'}
              </span>
            </label>
          </div>
        </div>

        {/* System Audio & Feedback Chime Settings */}
        <div className={`p-4 border-2 transition-all ${
          !audioMuted
            ? 'bg-amber-950/20 border-amber-900/60'
            : 'bg-neutral-950/50 border-neutral-850'
        } flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-3">
              <h4 className="text-sm font-black uppercase text-white tracking-wider font-mono flex items-center gap-2">
                🔊 Portal Sound Effects
              </h4>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono leading-none border uppercase tracking-wider font-bold ${
                !audioMuted
                  ? 'bg-amber-950 text-amber-400 border-amber-900'
                  : 'bg-neutral-900 text-neutral-500 border-neutral-800'
              }`}>
                {audioMuted ? 'MUTED' : 'ACTIVE'}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed font-semibold">
              Mute/unmute all auditory signals, including successful pupil check-ins (high-register chime), registration duplicate conflicts (low-register buzzer), or QR scan alerts.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!audioMuted}
                onChange={(e) => {
                  setAudioMuted(!e.target.checked);
                  showToast(
                    e.target.checked
                      ? 'Auditory feedback check-in sound cues ENABLED!'
                      : 'Auditory feedback cues MUTED (Silent mode Active).'
                  );
                }}
                className="sr-only peer"
                id="toggle-system-audio"
              />
              <div className="w-11 h-6 bg-neutral-800 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-neutral-400 after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-400 peer-checked:after:bg-black"></div>
              <span className="ml-3 text-xs font-black uppercase tracking-wider font-mono text-neutral-300">
                {!audioMuted ? 'ON' : 'OFF'}
              </span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-2">
          <div className="lg:col-span-2 space-y-3">
            <p className="text-xs text-neutral-400 leading-relaxed font-bold">
              FEETRACK is armed with real-time cloud database syncing powered by Google Cloud Firebase Firestore. By default, records are safely cached in local memory and browser storage. Launching Firebase turns this daily school portal into a durable multi-device cloud system!
            </p>
            {firebaseConnected ? (
              <div className="p-4 bg-emerald-950/20 border-2 border-emerald-900 text-xs text-neutral-300 leading-relaxed font-medium">
                <p className="text-emerald-400 font-black mb-1 font-mono">🎉 CLOUD SYNC: VERIFIED ACTIVE</p>
                Your active student enrollments, staff user credentials, daily check-in payments, and staff roles are communicating live with Firestore. No setup or copy/paste is required.
              </div>
            ) : (
              <div className="p-4 bg-amber-950/10 border-2 border-amber-900/60 text-xs text-neutral-300 leading-relaxed font-semibold">
                <p className="text-amber-400 font-extrabold mb-1 font-mono">📂 OFFLINE-MODE fallback</p>
                We detected that your Cloud connection is offline. Connect your browser online or re-initialize to regain real-time Firestore database sync.
                {firebaseError && (
                  <div className="mt-2.5 p-2 bg-black/40 border border-amber-900/50 rounded text-[10px] text-red-400 font-mono select-text break-words leading-normal">
                    <span className="font-extrabold text-amber-500 mr-1">Error trace:</span>
                    {firebaseError}
                  </div>
                )}
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={async () => {
                      showToast('Re-testing collection links...');
                      await retryFirebaseConnection();
                      showToast('Real-time sync test finalized.');
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-450 text-black font-black uppercase text-[10px] tracking-wider transition-colors inline-flex items-center gap-1.5 cursor-pointer font-mono"
                  >
                    <RefreshCw size={10} className="animate-spin" style={{ animationDuration: '3s' }} />
                    Retry Sync Detection
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-neutral-950 border-2 border-neutral-850 p-6 flex flex-col justify-between gap-4">
            <span className="text-[10px] font-black tracking-widest uppercase font-mono text-neutral-500">Cloud Seeding Bridge</span>
            <h4 className="text-sm font-black uppercase text-white leading-tight font-mono">Bootstrap Local Seeds to Firestore</h4>
            <p className="text-[11px] text-neutral-400 leading-normal font-medium">
              Push your offline register records, pupil directories, and recorded payment books immediately into your active Cloud Firebase Firestore database.
            </p>
            <button
              type="button"
              onClick={async () => {
                try {
                  showToast('Triggering Firebase firestore sync sequence...');
                  const response = await seedFirebaseFromLocal();
                  showToast(response.message);
                } catch (err) {
                  const msg = err instanceof Error ? err.message : String(err);
                  console.error('Firebase seeding failed:', err);
                  try {
                    const parsed = JSON.parse(msg);
                    showToast(`Failed: ${parsed.error || 'Check database permissions / rules.'}`);
                  } catch {
                    showToast(`Failed: ${msg.slice(0, 80)}`);
                  }
                }
              }}
              className="w-full py-2.5 text-xs font-black bg-amber-400 hover:bg-amber-350 text-black uppercase tracking-widest cursor-pointer transition-colors flex items-center justify-center gap-2 font-mono"
            >
              <RefreshCw size={14} />
              Publish To Firestore
            </button>
          </div>
        </div>

        {/* Local Offline Backups & Recovery Hub */}
        <div className="bg-neutral-950 border-2 border-neutral-800 p-6 space-y-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-neutral-850 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black tracking-widest uppercase font-mono text-amber-500 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Recurring 30-Minute Task Active
              </span>
              <h4 className="text-base font-black uppercase text-white leading-tight font-mono flex items-center gap-2 block">
                <Database size={18} className="text-amber-400" />
                Offline Local Backup & Recovery Hub
              </h4>
              <p className="text-xs text-neutral-400 leading-relaxed font-semibold">
                Automated background task captures state snapshots every 30 minutes. Securely guards directories, terms, and billing logs against data loss in Offline mode.
              </p>
            </div>

            <div className="flex flex-row md:flex-col items-end gap-1.5 bg-neutral-900 border border-neutral-850 px-4 py-2.5 font-mono select-none shrink-0 w-full md:w-auto text-right">
              <div className="text-[10px] uppercase text-neutral-500 font-bold tracking-wider">Next Auto Backup In</div>
              <div className="text-lg font-black text-white leading-none">
                {Math.floor(localTimeLeft / 60)}m {(localTimeLeft % 60).toString().padStart(2, '0')}s
              </div>
            </div>
          </div>

          {/* Create Manual Backup Trigger bar */}
          <div className="bg-neutral-900 border border-neutral-850 p-4 flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                placeholder="Enter manual backup label (e.g., Before class merge)..."
                value={backupLabel}
                onChange={(e) => setBackupLabel(e.target.value)}
                maxLength={60}
                className="w-full bg-neutral-950 border-2 border-neutral-800 px-4 py-2 text-xs font-mono font-bold text-white uppercase placeholder-neutral-600 focus:outline-none focus:border-amber-400"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  createBackup(backupLabel.trim() || undefined, false);
                  setBackupLabel('');
                  showToast('Captured fresh local database snapshot.');
                }}
                className="flex-1 sm:flex-initial px-5 py-2.5 bg-neutral-850 hover:bg-neutral-800 text-white font-black text-xs uppercase tracking-widest font-mono transition-colors cursor-pointer border-2 border-neutral-750"
              >
                Create Snapshot
              </button>
              <button
                type="button"
                onClick={downloadDatabaseBackup}
                className="flex-1 sm:flex-initial px-5 py-2.5 bg-amber-400 hover:bg-amber-350 text-black font-black text-xs uppercase tracking-widest font-mono transition-colors cursor-pointer border-2 border-amber-500 flex items-center justify-center gap-2"
              >
                <Download size={13} />
                Download Backup JSON
              </button>
            </div>
          </div>

          {/* Drag & Drop or Click to Import / Restore Backup JSON File */}
          <div className="bg-neutral-900/40 border border-neutral-850 p-4 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black tracking-widest uppercase font-mono text-emerald-400 flex items-center gap-1">
                <UploadCloud size={11} /> Safe Restore Gateway
              </span>
              <h5 className="text-xs font-black uppercase text-white font-mono">Upload and Restore External JSON Backup File</h5>
              <p className="text-[10px] text-neutral-400 leading-normal max-w-xl font-medium">
                Restoring a backup will overwrite your current local records (including registered students, school fee payments, exams ledger payments, expenses, and settings) with the contents of the backup file.
              </p>
            </div>
            
            <div className="w-full md:w-auto shrink-0">
              <label className="flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-950 border-2 border-dashed border-neutral-800 hover:border-emerald-500 hover:bg-neutral-900/20 text-neutral-300 hover:text-emerald-400 font-bold text-xs uppercase tracking-wider font-mono transition-all cursor-pointer rounded-lg w-full md:w-auto">
                <Upload size={13} />
                <span>Upload & Restore</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    const reader = new FileReader();
                    reader.onload = async (event) => {
                      try {
                        const content = event.target?.result as string;
                        const parsed = JSON.parse(content);
                        
                        if (window.confirm(`⚠️ WARNING: You are about to restore an external backup file. This will REPLACE all current local registries, school fee payments, and exams ledger entries. Are you sure you want to proceed?`)) {
                          showToast('Restoring database state from uploaded JSON...');
                          await importDatabaseBackup(parsed);
                          showToast('✅ Database restored successfully!');
                        }
                      } catch (err) {
                        console.error('Failed to import backup:', err);
                        showToast(`❌ Failed to restore backup: ${err instanceof Error ? err.message : 'Invalid JSON file structure.'}`);
                      }
                    };
                    reader.readAsText(file);
                  }}
                />
              </label>
            </div>
          </div>

          {/* Backups List */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black tracking-widest uppercase font-mono text-neutral-500">
                Stored Snapshots ({backups.length}/10 slots used)
              </span>
              {backups.length > 0 && (
                <div className="shrink-0">
                  {showBackupPurgeConfirm ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono font-bold uppercase text-red-400 animate-pulse">WIPE ALL?</span>
                      <button
                        type="button"
                        onClick={() => setShowBackupPurgeConfirm(false)}
                        className="text-[9px] font-bold uppercase text-neutral-400 hover:text-white underline font-mono cursor-pointer"
                      >
                        CANCEL
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          clearAllBackups();
                          setShowBackupPurgeConfirm(false);
                          showToast('Cleared all local backups.');
                        }}
                        className="text-[9px] font-bold uppercase text-red-500 hover:text-red-400 underline font-mono cursor-pointer"
                      >
                        CONFIRM
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowBackupPurgeConfirm(true)}
                      className="text-[9px] font-bold uppercase text-neutral-500 hover:text-red-400 underline font-mono transition-colors cursor-pointer"
                    >
                      Purge Backup Cache
                    </button>
                  )}
                </div>
              )}
            </div>

            {backups.length === 0 ? (
              <div className="border border-dashed border-neutral-800 p-8 text-center text-neutral-500 space-y-1.5 font-mono select-none">
                <Database size={24} className="mx-auto text-neutral-700 stroke-[1.5]" />
                <p className="text-xs uppercase font-extrabold tracking-wider text-neutral-400">No backup records saved</p>
                <p className="text-[10px] font-medium leading-relaxed max-w-lg mx-auto uppercase">
                  The automated timer will automatically capture database state. Try creating a manual snapshot above to protect changes dynamically.
                </p>
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto space-y-3.5 pr-2 custom-scrollbar">
                {backups.map(b => (
                  <div key={b.id} className="bg-neutral-900 border border-neutral-850 p-4.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-neutral-700 transition">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black uppercase text-white truncate max-w-[280px]">
                          {b.label}
                        </span>
                        <span className={`text-[9px] font-black tracking-widest uppercase font-mono px-2 py-0.5 border leading-none shrink-0 ${
                          b.isAuto 
                            ? 'bg-amber-950/20 border-amber-500/20 text-amber-500' 
                            : 'bg-blue-950/20 border-blue-500/20 text-blue-400'
                        }`}>
                          {b.isAuto ? 'AUTO' : 'MANUAL'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[10px] leading-none text-neutral-400 font-semibold uppercase">
                        <span>Students: <strong className="text-white">{b.counts.students}</strong></span>
                        <span className="border-l border-neutral-800 h-2.5"></span>
                        <span>Payments: <strong className="text-white">{b.counts.payments}</strong></span>
                        <span className="border-l border-neutral-800 h-2.5"></span>
                        <span>Terms: <strong className="text-white">{b.counts.terms}</strong></span>
                        <span className="border-l border-neutral-800 h-2.5"></span>
                        <span className="text-neutral-500 font-bold">{b.timestamp}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                      {showRestoreConfirmId === b.id ? (
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 animate-pulse">ROLLBACK?</span>
                          <button
                            type="button"
                            onClick={() => setShowRestoreConfirmId(null)}
                            className="px-2.5 py-1.5 border border-neutral-800 hover:border-neutral-750 text-[10px] font-black uppercase tracking-wider text-neutral-400 hover:text-white transition cursor-pointer font-mono"
                          >
                            CANCEL
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              restoreBackup(b.id);
                              setShowRestoreConfirmId(null);
                              showToast(`Restored base state from snapshot: "${b.label}"`);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white border-2 border-emerald-500 text-[10px] font-black uppercase tracking-wider transition cursor-pointer font-mono"
                          >
                            CONFIRM
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setShowRestoreConfirmId(b.id)}
                            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-black text-[10px] uppercase font-mono tracking-widest border border-neutral-700 transition cursor-pointer"
                          >
                            Restore
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              deleteBackup(b.id);
                              showToast('Selected backup snapshot deleted.');
                            }}
                            className="p-2 text-neutral-500 hover:text-red-400 hover:bg-neutral-800/40 rounded transition cursor-pointer"
                            title="Delete backup"
                          >
                            <X size={14} className="stroke-[3]" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Clear Sample / Start Live Data System Utility */}
        <div className="bg-neutral-950 border-2 border-red-950/60 p-6 flex flex-col gap-6 relative">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1.5 max-w-2xl">
              <span className="text-[10px] font-black tracking-widest uppercase font-mono text-red-500">System Initialization Ledger Tools</span>
              <h4 className="text-base font-black uppercase text-white leading-tight font-mono flex items-center gap-2">
                <Trash2 size={16} className="text-red-500" />
                Clean Demo Data & Start Live Registers
              </h4>
              <p className="text-xs text-neutral-400 leading-relaxed font-medium">
                This school portal registers and tracks your live student rosters, fees, exams, and expenditures.
                <br />
                <strong className="text-amber-500 font-bold font-mono">Do you have legacy demo records?</strong> If you have any older simulation/demo students or transactions, use the "Purge Only Demo Data" tool below to safely filter and remove them, leaving your real pupil roster pristine.
              </p>
            </div>
          </div>

          {/* Toggle to Disable Demo Auto-Seeding */}
          <div className="p-4 bg-neutral-900/30 border border-neutral-900 rounded flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <h5 className="text-sm font-bold uppercase text-white font-mono flex items-center gap-1.5">
                🚫 Keep Registers Clean / Disable Demo Auto-Seeding
              </h5>
              <p className="text-xs text-neutral-400">
                Maintains a clean starting environment. The system remains 100% blank and free of simulated rosters on factory resets or new database initializations.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase">
                {systemSettings?.disableDemoData ? 'Active: No Defaults' : 'Inactive: Auto-Seed'}
              </span>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={systemSettings?.disableDemoData || false}
                  onChange={async (e) => {
                    const enabled = e.target.checked;
                    const success = await updateSystemSettings({ disableDemoData: enabled });
                    if (success) {
                      showToast(enabled 
                        ? "Auto-seeding of demo data DISABLED. Roster will remain 100% empty on resets." 
                        : "Auto-seeding of demo data ENABLED. Defaults may reload on empty slate."
                      );
                    } else {
                      showToast("Failed to update setting on the database.");
                    }
                  }}
                  className="sr-only peer"
                  id="toggle-disable-demo-data"
                />
                <div className="w-11 h-6 bg-neutral-800 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-neutral-400 after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500 peer-checked:after:bg-white"></div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-neutral-900 pt-4">
            {/* Purge Demo ONLY (Safe choice) */}
            <div className="p-4 bg-neutral-900/40 border border-neutral-900 rounded flex flex-col justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider font-mono">Option A: Safe & Highly Recommended</span>
                <h5 className="text-sm font-bold uppercase text-white font-mono">Remove ONLY Demo Data</h5>
                <p className="text-[11px] text-neutral-400">
                  Instantly deletes any remaining legacy simulation student records (IDs s1 to s27) and their sample transactions if they are still stored in your browser or database. <strong className="text-white">All of your real pupil registries, transactions, and staff are kept 100% safe.</strong>
                </p>
              </div>
              <div>
                {showPurgeDemoConfirm ? (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase font-mono font-black text-amber-500 animate-pulse">⚠️ Purge legacy simulation records?</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPurgeDemoConfirm(false)}
                        className="py-2 px-3 text-[10px] font-black uppercase text-neutral-400 hover:text-white border border-neutral-800 bg-neutral-900 cursor-pointer font-mono"
                      >
                        CANCEL
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const result = await purgeOnlyDemoData();
                          setShowPurgeDemoConfirm(false);
                          showToast(result.message);
                        }}
                        className="py-2 px-4 text-[10px] font-black uppercase bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-colors font-mono"
                      >
                        CONFIRM PURGE
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowPurgeDemoConfirm(true)}
                    className="w-full py-2.5 px-4 text-xs font-bold bg-emerald-950/20 hover:bg-emerald-800/40 text-emerald-400 border border-emerald-900/60 uppercase tracking-wider cursor-pointer transition-all font-mono text-center"
                  >
                    PURGE ONLY DEMO RECORDS
                  </button>
                )}
              </div>
            </div>

            {/* Wipe ALL */}
            <div className="p-4 bg-neutral-900/40 border border-neutral-900 rounded flex flex-col justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider font-mono">Option B: Irreversible Full Reset</span>
                <h5 className="text-sm font-bold uppercase text-white font-mono">Wipe All Registered Pupils</h5>
                <p className="text-[11px] text-neutral-400">
                  Permanently wipes <strong className="text-red-400 font-mono">EVERY SINGLE pupil</strong> and transaction record in the database. Use this ONLY if you have not registered any real pupils yet and want a completely empty school.
                </p>
              </div>
              <div>
                {students.length === 0 ? (
                  <div className="py-2.5 px-4 border border-emerald-900 bg-emerald-950/15 text-emerald-400 text-xs font-mono font-black uppercase tracking-wider text-center">
                    🟢 Register Cleared & Ready!
                  </div>
                ) : showClearConfirm ? (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase font-mono font-black text-red-400 animate-pulse font-mono">⚠️ ARE YOU ABSOLUTELY SURE? THIS WIPES EVERYTHING!</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowClearConfirm(false)}
                        className="py-2 px-3 text-[10px] font-black uppercase text-neutral-400 hover:text-white border border-neutral-800 bg-neutral-900 cursor-pointer font-mono"
                      >
                        CANCEL
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          clearSampleStudents();
                          setShowClearConfirm(false);
                          showToast('All registered pupils and payment logs cleared successfully.');
                        }}
                        className="py-2 px-4 text-[10px] font-black uppercase bg-red-600 hover:bg-red-500 text-white cursor-pointer transition-colors font-mono"
                      >
                        CONFIRM WIPE
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="w-full py-2.5 px-4 text-xs font-bold bg-neutral-900 hover:bg-red-950/40 text-red-500 border border-red-950 uppercase tracking-wider cursor-pointer transition-all font-mono text-center"
                  >
                    WIPE ALL REGISTERED PUPILS
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Reset App Ledger / Factory Reset System Utility */}
        <div className="bg-neutral-950 border-2 border-amber-950/60 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative">
          <div className="space-y-1.5 max-w-2xl">
            <span className="text-[10px] font-black tracking-widest uppercase font-mono text-amber-500">System Reset Tools</span>
            <h4 className="text-base font-black uppercase text-white leading-tight font-mono flex items-center gap-2">
              <RefreshCw size={16} className="text-amber-550" />
              Factory Reset / Rebuild App Ledger
            </h4>
            <p className="text-xs text-neutral-400 leading-relaxed font-semibold">
              Rebuild the system to system factory seeds. This option completely purges the cache and resets students, staff logins, and daily payments to default starting presets.
            </p>
          </div>
          <div className="w-full md:w-auto shrink-0">
            {showResetConfirm ? (
              <div className="space-y-2.5">
                <p className="text-[10px] uppercase font-mono font-black text-amber-400 text-center animate-pulse">⚠️ PURGE & RESTORE DEFAULTS?</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="py-2.5 px-4 text-xs font-black uppercase text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-700 bg-neutral-900 cursor-pointer font-mono"
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetData();
                      setShowResetConfirm(false);
                      showToast('System rebuilt to factory seeds. Reloading...');
                      setTimeout(() => {
                        window.location.reload();
                      }, 1000);
                    }}
                    className="py-2.5 px-5 text-xs font-black uppercase bg-amber-550 hover:bg-amber-500 text-black cursor-pointer transition-colors font-mono"
                  >
                    CONFIRM RESET
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="w-full md:w-auto py-3 px-6 text-xs font-black bg-neutral-905 hover:bg-amber-500 hover:text-black text-amber-500 border border-amber-950 hover:border-amber-500 uppercase tracking-widest cursor-pointer transition-all font-mono"
              >
                RESET APP LEDGER
              </button>
            )}
          </div>
        </div>

        {/* Staff Setup and Access Instructions */}
        <div className="bg-neutral-950 border-2 border-neutral-800 p-6 space-y-5">
          <div className="flex items-center gap-3 border-b border-neutral-850 pb-3">
            <Share2 className="text-amber-400" size={18} />
            <h4 className="text-xs font-black uppercase text-white tracking-widest font-mono">
              STAFF ACCOUNTS & MULTI-USER ACCESS INSTANT SETUP
            </h4>
          </div>
          
          <p className="text-xs text-neutral-400 leading-normal font-medium">
            Want to make this application available to other staff members? Follow this simple 3-step checklist to coordinate class fee logs across all devices:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium">
            {/* Step 1 */}
            <div className="bg-neutral-900 border border-neutral-850 p-4 space-y-2 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="text-[10px] font-black text-amber-500 font-mono block">STEP 01: SHARE PORTAL LINK</span>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  Provide other staff members with the live web address of this school fee tracker. They can open it on any mobile phone, tablet, or classroom computer.
                </p>
                <div className="bg-neutral-950 p-2 border border-neutral-800 rounded font-mono text-[9px] text-amber-400 break-all select-all font-bold">
                  {(() => {
                    const raw = getSafeOrigin();
                    if (raw.includes("localhost") || raw.includes("127.0.0.1")) return raw;
                    let clean = raw.replace(/^(https?:\/\/)\d+-/, "$1");
                    if (clean.includes("-dev-")) clean = clean.replace("-dev-", "-pre-");
                    return clean.replace(/:\d+$/, "");
                  })()}
                </div>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const rawOrigin = getSafeOrigin();
                      let cleanOrigin = rawOrigin;
                      if (!rawOrigin.includes("localhost") && !rawOrigin.includes("127.0.0.1")) {
                        cleanOrigin = rawOrigin.replace(/^(https?:\/\/)\d+-/, "$1");
                        if (cleanOrigin.includes("-dev-")) {
                          cleanOrigin = cleanOrigin.replace("-dev-", "-pre-");
                        }
                        cleanOrigin = cleanOrigin.replace(/:\d+$/, "");
                      }
                      navigator.clipboard.writeText(cleanOrigin);
                      setCopiedAddress(true);
                      showToast("Copied portal address to clipboard!");
                      setTimeout(() => setCopiedAddress(false), 2000);
                    } catch (err) {
                      const rawOrigin = getSafeOrigin();
                      let cleanOrigin = rawOrigin;
                      if (!rawOrigin.includes("localhost") && !rawOrigin.includes("127.0.0.1")) {
                        cleanOrigin = rawOrigin.replace(/^(https?:\/\/)\d+-/, "$1");
                        if (cleanOrigin.includes("-dev-")) {
                          cleanOrigin = cleanOrigin.replace("-dev-", "-pre-");
                        }
                        cleanOrigin = cleanOrigin.replace(/:\d+$/, "");
                      }
                      alert(`Portal Address: ${cleanOrigin}`);
                    }
                  }}
                  className="w-full py-2 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-600 text-[10px] font-black uppercase tracking-widest text-amber-400 transition-all flex items-center justify-center gap-2 cursor-pointer font-mono"
                >
                  <Copy size={12} />
                  {copiedAddress ? "COPIED DETAILS!" : "COPY SHARABLE URL"}
                </button>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-neutral-900 border border-neutral-850 p-4 space-y-2 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="text-[10px] font-black text-amber-500 font-mono block">STEP 02: AUTHORIZE THE EMAIL</span>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  Navigate to the <span className="text-amber-400 font-bold">RBAC & MFA Hub</span> tab above. Register their email, select their class/role, and let them sign in securely.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('mfa')}
                  className="w-full py-2 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-600 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors flex items-center justify-center gap-2 cursor-pointer font-mono"
                >
                  <Users size={12} />
                  GOTO SECURITY HUB
                </button>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-neutral-900 border border-neutral-850 p-4 space-y-2 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="text-[10px] font-black text-amber-500 font-mono block">STEP 03: TURN ON CLOUD SYNC</span>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  Make sure database mode is set to <span className="text-emerald-400 font-bold">Cloud Sync</span> on all devices so updates register instantly for all staff teachers in real-time.
                </p>
              </div>
              <div className="bg-neutral-950 px-2.5 py-1.5 border border-neutral-850 text-center text-[10px] uppercase font-bold text-neutral-500 font-mono">
                STATUS: {storageMode === 'cloud' ? '🟢 SYNCING LIVE' : '⚠️ ISOLATED LOCAL'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
