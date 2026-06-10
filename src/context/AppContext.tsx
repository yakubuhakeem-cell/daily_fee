/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Student, PaymentRecord, UserAccount, UserRole, StudentClass, SchoolCategory, Term, PendingEdit, BackupRecord } from '../types';
import { INITIAL_USERS, INITIAL_STUDENTS, generateSeedPayments, getClassCategory } from '../initialData';
import { db } from '../lib/firebase';
import { generateSchoolDays } from '../utils/termUtils';

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
  addStudent: (name: string, className: StudentClass, guardianPhone?: string, photoUrl?: string, discount?: number, gender?: 'Male' | 'Female', paymentType?: 'Daily' | 'Term', termFee?: number) => void;
  updateStudent: (student: Student) => void;
  deleteStudent: (studentId: string) => void;
  purgeDeactivatedStudents: () => void;
  promoteAllStudents: () => void;
  recordPayment: (studentId: string, verified?: boolean, customAmount?: number) => void;
  recordAbsent: (studentId: string) => void;
  recordAdvancePayment: (studentId: string, amount: number, verified?: boolean) => void;
  recordBackwardPayment: (studentId: string, amount: number, verified?: boolean) => void;
  bulkRecordPayments: (studentIds: string[], verified?: boolean) => void;
  verifyPayment: (paymentId: string) => void;
  deletePayment: (paymentId: string) => void;
  deleteStudentPayments: (studentId: string) => void;
  adjustPayment: (paymentId: string, updatedAmount: number, updatedIsAbsent: boolean, notes: string, reason: string) => void;
  registerStaff: (name: string, email: string, role: UserRole, assignedClass?: StudentClass, mfaEnabled?: boolean, passwordEnabled?: boolean, password?: string, assignedClasses?: StudentClass[]) => { success: boolean; error?: string };
  updateStaff: (userId: string, name: string, email: string, role: UserRole, assignedClass?: StudentClass, mfaEnabled?: boolean, passwordEnabled?: boolean, password?: string, assignedClasses?: StudentClass[]) => { success: boolean; error?: string };
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
  lastBgSyncTime: string | null;
  pendingLocalEdits: PendingEdit[];
  clearPendingLocalEdits: () => void;
  backups: BackupRecord[];
  createBackup: (label?: string, isAuto?: boolean) => void;
  restoreBackup: (backupId: string) => void;
  deleteBackup: (backupId: string) => void;
  clearAllBackups: () => void;
  nextBackupTimeLeft: number; // in seconds
  audioMuted: boolean;
  setAudioMuted: (muted: boolean) => void;
  playFeedbackSound: (type: 'success' | 'error' | 'warning') => void;
  theme: 'dark' | 'daylight';
  setTheme: (theme: 'dark' | 'daylight') => void;
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

  const [nextBackupTimeLeft, setNextBackupTimeLeft] = useState<number>(30 * 60);

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
      setNextBackupTimeLeft(prev => {
        if (prev <= 1) {
          createBackup(undefined, true);
          return 30 * 60; // Reset countdown
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const [bgSyncEnabled, setBgSyncEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem('s_background_sync_enabled');
    return saved === 'true'; // Defaults to false
  });
  const [bgSyncStatus, setBgSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [lastBgSyncTime, setLastBgSyncTime] = useState<string | null>(null);

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
      const [dbUsers, dbStudents, dbPayments] = await Promise.all([
        db.getUsers(),
        db.getStudents(),
        db.getPayments()
      ]);

      if (dbUsers === null || dbStudents === null || dbPayments === null) {
        setBgSyncStatus('error');
        return;
      }

      setUsers(dbUsers);
      setStudents(dbStudents);
      setPayments(dbPayments);

      // Cache locally to keep quick sync speed
      localStorage.setItem('s_users', JSON.stringify(dbUsers));
      localStorage.setItem('s_students', JSON.stringify(dbStudents));
      localStorage.setItem('s_payments', JSON.stringify(dbPayments));

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
    const active = db.isActive() && storageMode === 'cloud';
    setFirebaseConnected(active);
    setFirebaseError(null);

    const localUsers = localStorage.getItem('s_users');
    const localStudents = localStorage.getItem('s_students');
    const localPayments = localStorage.getItem('s_payments');
    const localTerms = localStorage.getItem('s_terms');
    const localUser = localStorage.getItem('s_current_user');

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
        const [dbUsers, dbStudents, dbPayments, dbTerms] = await Promise.all([
          db.getUsers(),
          db.getStudents(),
          db.getPayments(),
          db.getTerms()
        ]);

        if (dbUsers === null || dbStudents === null || dbPayments === null || dbTerms === null) {
          console.warn('Cloud database collections are offline/misconfigured. Falling back to LocalStorage...');
          setFirebaseConnected(false);
          setStorageModeState('local');
          setFirebaseError('Cloud database returned null. Reverting to local storage mode.');
          loadLocalBackup(localUsers, localStudents, localPayments, localTerms);
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
            loadLocalBackup(localUsers, localStudents, localPayments, localTerms);
            return;
          }
        }

        setUsers(dbUsers);
        setStudents(dbStudents);
        setPayments(dbPayments);

        // Sync local copies as high speed cache
        localStorage.setItem('s_users', JSON.stringify(dbUsers));
        localStorage.setItem('s_students', JSON.stringify(dbStudents));
        localStorage.setItem('s_payments', JSON.stringify(dbPayments));
        
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
        loadLocalBackup(localUsers, localStudents, localPayments, localTerms);
      }
    } else {
      console.log('FEETRACK running in standard client-persistence mode (Local Storage).');
      loadLocalBackup(localUsers, localStudents, localPayments, localTerms);
    }
  };

  // Load state from Firebase if configured, otherwise fall back to localStorage
  useEffect(() => {
    initializeData();
  }, [storageMode]);

    const loadLocalBackup = (localUsers: string | null, localStudents: string | null, localPayments: string | null, localTerms: string | null) => {
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
    };

  // Sync to local backups
  const saveState = (newUsers: UserAccount[], newStudents: Student[], newPayments: PaymentRecord[]) => {
    localStorage.setItem('s_users', JSON.stringify(newUsers));
    localStorage.setItem('s_students', JSON.stringify(newStudents));
    localStorage.setItem('s_payments', JSON.stringify(newPayments));
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

  const registerStaff = (name: string, email: string, role: UserRole, assignedClass?: StudentClass, mfaEnabled = false, passwordEnabled = false, password = '', assignedClasses?: StudentClass[]) => {
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
      password: passwordEnabled ? password : undefined
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

  const updateStaff = (userId: string, name: string, email: string, role: UserRole, assignedClass?: StudentClass, mfaEnabled = false, passwordEnabled = false, password = '', assignedClasses?: StudentClass[]) => {
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
          password: passwordEnabled ? password : u.password
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

  const addStudent = (name: string, className: StudentClass, guardianPhone?: string, photoUrl?: string, discount = 0, gender?: 'Male' | 'Female', paymentType: 'Daily' | 'Term' = 'Daily', termFee = 350) => {
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
      termFee: termFee
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

  const recordPayment = (studentId: string, verified = true, customAmount?: number) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const discountAmount = student.discount || 0;
    const finalAmount = customAmount !== undefined ? customAmount : Math.max(0, 5.00 - discountAmount);

    const dailyRate = Math.max(0.01, 5.00 - discountAmount);

    // 0. Handle Term Payers differently
    if (student.paymentType === 'Term') {
      const existingIndex = payments.findIndex(p => p.studentId === studentId && p.date === currentDate && !p.id.endsWith('_debt'));
      let nextPayments = [...payments];
      let recordToSave: PaymentRecord;
      if (existingIndex > -1) {
        recordToSave = {
          ...nextPayments[existingIndex],
          amount: finalAmount,
          isAbsent: false,
          verified,
          notes: `Term Flat Fee payment received: GHC ${finalAmount.toFixed(2)}`,
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
          amount: finalAmount,
          date: currentDate,
          timestamp: new Date().toISOString(),
          collectedBy: currentUser ? currentUser.name : 'System Host',
          verified,
          isAbsent: false,
          notes: `Term Flat Fee payment received: GHC ${finalAmount.toFixed(2)}`
        };
        nextPayments.push(recordToSave);
      }
      setPayments(nextPayments);
      saveState(users, students, nextPayments);
      if (db.isActive() && storageMode === 'cloud') {
        db.savePayment(recordToSave);
      } else {
        recordLocallyPendingEdit('payment', 'create', `Logged term flat payment of GHC ${finalAmount.toFixed(2)} for pupil: "${student.name}"`);
      }
      playFeedbackSound('success');
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

    // Filter which billable past school days are still unpaid
    let runningPaid = totalPaid;
    const unpaidDays: string[] = [];
    billableDays.forEach(dStr => {
      if (runningPaid >= dailyRate) {
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
        const daysToCover = Math.floor(amountToSettle / dailyRate);
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

        const daysToCoverRemainder = Math.floor(remainder / dailyRate);
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

    } else {
      // Standard payment with NO debt
      const existingIndex = payments.findIndex(p => p.studentId === studentId && p.date === currentDate && !p.id.endsWith('_debt'));
      let nextPayments = [...payments];
      let recordToSave: PaymentRecord;

      if (existingIndex > -1) {
        recordToSave = {
          ...nextPayments[existingIndex],
          amount: finalAmount,
          isAbsent: false,
          verified,
          notes: customAmount !== undefined ? `Custom amount GHC ${finalAmount.toFixed(2)} processed` : (discountAmount > 0 ? `Applied dynamic discount of GHC ${discountAmount.toFixed(2)}` : undefined),
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
          amount: finalAmount,
          date: currentDate,
          timestamp: new Date().toISOString(),
          collectedBy: currentUser ? currentUser.name : 'System Host',
          verified,
          isAbsent: false,
          notes: customAmount !== undefined ? `Custom amount GHC ${finalAmount.toFixed(2)} processed` : (discountAmount > 0 ? `Applied dynamic discount of GHC ${discountAmount.toFixed(2)}` : undefined)
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

    // Standard school day rate is GHC 5.00, minus any student custom discount
    const dailyRate = Math.max(0.01, 5.00 - (student.discount || 0));
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
    const mainRecord: PaymentRecord = {
      id: mainExistingIdx > -1 ? nextPayments[mainExistingIdx].id : `p_${studentId}_${currentDate}`,
      studentId: student.id,
      studentName: student.name,
      class: student.class,
      category: student.category,
      amount: amount,
      date: currentDate,
      timestamp: new Date().toISOString(),
      collectedBy: currentUser ? currentUser.name : 'System Host',
      verified,
      notes: `Advance Fee Primary (Paid GHC ${amount.toFixed(2)} in advance, covering days: ${datesToRecord.join(', ')})`
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
        notes: `Covered (Prepaid in advance, GHC ${amount.toFixed(2)} on ${currentDate})`
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

  const bulkRecordPayments = (studentIds: string[], verified = true) => {
    let nextPayments = [...payments];
    const recordsToSync: PaymentRecord[] = [];
    studentIds.forEach(id => {
      const student = students.find(s => s.id === id);
      if (!student) return;

      const idx = nextPayments.findIndex(p => p.studentId === id && p.date === currentDate);
      let record: PaymentRecord;
      const discountAmount = student.discount || 0;
      const finalAmount = Math.max(0, 5.00 - discountAmount);
      
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
    const nextPayments = payments.filter(p => p.id !== paymentId);
    setPayments(nextPayments);
    saveState(users, students, nextPayments);
    if (db.isActive()) {
      db.deletePayment(paymentId);
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
    const totalExpected = activeStudents.reduce((acc, s) => acc + Math.max(0, 5.00 - (s.discount || 0)), 0);

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
      recordAbsent,
      recordAdvancePayment,
      recordBackwardPayment,
      bulkRecordPayments,
      verifyPayment,
      deletePayment,
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
      lastBgSyncTime,
      pendingLocalEdits: storageMode === 'cloud' ? [] : pendingLocalEdits,
      clearPendingLocalEdits,
      backups,
      createBackup,
      restoreBackup,
      deleteBackup,
      clearAllBackups,
      nextBackupTimeLeft,
      audioMuted,
      setAudioMuted,
      playFeedbackSound,
      theme,
      setTheme
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
