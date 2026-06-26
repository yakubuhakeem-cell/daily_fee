/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Student, PaymentRecord, UserAccount, UserRole, StudentClass, SchoolCategory, Term, PendingEdit, BackupRecord, Expense, ExpenseCategory, PaymentMethod, WorkerSalary, SystemSettings, BudgetTarget } from '../types';
import { INITIAL_USERS, INITIAL_STUDENTS, generateSeedPayments, getClassCategory } from '../initialData';
import { db as rawDb } from '../lib/firebase';
import { generateSchoolDays } from '../utils/termUtils';


// Safe wrapper over browser's localStorage to prevent QuotaExceededError and sandbox blocking from crashing the application.
const localStorage = {
  getItem(key: string): string | null {
    try {
      return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    } catch (e) {
      console.warn(`[LocalStorage Read Warning] Key "${key}":`, e);
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.error(`[LocalStorage Write Error] Exceeded quota or blocked for key "${key}":`, e);
    }
  },
  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(`[LocalStorage Remove Warning] Key "${key}":`, e);
    }
  },
  clear(): void {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.clear();
      }
    } catch (e) {
      console.warn(`[LocalStorage Clear Warning]`, e);
    }
  }
};

let globalOnSaveProgress: ((change: number) => void) | null = null;

// Clean Proxy wrapper over firebaseDb services to automatically intercept writes, deletes, and seeds,
// triggering satisfying visual 'Saving...' and 'Saved' UI feedback indicators dynamically.
const db = new Proxy(rawDb, {
  get(target, prop, receiver) {
    const originalMethod = Reflect.get(target, prop, receiver);
    if (typeof originalMethod === 'function') {
      const methodName = String(prop);
      if (
        methodName.startsWith('save') || 
        methodName.startsWith('delete') || 
        methodName.startsWith('seed')
      ) {
        return async (...args: any[]) => {
          globalOnSaveProgress?.(+1);
          try {
            const result = await originalMethod.apply(target, args);
            globalOnSaveProgress?.(-1);
            return result;
          } catch (err) {
            globalOnSaveProgress?.(-1);
            throw err;
          }
        };
      }
    }
    return originalMethod;
  }
});

interface AppContextType {
  currentUser: UserAccount | null;
  users: UserAccount[];
  students: Student[];
  payments: PaymentRecord[];
  terms: Term[];
  activeTerm: Term | null;
  addTerm: (name: string, startDate: string, daysCount: number, isActive?: boolean) => void;
  editTerm: (termId: string, name: string, startDate: string, daysCount: number, isActive?: boolean) => void;
  setActiveTerm: (termId: string) => void;
  deleteTerm: (termId: string) => void;
  addPublicHoliday: (termId: string, date: string) => void;
  removePublicHoliday: (termId: string, date: string) => void;
  currentDate: string; // YYYY-MM-DD format
  setCurrentDate: (date: string) => void;
  login: (email: string, mfaCode?: string, password?: string) => { success: boolean; requiresMfa?: boolean; requiresPassword?: boolean; error?: string };
  logout: () => void;
  toggleMfaForUser: (userId: string) => void;
  addStudent: (name: string, className: StudentClass, guardianPhone?: string, photoUrl?: string, discount?: number, gender?: 'Male' | 'Female', paymentType?: 'Daily' | 'Term', termFee?: number, legacyDebt?: number) => void;
  updateStudent: (student: Student) => void;
  deleteStudent: (studentId: string) => void;
  purgeDeactivatedStudents: () => void;
  promoteAllStudents: () => void;
  recordPayment: (studentId: string, verified?: boolean, customAmount?: number, customNotes?: string, allowDuplicate?: boolean) => void;
  recordPresentZeroPay: (studentId: string) => void;
  recordAbsent: (studentId: string) => void;
  recordAdvancePayment: (studentId: string, amount: number, verified?: boolean) => void;
  recordBackwardPayment: (studentId: string, amount: number, verified?: boolean) => void;
  bulkRecordPayments: (studentIds: string[], verified?: boolean, customAmount?: number) => void;
  recordPupilBulkDates: (studentId: string, dates: string[], actionType: 'paid' | 'absent' | 'present_zero' | 'clear', customAmount?: number) => void;
  verifyPayment: (paymentId: string) => void;
  deletePayment: (paymentId: string) => void;
  clearDailyPaymentsForClass: (classId: StudentClass, date: string) => void;
  deleteStudentPayments: (studentId: string) => void;
  adjustPayment: (paymentId: string, updatedAmount: number, updatedIsAbsent: boolean, notes: string, reason: string) => void;
  registerStaff: (name: string, email: string, role: UserRole, assignedClass?: StudentClass, mfaEnabled?: boolean, passwordEnabled?: boolean, password?: string, assignedClasses?: StudentClass[], stipendSalary?: number, momoNumber?: string, momoName?: string) => { success: boolean; error?: string };
  updateStaff: (userId: string, name: string, email: string, role: UserRole, assignedClass?: StudentClass, mfaEnabled?: boolean, passwordEnabled?: boolean, password?: string, assignedClasses?: StudentClass[], stipendSalary?: number, momoNumber?: string, momoName?: string) => { success: boolean; error?: string };
  deleteStaff: (userId: string) => { success: boolean; error?: string };
  toggleStaffActive: (userId: string) => { success: boolean; error?: string };
  getDailyStats: (date: string) => DailyStats;
  getTeacherMetrics: (date: string) => TeacherMetric[];
  getCashFlowTrend: () => CashFlowTrendPoint[];
  getPendingAlerts: (date: string) => PendingAlert[];
  sendMonthlyEmailDraft: (email: string) => { success: boolean; message: string; draftContent: string };
  resetData: () => void;
  clearSampleStudents: () => void;
  clearAllPayments: () => void;
  firebaseConnected: boolean;
  firebaseError: string | null;
  retryFirebaseConnection: () => Promise<void>;
  seedFirebaseFromLocal: () => Promise<{ success: boolean; message: string }>;
  storageMode: 'cloud' | 'local';
  setStorageMode: (mode: 'cloud' | 'local') => void;
  bgSyncEnabled: boolean;
  setBgSyncEnabled: (enabled: boolean) => void;
  bgSyncStatus: 'idle' | 'syncing' | 'success' | 'error';
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  lastBgSyncTime: string | null;
  pendingLocalEdits: PendingEdit[];
  clearPendingLocalEdits: () => void;
  backups: BackupRecord[];
  createBackup: (label?: string, isAuto?: boolean) => void;
  restoreBackup: (backupId: string) => void;
  deleteBackup: (backupId: string) => void;
  clearAllBackups: () => void;
  audioMuted: boolean;
  setAudioMuted: (muted: boolean) => void;
  playFeedbackSound: (type: 'success' | 'error' | 'warning') => void;
  theme: 'dark' | 'daylight';
  setTheme: (theme: 'dark' | 'daylight') => void;
  expenses: Expense[];
  salaries: WorkerSalary[];
  addExpense: (amount: number, category: ExpenseCategory, description: string, approvedBy: string, date: string) => void;
  deleteExpense: (expenseId: string) => void;
  addSalary: (
    workerName: string,
    role: string,
    baseSalary: number,
    allowance: number,
    deduction: number,
    paymentMethod: PaymentMethod,
    monthYear: string,
    date: string,
    notes?: string,
    userId?: string,
    momoNumber?: string,
    momoName?: string,
    ssnitDeduction?: number,
    incomeTaxDeduction?: number,
    welfareDeduction?: number,
    healthInsDeduction?: number,
    responsibilityAllowance?: number,
    transportAllowance?: number,
    rentAllowance?: number,
    momoFeeAbsorbed?: number
  ) => void;
  deleteSalary: (salaryId: string) => void;
  whatsappLogs: any[];
  sendautomatedWhatsApp: (phone: string, message: string, studentId?: string, studentName?: string, type?: string) => Promise<{ success: boolean; log?: any; error?: string }>;
  fetchWhatsappLogs: () => Promise<void>;
  systemSettings: SystemSettings;
  updateSystemSettings: (newSettings: Partial<SystemSettings>) => Promise<boolean>;
  autoSendCheckInAlert: boolean;
  setAutoSendCheckInAlert: (enabled: boolean) => void;
  autoSendArrearsAlert: boolean;
  setAutoSendArrearsAlert: (enabled: boolean) => void;
  budgetTargets: BudgetTarget[];
  addBudgetTarget: (itemName: string, targetAmount: number, savedPercentage: number, description?: string, category?: string) => Promise<void>;
  updateBudgetTarget: (target: BudgetTarget) => Promise<void>;
  deleteBudgetTarget: (targetId: string) => Promise<void>;
}

export interface DailyStats {
  totalCollected: number;
  totalExpected: number;
  paidCount: number;
  pendingCount: number;
  absentCount?: number;
  collectionRate: number; // percentage
  byCategory: Record<SchoolCategory, number>;
  byClass: Record<StudentClass, number>;
}

export interface TeacherMetric {
  teacherName: string;
  className: StudentClass;
  category: SchoolCategory;
  studentsCount: number;
  paidCount: number;
  collected: number;
  rate: number;
}

export interface CashFlowTrendPoint {
  date: string;
  formattedDate: string;
  amount: number;
  transactions: number;
}

export interface PendingAlert {
  studentId: string;
  studentName: string;
  class: StudentClass;
  category: SchoolCategory;
  guardianPhone: string;
}

export function calculateStudentFinancialState(
  student: Student,
  payments: PaymentRecord[],
  activeTerm: Term | null,
  currentDate: string,
  baselineDailyFee?: number
) {
  const baseDailyFee = baselineDailyFee ?? 5.00;
  if (student.paymentType === 'Term') {
    const termFee = student.termFee || 350;
    const legacyDebt = student.legacyDebt || 0;
    const totalTarget = termFee + legacyDebt;
    const studentPayments = payments.filter(p => p.studentId === student.id);
    const totalPaid = studentPayments
      .filter(p => !p.isAbsent)
      .reduce((sum, p) => sum + p.amount, 0);
    const runningBalance = totalPaid - totalTarget;
    const isCheckedInToday = studentPayments.some(p => p.date === currentDate && !p.isAbsent);
    return {
      paymentType: 'Term' as const,
      runningBalance,
      totalRequired: totalTarget,
      totalPaid,
      pastUnpaidDays: [] as string[],
      isPaidToday: isCheckedInToday,
      totalDebt: runningBalance < 0 ? Math.abs(runningBalance) : 0,
      prepaidDaysCount: 0
    };
  }

  const dailyRate = Math.max(0.01, baseDailyFee - (student.discount || 0));
  const studentPayments = payments.filter(p => p.studentId === student.id);

  if (!activeTerm || !activeTerm.schoolDays) {
    return {
      paymentType: 'Daily' as const,
      runningBalance: 0,
      totalRequired: 0,
      totalPaid: 0,
      pastUnpaidDays: [] as string[],
      isPaidToday: false,
      totalDebt: 0,
      prepaidDaysCount: 0
    };
  }

  const holidays = activeTerm.publicHolidays || [];
  // Get all school days in the active term up to currentDate (inclusive)
  const schoolDaysUpToToday = activeTerm.schoolDays.filter(d => d <= currentDate && !holidays.includes(d));

  // Filter days where the student was NOT absent
  const billableDays = schoolDaysUpToToday.filter(dStr => {
    const isAbsent = studentPayments.some(p => p.date === dStr && p.isAbsent);
    return !isAbsent;
  });

  const totalPaid = studentPayments
    .filter(p => !p.isAbsent)
    .reduce((sum, p) => sum + p.amount, 0);

  const totalRequired = billableDays.length * dailyRate;
  const runningBalance = totalPaid - totalRequired;

  // Calculate which specific days are unpaid/covered chronologically using the sequential pool
  let runningPaid = totalPaid;
  const unpaidDaysList: string[] = [];
  const coveredDaysList: string[] = [];

  billableDays.forEach(dStr => {
    if (runningPaid + 0.005 >= dailyRate) {
      runningPaid -= dailyRate;
      coveredDaysList.push(dStr);
    } else {
      runningPaid = 0;
      unpaidDaysList.push(dStr);
    }
  });

  // Is today paid/covered?
  const isHolidayToday = holidays.includes(currentDate);
  const isAbsentToday = studentPayments.some(p => p.date === currentDate && p.isAbsent);
  const isTodayBillable = !isHolidayToday && !isAbsentToday && activeTerm.schoolDays.includes(currentDate);

  const isPaidToday = !isTodayBillable || coveredDaysList.includes(currentDate);

  const remainingSurplus = runningPaid;
  const prepaidDaysCount = Math.floor((remainingSurplus + 0.005) / dailyRate);

  const pastUnpaidDays = unpaidDaysList.filter(d => d < currentDate);

  return {
    paymentType: 'Daily' as const,
    runningBalance,
    totalRequired,
    totalPaid,
    pastUnpaidDays,
    isPaidToday,
    totalDebt: runningBalance < 0 ? Math.abs(runningBalance) : 0,
    prepaidDaysCount
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Defaults dynamically to today's real date, ensuring the current date is the active fee collection day
  const [currentDate, setCurrentDate] = useState<string>(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    if (yyyy === 2026) {
      return todayStr;
    }
    return '2026-06-08'; // Default fallback to current local date
  });
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [salaries, setSalaries] = useState<WorkerSalary[]>([]);
  const [whatsappLogs, setWhatsappLogs] = useState<any[]>([]);
  const [budgetTargets, setBudgetTargets] = useState<BudgetTarget[]>([]);

  const DEFAULT_SETTINGS: SystemSettings = {
    schoolName: "SAAKO HOLY CHILD ACADEMY",
    systemName: "FEETRACK",
    schoolLogoUrl: "",
    baselineDailyFee: 5.00,
    baselineTermFee: 350.00,
    currencyCode: "GHC",
    customMotto: "Holiness Is Our Key",
    customLocation: "Sawla",
    autoSendCheckInAlert: false,
    autoSendArrearsAlert: false,
    primaryColor: "#fbbf24"
  };

  const [systemSettings, setSystemSettingsState] = useState<SystemSettings>(() => {
    try {
      const saved = localStorage.getItem('s_system_settings');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Failed parsing local system settings: ", e);
    }
    return DEFAULT_SETTINGS;
  });

  const updateSystemSettings = async (newSettings: Partial<SystemSettings>): Promise<boolean> => {
    const updated = { ...systemSettings, ...newSettings };
    setSystemSettingsState(updated);
    localStorage.setItem('s_system_settings', JSON.stringify(updated));

    try {
      const success = await db.saveSystemSettings(updated);
      return success;
    } catch (e) {
      console.error("Failed to save system settings:", e);
      return false;
    }
  };

  const activeTerm = terms.find(t => t.active) || null;

  const [storageMode, setStorageModeState] = useState<'cloud' | 'local'>(() => {
    const saved = localStorage.getItem('s_storage_preference');
    if (saved === 'cloud' || saved === 'local') return saved;
    // Default to cloud sync if Firebase config is active and detected
    return db.isActive() ? 'cloud' : 'local';
  });

  const [firebaseConnected, setFirebaseConnected] = useState<boolean>(db.isActive() && storageMode === 'cloud');
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  const setStorageMode = (mode: 'cloud' | 'local') => {
    localStorage.setItem('s_storage_preference', mode);
    setStorageModeState(mode);
  };

  const [audioMuted, setAudioMutedState] = useState<boolean>(() => {
    return localStorage.getItem('s_audio_muted') === 'true';
  });

  const setAudioMuted = (muted: boolean) => {
    localStorage.setItem('s_audio_muted', String(muted));
    setAudioMutedState(muted);
  };

  const [theme, setThemeState] = useState<'dark' | 'daylight'>(() => {
    const saved = localStorage.getItem('s_theme');
    return (saved === 'dark' || saved === 'daylight') ? saved : 'dark';
  });

  const setTheme = (t: 'dark' | 'daylight') => {
    localStorage.setItem('s_theme', t);
    setThemeState(t);
  };

  useEffect(() => {
    const primaryColor = systemSettings?.primaryColor || '#fbbf24';
    
    // Simple helper to get darker shade for hover/active states
    const getHoverColor = (hex: string): string => {
      let cleaned = hex.replace('#', '');
      if (cleaned.length === 3) {
        cleaned = cleaned.split('').map(c => c + c).join('');
      } else if (cleaned.length !== 6) {
        return '#d97706'; // fallback to standard dark amber
      }
      let r = parseInt(cleaned.substring(0, 2), 16);
      let g = parseInt(cleaned.substring(2, 4), 16);
      let b = parseInt(cleaned.substring(4, 6), 16);

      r = Math.max(0, Math.min(255, Math.round(r * 0.85)));
      g = Math.max(0, Math.min(255, Math.round(g * 0.85)));
      b = Math.max(0, Math.min(255, Math.round(b * 0.85)));

      const rs = r.toString(16).padStart(2, '0');
      const gs = g.toString(16).padStart(2, '0');
      const bs = b.toString(16).padStart(2, '0');

      return `#${rs}${gs}${bs}`;
    };

    const hoverColor = getHoverColor(primaryColor);

    // Remove old style element if it exists
    const existingStyle = document.getElementById('dynamic-brand-styles');
    if (existingStyle) {
      existingStyle.remove();
    }

    // Create a new style element with comprehensive color override rules
    const styleEl = document.createElement('style');
    styleEl.id = 'dynamic-brand-styles';
    styleEl.innerHTML = `
      /* Dynamic dynamic-brand-styles */
      .bg-amber-400 {
        background-color: ${primaryColor} !important;
      }
      .text-amber-400 {
        color: ${primaryColor} !important;
      }
      .border-amber-400 {
        border-color: ${primaryColor} !important;
      }
      .selection\\:bg-amber-400::selection {
        background-color: ${primaryColor} !important;
        color: #000000 !important;
      }
      .hover\\:bg-amber-400:hover {
        background-color: ${primaryColor} !important;
      }
      .hover\\:text-amber-400:hover {
        color: ${primaryColor} !important;
      }
      .hover\\:border-amber-400:hover {
        border-color: ${primaryColor} !important;
      }
      .focus\\:border-amber-400:focus {
        border-color: ${primaryColor} !important;
      }
      .hover\\:bg-amber-500:hover {
        background-color: ${hoverColor} !important;
      }
      .bg-amber-500 {
        background-color: ${hoverColor} !important;
      }
      .text-amber-500 {
        color: ${hoverColor} !important;
      }
      .border-amber-500 {
        border-color: ${hoverColor} !important;
      }
      .daylight .text-amber-400 {
         color: ${hoverColor} !important;
      }
      .focus\\:ring-amber-400:focus {
        --tw-ring-color: ${primaryColor} !important;
      }
    `;
    document.head.appendChild(styleEl);
  }, [systemSettings?.primaryColor]);

  const playFeedbackSound = (type: 'success' | 'error' | 'warning') => {
    if (audioMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      if (type === 'success') {
        const nowTime = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.type = 'sine';
        osc2.type = 'sine';

        osc1.frequency.setValueAtTime(523.25, nowTime); 
        osc2.frequency.setValueAtTime(659.25, nowTime + 0.08); 

        gainNode.gain.setValueAtTime(0.06, nowTime);
        gainNode.gain.exponentialRampToValueAtTime(0.005, nowTime + 0.25);

        osc1.start(nowTime);
        osc1.stop(nowTime + 0.15);

        osc2.start(nowTime + 0.08);
        osc2.stop(nowTime + 0.25);
      } else if (type === 'error') {
        const nowTime = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, nowTime);
        osc.frequency.linearRampToValueAtTime(90, nowTime + 0.25);

        gainNode.gain.setValueAtTime(0.08, nowTime);
        gainNode.gain.exponentialRampToValueAtTime(0.005, nowTime + 0.3);

        osc.start(nowTime);
        osc.stop(nowTime + 0.3);
      } else if (type === 'warning') {
        const nowTime = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(330, nowTime);
        gainNode.gain.setValueAtTime(0.06, nowTime);
        gainNode.gain.exponentialRampToValueAtTime(0.005, nowTime + 0.15);

        osc.start(nowTime);
        osc.stop(nowTime + 0.15);
      }
    } catch (e) {
      // Audio Context locked by browser policies before gesture
    }
  };

  const [pendingLocalEdits, setPendingLocalEdits] = useState<PendingEdit[]>(() => {
    const saved = localStorage.getItem('s_pending_local_edits');
    return saved ? JSON.parse(saved) : [];
  });

  const recordLocallyPendingEdit = (type: PendingEdit['type'], action: PendingEdit['action'], description: string) => {
    const isLocal = localStorage.getItem('s_storage_preference') === 'local' || storageMode === 'local';
    if (!isLocal) return; // only track on local mode
    const newEdit: PendingEdit = {
      id: 'edit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      type,
      action,
      description,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' • ' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
    setPendingLocalEdits(prev => {
      const nextEdits = [newEdit, ...prev];
      localStorage.setItem('s_pending_local_edits', JSON.stringify(nextEdits));
      return nextEdits;
    });
  };

  const clearPendingLocalEdits = () => {
    setPendingLocalEdits([]);
    localStorage.removeItem('s_pending_local_edits');
  };

  const [backups, setBackups] = useState<BackupRecord[]>(() => {
    const saved = localStorage.getItem('s_backups');
    return saved ? JSON.parse(saved) : [];
  });

  // Sync to refs for safe closure lookup in setInterval loop without re-triggering effect
  const studentsRef = React.useRef(students);
  const paymentsRef = React.useRef(payments);
  const usersRef = React.useRef(users);
  const termsRef = React.useRef(terms);

  useEffect(() => {
    studentsRef.current = students;
  }, [students]);

  useEffect(() => {
    paymentsRef.current = payments;
  }, [payments]);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  useEffect(() => {
    termsRef.current = terms;
  }, [terms]);

  const createBackup = (label?: string, isAuto = false) => {
    const now = new Date();
    const timestampString = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }) + ' at ' + now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    const currentStudents = studentsRef.current;
    const currentPayments = paymentsRef.current;
    const currentUsers = usersRef.current;
    const currentTerms = termsRef.current;

    const actualLabel = label || `${isAuto ? 'Automated Scheduled' : 'Manual'} Backup`;

    const newBackup: BackupRecord = {
      id: 'backup_' + now.getTime(),
      timestamp: timestampString,
      label: actualLabel,
      isAuto,
      counts: {
        students: currentStudents.length,
        payments: currentPayments.length,
        users: currentUsers.length,
        terms: currentTerms.length
      },
      data: {
        students: JSON.parse(JSON.stringify(currentStudents)),
        payments: JSON.parse(JSON.stringify(currentPayments)),
        users: JSON.parse(JSON.stringify(currentUsers)),
        terms: JSON.parse(JSON.stringify(currentTerms))
      }
    };

    setBackups(prev => {
      const next = [newBackup, ...prev].slice(0, 10);
      localStorage.setItem('s_backups', JSON.stringify(next));
      return next;
    });

    console.log(`[Backup System] Created local backup: ${actualLabel}`);
  };

  const restoreBackup = (backupId: string) => {
    const backup = backups.find(b => b.id === backupId);
    if (!backup) {
      console.warn(`[Backup System] Backup not found for id: ${backupId}`);
      return;
    }

    setStudents(backup.data.students);
    setPayments(backup.data.payments);
    setUsers(backup.data.users);
    setTerms(backup.data.terms);

    localStorage.setItem('s_students', JSON.stringify(backup.data.students));
    localStorage.setItem('s_payments', JSON.stringify(backup.data.payments));
    localStorage.setItem('s_users', JSON.stringify(backup.data.users));
    localStorage.setItem('s_terms', JSON.stringify(backup.data.terms));

    recordLocallyPendingEdit('bulk', 'update', `Restored system state from local backup: "${backup.label}"`);
  };

  const deleteBackup = (backupId: string) => {
    setBackups(prev => {
      const next = prev.filter(b => b.id !== backupId);
      localStorage.setItem('s_backups', JSON.stringify(next));
      return next;
    });
  };

  const clearAllBackups = () => {
    setBackups([]);
    localStorage.removeItem('s_backups');
  };

  // Background backup task - running every 30 minutes
  useEffect(() => {
    const intervalId = setInterval(() => {
      createBackup(undefined, true);
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(intervalId);
  }, []);

  const [bgSyncEnabled, setBgSyncEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem('s_background_sync_enabled');
    return saved === 'true'; // Defaults to false
  });
  const [bgSyncStatus, setBgSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [lastBgSyncTime, setLastBgSyncTime] = useState<string | null>(null);

  const [activeSavesCount, setActiveSavesCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // React to global proxy raw database event notifications
  useEffect(() => {
    globalOnSaveProgress = (change) => {
      setActiveSavesCount(prev => Math.max(0, prev + change));
    };
    return () => {
      globalOnSaveProgress = null;
    };
  }, []);

  // Manage transitional sync flow values for user-friendliness
  useEffect(() => {
    if (activeSavesCount > 0) {
      setSaveStatus('saving');
    } else {
      setSaveStatus(prev => {
        if (prev === 'saving') {
          return 'saved';
        }
        return prev;
      });
      const timeout = setTimeout(() => {
        setSaveStatus(prev => prev === 'saved' ? 'idle' : prev);
      }, 2500);
      return () => clearTimeout(timeout);
    }
  }, [activeSavesCount]);

  const setBgSyncEnabled = (enabled: boolean) => {
    localStorage.setItem('s_background_sync_enabled', String(enabled));
    setBgSyncEnabledState(enabled);
  };

  // Perform background synchronization with Firebase
  const performBackgroundSync = async () => {
    if (!db.isActive() || storageMode !== 'cloud' || !navigator.onLine) {
      return;
    }
    setBgSyncStatus('syncing');
    try {
      const [dbUsers, dbStudents, dbPayments, dbExpenses, dbSalaries, dbBudgetTargets] = await Promise.all([
        db.getUsers(),
        db.getStudents(),
        db.getPayments(),
        db.getExpenses(),
        db.getSalaries(),
        db.getBudgetTargets()
      ]);

      if (dbUsers === null || dbStudents === null || dbPayments === null || dbExpenses === null || dbSalaries === null || dbBudgetTargets === null) {
        setBgSyncStatus('error');
        return;
      }

      setUsers(dbUsers);
      setStudents(dbStudents);
      setPayments(dbPayments);
      setExpenses(dbExpenses);
      setSalaries(dbSalaries);
      setBudgetTargets(dbBudgetTargets);

      // Cache locally to keep quick sync speed
      localStorage.setItem('s_users', JSON.stringify(dbUsers));
      localStorage.setItem('s_students', JSON.stringify(dbStudents));
      localStorage.setItem('s_payments', JSON.stringify(dbPayments));
      localStorage.setItem('s_expenses', JSON.stringify(dbExpenses));
      localStorage.setItem('s_salaries', JSON.stringify(dbSalaries));
      localStorage.setItem('s_budget_targets', JSON.stringify(dbBudgetTargets));

      setBgSyncStatus('success');
      setLastBgSyncTime(new Date().toLocaleTimeString());
      setTimeout(() => setBgSyncStatus('idle'), 3000);
    } catch (err) {
      console.warn('Background periodic synchronization failed:', err);
      setBgSyncStatus('error');
      setTimeout(() => setBgSyncStatus('idle'), 3000);
    }
  };

  // Background Sync interval Scheduler
  useEffect(() => {
    if (!bgSyncEnabled || storageMode !== 'cloud') {
      return;
    }

    // Trigger sync immediately upon enabling/mount
    if (navigator.onLine) {
      performBackgroundSync();
    }

    const interval = setInterval(() => {
      if (navigator.onLine) {
        performBackgroundSync();
      }
    }, 30000); // 30 seconds frequency

    return () => clearInterval(interval);
  }, [bgSyncEnabled, storageMode]);

  const initializeData = async () => {
    try {
      const dbSettings = await db.getSystemSettings();
      if (dbSettings) {
        setSystemSettingsState(dbSettings);
        localStorage.setItem('s_system_settings', JSON.stringify(dbSettings));
      }
    } catch (e) {
      console.warn("Failed loading initial system settings from local/cloud server:", e);
    }

    const active = db.isActive() && storageMode === 'cloud';
    setFirebaseConnected(active);
    setFirebaseError(null);

    const localUsers = localStorage.getItem('s_users');
    const localStudents = localStorage.getItem('s_students');
    const localPayments = localStorage.getItem('s_payments');
    const localTerms = localStorage.getItem('s_terms');
    const localUser = localStorage.getItem('s_current_user');
    const localExpenses = localStorage.getItem('s_expenses');
    const localSalaries = localStorage.getItem('s_salaries');
    const localBudgetTargets = localStorage.getItem('s_budget_targets');

    // 1. Session authentication state loading
    try {
      if (localUser) {
        const parsed = JSON.parse(localUser);
        if (parsed && typeof parsed === 'object' && parsed.id && parsed.role) {
          setCurrentUser(parsed);
        } else {
          setCurrentUser(null);
          localStorage.removeItem('s_current_user');
        }
      }
    } catch (e) {
      console.warn('Recovered s_current_user authentication state corruption:', e);
      setCurrentUser(null);
      localStorage.removeItem('s_current_user');
    }

    if (active) {
      console.log('FEETRACK active database connection detected. Synchronizing cloud entries...');
      
      try {
        // Run lookups in parallel to minimize wait times (cut 24s sequence down to 8s)
        const [dbUsers, dbStudents, dbPayments, dbTerms, dbExpenses, dbSalaries, dbBudgetTargets] = await Promise.all([
          db.getUsers(),
          db.getStudents(),
          db.getPayments(),
          db.getTerms(),
          db.getExpenses(),
          db.getSalaries(),
          db.getBudgetTargets()
        ]);

        if (dbUsers === null || dbStudents === null || dbPayments === null || dbTerms === null || dbExpenses === null || dbSalaries === null || dbBudgetTargets === null) {
          console.warn('Cloud database collections are offline/misconfigured. Falling back to LocalStorage...');
          setFirebaseConnected(false);
          setStorageModeState('local');
          setFirebaseError('Cloud database returned null. Reverting to local storage mode.');
          loadLocalBackup(localUsers, localStudents, localPayments, localTerms, localExpenses, localSalaries, localBudgetTargets);
          return;
        }

        // If db connection succeeds but collections are completely empty, self-seed them!
        // We will seed using existing local datasets if available. This dynamically syncs registered pupil records (B5, Nursery, etc.)
        if (dbUsers.length === 0) {
          console.log('Firebase collections are unseeded. Performing initial core bootstrap sync...');
          
          let parsedLocalUsers = INITIAL_USERS;
          let parsedLocalStudents = INITIAL_STUDENTS;
          let parsedLocalPayments = generateSeedPayments();
          let parsedLocalTerms = [{
            id: 'term_default',
            name: 'Term 1 (May/June 2026)',
            startDate: '2026-05-25',
            daysCount: 15,
            schoolDays: generateSchoolDays('2026-05-25', 15),
            active: true
          }];
          
          try {
            if (localUsers) {
              const u = JSON.parse(localUsers);
              if (Array.isArray(u) && u.length > 0) parsedLocalUsers = u;
            }
          } catch (e) {}
          
          try {
            if (localStudents) {
              const s = JSON.parse(localStudents);
              if (Array.isArray(s) && s.length > 0) parsedLocalStudents = s;
            }
          } catch (e) {}

          try {
            if (localPayments) {
              const p = JSON.parse(localPayments);
              if (Array.isArray(p) && p.length > 0) parsedLocalPayments = p;
            }
          } catch (e) {}

          try {
            if (localTerms) {
              const t = JSON.parse(localTerms);
              if (Array.isArray(t) && t.length > 0) parsedLocalTerms = t;
            }
          } catch (e) {}

          const seeded = await db.seedTables(parsedLocalUsers, parsedLocalStudents, parsedLocalPayments, parsedLocalTerms);
          if (seeded) {
            setUsers(parsedLocalUsers);
            setStudents(parsedLocalStudents);
            setPayments(parsedLocalPayments);
            setTerms(parsedLocalTerms);
            localStorage.setItem('s_users', JSON.stringify(parsedLocalUsers));
            localStorage.setItem('s_students', JSON.stringify(parsedLocalStudents));
            localStorage.setItem('s_payments', JSON.stringify(parsedLocalPayments));
            localStorage.setItem('s_terms', JSON.stringify(parsedLocalTerms));
            return;
          } else {
            console.warn('Seeding failed (perhaps due to unauthorized 401 or structural issues). Falling back to local storage.');
            setFirebaseConnected(false);
            setStorageModeState('local');
            setFirebaseError('Relational seeding transaction failed. Reverting to safe local storage mode.');
            loadLocalBackup(localUsers, localStudents, localPayments, localTerms, localExpenses, localSalaries, localBudgetTargets);
            return;
          }
        }

        setUsers(dbUsers);
        setStudents(dbStudents);
        setPayments(dbPayments);
        setExpenses(dbExpenses);
        setSalaries(dbSalaries);
        setBudgetTargets(dbBudgetTargets);

        // Sync local copies as high speed cache
        localStorage.setItem('s_users', JSON.stringify(dbUsers));
        localStorage.setItem('s_students', JSON.stringify(dbStudents));
        localStorage.setItem('s_payments', JSON.stringify(dbPayments));
        localStorage.setItem('s_expenses', JSON.stringify(dbExpenses));
        localStorage.setItem('s_salaries', JSON.stringify(dbSalaries));
        localStorage.setItem('s_budget_targets', JSON.stringify(dbBudgetTargets));
        
        // Sync terms in active cloud mode
        if (dbTerms && dbTerms.length > 0) {
          setTerms(dbTerms);
          localStorage.setItem('s_terms', JSON.stringify(dbTerms));
        } else {
          if (localTerms) {
            const parsed = JSON.parse(localTerms);
            setTerms(parsed);
            db.saveTerms(parsed);
          } else {
            const initialTerms = [{
              id: 'term_default',
              name: 'Term 1 (May/June 2026)',
              startDate: '2026-05-25',
              daysCount: 15,
              schoolDays: generateSchoolDays('2026-05-25', 15),
              active: true
            }];
            setTerms(initialTerms);
            localStorage.setItem('s_terms', JSON.stringify(initialTerms));
            db.saveTerms(initialTerms);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('Core sync sequence failure:', err);
        setFirebaseConnected(false);
        
        // Auto-revert storageMode selection to prevent lagging subsequent state mutations
        setStorageModeState('local');

        let displayError = "Cloud Sync timed out or was rejected. We have safely switched you to the Local Ledger so you can keep work saved locally.";
        try {
          const parsed = JSON.parse(msg);
          if (parsed.error && parsed.error.includes("Timeout")) {
            displayError = "Connection with Cloud Firestore timed out (12000ms limit reached). We temporarily rolled back to standard Local Ledger mode to prevent UI lag. Try clicking 'Retry Sync Detection' once your Firestore setup completes.";
          } else if (parsed.error) {
            displayError = `Cloud connection rejected: ${parsed.error}. Reverted to local storage mode for safety.`;
          }
        } catch {
          if (msg.includes("Timeout")) {
            displayError = "Google Cloud Firestore connection timed out. Reverted to offline Local Ledger so you do not lose any work. Please run Firebase setup or retry sync.";
          }
        }
        
        setFirebaseError(displayError);
        loadLocalBackup(localUsers, localStudents, localPayments, localTerms, localExpenses, localSalaries, localBudgetTargets);
      }
    } else {
      console.log('FEETRACK running in standard client-persistence mode (Local Storage).');
      loadLocalBackup(localUsers, localStudents, localPayments, localTerms, localExpenses, localSalaries, localBudgetTargets);
    }
  };

  // Load state from Firebase if configured, otherwise fall back to localStorage
  useEffect(() => {
    initializeData();
  }, [storageMode]);

    const loadLocalBackup = (
      localUsers: string | null,
      localStudents: string | null,
      localPayments: string | null,
      localTerms: string | null,
      localExpenses: string | null,
      localSalaries: string | null,
      localBudgetTargets: string | null
    ) => {
      // Users list healing
      try {
        if (localUsers) {
          const parsed: UserAccount[] = JSON.parse(localUsers);
          if (!parsed.some(u => u.email.toLowerCase() === 'yakubuhakeem@gmail.com')) {
            parsed.unshift({
              id: 'admin-hakeem',
              name: 'Hakeem Yakubu',
              email: 'yakubuhakeem@gmail.com',
              role: 'Administrator',
              mfaEnabled: true,
              mfaSecret: 'SHA-SAAKOKEY2003',
              passwordEnabled: true,
              password: 'admin2026'
            });
            localStorage.setItem('s_users', JSON.stringify(parsed));
          }
          setUsers(parsed);
        } else {
          setUsers(INITIAL_USERS);
          localStorage.setItem('s_users', JSON.stringify(INITIAL_USERS));
        }
      } catch (e) {
        setUsers(INITIAL_USERS);
        localStorage.setItem('s_users', JSON.stringify(INITIAL_USERS));
      }

      // Students database healing
      try {
        if (localStudents) {
          setStudents(JSON.parse(localStudents));
        } else {
          setStudents(INITIAL_STUDENTS);
          localStorage.setItem('s_students', JSON.stringify(INITIAL_STUDENTS));
        }
      } catch (e) {
        setStudents(INITIAL_STUDENTS);
        localStorage.setItem('s_students', JSON.stringify(INITIAL_STUDENTS));
      }

      // Payments ledger healing
      try {
        if (localPayments) {
          setPayments(JSON.parse(localPayments));
        } else {
          const seeds = generateSeedPayments();
          setPayments(seeds);
          localStorage.setItem('s_payments', JSON.stringify(seeds));
        }
      } catch (e) {
        const seeds = generateSeedPayments();
        setPayments(seeds);
        localStorage.setItem('s_payments', JSON.stringify(seeds));
      }

      // Terms database healing
      try {
        if (localTerms) {
          setTerms(JSON.parse(localTerms));
        } else {
          const initialTerms = [{
            id: 'term_default',
            name: 'Term 1 (May/June 2026)',
            startDate: '2026-05-25',
            daysCount: 15,
            schoolDays: generateSchoolDays('2026-05-25', 15),
            active: true
          }];
          setTerms(initialTerms);
          localStorage.setItem('s_terms', JSON.stringify(initialTerms));
        }
      } catch (e) {
        const initialTerms = [{
          id: 'term_default',
          name: 'Term 1 (May/June 2026)',
          startDate: '2026-05-25',
          daysCount: 15,
          schoolDays: generateSchoolDays('2026-05-25', 15),
          active: true
        }];
        setTerms(initialTerms);
        localStorage.setItem('s_terms', JSON.stringify(initialTerms));
      }

      // Expenses database healing
      try {
        if (localExpenses) {
          setExpenses(JSON.parse(localExpenses));
        } else {
          setExpenses([]);
          localStorage.setItem('s_expenses', JSON.stringify([]));
        }
      } catch (e) {
        setExpenses([]);
        localStorage.setItem('s_expenses', JSON.stringify([]));
      }

      // Salaries database healing
      try {
        if (localSalaries) {
          setSalaries(JSON.parse(localSalaries));
        } else {
          setSalaries([]);
          localStorage.setItem('s_salaries', JSON.stringify([]));
        }
      } catch (e) {
        setSalaries([]);
        localStorage.setItem('s_salaries', JSON.stringify([]));
      }

      // Budget targets database healing
      try {
        if (localBudgetTargets) {
          setBudgetTargets(JSON.parse(localBudgetTargets));
        } else {
          setBudgetTargets([]);
          localStorage.setItem('s_budget_targets', JSON.stringify([]));
        }
      } catch (e) {
        setBudgetTargets([]);
        localStorage.setItem('s_budget_targets', JSON.stringify([]));
      }
    };

  // Sync to local backups
  const saveState = (newUsers: UserAccount[], newStudents: Student[], newPayments: PaymentRecord[]) => {
    setActiveSavesCount(prev => prev + 1);
    localStorage.setItem('s_users', JSON.stringify(newUsers));
    localStorage.setItem('s_students', JSON.stringify(newStudents));
    localStorage.setItem('s_payments', JSON.stringify(newPayments));
    
    // Simulate a brief minimum sync animation duration (approx 500ms) to ensure 'Saving...' registers with users
    setTimeout(() => {
      setActiveSavesCount(prev => Math.max(0, prev - 1));
    }, 500);
  };

  const login = (email: string, mfaCode?: string, password?: string) => {
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!user) {
      return { success: false, error: 'Account with this email does not exist.' };
    }

    if (user.active === false) {
      return { success: false, error: 'Your account has been deactivated/disabled. Please contact an Administrator.' };
    }

    // Secure Password Verification (if enabled)
    if (user.passwordEnabled) {
      if (!password) {
        return { success: true, requiresPassword: true };
      }
      if (password !== user.password) {
        return { success: false, error: 'Incorrect login password.' };
      }
    }

    // Secure MFA Simulation: If user has MFA enabled, require code verify
    if (user.mfaEnabled) {
      if (!mfaCode) {
        return { success: true, requiresMfa: true };
      }
      if (mfaCode.trim().length !== 6 || isNaN(Number(mfaCode))) {
        return { success: false, error: 'Invalid 6-digit authentication token.' };
      }
      if (mfaCode.trim() !== '123456' && mfaCode.trim() !== '555555') {
        return { success: false, error: 'Incorrect Multi-Factor authentication code.' };
      }
    }

    setCurrentUser(user);
    localStorage.setItem('s_current_user', JSON.stringify(user));
    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('s_current_user');
  };

  const toggleMfaForUser = (userId: string) => {
    let updatedUser: UserAccount | null = null;
    const updated = users.map(u => {
      if (u.id === userId) {
        const nextState = !u.mfaEnabled;
        updatedUser = {
          ...u,
          mfaEnabled: nextState,
          mfaSecret: nextState ? u.mfaSecret || 'SHA-' + Math.random().toString(36).substring(2, 10).toUpperCase() : undefined
        };
        return updatedUser;
      }
      return u;
    });
    setUsers(updated);
    if (currentUser && currentUser.id === userId && updatedUser) {
      setCurrentUser(updatedUser);
      localStorage.setItem('s_current_user', JSON.stringify(updatedUser));
    }
    saveState(updated, students, payments);
    if (updatedUser && db.isActive() && storageMode === 'cloud') {
      db.saveUser(updatedUser);
    } else if (updatedUser) {
      recordLocallyPendingEdit('user', 'update', `Toggled MFA security for staff: "${updatedUser.name}"`);
    }
  };

  const registerStaff = (name: string, email: string, role: UserRole, assignedClass?: StudentClass, mfaEnabled = false, passwordEnabled = false, password = '', assignedClasses?: StudentClass[], stipendSalary?: number, momoNumber?: string, momoName?: string) => {
    const trimmedEmail = email.toLowerCase().trim();
    if (users.some(u => u.email.toLowerCase() === trimmedEmail)) {
      return { success: false, error: 'A staff member with this email is already registered.' };
    }

    const finalClasses = role === 'Teacher' ? (assignedClasses || (assignedClass ? [assignedClass] : [])) : undefined;
    const finalClass = role === 'Teacher' ? (assignedClass || (finalClasses && finalClasses.length > 0 ? finalClasses[0] : undefined)) : undefined;

    const newUser: UserAccount = {
      id: 'staff_' + Date.now(),
      name,
      email: trimmedEmail,
      role,
      assignedClass: finalClass,
      assignedClasses: finalClasses,
      mfaEnabled,
      mfaSecret: mfaEnabled ? 'SHA-' + Math.random().toString(36).substring(2, 10).toUpperCase() : undefined,
      passwordEnabled,
      password: passwordEnabled ? password : undefined,
      stipendSalary,
      momoNumber,
      momoName
    };

    const nextUsers = [...users, newUser];
    setUsers(nextUsers);
    saveState(nextUsers, students, payments);
    if (db.isActive() && storageMode === 'cloud') {
      db.saveUser(newUser);
    } else {
      recordLocallyPendingEdit('user', 'create', `Created user staff account: "${name}" (${role})`);
    }
    return { success: true };
  };

  const updateStaff = (userId: string, name: string, email: string, role: UserRole, assignedClass?: StudentClass, mfaEnabled = false, passwordEnabled = false, password = '', assignedClasses?: StudentClass[], stipendSalary?: number, momoNumber?: string, momoName?: string) => {
    const trimmedEmail = email.toLowerCase().trim();
    if (users.some(u => u.email.toLowerCase() === trimmedEmail && u.id !== userId)) {
      return { success: false, error: 'A staff member with this email is already registered.' };
    }

    let updatedUser: UserAccount | null = null;
    const nextUsers = users.map(u => {
      if (u.id === userId) {
        const finalClasses = role === 'Teacher' ? (assignedClasses || (assignedClass ? [assignedClass] : [])) : undefined;
        const finalClass = role === 'Teacher' ? (assignedClass || (finalClasses && finalClasses.length > 0 ? finalClasses[0] : undefined)) : undefined;
        updatedUser = {
          ...u,
          name,
          email: trimmedEmail,
          role,
          assignedClass: finalClass,
          assignedClasses: finalClasses,
          mfaEnabled,
          mfaSecret: mfaEnabled ? u.mfaSecret || 'SHA-' + Math.random().toString(36).substring(2, 10).toUpperCase() : undefined,
          passwordEnabled,
          password: passwordEnabled ? password : u.password,
          stipendSalary,
          momoNumber,
          momoName
        };
        return updatedUser;
      }
      return u;
    });

    setUsers(nextUsers);
    if (currentUser && currentUser.id === userId && updatedUser) {
      setCurrentUser(updatedUser);
      localStorage.setItem('s_current_user', JSON.stringify(updatedUser));
    }
    saveState(nextUsers, students, payments);
    if (updatedUser && db.isActive() && storageMode === 'cloud') {
      db.saveUser(updatedUser);
    } else if (updatedUser) {
      recordLocallyPendingEdit('user', 'update', `Updated settings for staff: "${updatedUser.name}"`);
    }
    return { success: true };
  };

  const deleteStaff = (userId: string) => {
    if (currentUser?.role !== 'Administrator') {
      return { success: false, error: 'Access Denied: Only Administrators are permitted to delete staff profiles.' };
    }
    if (currentUser?.id === userId) {
      return { success: false, error: 'You cannot delete your own account while logged in.' };
    }
    const prevStaff = users.find(u => u.id === userId);
    const nextUsers = users.filter(u => u.id !== userId);
    setUsers(nextUsers);
    saveState(nextUsers, students, payments);
    if (db.isActive()) {
      db.deleteUser(userId);
    }
    if (storageMode !== 'cloud') {
      recordLocallyPendingEdit('user', 'delete', `Removed staff member account: "${prevStaff?.name || 'Staff'}"`);
    }
    return { success: true };
  };

  const toggleStaffActive = (userId: string) => {
    if (currentUser?.id === userId) {
      return { success: false, error: 'You cannot deactivate your own account while logged in.' };
    }
    let updatedUser: UserAccount | null = null;
    const nextUsers = users.map(u => {
      if (u.id === userId) {
        updatedUser = {
          ...u,
          active: u.active === false ? true : false
        };
        return updatedUser;
      }
      return u;
    });

    setUsers(nextUsers);
    saveState(nextUsers, students, payments);
    if (updatedUser && db.isActive() && storageMode === 'cloud') {
      db.saveUser(updatedUser);
    } else if (updatedUser) {
      recordLocallyPendingEdit('user', 'update', `Toggled active status for staff: "${updatedUser.name}"`);
    }
    return { success: true };
  };

  const addStudent = (name: string, className: StudentClass, guardianPhone?: string, photoUrl?: string, discount = 0, gender?: 'Male' | 'Female', paymentType: 'Daily' | 'Term' = 'Daily', termFee = 350, legacyDebt = 0) => {
    const isDuplicate = students.some(s => 
      s.name.trim().toLowerCase() === name.trim().toLowerCase() && 
      s.class === className
    );
    if (isDuplicate) {
      playFeedbackSound('error');
      return;
    }

    const category = getClassCategory(className);
    const prefix = className.startsWith('KG') ? className : className.startsWith('Nursery') ? 'NS' : className;
    const year = new Date().getFullYear();
    const count = students.filter(s => s.class === className).length + 1;
    const rollNumber = `${prefix}-${year}-${String(count).padStart(3, '0')}`;

    const newStudent: Student = {
      id: 'student_' + Date.now(),
      name,
      class: className,
      category,
      rollNumber,
      active: true,
      guardianPhone: guardianPhone || '0500000000',
      photoUrl,
      discount: discount,
      gender: gender,
      paymentType: paymentType,
      termFee: termFee,
      legacyDebt: legacyDebt
    };

    const nextStudents = [...students, newStudent];
    setStudents(nextStudents);
    saveState(users, nextStudents, payments);
    if (db.isActive() && storageMode === 'cloud') {
      db.saveStudent(newStudent);
    } else {
      recordLocallyPendingEdit('student', 'create', `Admitted new pupil: "${name}" (${className})`);
    }
  };

  const updateStudent = (updatedStudent: Student) => {
    const nextStudents = students.map(s => s.id === updatedStudent.id ? updatedStudent : s);
    setStudents(nextStudents);
    saveState(users, nextStudents, payments);
    if (db.isActive() && storageMode === 'cloud') {
      db.saveStudent(updatedStudent);
    } else {
      recordLocallyPendingEdit('student', 'update', `Updated record for pupil: "${updatedStudent.name}"`);
    }
  };

  const deleteStudent = (studentId: string) => {
    if (currentUser?.role !== 'Administrator') {
      alert('Access Denied: Only Administrators are permitted to delete student records completely.');
      return;
    }
    const targetStudent = students.find(s => s.id === studentId);
    const nextStudents = students.filter(s => s.id !== studentId);
    const nextPayments = payments.filter(p => p.studentId !== studentId);
    setStudents(nextStudents);
    setPayments(nextPayments);
    saveState(users, nextStudents, nextPayments);
    if (db.isActive()) {
      db.deleteStudent(studentId);
    }
    if (storageMode !== 'cloud') {
      recordLocallyPendingEdit('student', 'delete', `Removed pupil: "${targetStudent?.name || 'Unknown'}" from active register`);
    }
  };

  const purgeDeactivatedStudents = () => {
    if (currentUser?.role !== 'Administrator') {
      alert('Access Denied: Only Administrators are permitted to purge deactivated students completely.');
      return;
    }
    const deactivatedStudents = students.filter(s => s.active === false);
    if (deactivatedStudents.length === 0) return;

    const deactivatedIds = new Set(deactivatedStudents.map(s => s.id));
    const nextStudents = students.filter(s => s.active !== false);
    const nextPayments = payments.filter(p => !deactivatedIds.has(p.studentId));

    setStudents(nextStudents);
    setPayments(nextPayments);
    saveState(users, nextStudents, nextPayments);

    if (db.isActive()) {
      deactivatedStudents.forEach(st => {
        db.deleteStudent(st.id);
      });
    }
    if (storageMode !== 'cloud') {
      recordLocallyPendingEdit('student', 'delete', `Purged ${deactivatedStudents.length} inactive pupil profiles and associated transaction history from system`);
    }
  };

  const checkAndSendCheckInAlert = (studentId: string) => {
    if (!systemSettings?.autoSendCheckInAlert) return;

    const student = students.find(s => s.id === studentId);
    if (!student || !student.guardianPhone?.trim()) return;

    const phone = student.guardianPhone.trim();

    // Prevent duplicate sendings for the same student on the same day
    const alreadySentCheckIn = whatsappLogs.some(log => 
      log.studentId === studentId && 
      log.type === 'check-in' && 
      (log.timestamp?.startsWith(currentDate) || log.date === currentDate)
    );

    if (alreadySentCheckIn) return;

    const timeString = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const message = `*${systemSettings.schoolName || 'SAAKO HOLY CHILD ACADEMY'}*\n` +
      `*ATTENDANCE GATE CHECK-IN*\n\n` +
      `Dear Parent/Guardian,\n` +
      `Your ward *${student.name}* (Roll: ${student.rollNumber || 'N/A'}, Class: ${student.class}) has checked-in safely at school today on *${currentDate}* at *${timeString}*.\n\n` +
      `Thank you for choosing ${systemSettings.schoolName || 'Saako Holy Child Academy'}!`;

    // Trigger asynchronously
    setTimeout(async () => {
      try {
        await sendautomatedWhatsApp(phone, message, studentId, student.name, 'check-in');
      } catch (err) {
        console.error('Failed auto-sending check-in WhatsApp:', err);
      }
    }, 150);
  };

  const checkAndSendArrearsAlert = (studentId: string) => {
    if (!systemSettings?.autoSendArrearsAlert) return;

    const student = students.find(s => s.id === studentId);
    if (!student || !student.guardianPhone?.trim()) return;

    const phone = student.guardianPhone.trim();

    // Prevent duplicate arrears alert for the same student on the same day
    const alreadySentArrears = whatsappLogs.some(log => 
      log.studentId === studentId && 
      log.type === 'arrears_warning' && 
      (log.timestamp?.startsWith(currentDate) || log.date === currentDate)
    );

    if (alreadySentArrears) return;

    const baseDailyFee = systemSettings?.baselineDailyFee ?? 5.00;
    const debtInfo = calculateStudentFinancialState(student, payments, activeTerm, currentDate, baseDailyFee);

    if (!debtInfo || debtInfo.totalDebt <= 0) return;

    const rollNumber = student.rollNumber || 'SHC-' + student.id.substring(0, 5).toUpperCase();
    const classGroup = `${student.class} (${student.category})`;
    const isTerm = student.paymentType === 'Term';
    const totalArrears = debtInfo.totalDebt || 0;
    const daysCount = debtInfo.pastUnpaidDays?.length || 0;

    let detailsText = '';
    if (isTerm) {
      detailsText = `Your child, ${student.name}, is registered on the Term Fee Payment scheme. Currently, there is an accumulated outstanding balance of *GHC ${totalArrears.toFixed(2)}* for school fees and ancillary levies.`;
    } else {
      detailsText = `Your child, ${student.name}, currently has *GHC ${totalArrears.toFixed(2)}* in accumulated Daily Ingress arrears (equivalent to *${daysCount} unpaid school days*).`;
    }

    const message = `*${systemSettings.schoolName || 'SAAKO HOLY CHILD ACADEMY'}*\n` +
      `⚠️ *IMMEDIATE ATTENTION: OUTSTANDING FEES NOTICE* ⚠️\n\n` +
      `Dear Guardian,\n\n` +
      `This is an official administrative notice regarding the financial account of your ward:\n` +
      `*Student Name:* ${student.name}\n` +
      `*Roll ID:* ${rollNumber}\n` +
      `*Class/Grade:* ${classGroup}\n\n` +
      `${detailsText}\n\n` +
      `Kindly make arrangements to settle this outstanding balance of *GHC ${totalArrears.toFixed(2)}* at the school gate check-in desk or make a direct transfer to avoid any interruption to your ward's daily registration and classroom entry.\n\n` +
      `If you have recently made this payment, please present your printed receipt at the main desk to update our ledger records.\n\n` +
      `Thank you for your prompt cooperation.\n` +
      `_Office of the Headmaster & Registrar Hub_`;

    // Trigger asynchronously
    setTimeout(async () => {
      try {
        await sendautomatedWhatsApp(phone, message, studentId, student.name, 'arrears_warning');
      } catch (err) {
        console.error('Failed auto-sending arrears WhatsApp:', err);
      }
    }, 250);
  };

  const recordPayment = (studentId: string, verified = true, customAmount?: number, customNotes?: string, allowDuplicate = false) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const discountAmount = student.discount || 0;
    const baseDailyFee = systemSettings?.baselineDailyFee ?? 5.00;
    const finalAmount = customAmount !== undefined ? customAmount : Math.max(0, baseDailyFee - discountAmount);

    const dailyRate = Math.max(0.01, baseDailyFee - discountAmount);

    // 0. Handle Term Payers differently
    if (student.paymentType === 'Term') {
      const existingIndex = allowDuplicate ? -1 : payments.findIndex(p => p.studentId === studentId && p.date === currentDate && !p.id.endsWith('_debt'));
      let nextPayments = [...payments];
      let recordToSave: PaymentRecord;
      
      const resolvedAmount = customAmount !== undefined ? customAmount : 0.00;
      const resolvedNotes = customNotes !== undefined 
        ? customNotes 
        : customAmount !== undefined 
          ? `Term fee installment received: GHC ${customAmount.toFixed(2)}` 
          : "Term Pass Daily Check-in";

      if (existingIndex > -1) {
        recordToSave = {
          ...nextPayments[existingIndex],
          amount: resolvedAmount,
          isAbsent: false,
          verified,
          notes: resolvedNotes,
          timestamp: new Date().toISOString()
        };
        nextPayments[existingIndex] = recordToSave;
      } else {
        recordToSave = {
          id: allowDuplicate ? `p_${studentId}_${currentDate}_dup_${Date.now()}` : `p_${studentId}_${currentDate}`,
          studentId: student.id,
          studentName: student.name,
          class: student.class,
          category: student.category,
          amount: resolvedAmount,
          date: currentDate,
          timestamp: new Date().toISOString(),
          collectedBy: currentUser ? currentUser.name : 'System Host',
          verified,
          isAbsent: false,
          notes: resolvedNotes
        };
        nextPayments.push(recordToSave);
      }
      setPayments(nextPayments);
      saveState(users, students, nextPayments);
      if (db.isActive() && storageMode === 'cloud') {
        db.savePayment(recordToSave);
      } else {
        recordLocallyPendingEdit('payment', 'create', `Logged term flat payment of GHC ${resolvedAmount.toFixed(2)} for pupil: "${student.name}"`);
      }
      playFeedbackSound('success');
      checkAndSendCheckInAlert(studentId);
      checkAndSendArrearsAlert(studentId);
      return;
    }

    // Calculate billing, paid totals and outstanding debt precisely
    const studentPayments = payments.filter(p => p.studentId === studentId);
    
    let billableDays: string[] = [];
    if (activeTerm && activeTerm.schoolDays) {
      const holidays = activeTerm.publicHolidays || [];
      const pastSchoolDays = activeTerm.schoolDays.filter(d => d < currentDate && !holidays.includes(d));
      billableDays = pastSchoolDays.filter(dStr => {
        return !studentPayments.some(p => p.date === dStr && p.isAbsent);
      });
    }

    const totalRequired = billableDays.length * dailyRate;
    const totalPaid = studentPayments
      .filter(p => !p.isAbsent)
      .reduce((sum, p) => sum + p.amount, 0);

    const totalDebt = Math.max(0, totalRequired - totalPaid);

    if (totalDebt === 0 && finalAmount > dailyRate) {
      recordAdvancePayment(studentId, finalAmount, verified);
      return;
    }

    // Filter which billable past school days are still unpaid
    let runningPaid = totalPaid;
    const unpaidDays: string[] = [];
    billableDays.forEach(dStr => {
      if (runningPaid + 0.005 >= dailyRate) {
        runningPaid -= dailyRate;
      } else {
        runningPaid = 0;
        unpaidDays.push(dStr);
      }
    });

    // Check if there is past debt and we are recording a positive amount
    if (totalDebt > 0 && finalAmount > 0) {
      const amountToSettle = Math.min(finalAmount, totalDebt);
      const remainder = finalAmount - amountToSettle;

      let nextPayments = [...payments];
      const recordsToSync: PaymentRecord[] = [];

      if (amountToSettle > 0) {
        const daysToCover = Math.floor((amountToSettle + 0.005) / dailyRate);
        const datesToRecord = unpaidDays.slice(0, daysToCover);

        const todayDebtPaymentId = `p_${studentId}_${currentDate}_debt`;
        const existingTodayDebtIdx = nextPayments.findIndex(p => p.id === todayDebtPaymentId);

        const formattedDatesList = datesToRecord.map(d => {
          const parts = d.split('-');
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }).join(', ');

        const todayDebtRecord: PaymentRecord = {
          id: todayDebtPaymentId,
          studentId: student.id,
          studentName: student.name,
          class: student.class,
          category: student.category,
          amount: amountToSettle,
          date: currentDate,
          timestamp: new Date().toISOString(),
          collectedBy: currentUser ? currentUser.name : 'System Host',
          verified,
          notes: datesToRecord.length > 0
            ? `Settled Debt (Cleared GHC ${amountToSettle.toFixed(2)} arrears covering ${datesToRecord.length} days: ${formattedDatesList})`
            : `Partial Debt Payment GHC ${amountToSettle.toFixed(2)} logged`,
          clearedDates: datesToRecord.length > 0 ? datesToRecord : undefined
        };

        if (existingTodayDebtIdx > -1) {
          nextPayments[existingTodayDebtIdx] = todayDebtRecord;
        } else {
          nextPayments.push(todayDebtRecord);
        }
        recordsToSync.push(todayDebtRecord);

        // Create zero-amount marker records for each cleared past day to settle arrears
        datesToRecord.forEach((dayStr) => {
          const existingIdx = nextPayments.findIndex(p => p.studentId === studentId && p.date === dayStr);
          
          if (existingIdx > -1) {
            const existingRecord = nextPayments[existingIdx];
            // If the existing record preserves any non-zero cash collection, or is a main debt transaction record,
            // DO NOT OVERWRITE its amount to 0 (which would erase the student's payment history).
            if (existingRecord.amount > 0 || existingRecord.id.endsWith('_debt')) {
              const updatedRecord: PaymentRecord = {
                ...existingRecord,
                notes: existingRecord.notes 
                  ? `${existingRecord.notes} | Arrears Cleared on ${currentDate}` 
                  : `Arrears Cleared on ${currentDate}`
              };
              nextPayments[existingIdx] = updatedRecord;
              recordsToSync.push(updatedRecord);
              return;
            }
          }

          const record: PaymentRecord = {
            id: existingIdx > -1 ? nextPayments[existingIdx].id : `p_${studentId}_${dayStr}`,
            studentId: student.id,
            studentName: student.name,
            class: student.class,
            category: student.category,
            amount: 0,
            date: dayStr,
            timestamp: new Date().toISOString(),
            collectedBy: currentUser ? currentUser.name : 'System Host',
            verified,
            notes: `Arrears Cleared (Settle Debt of GHC ${amountToSettle.toFixed(2)} processed on ${currentDate})`
          };

          if (existingIdx > -1) {
            nextPayments[existingIdx] = record;
          } else {
            nextPayments.push(record);
          }
          recordsToSync.push(record);
        });
      }

      // 3. Handle remainder for today's standard payment (if any) - also maps forward if it covers multiple future days
      if (remainder > 0) {
        const schoolDays = activeTerm?.schoolDays || [];
        const holidays = activeTerm?.publicHolidays || [];
        let startIndex = schoolDays.indexOf(currentDate);
        if (startIndex === -1) {
          startIndex = schoolDays.findIndex(d => d >= currentDate);
          if (startIndex === -1) startIndex = 0;
        }

        const isTodayPaid = payments.some(p => p.studentId === studentId && p.date === currentDate && !p.isAbsent);
        const datesToCoverForRemainder: string[] = [];
        if (!isTodayPaid && !holidays.includes(currentDate)) {
          datesToCoverForRemainder.push(currentDate);
        }

        const daysToCoverRemainder = Math.floor((remainder + 0.005) / dailyRate);
        let scanIndex = startIndex;
        while (datesToCoverForRemainder.length < daysToCoverRemainder && scanIndex < schoolDays.length) {
          const dStr = schoolDays[scanIndex];
          if (dStr !== currentDate && !holidays.includes(dStr)) {
            const isDayPaid = payments.some(p => p.studentId === studentId && p.date === dStr && !p.isAbsent);
            if (!isDayPaid) {
              datesToCoverForRemainder.push(dStr);
            }
          }
          scanIndex++;
        }

        const coverDesc = datesToCoverForRemainder.length > 0 ? `covering days: ${datesToCoverForRemainder.map(d => d.split('-').reverse().join('/')).join(', ')}` : '';

        const existingIndex = nextPayments.findIndex(p => p.studentId === studentId && p.date === currentDate && !p.id.endsWith('_debt'));
        let recordToSave: PaymentRecord;

        if (existingIndex > -1) {
          recordToSave = {
            ...nextPayments[existingIndex],
            amount: remainder,
            isAbsent: false,
            verified,
            notes: `Remainder gate fee processed after clearing old arrears ${coverDesc}`,
            timestamp: new Date().toISOString()
          };
          nextPayments[existingIndex] = recordToSave;
        } else {
          recordToSave = {
            id: `p_${studentId}_${currentDate}`,
            studentId: student.id,
            studentName: student.name,
            class: student.class,
            category: student.category,
            amount: remainder,
            date: currentDate,
            timestamp: new Date().toISOString(),
            collectedBy: currentUser ? currentUser.name : 'System Host',
            verified,
            isAbsent: false,
            notes: `Remainder gate fee processed after clearing old arrears ${coverDesc}`
          };
          nextPayments.push(recordToSave);
        }
        recordsToSync.push(recordToSave);

        // Record 0-amount marker records for prepaid future dates from remainder
        datesToCoverForRemainder.forEach((dayStr) => {
          if (dayStr === currentDate) return;
          const existingIdx = nextPayments.findIndex(p => p.studentId === studentId && p.date === dayStr && !p.id.endsWith('_debt'));
          
          if (existingIdx > -1) {
            const existingRecord = nextPayments[existingIdx];
            if (existingRecord.amount > 0) {
              const updatedRecord: PaymentRecord = {
                ...existingRecord,
                notes: existingRecord.notes 
                  ? `${existingRecord.notes} | Block prepaid on ${currentDate}` 
                  : `Block prepaid on ${currentDate}`
              };
              nextPayments[existingIdx] = updatedRecord;
              recordsToSync.push(updatedRecord);
              return;
            }
          }

          const rRecord: PaymentRecord = {
            id: existingIdx > -1 ? nextPayments[existingIdx].id : `p_${studentId}_${dayStr}`,
            studentId: student.id,
            studentName: student.name,
            class: student.class,
            category: student.category,
            amount: 0,
            date: dayStr,
            timestamp: new Date().toISOString(),
            collectedBy: currentUser ? currentUser.name : 'System Host',
            verified,
            notes: `Covered (Prepaid in advance block via remainder on ${currentDate})`
          };
          if (existingIdx > -1) {
            nextPayments[existingIdx] = rRecord;
          } else {
            nextPayments.push(rRecord);
          }
          recordsToSync.push(rRecord);
        });
      }

      setPayments(nextPayments);
      saveState(users, students, nextPayments);

      if (db.isActive() && storageMode === 'cloud') {
        recordsToSync.forEach(rec => {
          db.savePayment(rec);
        });
      } else if (recordsToSync.length > 0) {
        recordLocallyPendingEdit('payment', 'create', `Logged GHC ${finalAmount.toFixed(2)} payment covering arrears and/or standard fee for pupil: "${student.name}"`);
      }
      playFeedbackSound('success');
      checkAndSendCheckInAlert(studentId);
      checkAndSendArrearsAlert(studentId);
    } else {
      // Standard payment with NO debt
      const existingIndex = allowDuplicate ? -1 : payments.findIndex(p => p.studentId === studentId && p.date === currentDate && !p.id.endsWith('_debt'));
      let nextPayments = [...payments];
      let recordToSave: PaymentRecord;

      if (existingIndex > -1) {
        recordToSave = {
          ...nextPayments[existingIndex],
          amount: finalAmount,
          isAbsent: false,
          verified,
          notes: customNotes !== undefined ? customNotes : (customAmount !== undefined ? `Custom amount GHC ${finalAmount.toFixed(2)} processed` : (discountAmount > 0 ? `Applied dynamic discount of GHC ${discountAmount.toFixed(2)}` : undefined)),
          timestamp: new Date().toISOString()
        };
        nextPayments[existingIndex] = recordToSave;
      } else {
        recordToSave = {
          id: allowDuplicate ? `p_${studentId}_${currentDate}_dup_${Date.now()}` : `p_${studentId}_${currentDate}`,
          studentId: student.id,
          studentName: student.name,
          class: student.class,
          category: student.category,
          amount: finalAmount,
          date: currentDate,
          timestamp: new Date().toISOString(),
          collectedBy: currentUser ? currentUser.name : 'System Host',
          verified,
          isAbsent: false,
          notes: customNotes !== undefined ? customNotes : (customAmount !== undefined ? `Custom amount GHC ${finalAmount.toFixed(2)} processed` : (discountAmount > 0 ? `Applied dynamic discount of GHC ${discountAmount.toFixed(2)}` : undefined))
        };
        nextPayments.push(recordToSave);
      }

      setPayments(nextPayments);
      saveState(users, students, nextPayments);
      if (db.isActive() && storageMode === 'cloud') {
        db.savePayment(recordToSave);
      } else {
        recordLocallyPendingEdit('payment', 'create', `Logged GHC ${finalAmount.toFixed(2)} payment for pupil: "${student.name}"${discountAmount > 0 && customAmount === undefined ? ` (GHC ${discountAmount.toFixed(2)} Discount applied)` : ''}`);
      }
      playFeedbackSound('success');
      checkAndSendCheckInAlert(studentId);
      checkAndSendArrearsAlert(studentId);
    }
  };

  const recordAbsent = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const existingIndex = payments.findIndex(p => p.studentId === studentId && p.date === currentDate && !p.id.endsWith('_debt'));
    let nextPayments = [...payments];
    let recordToSave: PaymentRecord;

    if (existingIndex > -1) {
      recordToSave = {
        ...nextPayments[existingIndex],
        amount: 0,
        isAbsent: true,
        notes: 'Marked as Absent today',
        timestamp: new Date().toISOString()
      };
      nextPayments[existingIndex] = recordToSave;
    } else {
      recordToSave = {
        id: `p_${studentId}_${currentDate}`,
        studentId: student.id,
        studentName: student.name,
        class: student.class,
        category: student.category,
        amount: 0,
        date: currentDate,
        timestamp: new Date().toISOString(),
        collectedBy: currentUser ? currentUser.name : 'System Host',
        verified: true,
        isAbsent: true,
        notes: 'Marked as Absent today'
      };
      nextPayments.push(recordToSave);
    }

    setPayments(nextPayments);
    saveState(users, students, nextPayments);
    if (db.isActive() && storageMode === 'cloud') {
      db.savePayment(recordToSave);
    } else {
      recordLocallyPendingEdit('payment', 'create', `Marked pupil: "${student?.name || 'Pupil'}" as Absent`);
    }
  };

  const recordAdvancePayment = (studentId: string, amount: number, verified = true) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    // If student is term payer, standard advance payment redirects to recordPayment
    if (student.paymentType === 'Term') {
      recordPayment(studentId, verified, amount);
      return;
    }

    const baseDailyFee = systemSettings?.baselineDailyFee ?? 5.00;
    const currencySymbol = systemSettings?.currencyCode || 'GHC';
    // Standard school day rate is dynamic, minus any student custom discount
    const dailyRate = Math.max(0.01, baseDailyFee - (student.discount || 0));
    const daysToCover = Math.floor(amount / dailyRate);
    if (daysToCover <= 0) return;

    // Use activeTerm schoolDays
    if (!activeTerm || !activeTerm.schoolDays || activeTerm.schoolDays.length === 0) {
      console.warn("No active term with generated school days found for advance calculation.");
      return;
    }

    const schoolDays = activeTerm.schoolDays;
    const holidays = activeTerm.publicHolidays || [];
    
    // Find index of currentDate in active term's schoolDays
    let startIndex = schoolDays.indexOf(currentDate);
    if (startIndex === -1) {
      // Find first day that is >= currentDate or default to 0
      startIndex = schoolDays.findIndex(d => d >= currentDate);
      if (startIndex === -1) startIndex = 0;
    }

    const datesToRecord: string[] = [];
    
    const isDayPaidFunc = (dStr: string) => {
      return payments.some(p => p.studentId === studentId && p.date === dStr && !p.isAbsent);
    };

    // Determine starting day to cover: if currentDate is unpaid and NOT a holiday, cover it first!
    if (!isDayPaidFunc(currentDate) && !holidays.includes(currentDate)) {
      datesToRecord.push(currentDate);
    }

    let scanIndex = startIndex;

    // 1. Scan ahead to find unpaid school weekdays
    while (datesToRecord.length < daysToCover && scanIndex < schoolDays.length) {
      const dStr = schoolDays[scanIndex];
      if (dStr !== currentDate && !holidays.includes(dStr)) {
        if (!isDayPaidFunc(dStr)) {
          datesToRecord.push(dStr);
        }
      }
      scanIndex++;
    }

    // 2. Fallback: If some days couldn't be filled due to existing payments,
    // let's grab the next available days from the term (even if already paid/override if necessary) 
    // to complete the days count, so the teacher has their full credits applied.
    if (datesToRecord.length < daysToCover) {
      let secondaryIndex = startIndex;
      while (datesToRecord.length < daysToCover && secondaryIndex < schoolDays.length) {
        const dStr = schoolDays[secondaryIndex];
        if (!datesToRecord.includes(dStr) && !holidays.includes(dStr)) {
          datesToRecord.push(dStr);
        }
        secondaryIndex++;
      }
    }

    // If there are still not enough days because the requested days exceed term size,
    // we can generate auxiliary standard school days starting from the end of the term.
    if (datesToRecord.length < daysToCover) {
      const lastDay = schoolDays[schoolDays.length - 1] || currentDate;
      // Let's generate auxiliary school days starting after the last day
      const auxDays = generateSchoolDays(lastDay, daysToCover + 10);
      // Exclude days that are already in schoolDays
      let auxIndex = 1; // start from day after lastDay
      while (datesToRecord.length < daysToCover && auxIndex < auxDays.length) {
        const auxDStr = auxDays[auxIndex];
        if (!schoolDays.includes(auxDStr) && !datesToRecord.includes(auxDStr)) {
          datesToRecord.push(auxDStr);
        }
        auxIndex++;
      }
    }

    let nextPayments = [...payments];
    const recordsToCloudSync: PaymentRecord[] = [];

    // 1. Log the full advance cash payment on the explicit day it was collected (currentDate)
    const mainExistingIdx = nextPayments.findIndex(p => p.studentId === studentId && p.date === currentDate && !p.id.endsWith('_debt'));
    const existingAmount = mainExistingIdx > -1 ? nextPayments[mainExistingIdx].amount : 0;
    const totalNewAmount = amount + existingAmount;
    
    const mainRecord: PaymentRecord = {
      id: mainExistingIdx > -1 ? nextPayments[mainExistingIdx].id : `p_${studentId}_${currentDate}`,
      studentId: student.id,
      studentName: student.name,
      class: student.class,
      category: student.category,
      amount: totalNewAmount,
      date: currentDate,
      timestamp: new Date().toISOString(),
      collectedBy: currentUser ? currentUser.name : 'System Host',
      verified,
      notes: existingAmount > 0
        ? `Top-Up Added: ${currencySymbol} ${amount.toFixed(2)} added (New total paid today: ${currencySymbol} ${totalNewAmount.toFixed(2)}, covering days: ${datesToRecord.join(', ')})`
        : `Advance Fee Primary (Paid ${currencySymbol} ${amount.toFixed(2)} in advance, covering days: ${datesToRecord.join(', ')})`
    };

    if (mainExistingIdx > -1) {
      nextPayments[mainExistingIdx] = mainRecord;
    } else {
      nextPayments.push(mainRecord);
    }
    recordsToCloudSync.push(mainRecord);

    // 2. Log 0-amount marker records for each covered day (except currentDate if it's in datesToRecord) 
    // to mark them as paid/cleared without spreading the actual cash collection
    datesToRecord.forEach((dayStr) => {
      if (dayStr === currentDate) return;

      const existingIdx = nextPayments.findIndex(p => p.studentId === studentId && p.date === dayStr && !p.id.endsWith('_debt'));
      
      if (existingIdx > -1) {
        const existingRecord = nextPayments[existingIdx];
        if (existingRecord.amount > 0) {
          const updatedRecord: PaymentRecord = {
            ...existingRecord,
            notes: existingRecord.notes 
              ? `${existingRecord.notes} | Block prepaid on ${currentDate}` 
              : `Block prepaid on ${currentDate}`
          };
          nextPayments[existingIdx] = updatedRecord;
          recordsToCloudSync.push(updatedRecord);
          return;
        }
      }

      const record: PaymentRecord = {
        id: existingIdx > -1 ? nextPayments[existingIdx].id : `p_${studentId}_${dayStr}`,
        studentId: student.id,
        studentName: student.name,
        class: student.class,
        category: student.category,
        amount: 0,
        date: dayStr,
        timestamp: new Date().toISOString(),
        collectedBy: currentUser ? currentUser.name : 'System Host',
        verified,
        notes: `Covered (Prepaid in advance, ${currencySymbol} ${amount.toFixed(2)} on ${currentDate})`
      };

      if (existingIdx > -1) {
        nextPayments[existingIdx] = record;
      } else {
        nextPayments.push(record);
      }
      recordsToCloudSync.push(record);
    });

    setPayments(nextPayments);
    saveState(users, students, nextPayments);

    if (db.isActive() && storageMode === 'cloud') {
      recordsToCloudSync.forEach(rec => {
        db.savePayment(rec);
      });
    } else if (recordsToCloudSync.length > 0) {
      recordLocallyPendingEdit('payment', 'create', `Logged GHC ${amount.toFixed(2)} advance payment (${daysToCover} days) for pupil: "${student?.name || 'Pupil'}"`);
    }
  };

  const recordBackwardPayment = (studentId: string, amount: number, verified = true) => {
    // Forward directly to recordPayment which automatically acts as the debt clearance and remainder-mapping pipeline
    recordPayment(studentId, verified, amount);
  };

  const bulkRecordPayments = (studentIds: string[], verified = true, customAmount?: number) => {
    let nextPayments = [...payments];
    const recordsToSync: PaymentRecord[] = [];
    studentIds.forEach(id => {
      const student = students.find(s => s.id === id);
      if (!student) return;

      const idx = nextPayments.findIndex(p => p.studentId === id && p.date === currentDate);
      let record: PaymentRecord;
      const discountAmount = student.discount || 0;
      const baseDailyFee = systemSettings?.baselineDailyFee ?? 5.00;
      const finalAmount = customAmount !== undefined ? customAmount : Math.max(0, baseDailyFee - discountAmount);
      
      if (idx > -1) {
        record = {
          ...nextPayments[idx],
          verified,
          timestamp: new Date().toISOString()
        };
        nextPayments[idx] = record;
      } else {
        record = {
          id: `p_${id}_${currentDate}`,
          studentId: id,
          studentName: student.name,
          class: student.class,
          category: student.category,
          amount: finalAmount,
          date: currentDate,
          timestamp: new Date().toISOString(),
          collectedBy: currentUser ? currentUser.name : 'System Host',
          verified,
          notes: discountAmount > 0 ? `Applied dynamic discount of GHC ${discountAmount.toFixed(2)}` : undefined
        };
        nextPayments.push(record);
      }
      recordsToSync.push(record);
    });

    setPayments(nextPayments);
    saveState(users, students, nextPayments);
    if (db.isActive() && storageMode === 'cloud' && recordsToSync.length > 0) {
      db.savePayments(recordsToSync);
    } else if (recordsToSync.length > 0) {
      recordLocallyPendingEdit('bulk', 'create', `Bulk logged standard day payments for ${recordsToSync.length} pupils`);
    }

    // Trigger staggered automatic check-in WhatsApp alerts
    studentIds.forEach((id, index) => {
      setTimeout(() => {
        checkAndSendCheckInAlert(id);
        checkAndSendArrearsAlert(id);
      }, index * 250);
    });
  };

  const recordPresentZeroPay = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const existingIndex = payments.findIndex(p => p.studentId === studentId && p.date === currentDate && !p.id.endsWith('_debt'));
    let nextPayments = [...payments];
    let recordToSave: PaymentRecord;

    if (existingIndex > -1) {
      recordToSave = {
        ...nextPayments[existingIndex],
        amount: nextPayments[existingIndex].amount,
        isAbsent: false,
        verified: true,
        notes: nextPayments[existingIndex].notes?.includes('Present or ¢0') 
          ? nextPayments[existingIndex].notes 
          : (nextPayments[existingIndex].notes ? `${nextPayments[existingIndex].notes} | Present or ¢0` : 'Present or ¢0'),
        timestamp: new Date().toISOString()
      };
      nextPayments[existingIndex] = recordToSave;
    } else {
      recordToSave = {
        id: `p_${studentId}_${currentDate}`,
        studentId: student.id,
        studentName: student.name,
        class: student.class,
        category: student.category,
        amount: 0,
        date: currentDate,
        timestamp: new Date().toISOString(),
        collectedBy: currentUser ? currentUser.name : 'System Host',
        verified: true,
        isAbsent: false,
        notes: 'Present or ¢0'
      };
      nextPayments.push(recordToSave);
    }

    setPayments(nextPayments);
    saveState(users, students, nextPayments);
    if (db.isActive() && storageMode === 'cloud') {
      db.savePayment(recordToSave);
    } else {
      recordLocallyPendingEdit('payment', 'create', `Marked pupil: "${student.name}" as Present or ¢0`);
    }
    checkAndSendCheckInAlert(studentId);
    checkAndSendArrearsAlert(studentId);
  };

  const recordPupilBulkDates = (
    studentId: string, 
    dates: string[], 
    actionType: 'paid' | 'absent' | 'present_zero' | 'clear', 
    customAmount?: number
  ) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    let nextPayments = [...payments];
    const recordsToSync: PaymentRecord[] = [];
    const paymentIdsToDelete: string[] = [];

    dates.forEach(dayStr => {
      const idx = nextPayments.findIndex(p => p.studentId === studentId && p.date === dayStr && !p.id.endsWith('_debt'));

      if (actionType === 'clear') {
        if (idx > -1) {
          const matched = nextPayments[idx];
          paymentIdsToDelete.push(matched.id);
          nextPayments.splice(idx, 1);
        }
      } else {
        let record: PaymentRecord;
        const discountAmount = student.discount || 0;
        const baseDailyFee = systemSettings?.baselineDailyFee ?? 5.00;
        const finalAmount = actionType === 'paid' 
          ? (customAmount !== undefined ? customAmount : Math.max(0, baseDailyFee - discountAmount)) 
          : 0;
        const isAbsent = actionType === 'absent';
        const currencySymbol = systemSettings?.currencyCode || 'GHC';
        const notesStr = actionType === 'paid'
          ? (customAmount !== undefined ? `Custom bulk ${currencySymbol} ${customAmount.toFixed(2)}` : `Bulk standard payment`)
          : actionType === 'absent'
            ? 'Marked absent via bulk'
            : 'Present or ¢0 via bulk';

        if (idx > -1) {
          record = {
            ...nextPayments[idx],
            amount: finalAmount,
            isAbsent,
            verified: true,
            notes: notesStr,
            timestamp: new Date().toISOString()
          };
          nextPayments[idx] = record;
        } else {
          record = {
            id: `p_${studentId}_${dayStr}`,
            studentId,
            studentName: student.name,
            class: student.class,
            category: student.category,
            amount: finalAmount,
            date: dayStr,
            timestamp: new Date().toISOString(),
            collectedBy: currentUser ? currentUser.name : 'System Host',
            verified: true,
            isAbsent,
            notes: notesStr
          };
          nextPayments.push(record);
        }
        recordsToSync.push(record);
      }
    });

    setPayments(nextPayments);
    saveState(users, students, nextPayments);

    if (db.isActive() && storageMode === 'cloud') {
      if (recordsToSync.length > 0) {
        recordsToSync.forEach(rec => db.savePayment(rec));
      }
      if (paymentIdsToDelete.length > 0) {
        paymentIdsToDelete.forEach(pId => db.deletePayment(pId));
      }
    } else {
      if (recordsToSync.length > 0) {
        recordLocallyPendingEdit('bulk', 'create', `Bulk logged ${recordsToSync.length} checks for ${student.name}`);
      }
      if (paymentIdsToDelete.length > 0) {
        recordLocallyPendingEdit('bulk', 'delete', `Bulk cleared ${paymentIdsToDelete.length} records for ${student.name}`);
      }
    }
  };

  const verifyPayment = (paymentId: string) => {
    let recordToSync: PaymentRecord | null = null;
    const nextPayments = payments.map(p => {
      if (p.id === paymentId) {
        recordToSync = { ...p, verified: true };
        return recordToSync;
      }
      return p;
    });
    setPayments(nextPayments);
    saveState(users, students, nextPayments);
    if (db.isActive() && storageMode === 'cloud' && recordToSync) {
      db.savePayment(recordToSync);
    } else if (recordToSync) {
      recordLocallyPendingEdit('payment', 'update', `Verified payment registration for: "${(recordToSync as PaymentRecord).studentName}"`);
    }
  };

  const deletePayment = (paymentId: string) => {
    const targetP = payments.find(p => p.id === paymentId);
    if (!targetP) return;

    let clearedDatesToDelete: string[] = targetP.clearedDates || [];

    // Filter out both the main payment record, and any zero-amount markers on the cleared dates
    const nextPayments = payments.filter(p => {
      if (p.id === paymentId) return false;
      if (p.studentId === targetP.studentId && p.amount === 0 && clearedDatesToDelete.includes(p.date)) {
        return false;
      }
      return true;
    });

    setPayments(nextPayments);
    saveState(users, students, nextPayments);

    if (db.isActive()) {
      db.deletePayment(paymentId);
      // Also delete marker records from Cloud Firestore if active
      clearedDatesToDelete.forEach(dStr => {
        const markerId = `p_${targetP.studentId}_${dStr}`;
        db.deletePayment(markerId);
      });
    }
    if (storageMode !== 'cloud') {
      recordLocallyPendingEdit('payment', 'delete', `Voided payment transaction entry for pupil: "${targetP?.studentName || 'Pupil'}"`);
    }
  };

  const deleteStudentPayments = (studentId: string) => {
    const nextPayments = payments.filter(p => p.studentId !== studentId);
    setPayments(nextPayments);
    saveState(users, students, nextPayments);
    if (db.isActive()) {
      db.deleteStudentPayments(studentId);
    }
    if (storageMode !== 'cloud') {
      const targetS = students.find(s => s.id === studentId);
      recordLocallyPendingEdit('payment', 'delete', `Voided all payment transaction history entries for pupil: "${targetS?.name || 'Pupil'}"`);
    }
  };

  const clearDailyPaymentsForClass = (classId: StudentClass, dateStr: string) => {
    // Find all payments for this class and date
    const paymentsToDelete = payments.filter(p => p.class === classId && p.date === dateStr);
    if (paymentsToDelete.length === 0) return;

    const paymentIdsToDelete = paymentsToDelete.map(p => p.id);
    const allMarkerIdsToDelete: string[] = [];
    paymentsToDelete.forEach(p => {
      if (p.clearedDates && p.clearedDates.length > 0) {
        p.clearedDates.forEach(dStr => {
          allMarkerIdsToDelete.push(`p_${p.studentId}_${dStr}`);
        });
      }
    });

    const nextPayments = payments.filter(p => {
      if (paymentIdsToDelete.includes(p.id)) return false;
      const matchedDeletedP = paymentsToDelete.find(delP => delP.studentId === p.studentId);
      if (matchedDeletedP && p.amount === 0 && matchedDeletedP.clearedDates?.includes(p.date)) {
        return false;
      }
      return true;
    });

    setPayments(nextPayments);
    saveState(users, students, nextPayments);

    if (db.isActive()) {
      paymentIdsToDelete.forEach(pId => db.deletePayment(pId));
      allMarkerIdsToDelete.forEach(mId => db.deletePayment(mId));
    }
    if (storageMode !== 'cloud') {
      recordLocallyPendingEdit('bulk', 'delete', `Bulk cleared ${paymentsToDelete.length} payment records for class ${classId} on ${dateStr}`);
    }
  };

  const adjustPayment = (paymentId: string, updatedAmount: number, updatedIsAbsent: boolean, notes: string, reason: string) => {
    let recordToSync: PaymentRecord | null = null;
    const nextPayments = payments.map(p => {
      if (p.id === paymentId) {
        // Create history entry
        const historyEntry = {
          modifiedBy: currentUser?.name || currentUser?.email || 'Authorized Auditor',
          modifiedAt: new Date().toISOString(),
          oldAmount: p.amount,
          newAmount: updatedAmount,
          oldIsAbsent: !!p.isAbsent,
          newIsAbsent: updatedIsAbsent,
          reason: reason
        };

        const existingHistory = p.history || [];
        
        recordToSync = {
          ...p,
          amount: updatedAmount,
          isAbsent: updatedIsAbsent,
          notes: notes,
          history: [...existingHistory, historyEntry]
        };
        return recordToSync;
      }
      return p;
    });

    setPayments(nextPayments);
    saveState(users, students, nextPayments);
    
    if (db.isActive() && storageMode === 'cloud' && recordToSync) {
      db.savePayment(recordToSync);
    } else if (recordToSync) {
      recordLocallyPendingEdit('payment', 'update', `Adjusted past payment for pupil: "${(recordToSync as PaymentRecord).studentName}"`);
    }
  };

  const seedFirebaseFromLocal = async () => {
    if (!db.isActive()) {
      return { success: false, message: 'Server database configuration is missing!' };
    }
    try {
      const success = await db.seedTables(users, students, payments);
      if (success) {
        setFirebaseConnected(true);
        clearPendingLocalEdits();
        return { success: true, message: 'Seeded records safely into Server local-JSON tables!' };
      }
      return { success: false, message: 'Seeding rejected. Make sure target database is reachable.' };
    } catch (e) {
      console.warn("Seeding error caught:", e);
      let errorStr = e instanceof Error ? e.message : String(e);
      try {
        const parsed = JSON.parse(errorStr);
        if (parsed.error) {
          errorStr = parsed.error;
        }
      } catch {}
      
      if (errorStr.includes('Timeout')) {
        return { 
          success: false, 
          message: 'Server Sync connection timed out. Please click "Switch & Sync Cloud" or "Merge & Sync" again now to retry!' 
        };
      }
      return { success: false, message: `Cloud Sync failed: ${errorStr}` };
    }
  };

  const getDailyStats = (dateStr: string): DailyStats => {
    const targetDatePayments = payments.filter(p => p.date === dateStr);
    const activeStudents = students.filter(s => s.active);

    const paidCount = targetDatePayments.filter(p => !p.isAbsent).length;
    const absentCount = targetDatePayments.filter(p => p.isAbsent).length;
    const pendingCount = Math.max(0, activeStudents.length - paidCount - absentCount);

    const totalCollected = targetDatePayments.reduce((acc, p) => acc + ((p.verified && !p.isAbsent) ? p.amount : 0), 0);
    const baseDailyFee = systemSettings?.baselineDailyFee ?? 5.00;
    const totalExpected = activeStudents.reduce((acc, s) => acc + Math.max(0, baseDailyFee - (s.discount || 0)), 0);

    const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

    const byCategory: Record<SchoolCategory, number> = {
      'Pre-school': 0,
      'Primary': 0,
      'JHS': 0
    };

    const byClass: Record<StudentClass, number> = {
      Nursery: 0, KG1: 0, KG2: 0,
      B1: 0, B2: 0, B3: 0, B4: 0, B5: 0, B6: 0,
      B7: 0, B8: 0, B9: 0
    };

    targetDatePayments.forEach(p => {
      if (p.verified && !p.isAbsent) {
        byCategory[p.category] = (byCategory[p.category] || 0) + p.amount;
        byClass[p.class] = (byClass[p.class] || 0) + p.amount;
      }
    });

    return {
      totalCollected,
      totalExpected,
      paidCount,
      pendingCount,
      absentCount,
      collectionRate,
      byCategory,
      byClass
    };
  };

  const getTeacherMetrics = (dateStr: string): TeacherMetric[] => {
    // We compute metrics per class based on active students
    const classes: StudentClass[] = [
      'Nursery', 'KG1', 'KG2',
      'B1', 'B2', 'B3', 'B4', 'B5', 'B6',
      'B7', 'B8', 'B9'
    ];

    return classes.map(cls => {
      const clsStudents = students.filter(s => s.class === cls && s.active);
      const paidCls = payments.filter(p => p.class === cls && p.date === dateStr);
      const verifiedPaid = paidCls.filter(p => p.verified && !p.isAbsent);

      // Link dynamically to assigned teacher users, falling back to known seeded defaults
      const assignedUser = users.find(u => u.role === 'Teacher' && (u.assignedClass === cls || u.assignedClasses?.includes(cls)) && u.active !== false);
      let teacherName = '';

      if (assignedUser) {
        teacherName = assignedUser.name;
      } else {
        if (cls === 'Nursery') teacherName = 'Mrs. Abigail Mensah';
        else if (cls === 'B1') teacherName = 'Mr. Emmanuel Gyamfi';
        else if (cls === 'KG1') teacherName = 'Mrs. Grace Annan';
        else if (cls === 'KG2') teacherName = 'Mrs. Beatrice Boateng';
        else if (cls === 'B2') teacherName = 'Mr. Samuel Osei';
        else if (cls === 'B3') teacherName = 'Mr. Kofi Boateng';
        else if (cls === 'B4') teacherName = 'Mrs. Rita Owusu';
        else if (cls === 'B5') teacherName = 'Mr. Desmond Taylor';
        else if (cls === 'B6') teacherName = 'Mrs. Joyce Arthur';
        else if (cls === 'B7') teacherName = 'Mr. Richard Boadu';
        else if (cls === 'B8') teacherName = 'Madam Faustina Asare';
        else if (cls === 'B9') teacherName = 'Mr. Philip Ansah';
        else teacherName = 'Madam Mary Appiah';
      }

      const collected = verifiedPaid.reduce((acc, p) => acc + p.amount, 0);
      const rate = clsStudents.length > 0 ? (verifiedPaid.length / clsStudents.length) * 100 : 0;

      return {
        teacherName,
        className: cls,
        category: getClassCategory(cls),
        studentsCount: clsStudents.length,
        paidCount: verifiedPaid.length,
        collected,
        rate
      };
    });
  };

  const getCashFlowTrend = (): CashFlowTrendPoint[] => {
    // Generate payments aggregated for the last 5 days
    const datesList: string[] = payments.map(p => p.date);
    const uniqueDates: string[] = Array.from(new Set(datesList)).sort();
    
    // Fallback if empty
    if (uniqueDates.length === 0) {
      return [{ date: currentDate, formattedDate: 'Today', amount: 0, transactions: 0 }];
    }

    return uniqueDates.map((dateStr: string) => {
      const datePayments = payments.filter(p => p.date === dateStr && p.verified);
      const parts = dateStr.split('-');
      const formattedDate = parts[2] ? `${parts[2]}/${parts[1]}` : dateStr;
      const totalAmount = datePayments.reduce((acc, p) => acc + p.amount, 0);

      return {
        date: dateStr,
        formattedDate,
        amount: totalAmount,
        transactions: datePayments.length
      };
    });
  };

  const getPendingAlerts = (dateStr: string): PendingAlert[] => {
    const activeStudents = students.filter(s => s.active);
    const paidStudentIds = new Set(payments.filter(p => p.date === dateStr).map(p => p.studentId));

    const pending: PendingAlert[] = [];
    activeStudents.forEach(student => {
      if (!paidStudentIds.has(student.id)) {
        pending.push({
          studentId: student.id,
          studentName: student.name,
          class: student.class,
          category: student.category,
          guardianPhone: student.guardianPhone || 'No Contacts'
        });
      }
    });

    return pending;
  };

  const sendMonthlyEmailDraft = (email: string) => {
    // Assemble structured HTML report draft for accounting department
    const totalPaymentsCount = payments.length;
    const totalGhcCollected = payments.filter(p => p.verified).reduce((sum, p) => sum + p.amount, 0);
    const activeStudentsCount = students.filter(s => s.active).length;

    // Categorization sums
    const preSchoolTot = payments.filter(p => p.verified && p.category === 'Pre-school').reduce((s, p) => s + p.amount, 0);
    const primaryTot = payments.filter(p => p.verified && p.category === 'Primary').reduce((s, p) => s + p.amount, 0);
    const jhsTot = payments.filter(p => p.verified && p.category === 'JHS').reduce((s, p) => s + p.amount, 0);

    const draftContent = `
=== SECURE TRANSMISSION ===
DATE: May 30, 2026
TO: ${email}
CC: school-finance-dept@school.edu.gh
SUBJECT: Daily School Fee Tracker - Automated Monthly Audit Summary

Saako educational trust Daily Fee Tracker Report
-------------------------------------------------------
Scope Period: May 2026 Monthly Summary
Report Date: ${new Date().toLocaleDateString('en-GB')}
Authorized Signatory: ${currentUser?.name || 'Administrator'}

SUMMARY METRICS:
* Total Verified Fees Collected: GHC ${totalGhcCollected.toFixed(2)}
* Total Registrations Audited: ${totalPaymentsCount} Daily Payments
* Active Enrollment Audited: ${activeStudentsCount} Students

CATEGORIZED ACCOUNTING BREAKDOWN:
* Pre-school Collections: GHC ${preSchoolTot.toFixed(2)} [Nursery, KG1, KG2]
* Primary School Collections: GHC ${primaryTot.toFixed(2)} [B1 to B6]
* JHS School Collections: GHC ${jhsTot.toFixed(2)} [B7 to B9]

This ledger balance has been marked and verified by authorized teachers at daily school check points. Please verify the exported Excel audit logs attached within the report panel.

-------------------------------------------------------
School Administration Financial Audit System (MFA Secure)
    `;

    return {
      success: true,
      message: `Ledger draft prepared and securely simulated to ${email}.`,
      draftContent
    };
  };

  const saveTerms = (newTerms: Term[]) => {
    setTerms(newTerms);
    localStorage.setItem('s_terms', JSON.stringify(newTerms));
    if (storageMode === 'cloud') {
      db.saveTerms(newTerms);
    }
  };

  const addTerm = (name: string, startDate: string, daysCount: number, isActive = true) => {
    const schoolDays = generateSchoolDays(startDate, daysCount);
    const newTerm: Term = {
      id: 'term_' + Date.now(),
      name,
      startDate,
      daysCount,
      schoolDays,
      active: terms.length === 0 ? true : isActive
    };
    
    let nextTerms = [...terms, newTerm];
    
    // If we make it active, mark others inactive
    if (newTerm.active) {
      nextTerms = nextTerms.map(t => ({
        ...t,
        active: t.id === newTerm.id
      }));
      if (schoolDays.length > 0) {
        setCurrentDate(schoolDays[0]);
      }
    } else {
      nextTerms = nextTerms.map(t => ({
        ...t,
        active: t.id === newTerm.id ? false : t.active
      }));
    }
    saveTerms(nextTerms);
    recordLocallyPendingEdit('term', 'create', `Created new school term: "${name}" (${newTerm.active ? 'Active' : 'Inactive'})`);
  };

  const editTerm = (id: string, name: string, startDate: string, daysCount: number, isActive = true) => {
    const schoolDays = generateSchoolDays(startDate, daysCount);
    
    let nextTerms = terms.map(t => {
      if (t.id === id) {
        return {
          ...t,
          name,
          startDate,
          daysCount,
          schoolDays,
          active: isActive
        };
      }
      return t;
    });

    // If we make it active, mark others inactive
    if (isActive) {
      nextTerms = nextTerms.map(t => ({
        ...t,
        active: t.id === id
      }));
      if (schoolDays.length > 0) {
        setCurrentDate(schoolDays[0]);
      }
    } else {
      // If we mark the currently active term inactive and there is no other active term, let's keep things correct
      const hasActive = nextTerms.some(t => t.active);
      if (!hasActive && nextTerms.length > 0) {
        // Fallback: make the first one active, or let activeTerm be null
      }
    }
    
    saveTerms(nextTerms);
    recordLocallyPendingEdit('term', 'update', `Updated school term: "${name}" (${isActive ? 'Active' : 'Inactive'})`);
  };

  const setActiveTerm = (termId: string) => {
    const nextTerms = terms.map(t => ({
      ...t,
      active: t.id === termId
    }));
    saveTerms(nextTerms);

    const newlyActive = nextTerms.find(t => t.id === termId);
    if (newlyActive && newlyActive.schoolDays.length > 0) {
      setCurrentDate(newlyActive.schoolDays[0]);
    }
  };

  const deleteTerm = (termId: string) => {
    const targetTerm = terms.find(t => t.id === termId);
    const remaining = terms.filter(t => t.id !== termId);
    if (remaining.length > 0 && !remaining.some(t => t.active)) {
      remaining[0].active = true;
      if (remaining[0].schoolDays.length > 0) {
        setCurrentDate(remaining[0].schoolDays[0]);
      }
    }
    saveTerms(remaining);
    if (storageMode === 'cloud') {
      db.deleteTerm(termId);
    }
    recordLocallyPendingEdit('term', 'delete', `Deleted school term: "${targetTerm?.name || 'Term'}"`);
  };

  const addPublicHoliday = (termId: string, date: string) => {
    const nextTerms = terms.map(t => {
      if (t.id === termId) {
        const holidays = t.publicHolidays || [];
        if (!holidays.includes(date)) {
          return {
            ...t,
            publicHolidays: [...holidays, date]
          };
        }
      }
      return t;
    });
    saveTerms(nextTerms);
    recordLocallyPendingEdit('term', 'update', `Added public holiday on ${date}`);
  };

  const removePublicHoliday = (termId: string, date: string) => {
    const nextTerms = terms.map(t => {
      if (t.id === termId) {
        const holidays = t.publicHolidays || [];
        return {
          ...t,
          publicHolidays: holidays.filter(h => h !== date)
        };
      }
      return t;
    });
    saveTerms(nextTerms);
    recordLocallyPendingEdit('term', 'update', `Removed public holiday on ${date}`);
  };

  const resetData = () => {
    localStorage.removeItem('s_users');
    localStorage.removeItem('s_students');
    localStorage.removeItem('s_payments');
    localStorage.removeItem('s_terms');
    setUsers(INITIAL_USERS);
    setStudents(INITIAL_STUDENTS);
    setPayments(generateSeedPayments());
    
    const initialTerms = [{
      id: 'term_default',
      name: 'Term 1 (May/June 2026)',
      startDate: '2026-05-25',
      daysCount: 15,
      schoolDays: generateSchoolDays('2026-05-25', 15),
      active: true
    }];
    setTerms(initialTerms);
    localStorage.setItem('s_terms', JSON.stringify(initialTerms));

    if (db.isActive() && storageMode === 'cloud') {
      db.seedTables(INITIAL_USERS, INITIAL_STUDENTS, generateSeedPayments(), initialTerms).catch(err => {
        console.error("Failed to seed fallback data on backend server:", err);
      });
    }
  };

  const clearSampleStudents = () => {
    setStudents([]);
    setPayments([]);
    localStorage.setItem('s_students', JSON.stringify([]));
    localStorage.setItem('s_payments', JSON.stringify([]));
    
    // If backend sync is active, clear database on the server too keeping staff users intact
    if (db.isActive() && storageMode === 'cloud') {
      db.seedTables(users, [], []).catch(err => {
        console.error("Failed to seed empty tables on backend server:", err);
      });
    }
  };

  const clearAllPayments = () => {
    setPayments([]);
    localStorage.setItem('s_payments', JSON.stringify([]));
    
    // If backend sync is active, clear payments collection on backend keeping everything else
    if (db.isActive() && storageMode === 'cloud') {
      db.seedTables(users, students, []).catch(err => {
        console.error("Failed to clear payments table on backend server:", err);
      });
    }
  };

  const promoteAllStudents = () => {
    const CLASS_PROMOTION_MAP: Record<StudentClass, { nextClass: StudentClass | null; category: SchoolCategory; completes: boolean }> = {
      'Nursery': { nextClass: 'KG1', category: 'Pre-school', completes: false },
      'KG1':     { nextClass: 'KG2', category: 'Pre-school', completes: false },
      'KG2':     { nextClass: 'B1',  category: 'Primary',    completes: false },
      'B1':      { nextClass: 'B2',  category: 'Primary',    completes: false },
      'B2':      { nextClass: 'B3',  category: 'Primary',    completes: false },
      'B3':      { nextClass: 'B4',  category: 'Primary',    completes: false },
      'B4':      { nextClass: 'B5',  category: 'Primary',    completes: false },
      'B5':      { nextClass: 'B6',  category: 'Primary',    completes: false },
      'B6':      { nextClass: 'B7',  category: 'JHS',        completes: false },
      'B7':      { nextClass: 'B8',  category: 'JHS',        completes: false },
      'B8':      { nextClass: 'B9',  category: 'JHS',        completes: false },
      'B9':      { nextClass: null,  category: 'JHS',        completes: true }
    };

    const updatedStudents = students.map(student => {
      if (!student.active) return student;

      const mapEntry = CLASS_PROMOTION_MAP[student.class];
      if (!mapEntry) return student;

      if (mapEntry.completes) {
        return {
          ...student,
          active: false
        };
      }

      if (mapEntry.nextClass) {
        return {
          ...student,
          class: mapEntry.nextClass,
          category: mapEntry.category
        };
      }

      return student;
    });

    setStudents(updatedStudents);
    saveState(users, updatedStudents, payments);

    if (db.isActive() && storageMode === 'cloud') {
      db.saveStudentsBulk(updatedStudents).catch(err => {
        console.error("Failed to save bulk promoted students to cloud:", err);
      });
    } else {
      recordLocallyPendingEdit('student', 'update', `Promoted cohorts school-wide to the next academic year`);
    }
  };

  const addExpense = (amount: number, category: ExpenseCategory, description: string, approvedBy: string, date: string) => {
    const newExpense: Expense = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      date,
      amount,
      category,
      description,
      approvedBy,
      timestamp: new Date().toISOString()
    };

    const updated = [newExpense, ...expenses];
    setExpenses(updated);
    localStorage.setItem('s_expenses', JSON.stringify(updated));

    if (db.isActive() && storageMode === 'cloud') {
      db.saveExpense(newExpense).catch(err => {
        console.error("Failed to save expense to cloud:", err);
      });
    }
  };

  const deleteExpense = (expenseId: string) => {
    const updated = expenses.filter(e => e.id !== expenseId);
    setExpenses(updated);
    localStorage.setItem('s_expenses', JSON.stringify(updated));

    if (db.isActive() && storageMode === 'cloud') {
      db.deleteExpense(expenseId).catch(err => {
        console.error("Failed to delete expense from cloud:", err);
      });
    }
  };

  const addBudgetTarget = async (itemName: string, targetAmount: number, savedPercentage: number, description?: string, category?: string) => {
    const newTarget: BudgetTarget = {
      id: `target-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      itemName,
      targetAmount,
      savedPercentage,
      createdAt: new Date().toISOString(),
      active: true,
      completed: false,
      description,
      category
    };

    const updated = [newTarget, ...budgetTargets];
    setBudgetTargets(updated);
    localStorage.setItem('s_budget_targets', JSON.stringify(updated));

    if (db.isActive() && storageMode === 'cloud') {
      try {
        await db.saveBudgetTarget(newTarget);
      } catch (err) {
        console.error("Failed to save budget target to cloud:", err);
      }
    }
  };

  const updateBudgetTarget = async (target: BudgetTarget) => {
    const updated = budgetTargets.map(t => t.id === target.id ? target : t);
    setBudgetTargets(updated);
    localStorage.setItem('s_budget_targets', JSON.stringify(updated));

    if (db.isActive() && storageMode === 'cloud') {
      try {
        await db.saveBudgetTarget(target);
      } catch (err) {
        console.error("Failed to update budget target on cloud:", err);
      }
    }
  };

  const deleteBudgetTarget = async (targetId: string) => {
    const updated = budgetTargets.filter(t => t.id !== targetId);
    setBudgetTargets(updated);
    localStorage.setItem('s_budget_targets', JSON.stringify(updated));

    if (db.isActive() && storageMode === 'cloud') {
      try {
        await db.deleteBudgetTarget(targetId);
      } catch (err) {
        console.error("Failed to delete budget target from cloud:", err);
      }
    }
  };

  const addSalary = (
    workerName: string,
    role: string,
    baseSalary: number,
    allowance: number,
    deduction: number,
    paymentMethod: PaymentMethod,
    monthYear: string,
    date: string,
    notes?: string,
    userId?: string,
    momoNumber?: string,
    momoName?: string,
    ssnitDeduction?: number,
    incomeTaxDeduction?: number,
    welfareDeduction?: number,
    healthInsDeduction?: number,
    responsibilityAllowance?: number,
    transportAllowance?: number,
    rentAllowance?: number,
    momoFeeAbsorbed?: number
  ) => {
    const netPaid = baseSalary + allowance - deduction +
      (responsibilityAllowance || 0) + (transportAllowance || 0) + (rentAllowance || 0) + (momoFeeAbsorbed || 0) -
      (ssnitDeduction || 0) - (healthInsDeduction || 0) - (incomeTaxDeduction || 0) - (welfareDeduction || 0);

    const newSalary: WorkerSalary = {
      id: `sal-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      date,
      workerName,
      userId,
      monthYear,
      role,
      baseSalary,
      allowance,
      deduction,
      netPaid,
      paymentMethod,
      notes,
      timestamp: new Date().toISOString(),
      momoNumber,
      momoName,
      ssnitDeduction,
      incomeTaxDeduction,
      welfareDeduction,
      healthInsDeduction,
      responsibilityAllowance,
      transportAllowance,
      rentAllowance,
      momoFeeAbsorbed
    };

    const updated = [newSalary, ...salaries];
    setSalaries(updated);
    localStorage.setItem('s_salaries', JSON.stringify(updated));

    if (db.isActive() && storageMode === 'cloud') {
      db.saveSalary(newSalary).catch(err => {
        console.error("Failed to save salary to cloud:", err);
      });
    }
  };

  const deleteSalary = (salaryId: string) => {
    const updated = salaries.filter(s => s.id !== salaryId);
    setSalaries(updated);
    localStorage.setItem('s_salaries', JSON.stringify(updated));

    if (db.isActive() && storageMode === 'cloud') {
      db.deleteSalary(salaryId).catch(err => {
        console.error("Failed to delete salary from cloud:", err);
      });
    }
  };

  const fetchWhatsappLogs = async () => {
    try {
      const res = await fetch('/api/whatsapp/logs');
      if (res.ok) {
        const data = await res.json();
        setWhatsappLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch WhatsApp logs state:', err);
    }
  };

  const sendautomatedWhatsApp = async (
    phone: string,
    message: string,
    studentId?: string,
    studentName?: string,
    type?: string
  ) => {
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone,
          message,
          studentId,
          studentName,
          type,
          operator: currentUser ? currentUser.name : 'System Automation'
        })
      });
      const data = await res.json();
      if (data.success) {
        await fetchWhatsappLogs();
      }
      return data;
    } catch (err: any) {
      console.error('Failed to send automated WhatsApp via API:', err);
      return { success: false, error: err?.message || String(err) };
    }
  };

  // Initially fetch whatsapp logs on storage mode shifts or startup
  useEffect(() => {
    fetchWhatsappLogs();
  }, [storageMode]);

  // Monitor budget progressive targets & trigger automated WhatsApp alerts for thresholds 50%, 75%, 100%
  useEffect(() => {
    if (!payments.length || !budgetTargets.length) return;
    
    const adminPhone = systemSettings?.adminWhatsAppPhone;
    if (!adminPhone || adminPhone.trim() === '') return;
    
    const totalFeesReceived = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    let needsUpdate = false;
    
    const updatedTargets = budgetTargets.map(target => {
      const savingsRatio = target.savedPercentage / 100;
      const savingsProgress = totalFeesReceived * savingsRatio;
      
      const percentProgress = target.targetAmount > 0 
        ? Math.floor((savingsProgress / target.targetAmount) * 100)
        : 0;
        
      const notified = target.notifiedThresholds || [];
      const newNotified = [...notified];
      let triggeredThreshold: number | null = null;
      
      const thresholds = [50, 75, 100];
      for (const t of thresholds) {
        if (percentProgress >= t && !notified.includes(t)) {
          newNotified.push(t);
          triggeredThreshold = t;
          break; // Trigger one threshold at a time per target update
        }
      }
      
      if (triggeredThreshold !== null) {
        needsUpdate = true;
        const curSym = systemSettings?.currencyCode || 'GHC';
        const formattedSaved = savingsProgress.toLocaleString('en-US', { maximumFractionDigits: 0 });
        const formattedTarget = target.targetAmount.toLocaleString('en-US', { maximumFractionDigits: 0 });
        
        const message = `*🎯 SAVINGS TARGET ALERT*\n` +
          `Hello Administrator,\n\n` +
          `Your strategic budget goal has reached a new milestone!\n\n` +
          `• *Item*: ${target.itemName}\n` +
          `• *Category*: ${target.category || 'Uncategorized'}\n` +
          `• *Goal Milestone*: *${triggeredThreshold}%* achieved! 🚀\n` +
          `• *Status*: ${curSym} ${formattedSaved} saved of ${curSym} ${formattedTarget}\n` +
          `• *Allocation Rule*: ${target.savedPercentage}% of all cumulative fee entries\n\n` +
          `Keep monitoring your school's financial targets!`;
          
        sendautomatedWhatsApp(adminPhone, message, undefined, undefined, 'savings-progress');
        
        return {
          ...target,
          notifiedThresholds: newNotified
        };
      }
      
      return target;
    });
    
    if (needsUpdate) {
      setBudgetTargets(updatedTargets);
      localStorage.setItem('s_budget_targets', JSON.stringify(updatedTargets));
      
      if (db.isActive() && storageMode === 'cloud') {
        updatedTargets.forEach(async (target, idx) => {
          const oldTarget = budgetTargets[idx];
          if (JSON.stringify(target.notifiedThresholds) !== JSON.stringify(oldTarget?.notifiedThresholds)) {
            try {
              await db.saveBudgetTarget(target);
            } catch (err) {
              console.error("Failed to update budget target on cloud:", err);
            }
          }
        });
      }
    }
  }, [payments, budgetTargets, systemSettings?.adminWhatsAppPhone]);

  return (
    <AppContext.Provider value={{
      currentUser,
      users,
      students,
      payments,
      terms,
      activeTerm,
      addTerm,
      editTerm,
      setActiveTerm,
      deleteTerm,
      addPublicHoliday,
      removePublicHoliday,
      currentDate,
      setCurrentDate,
      login,
      logout,
      toggleMfaForUser,
      addStudent,
      updateStudent,
      deleteStudent,
      purgeDeactivatedStudents,
      promoteAllStudents,
      recordPayment,
      recordPresentZeroPay,
      recordAbsent,
      recordAdvancePayment,
      recordBackwardPayment,
      bulkRecordPayments,
      recordPupilBulkDates,
      verifyPayment,
      deletePayment,
      clearDailyPaymentsForClass,
      deleteStudentPayments,
      adjustPayment,
      registerStaff,
      updateStaff,
      deleteStaff,
      toggleStaffActive,
      getDailyStats,
      getTeacherMetrics,
      getCashFlowTrend,
      getPendingAlerts,
      sendMonthlyEmailDraft,
      resetData,
      clearSampleStudents,
      clearAllPayments,
      firebaseConnected,
      firebaseError,
      retryFirebaseConnection: initializeData,
      seedFirebaseFromLocal,
      storageMode,
      setStorageMode,
      bgSyncEnabled,
      setBgSyncEnabled,
      bgSyncStatus,
      saveStatus,
      lastBgSyncTime,
      pendingLocalEdits: storageMode === 'cloud' ? [] : pendingLocalEdits,
      clearPendingLocalEdits,
      backups,
      createBackup,
      restoreBackup,
      deleteBackup,
      clearAllBackups,
      audioMuted,
      setAudioMuted,
      playFeedbackSound,
      theme,
      setTheme,
      expenses,
      salaries,
      addExpense,
      deleteExpense,
      addSalary,
      deleteSalary,
      whatsappLogs,
      sendautomatedWhatsApp,
      fetchWhatsappLogs,
      systemSettings,
      updateSystemSettings,
      autoSendCheckInAlert: systemSettings?.autoSendCheckInAlert ?? false,
      setAutoSendCheckInAlert: (enabled: boolean) => {
        updateSystemSettings({ autoSendCheckInAlert: enabled });
      },
      autoSendArrearsAlert: systemSettings?.autoSendArrearsAlert ?? false,
      setAutoSendArrearsAlert: (enabled: boolean) => {
        updateSystemSettings({ autoSendArrearsAlert: enabled });
      },
      budgetTargets,
      addBudgetTarget,
      updateBudgetTarget,
      deleteBudgetTarget
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
