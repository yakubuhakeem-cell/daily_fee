/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
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
import firebaseConfig from '../../firebase-applet-config.json';
import { Student, PaymentRecord, UserAccount, Term, Expense, WorkerSalary, SystemSettings, BudgetTarget } from '../types';

const dbId = (!firebaseConfig.firestoreDatabaseId || firebaseConfig.firestoreDatabaseId === 'default') 
  ? undefined 
  : firebaseConfig.firestoreDatabaseId;

const app = initializeApp(firebaseConfig);

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
  async seedTables(users: UserAccount[], students: Student[], payments: PaymentRecord[], terms?: Term[]): Promise<boolean> {
    try {
      const res = await fetch("/api/seed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ users, students, payments, terms }),
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
  }
};
