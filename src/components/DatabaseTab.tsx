import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { idbEngine } from '../lib/idbEngine';
import { Student, PaymentRecord, ExamsPayment, StudentClass, SchoolCategory, AdministrativePurgeOptions } from '../types';
import { DeleteConfirmationModal, DeleteConfirmDetails } from './DeleteConfirmationModal';
import { DuplicateReconciliationModal } from './DuplicateReconciliationModal';
import { ClearClassFeesModal } from './ClearClassFeesModal';
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
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Sparkles
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
    clearAllPayments,
    purgeOnlyDemoData,
    purgeDuplicatePayments,
    purgeAdvancePayments,
    purgeOutOfTermPayments,
    purgeClassOutOfTermAndDuplicates,
    purgeRepeatedAndAdvancePayments,
    purgePublicHolidayPayments,
    purgePaymentsExceptYesterdayAndToday,
    deleteAllAutomaticEntries,
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
    importDatabaseBackup,
    administrativePurge,
    journalEntries,
    carryForwardTermBalances
  } = useApp();

  // Local States
  const [localTimeLeft, setLocalTimeLeft] = useState<number>(30 * 60);
  const [backupLabel, setBackupLabel] = useState('');
  const [showReconciliationModal, setShowReconciliationModal] = useState(false);
  const [showClearClassFeesModal, setShowClearClassFeesModal] = useState(false);
  const [deleteConfirmDetails, setDeleteConfirmDetails] = useState<DeleteConfirmDetails | null>(null);
  const [showRestoreConfirmId, setShowRestoreConfirmId] = useState<string | null>(null);
  const [showPurgeDemoConfirm, setShowPurgeDemoConfirm] = useState(false);
  const [showClearPaymentsConfirm, setShowClearPaymentsConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [showLedgerSwitchModal, setShowLedgerSwitchModal] = useState(false);
  const [isSyncingTransition, setIsSyncingTransition] = useState(false);

  // Data Recovery & CSV Import States
  const [recoveryTab, setRecoveryTab] = useState<'cache' | 'students' | 'payments' | 'exams'>('cache');
  const [studentsCsvInput, setStudentsCsvInput] = useState('');
  const [paymentsCsvInput, setPaymentsCsvInput] = useState('');
  const [examsCsvInput, setExamsCsvInput] = useState('');
  const [isProcessingRecovery, setIsProcessingRecovery] = useState(false);
  const [idbCounts, setIdbCounts] = useState<{ students: number; payments: number; examsPayments: number } | null>(null);

  const checkIdbCounts = async () => {
    try {
      await idbEngine.init();
      await idbEngine.migrateFromLocalStorage();
      const s = await idbEngine.getItem<any[]>('s_students') || [];
      const p = await idbEngine.getItem<any[]>('s_payments') || [];
      const ep = await idbEngine.getItem<any[]>('s_exams_payments') || [];

      // Check raw localStorage fallback
      let lsS: any[] = [];
      let lsP: any[] = [];
      let lsEP: any[] = [];
      try {
        const rawS = localStorage.getItem('s_students');
        if (rawS) lsS = JSON.parse(rawS);
        const rawP = localStorage.getItem('s_payments');
        if (rawP) lsP = JSON.parse(rawP);
        const rawEP = localStorage.getItem('s_exams_payments');
        if (rawEP) lsEP = JSON.parse(rawEP);
      } catch (e) {
        console.warn("Failed checking localStorage raw counts:", e);
      }

      const totalStudents = Math.max(Array.isArray(s) ? s.length : 0, Array.isArray(lsS) ? lsS.length : 0);
      const totalPayments = Math.max(Array.isArray(p) ? p.length : 0, Array.isArray(lsP) ? lsP.length : 0);
      const totalExamsPayments = Math.max(Array.isArray(ep) ? ep.length : 0, Array.isArray(lsEP) ? lsEP.length : 0);

      setIdbCounts({
        students: totalStudents,
        payments: totalPayments,
        examsPayments: totalExamsPayments,
      });
    } catch (e) {
      console.warn("Failed checking IDB counts:", e);
    }
  };

  useEffect(() => {
    checkIdbCounts();
  }, [students.length, payments.length, examsPayments.length]);

  const handleSyncFromIndexedDBCache = async () => {
    setIsProcessingRecovery(true);
    try {
      await idbEngine.init();
      await idbEngine.migrateFromLocalStorage();

      const cachedStudents = await idbEngine.getItem<Student[]>('s_students') || [];
      const cachedPayments = await idbEngine.getItem<PaymentRecord[]>('s_payments') || [];
      const cachedExamsPayments = await idbEngine.getItem<ExamsPayment[]>('s_exams_payments') || [];

      // Also read raw localStorage as fallback
      let lsStudents: Student[] = [];
      let lsPayments: PaymentRecord[] = [];
      let lsExamsPayments: ExamsPayment[] = [];
      try {
        const rawS = localStorage.getItem('s_students');
        if (rawS) lsStudents = JSON.parse(rawS);
        const rawP = localStorage.getItem('s_payments');
        if (rawP) lsPayments = JSON.parse(rawP);
        const rawEP = localStorage.getItem('s_exams_payments');
        if (rawEP) lsExamsPayments = JSON.parse(rawEP);
      } catch (e) {
        console.warn("Error reading localStorage directly:", e);
      }

      const studentMap = new Map<string, Student>();
      students.forEach(s => studentMap.set(s.id, s));
      cachedStudents.forEach(s => { if (s && s.id) studentMap.set(s.id, s); });
      lsStudents.forEach(s => { if (s && s.id) studentMap.set(s.id, s); });

      const paymentMap = new Map<string, PaymentRecord>();
      payments.forEach(p => paymentMap.set(p.id, p));
      cachedPayments.forEach(p => { if (p && p.id) paymentMap.set(p.id, p); });
      lsPayments.forEach(p => { if (p && p.id) paymentMap.set(p.id, p); });

      const examsPaymentMap = new Map<string, ExamsPayment>();
      examsPayments.forEach(ep => examsPaymentMap.set(ep.id, ep));
      cachedExamsPayments.forEach(ep => { if (ep && ep.id) examsPaymentMap.set(ep.id, ep); });
      lsExamsPayments.forEach(ep => { if (ep && ep.id) examsPaymentMap.set(ep.id, ep); });

      const mergedStudents = Array.from(studentMap.values());
      const mergedPayments = Array.from(paymentMap.values());
      const mergedExamsPayments = Array.from(examsPaymentMap.values());

      if (mergedStudents.length === 0 && mergedPayments.length === 0 && mergedExamsPayments.length === 0) {
        showToast("⚠️ No cached data found in your browser's local storage (IndexedDB / LocalStorage).");
        return;
      }

      await importDatabaseBackup({
        app: "FEETRACK",
        data: {
          students: mergedStudents,
          payments: mergedPayments,
          examsPayments: mergedExamsPayments,
          users,
          terms,
          expenses,
          salaries,
          whatsappLogs,
          budgetTargets,
          backups,
          examsExpenses,
          examsSettings
        }
      });

      showToast(`✅ Browser Cache Recovery Complete! Restored ${mergedStudents.length} pupils, ${mergedPayments.length} fee payments, and ${mergedExamsPayments.length} exam fee records from your browser storage.`);
      await checkIdbCounts();
    } catch (err) {
      console.error("Cache sync failed:", err);
      showToast(`❌ Cache sync failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessingRecovery(false);
    }
  };

  const downloadSampleStudentsCSV = () => {
    const csvContent = `Name,Class,Gender,Guardian Name,Guardian Phone,Sub-Category,Discount %
Kwame Addo,Nursery,Male,Kofi Addo,0240001122,Pre-school,0
Abena Mensah,Nursery,Female,Ama Mensah,0240003344,Pre-school,0
Kofi Owusu,KG1,Male,Yaw Owusu,0240005566,Pre-school,0
Esi Baah,B1,Female,Akwasi Baah,0240007788,Primary,0`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nursery_and_pupils_enrollment_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSamplePaymentsCSV = () => {
    const csvContent = `Date,Student Name or ID,Class,Amount Paid,Payment Method,Payer Name
2026-05-25,Kwame Addo,Nursery,5,Cash,Kofi Addo
2026-05-25,Abena Mensah,Nursery,5,Cash,Ama Mensah
2026-05-26,Kofi Owusu,KG1,5,Mobile Money,Yaw Owusu`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'daily_school_fees_7_weeks_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSampleExamsCSV = () => {
    const csvContent = `Date,Student Name or ID,Class,Amount Paid,Payment Method
2026-05-20,Kwame Addo,Nursery,20,Cash
2026-05-20,Abena Mensah,Nursery,20,Mobile Money
2026-05-21,Esi Baah,B1,30,Cash`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exams_fee_payments_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportStudentsCSV = async (csvText: string) => {
    if (!csvText.trim()) {
      showToast("Please select a CSV file or paste CSV text first.");
      return;
    }
    setIsProcessingRecovery(true);
    try {
      const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
      const newStudentsList = [...students];
      let addedCount = 0;
      let updatedCount = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (i === 0 && (line.toLowerCase().includes("name") || line.toLowerCase().includes("class"))) {
          continue;
        }
        const parts = line.split(",").map(p => p.trim().replace(/^["']|["']$/g, ''));
        if (parts.length === 0 || !parts[0]) continue;

        const name = parts[0];
        const cls = (parts[1] as StudentClass) || 'Nursery';
        const gender = (parts[2] || 'Male') as 'Male' | 'Female';
        const guardianName = parts[3] || 'Parent / Guardian';
        const guardianPhone = parts[4] || '0240000000';
        const category = (['Nursery', 'KG1', 'KG2'].includes(cls) ? 'Pre-school' : ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'].includes(cls) ? 'Primary' : 'JHS') as SchoolCategory;
        const discountPercent = parseFloat(parts[6]) || 0;

        const existingIdx = newStudentsList.findIndex(s => s.name.toLowerCase() === name.toLowerCase() && s.class === cls);
        if (existingIdx >= 0) {
          newStudentsList[existingIdx] = {
            ...newStudentsList[existingIdx],
            gender,
            guardianName,
            guardianPhone,
            category,
            discountPercent,
            active: true
          };
          updatedCount++;
        } else {
          const id = `s_import_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          newStudentsList.push({
            id,
            name,
            class: cls,
            gender,
            guardianName,
            guardianPhone,
            category,
            discountPercent,
            active: true,
            dateJoined: new Date().toISOString().split('T')[0]
          });
          addedCount++;
        }
      }

      await importDatabaseBackup({
        app: "FEETRACK",
        data: {
          students: newStudentsList,
          payments,
          examsPayments,
          users,
          terms,
          expenses,
          salaries,
          whatsappLogs,
          budgetTargets,
          backups,
          examsExpenses,
          examsSettings
        }
      });

      setStudentsCsvInput('');
      showToast(`✅ Pupils CSV Processed! Enrolled ${addedCount} new pupils, updated ${updatedCount} existing pupils. Total pupils: ${newStudentsList.length}.`);
    } catch (err) {
      console.error("CSV import error:", err);
      showToast(`❌ Failed to parse pupils CSV: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessingRecovery(false);
    }
  };

  const handleImportPaymentsCSV = async (csvText: string, isExamPayments: boolean) => {
    if (!csvText.trim()) {
      showToast("Please select a CSV file or paste CSV text first.");
      return;
    }
    setIsProcessingRecovery(true);
    try {
      const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
      const termId = activeTerm?.id || 'term_default';

      if (isExamPayments) {
        const newExamsList = [...examsPayments];
        let added = 0;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (i === 0 && (line.toLowerCase().includes("date") || line.toLowerCase().includes("amount"))) continue;
          const parts = line.split(",").map(p => p.trim().replace(/^["']|["']$/g, ''));
          if (parts.length < 3) continue;

          const date = parts[0] || currentDate;
          const nameOrId = parts[1];
          const cls = (parts[2] as StudentClass) || 'Nursery';
          const amount = parseFloat(parts[3]) || 0;
          const method = (parts[4] || 'Cash') as 'Cash' | 'Mobile Money';

          const matchedStudent = students.find(s => s.id === nameOrId || s.name.toLowerCase() === nameOrId.toLowerCase());
          const studentId = matchedStudent ? matchedStudent.id : `s_anon_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
          const studentName = matchedStudent ? matchedStudent.name : nameOrId;

          const epId = `ep_import_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          newExamsList.push({
            id: epId,
            studentId,
            studentName,
            class: cls,
            amountPaid: amount,
            datePaid: date,
            termId,
            method
          });
          added++;
        }

        await importDatabaseBackup({
          app: "FEETRACK",
          data: {
            students,
            payments,
            examsPayments: newExamsList,
            users,
            terms,
            expenses,
            salaries,
            whatsappLogs,
            budgetTargets,
            backups,
            examsExpenses,
            examsSettings
          }
        });

        setExamsCsvInput('');
        showToast(`✅ Exam Fees CSV Processed! Restored ${added} exam payment records into the system.`);
      } else {
        const newPaymentsList = [...payments];
        let added = 0;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (i === 0 && (line.toLowerCase().includes("date") || line.toLowerCase().includes("amount"))) continue;
          const parts = line.split(",").map(p => p.trim().replace(/^["']|["']$/g, ''));
          if (parts.length < 3) continue;

          const date = parts[0] || currentDate;
          const nameOrId = parts[1];
          const cls = (parts[2] as StudentClass) || 'Nursery';
          const amount = parseFloat(parts[3]) || 0;
          const method = (parts[4] || 'Cash') as 'Cash' | 'Mobile Money' | 'Check' | 'Bank Transfer';
          const payerName = parts[5] || 'Parent / Guardian';

          const matchedStudent = students.find(s => s.id === nameOrId || s.name.toLowerCase() === nameOrId.toLowerCase());
          const studentId = matchedStudent ? matchedStudent.id : `s_anon_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;

          const pId = `p_import_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          newPaymentsList.push({
            id: pId,
            studentId,
            date,
            amountPaid: amount,
            method,
            payerName,
            termId,
            verified: true,
            status: amount >= 5 ? 'Standard' : amount > 0 ? 'Partially Paid' : 'Zero Pay'
          });
          added++;
        }

        await importDatabaseBackup({
          app: "FEETRACK",
          data: {
            students,
            payments: newPaymentsList,
            examsPayments,
            users,
            terms,
            expenses,
            salaries,
            whatsappLogs,
            budgetTargets,
            backups,
            examsExpenses,
            examsSettings
          }
        });

        setPaymentsCsvInput('');
        showToast(`✅ Daily Fees CSV Processed! Restored ${added} daily fee payments across all requested dates.`);
      }
    } catch (err) {
      console.error("CSV import error:", err);
      showToast(`❌ Failed to parse payments CSV: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessingRecovery(false);
    }
  };

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
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono leading-none border uppercase tracking-wider font-bold bg-neutral-900 text-neutral-400 border-neutral-800">
                {bgSyncEnabled && storageMode === 'cloud' ? 'ENABLED' : 'DISABLED (SAFE MODE)'}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed font-semibold">
              Automatic background synchronization polling is disabled by default to prevent unexpected data overwrites or fallback loss when restoring backups. Data changes are saved directly and manual cloud sync remains available whenever requested.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={bgSyncEnabled}
                onChange={(e) => {
                  if (storageMode !== 'cloud' && e.target.checked) {
                    showToast('Please enable Firestore Cloud Sync first.');
                    return;
                  }
                  setBgSyncEnabled(e.target.checked);
                  showToast(
                    e.target.checked
                      ? 'Background sync enabled.'
                      : 'Background sync disabled. Operating in safe direct mode.'
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

        {/* Emergency Data Recovery & Bulk CSV Import Hub */}
        <div className="bg-neutral-950 border-2 border-amber-500/80 p-6 space-y-6 relative rounded-lg">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-neutral-850 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black tracking-widest uppercase font-mono text-amber-400 flex items-center gap-1.5">
                <ShieldAlert size={13} className="text-amber-400" />
                Emergency Data Recovery & Bulk Import Hub
              </span>
              <h4 className="text-base font-black uppercase text-white tracking-tight font-mono flex items-center gap-2">
                <UploadCloud size={18} className="text-amber-400" />
                Roster & Financial Records Restoration Center
              </h4>
              <p className="text-xs text-neutral-400 leading-relaxed font-semibold max-w-3xl">
                Easily restore missing Nursery pupils (all 113+ enrolled pupils), past 7+ weeks of daily school fee records, and exam fee payments using 1-Click Browser Cache Sync or Bulk CSV importers.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
              <span className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 text-neutral-300 font-bold">
                Active Pupils: <strong className="text-amber-400">{students.length}</strong>
              </span>
              <span className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 text-neutral-300 font-bold">
                Fee Payments: <strong className="text-emerald-400">{payments.length}</strong>
              </span>
            </div>
          </div>

          {/* Tab Selector Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
            <button
              type="button"
              onClick={() => setRecoveryTab('cache')}
              className={`p-3 text-xs font-bold uppercase tracking-wider border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
                recoveryTab === 'cache'
                  ? 'bg-amber-400 text-black border-amber-400 font-black'
                  : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <span>⚡ 1-Click Cache Sync</span>
              {idbCounts && <span className="text-[10px] px-2 py-0.5 bg-black/20 rounded font-black">{idbCounts.students} studs</span>}
            </button>

            <button
              type="button"
              onClick={() => setRecoveryTab('students')}
              className={`p-3 text-xs font-bold uppercase tracking-wider border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
                recoveryTab === 'students'
                  ? 'bg-amber-400 text-black border-amber-400 font-black'
                  : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <span>👥 Import Pupils CSV</span>
              <Users size={14} />
            </button>

            <button
              type="button"
              onClick={() => setRecoveryTab('payments')}
              className={`p-3 text-xs font-bold uppercase tracking-wider border-2 text-left transition-all cursor-pointer flex items-center justify-between ${
                recoveryTab === 'payments'
                  ? 'bg-amber-400 text-black border-amber-400 font-black'
                  : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <span>💳 Import Fee Payments CSV</span>
              <FileText size={14} />
            </button>
          </div>

          {/* TAB 1: Browser Cache Sync */}
          {recoveryTab === 'cache' && (
            <div className="bg-neutral-900 border border-neutral-800 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <h5 className="text-sm font-black uppercase text-white font-mono flex items-center gap-2">
                    <HardDrive size={16} className="text-amber-400" />
                    Browser IndexedDB Local Cache Diagnostic
                  </h5>
                  <p className="text-xs text-neutral-400 font-medium">
                    Scans local browser storage for cached pupil rosters and payment transactions. Syncing merges any cached items directly into active memory and server storage.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSyncFromIndexedDBCache}
                  disabled={isProcessingRecovery}
                  className="px-5 py-2.5 bg-amber-400 hover:bg-amber-350 text-black font-black uppercase text-xs tracking-wider font-mono transition-all cursor-pointer border-2 border-amber-500 disabled:opacity-50 shrink-0"
                >
                  {isProcessingRecovery ? 'Syncing...' : '⚡ Restore From Browser Cache'}
                </button>
              </div>

              {idbCounts && (
                <div className="grid grid-cols-3 gap-3 font-mono text-xs pt-2">
                  <div className="bg-neutral-950 p-3 border border-neutral-800 text-center">
                    <span className="text-[10px] text-neutral-500 uppercase block font-bold">Cached Students</span>
                    <strong className="text-base text-amber-400">{idbCounts.students}</strong>
                  </div>
                  <div className="bg-neutral-950 p-3 border border-neutral-800 text-center">
                    <span className="text-[10px] text-neutral-500 uppercase block font-bold">Cached Payments</span>
                    <strong className="text-base text-emerald-400">{idbCounts.payments}</strong>
                  </div>
                  <div className="bg-neutral-950 p-3 border border-neutral-800 text-center">
                    <span className="text-[10px] text-neutral-500 uppercase block font-bold">Cached Exam Records</span>
                    <strong className="text-base text-blue-400">{idbCounts.examsPayments}</strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Import Pupils CSV */}
          {recoveryTab === 'students' && (
            <div className="bg-neutral-900 border border-neutral-800 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-1">
                  <h5 className="text-sm font-black uppercase text-white font-mono flex items-center gap-2">
                    <Users size={16} className="text-amber-400" />
                    Bulk Enroll / Restore Nursery & School Pupils (CSV / Text)
                  </h5>
                  <p className="text-xs text-neutral-400 font-medium">
                    Upload or paste CSV rows containing pupil enrollments (Name, Class, Gender, Guardian Name, Guardian Phone).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={downloadSampleStudentsCSV}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-amber-400 border border-neutral-700 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Download size={13} /> Sample CSV Template
                </button>
              </div>

              <div className="space-y-2">
                <textarea
                  rows={5}
                  value={studentsCsvInput}
                  onChange={(e) => setStudentsCsvInput(e.target.value)}
                  placeholder={`Paste CSV data here, for example:\nKwame Addo,Nursery,Male,Kofi Addo,0240001122\nAbena Mensah,Nursery,Female,Ama Mensah,0240003344\nEsi Baah,KG1,Female,Akwasi Baah,0240007788`}
                  className="w-full bg-neutral-950 border-2 border-neutral-800 p-3 text-xs font-mono font-medium text-white placeholder-neutral-600 focus:outline-none focus:border-amber-400"
                />

                <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                  <label className="px-4 py-2 bg-neutral-850 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer">
                    <Upload size={13} /> Select .CSV File
                    <input
                      type="file"
                      accept=".csv,.txt"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setStudentsCsvInput(ev.target?.result as string || '');
                        };
                        reader.readAsText(file);
                      }}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => handleImportStudentsCSV(studentsCsvInput)}
                    disabled={isProcessingRecovery || !studentsCsvInput.trim()}
                    className="w-full sm:w-auto px-6 py-2.5 bg-amber-400 hover:bg-amber-350 text-black font-black uppercase text-xs tracking-widest font-mono transition-all cursor-pointer border-2 border-amber-500 disabled:opacity-50"
                  >
                    {isProcessingRecovery ? 'Processing...' : '🚀 Enroll / Restore Pupils CSV'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Import Fee Payments CSV */}
          {recoveryTab === 'payments' && (
            <div className="bg-neutral-900 border border-neutral-800 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-1">
                  <h5 className="text-sm font-black uppercase text-white font-mono flex items-center gap-2">
                    <FileText size={16} className="text-amber-400" />
                    Restore Past 7+ Weeks Daily Fee Payments & Exam Fees
                  </h5>
                  <p className="text-xs text-neutral-400 font-medium">
                    Upload or paste recorded school fees and exam payments to restore historical records across all previous weeks.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={downloadSamplePaymentsCSV}
                    className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-emerald-400 border border-neutral-700 font-mono text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Download size={12} /> Daily Fees Template
                  </button>
                  <button
                    type="button"
                    onClick={downloadSampleExamsCSV}
                    className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-blue-400 border border-neutral-700 font-mono text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Download size={12} /> Exam Fees Template
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Daily School Fees Panel */}
                <div className="space-y-2 border border-neutral-800 p-3.5 bg-neutral-950">
                  <span className="text-[10px] font-extrabold uppercase font-mono text-emerald-400 block">
                    Daily School Fees CSV (7+ Weeks Records)
                  </span>
                  <textarea
                    rows={4}
                    value={paymentsCsvInput}
                    onChange={(e) => setPaymentsCsvInput(e.target.value)}
                    placeholder={`Date, Student Name or ID, Class, Amount Paid, Payment Method, Payer\n2026-05-25, Kwame Addo, Nursery, 5, Cash, Kofi Addo`}
                    className="w-full bg-neutral-900 border border-neutral-800 p-2 text-[11px] font-mono font-medium text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-mono font-bold uppercase text-neutral-400 hover:text-white cursor-pointer underline">
                      Upload .CSV File
                      <input
                        type="file"
                        accept=".csv,.txt"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => setPaymentsCsvInput(ev.target?.result as string || '');
                          reader.readAsText(file);
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => handleImportPaymentsCSV(paymentsCsvInput, false)}
                      disabled={isProcessingRecovery || !paymentsCsvInput.trim()}
                      className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-[11px] tracking-wider font-mono transition-all cursor-pointer disabled:opacity-50"
                    >
                      Restore Daily Fees
                    </button>
                  </div>
                </div>

                {/* Exam Fee Payments Panel */}
                <div className="space-y-2 border border-neutral-800 p-3.5 bg-neutral-950">
                  <span className="text-[10px] font-extrabold uppercase font-mono text-blue-400 block">
                    Exam Fee Payments CSV
                  </span>
                  <textarea
                    rows={4}
                    value={examsCsvInput}
                    onChange={(e) => setExamsCsvInput(e.target.value)}
                    placeholder={`Date, Student Name or ID, Class, Amount Paid, Payment Method\n2026-05-20, Kwame Addo, Nursery, 20, Cash`}
                    className="w-full bg-neutral-900 border border-neutral-800 p-2 text-[11px] font-mono font-medium text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-mono font-bold uppercase text-neutral-400 hover:text-white cursor-pointer underline">
                      Upload .CSV File
                      <input
                        type="file"
                        accept=".csv,.txt"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => setExamsCsvInput(ev.target?.result as string || '');
                          reader.readAsText(file);
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => handleImportPaymentsCSV(examsCsvInput, true)}
                      disabled={isProcessingRecovery || !examsCsvInput.trim()}
                      className="px-4 py-1.5 bg-blue-500 hover:bg-blue-400 text-black font-black uppercase text-[11px] tracking-wider font-mono transition-all cursor-pointer disabled:opacity-50"
                    >
                      Restore Exam Fees
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
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



          {/* Automated Term Transition Carry-Forward Banner */}
          <div className="p-4 bg-indigo-950/40 border-2 border-indigo-800/80 rounded flex flex-col md:flex-row items-center justify-between gap-4 font-mono">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider font-mono">Academic Term Transition Maintenance</span>
              <h5 className="text-sm font-bold uppercase text-white font-mono flex items-center gap-2">
                <RefreshCw size={15} className="text-indigo-400" />
                <span>Automated Term Balances Carry-Forward</span>
              </h5>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                Calculates each active pupil's remaining unpaid term fee balance and converts it into their <strong className="text-amber-400">Legacy Debt</strong> balance for the next term, preserving all historical unpaid balances.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0 font-mono">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmDetails({
                    title: "TERM TRANSITION CARRY-FORWARD",
                    subtitle: "Calculates unpaid balances and resets active term daily logs.",
                    affectedCountMessage: "Converts remaining unpaid balances into Legacy Debt for the next term.",
                    whatWillBeDeleted: [
                      "Active term daily check-in and payment logs (converted into legacy arrear balance)",
                      "Current term active ledger session state"
                    ],
                    whatWillBePreserved: [
                      "Each pupil's overall financial balance (safely moved to Legacy Debt)",
                      `All ${students.length} registered pupil profiles & class assignments`,
                      "Exams fee payments & expense records"
                    ],
                    verificationText: "TRANSITION",
                    confirmButtonText: "CONFIRM TERM CARRY-FORWARD",
                    onConfirm: () => {
                      const res = carryForwardTermBalances({ resetPaymentsForNewTerm: true });
                      setDeleteConfirmDetails(null);
                      showToast(res.message);
                    },
                    onCancel: () => setDeleteConfirmDetails(null)
                  });
                }}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md rounded-sm"
              >
                Execute Carry-Forward (Reset Term Logs)
              </button>
            </div>
          </div>

          {/* Teacher Hard-Copy Reconciliation & Duplicate Audit Center */}
          <div className="p-4 bg-amber-950/30 border-2 border-amber-500/80 rounded flex flex-col md:flex-row items-center justify-between gap-4 font-mono">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-1">
                <ShieldAlert size={12} /> Physical Hard-Copy Verification Center
              </span>
              <h5 className="text-sm font-bold uppercase text-white font-mono flex items-center gap-2">
                <ShieldAlert size={15} className="text-amber-400" />
                <span>Pupil Payments Hard-Copy Reconciliation & Duplicate Audit</span>
              </h5>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                Audits all same-day multi-payment records side-by-side. Differentiates true network sync ghosts from legitimate multiple installments recorded in teachers' physical hard-copy paper receipt booklets before purging.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0 font-mono">
              <button
                type="button"
                onClick={() => setShowReconciliationModal(true)}
                className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-black text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md rounded-sm flex items-center gap-1.5 border-2 border-amber-500"
              >
                <ShieldAlert size={14} className="stroke-[2.5]" />
                <span>🔍 Open Reconciliation Center</span>
              </button>
            </div>
          </div>

          {/* Clean Out-of-Term, Post-Term & Duplicate Payments Banner */}
          <div className="p-4 bg-rose-950/40 border-2 border-rose-800/80 rounded flex flex-col md:flex-row items-center justify-between gap-4 font-mono">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider font-mono">Ledger Boundary & Duplicate Cleanup</span>
              <h5 className="text-sm font-bold uppercase text-white font-mono flex items-center gap-2">
                <Trash2 size={15} className="text-rose-400" />
                <span>Clean Post-Term (Beyond Term End Date) & Duplicate Payment Records</span>
              </h5>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                Scans all class payment logs to detect and permanently remove duplicate payment records on the same day, public holiday entries, and post-term entries logged beyond the term end date (e.g. after July 29, 2026).
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0 font-mono">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmDetails({
                    title: "PURGE POST-TERM & DUPLICATE LOGS",
                    subtitle: "Removes out-of-term payments and repeated same-day entries.",
                    affectedCountMessage: "Scans class registers and purges invalid dates and repeated entries.",
                    whatWillBeDeleted: [
                      "Payment entries recorded on dates beyond official term end dates",
                      "Duplicate payment submissions recorded for the same pupil on the same date"
                    ],
                    whatWillBePreserved: [
                      "Primary valid daily fee payment records logged within active term dates",
                      "Exams fee payment entries & expense logs",
                      "Registered pupil profiles"
                    ],
                    verificationText: "PURGE",
                    confirmButtonText: "CONFIRM PURGE POST-TERM & DUPLICATES",
                    onConfirm: () => {
                      const res = purgeClassOutOfTermAndDuplicates();
                      setDeleteConfirmDetails(null);
                      showToast(res.message);
                    },
                    onCancel: () => setDeleteConfirmDetails(null)
                  });
                }}
                className="px-4 py-2.5 bg-rose-700 hover:bg-rose-600 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md rounded-sm flex items-center gap-1.5"
              >
                <span>🧹 Purge Post-Term & Duplicates</span>
              </button>
            </div>
          </div>

          {/* Delete Specific Class Fee Records (e.g. B5 Week 1 to Final Week) */}
          <div className="p-4 bg-red-950/60 border-2 border-red-500/90 rounded flex flex-col md:flex-row items-center justify-between gap-4 font-mono">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider font-mono flex items-center gap-1">
                <Trash2 size={12} /> Target Class Administrative Wipe Tool
              </span>
              <h5 className="text-sm font-bold uppercase text-white font-mono flex items-center gap-2">
                <Trash2 size={15} className="text-red-400" />
                <span>Delete Entire Class Fee Records (e.g. B5 Week 1 to Final Week)</span>
              </h5>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                Wipe fee payment records for a specific class cohort (e.g. B5) across the full term, specific weeks, or custom date ranges while pupil profiles, student registers, and other classes remain 100% intact. An automatic snapshot backup is created before deletion.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0 font-mono">
              <button
                type="button"
                onClick={() => setShowClearClassFeesModal(true)}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md rounded-sm flex items-center gap-1.5 border border-red-400"
              >
                <Trash2 size={14} className="stroke-[2.5]" />
                <span>🗑️ Delete Class Fee Records</span>
              </button>
            </div>
          </div>

          {/* Purge All Daily Payments Only Banner */}
          <div className="p-4 bg-red-950/50 border-2 border-red-700/80 rounded flex flex-col md:flex-row items-center justify-between gap-4 font-mono">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider font-mono">Daily Fee Ledger Wipe</span>
              <h5 className="text-sm font-bold uppercase text-white font-mono flex items-center gap-2">
                <Trash2 size={15} className="text-red-400" />
                <span>Purge All Daily Fee Payments (All Classes)</span>
              </h5>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                Deletes all daily fee payment logs across all class registers. <strong className="text-emerald-400">Exams fee payments and expense records remain untouched and completely safe.</strong>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0 font-mono">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmDetails({
                    title: "PURGE ALL DAILY FEE PAYMENTS",
                    subtitle: "Wipes all daily fee check-in logs across all class registers.",
                    affectedCountMessage: `Action will delete all ${payments.length} daily fee payment entries currently stored in the database.`,
                    whatWillBeDeleted: [
                      `All ${payments.length} daily fee payment records across all class registers`,
                      "All daily check-in marks, absences, and custom daily fee adjustments"
                    ],
                    whatWillBePreserved: [
                      "Exams fee payment records & terminal exam balances",
                      "School expense logs & budget targets",
                      `All ${students.length} registered pupil profiles & class assignments`,
                      "Staff & user login accounts",
                      "Term configuration settings"
                    ],
                    verificationText: "DELETE",
                    confirmButtonText: "YES, PURGE ALL DAILY PAYMENTS NOW",
                    onConfirm: () => {
                      clearAllPayments();
                      setDeleteConfirmDetails(null);
                      showToast("✅ Successfully purged all daily fee payments for all classes!");
                    },
                    onCancel: () => setDeleteConfirmDetails(null)
                  });
                }}
                className="px-4 py-2.5 bg-red-800 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md rounded-sm flex items-center gap-1.5"
              >
                <span>🗑️ Purge Daily Payments Only</span>
              </button>
            </div>
          </div>
        </div>

        {/* Reset App Ledger / Factory Reset System Utility */}
        <div className="bg-neutral-950 border-2 border-amber-500/80 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative shadow-lg">
          <div className="space-y-1.5 max-w-2xl">
            <span className="text-[10px] font-black tracking-widest uppercase font-mono text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 inline-block">
              1-Click Instant Data Recovery
            </span>
            <h4 className="text-base sm:text-lg font-black uppercase text-white leading-tight font-mono flex items-center gap-2">
              <RefreshCw size={18} className="text-amber-400" />
              Restore All Registered Pupils & Ledger Data
            </h4>
            <p className="text-xs text-neutral-300 leading-relaxed font-semibold">
              Instantly recovers all registered student profiles (Nursery to JHS B9), class assignments, roll numbers, fee payment history, and term configurations.
            </p>
          </div>
          <div className="w-full md:w-auto shrink-0">
            <button
              type="button"
              onClick={() => {
                setDeleteConfirmDetails({
                  title: "RESTORE SYSTEM LEDGER DATA",
                  subtitle: "Reloads default clean student roster and initializes registers.",
                  affectedCountMessage: "Resets transient unsaved local changes and restores registered roster.",
                  whatWillBeDeleted: [
                    "Transient unsaved local session adjustments"
                  ],
                  whatWillBePreserved: [
                    "System database backup snapshots automatically saved prior to execution",
                    "User accounts & staff setup"
                  ],
                  verificationText: "RESTORE",
                  confirmButtonText: "CONFIRM DATA RESTORE NOW",
                  onConfirm: () => {
                    resetData();
                    setDeleteConfirmDetails(null);
                    showToast('✅ Successfully restored all registered pupils and ledger data!');
                  },
                  onCancel: () => setDeleteConfirmDetails(null)
                });
              }}
              className="w-full md:w-auto py-3.5 px-6 text-xs font-black bg-amber-400 hover:bg-amber-300 text-black border-2 border-amber-400 uppercase tracking-widest cursor-pointer transition-all font-mono shadow-md flex items-center justify-center gap-2"
            >
              <Sparkles size={16} className="stroke-[2.5]" />
              <span>RESTORE DATA NOW</span>
            </button>
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

      {/* Render DeleteConfirmationModal */}
      <DeleteConfirmationModal details={deleteConfirmDetails} />

      {/* Duplicate Payment Audit & Hard-Copy Reconciliation Modal */}
      <DuplicateReconciliationModal
        isOpen={showReconciliationModal}
        onClose={() => setShowReconciliationModal(false)}
      />

      {/* Delete Entire Class Fees Modal */}
      <ClearClassFeesModal
        isOpen={showClearClassFeesModal}
        onClose={() => setShowClearClassFeesModal(false)}
      />
    </div>
  );
};
