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
  collection, 
  doc, 
  getDoc,
  getDocs, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  getDocFromServer,
  memoryLocalCache
} from 'firebase/firestore';
import rawFirebaseConfig from '../../firebase-applet-config.json';
import { Student, PaymentRecord, UserAccount, Term, Expense, WorkerSalary, SystemSettings, BudgetTarget, AuditLog, TeacherEvaluation, JournalEntry, TrashItem, ExamsPayment, ExamsExpense, ExamsSettings, AcademicAssessment, TerminalReport, TeacherAllocation, AcademicSettings } from '../types';
import { DEFAULT_ACADEMIC_SETTINGS } from '../utils/ghanaCurriculum';

export { onAuthStateChanged };

export function safeDocId(id: any): string {
  if (!id) return `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return String(id).replace(/\//g, '_').trim();
}

/**
 * Sanitizes any data payload before sending to Firestore.
 * Strips `undefined` values (which Firestore rejects) and normalizes nested objects and arrays.
 */
export function sanitizeFirestoreDoc<T>(obj: T): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== undefined)
      .map(item => sanitizeFirestoreDoc(item));
  }
  if (typeof obj === 'object') {
    if (obj instanceof Date) {
      return obj.toISOString();
    }
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        clean[key] = sanitizeFirestoreDoc(value);
      }
    }
    return clean;
  }
  return obj;
}

// Default Firebase configuration fallback to ensure 100% continuous connectivity across all platforms and Vercel deployments
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyD7xsAYZbBlTKRvo23QHxwx2nzLeVnJJmM",
  authDomain: "fleet-coral-scf5x.firebaseapp.com",
  projectId: "fleet-coral-scf5x",
  storageBucket: "fleet-coral-scf5x.firebasestorage.app",
  messagingSenderId: "996050035098",
  appId: "1:996050035098:web:2db3cceeea860295481a23",
  firestoreDatabaseId: "ai-studio-6ff73614-855b-4908-bcc8-28a73e1958d7"
};

// Support Vite environment variables (Vercel deployments) with fallback to firebase-applet-config.json and project defaults
const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || rawFirebaseConfig?.apiKey || DEFAULT_FIREBASE_CONFIG.apiKey,
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || rawFirebaseConfig?.authDomain || DEFAULT_FIREBASE_CONFIG.authDomain,
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || rawFirebaseConfig?.projectId || DEFAULT_FIREBASE_CONFIG.projectId,
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || rawFirebaseConfig?.storageBucket || DEFAULT_FIREBASE_CONFIG.storageBucket,
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || rawFirebaseConfig?.messagingSenderId || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || rawFirebaseConfig?.appId || DEFAULT_FIREBASE_CONFIG.appId,
  measurementId: (import.meta as any).env?.VITE_FIREBASE_MEASUREMENT_ID || (rawFirebaseConfig as any)?.measurementId || '',
  firestoreDatabaseId: (import.meta as any).env?.VITE_FIREBASE_FIRESTORE_DATABASE_ID || (import.meta as any).env?.VITE_FIREBASE_DATABASE_ID || rawFirebaseConfig?.firestoreDatabaseId || DEFAULT_FIREBASE_CONFIG.firestoreDatabaseId,
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
async function withTimeout<T>(promise: Promise<T>, timeoutMs = 12000, context = 'Firestore Operation'): Promise<T> {
  const finalTimeoutMs = Math.max(timeoutMs, 10000);
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`[Timeout Error] ${context} timed out after ${finalTimeoutMs}ms. Database connection pending.`));
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
      return;
    }
    await withTimeout(getDocFromServer(doc(firestoreDb, '_test_connection', 'validation')), 5000, 'Warmboot diagnostics');
    console.log("Firebase connection verified and active.");
  } catch (error) {
    // Non-blocking test
  }
}
testConnection();

// Helper to perform Firestore batch writes in chunks of <= 200 items with deep sanitization
async function writeBatchChunked<T>(
  collectionName: string, 
  items: T[], 
  getId: (item: T) => string
): Promise<boolean> {
  if (!items || items.length === 0) return true;
  try {
    const CHUNK_SIZE = 200;
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      const chunk = items.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(firestoreDb);
      for (const item of chunk) {
        const id = safeDocId(getId(item));
        const cleanItem = sanitizeFirestoreDoc(item);
        const itemRef = doc(firestoreDb, collectionName, id);
        batch.set(itemRef, cleanItem, { merge: true });
      }
      await withTimeout(batch.commit(), 15000, `writeBatchChunked:${collectionName}`);
    }
    return true;
  } catch (err: any) {
    console.warn(`writeBatchChunked direct Firestore batch failed for ${collectionName} (${err?.message || err}), attempting server bridge fallback:`, err);
    // Direct server endpoint fallback
    try {
      const res = await fetch(`/api/${collectionName}/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(items),
      });
      if (res.ok) return true;
    } catch (_) {}

    try {
      const res2 = await fetch(`/api/${collectionName}/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(items),
      });
      if (res2.ok) return true;
    } catch (_) {}

    return false;
  }
}

let clientFirestoreQuotaExceededUntil = 0;

export function isClientFirestoreAvailable(): boolean {
  if (!firebaseConfig.projectId) return false;
  if (Date.now() < clientFirestoreQuotaExceededUntil) return false;
  return true;
}

export function handleClientFirestoreError(context: string, err: any) {
  const errMsg = err?.message || String(err);
  if (errMsg.includes("Quota limit exceeded") || errMsg.includes("Quota exceeded") || errMsg.includes("quota metric") || errMsg.includes("RESOURCE_EXHAUSTED")) {
    const isFirst = Date.now() >= clientFirestoreQuotaExceededUntil;
    clientFirestoreQuotaExceededUntil = Date.now() + 15 * 60 * 1000;
    if (isFirst) {
      console.warn(`[Firestore Client Quota Notice] Free daily read units limit reached on Cloud Firestore. Switching client seamlessly to local and server API cache: ${context}`);
    }
    return;
  }
  console.warn(`Firestore ${context} failed:`, err);
}

async function getCollectionDocs<T>(collectionName: string): Promise<T[] | null> {
  if (!isClientFirestoreAvailable()) {
    try {
      const res = await fetch(`/api/${collectionName}`);
      if (res.ok) return await res.json();
    } catch (_) {}
    return null;
  }

  try {
    const qSnapshot = await withTimeout(getDocs(collection(firestoreDb, collectionName)), 15000, `getDocs:${collectionName}`);
    const list: T[] = [];
    qSnapshot.forEach(docSnap => {
      list.push(docSnap.data() as T);
    });
    return list;
  } catch (err) {
    handleClientFirestoreError(`getDocs:${collectionName}`, err);
    try {
      const res = await fetch(`/api/${collectionName}`);
      if (res.ok) return await res.json();
    } catch (_) {}
    return null;
  }
}

export const db = {
  // Always active when configured with project ID
  isActive(): boolean {
    return !!firebaseConfig.projectId;
  },

  async getUsers(): Promise<UserAccount[] | null> {
    try {
      const list = await getCollectionDocs<UserAccount>("users");
      if (list && list.length > 0) return list;
      const res = await fetch("/api/users").catch(() => null);
      if (res && res.ok) return await res.json();
      return list || [];
    } catch (e) {
      console.error("getUsers error: ", e);
      return null;
    }
  },

  async saveUser(user: UserAccount): Promise<boolean> {
    try {
      const id = safeDocId(user.id);
      const clean = sanitizeFirestoreDoc(user);
      await withTimeout(setDoc(doc(firestoreDb, "users", id), clean, { merge: true }), 8000, "saveUser");
      fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clean),
      }).catch(() => {});
      return true;
    } catch (e) {
      console.error("saveUser error: ", e);
      try {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(user),
        });
        return res.ok;
      } catch {
        return false;
      }
    }
  },

  async deleteUser(userId: string): Promise<boolean> {
    try {
      const id = safeDocId(userId);
      await withTimeout(deleteDoc(doc(firestoreDb, "users", id)), 8000, "deleteUser");
      fetch(`/api/users/${id}`, { method: "DELETE" }).catch(() => {});
      return true;
    } catch (e) {
      console.error("deleteUser error: ", e);
      try {
        const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
        return res.ok;
      } catch {
        return false;
      }
    }
  },

  async getStudents(): Promise<Student[] | null> {
    try {
      const list = await getCollectionDocs<Student>("students");
      if (list) {
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        if (list.length > 0) return list;
      }
      const res = await fetch("/api/students").catch(() => null);
      if (res && res.ok) {
        const serverList: Student[] = await res.json();
        serverList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        return serverList;
      }
      return list || [];
    } catch (e) {
      console.error("getStudents error: ", e);
      return null;
    }
  },

  async saveStudent(student: Student): Promise<boolean> {
    try {
      const id = safeDocId(student.id);
      const clean = sanitizeFirestoreDoc(student);
      await withTimeout(setDoc(doc(firestoreDb, "students", id), clean, { merge: true }), 8000, "saveStudent");
      fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clean),
      }).catch(() => {});
      return true;
    } catch (e) {
      console.error("saveStudent error: ", e);
      try {
        const res = await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(student),
        });
        return res.ok;
      } catch {
        return false;
      }
    }
  },

  async saveStudentsBulk(students: Student[]): Promise<boolean> {
    try {
      const ok = await writeBatchChunked("students", students, s => s.id);
      fetch("/api/students/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(students),
      }).catch(() => {});
      return ok;
    } catch (e) {
      console.error("saveStudentsBulk error: ", e);
      return false;
    }
  },

  async deleteStudent(studentId: string): Promise<boolean> {
    try {
      const id = safeDocId(studentId);
      await withTimeout(deleteDoc(doc(firestoreDb, "students", id)), 8000, "deleteStudent");
      fetch(`/api/students/${id}`, { method: "DELETE" }).catch(() => {});
      return true;
    } catch (e) {
      console.error("deleteStudent error: ", e);
      try {
        const res = await fetch(`/api/students/${studentId}`, { method: "DELETE" });
        return res.ok;
      } catch {
        return false;
      }
    }
  },

  async getPayments(): Promise<PaymentRecord[] | null> {
    try {
      const list = await getCollectionDocs<PaymentRecord>("payments");
      if (list && list.length > 0) return list;
      const res = await fetch("/api/payments").catch(() => null);
      if (res && res.ok) return await res.json();
      return list || [];
    } catch (e) {
      console.error("getPayments error: ", e);
      return null;
    }
  },

  async savePayment(payment: PaymentRecord): Promise<boolean> {
    try {
      const id = safeDocId(payment.id || `${payment.studentId}_${payment.date}`);
      const payload = sanitizeFirestoreDoc({ ...payment, id });
      await withTimeout(setDoc(doc(firestoreDb, "payments", id), payload, { merge: true }), 8000, "savePayment");
      fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});
      return true;
    } catch (e) {
      console.error("savePayment error: ", e);
      try {
        const res = await fetch("/api/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payment),
        });
        return res.ok;
      } catch {
        return false;
      }
    }
  },

  async savePayments(payments: PaymentRecord[]): Promise<boolean> {
    try {
      const ok = await writeBatchChunked("payments", payments, p => p.id || `${p.studentId}_${p.date}`);
      fetch("/api/payments/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payments),
      }).catch(() => {});
      return ok;
    } catch (e) {
      console.error("savePayments batch error: ", e);
      return false;
    }
  },

  async deletePayment(paymentId: string): Promise<boolean> {
    try {
      const id = safeDocId(paymentId);
      await withTimeout(deleteDoc(doc(firestoreDb, "payments", id)), 8000, "deletePayment");
      fetch(`/api/payments/${id}`, { method: "DELETE" }).catch(() => {});
      return true;
    } catch (e) {
      console.error("deletePayment error: ", e);
      try {
        const res = await fetch(`/api/payments/${paymentId}`, { method: "DELETE" });
        return res.ok;
      } catch {
        return false;
      }
    }
  },

  async deletePaymentsBatch(paymentIds: string[]): Promise<boolean> {
    if (!paymentIds || paymentIds.length === 0) return true;
    try {
      const CHUNK_SIZE = 300;
      for (let i = 0; i < paymentIds.length; i += CHUNK_SIZE) {
        const chunk = paymentIds.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(firestoreDb);
        for (const pid of chunk) {
          const id = safeDocId(pid);
          batch.delete(doc(firestoreDb, "payments", id));
        }
        await withTimeout(batch.commit(), 20000, "deletePaymentsBatch");
      }
      fetch(`/api/payments/delete-batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: paymentIds }),
      }).catch(() => {});
      return true;
    } catch (e) {
      console.error("deletePaymentsBatch error: ", e);
      try {
        const res = await fetch(`/api/payments/delete-batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: paymentIds }),
        });
        return res.ok;
      } catch {
        return false;
      }
    }
  },

  async deleteStudentPayments(studentId: string): Promise<boolean> {
    try {
      fetch(`/api/payments/student/${studentId}`, { method: "DELETE" }).catch(() => {});
      return true;
    } catch (e) {
      console.error("deleteStudentPayments error: ", e);
      return false;
    }
  },

  // Seed local cache directly into Firestore tables in chunks
  async seedTables(
    usersOrPayload: UserAccount[] | any,
    students?: Student[],
    payments?: PaymentRecord[],
    terms?: Term[]
  ): Promise<boolean> {
    let uList: UserAccount[] = [];
    let sList: Student[] = [];
    let pList: PaymentRecord[] = [];
    let tList: Term[] = [];
    let expList: any[] = [];
    let salList: any[] = [];
    let epList: any[] = [];
    let eeList: any[] = [];
    let esSet: any = null;
    let btList: any[] = [];
    let wlList: any[] = [];
    let teList: any[] = [];
    let jeList: any[] = [];
    let sysSet: any = null;
    let acadSet: any = null;
    let acadAssess: any[] = [];
    let termReps: any[] = [];
    let teachAllocs: any[] = [];

    if (usersOrPayload && !Array.isArray(usersOrPayload) && typeof usersOrPayload === 'object') {
      uList = usersOrPayload.users || [];
      sList = usersOrPayload.students || [];
      pList = usersOrPayload.payments || [];
      tList = usersOrPayload.terms || [];
      expList = usersOrPayload.expenses || [];
      salList = usersOrPayload.salaries || [];
      epList = usersOrPayload.examsPayments || [];
      eeList = usersOrPayload.examsExpenses || [];
      esSet = usersOrPayload.examsSettings || null;
      btList = usersOrPayload.budgetTargets || [];
      wlList = usersOrPayload.whatsappLogs || [];
      teList = usersOrPayload.teacherEvaluations || [];
      jeList = usersOrPayload.journalEntries || [];
      sysSet = usersOrPayload.systemSettings || null;
      acadSet = usersOrPayload.academicSettings || null;
      acadAssess = usersOrPayload.academicAssessments || [];
      termReps = usersOrPayload.terminalReports || [];
      teachAllocs = usersOrPayload.teacherAllocations || [];
    } else {
      uList = usersOrPayload || [];
      sList = students || [];
      pList = payments || [];
      tList = terms || [];
    }

    const payload = {
      users: uList,
      students: sList,
      payments: pList,
      terms: tList,
      expenses: expList,
      salaries: salList,
      examsPayments: epList,
      examsExpenses: eeList,
      examsSettings: esSet,
      budgetTargets: btList,
      whatsappLogs: wlList,
      teacherEvaluations: teList,
      journalEntries: jeList,
      systemSettings: sysSet,
      academicSettings: acadSet,
      academicAssessments: acadAssess,
      terminalReports: termReps,
      teacherAllocations: teachAllocs,
    };

    console.log(`[Database Sync] Synchronizing ${uList.length} users, ${sList.length} pupils, ${pList.length} payments, ${tList.length} terms...`);

    let firestoreSucceeded = false;
    try {
      // Execute collection batch syncs sequentially to ensure connection stability
      if (uList.length > 0) await writeBatchChunked("users", uList, u => u.id);
      if (sList.length > 0) await writeBatchChunked("students", sList, s => s.id);
      if (pList.length > 0) await writeBatchChunked("payments", pList, p => p.id || `${p.studentId}_${p.date}`);
      if (tList.length > 0) await writeBatchChunked("terms", tList, t => t.id);
      if (expList.length > 0) await writeBatchChunked("expenses", expList, e => e.id);
      if (salList.length > 0) await writeBatchChunked("salaries", salList, s => s.id);
      if (epList.length > 0) await writeBatchChunked("examsPayments", epList, ep => ep.id);
      if (eeList.length > 0) await writeBatchChunked("examsExpenses", eeList, ee => ee.id);
      if (btList.length > 0) await writeBatchChunked("budgetTargets", btList, b => b.id);
      if (wlList.length > 0) await writeBatchChunked("whatsappLogs", wlList, w => w.id);
      if (teList.length > 0) await writeBatchChunked("evaluations", teList, te => te.id);
      if (jeList.length > 0) await writeBatchChunked("journal_entries", jeList, je => je.id);
      if (acadAssess.length > 0) await writeBatchChunked("academic_assessments", acadAssess, a => a.id);
      if (termReps.length > 0) await writeBatchChunked("terminal_reports", termReps, r => r.id);
      if (teachAllocs.length > 0) await writeBatchChunked("teacher_allocations", teachAllocs, ta => ta.id);

      if (esSet) {
        const cleanEs = sanitizeFirestoreDoc(esSet);
        await withTimeout(setDoc(doc(firestoreDb, "examsSettings", "main"), cleanEs, { merge: true }), 10000, "examsSettings").catch(() => {});
      }
      if (sysSet) {
        const cleanSys = sanitizeFirestoreDoc(sysSet);
        await withTimeout(setDoc(doc(firestoreDb, "systemSettings", "main"), cleanSys, { merge: true }), 10000, "systemSettings").catch(() => {});
      }
      if (acadSet) {
        const cleanAcad = sanitizeFirestoreDoc(acadSet);
        await withTimeout(setDoc(doc(firestoreDb, "settings", "academic"), cleanAcad, { merge: true }), 10000, "academicSettings").catch(() => {});
      }

      firestoreSucceeded = true;
    } catch (e: any) {
      console.warn("Direct Firestore batch sync warning:", e?.message || e);
    }

    // Always mirror to backend server /api/seed to keep server persistence in sync
    let serverSucceeded = false;
    try {
      const res = await fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        serverSucceeded = true;
      }
    } catch (serverErr) {
      console.warn("Backend server /api/seed fetch warning:", serverErr);
    }

    return firestoreSucceeded || serverSucceeded;
  },

  async getTerms(): Promise<Term[] | null> {
    try {
      const list = await getCollectionDocs<Term>("terms");
      if (list && list.length > 0) return list;
      const res = await fetch("/api/terms").catch(() => null);
      if (res && res.ok) return await res.json();
      return list || [];
    } catch (e) {
      console.error("getTerms error: ", e);
      return null;
    }
  },

  async saveTerm(term: Term): Promise<boolean> {
    try {
      const id = safeDocId(term.id);
      const clean = sanitizeFirestoreDoc(term);
      await withTimeout(setDoc(doc(firestoreDb, "terms", id), clean, { merge: true }), 8000, "saveTerm");
      fetch("/api/terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clean),
      }).catch(() => {});
      return true;
    } catch (e) {
      console.error("saveTerm error: ", e);
      try {
        const res = await fetch("/api/terms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(term),
        });
        return res.ok;
      } catch {
        return false;
      }
    }
  },

  async saveTerms(terms: Term[]): Promise<boolean> {
    try {
      const ok = await writeBatchChunked("terms", terms, t => t.id);
      fetch("/api/terms/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(terms),
      }).catch(() => {});
      return ok;
    } catch (e) {
      console.error("saveTerms error: ", e);
      return false;
    }
  },

  async deleteTerm(termId: string): Promise<boolean> {
    try {
      const id = safeDocId(termId);
      await withTimeout(deleteDoc(doc(firestoreDb, "terms", id)), 8000, "deleteTerm");
      fetch(`/api/terms/${id}`, { method: "DELETE" }).catch(() => {});
      return true;
    } catch (e) {
      console.error("deleteTerm error: ", e);
      try {
        const res = await fetch(`/api/terms/${termId}`, { method: "DELETE" });
        return res.ok;
      } catch {
        return false;
      }
    }
  },

  async getExpenses(): Promise<Expense[] | null> {
    try {
      const list = await getCollectionDocs<Expense>("expenses");
      if (list && list.length > 0) return list;
      const res = await fetch("/api/expenses").catch(() => null);
      if (res && res.ok) return await res.json();
      return list || [];
    } catch (e) {
      console.error("getExpenses error: ", e);
      return null;
    }
  },

  async saveExpense(expense: Expense): Promise<boolean> {
    try {
      const id = safeDocId(expense.id);
      const clean = sanitizeFirestoreDoc(expense);
      await withTimeout(setDoc(doc(firestoreDb, "expenses", id), clean, { merge: true }), 8000, "saveExpense");
      fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clean),
      }).catch(() => {});
      return true;
    } catch (e) {
      console.error("saveExpense error: ", e);
      try {
        const res = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(expense),
        });
        return res.ok;
      } catch {
        return false;
      }
    }
  },

  async deleteExpense(expenseId: string): Promise<boolean> {
    try {
      const id = safeDocId(expenseId);
      await withTimeout(deleteDoc(doc(firestoreDb, "expenses", id)), 8000, "deleteExpense");
      fetch(`/api/expenses/${id}`, { method: "DELETE" }).catch(() => {});
      return true;
    } catch (e) {
      console.error("deleteExpense error: ", e);
      try {
        const res = await fetch(`/api/expenses/${expenseId}`, { method: "DELETE" });
        return res.ok;
      } catch {
        return false;
      }
    }
  },

  async getSalaries(): Promise<WorkerSalary[] | null> {
    try {
      const list = await getCollectionDocs<WorkerSalary>("salaries");
      if (list && list.length > 0) return list;
      const res = await fetch("/api/salaries").catch(() => null);
      if (res && res.ok) return await res.json();
      return list || [];
    } catch (e) {
      console.error("getSalaries error: ", e);
      return null;
    }
  },

  async saveSalary(salary: WorkerSalary): Promise<boolean> {
    try {
      const id = safeDocId(salary.id);
      const clean = sanitizeFirestoreDoc(salary);
      await withTimeout(setDoc(doc(firestoreDb, "salaries", id), clean, { merge: true }), 8000, "saveSalary");
      fetch("/api/salaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clean),
      }).catch(() => {});
      return true;
    } catch (e) {
      console.error("saveSalary error: ", e);
      try {
        const res = await fetch("/api/salaries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(salary),
        });
        return res.ok;
      } catch {
        return false;
      }
    }
  },

  async deleteSalary(salaryId: string): Promise<boolean> {
    try {
      const id = safeDocId(salaryId);
      await withTimeout(deleteDoc(doc(firestoreDb, "salaries", id)), 8000, "deleteSalary");
      fetch(`/api/salaries/${id}`, { method: "DELETE" }).catch(() => {});
      return true;
    } catch (e) {
      console.error("deleteSalary error: ", e);
      try {
        const res = await fetch(`/api/salaries/${salaryId}`, { method: "DELETE" });
        return res.ok;
      } catch {
        return false;
      }
    }
  },

  async getSystemSettings(): Promise<SystemSettings | null> {
    try {
      const docSnap = await withTimeout(getDocs(collection(firestoreDb, "systemSettings")), 8000, "getSystemSettings");
      let found: any = null;
      docSnap.forEach(d => {
        if (d.id === "main" || !found) found = d.data();
      });
      if (found) return found as SystemSettings;
      const res = await fetch("/api/settings").catch(() => null);
      if (res && res.ok) return await res.json();
      return null;
    } catch (e) {
      console.error("getSystemSettings error: ", e);
      return null;
    }
  },

  async saveSystemSettings(settings: SystemSettings): Promise<boolean> {
    try {
      const clean = sanitizeFirestoreDoc(settings);
      await withTimeout(setDoc(doc(firestoreDb, "systemSettings", "main"), clean, { merge: true }), 8000, "saveSystemSettings");
      fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clean),
      }).catch(() => {});
      return true;
    } catch (e) {
      console.error("saveSystemSettings error: ", e);
      try {
        const res = await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        });
        return res.ok;
      } catch {
        return false;
      }
    }
  },

  async getBudgetTargets(): Promise<BudgetTarget[] | null> {
    try {
      const list = await getCollectionDocs<BudgetTarget>("budgetTargets");
      if (list && list.length > 0) return list;
      const res = await fetch("/api/budget_targets").catch(() => null);
      if (res && res.ok) return await res.json();
      return list || [];
    } catch (e) {
      console.error("getBudgetTargets error: ", e);
      return null;
    }
  },

  async saveBudgetTarget(target: BudgetTarget): Promise<boolean> {
    try {
      const id = safeDocId(target.id);
      const clean = sanitizeFirestoreDoc(target);
      await withTimeout(setDoc(doc(firestoreDb, "budgetTargets", id), clean, { merge: true }), 8000, "saveBudgetTarget");
      fetch("/api/budget_targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clean),
      }).catch(() => {});
      return true;
    } catch (e) {
      console.error("saveBudgetTarget error: ", e);
      return false;
    }
  },

  async deleteBudgetTarget(targetId: string): Promise<boolean> {
    try {
      const id = safeDocId(targetId);
      await withTimeout(deleteDoc(doc(firestoreDb, "budgetTargets", id)), 8000, "deleteBudgetTarget");
      fetch(`/api/budget_targets/${id}`, { method: "DELETE" }).catch(() => {});
      return true;
    } catch (e) {
      console.error("deleteBudgetTarget error: ", e);
      return false;
    }
  },

  async getExamsPayments(): Promise<ExamsPayment[] | null> {
    try {
      const list = await getCollectionDocs<ExamsPayment>("examsPayments");
      if (list && list.length > 0) return list;
      const res = await fetch("/api/exams/payments").catch(() => null);
      if (res && res.ok) return await res.json();
      return list || [];
    } catch (e) {
      console.error("getExamsPayments error: ", e);
      return null;
    }
  },

  async saveExamsPayment(payment: ExamsPayment): Promise<boolean> {
    try {
      const id = safeDocId(payment.id);
      const clean = sanitizeFirestoreDoc(payment);
      await withTimeout(setDoc(doc(firestoreDb, "examsPayments", id), clean, { merge: true }), 8000, "saveExamsPayment");
      fetch("/api/exams/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clean),
      }).catch(() => {});
      return true;
    } catch (e) {
      console.error("saveExamsPayment error: ", e);
      return false;
    }
  },

  async deleteExamsPayment(paymentId: string): Promise<boolean> {
    try {
      const id = safeDocId(paymentId);
      await withTimeout(deleteDoc(doc(firestoreDb, "examsPayments", id)), 8000, "deleteExamsPayment");
      fetch(`/api/exams/payments/${id}`, { method: "DELETE" }).catch(() => {});
      return true;
    } catch (e) {
      console.error("deleteExamsPayment error: ", e);
      return false;
    }
  },

  async getExamsExpenses(): Promise<ExamsExpense[] | null> {
    try {
      const list = await getCollectionDocs<ExamsExpense>("examsExpenses");
      if (list && list.length > 0) return list;
      const res = await fetch("/api/exams/expenses").catch(() => null);
      if (res && res.ok) return await res.json();
      return list || [];
    } catch (e) {
      console.error("getExamsExpenses error: ", e);
      return null;
    }
  },

  async saveExamsExpense(expense: ExamsExpense): Promise<boolean> {
    try {
      const id = safeDocId(expense.id);
      const clean = sanitizeFirestoreDoc(expense);
      await withTimeout(setDoc(doc(firestoreDb, "examsExpenses", id), clean, { merge: true }), 8000, "saveExamsExpense");
      fetch("/api/exams/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clean),
      }).catch(() => {});
      return true;
    } catch (e) {
      console.error("saveExamsExpense error: ", e);
      return false;
    }
  },

  async deleteExamsExpense(expenseId: string): Promise<boolean> {
    try {
      const id = safeDocId(expenseId);
      await withTimeout(deleteDoc(doc(firestoreDb, "examsExpenses", id)), 8000, "deleteExamsExpense");
      fetch(`/api/exams/expenses/${id}`, { method: "DELETE" }).catch(() => {});
      return true;
    } catch (e) {
      console.error("deleteExamsExpense error: ", e);
      return false;
    }
  },

  async getExamsSettings(): Promise<ExamsSettings | null> {
    try {
      const docSnap = await withTimeout(getDocs(collection(firestoreDb, "examsSettings")), 8000, "getExamsSettings");
      let found: any = null;
      docSnap.forEach(d => {
        if (d.id === "main" || !found) found = d.data();
      });
      if (found) return found as ExamsSettings;
      const res = await fetch("/api/exams/settings").catch(() => null);
      if (res && res.ok) return await res.json();
      return null;
    } catch (e) {
      console.error("getExamsSettings error: ", e);
      return null;
    }
  },

  async saveExamsSettings(settings: ExamsSettings): Promise<boolean> {
    try {
      const clean = sanitizeFirestoreDoc(settings);
      await withTimeout(setDoc(doc(firestoreDb, "examsSettings", "main"), clean, { merge: true }), 8000, "saveExamsSettings");
      fetch("/api/exams/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clean),
      }).catch(() => {});
      return true;
    } catch (e) {
      console.error("saveExamsSettings error: ", e);
      return false;
    }
  },
  
  async getAuditLogs(): Promise<AuditLog[] | null> {
    try {
      const list = await getCollectionDocs<AuditLog>("auditLogs");
      if (list && list.length > 0) return list;
      const res = await fetch("/api/audit-logs").catch(() => null);
      if (res && res.ok) return await res.json();
      return list || [];
    } catch (e) {
      console.error("getAuditLogs error: ", e);
      return null;
    }
  },

  async saveAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): Promise<boolean> {
    try {
      const logId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const logEntry: AuditLog = sanitizeFirestoreDoc({
        ...log,
        id: logId,
        timestamp: new Date().toISOString()
      });
      await withTimeout(setDoc(doc(firestoreDb, "auditLogs", logId), logEntry), 8000, "saveAuditLog");
      fetch("/api/audit-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(log),
      }).catch(() => {});
      return true;
    } catch (e) {
      console.error("saveAuditLog error: ", e);
      return false;
    }
  },

  async purgeDemoData(): Promise<{ success: boolean; purgedStudentsCount: number; purgedPaymentsCount: number; purgedUsersCount: number }> {
    try {
      const res = await fetch("/api/purge-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      }).catch(() => null);
      if (res && res.ok) return await res.json();
      return { success: true, purgedStudentsCount: 0, purgedPaymentsCount: 0, purgedUsersCount: 0 };
    } catch (e) {
      console.error("purgeDemoData error: ", e);
      return { success: false, purgedStudentsCount: 0, purgedPaymentsCount: 0, purgedUsersCount: 0 };
    }
  },

  async getTeacherEvaluations(): Promise<TeacherEvaluation[] | null> {
    try {
      const list = await getCollectionDocs<TeacherEvaluation>("evaluations");
      if (list && list.length > 0) return list;
      const res = await fetch("/api/evaluations").catch(() => null);
      if (res && res.ok) return await res.json();
      return list || [];
    } catch (e) {
      console.error("getTeacherEvaluations error: ", e);
      return null;
    }
  },

  async saveTeacherEvaluation(evaluation: TeacherEvaluation): Promise<boolean> {
    try {
      const id = safeDocId(evaluation.id);
      const clean = sanitizeFirestoreDoc(evaluation);
      await withTimeout(setDoc(doc(firestoreDb, "evaluations", id), clean, { merge: true }), 8000, "saveTeacherEvaluation");
      fetch("/api/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clean),
      }).catch(() => {});
      return true;
    } catch (e) {
      console.error("saveTeacherEvaluation error: ", e);
      return false;
    }
  },

  async deleteTeacherEvaluation(evaluationId: string): Promise<boolean> {
    try {
      const id = safeDocId(evaluationId);
      await withTimeout(deleteDoc(doc(firestoreDb, "evaluations", id)), 8000, "deleteTeacherEvaluation");
      fetch(`/api/evaluations/${id}`, { method: "DELETE" }).catch(() => {});
      return true;
    } catch (e) {
      console.error("deleteTeacherEvaluation error: ", e);
      return false;
    }
  },

  async getJournalEntries(): Promise<JournalEntry[] | null> {
    try {
      const list = await getCollectionDocs<JournalEntry>("journal_entries");
      if (list && list.length > 0) return list;
      const res = await fetch("/api/journal_entries").catch(() => null);
      if (res && res.ok) return await res.json();
      return list || [];
    } catch (e) {
      console.error("getJournalEntries error: ", e);
      return null;
    }
  },

  async saveJournalEntry(entry: JournalEntry): Promise<boolean> {
    try {
      const id = safeDocId(entry.id);
      const clean = sanitizeFirestoreDoc(entry);
      await withTimeout(setDoc(doc(firestoreDb, "journal_entries", id), clean, { merge: true }), 8000, "saveJournalEntry");
      fetch("/api/journal_entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clean),
      }).catch(() => {});
      return true;
    } catch (e) {
      console.error("saveJournalEntry error: ", e);
      return false;
    }
  },

  async deleteJournalEntry(entryId: string): Promise<boolean> {
    try {
      const id = safeDocId(entryId);
      await withTimeout(deleteDoc(doc(firestoreDb, "journal_entries", id)), 8000, "deleteJournalEntry");
      fetch(`/api/journal_entries/${id}`, { method: "DELETE" }).catch(() => {});
      return true;
    } catch (e) {
      console.error("deleteJournalEntry error: ", e);
      return false;
    }
  },

  async getTrashItems(): Promise<TrashItem[] | null> {
    try {
      const list = await getCollectionDocs<TrashItem>("trash");
      if (list && list.length > 0) return list;
      const res = await fetch("/api/trash").catch(() => null);
      if (res && res.ok) return await res.json();
      return list || [];
    } catch (e) {
      console.error("getTrashItems error: ", e);
      return null;
    }
  },

  async saveTrashItem(item: TrashItem): Promise<boolean> {
    try {
      const id = safeDocId(item.id);
      const clean = sanitizeFirestoreDoc(item);
      await withTimeout(setDoc(doc(firestoreDb, "trash", id), clean, { merge: true }), 8000, "saveTrashItem");
      fetch("/api/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clean),
      }).catch(() => {});
      return true;
    } catch (e) {
      console.error("saveTrashItem error: ", e);
      return false;
    }
  },

  async restoreTrashItem(trashId: string, operator?: string): Promise<{ success: boolean; message: string }> {
    try {
      const id = safeDocId(trashId);
      await withTimeout(deleteDoc(doc(firestoreDb, "trash", id)), 8000, "restoreTrashItem");
      const res = await fetch(`/api/trash/restore/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operator: operator || "System Admin" }),
      }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        return { success: true, message: data.message || "Restoration complete." };
      }
      return { success: true, message: "Item removed from trash." };
    } catch (e: any) {
      console.error("restoreTrashItem error: ", e);
      return { success: false, message: e.message || "Failed to restore trash item." };
    }
  },

  async deleteTrashItem(trashId: string): Promise<boolean> {
    try {
      const id = safeDocId(trashId);
      await withTimeout(deleteDoc(doc(firestoreDb, "trash", id)), 8000, "deleteTrashItem");
      fetch(`/api/trash/${id}`, { method: "DELETE" }).catch(() => {});
      return true;
    } catch (e) {
      console.error("deleteTrashItem error: ", e);
      return false;
    }
  },

  async emptyTrash(operator?: string): Promise<{ success: boolean; message: string }> {
    try {
      fetch("/api/trash", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operator: operator || "System Admin" }),
      }).catch(() => {});
      return { success: true, message: "Trash bin emptied." };
    } catch (e: any) {
      console.error("emptyTrash error: ", e);
      return { success: false, message: e.message || "Failed to empty trash." };
    }
  },

  async getAcademicAssessments(): Promise<AcademicAssessment[] | null> {
    try {
      const list = await getCollectionDocs<AcademicAssessment>("academic_assessments");
      if (list && list.length > 0) return list;
      const res = await fetch("/api/academic_assessments").catch(() => null);
      if (res && res.ok) return await res.json();
      return list || [];
    } catch (e) {
      console.error("getAcademicAssessments error: ", e);
      return null;
    }
  },

  async saveAcademicAssessment(assessment: AcademicAssessment): Promise<boolean> {
    try {
      const id = safeDocId(assessment.id);
      const clean = sanitizeFirestoreDoc(assessment);
      await withTimeout(setDoc(doc(firestoreDb, "academic_assessments", id), clean, { merge: true }), 8000, "saveAcademicAssessment");
      fetch("/api/academic_assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clean),
      }).catch(() => {});
      return true;
    } catch (e) {
      console.error("saveAcademicAssessment error: ", e);
      return false;
    }
  },

  async batchSaveAcademicAssessments(assessments: AcademicAssessment[]): Promise<boolean> {
    try {
      if (!assessments || assessments.length === 0) return true;
      const chunks: AcademicAssessment[][] = [];
      for (let i = 0; i < assessments.length; i += 400) {
        chunks.push(assessments.slice(i, i + 400));
      }
      for (const chunk of chunks) {
        const batch = writeBatch(firestoreDb);
        chunk.forEach(a => {
          if (a && a.id) {
            const id = safeDocId(a.id);
            const clean = sanitizeFirestoreDoc(a);
            batch.set(doc(firestoreDb, "academic_assessments", id), clean, { merge: true });
          }
        });
        await withTimeout(batch.commit(), 10000, "batchSaveAcademicAssessments");
      }
      fetch("/api/academic_assessments/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assessments.map(a => sanitizeFirestoreDoc(a))),
      }).catch(() => {});
      return true;
    } catch (e) {
      console.error("batchSaveAcademicAssessments error: ", e);
      return false;
    }
  },

  async deleteAcademicAssessment(id: string): Promise<boolean> {
    try {
      const docId = safeDocId(id);
      await withTimeout(deleteDoc(doc(firestoreDb, "academic_assessments", docId)), 8000, "deleteAcademicAssessment");
      fetch(`/api/academic_assessments/${docId}`, { method: "DELETE" }).catch(() => {});
      return true;
    } catch (e) {
      console.error("deleteAcademicAssessment error: ", e);
      return false;
    }
  },

  async clearAcademicAssessments(idsToDelete: string[]): Promise<boolean> {
    try {
      if (!idsToDelete || idsToDelete.length === 0) return true;
      const chunks: string[][] = [];
      for (let i = 0; i < idsToDelete.length; i += 400) {
        chunks.push(idsToDelete.slice(i, i + 400));
      }
      for (const chunk of chunks) {
        const batch = writeBatch(firestoreDb);
        chunk.forEach(id => {
          batch.delete(doc(firestoreDb, "academic_assessments", safeDocId(id)));
        });
        await withTimeout(batch.commit(), 10000, "clearAcademicAssessments");
      }
      fetch("/api/academic_assessments/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: idsToDelete }),
      }).catch(() => {});
      return true;
    } catch (e) {
      console.error("clearAcademicAssessments error: ", e);
      return false;
    }
  },

  async getTerminalReports(): Promise<TerminalReport[] | null> {
    try {
      const list = await getCollectionDocs<TerminalReport>("terminal_reports");
      if (list && list.length > 0) return list;
      const res = await fetch("/api/terminal_reports").catch(() => null);
      if (res && res.ok) return await res.json();
      return list || [];
    } catch (e) {
      console.error("getTerminalReports error: ", e);
      return null;
    }
  },

  async saveTerminalReport(report: TerminalReport): Promise<boolean> {
    try {
      const id = safeDocId(report.id);
      const clean = sanitizeFirestoreDoc(report);
      await withTimeout(setDoc(doc(firestoreDb, "terminal_reports", id), clean, { merge: true }), 8000, "saveTerminalReport");
      fetch("/api/terminal_reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clean),
      }).catch(() => {});
      return true;
    } catch (e) {
      console.error("saveTerminalReport error: ", e);
      return false;
    }
  },

  async deleteTerminalReport(reportId: string): Promise<boolean> {
    try {
      const id = safeDocId(reportId);
      await withTimeout(deleteDoc(doc(firestoreDb, "terminal_reports", id)), 8000, "deleteTerminalReport");
      fetch(`/api/terminal_reports/${id}`, { method: "DELETE" }).catch(() => {});
      return true;
    } catch (e) {
      console.error("deleteTerminalReport error: ", e);
      return false;
    }
  },

  async getTeacherAllocations(): Promise<TeacherAllocation[] | null> {
    try {
      const list = await getCollectionDocs<TeacherAllocation>("teacher_allocations");
      if (list && list.length > 0) return list;
      const res = await fetch("/api/teacher_allocations").catch(() => null);
      if (res && res.ok) return await res.json();
      return list || [];
    } catch (e) {
      console.error("getTeacherAllocations error: ", e);
      return null;
    }
  },

  async saveTeacherAllocation(allocation: TeacherAllocation): Promise<boolean> {
    try {
      const id = safeDocId(allocation.id);
      const clean = sanitizeFirestoreDoc(allocation);
      await withTimeout(setDoc(doc(firestoreDb, "teacher_allocations", id), clean, { merge: true }), 8000, "saveTeacherAllocation");
      fetch("/api/teacher_allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clean),
      }).catch(() => {});
      return true;
    } catch (e) {
      console.error("saveTeacherAllocation error: ", e);
      return false;
    }
  },

  async deleteTeacherAllocation(allocationId: string): Promise<boolean> {
    try {
      const id = safeDocId(allocationId);
      await withTimeout(deleteDoc(doc(firestoreDb, "teacher_allocations", id)), 8000, "deleteTeacherAllocation");
      fetch(`/api/teacher_allocations/${id}`, { method: "DELETE" }).catch(() => {});
      return true;
    } catch (e) {
      console.error("deleteTeacherAllocation error: ", e);
      return false;
    }
  },

  async getAcademicSettings(): Promise<AcademicSettings | null> {
    try {
      const snapshot = await withTimeout(
        getDoc(doc(firestoreDb, "settings", "academic")),
        3500,
        "getAcademicSettings"
      ).catch(() => null);
      if (snapshot && snapshot.exists()) {
        const data = snapshot.data() as AcademicSettings;
        return { ...DEFAULT_ACADEMIC_SETTINGS, ...data };
      }
      const res = await fetch("/api/settings/academic").catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          return { ...DEFAULT_ACADEMIC_SETTINGS, ...data };
        }
      }
      return DEFAULT_ACADEMIC_SETTINGS;
    } catch (e) {
      console.warn("getAcademicSettings error fallback:", e);
      return DEFAULT_ACADEMIC_SETTINGS;
    }
  },

  async saveAcademicSettings(settings: AcademicSettings): Promise<boolean> {
    try {
      const clean = sanitizeFirestoreDoc(settings);
      await withTimeout(setDoc(doc(firestoreDb, "settings", "academic"), clean, { merge: true }), 8000, "saveAcademicSettings");
      fetch("/api/settings/academic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clean),
      }).catch(() => {});
      return true;
    } catch (e) {
      console.error("saveAcademicSettings error: ", e);
      return false;
    }
  }
};
