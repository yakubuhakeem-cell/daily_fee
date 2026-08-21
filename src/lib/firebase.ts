/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  initializeFirestore,
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  getDocFromServer,
  memoryLocalCache
} from 'firebase/firestore';
import rawFirebaseConfig from '../../firebase-applet-config.json';
import { Student, PaymentRecord, UserAccount, Term, Expense, WorkerSalary, SystemSettings, BudgetTarget, AuditLog, TeacherEvaluation, JournalEntry, TrashItem } from '../types';

export { onAuthStateChanged };

export function safeDocId(id: any): string {
  if (!id) return `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return String(id).replace(/\//g, '_').trim();
}

// Support Vite environment variables (Vercel deployments) with fallback to firebase-applet-config.json
const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || rawFirebaseConfig.apiKey,
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || rawFirebaseConfig.authDomain,
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || rawFirebaseConfig.projectId,
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || rawFirebaseConfig.storageBucket,
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || rawFirebaseConfig.messagingSenderId,
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || rawFirebaseConfig.appId,
  measurementId: (import.meta as any).env?.VITE_FIREBASE_MEASUREMENT_ID || rawFirebaseConfig.measurementId || '',
  firestoreDatabaseId: (import.meta as any).env?.VITE_FIREBASE_FIRESTORE_DATABASE_ID || (import.meta as any).env?.VITE_FIREBASE_DATABASE_ID || rawFirebaseConfig.firestoreDatabaseId,
};

const rawDbId = firebaseConfig.firestoreDatabaseId;
const dbId = (!rawDbId || rawDbId === 'default' || rawDbId === '(default)') 
  ? undefined 
  : rawDbId;

const app = initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(app);

export async function firebaseSignOut() {
  try {
    await signOut(firebaseAuth);
    return { success: true };
  } catch (err: any) {
    console.warn("Firebase Auth signOut failed:", err);
    return { success: false, error: err.message };
  }
}

export async function firebaseLogin(email: string, pass: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), pass);
    return { success: true, user: userCredential.user };
  } catch (err: any) {
    console.warn("Firebase Auth signIn failed:", err);
    return { success: false, error: err.message || "Authentication failed.", code: err.code };
  }
}

export async function firebaseSendPasswordReset(email: string) {
  try {
    await sendPasswordResetEmail(firebaseAuth, email.trim());
    return { success: true };
  } catch (err: any) {
    console.warn("Firebase Auth password reset failed:", err);
    let msg = "Failed to send password reset email.";
    if (err.code === 'auth/user-not-found') {
      msg = "No Firebase Authentication account registered with this email.";
    } else if (err.code === 'auth/invalid-email') {
      msg = "Please enter a valid email address.";
    } else if (err.message) {
      msg = err.message;
    }
    return { success: false, error: msg };
  }
}

export async function firebaseCreateAccount(email: string, pass: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), pass);
    return { success: true, user: userCredential.user };
  } catch (err: any) {
    console.warn("Firebase Auth create user failed:", err);
    return { success: false, error: err.message || "Failed to create Firebase Auth user.", code: err.code };
  }
}

// Initialize with memoryLocalCache and experimentalForceLongPolling to prevent iframe storage/connection blocks
export const firestoreDb = initializeFirestore(app, {
  localCache: memoryLocalCache(),
  experimentalForceLongPolling: true,
}, dbId);

// Core Timeout helper to prevent infinite hangs in sandbox, network filters, or offline situations
async function withTimeout<T>(promise: Promise<T>, timeoutMs = 8000, context = 'Firestore Operation'): Promise<T> {
  const finalTimeoutMs = Math.max(timeoutMs, 8000);
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`[Timeout Error] ${context} timed out after ${finalTimeoutMs}ms. Possible database setup missing or slow connection.`));
    }, finalTimeoutMs);
  });
  return Promise.race([promise, timeoutPromise]);
}

// Test connection on boot according to firestore integration skill guidance
async function testConnection() {
  try {
    const savedPref = typeof window !== 'undefined' ? window.localStorage?.getItem('s_storage_preference') : null;
    const isCloud = savedPref ? savedPref === 'cloud' : !!firebaseConfig.projectId;
    if (!isCloud) {
      console.log("Offline Local Ledger is selected. Bypassing boot diagnostics check.");
      return;
    }
    await withTimeout(getDocFromServer(doc(firestoreDb, '_test_connection', 'validation')), 5000, 'Warmboot diagnostics');
    console.log("Firebase connection verified and active.");
  } catch (error) {
    console.error("Firebase test connection on boot failed/completed. Error details: ", error);
  }
}
testConnection();

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const db = {
  // Always active since our lightweight Express storage server is always hosted and ready!
  isActive(): boolean {
    return true;
  },

  async getUsers(): Promise<UserAccount[] | null> {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error("Local Server API getUsers error: ", e);
      return null;
    }
  },

  async saveUser(user: UserAccount): Promise<boolean> {
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(user),
      });
      return res.ok;
    } catch (e) {
      console.error("Local Server API saveUser error: ", e);
      return false;
    }
  },

  async deleteUser(userId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch (e) {
      console.error("Local Server API deleteUser error: ", e);
      return false;
    }
  },

  async getStudents(): Promise<Student[] | null> {
    try {
      const res = await fetch("/api/students");
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const list: Student[] = await res.json();
      // Order alphabetically by name
      list.sort((a, b) => a.name.localeCompare(b.name));
      return list;
    } catch (e) {
      console.error("Local Server API getStudents error: ", e);
      return null;
    }
  },

  async saveStudent(student: Student): Promise<boolean> {
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(student),
      });
      return res.ok;
    } catch (e) {
      console.error("Local Server API saveStudent error: ", e);
      return false;
    }
  },

  async saveStudentsBulk(students: Student[]): Promise<boolean> {
    try {
      const res = await fetch("/api/students/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(students),
      });
      return res.ok;
    } catch (e) {
      console.error("Local Server API saveStudentsBulk error: ", e);
      return false;
    }
  },

  async deleteStudent(studentId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/students/${studentId}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch (e) {
      console.error("Local Server API deleteStudent error: ", e);
      return false;
    }
  },

  async getPayments(): Promise<PaymentRecord[] | null> {
    try {
      const res = await fetch("/api/payments");
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error("Local Server API getPayments error: ", e);
      return null;
    }
  },

  async savePayment(payment: PaymentRecord): Promise<boolean> {
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payment),
      });
      return res.ok;
    } catch (e) {
      console.error("Local Server API savePayment error: ", e);
      return false;
    }
  },

  async savePayments(payments: PaymentRecord[]): Promise<boolean> {
    try {
      const res = await fetch("/api/payments/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payments),
      });
      return res.ok;
    } catch (e) {
      console.error("Local Server API savePayments batch error: ", e);
      return false;
    }
  },

  async deletePayment(paymentId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch (e) {
      console.error("Local Server API deletePayment error: ", e);
      return false;
    }
  },

  async deletePaymentsBatch(paymentIds: string[]): Promise<boolean> {
    try {
      if (!paymentIds || paymentIds.length === 0) return true;
      const res = await fetch(`/api/payments/delete-batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: paymentIds }),
      });
      return res.ok;
    } catch (e) {
      console.error("Local Server API deletePaymentsBatch error: ", e);
      return false;
    }
  },

  async deleteStudentPayments(studentId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/payments/student/${studentId}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch (e) {
      console.error("Local Server API deleteStudentPayments error: ", e);
      return false;
    }
  },

  // Seed local cache into server tables
  async seedTables(
    usersOrPayload: UserAccount[] | any,
    students?: Student[],
    payments?: PaymentRecord[],
    terms?: Term[]
  ): Promise<boolean> {
    try {
      let bodyData: any = {};
      if (usersOrPayload && !Array.isArray(usersOrPayload) && typeof usersOrPayload === 'object') {
        bodyData = usersOrPayload;
      } else {
        bodyData = { users: usersOrPayload, students, payments, terms };
      }
      const res = await fetch("/api/seed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyData),
      });
      return res.ok;
    } catch (e) {
      console.error("Local Server API seedTables batch error: ", e);
      return false;
    }
  },

  async getTerms(): Promise<Term[] | null> {
    try {
      const res = await fetch("/api/terms");
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error("Local Server API getTerms error: ", e);
      return null;
    }
  },

  async saveTerm(term: Term): Promise<boolean> {
    try {
      const res = await fetch("/api/terms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(term),
      });
      return res.ok;
    } catch (e) {
      console.error("Local Server API saveTerm error: ", e);
      return false;
    }
  },

  async saveTerms(terms: Term[]): Promise<boolean> {
    try {
      const res = await fetch("/api/terms/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(terms),
      });
      return res.ok;
    } catch (e) {
      console.error("Local Server API saveTerms batch error: ", e);
      return false;
    }
  },

  async deleteTerm(termId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/terms/${termId}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch (e) {
      console.error("Local Server API deleteTerm error: ", e);
      return false;
    }
  },

  async getExpenses(): Promise<Expense[] | null> {
    try {
      const res = await fetch("/api/expenses");
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error("Local Server API getExpenses error: ", e);
      return null;
    }
  },

  async saveExpense(expense: Expense): Promise<boolean> {
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(expense),
      });
      return res.ok;
    } catch (e) {
      console.error("Local Server API saveExpense error: ", e);
      return false;
    }
  },

  async deleteExpense(expenseId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch (e) {
      console.error("Local Server API deleteExpense error: ", e);
      return false;
    }
  },

  async getSalaries(): Promise<WorkerSalary[] | null> {
    try {
      const res = await fetch("/api/salaries");
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error("Local Server API getSalaries error: ", e);
      return null;
    }
  },

  async saveSalary(salary: WorkerSalary): Promise<boolean> {
    try {
      const res = await fetch("/api/salaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(salary),
      });
      return res.ok;
    } catch (e) {
      console.error("Local Server API saveSalary error: ", e);
      return false;
    }
  },

  async deleteSalary(salaryId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/salaries/${salaryId}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch (e) {
      console.error("Local Server API deleteSalary error: ", e);
      return false;
    }
  },

  async getSystemSettings(): Promise<SystemSettings | null> {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error("Local Server API getSystemSettings error: ", e);
      return null;
    }
  },

  async saveSystemSettings(settings: SystemSettings): Promise<boolean> {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });
      return res.ok;
    } catch (e) {
      console.error("Local Server API saveSystemSettings error: ", e);
      return false;
    }
  },

  async getBudgetTargets(): Promise<BudgetTarget[] | null> {
    try {
      const res = await fetch("/api/budget_targets");
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error("Local Server API getBudgetTargets error: ", e);
      return null;
    }
  },

  async saveBudgetTarget(target: BudgetTarget): Promise<boolean> {
    try {
      const res = await fetch("/api/budget_targets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(target),
      });
      return res.ok;
    } catch (e) {
      console.error("Local Server API saveBudgetTarget error: ", e);
      return false;
    }
  },

  async deleteBudgetTarget(targetId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/budget_targets/${targetId}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch (e) {
      console.error("Local Server API deleteBudgetTarget error: ", e);
      return false;
    }
  },

  async getExamsPayments(): Promise<any[] | null> {
    try {
      const res = await fetch("/api/exams/payments");
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error("Local Server API getExamsPayments error: ", e);
      return null;
    }
  },

  async saveExamsPayment(payment: any): Promise<boolean> {
    try {
      const res = await fetch("/api/exams/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payment),
      });
      return res.ok;
    } catch (e) {
      console.error("Local Server API saveExamsPayment error: ", e);
      return false;
    }
  },

  async deleteExamsPayment(paymentId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/exams/payments/${paymentId}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch (e) {
      console.error("Local Server API deleteExamsPayment error: ", e);
      return false;
    }
  },

  async getExamsExpenses(): Promise<any[] | null> {
    try {
      const res = await fetch("/api/exams/expenses");
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error("Local Server API getExamsExpenses error: ", e);
      return null;
    }
  },

  async saveExamsExpense(expense: any): Promise<boolean> {
    try {
      const res = await fetch("/api/exams/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(expense),
      });
      return res.ok;
    } catch (e) {
      console.error("Local Server API saveExamsExpense error: ", e);
      return false;
    }
  },

  async deleteExamsExpense(expenseId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/exams/expenses/${expenseId}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch (e) {
      console.error("Local Server API deleteExamsExpense error: ", e);
      return false;
    }
  },

  async getExamsSettings(): Promise<any | null> {
    try {
      const res = await fetch("/api/exams/settings");
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error("Local Server API getExamsSettings error: ", e);
      return null;
    }
  },

  async saveExamsSettings(settings: any): Promise<boolean> {
    try {
      const res = await fetch("/api/exams/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });
      return res.ok;
    } catch (e) {
      console.error("Local Server API saveExamsSettings error: ", e);
      return false;
    }
  },
  
  async getAuditLogs(): Promise<AuditLog[] | null> {
    try {
      const res = await fetch("/api/audit-logs");
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error("Local Server API getAuditLogs error: ", e);
      return null;
    }
  },

  async saveAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<boolean> {
    try {
      const res = await fetch("/api/audit-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(log),
      });
      return res.ok;
    } catch (e) {
      console.error("Local Server API saveAuditLog error: ", e);
      return false;
    }
  },

  async purgeDemoData(): Promise<{ success: boolean; purgedStudentsCount: number; purgedPaymentsCount: number; purgedUsersCount: number }> {
    try {
      const res = await fetch("/api/purge-demo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        }
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error("Local Server API purgeDemoData error: ", e);
      return { success: false, purgedStudentsCount: 0, purgedPaymentsCount: 0, purgedUsersCount: 0 };
    }
  },

  async getTeacherEvaluations(): Promise<TeacherEvaluation[] | null> {
    try {
      const res = await fetch("/api/evaluations");
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error("Local Server API getTeacherEvaluations error: ", e);
      return null;
    }
  },

  async saveTeacherEvaluation(evaluation: TeacherEvaluation): Promise<boolean> {
    try {
      const res = await fetch("/api/evaluations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(evaluation),
      });
      return res.ok;
    } catch (e) {
      console.error("Local Server API saveTeacherEvaluation error: ", e);
      return false;
    }
  },

  async deleteTeacherEvaluation(evaluationId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/evaluations/${evaluationId}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch (e) {
      console.error("Local Server API deleteTeacherEvaluation error: ", e);
      return false;
    }
  },

  async getJournalEntries(): Promise<JournalEntry[] | null> {
    try {
      const res = await fetch("/api/journal_entries");
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error("Local Server API getJournalEntries error: ", e);
      return null;
    }
  },

  async saveJournalEntry(entry: JournalEntry): Promise<boolean> {
    try {
      const res = await fetch("/api/journal_entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(entry),
      });
      return res.ok;
    } catch (e) {
      console.error("Local Server API saveJournalEntry error: ", e);
      return false;
    }
  },

  async deleteJournalEntry(entryId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/journal_entries/${entryId}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch (e) {
      console.error("Local Server API deleteJournalEntry error: ", e);
      return false;
    }
  },

  async getTrashItems(): Promise<TrashItem[] | null> {
    try {
      const res = await fetch("/api/trash");
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error("Local Server API getTrashItems error: ", e);
      return null;
    }
  },

  async saveTrashItem(item: TrashItem): Promise<boolean> {
    try {
      const res = await fetch("/api/trash", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(item),
      });
      return res.ok;
    } catch (e) {
      console.error("Local Server API saveTrashItem error: ", e);
      return false;
    }
  },

  async restoreTrashItem(trashId: string, operator?: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`/api/trash/restore/${trashId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ operator: operator || "System Admin" }),
      });
      const data = await res.json();
      return { success: res.ok && data.success, message: data.message || data.error || "Restoration complete." };
    } catch (e: any) {
      console.error("Local Server API restoreTrashItem error: ", e);
      return { success: false, message: e.message || "Failed to restore trash item." };
    }
  },

  async deleteTrashItem(trashId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/trash/${trashId}`, {
        method: "DELETE",
      });
      return res.ok;
    } catch (e) {
      console.error("Local Server API deleteTrashItem error: ", e);
      return false;
    }
  },

  async emptyTrash(operator?: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch("/api/trash", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ operator: operator || "System Admin" }),
      });
      const data = await res.json();
      return { success: res.ok, message: data.message || "Trash bin emptied." };
    } catch (e: any) {
      console.error("Local Server API emptyTrash error: ", e);
      return { success: false, message: e.message || "Failed to empty trash." };
    }
  }
};
