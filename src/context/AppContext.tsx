/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Student, PaymentRecord, UserAccount, UserRole, StudentClass, SchoolCategory, Term, PendingEdit, BackupRecord, Expense, ExpenseCategory, PaymentMethod, WorkerSalary, SystemSettings, BudgetTarget, ExamsPayment, ExamsExpense, ExamsSettings, AuditLog, TeacherEvaluation, JournalEntry, TeacherEthicsEvaluation, AdministrativePurgeOptions, AdministrativePurgeResult, StaffPermissions, TrashItem, DuplicatePaymentAuditItem, DuplicatePaymentAuditGroup, DeleteClassFeesOptions, DeleteClassFeesResult } from '../types';
import { INITIAL_USERS, INITIAL_STUDENTS, ORIGINAL_DEMO_STUDENT_IDS, generateSeedPayments, getClassCategory } from '../initialData';
import { db as rawDb, firebaseLogin, firebaseSendPasswordReset, firebaseCreateAccount, firebaseAuth, firebaseSignOut, onAuthStateChanged } from '../lib/firebase';
import { generateSchoolDays, isDateInTermGap } from '../utils/termUtils';
import { idbEngine } from '../lib/idbEngine';
import { roundCurrency, addCurrency, subtractCurrency, multiplyCurrency } from '../utils/currency';
import { calculateStudentFeeStatus, isTermPayer } from '../utils/feeCalculator';
export { isTermPayer };
import { mergeCollectionsWithLWW } from '../utils/conflictResolver';
import { generateNextPupilId, formatPupilId, standardizeAllPupilIds, PupilIdFormatStyle } from '../utils/pupilIdUtils';


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
  realActiveTerm: Term | null;
  viewingTermId: string | null;
  setViewingTermId: (id: string | null) => void;
  addTerm: (name: string, startDate: string, daysCount: number, isActive?: boolean) => void;
  editTerm: (termId: string, name: string, startDate: string, daysCount: number, isActive?: boolean) => void;
  completeTerm: (termId: string, isCompleted?: boolean) => void;
  setActiveTerm: (termId: string) => void;
  deleteTerm: (termId: string) => void;
  addPublicHoliday: (termId: string, date: string) => void;
  removePublicHoliday: (termId: string, date: string) => void;
  currentDate: string; // YYYY-MM-DD format
  setCurrentDate: (date: string) => void;
  login: (email: string, mfaCode?: string, password?: string) => Promise<{ success: boolean; requiresMfa?: boolean; requiresPassword?: boolean; error?: string }>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (userId: string, newPassword: string) => { success: boolean; error?: string };
  logout: () => void;
  toggleMfaForUser: (userId: string) => void;
  addStudent: (name: string, className: StudentClass, guardianPhone?: string, photoUrl?: string, discount?: number, gender?: 'Male' | 'Female', paymentType?: 'Daily' | 'Term', termFee?: number, legacyDebt?: number, enrollmentDate?: string) => void;
  updateStudent: (student: Student) => void;
  deleteStudent: (studentId: string) => void;
  mergeStudents: (primaryStudentId: string, duplicateStudentId: string) => { success: boolean; message: string };
  purgeDeactivatedStudents: () => void;
  standardizePupilIds: (formatStyle?: PupilIdFormatStyle) => { updatedCount: number; message: string };
  promoteAllStudents: (customActions?: Record<string, 'promote' | 'repeat' | 'graduate' | 'withdraw'>) => void;
  promotionBackups: any[];
  revertLastPromotion: (backupId?: string) => boolean;
  recordPayment: (studentId: string, verified?: boolean, customAmount?: number, customNotes?: string, allowDuplicate?: boolean) => void;
  recordMomoPayment: (studentId: string, amount: number, transactionId: string, provider: string, phoneNumber: string, status: 'pending' | 'successful' | 'failed' | 'refunded', notes?: string, customDate?: string) => void;
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
  deleteClassFeeRecords: (options: DeleteClassFeesOptions) => DeleteClassFeesResult;
  adjustPayment: (paymentId: string, updatedAmount: number, updatedIsAbsent: boolean, notes: string, reason: string) => void;
  registerStaff: (name: string, email: string, role: UserRole, assignedClass?: StudentClass, mfaEnabled?: boolean, passwordEnabled?: boolean, password?: string, assignedClasses?: StudentClass[], stipendSalary?: number, momoNumber?: string, momoName?: string, photoUrl?: string, employeeId?: string, department?: string, gender?: 'Male' | 'Female', employmentType?: 'Full-Time' | 'Part-Time' | 'Contract' | 'Volunteer', appointmentDate?: string, contractEndDate?: string, renewalOption?: 'Automatic' | 'Manual Review' | 'Fixed Term' | 'Non-Renewable', renewalPeriod?: string, personalAddress?: string, permissions?: StaffPermissions) => { success: boolean; error?: string };
  updateStaff: (userId: string, name: string, email: string, role: UserRole, assignedClass?: StudentClass, mfaEnabled?: boolean, passwordEnabled?: boolean, password?: string, assignedClasses?: StudentClass[], stipendSalary?: number, momoNumber?: string, momoName?: string, photoUrl?: string, employeeId?: string, department?: string, gender?: 'Male' | 'Female', employmentType?: 'Full-Time' | 'Part-Time' | 'Contract' | 'Volunteer', idCardDeactivated?: boolean, appointmentDate?: string, contractEndDate?: string, renewalOption?: 'Automatic' | 'Manual Review' | 'Fixed Term' | 'Non-Renewable', renewalPeriod?: string, signatureUrl?: string, managementSignatureUrl?: string, personalAddress?: string, ethicsEvaluation?: TeacherEthicsEvaluation, permissions?: StaffPermissions) => { success: boolean; error?: string };
  carryForwardTermBalances: (options?: { resetPaymentsForNewTerm?: boolean }) => { updatedStudentsCount: number; totalCarriedDebt: number; message: string };
  adjustStaffSalariesByPercentage: (adjustments: { userId: string; percentage: number; newSalary?: number; reason?: string }[]) => { success: boolean; count: number };
  deleteStaff: (userId: string) => { success: boolean; error?: string };
  toggleStaffActive: (userId: string) => { success: boolean; error?: string };
  getDailyStats: (date: string) => DailyStats;
  getTeacherMetrics: (date: string) => TeacherMetric[];
  getCashFlowTrend: () => CashFlowTrendPoint[];
  getPendingAlerts: (date: string) => PendingAlert[];
  sendMonthlyEmailDraft: (email: string) => { success: boolean; message: string; draftContent: string };
  resetData: () => void;
  clearSampleStudents: () => void;
  purgeOnlyDemoData: () => Promise<{ success: boolean; message: string }>;
  clearAllPayments: () => void;
  administrativePurge: (options: AdministrativePurgeOptions) => AdministrativePurgeResult;
  purgeDuplicatePayments: (options?: { onlyExactGhosts?: boolean; deleteRedundantZero?: boolean; preserveLegitimateInstallments?: boolean }) => { count: number; ghostCount: number; redundantZeroCount: number; preservedCount: number; message: string };
  getDuplicatePaymentAudit: () => DuplicatePaymentAuditGroup[];
  deletePaymentRecord: (paymentId: string) => { success: boolean; message: string };
  sanitizeDatabaseIntegrity: () => { orphanedPaymentsCount: number; orphanedExamsCount: number; message: string };
  purgeAdvancePayments: (studentId?: string) => { count: number; message: string };
  purgeOutOfTermPayments: (studentId?: string) => { count: number; message: string };
  purgeRepeatedAndAdvancePayments: (options: { duplicates?: boolean; advance?: boolean; outOfTerm?: boolean; studentId?: string }) => { count: number; message: string };
  purgePublicHolidayPayments: () => { count: number; message: string };
  purgePaymentsExceptYesterdayAndToday: () => { count: number; retainedCount: number; yesterdayStr: string; todayStr: string; message: string };
  purgeClassOutOfTermAndDuplicates: (targetClass?: StudentClass) => { count: number; message: string };
  deleteAllAutomaticEntries: () => { deletedPaymentsCount: number; deletedJournalsCount: number; message: string };
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
  importDatabaseBackup: (backupData: any) => Promise<void>;
  deleteBackup: (backupId: string) => void;
  clearAllBackups: () => void;
  audioMuted: boolean;
  setAudioMuted: (muted: boolean) => void;
  playFeedbackSound: (type: 'success' | 'error' | 'warning') => void;
  theme: 'dark' | 'daylight';
  setTheme: (theme: 'dark' | 'daylight') => void;
  expenses: Expense[];
  salaries: WorkerSalary[];
  teacherEvaluations: TeacherEvaluation[];
  journalEntries: JournalEntry[];
  addTeacherEvaluation: (evaluation: Omit<TeacherEvaluation, 'id' | 'dateCreated'>) => Promise<boolean>;
  deleteTeacherEvaluation: (id: string) => Promise<boolean>;
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'timestamp'>) => Promise<boolean>;
  deleteJournalEntry: (id: string) => Promise<boolean>;
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
  sendautomatedWhatsApp: (phone: string, message: string, studentId?: string, studentName?: string, type?: string, forceDirect?: boolean) => Promise<{ success: boolean; log?: any; error?: string }>;
  fetchWhatsappLogs: () => Promise<void>;
  auditLogs: AuditLog[];
  fetchAuditLogs: () => Promise<void>;
  logActivity: (action: string, category: 'students' | 'payments' | 'expenses' | 'settings' | 'security' | 'other', details: string, studentId?: string, studentName?: string, amount?: number, snapshotData?: any) => Promise<void>;
  restoreDeletedRecord: (logOrSnapshot: any) => Promise<{ success: boolean; message: string }>;
  trashItems: TrashItem[];
  fetchTrashItems: () => Promise<void>;
  moveToTrash: (
    itemType: 'payment' | 'student' | 'expense' | 'bulk_payments',
    originalId: string,
    recordData: any,
    reason: string,
    meta?: { studentId?: string; studentName?: string; amount?: number; itemCount?: number; class?: string }
  ) => Promise<TrashItem>;
  restoreTrashItem: (trashId: string) => Promise<{ success: boolean; message: string }>;
  permanentlyDeleteTrashItem: (trashId: string) => Promise<boolean>;
  emptyTrash: () => Promise<{ success: boolean; message: string }>;
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
  examsPayments: ExamsPayment[];
  examsExpenses: ExamsExpense[];
  examsSettings: ExamsSettings | null;
  addExamsPayment: (studentId: string, amountPaid: number, paymentMethod: PaymentMethod, notes?: string, datePaid?: string) => Promise<void>;
  deleteExamsPayment: (paymentId: string) => Promise<void>;
  addExamsExpense: (providerName: string, targetClass: StudentClass | 'All-Preschool' | 'All-Primary' | 'All-JHS' | 'Entire-School', billingPerChild: number, studentCount: number, totalAmount: number, amountPaid: number, status: 'Paid' | 'Unpaid' | 'Partially Paid', notes?: string, date?: string) => Promise<void>;
  deleteExamsExpense: (expenseId: string) => Promise<void>;
  updateExamsExpense: (expense: ExamsExpense) => Promise<void>;
  updateExamsSettings: (settings: ExamsSettings) => Promise<void>;
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

export const registerDeletedIds = (_ids: string[]) => {
  // No-op to prevent accidental blacklisting of legitimate student fee records
};

export const getDeletedIds = (): Set<string> => {
  return new Set<string>();
};

export function getSchoolWeekForDate(dateStr: string, startDateStr: string): number {
  if (!dateStr || !startDateStr) return 1;
  try {
    const d = new Date(dateStr);
    const start = new Date(startDateStr);
    
    // Find the Monday of the start date's week
    const startDay = start.getDay();
    const startMonday = new Date(start);
    startMonday.setDate(start.getDate() - (startDay === 0 ? 6 : startDay - 1));
    startMonday.setHours(0,0,0,0);
    
    // Find the Monday of the date's week
    const dDay = d.getDay();
    const dMonday = new Date(d);
    dMonday.setDate(d.getDate() - (dDay === 0 ? 6 : dDay - 1));
    dMonday.setHours(0,0,0,0);
    
    // Calculate difference in weeks
    const diffMs = dMonday.getTime() - startMonday.getTime();
    const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
    
    return Math.max(1, diffWeeks + 1); // 1-indexed, at least 1
  } catch (e) {
    return 1;
  }
}

export function getStudentB9ExpiryDate(
  studentClass: string,
  currentDateStr: string,
  activeTerm?: any
): string {
  const getYearsToCompleteB9 = (cls: string): number => {
    const normalized = cls.toUpperCase().trim();
    switch (normalized) {
      case 'NURSERY': return 11;
      case 'KG1': return 10;
      case 'KG2': return 9;
      case 'B1': return 8;
      case 'B2': return 7;
      case 'B3': return 6;
      case 'B4': return 5;
      case 'B5': return 4;
      case 'B6': return 3;
      case 'B7': return 2;
      case 'B8': return 1;
      case 'B9': return 0;
      default: return 0;
    }
  };

  try {
    const d = currentDateStr ? new Date(currentDateStr) : new Date();
    if (isNaN(d.getTime())) {
      return "2026-08-31";
    }
    const currentYear = d.getFullYear();
    const currentMonth = d.getMonth(); // 0-indexed, 8 is September
    let baseCompletionYear = currentYear;
    
    // Sept starts the new academic year
    if (currentMonth >= 8) {
      baseCompletionYear = currentYear + 1;
    }
    
    const completionYear = baseCompletionYear + getYearsToCompleteB9(studentClass);
    return `${completionYear}-08-31`;
  } catch (e) {
    return "2026-08-31";
  }
}

export function getStudentBaselineTermFee(
  studentClass: StudentClass,
  systemSettings?: SystemSettings
): number {
  const category = getClassCategory(studentClass);
  if (category === 'Pre-school') {
    return systemSettings?.baselineTermFeePreSchool ?? systemSettings?.baselineTermFee ?? 250.00;
  }
  if (category === 'Primary') {
    return systemSettings?.baselineTermFeePrimary ?? systemSettings?.baselineTermFee ?? 350.00;
  }
  if (category === 'JHS') {
    return systemSettings?.baselineTermFeeJhs ?? systemSettings?.baselineTermFee ?? 450.00;
  }
  return systemSettings?.baselineTermFee ?? 350.00;
}

export function getDiscountedTermFee(
  student: Student,
  payments: PaymentRecord[],
  activeTerm: Term | null,
  currentDate: string,
  systemSettings?: SystemSettings
) {
  const baseTermFee = getStudentBaselineTermFee(student.class, systemSettings);
  const originalFee = student.termFee || baseTermFee;
  
  if (
    !activeTerm ||
    !systemSettings?.termDiscountEnabled ||
    !systemSettings?.termDiscountWeek ||
    !systemSettings?.termDiscountPercentage
  ) {
    return {
      termFee: originalFee,
      originalFee,
      discountAmount: 0,
      isApplied: false,
      isEligibleButUnpaid: false
    };
  }
  
  const targetWeek = systemSettings.termDiscountWeek;
  const discountPercent = systemSettings.termDiscountPercentage;
  const discountAmount = originalFee * (discountPercent / 100);
  
  // Check if they have a non-absent payment in targetWeek of the active term
  const studentPayments = payments.filter(p => p.studentId === student.id && !p.isAbsent && p.verified !== false && p.amount > 0);
  const hasPaymentInWeek = studentPayments.some(p => {
    const paymentWeek = getSchoolWeekForDate(p.date, activeTerm.startDate);
    return paymentWeek === targetWeek;
  });
  
  // Check if current date is within or before the target week
  const currentWeek = getSchoolWeekForDate(currentDate, activeTerm.startDate);
  const eligibleToPayNow = currentWeek <= targetWeek;
  
  if (hasPaymentInWeek) {
    return {
      termFee: Math.max(0, originalFee - discountAmount),
      originalFee,
      discountAmount,
      isApplied: true,
      isEligibleButUnpaid: false
    };
  } else if (eligibleToPayNow) {
    return {
      termFee: Math.max(0, originalFee - discountAmount),
      originalFee,
      discountAmount,
      isApplied: false,
      isEligibleButUnpaid: true
    };
  }
  
  return {
    termFee: originalFee,
    originalFee,
    discountAmount: 0,
    isApplied: false,
    isEligibleButUnpaid: false
  };
}

export function calculateStudentFinancialState(
  student: Student,
  payments: PaymentRecord[],
  activeTerm: Term | null,
  currentDate: string,
  baselineDailyFee?: number,
  systemSettings?: SystemSettings,
  allTerms?: Term[]
) {
  const baseDailyFee = baselineDailyFee ?? 5.00;
  if (isTermPayer(student)) {
    const discountInfo = getDiscountedTermFee(student, payments, activeTerm, currentDate, systemSettings);
    const termFee = discountInfo.termFee;
    const legacyDebt = student.legacyDebt || 0;
    const studentPayments = payments.filter(p => p.studentId === student.id);
    const totalLateFees = studentPayments.reduce((sum, p) => sum + (p.lateFeeApplied || 0), 0);
    const totalTarget = termFee + legacyDebt + totalLateFees;
    const termSchoolDays = activeTerm?.schoolDays || [];
    const termStartDate = activeTerm?.startDate || '1970-01-01';
    const lastTermDay = termSchoolDays.length > 0 ? termSchoolDays[termSchoolDays.length - 1] : '2099-12-31';

    const totalPaid = studentPayments
      .filter(p => {
        if (p.isAbsent || p.verified === false || p.amount <= 0) return false;
        if (activeTerm && termSchoolDays.length > 0) {
          if (p.termId && activeTerm.id && p.termId === activeTerm.id) return true;
          if (p.date < termStartDate || p.date > lastTermDay) return false;
        }
        return true;
      })
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
      prepaidDaysCount: 0,
      discountInfo
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
  const termStartDate = activeTerm.startDate || '1970-01-01';
  const lastTermDay = activeTerm.schoolDays.length > 0 ? activeTerm.schoolDays[activeTerm.schoolDays.length - 1] : '2099-12-31';

  // Include all valid payments for active term
  const validPaymentMap = new Map<string, number>();
  studentPayments.forEach(p => {
    if (p.isAbsent || p.verified === false || p.amount <= 0) return;
    if (p.date < termStartDate || p.date > lastTermDay) return;
    if (holidays.includes(p.date)) return;

    validPaymentMap.set(p.id, p.amount);
  });

  let rawTotalPaid = 0;
  validPaymentMap.forEach(amt => { rawTotalPaid += amt; });

  // Get all school days in the active term up to currentDate (inclusive) and after student's enrollment date
  const schoolDaysUpToToday = activeTerm.schoolDays.filter(d => {
    const afterEnrollment = student.enrollmentDate ? d >= student.enrollmentDate : true;
    return d <= currentDate && !holidays.includes(d) && afterEnrollment;
  });

  // Filter days where the student was NOT absent
  const billableDays = schoolDaysUpToToday.filter(dStr => {
    const isAbsent = studentPayments.some(p => p.date === dStr && p.isAbsent);
    return !isAbsent;
  });

  // Max possible fee for active term based on total non-holiday school days after enrollment
  const totalTermSchoolDays = activeTerm.schoolDays.filter(d => {
    const afterEnrollment = student.enrollmentDate ? d >= student.enrollmentDate : true;
    return !holidays.includes(d) && afterEnrollment;
  });
  const maxTermFeeCap = totalTermSchoolDays.length * dailyRate;

  let totalPaid = Math.round(rawTotalPaid * 100) / 100;
  if (maxTermFeeCap > 0 && totalPaid > maxTermFeeCap) {
    totalPaid = Math.round(maxTermFeeCap * 100) / 100;
  }

  const totalLateFees = studentPayments.reduce((sum, p) => sum + (p.lateFeeApplied || 0), 0);
  const totalRequired = billableDays.length * dailyRate + totalLateFees;
  const runningBalance = totalPaid - totalRequired;

  // Calculate which specific days are unpaid/covered chronologically using the sequential pool
  let runningPaid = totalPaid;
  const unpaidDaysList: string[] = [];
  const coveredDaysList: string[] = [];

  billableDays.forEach(dStr => {
    const paymentForDay = studentPayments.find(p => p.date === dStr && !p.id.endsWith('_debt'));
    const dayLateFee = paymentForDay?.lateFeeApplied || 0;
    const dayRequired = dailyRate + dayLateFee;

    if (runningPaid + 0.005 >= dayRequired) {
      runningPaid -= dayRequired;
      coveredDaysList.push(dStr);
    } else {
      runningPaid = 0;
      unpaidDaysList.push(dStr);
    }
  });

  // Is today paid/covered?
  const isHolidayToday = holidays.includes(currentDate) || (allTerms ? isDateInTermGap(currentDate, allTerms) : false);
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
  const [teacherEvaluations, setTeacherEvaluations] = useState<TeacherEvaluation[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [whatsappLogs, setWhatsappLogs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [budgetTargets, setBudgetTargets] = useState<BudgetTarget[]>([]);
  const [examsPayments, setExamsPayments] = useState<ExamsPayment[]>([]);
  const [examsExpenses, setExamsExpenses] = useState<ExamsExpense[]>([]);
  const [examsSettings, setExamsSettings] = useState<ExamsSettings | null>(null);
  const [promotionBackups, setPromotionBackups] = useState<any[]>([]);

  const DEFAULT_SETTINGS: SystemSettings = {
    schoolName: "SAAKO HOLY CHILD ACADEMY",
    systemName: "FEETRACK",
    schoolLogoUrl: "",
    baselineDailyFee: 5.00,
    baselineTermFee: 350.00,
    baselineTermFeePreSchool: 250.00,
    baselineTermFeePrimary: 350.00,
    baselineTermFeeJhs: 450.00,
    currencyCode: "GHC",
    customMotto: "Holiness Is Our Key",
    customLocation: "Sawla, Jelinkon street",
    autoSendCheckInAlert: false,
    autoSendArrearsAlert: false,
    primaryColor: "#fbbf24",
    debtThresholdLimit: 50,
    debtThresholdDays: 5,
    debtAlertTemplate: "Alert: Your ward {name} has accumulated a high school debt of {currency} {debt}. Please settle this balance promptly to ensure compliance with check-in procedures.",
    debtAlertMethod: 'whatsapp',
    lateFeeEnabled: false,
    lateFeeCutoffTime: "08:30",
    lateFeePercentage: 10,
    disableDemoData: false,
    pupilIdFormat: 'PREFIX_CLASS_NUM',
    pupilIdPrefix: 'SHC',
    pupilIdPadding: 3,
    pupilIdSeparator: '-'
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
    idbEngine.setItem('s_system_settings', updated);

    const changes: string[] = [];
    if (newSettings.baselineDailyFee !== undefined && newSettings.baselineDailyFee !== systemSettings.baselineDailyFee) {
      changes.push(`baseline daily fee to GHC ${newSettings.baselineDailyFee}`);
    }
    if (newSettings.baselineTermFee !== undefined && newSettings.baselineTermFee !== systemSettings.baselineTermFee) {
      changes.push(`baseline term fee to GHC ${newSettings.baselineTermFee}`);
    }
    if (newSettings.schoolName !== undefined && newSettings.schoolName !== systemSettings.schoolName) {
      changes.push(`school name to "${newSettings.schoolName}"`);
    }
    if (newSettings.adminWhatsAppPhone !== undefined && newSettings.adminWhatsAppPhone !== systemSettings.adminWhatsAppPhone) {
      changes.push(`WhatsApp gateway phone to ${newSettings.adminWhatsAppPhone}`);
    }
    
    const details = changes.length > 0 
      ? `Updated system configurations: changed ${changes.join(', ')}` 
      : 'Modified general system settings';
    
    logActivity('FEE_SETTINGS_UPDATED', 'settings', details);

    try {
      const success = await db.saveSystemSettings(updated);
      return success;
    } catch (e) {
      console.error("Failed to save system settings:", e);
      return false;
    }
  };

  const [viewingTermId, setViewingTermId] = useState<string | null>(null);

  const realActiveTerm = terms.find(t => t.active) || null;
  const activeTerm = viewingTermId 
    ? (terms.find(t => t.id === viewingTermId) || realActiveTerm) 
    : realActiveTerm;

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
    if (saved === 'dark' || saved === 'daylight') return saved;
    try {
      const savedSettings = localStorage.getItem('s_system_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed?.theme === 'dark' || parsed?.theme === 'daylight') {
          return parsed.theme;
        }
      }
    } catch (e) {
      // ignore
    }
    return 'dark';
  });

  const setTheme = (t: 'dark' | 'daylight') => {
    localStorage.setItem('s_theme', t);
    setThemeState(t);
    updateSystemSettings({ theme: t });
  };

  useEffect(() => {
    if (theme === 'daylight') {
      document.documentElement.classList.add('daylight');
      document.body.classList.add('daylight');
    } else {
      document.documentElement.classList.remove('daylight');
      document.body.classList.remove('daylight');
    }
  }, [theme]);

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

  const [pendingLocalEdits, setPendingLocalEdits] = useState<PendingEdit[]>([]);

  const recordLocallyPendingEdit = (type: PendingEdit['type'], action: PendingEdit['action'], description: string) => {
    const isLocal = storageMode === 'local';
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
      idbEngine.setItem('s_pending_local_edits', nextEdits);
      return nextEdits;
    });
  };

  const clearPendingLocalEdits = () => {
    setPendingLocalEdits([]);
    idbEngine.removeItem('s_pending_local_edits');
  };

  const [backups, setBackups] = useState<BackupRecord[]>([]);

  // Sync to refs for safe closure lookup in setInterval loop without re-triggering effect
  const studentsRef = React.useRef(students);
  const paymentsRef = React.useRef(payments);
  const usersRef = React.useRef(users);
  const termsRef = React.useRef(terms);
  const examsPaymentsRef = React.useRef(examsPayments);
  const examsExpensesRef = React.useRef(examsExpenses);

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

  useEffect(() => {
    examsPaymentsRef.current = examsPayments;
  }, [examsPayments]);

  useEffect(() => {
    examsExpensesRef.current = examsExpenses;
  }, [examsExpenses]);

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
    const currentExamsPayments = examsPaymentsRef.current;
    const currentExamsExpenses = examsExpensesRef.current;

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
        terms: currentTerms.length,
        examsPayments: currentExamsPayments.length,
        examsExpenses: currentExamsExpenses.length
      },
      data: {
        students: JSON.parse(JSON.stringify(currentStudents)),
        payments: JSON.parse(JSON.stringify(currentPayments)),
        users: JSON.parse(JSON.stringify(currentUsers)),
        terms: JSON.parse(JSON.stringify(currentTerms)),
        examsPayments: JSON.parse(JSON.stringify(currentExamsPayments)),
        examsExpenses: JSON.parse(JSON.stringify(currentExamsExpenses))
      }
    };

    setBackups(prev => {
      const next = [newBackup, ...prev].slice(0, 10);
      idbEngine.setItem('s_backups', next);
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

    idbEngine.setItem('s_students', backup.data.students);
    idbEngine.setItem('s_payments', backup.data.payments);
    idbEngine.setItem('s_users', backup.data.users);
    idbEngine.setItem('s_terms', backup.data.terms);

    if (backup.data.examsPayments) {
      setExamsPayments(backup.data.examsPayments);
      idbEngine.setItem('s_exams_payments', backup.data.examsPayments);
    }
    if (backup.data.examsExpenses) {
      setExamsExpenses(backup.data.examsExpenses);
      idbEngine.setItem('s_exams_expenses', backup.data.examsExpenses);
    }

    recordLocallyPendingEdit('bulk', 'update', `Restored system state from local backup: "${backup.label}"`);

    if (db.isActive() && storageMode === 'cloud') {
      seedFirebaseFromLocal(
        backup.data.users || users,
        backup.data.students || students,
        backup.data.payments || payments,
        backup.data.terms || terms
      ).catch(err => {
        console.error("Auto-syncing to cloud after backup restore failed:", err);
      });
    }
  };

  const importDatabaseBackup = async (backupData: any) => {
    if (!backupData || backupData.app !== "FEETRACK") {
      throw new Error("Invalid backup file: Not a FEETRACK database backup.");
    }

    const { data, currentDate: backupDate, activeTerm: backupActiveTerm, systemSettings: backupSystemSettings } = backupData;
    if (!data) {
      throw new Error("Invalid backup file: Missing database payload.");
    }

    // 1. Update Students
    if (Array.isArray(data.students)) {
      setStudents(data.students);
      await idbEngine.setItem('s_students', data.students);
    }

    // 2. Update Payments
    if (Array.isArray(data.payments)) {
      setPayments(data.payments);
      await idbEngine.setItem('s_payments', data.payments);
    }

    // 3. Update Users
    if (Array.isArray(data.users)) {
      setUsers(data.users);
      await idbEngine.setItem('s_users', data.users);
    }

    // 4. Update Terms
    if (Array.isArray(data.terms) && data.terms.length > 0) {
      setTerms(data.terms);
      await idbEngine.setItem('s_terms', data.terms);
    }

    // 5. Update Expenses
    if (Array.isArray(data.expenses)) {
      setExpenses(data.expenses);
      await idbEngine.setItem('s_expenses', data.expenses);
    }

    // 6. Update Salaries
    if (Array.isArray(data.salaries)) {
      setSalaries(data.salaries);
      await idbEngine.setItem('s_salaries', data.salaries);
    }

    // 7. Update Whatsapp Logs
    if (Array.isArray(data.whatsappLogs)) {
      setWhatsappLogs(data.whatsappLogs);
      await idbEngine.setItem('s_whatsapp_logs', data.whatsappLogs);
    }

    // 8. Update Budget Targets
    if (Array.isArray(data.budgetTargets)) {
      setBudgetTargets(data.budgetTargets);
      await idbEngine.setItem('s_budget_targets', data.budgetTargets);
    }

    // 9. Update Backups
    if (Array.isArray(data.backups)) {
      setBackups(data.backups);
      await idbEngine.setItem('s_backups', data.backups);
    }

    // 10. Update Exams Payments
    if (Array.isArray(data.examsPayments)) {
      setExamsPayments(data.examsPayments);
      await idbEngine.setItem('s_exams_payments', data.examsPayments);
    }

    // 11. Update Exams Expenses
    if (Array.isArray(data.examsExpenses)) {
      setExamsExpenses(data.examsExpenses);
      await idbEngine.setItem('s_exams_expenses', data.examsExpenses);
    }

    // 12. Update Exams Settings
    if (data.examsSettings) {
      setExamsSettings(data.examsSettings);
      await idbEngine.setItem('s_exams_settings', data.examsSettings);
    }

    // 13. Update Global Settings & States
    if (backupDate) {
      setCurrentDate(backupDate);
    }
    if (backupActiveTerm) {
      setActiveTerm(backupActiveTerm);
    }
    if (backupSystemSettings) {
      updateSystemSettings(backupSystemSettings);
    }

    recordLocallyPendingEdit('bulk', 'update', `Uploaded and restored database state from external JSON backup`);
    
    // Server database & cloud persistence:
    try {
      await db.seedTables({
        users: data.users || users,
        students: data.students || students,
        payments: data.payments || payments,
        terms: data.terms || terms,
        expenses: data.expenses || expenses,
        salaries: data.salaries || salaries,
        examsPayments: data.examsPayments || examsPayments,
        examsExpenses: data.examsExpenses || examsExpenses,
        examsSettings: data.examsSettings || examsSettings,
        journalEntries: data.journalEntries,
        teacherEvaluations: data.teacherEvaluations,
        budgetTargets: data.budgetTargets || budgetTargets,
        whatsappLogs: data.whatsappLogs || whatsappLogs,
        systemSettings: backupSystemSettings || systemSettings
      });
    } catch (err) {
      console.error("Auto-syncing server database after database restore failed:", err);
    }
  };

  const deleteBackup = (backupId: string) => {
    setBackups(prev => {
      const next = prev.filter(b => b.id !== backupId);
      idbEngine.setItem('s_backups', next);
      return next;
    });
  };

  const clearAllBackups = () => {
    setBackups([]);
    idbEngine.removeItem('s_backups');
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
    return saved !== null ? saved === 'true' : false; // Defaults to FALSE to prevent periodic overwrites
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
      const [dbUsers, dbStudents, dbPayments, dbExpenses, dbSalaries, dbBudgetTargets, dbEvaluations] = await Promise.all([
        db.getUsers(),
        db.getStudents(),
        db.getPayments(),
        db.getExpenses(),
        db.getSalaries(),
        db.getBudgetTargets(),
        db.getTeacherEvaluations()
      ]);

      if (dbUsers === null || dbStudents === null || dbPayments === null || dbExpenses === null || dbSalaries === null || dbBudgetTargets === null || dbEvaluations === null) {
        setBgSyncStatus('error');
        return;
      }

      const syncCloudRecords = <T extends { id: string; updatedAt?: string }>(
        current: T[], 
        incoming: T[], 
        collectionLabel: string
      ): T[] => {
        const map = new Map<string, T>();
        
        // 1. Primary source: Cloud incoming documents
        incoming.forEach(item => {
          if (item && item.id) {
            map.set(item.id, item);
          }
        });

        // 2. Check local pending creations that haven't reached Cloud yet
        const pendingMap = new Set(
          pendingLocalEdits
            .filter(e => e.action === 'create' && (e.type === collectionLabel || e.type === 'bulk'))
            .map(e => e.entityId)
            .filter(Boolean)
        );

        current.forEach(item => {
          if (item && item.id) {
            if (map.has(item.id)) {
              // Compare timestamps if local is strictly newer
              const cloudItem = map.get(item.id)!;
              const localTime = (item as any).timestamp || (item as any).updatedAt || (item as any).date;
              const cloudTime = (cloudItem as any).timestamp || (cloudItem as any).updatedAt || (cloudItem as any).date;
              if (localTime && cloudTime) {
                const localMs = new Date(localTime).getTime();
                const cloudMs = new Date(cloudTime).getTime();
                if (!isNaN(localMs) && !isNaN(cloudMs) && localMs > cloudMs) {
                  map.set(item.id, item);
                }
              }
            } else if (pendingMap.has(item.id)) {
              // Local offline creation pending sync
              map.set(item.id, item);
            }
            // Discard items not in Cloud and not in pendingLocalEdits (was deleted on Cloud)
          }
        });

        return Array.from(map.values());
      };

      const mergedUsers = syncCloudRecords(users, dbUsers, 'users');
      const mergedStudents = syncCloudRecords(students, dbStudents, 'students');
      const mergedPayments = syncCloudRecords(payments, dbPayments, 'payments');
      const mergedExpenses = syncCloudRecords(expenses, dbExpenses, 'expenses');
      const mergedSalaries = syncCloudRecords(salaries, dbSalaries, 'salaries');
      const mergedBudgets = syncCloudRecords(budgetTargets, dbBudgetTargets, 'budget_targets');
      const mergedEvals = syncCloudRecords(teacherEvaluations, dbEvaluations, 'teacher_evaluations');

      setUsers(mergedUsers);
      setStudents(mergedStudents);
      setPayments(mergedPayments);
      setExpenses(mergedExpenses);
      setSalaries(mergedSalaries);
      setBudgetTargets(mergedBudgets);
      setTeacherEvaluations(mergedEvals);

      // Cache locally to keep quick sync speed
      idbEngine.setItem('s_users', mergedUsers);
      idbEngine.setItem('s_students', mergedStudents);
      idbEngine.setItem('s_payments', mergedPayments);
      idbEngine.setItem('s_expenses', mergedExpenses);
      idbEngine.setItem('s_salaries', mergedSalaries);
      idbEngine.setItem('s_budget_targets', mergedBudgets);
      idbEngine.setItem('s_teacher_evaluations', mergedEvals);

      setBgSyncStatus('success');
      setLastBgSyncTime(new Date().toLocaleTimeString());
      setTimeout(() => setBgSyncStatus('idle'), 3000);
    } catch (err) {
      console.warn('Background periodic synchronization failed:', err);
      setBgSyncStatus('error');
      setTimeout(() => setBgSyncStatus('idle'), 3000);
    }
  };

  // Periodic background synchronization has been removed to prevent unexpected data loss or overwrites.
  // Manual sync remains available via the Sync / Backup interface when requested.
  useEffect(() => {
    // No automatic background interval or focus listener
  }, [bgSyncEnabled, storageMode]);

  const healTerms = (termsList: Term[]): Term[] => {
    if (!termsList || termsList.length === 0) return [];
    const activeList = termsList.filter(t => t.active);
    let selectedActive: Term;
    if (activeList.length === 1) {
      selectedActive = activeList[0];
    } else if (activeList.length > 1) {
      const customActive = activeList.filter(t => t.id !== 'term_default');
      selectedActive = customActive.length > 0 
        ? customActive[customActive.length - 1] 
        : activeList[activeList.length - 1];
    } else {
      selectedActive = termsList[0];
    }

    return termsList.map(t => {
      const isActive = t.id === selectedActive.id;
      const startDate = t.startDate || '2026-04-27';
      const daysCount = t.daysCount && t.daysCount > 0 ? t.daysCount : (t.schoolDays?.length || 68);
      const schoolDays = (t.schoolDays && t.schoolDays.length > 0)
        ? t.schoolDays
        : generateSchoolDays(startDate, daysCount);
      const name = t.name || 'Term';
      const publicHolidays = Array.from(new Set(t.publicHolidays || []));

      return {
        ...t,
        name,
        startDate,
        daysCount,
        schoolDays,
        publicHolidays,
        active: isActive
      };
    });
  };

  const initializeData = async () => {
    // Initialize idbEngine and perform seamless local data migration on first load
    await idbEngine.init();
    await idbEngine.migrateFromLocalStorage();

    let dbSettings: SystemSettings | null = null;
    try {
      dbSettings = await db.getSystemSettings();
      if (dbSettings) {
        setSystemSettingsState(dbSettings);
        idbEngine.setItem('s_system_settings', dbSettings);
        if (dbSettings.theme) {
          setThemeState(dbSettings.theme);
          localStorage.setItem('s_theme', dbSettings.theme);
        }
      } else {
        const localSettings = await idbEngine.getItem<SystemSettings>('s_system_settings');
        if (localSettings) {
          setSystemSettingsState(localSettings);
          if (localSettings.theme) {
            setThemeState(localSettings.theme);
            localStorage.setItem('s_theme', localSettings.theme);
          }
        }
      }
    } catch (e) {
      console.warn("Failed loading initial system settings from local/cloud server:", e);
      try {
        const localSettings = await idbEngine.getItem<SystemSettings>('s_system_settings');
        if (localSettings) {
          setSystemSettingsState(localSettings);
          if (localSettings.theme) {
            setThemeState(localSettings.theme);
            localStorage.setItem('s_theme', localSettings.theme);
          }
        }
      } catch (innerErr) {
        console.warn("Failed loading settings from local IndexedDB fallback:", innerErr);
      }
    }

    try {
      localStorage.removeItem('s_deleted_ids');
      idbEngine.removeItem('s_deleted_ids');
    } catch (e) {}

    const active = db.isActive();
    setFirebaseConnected(active);
    setFirebaseError(null);

    const localUsers = await idbEngine.getItem<UserAccount[]>('s_users');
    const localStudents = await idbEngine.getItem<Student[]>('s_students');
    const localPayments = await idbEngine.getItem<PaymentRecord[]>('s_payments');
    const localTerms = await idbEngine.getItem<Term[]>('s_terms');
    const localUser = await idbEngine.getItem<any>('s_current_user');
    const localExpenses = await idbEngine.getItem<Expense[]>('s_expenses');
    const localSalaries = await idbEngine.getItem<WorkerSalary[]>('s_salaries');
    const localBudgetTargets = await idbEngine.getItem<BudgetTarget[]>('s_budget_targets');
    const localEvaluations = await idbEngine.getItem<TeacherEvaluation[]>('s_teacher_evaluations');
    const localJournalEntries = await idbEngine.getItem<JournalEntry[]>('s_journal_entries');
    const localExamsPayments = await idbEngine.getItem<ExamsPayment[]>('s_exams_payments');
    const localExamsExpenses = await idbEngine.getItem<ExamsExpense[]>('s_exams_expenses');
    const localExamsSettings = await idbEngine.getItem<ExamsSettings>('s_exams_settings');
    const localPromoBackups = await idbEngine.getItem<any[]>('s_promotion_backups');

    // 1. Session authentication state loading
    try {
      if (localUser) {
        const parsed = typeof localUser === 'string' ? JSON.parse(localUser) : localUser;
        if (parsed && typeof parsed === 'object' && parsed.id && parsed.role) {
          setCurrentUser(parsed);
        } else {
          setCurrentUser(null);
          idbEngine.removeItem('s_current_user');
        }
      }
    } catch (e) {
      console.warn('Recovered s_current_user authentication state corruption:', e);
      setCurrentUser(null);
      idbEngine.removeItem('s_current_user');
    }

    if (active) {
      console.log('FEETRACK active database connection detected. Synchronizing cloud entries...');
      
      try {
        // Run lookups in parallel to minimize wait times
        const [dbUsers, dbStudents, dbPayments, dbTerms, dbExpenses, dbSalaries, dbBudgetTargets, dbExamsPayments, dbExamsExpenses, dbExamsSettings, dbEvaluations, dbJournalEntries, dbTrashItems] = await Promise.all([
          db.getUsers().catch(() => null),
          db.getStudents().catch(() => null),
          db.getPayments().catch(() => null),
          db.getTerms().catch(() => null),
          db.getExpenses().catch(() => null),
          db.getSalaries().catch(() => null),
          db.getBudgetTargets().catch(() => null),
          db.getExamsPayments().catch(() => null),
          db.getExamsExpenses().catch(() => null),
          db.getExamsSettings().catch(() => null),
          db.getTeacherEvaluations().catch(() => null),
          db.getJournalEntries().catch(() => null),
          db.getTrashItems().catch(() => null)
        ]);

        if (dbUsers === null && dbStudents === null && dbPayments === null) {
          console.warn('Cloud database collections are offline/misconfigured. Falling back to LocalStorage...');
          setFirebaseConnected(false);
          loadLocalBackup(localUsers, localStudents, localPayments, localTerms, localExpenses, localSalaries, localBudgetTargets, localEvaluations, localJournalEntries, localExamsPayments, localExamsExpenses, localExamsSettings, localPromoBackups);
          return;
        }

        // Build separate sets of soft-deleted trash items by collection type
        const deletedStudentIds = new Set<string>();
        const deletedPaymentIds = new Set<string>();
        const deletedExpenseIds = new Set<string>();
        const deletedSalaryIds = new Set<string>();
        const deletedUserIds = new Set<string>();

        if (Array.isArray(dbTrashItems)) {
          dbTrashItems.forEach((t: any) => {
            if (!t) return;
            const itemType = t.itemType || t.type;
            
            if (itemType === 'student') {
              if (t.id) deletedStudentIds.add(t.id);
              if (t.originalId) deletedStudentIds.add(t.originalId);
              if (t.recordData?.student?.id) deletedStudentIds.add(t.recordData.student.id);
              if (t.recordData?.id) deletedStudentIds.add(t.recordData.id);
            } else if (itemType === 'payment') {
              if (t.id) deletedPaymentIds.add(t.id);
              if (t.originalId) deletedPaymentIds.add(t.originalId);
              if (t.recordData?.payment?.id) deletedPaymentIds.add(t.recordData.payment.id);
              if (t.recordData?.id) deletedPaymentIds.add(t.recordData.id);
            } else if (itemType === 'bulk_payments') {
              if (t.id) deletedPaymentIds.add(t.id);
              if (t.originalId) deletedPaymentIds.add(t.originalId);
              if (Array.isArray(t.recordData?.payments)) {
                t.recordData.payments.forEach((p: any) => { if (p?.id) deletedPaymentIds.add(p.id); });
              }
            } else if (itemType === 'expense') {
              if (t.id) deletedExpenseIds.add(t.id);
              if (t.originalId) deletedExpenseIds.add(t.originalId);
              if (t.recordData?.id) deletedExpenseIds.add(t.recordData.id);
            } else if (itemType === 'salary') {
              if (t.id) deletedSalaryIds.add(t.id);
              if (t.originalId) deletedSalaryIds.add(t.originalId);
              if (t.recordData?.id) deletedSalaryIds.add(t.recordData.id);
            } else if (itemType === 'user') {
              if (t.id) deletedUserIds.add(t.id);
              if (t.originalId) deletedUserIds.add(t.originalId);
              if (t.recordData?.id) deletedUserIds.add(t.recordData.id);
            }
          });
        }

        // If db connection succeeds and users collection is completely unseeded, safely initialize default admin user accounts without touching or wiping payments or student data!
        if (dbUsers.length === 0) {
          console.log('Database users collection is unseeded. Creating default initial admin user accounts...');
          INITIAL_USERS.forEach(u => db.saveUser(u));
        }

        const DEMO_STUDENT_ID_SET = new Set(ORIGINAL_DEMO_STUDENT_IDS);

        const mergeAndHeal = <T extends { id: string }>(
          localItems: any,
          cloudItems: T[] | null | undefined,
          saveToCloud: (item: T) => Promise<any>,
          deleteFromCloud: ((id: string) => Promise<any>) | null,
          collectionLabel: string,
          deletedIdsSet: Set<string>
        ): T[] => {
          const mergedMap = new Map<string, T>();
          const cloudIds = new Set<string>();

          const resolvedCloud = cloudItems || [];
          resolvedCloud.forEach(item => {
            if (item && item.id) {
              mergedMap.set(item.id, item);
              cloudIds.add(item.id);
            }
          });

          let resolvedLocal: T[] = [];
          try {
            if (localItems) {
              resolvedLocal = typeof localItems === 'string' ? JSON.parse(localItems) : localItems;
            }
          } catch (e) {
            console.warn(`[Self-Healing] Failed to parse local storage items for ${collectionLabel}:`, e);
          }

          const unsynced: T[] = [];

          const cloudPaymentCompositeMap = new Map<string, string>();
          if (collectionLabel === 'payments') {
            resolvedCloud.forEach((item: any) => {
              if (item && item.id && item.studentId && item.date) {
                const compKey = `${item.studentId}_${item.date}_${item.amount}_${(item.paymentMethod || 'cash').toLowerCase()}`;
                cloudPaymentCompositeMap.set(compKey, item.id);
              }
            });
          }

          if (Array.isArray(resolvedLocal)) {
            resolvedLocal.forEach(item => {
              if (item && item.id) {
                // Prevent resurrected demo data if cloud or local has real data
                if (collectionLabel === 'students' && (resolvedCloud.length > 0 || (Array.isArray(resolvedLocal) && resolvedLocal.length > 30)) && DEMO_STUDENT_ID_SET.has(item.id)) {
                  return;
                }
                if (collectionLabel === 'payments' && (resolvedCloud.length > 0 || (Array.isArray(resolvedLocal) && resolvedLocal.length > 30)) && (item as any).studentId && DEMO_STUDENT_ID_SET.has((item as any).studentId)) {
                  return;
                }

                // Prevent sync collision: if exact same payment exists in cloud with matching student, date, amount, method
                if (collectionLabel === 'payments' && !cloudIds.has(item.id)) {
                  const pItem = item as any;
                  const compKey = `${pItem.studentId}_${pItem.date}_${pItem.amount}_${(pItem.paymentMethod || 'cash').toLowerCase()}`;
                  if (cloudPaymentCompositeMap.has(compKey)) {
                    // Item already in cloud under different document ID. Avoid creating duplicate payment document.
                    return;
                  }
                }

                if (!cloudIds.has(item.id)) {
                  // Check if this record was soft-deleted in Trash for its specific collection
                  const wasDeleted = deletedIdsSet.has(item.id) || ((item as any).originalId && deletedIdsSet.has((item as any).originalId));
                  if (!wasDeleted) {
                    // Not soft-deleted! This is a valid locally created or updated record. Preserve & sync to cloud!
                    mergedMap.set(item.id, item);
                    unsynced.push(item);
                  }
                } else {
                  // It exists in both cloud and local. Let's compare them to heal updates
                  const cloudItem = mergedMap.get(item.id);
                  if (cloudItem) {
                    const localStr = JSON.stringify(item);
                    const cloudStr = JSON.stringify(cloudItem);
                    if (localStr !== cloudStr) {
                      let useLocal = false;
                      const localTime = (item as any).timestamp || (item as any).updatedAt || (item as any).datePaid || (item as any).date;
                      const cloudTime = (cloudItem as any).timestamp || (cloudItem as any).updatedAt || (cloudItem as any).datePaid || (cloudItem as any).date;
                      
                      if (localTime && cloudTime) {
                        try {
                          const localMs = new Date(localTime).getTime();
                          const cloudMs = new Date(cloudTime).getTime();
                          if (!isNaN(localMs) && !isNaN(cloudMs)) {
                            useLocal = localMs > cloudMs;
                          }
                        } catch (e) {}
                      } else if (localTime && !cloudTime) {
                        useLocal = true;
                      } else {
                        useLocal = false;
                      }
                      
                      if (useLocal) {
                        console.log(`[Self-Healing] Found modified local item ${item.id} of "${collectionLabel}" that differs from cloud. Prioritizing local and syncing to cloud...`);
                        mergedMap.set(item.id, item);
                        unsynced.push(item);
                      }
                    }
                  }
                }
              }
            });
          }

          if (unsynced.length > 0) {
            console.log(`[Self-Healing] Found ${unsynced.length} offline-created or modified items in "${collectionLabel}". Syncing to cloud...`);
            unsynced.forEach(item => {
              saveToCloud(item)
                .then(() => console.log(`[Self-Healing] Successfully synced item ${item.id} of "${collectionLabel}"`))
                .catch(err => console.error(`[Self-Healing] Failed to sync item ${item.id} of "${collectionLabel}":`, err));
            });
          }

          // Enforce strict single-record-per-(studentId, date) for payments
          if (collectionLabel === 'payments') {
            const byStudentDate = new Map<string, any>();
            const duplicateIdsToDelete: string[] = [];

            Array.from(mergedMap.values()).forEach((p: any) => {
              if (!p || !p.studentId || !p.date) return;
              const key = `${p.studentId}_${p.date}`;
              const existing = byStudentDate.get(key);
              if (!existing) {
                byStudentDate.set(key, p);
              } else {
                const pTime = new Date(p.timestamp || p.date || 0).getTime();
                const existTime = new Date(existing.timestamp || existing.date || 0).getTime();
                let pIsAuthoritative = false;
                if (p.amount > 0 && existing.amount === 0) {
                  pIsAuthoritative = true;
                } else if (p.amount === 0 && existing.amount > 0) {
                  pIsAuthoritative = false;
                } else {
                  pIsAuthoritative = pTime >= existTime;
                }

                if (pIsAuthoritative) {
                  duplicateIdsToDelete.push(existing.id);
                  mergedMap.delete(existing.id);
                  byStudentDate.set(key, p);
                } else {
                  duplicateIdsToDelete.push(p.id);
                  mergedMap.delete(p.id);
                }
              }
            });

            if (duplicateIdsToDelete.length > 0) {
              if (deleteFromCloud) {
                duplicateIdsToDelete.forEach(id => {
                  try { deleteFromCloud(id); } catch (_) {}
                });
              }
            }
          }

          return Array.from(mergedMap.values());
        };

        const healedUsers = mergeAndHeal(localUsers, dbUsers, db.saveUser, db.deleteUser || null, 'users', deletedUserIds);
        const healedStudents = mergeAndHeal(localStudents, dbStudents, db.saveStudent, db.deleteStudent || null, 'students', deletedStudentIds);
        const healedPayments = mergeAndHeal(localPayments, dbPayments, db.savePayment, db.deletePayment || null, 'payments', deletedPaymentIds);
        const healedExpenses = mergeAndHeal(localExpenses, dbExpenses, db.saveExpense, db.deleteExpense || null, 'expenses', deletedExpenseIds);
        const healedSalaries = mergeAndHeal(localSalaries, dbSalaries, db.saveSalary, db.deleteSalary || null, 'salaries', deletedSalaryIds);
        const healedBudgetTargets = mergeAndHeal(localBudgetTargets, dbBudgetTargets, db.saveBudgetTarget, null, 'budget_targets', new Set());
        const healedEvaluations = mergeAndHeal(localEvaluations, dbEvaluations, db.saveTeacherEvaluation, null, 'teacher_evaluations', new Set());
        const healedJournalEntries = mergeAndHeal(localJournalEntries, dbJournalEntries, db.saveJournalEntry, null, 'journal_entries', new Set());
        const healedExamsPayments = mergeAndHeal(localExamsPayments, dbExamsPayments, db.saveExamsPayment, db.deleteExamsPayment || null, 'exams_payments', new Set());
        const healedExamsExpenses = mergeAndHeal(localExamsExpenses, dbExamsExpenses, db.saveExamsExpense, db.deleteExamsExpense || null, 'exams_expenses', new Set());

        setUsers(healedUsers);
        setStudents(healedStudents);
        idbEngine.setItem('s_students', healedStudents);
        setPayments(healedPayments);
        idbEngine.setItem('s_payments', healedPayments);
        setExpenses(healedExpenses);
        setSalaries(healedSalaries);
        setBudgetTargets(healedBudgetTargets);
        setTeacherEvaluations(healedEvaluations);
        setJournalEntries(healedJournalEntries);
        setExamsPayments(healedExamsPayments);
        setExamsExpenses(healedExamsExpenses);

        if (dbExamsSettings) {
          setExamsSettings(dbExamsSettings);
        } else {
          // If no settings exist on cloud, initialize with defaults or fallback to local
          let defaultSettings = localExamsSettings;
          if (!defaultSettings) {
            defaultSettings = {
              classFees: {
                'Nursery': { feeCharged: 20, companyBilling: 12 },
                'KG1': { feeCharged: 20, companyBilling: 12 },
                'KG2': { feeCharged: 20, companyBilling: 12 },
                'B1': { feeCharged: 30, companyBilling: 18 },
                'B2': { feeCharged: 30, companyBilling: 18 },
                'B3': { feeCharged: 30, companyBilling: 18 },
                'B4': { feeCharged: 30, companyBilling: 18 },
                'B5': { feeCharged: 30, companyBilling: 18 },
                'B6': { feeCharged: 30, companyBilling: 18 },
                'B7': { feeCharged: 45, companyBilling: 25 },
                'B8': { feeCharged: 45, companyBilling: 25 },
                'B9': { feeCharged: 45, companyBilling: 25 }
              }
            };
          }
          setExamsSettings(defaultSettings);
          db.saveExamsSettings(defaultSettings);
        }

        // Sync local copies as high speed cache
        idbEngine.setItem('s_users', healedUsers);
        idbEngine.setItem('s_students', healedStudents);
        idbEngine.setItem('s_payments', healedPayments);
        idbEngine.setItem('s_expenses', healedExpenses);
        idbEngine.setItem('s_salaries', healedSalaries);
        idbEngine.setItem('s_teacher_evaluations', healedEvaluations);
        idbEngine.setItem('s_journal_entries', healedJournalEntries);
        idbEngine.setItem('s_budget_targets', healedBudgetTargets);
        idbEngine.setItem('s_exams_payments', healedExamsPayments);
        idbEngine.setItem('s_exams_expenses', healedExamsExpenses);
        if (dbExamsSettings) {
          idbEngine.setItem('s_exams_settings', dbExamsSettings);
        } else if (localExamsSettings) {
          idbEngine.setItem('s_exams_settings', localExamsSettings);
        }
        
        // Sync terms in active cloud mode
        if (dbTerms && dbTerms.length > 0) {
          const healed = healTerms(dbTerms);
          setTerms(healed);
          idbEngine.setItem('s_terms', healed);
          // If the healed list changed (i.e. deactivated a duplicate active term), save it back
          const wasHealed = healed.some((t, i) => t.active !== dbTerms[i].active);
          if (wasHealed) {
            db.saveTerms(healed);
          }
        } else {
          if (localTerms) {
            const parsed = typeof localTerms === 'string' ? JSON.parse(localTerms) : localTerms;
            const healed = healTerms(parsed);
            setTerms(healed);
            idbEngine.setItem('s_terms', healed);
            db.saveTerms(healed);
          } else {
            const initialTerms = [{
              id: 'term_default',
              name: 'Term 3 (April - July 2026)',
              startDate: '2026-04-27',
              daysCount: 68,
              schoolDays: generateSchoolDays('2026-04-27', 68),
              publicHolidays: ['2026-05-01', '2026-05-25', '2026-07-01'],
              active: true
            }];
            setTerms(initialTerms);
            idbEngine.setItem('s_terms', initialTerms);
            db.saveTerms(initialTerms);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('Core sync sequence failure:', err);
        setFirebaseConnected(false);
        
        // Auto-revert storageMode selection to prevent lagging subsequent state mutations
        setStorageModeState('local');
        loadLocalBackup(localUsers, localStudents, localPayments, localTerms, localExpenses, localSalaries, localBudgetTargets, localEvaluations, localJournalEntries, localExamsPayments, localExamsExpenses, localExamsSettings, localPromoBackups);

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
        loadLocalBackup(localUsers, localStudents, localPayments, localTerms, localExpenses, localSalaries, localBudgetTargets, localEvaluations, localJournalEntries, localExamsPayments, localExamsExpenses, localExamsSettings, localPromoBackups);
      }
    } else {
      console.log('FEETRACK running in standard client-persistence mode (Local Storage).');
      loadLocalBackup(localUsers, localStudents, localPayments, localTerms, localExpenses, localSalaries, localBudgetTargets, localEvaluations, localJournalEntries, localExamsPayments, localExamsExpenses, localExamsSettings, localPromoBackups);
    }
  };

  // Load state from Firebase if configured, otherwise fall back to localStorage
  useEffect(() => {
    initializeData();
  }, [storageMode]);

    const loadLocalBackup = (
      localUsers: any,
      localStudents: any,
      localPayments: any,
      localTerms: any,
      localExpenses: any,
      localSalaries: any,
      localBudgetTargets: any,
      localEvaluations: any,
      localJournalEntries: any,
      localExamsPayments: any,
      localExamsExpenses: any,
      localExamsSettings: any,
      localPromoBackups: any
    ) => {
      // Users list healing
      try {
        if (localUsers) {
          const parsed: UserAccount[] = typeof localUsers === 'string' ? JSON.parse(localUsers) : localUsers;
          if (!parsed.some(u => u.role === 'Administrator' || u.email.toLowerCase() === 'yakubuhakeem@gmail.com')) {
            parsed.unshift({
              id: 'admin-hakeem',
              name: 'Hakeem Yakubu',
              email: 'yakubuhakeem@gmail.com',
              role: 'Administrator',
              mfaEnabled: true,
              mfaSecret: 'SHA-SAAKOKEY2003',
              passwordEnabled: true
            });
            idbEngine.setItem('s_users', parsed);
          }
          setUsers(parsed);
        } else {
          setUsers(INITIAL_USERS);
          idbEngine.setItem('s_users', INITIAL_USERS);
        }
      } catch (e) {
        setUsers(INITIAL_USERS);
        idbEngine.setItem('s_users', INITIAL_USERS);
      }

      const skipDemo = !!systemSettings?.disableDemoData;

      // Students database healing
      try {
        if (localStudents) {
          const parsed = typeof localStudents === 'string' ? JSON.parse(localStudents) : localStudents;
          const clean = Array.isArray(parsed) ? parsed.filter((s: any) => s && s.id) : [];
          if (clean.length > 0) {
            setStudents(clean);
          } else {
            fetch('/api/students')
              .then(res => res.json())
              .then((list: Student[]) => {
                if (Array.isArray(list) && list.length > 0) {
                  const filtered = list.filter((s: any) => s && s.id);
                  setStudents(filtered);
                  idbEngine.setItem('s_students', filtered);
                }
              }).catch(() => {});
          }
        } else {
          fetch('/api/students')
            .then(res => res.json())
            .then((list: Student[]) => {
              if (Array.isArray(list) && list.length > 0) {
                const filtered = list.filter((s: any) => s && s.id);
                setStudents(filtered);
                idbEngine.setItem('s_students', filtered);
              }
            }).catch(() => {});
        }
      } catch (e) {
        fetch('/api/students')
          .then(res => res.json())
          .then((list: Student[]) => {
            if (Array.isArray(list) && list.length > 0) {
              const filtered = list.filter((s: any) => s && s.id);
              setStudents(filtered);
              idbEngine.setItem('s_students', filtered);
            }
          }).catch(() => {});
      }

      // Payments ledger healing
      try {
        if (localPayments) {
          const parsed = typeof localPayments === 'string' ? JSON.parse(localPayments) : localPayments;
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPayments(parsed);
          } else {
            fetch('/api/payments')
              .then(res => res.json())
              .then((list: PaymentRecord[]) => {
                if (Array.isArray(list) && list.length > 0) {
                  setPayments(list);
                  idbEngine.setItem('s_payments', list);
                }
              }).catch(() => {});
          }
        } else {
          fetch('/api/payments')
            .then(res => res.json())
            .then((list: PaymentRecord[]) => {
              if (Array.isArray(list) && list.length > 0) {
                setPayments(list);
                idbEngine.setItem('s_payments', list);
              }
            }).catch(() => {});
        }
      } catch (e) {
        fetch('/api/payments')
          .then(res => res.json())
          .then((list: PaymentRecord[]) => {
            if (Array.isArray(list) && list.length > 0) {
              setPayments(list);
              idbEngine.setItem('s_payments', list);
            }
          }).catch(() => {});
      }

      // Terms database healing
      try {
        if (localTerms) {
          const parsed = typeof localTerms === 'string' ? JSON.parse(localTerms) : localTerms;
          const healed = healTerms(parsed);
          setTerms(healed);
          idbEngine.setItem('s_terms', healed);
        } else {
          const initialTerms = [{
            id: 'term_default',
            name: 'Term 3 (April - July 2026)',
            startDate: '2026-04-27',
            daysCount: 68,
            schoolDays: generateSchoolDays('2026-04-27', 68),
            publicHolidays: ['2026-05-01', '2026-05-25', '2026-07-01'],
            active: true
          }];
          setTerms(initialTerms);
          idbEngine.setItem('s_terms', initialTerms);
        }
      } catch (e) {
        const initialTerms = [{
          id: 'term_default',
          name: 'Term 3 (April - July 2026)',
          startDate: '2026-04-27',
          daysCount: 68,
          schoolDays: generateSchoolDays('2026-04-27', 68),
          publicHolidays: ['2026-05-01', '2026-05-25', '2026-07-01'],
          active: true
        }];
        setTerms(initialTerms);
        idbEngine.setItem('s_terms', initialTerms);
      }

      // Expenses database healing
      try {
        if (localExpenses) {
          setExpenses(typeof localExpenses === 'string' ? JSON.parse(localExpenses) : localExpenses);
        } else {
          setExpenses([]);
          idbEngine.setItem('s_expenses', []);
        }
      } catch (e) {
        setExpenses([]);
        idbEngine.setItem('s_expenses', []);
      }

      // Salaries database healing
      try {
        if (localSalaries) {
          setSalaries(typeof localSalaries === 'string' ? JSON.parse(localSalaries) : localSalaries);
        } else {
          setSalaries([]);
          idbEngine.setItem('s_salaries', []);
        }
      } catch (e) {
        setSalaries([]);
        idbEngine.setItem('s_salaries', []);
      }

      // Teacher evaluations database healing
      try {
        if (localEvaluations) {
          setTeacherEvaluations(typeof localEvaluations === 'string' ? JSON.parse(localEvaluations) : localEvaluations);
        } else {
          setTeacherEvaluations([]);
          idbEngine.setItem('s_teacher_evaluations', []);
        }
      } catch (e) {
        setTeacherEvaluations([]);
        idbEngine.setItem('s_teacher_evaluations', []);
      }

      // Journal entries database healing
      try {
        if (localJournalEntries) {
          setJournalEntries(typeof localJournalEntries === 'string' ? JSON.parse(localJournalEntries) : localJournalEntries);
        } else {
          setJournalEntries([]);
          idbEngine.setItem('s_journal_entries', []);
        }
      } catch (e) {
        setJournalEntries([]);
        idbEngine.setItem('s_journal_entries', []);
      }

      // Budget targets database healing
      try {
        if (localBudgetTargets) {
          setBudgetTargets(typeof localBudgetTargets === 'string' ? JSON.parse(localBudgetTargets) : localBudgetTargets);
        } else {
          setBudgetTargets([]);
          idbEngine.setItem('s_budget_targets', []);
        }
      } catch (e) {
        setBudgetTargets([]);
        idbEngine.setItem('s_budget_targets', []);
      }

      // Exams database healing
      try {
        if (localExamsPayments) {
          setExamsPayments(typeof localExamsPayments === 'string' ? JSON.parse(localExamsPayments) : localExamsPayments);
        } else {
          setExamsPayments([]);
          idbEngine.setItem('s_exams_payments', []);
        }
      } catch (e) {
        setExamsPayments([]);
      }

      try {
        if (localExamsExpenses) {
          setExamsExpenses(typeof localExamsExpenses === 'string' ? JSON.parse(localExamsExpenses) : localExamsExpenses);
        } else {
          setExamsExpenses([]);
          idbEngine.setItem('s_exams_expenses', []);
        }
      } catch (e) {
        setExamsExpenses([]);
      }

      try {
        if (localExamsSettings) {
          setExamsSettings(typeof localExamsSettings === 'string' ? JSON.parse(localExamsSettings) : localExamsSettings);
        } else {
          const defaultSettings = {
            classFees: {
              'Nursery': { feeCharged: 20, companyBilling: 12 },
              'KG1': { feeCharged: 20, companyBilling: 12 },
              'KG2': { feeCharged: 20, companyBilling: 12 },
              'B1': { feeCharged: 30, companyBilling: 18 },
              'B2': { feeCharged: 30, companyBilling: 18 },
              'B3': { feeCharged: 30, companyBilling: 18 },
              'B4': { feeCharged: 30, companyBilling: 18 },
              'B5': { feeCharged: 30, companyBilling: 18 },
              'B6': { feeCharged: 30, companyBilling: 18 },
              'B7': { feeCharged: 45, companyBilling: 25 },
              'B8': { feeCharged: 45, companyBilling: 25 },
              'B9': { feeCharged: 45, companyBilling: 25 }
            }
          };
          setExamsSettings(defaultSettings);
          idbEngine.setItem('s_exams_settings', defaultSettings);
        }
      } catch (e) {
        setExamsSettings(null);
      }

      try {
        if (localPromoBackups) {
          setPromotionBackups(typeof localPromoBackups === 'string' ? JSON.parse(localPromoBackups) : localPromoBackups);
        } else {
          setPromotionBackups([]);
          idbEngine.setItem('s_promotion_backups', []);
        }
      } catch (e) {
        setPromotionBackups([]);
      }
    };

  // Sync to local backups
  const saveState = (newUsers: UserAccount[], newStudents: Student[], newPayments: PaymentRecord[]) => {
    setActiveSavesCount(prev => prev + 1);
    idbEngine.setItem('s_users', newUsers);
    idbEngine.setItem('s_students', newStudents);
    idbEngine.setItem('s_payments', newPayments);
    
    // Simulate a brief minimum sync animation duration (approx 500ms) to ensure 'Saving...' registers with users
    setTimeout(() => {
      setActiveSavesCount(prev => Math.max(0, prev - 1));
    }, 500);
  };

  const login = async (email: string, mfaCode?: string, password?: string) => {
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!user) {
      return { success: false, error: 'Account with this email does not exist.' };
    }

    if (user.active === false) {
      return { success: false, error: 'Your account has been deactivated/disabled. Please contact an Administrator.' };
    }

    // Secure Password Verification
    if (user.passwordEnabled) {
      if (!password) {
        return { success: true, requiresPassword: true };
      }

      const inputPass = password.trim();
      let verifiedLocally = false;

      // 1. Direct local password match check (if user/admin set or changed their password)
      if (user.password && user.password.trim() === inputPass) {
        verifiedLocally = true;
      }

      // 2. If no local match, attempt Firebase Authentication
      if (!verifiedLocally) {
        const authRes = await firebaseLogin(email, inputPass);
        if (authRes.success) {
          verifiedLocally = true;
          // Sync verified password into user record
          user.password = inputPass;
          const updatedUsers = users.map(u => u.id === user.id ? { ...u, password: inputPass } : u);
          setUsers(updatedUsers);
          idbEngine.setItem('s_users', updatedUsers);
        } else if (authRes.code === 'auth/user-not-found' || authRes.code === 'auth/invalid-credential') {
          // Attempt to create / enroll Firebase Auth user credentials on first login
          const createRes = await firebaseCreateAccount(email, inputPass);
          if (createRes.success) {
            verifiedLocally = true;
            user.password = inputPass;
            const updatedUsers = users.map(u => u.id === user.id ? { ...u, password: inputPass } : u);
            setUsers(updatedUsers);
            idbEngine.setItem('s_users', updatedUsers);
          }
        }
      }

      if (!verifiedLocally) {
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
    idbEngine.setItem('s_current_user', user);
    return { success: true };
  };

  const changePassword = (userId: string, newPassword: string) => {
    const trimmed = newPassword.trim();
    if (!trimmed || trimmed.length < 3) {
      return { success: false, error: 'Password must be at least 3 characters long.' };
    }

    let updatedUser: UserAccount | null = null;
    const nextUsers = users.map(u => {
      if (u.id === userId) {
        updatedUser = {
          ...u,
          passwordEnabled: true,
          password: trimmed
        };
        return updatedUser;
      }
      return u;
    });

    setUsers(nextUsers);
    if (currentUser && currentUser.id === userId && updatedUser) {
      setCurrentUser(updatedUser);
      idbEngine.setItem('s_current_user', updatedUser);
    }
    saveState(nextUsers, students, payments);
    if (updatedUser && db.isActive()) {
      db.saveUser(updatedUser);
    } else if (updatedUser) {
      recordLocallyPendingEdit('user', 'update', `Updated password for account: "${updatedUser.name}"`);
    }
    return { success: true };
  };

  const sendPasswordReset = async (email: string) => {
    const trimmed = email.toLowerCase().trim();
    if (!trimmed) {
      return { success: false, error: 'Please provide a valid email address.' };
    }
    return await firebaseSendPasswordReset(trimmed);
  };

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (fbUser) => {
      if (fbUser && fbUser.email) {
        const found = users.find(u => u.email.toLowerCase() === fbUser.email?.toLowerCase());
        if (found) {
          setCurrentUser(prev => prev?.id === found.id ? prev : found);
          idbEngine.setItem('s_current_user', found);
        }
      }
    });
    return () => unsubscribe();
  }, [users]);

  const logout = () => {
    setCurrentUser(null);
    idbEngine.removeItem('s_current_user');
    firebaseSignOut().catch(() => {});
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
      idbEngine.setItem('s_current_user', updatedUser);
    }
    saveState(updated, students, payments);
    if (updatedUser && db.isActive()) {
      db.saveUser(updatedUser);
    } else if (updatedUser) {
      recordLocallyPendingEdit('user', 'update', `Toggled MFA security for staff: "${updatedUser.name}"`);
    }
  };

  const registerStaff = (name: string, email: string, role: UserRole, assignedClass?: StudentClass, mfaEnabled = false, passwordEnabled = false, password = '', assignedClasses?: StudentClass[], stipendSalary?: number, momoNumber?: string, momoName?: string, photoUrl?: string, employeeId?: string, department?: string, gender?: 'Male' | 'Female', employmentType?: 'Full-Time' | 'Part-Time' | 'Contract' | 'Volunteer', appointmentDate?: string, contractEndDate?: string, renewalOption?: 'Automatic' | 'Manual Review' | 'Fixed Term' | 'Non-Renewable', renewalPeriod?: string, personalAddress?: string, permissions?: StaffPermissions) => {
    const trimmedEmail = email.toLowerCase().trim();
    if (users.some(u => u.email.toLowerCase() === trimmedEmail)) {
      return { success: false, error: 'A staff member with this email is already registered.' };
    }

    const finalClasses = role === 'Teacher' ? (assignedClasses || (assignedClass ? [assignedClass] : [])) : undefined;
    const finalClass = role === 'Teacher' ? (assignedClass || (finalClasses && finalClasses.length > 0 ? finalClasses[0] : undefined)) : undefined;

    const defaultPerms: StaffPermissions = {
      canRecordPayments: true,
      canEditPayments: role === 'Administrator' || role === 'Headmaster' || role === 'Accountant',
      canDeletePayments: role === 'Administrator' || role === 'Headmaster',
      canManageStudents: role !== 'Teacher',
      canManageExams: true,
      canViewReports: role !== 'Teacher',
      canManageSettings: role === 'Administrator' || role === 'Headmaster'
    };

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
      momoName,
      photoUrl,
      employeeId,
      department,
      gender,
      employmentType,
      appointmentDate,
      contractEndDate,
      renewalOption,
      renewalPeriod,
      personalAddress,
      permissions: permissions || defaultPerms
    };

    const nextUsers = [...users, newUser];
    setUsers(nextUsers);
    saveState(nextUsers, students, payments);
    if (db.isActive()) {
      db.saveUser(newUser);
    } else {
      recordLocallyPendingEdit('user', 'create', `Created user staff account: "${name}" (${role})`);
    }
    return { success: true };
  };

  const updateStaff = (userId: string, name: string, email: string, role: UserRole, assignedClass?: StudentClass, mfaEnabled = false, passwordEnabled = false, password = '', assignedClasses?: StudentClass[], stipendSalary?: number, momoNumber?: string, momoName?: string, photoUrl?: string, employeeId?: string, department?: string, gender?: 'Male' | 'Female', employmentType?: 'Full-Time' | 'Part-Time' | 'Contract' | 'Volunteer', idCardDeactivated?: boolean, appointmentDate?: string, contractEndDate?: string, renewalOption?: 'Automatic' | 'Manual Review' | 'Fixed Term' | 'Non-Renewable', renewalPeriod?: string, signatureUrl?: string, managementSignatureUrl?: string, personalAddress?: string, ethicsEvaluation?: TeacherEthicsEvaluation, permissions?: StaffPermissions) => {
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
          password: passwordEnabled ? ((password && password.trim()) ? password.trim() : u.password) : u.password,
          stipendSalary,
          momoNumber,
          momoName,
          photoUrl: photoUrl !== undefined ? photoUrl : u.photoUrl,
          employeeId: employeeId !== undefined ? employeeId : u.employeeId,
          department: department !== undefined ? department : u.department,
          gender: gender !== undefined ? gender : u.gender,
          employmentType: employmentType !== undefined ? employmentType : u.employmentType,
          idCardDeactivated: idCardDeactivated !== undefined ? idCardDeactivated : u.idCardDeactivated,
          appointmentDate: appointmentDate !== undefined ? appointmentDate : u.appointmentDate,
          contractEndDate: contractEndDate !== undefined ? contractEndDate : u.contractEndDate,
          renewalOption: renewalOption !== undefined ? renewalOption : u.renewalOption,
          renewalPeriod: renewalPeriod !== undefined ? renewalPeriod : u.renewalPeriod,
          signatureUrl: signatureUrl !== undefined ? signatureUrl : u.signatureUrl,
          managementSignatureUrl: managementSignatureUrl !== undefined ? managementSignatureUrl : u.managementSignatureUrl,
          personalAddress: personalAddress !== undefined ? personalAddress : u.personalAddress,
          ethicsEvaluation: ethicsEvaluation !== undefined ? ethicsEvaluation : u.ethicsEvaluation,
          permissions: permissions !== undefined ? permissions : u.permissions
        };
        return updatedUser;
      }
      return u;
    });

    setUsers(nextUsers);
    if (currentUser && currentUser.id === userId && updatedUser) {
      setCurrentUser(updatedUser);
      idbEngine.setItem('s_current_user', updatedUser);
    }
    saveState(nextUsers, students, payments);
    if (updatedUser && db.isActive()) {
      db.saveUser(updatedUser);
    } else if (updatedUser) {
      recordLocallyPendingEdit('user', 'update', `Updated settings for staff: "${updatedUser.name}"`);
    }
    return { success: true };
  };

  const adjustStaffSalariesByPercentage = (adjustments: { userId: string; percentage: number; newSalary?: number; reason?: string }[]) => {
    if (!adjustments || adjustments.length === 0) return { success: false, count: 0 };

    const adjMap = new Map(adjustments.map(a => [a.userId, a]));
    const updatedUsersList: UserAccount[] = [];

    const nextUsers = users.map(u => {
      const adj = adjMap.get(u.id);
      if (adj) {
        const currentSalary = u.stipendSalary || 0;
        let finalSalary = adj.newSalary;
        if (finalSalary === undefined) {
          finalSalary = Math.max(0, Math.round((currentSalary * (1 + adj.percentage / 100)) * 100) / 100);
        } else {
          finalSalary = Math.max(0, Math.round(finalSalary * 100) / 100);
        }
        const updated = {
          ...u,
          stipendSalary: finalSalary
        };
        updatedUsersList.push(updated);
        return updated;
      }
      return u;
    });

    setUsers(nextUsers);

    // If current logged in user was adjusted, update state
    if (currentUser) {
      const updatedSelf = updatedUsersList.find(u => u.id === currentUser.id);
      if (updatedSelf) {
        setCurrentUser(updatedSelf);
        idbEngine.setItem('s_current_user', updatedSelf);
      }
    }

    saveState(nextUsers, students, payments);

    if (db.isActive()) {
      updatedUsersList.forEach(u => db.saveUser(u));
    } else {
      recordLocallyPendingEdit('user', 'update', `Batch adjusted wages/salaries for ${updatedUsersList.length} worker(s).`);
    }

    return { success: true, count: updatedUsersList.length };
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
    if (updatedUser && db.isActive()) {
      db.saveUser(updatedUser);
    } else if (updatedUser) {
      recordLocallyPendingEdit('user', 'update', `Toggled active status for staff: "${updatedUser.name}"`);
    }
    return { success: true };
  };

  const addStudent = (
    name: string, 
    className: StudentClass, 
    guardianPhone?: string, 
    photoUrl?: string, 
    discount = 0, 
    gender?: 'Male' | 'Female', 
    paymentType: 'Daily' | 'Term' = 'Daily', 
    termFee = 350, 
    legacyDebt = 0,
    enrollmentDate?: string
  ) => {
    // Check if a student with the same name already exists in offline pending edits
    const hasPendingAdd = pendingLocalEdits.some(edit => 
      edit.type === 'student' && 
      edit.description.toLowerCase().includes(name.trim().toLowerCase())
    );
    if (hasPendingAdd) {
      const proceed = window.confirm(`Warning: A student record for "${name}" already exists in your offline pending edits queue.\n\nAre you sure you want to add this student record again?`);
      if (!proceed) return;
    }

    const isDuplicate = students.some(s => 
      s.name.trim().toLowerCase() === name.trim().toLowerCase() && 
      s.class === className
    );
    if (isDuplicate) {
      playFeedbackSound('error');
      return;
    }

    const category = getClassCategory(className);
    const rollNumber = generateNextPupilId(students, className, systemSettings);

    let adjustedLegacyDebt = legacyDebt;
    if (enrollmentDate && activeTerm && activeTerm.schoolDays && activeTerm.schoolDays.length > 0) {
      const schoolDays = [...activeTerm.schoolDays].sort();
      const firstSchoolDay = schoolDays[0];
      if (enrollmentDate > firstSchoolDay) {
        const priorDays = schoolDays.filter(d => d < enrollmentDate);
        const priorDaysCount = priorDays.length;
        if (priorDaysCount > 0) {
          if (paymentType === 'Term') {
            const dailyRate = termFee / schoolDays.length;
            const deduction = priorDaysCount * dailyRate;
            adjustedLegacyDebt = Math.max(0, legacyDebt - deduction);
          } else {
            const dailyRate = Math.max(0.01, (systemSettings?.baselineDailyFee ?? 5.00) - discount);
            const deduction = priorDaysCount * dailyRate;
            adjustedLegacyDebt = Math.max(0, legacyDebt - deduction);
          }
        }
      }
    }

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
      legacyDebt: adjustedLegacyDebt,
      enrollmentDate: enrollmentDate,
      updatedAt: new Date().toISOString()
    };

    const nextStudents = [...students, newStudent];
    setStudents(nextStudents);
    saveState(users, nextStudents, payments);
    if (db.isActive()) {
      db.saveStudent(newStudent);
    } else {
      recordLocallyPendingEdit('student', 'create', `Admitted new pupil: "${name}" (${className})`);
    }
    logActivity('STUDENT_ENROLLED', 'students', `Enrolled pupil "${name}" in class ${className}`, newStudent.id, name);
  };

  const updateStudent = (updatedStudent: Student) => {
    // Check if student has pending local updates
    const hasPending = pendingLocalEdits.some(edit => 
      (edit.type === 'student' || edit.type === 'payment') && 
      edit.description.toLowerCase().includes(updatedStudent.name.toLowerCase())
    );
    if (hasPending) {
      const proceed = window.confirm(`Warning: ${updatedStudent.name} has pending offline updates that are not yet synced to the cloud. Overwriting now may cause synchronization conflicts.\n\nAre you sure you want to proceed with updating this record?`);
      if (!proceed) return;
    }

    const studentWithTimestamp: Student = {
      ...updatedStudent,
      updatedAt: new Date().toISOString()
    };

    const nextStudents = students.map(s => s.id === updatedStudent.id ? studentWithTimestamp : s);
    setStudents(nextStudents);
    saveState(users, nextStudents, payments);
    if (db.isActive()) {
      db.saveStudent(studentWithTimestamp);
    } else {
      recordLocallyPendingEdit('student', 'update', `Updated record for pupil: "${updatedStudent.name}"`);
    }
    logActivity('STUDENT_UPDATED', 'students', `Updated pupil info for "${updatedStudent.name}" (${updatedStudent.class})`, updatedStudent.id, updatedStudent.name);
  };

  const deleteStudent = (studentId: string) => {
    if (currentUser?.role !== 'Administrator') {
      alert('Access Denied: Only Administrators are permitted to delete student records completely.');
      return;
    }
    const targetStudent = students.find(s => s.id === studentId);
    const targetStudentPayments = payments.filter(p => p.studentId === studentId);

    if (targetStudent) {
      moveToTrash(
        'student',
        studentId,
        { student: targetStudent, payments: targetStudentPayments },
        `Deleted pupil profile "${targetStudent.name}" (${targetStudent.class}) along with ${targetStudentPayments.length} payment records`,
        {
          studentId: targetStudent.id,
          studentName: targetStudent.name,
          class: targetStudent.class,
          itemCount: targetStudentPayments.length
        }
      );
    }

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
    logActivity(
      'STUDENT_DELETED',
      'students',
      `Permanently deleted pupil record for "${targetStudent?.name || 'Unknown'}"`,
      studentId,
      targetStudent?.name,
      undefined,
      targetStudent ? {
        type: 'student',
        student: targetStudent,
        payments: targetStudentPayments
      } : undefined
    );
  };

  const mergeStudents = (primaryStudentId: string, duplicateStudentId: string): { success: boolean; message: string } => {
    if (currentUser?.role !== 'Administrator') {
      alert('Access Denied: Only Administrators are permitted to merge student records.');
      return { success: false, message: 'Access Denied' };
    }

    const primary = students.find(s => s.id === primaryStudentId);
    const duplicate = students.find(s => s.id === duplicateStudentId);

    if (!primary || !duplicate) {
      return { success: false, message: 'Student records not found.' };
    }

    // 1. Re-link regular daily payments
    let movedPaymentsCount = 0;
    const nextPayments = payments.map(p => {
      if (p.studentId === duplicateStudentId) {
        movedPaymentsCount++;
        const remapped = {
          ...p,
          studentId: primaryStudentId,
          studentName: primary.name,
          class: primary.class
        };
        if (db.isActive()) {
          db.savePayment(remapped);
        }
        return remapped;
      }
      return p;
    });

    // 2. Re-link exam fee payments
    let movedExamsCount = 0;
    const nextExamsPayments = examsPayments.map(ep => {
      if (ep.studentId === duplicateStudentId) {
        movedExamsCount++;
        const remapped = {
          ...ep,
          studentId: primaryStudentId,
          studentName: primary.name,
          class: primary.class
        };
        if (db.isActive()) {
          db.saveExamsPayment(remapped);
        }
        return remapped;
      }
      return ep;
    });

    // 3. Combine pupil profile metadata
    const mergedStudent: Student = {
      ...primary,
      parentPhone: primary.parentPhone || duplicate.parentPhone || '',
      parentName: primary.parentName || duplicate.parentName || '',
      guardianName: primary.guardianName || duplicate.guardianName || '',
      guardianPhone: primary.guardianPhone || duplicate.guardianPhone || '',
      discount: Math.max(primary.discount || 0, duplicate.discount || 0),
      legacyDebt: (primary.legacyDebt || 0) + (duplicate.legacyDebt || 0),
      updatedAt: new Date().toISOString()
    };

    // 4. Update student list (keep primary, remove duplicate)
    const nextStudents = students
      .map(s => (s.id === primaryStudentId ? mergedStudent : s))
      .filter(s => s.id !== duplicateStudentId);

    setStudents(nextStudents);
    setPayments(nextPayments);
    setExamsPayments(nextExamsPayments);

    idbEngine.setItem('s_students', nextStudents);
    idbEngine.setItem('s_payments', nextPayments);
    idbEngine.setItem('s_exams_payments', nextExamsPayments);

    saveState(users, nextStudents, nextPayments);

    if (db.isActive()) {
      db.saveStudent(mergedStudent);
      db.deleteStudent(duplicateStudentId);
    }

    const msg = `Merged duplicate pupil "${duplicate.name}" (${duplicate.class}) into primary record "${primary.name}" (${primary.class}). Reassigned ${movedPaymentsCount} daily payment(s) and ${movedExamsCount} exam payment(s).`;

    logActivity(
      'STUDENTS_MERGED',
      'students',
      msg,
      primaryStudentId,
      primary.name
    );

    return { success: true, message: msg };
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

  const standardizePupilIds = (formatStyle?: PupilIdFormatStyle): { updatedCount: number; message: string } => {
    const { updatedStudents, changedCount } = standardizeAllPupilIds(students, systemSettings, formatStyle);
    if (changedCount > 0) {
      setStudents(updatedStudents);
      saveState(users, updatedStudents, payments);
      if (db.isActive()) {
        updatedStudents.forEach(s => db.saveStudent(s));
      } else {
        recordLocallyPendingEdit('student', 'update', `Standardized Pupil IDs across ${changedCount} pupils`);
      }
      logActivity('SYSTEM_BACKUP_CREATED', 'students', `Standardized Pupil IDs for ${changedCount} pupils in format: ${formatStyle || systemSettings?.pupilIdFormat || 'PREFIX_CLASS_NUM'}`);
    }
    return {
      updatedCount: changedCount,
      message: changedCount > 0
        ? `Successfully formatted & standardized ${changedCount} Pupil IDs across the school roster!`
        : `All pupil IDs are already formatted according to the selected standard.`
    };
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
    const formattedId = formatPupilId(student, systemSettings);
    const message = `*${systemSettings.schoolName || 'SAAKO HOLY CHILD ACADEMY'}*\n` +
      `*ATTENDANCE GATE CHECK-IN*\n\n` +
      `Dear Parent/Guardian,\n` +
      `Your ward *${student.name}* (Pupil ID: ${formattedId}, Class: ${student.class}) has checked-in safely at school today on *${currentDate}* at *${timeString}*.\n\n` +
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
    const debtInfo = calculateStudentFinancialState(student, payments, activeTerm, currentDate, baseDailyFee, systemSettings, terms);

    if (!debtInfo || debtInfo.totalDebt <= 0) return;

    const formattedPupilId = formatPupilId(student, systemSettings);
    const classGroup = `${student.class} (${student.category})`;
    const isTerm = isTermPayer(student);
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
      `*Pupil ID:* ${formattedPupilId}\n` +
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

  const applyLateFeeIfApplicable = (student: Student, record: PaymentRecord): PaymentRecord => {
    if (!systemSettings?.lateFeeEnabled || !systemSettings?.lateFeeCutoffTime || !systemSettings?.lateFeePercentage) {
      return record;
    }
    if (record.date !== currentDate || record.isAbsent) {
      return record;
    }
    if (record.lateFeeApplied !== undefined) {
      return record;
    }

    const cutoffStr = systemSettings.lateFeeCutoffTime;
    const [cutoffHour, cutoffMinute] = cutoffStr.split(':').map(Number);
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const isLate = currentHour > cutoffHour || (currentHour === cutoffHour && currentMinute > cutoffMinute);
    if (isLate) {
      const baseDailyFee = systemSettings.baselineDailyFee ?? 5.00;
      const discountAmount = student.discount || 0;
      const dailyRate = Math.max(0.01, baseDailyFee - discountAmount);
      const penalty = dailyRate * (systemSettings.lateFeePercentage / 100);
      const penaltyFixed = Number(penalty.toFixed(2));
      return {
        ...record,
        lateFeeApplied: penaltyFixed,
        notes: record.notes
          ? `${record.notes} (Late Registration Penalty GHC ${penaltyFixed.toFixed(2)} applied)`
          : `Late Registration Penalty GHC ${penaltyFixed.toFixed(2)} applied`
      };
    }
    return record;
  };

  const recordPayment = (studentId: string, verified = true, customAmount?: number, customNotes?: string, allowDuplicate = false) => {
    if (viewingTermId) {
      playFeedbackSound('error');
      console.warn("Write operations are disabled while viewing historical archives.");
      return;
    }

    // Strict Public Holiday & Vacation Break Guard: Gate check-ins and fee collections are disabled on public holidays or vacation breaks
    const isPublicHoliday = activeTerm?.publicHolidays?.includes(currentDate);
    const isInVacationBreak = isDateInTermGap(currentDate, terms);
    if (isPublicHoliday || isInVacationBreak) {
      playFeedbackSound('error');
      console.warn(`Gate check-in / fee collection rejected on ${currentDate}: Today is a declared holiday / vacation break.`);
      alert(`Fee Collection Rejected:\n\nDate ${currentDate} is a Vacation / Holiday Break. Pupils are exempt from fees during vacation breaks.`);
      return;
    }

    // Strict Term Gate & Calendar Boundary Enforcement Guard
    let targetPaymentDate = currentDate;
    if (activeTerm && activeTerm.schoolDays && activeTerm.schoolDays.length > 0) {
      const lastTermDay = activeTerm.schoolDays[activeTerm.schoolDays.length - 1];
      const isPostTermDate = currentDate > lastTermDay;

      if (activeTerm.isCompleted || isPostTermDate) {
        playFeedbackSound('error');
        const reasonStr = activeTerm.isCompleted 
          ? `Term Gate Closed: ${activeTerm.name} is marked as COMPLETED / CLOSED.`
          : `Term Calendar Boundary Reached: Active term ended on ${lastTermDay}. Selected date (${currentDate}) is outside the active term.`;

        const proceed = window.confirm(
          `${reasonStr}\n\n` +
          `Fee entries during holiday/vacation breaks cannot be recorded on post-term dates like ${currentDate}.\n\n` +
          `Would you like to assign this fee payment entry to the last official school day of the active term (${lastTermDay})?\n\n` +
          `• Click OK to log under term date: ${lastTermDay}\n` +
          `• Click Cancel to stop and create/activate the next term.`
        );

        if (!proceed) {
          console.warn(`Payment record rejected: Term gate closed / post-term date ${currentDate}.`);
          return;
        }

        targetPaymentDate = lastTermDay;
        customNotes = customNotes 
          ? `${customNotes} (Assigned to Term End Date ${lastTermDay})` 
          : `Holiday payment assigned to Term End Date ${lastTermDay}`;
      }
    }

    const student = students.find(s => s.id === studentId);
    if (!student) return;

    // Check if the student's record has pending updates
    const hasPending = pendingLocalEdits.some(edit => 
      (edit.type === 'student' || edit.type === 'payment') && 
      edit.description.toLowerCase().includes(student.name.toLowerCase())
    );
    if (hasPending && !allowDuplicate) {
      const proceed = window.confirm(`Warning: ${student.name} has pending offline updates that are not yet synced to the cloud.\n\nRecording a new payment now might create conflicts. Do you want to proceed anyway?`);
      if (!proceed) {
        return;
      }
    }

    const discountAmount = student.discount || 0;
    const baseDailyFee = systemSettings?.baselineDailyFee ?? 5.00;
    const finalAmount = customAmount !== undefined ? customAmount : Math.max(0, baseDailyFee - discountAmount);

    const dailyRate = Math.max(0.01, baseDailyFee - discountAmount);

    // 0. Handle Term Payers differently
    if (isTermPayer(student)) {
      const isCustomFinancial = customAmount !== undefined && customAmount > 0;
      const existingIndex = (allowDuplicate || isCustomFinancial) 
        ? -1 
        : payments.findIndex(p => p.studentId === studentId && p.date === currentDate && p.amount === 0 && !p.id.endsWith('_debt'));
      
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
        recordToSave = applyLateFeeIfApplicable(student, recordToSave);
        nextPayments[existingIndex] = recordToSave;
      } else {
        recordToSave = {
          id: (allowDuplicate || isCustomFinancial) 
            ? `p_${studentId}_term_pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` 
            : `p_${studentId}_${currentDate}`,
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
        recordToSave = applyLateFeeIfApplicable(student, recordToSave);
        nextPayments.push(recordToSave);
      }
      setPayments(nextPayments);
      saveState(users, students, nextPayments);
      if (db.isActive()) {
        db.savePayment(recordToSave);
      } else {
        recordLocallyPendingEdit('payment', 'create', `Logged term flat payment of GHC ${resolvedAmount.toFixed(2)} for pupil: "${student.name}"`);
      }
      logActivity('PAYMENT_RECORDED', 'payments', `Recorded term flat payment of GHC ${resolvedAmount.toFixed(2)} for pupil "${student.name}"`, student.id, student.name, resolvedAmount);
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
      const pastSchoolDays = activeTerm.schoolDays.filter(d => {
        const afterEnrollment = student.enrollmentDate ? d >= student.enrollmentDate : true;
        return d < currentDate && !holidays.includes(d) && afterEnrollment;
      });
      billableDays = pastSchoolDays.filter(dStr => {
        return !studentPayments.some(p => p.date === dStr && p.isAbsent);
      });
    }

    const totalRequired = multiplyCurrency(billableDays.length, dailyRate);
    const totalPaid = studentPayments
      .filter(p => !p.isAbsent && p.verified !== false && p.amount > 0)
      .reduce((sum, p) => addCurrency(sum, p.amount), 0);

    const totalDebt = Math.max(0, subtractCurrency(totalRequired, totalPaid));

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
          recordToSave = applyLateFeeIfApplicable(student, recordToSave);
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
          recordToSave = applyLateFeeIfApplicable(student, recordToSave);
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

      if (db.isActive()) {
        recordsToSync.forEach(rec => {
          db.savePayment(rec);
        });
      } else if (recordsToSync.length > 0) {
        recordLocallyPendingEdit('payment', 'create', `Logged GHC ${finalAmount.toFixed(2)} payment covering arrears and/or standard fee for pupil: "${student.name}"`);
      }
      logActivity('PAYMENT_RECORDED', 'payments', `Recorded arrears settlement of GHC ${finalAmount.toFixed(2)} for pupil "${student.name}"`, student.id, student.name, finalAmount);
      playFeedbackSound('success');
      checkAndSendCheckInAlert(studentId);
      checkAndSendArrearsAlert(studentId);
    } else {
      // Standard payment override check: replace/delete ALL existing payment records on this date to prioritize the new entry and eliminate duplicates
      const existingMatches = payments.filter(p => p.studentId === studentId && p.date === targetPaymentDate);
      const paymentIdsToDelete: string[] = existingMatches.map(p => p.id);

      const stdNextPayments = payments.filter(p => !(p.studentId === studentId && p.date === targetPaymentDate));
      const canonicalId = `p_${studentId}_${targetPaymentDate}`;
      
      let recordToSave: PaymentRecord = {
        id: canonicalId,
        studentId: student.id,
        studentName: student.name,
        class: student.class,
        category: student.category,
        amount: finalAmount,
        date: targetPaymentDate,
        timestamp: new Date().toISOString(),
        collectedBy: currentUser ? currentUser.name : 'System Host',
        verified,
        isAbsent: false,
        notes: customNotes !== undefined ? customNotes : (customAmount !== undefined ? `Custom amount GHC ${finalAmount.toFixed(2)} processed` : (discountAmount > 0 ? `Applied dynamic discount of GHC ${discountAmount.toFixed(2)}` : undefined))
      };
      recordToSave = applyLateFeeIfApplicable(student, recordToSave);
      stdNextPayments.push(recordToSave);

      setPayments(stdNextPayments);
      saveState(users, students, stdNextPayments);
      if (db.isActive()) {
        paymentIdsToDelete.forEach(id => {
          if (id !== canonicalId) db.deletePayment(id);
        });
        db.savePayment(recordToSave);
      } else {
        recordLocallyPendingEdit('payment', 'create', `Logged GHC ${finalAmount.toFixed(2)} payment for pupil: "${student.name}"${discountAmount > 0 && customAmount === undefined ? ` (GHC ${discountAmount.toFixed(2)} Discount applied)` : ''}`);
      }
      logActivity('PAYMENT_RECORDED', 'payments', `Recorded fee payment of GHC ${finalAmount.toFixed(2)} for pupil "${student.name}"`, student.id, student.name, finalAmount);
      playFeedbackSound('success');
      checkAndSendCheckInAlert(studentId);
      checkAndSendArrearsAlert(studentId);
    }
  };

  const recordMomoPayment = (
    studentId: string,
    amount: number,
    transactionId: string,
    provider: string,
    phoneNumber: string,
    status: 'pending' | 'successful' | 'failed' | 'refunded',
    notes?: string,
    customDate?: string
  ) => {
    if (viewingTermId) {
      playFeedbackSound('error');
      console.warn("Write operations are disabled while viewing historical archives.");
      return;
    }
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const dateToUse = customDate || currentDate;

    const recordToSave: PaymentRecord = {
      id: `p_${studentId}_${dateToUse}_momo_${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      class: student.class,
      category: student.category,
      amount,
      date: dateToUse,
      timestamp: new Date().toISOString(),
      collectedBy: currentUser ? currentUser.name : 'System Host',
      verified: status === 'successful',
      isAbsent: false,
      notes: notes || `MOMO Pay: GHC ${amount.toFixed(2)} [Ref: ${transactionId}]`,
      paymentMethod: 'Mobile Money',
      momoTransactionId: transactionId,
      momoStatus: status,
      momoProvider: provider,
      momoPhoneNumber: phoneNumber
    };

    const nextPayments = [...payments, recordToSave];
    setPayments(nextPayments);
    saveState(users, students, nextPayments);

    if (db.isActive()) {
      db.savePayment(recordToSave);
    } else {
      recordLocallyPendingEdit('payment', 'create', `Simulated Mobile Money Payment of GHC ${amount.toFixed(2)} for ${student.name}`);
    }

    if (status === 'successful') {
      playFeedbackSound('success');
      checkAndSendCheckInAlert(studentId);
    }
  };

  const recordAbsent = (studentId: string) => {
    if (viewingTermId) {
      playFeedbackSound('error');
      console.warn("Write operations are disabled while viewing historical archives.");
      return;
    }
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const existingMatches = payments.filter(p => p.studentId === studentId && p.date === currentDate);
    const idsToDelete = existingMatches.map(p => p.id);
    let nextPayments = payments.filter(p => !(p.studentId === studentId && p.date === currentDate));
    const canonicalId = `p_${studentId}_${currentDate}`;

    const recordToSave: PaymentRecord = {
      id: canonicalId,
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

    setPayments(nextPayments);
    saveState(users, students, nextPayments);
    if (db.isActive()) {
      idsToDelete.forEach(id => {
        if (id !== canonicalId) db.deletePayment(id);
      });
      db.savePayment(recordToSave);
    } else {
      recordLocallyPendingEdit('payment', 'create', `Marked pupil: "${student?.name || 'Pupil'}" as Absent`);
    }
  };

  const recordAdvancePayment = (studentId: string, amount: number, verified = true) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    // If student is term payer, standard advance payment redirects to recordPayment
    if (isTermPayer(student)) {
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
    // grab remaining available days strictly within the active term's schoolDays.
    // NOTE: We do NOT generate auxiliary out-of-term days (like September) beyond the term's end date.
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

    if (db.isActive()) {
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
    if (viewingTermId) {
      playFeedbackSound('error');
      console.warn("Write operations are disabled while viewing historical archives.");
      return;
    }

    // Strict Public Holiday & Vacation Guard: Gate check-ins and fee collections are disabled on public holidays or vacation breaks
    const isPublicHoliday = activeTerm?.publicHolidays?.includes(currentDate);
    const isInVacationBreak = isDateInTermGap(currentDate, terms);
    if (isPublicHoliday || isInVacationBreak) {
      playFeedbackSound('error');
      console.warn(`Bulk check-in / fee collection rejected on ${currentDate}: Today is a declared holiday / vacation break.`);
      alert(`Bulk Check-in Rejected:\n\nDate ${currentDate} is a Vacation / Holiday Break. Pupils are exempt from fees during vacation breaks.`);
      return;
    }

    let nextPayments = [...payments];
    const recordsToSync: PaymentRecord[] = [];
    const paymentIdsToDelete: string[] = [];

    studentIds.forEach(id => {
      const student = students.find(s => s.id === id);
      if (!student) return;

      const existingMatches = nextPayments.filter(p => p.studentId === id && p.date === currentDate);
      existingMatches.forEach(p => paymentIdsToDelete.push(p.id));
      nextPayments = nextPayments.filter(p => !(p.studentId === id && p.date === currentDate));

      const discountAmount = student.discount || 0;
      const baseDailyFee = systemSettings?.baselineDailyFee ?? 5.00;
      const finalAmount = customAmount !== undefined ? customAmount : Math.max(0, baseDailyFee - discountAmount);
      
      const targetId = `p_${id}_${currentDate}`;
      let record: PaymentRecord = {
        id: targetId,
        studentId: id,
        studentName: student.name,
        class: student.class,
        category: student.category,
        amount: finalAmount,
        date: currentDate,
        timestamp: new Date().toISOString(),
        collectedBy: currentUser ? currentUser.name : 'System Host',
        verified,
        notes: customAmount !== undefined 
          ? `Bulk payment GHC ${customAmount.toFixed(2)}` 
          : (discountAmount > 0 ? `Applied dynamic discount of GHC ${discountAmount.toFixed(2)}` : undefined)
      };
      record = applyLateFeeIfApplicable(student, record);

      const delIdx = paymentIdsToDelete.indexOf(targetId);
      if (delIdx > -1) paymentIdsToDelete.splice(delIdx, 1);

      nextPayments.push(record);
      recordsToSync.push(record);
    });

    setPayments(nextPayments);
    saveState(users, students, nextPayments);

    if (db.isActive()) {
      if (paymentIdsToDelete.length > 0) {
        paymentIdsToDelete.forEach(pId => db.deletePayment(pId));
      }
      if (recordsToSync.length > 0) {
        db.savePayments(recordsToSync);
      }
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

    const existingMatches = payments.filter(p => p.studentId === studentId && p.date === currentDate);
    const idsToDelete = existingMatches.map(p => p.id);
    let nextPayments = payments.filter(p => !(p.studentId === studentId && p.date === currentDate));
    const targetId = `p_${studentId}_${currentDate}`;

    let recordToSave: PaymentRecord = {
      id: targetId,
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
    recordToSave = applyLateFeeIfApplicable(student, recordToSave);
    nextPayments.push(recordToSave);

    setPayments(nextPayments);
    saveState(users, students, nextPayments);
    if (db.isActive()) {
      idsToDelete.forEach(id => {
        if (id !== targetId) db.deletePayment(id);
      });
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
      // Find ALL existing matching payment records on this date to override/purge them cleanly
      const existingMatches = nextPayments.filter(p => p.studentId === studentId && p.date === dayStr);
      existingMatches.forEach(p => {
        paymentIdsToDelete.push(p.id);
      });
      // Remove all existing records on this date from the state list
      nextPayments = nextPayments.filter(p => !(p.studentId === studentId && p.date === dayStr));

      if (actionType !== 'clear') {
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

        const targetId = `p_${studentId}_${dayStr}`;
        const record: PaymentRecord = {
          id: targetId,
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
        // Remove targetId from deletion list so we update it in place rather than deleting
        const delIdx = paymentIdsToDelete.indexOf(targetId);
        if (delIdx > -1) paymentIdsToDelete.splice(delIdx, 1);

        nextPayments.push(record);
        recordsToSync.push(record);
      }
    });

    setPayments(nextPayments);
    saveState(users, students, nextPayments);

    if (db.isActive()) {
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
    if (db.isActive() && recordToSync) {
      db.savePayment(recordToSync);
    } else if (recordToSync) {
      recordLocallyPendingEdit('payment', 'update', `Verified payment registration for: "${(recordToSync as PaymentRecord).studentName}"`);
    }
  };

  const deletePayment = (paymentId: string) => {
    const targetP = payments.find(p => p.id === paymentId);
    if (!targetP) return;

    let clearedDatesToDelete: string[] = targetP.clearedDates || [];
    const markerIds = clearedDatesToDelete.map(dStr => `p_${targetP.studentId}_${dStr}`);
    registerDeletedIds([paymentId, ...markerIds]);

    const relatedMarkers = payments.filter(p => p.studentId === targetP.studentId && p.amount === 0 && clearedDatesToDelete.includes(p.date));

    // Move record to Trash collection (Soft Delete)
    moveToTrash(
      'payment',
      paymentId,
      { payment: targetP, relatedMarkers },
      `Voided fee payment transaction of GHC ${(targetP.amount || 0).toFixed(2)} for pupil "${targetP.studentName || 'Pupil'}"`,
      {
        studentId: targetP.studentId,
        studentName: targetP.studentName,
        amount: targetP.amount,
        class: targetP.class
      }
    );

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
    logActivity(
      'PAYMENT_DELETED',
      'payments',
      `Voided fee payment transaction of GHC ${(targetP.amount || 0).toFixed(2)} for pupil "${targetP.studentName || 'Pupil'}"`,
      targetP.studentId,
      targetP.studentName,
      targetP.amount,
      {
        type: 'payment',
        payment: targetP,
        relatedMarkers
      }
    );
  };

  const deleteStudentPayments = (studentId: string) => {
    const deletedStudentPayments = payments.filter(p => p.studentId === studentId);
    if (deletedStudentPayments.length === 0) return;

    const targetS = students.find(s => s.id === studentId);
    registerDeletedIds(deletedStudentPayments.map(p => p.id));

    moveToTrash(
      'bulk_payments',
      `student_payments_${studentId}_${Date.now()}`,
      deletedStudentPayments,
      `Voided all ${deletedStudentPayments.length} payment transaction records for pupil "${targetS?.name || 'Pupil'}"`,
      {
        studentId,
        studentName: targetS?.name,
        itemCount: deletedStudentPayments.length,
        class: targetS?.class
      }
    );

    const nextPayments = payments.filter(p => p.studentId !== studentId);
    setPayments(nextPayments);
    saveState(users, students, nextPayments);
    if (db.isActive()) {
      db.deleteStudentPayments(studentId);
    }
    if (storageMode !== 'cloud') {
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

    registerDeletedIds([...paymentIdsToDelete, ...allMarkerIdsToDelete]);

    moveToTrash(
      'bulk_payments',
      `class_clear_${classId}_${dateStr}`,
      paymentsToDelete,
      `Cleared all ${paymentsToDelete.length} daily payment records for class ${classId} on ${dateStr}`,
      {
        itemCount: paymentsToDelete.length,
        class: classId
      }
    );

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

  const deleteClassFeeRecords = (options: DeleteClassFeesOptions): DeleteClassFeesResult => {
    const { targetClass, scope, selectedWeeks, startDate, endDate, feeCategory = 'daily_only', studentIds } = options;

    // 1. Identify target students in this class
    const targetStudentMap = new Map<string, Student>();
    students.forEach(s => {
      if (targetClass === 'ALL' || s.class === targetClass) {
        if (!studentIds || studentIds.length === 0 || studentIds.includes(s.id)) {
          targetStudentMap.set(s.id, s);
        }
      }
    });

    const targetStudentIdsSet = new Set(targetStudentMap.keys());

    // 2. Compute date filter logic and date summary
    let targetDatesSet: Set<string> | null = null;
    let dateSummary = 'All Dates';

    if (scope === 'full_term') {
      if (activeTerm) {
        const termStart = activeTerm.startDate;
        const termDays = activeTerm.schoolDays || [];
        const termEnd = termDays.length > 0 ? termDays[termDays.length - 1] : (activeTerm.endDate || '2099-12-31');
        dateSummary = `${activeTerm.name} (Week 1 to Final Week: ${termStart} to ${termEnd})`;
        targetDatesSet = new Set(termDays.length > 0 ? termDays : []);
      } else {
        dateSummary = 'All Active Term Dates';
      }
    } else if (scope === 'specific_weeks') {
      if (activeTerm && activeTerm.schoolDays && activeTerm.schoolDays.length > 0 && selectedWeeks && selectedWeeks.length > 0) {
        const matchingDays: string[] = [];
        selectedWeeks.forEach(w => {
          const startIdx = (w - 1) * 5;
          const endIdx = startIdx + 5;
          const weekDays = activeTerm.schoolDays.slice(startIdx, endIdx);
          matchingDays.push(...weekDays);
        });
        targetDatesSet = new Set(matchingDays);
        dateSummary = `Weeks ${[...selectedWeeks].sort((a, b) => a - b).join(', ')} (${matchingDays[0] || 'Start'} to ${matchingDays[matchingDays.length - 1] || 'End'})`;
      } else {
        dateSummary = 'Selected Term Weeks';
      }
    } else if (scope === 'custom_range') {
      const s = startDate || '1970-01-01';
      const e = endDate || '2099-12-31';
      dateSummary = `Custom Date Range: ${s} to ${e}`;
    } else {
      dateSummary = 'All Historical Dates (Full Time)';
    }

    const isDateMatch = (dStr: string): boolean => {
      if (scope === 'all_time') return true;
      if (scope === 'custom_range') {
        const s = startDate || '1970-01-01';
        const e = endDate || '2099-12-31';
        return dStr >= s && dStr <= e;
      }
      if (scope === 'full_term' && activeTerm) {
        const termStart = activeTerm.startDate;
        const termDays = activeTerm.schoolDays || [];
        const termEnd = termDays.length > 0 ? termDays[termDays.length - 1] : (activeTerm.endDate || '2099-12-31');
        if (targetDatesSet && targetDatesSet.size > 0) {
          return targetDatesSet.has(dStr) || (dStr >= termStart && dStr <= termEnd);
        }
        return dStr >= termStart && dStr <= termEnd;
      }
      if (targetDatesSet) {
        return targetDatesSet.has(dStr);
      }
      return true;
    };

    // 3. Find matching daily payments to delete
    const dailyPaymentsToDelete: PaymentRecord[] = [];
    const dailyMarkerIdsToDelete: string[] = [];
    let totalDailyAmount = 0;

    if (feeCategory === 'daily_only' || feeCategory === 'both') {
      payments.forEach(p => {
        const matchesClass = targetClass === 'ALL' || p.class === targetClass || targetStudentIdsSet.has(p.studentId);
        if (matchesClass && targetStudentIdsSet.has(p.studentId) && isDateMatch(p.date)) {
          dailyPaymentsToDelete.push(p);
          totalDailyAmount += (p.amount || 0);
          if (p.clearedDates && p.clearedDates.length > 0) {
            p.clearedDates.forEach(dStr => {
              dailyMarkerIdsToDelete.push(`p_${p.studentId}_${dStr}`);
            });
          }
        }
      });
    }

    // 4. Find matching exams payments to delete (if applicable)
    const examsPaymentsToDelete: ExamsPayment[] = [];
    let totalExamsAmount = 0;

    if (feeCategory === 'exams_only' || feeCategory === 'both') {
      examsPayments.forEach(ep => {
        const matchesClass = targetClass === 'ALL' || ep.class === targetClass || targetStudentIdsSet.has(ep.studentId);
        const matchesTerm = !activeTerm || !ep.termId || ep.termId === activeTerm.id;
        if (matchesClass && targetStudentIdsSet.has(ep.studentId) && (scope === 'all_time' || matchesTerm || isDateMatch(ep.datePaid))) {
          examsPaymentsToDelete.push(ep);
          totalExamsAmount += (ep.amountPaid || 0);
        }
      });
    }

    const totalRecordsToDelete = dailyPaymentsToDelete.length + examsPaymentsToDelete.length;
    const totalAmountCleared = totalDailyAmount + totalExamsAmount;

    const classLabel = targetClass === 'ALL' ? 'All Classes' : `Class ${targetClass}`;

    if (totalRecordsToDelete === 0) {
      return {
        success: false,
        deletedDailyPaymentsCount: 0,
        deletedExamsPaymentsCount: 0,
        totalAmountCleared: 0,
        affectedStudentsCount: 0,
        targetClass: classLabel,
        dateSummary,
        message: `No fee payment records found matching the criteria for ${classLabel} (${dateSummary}).`
      };
    }

    // 5. Create automatic snapshot backup before purge
    const backupLabel = `Pre-Clear ${classLabel} Fee Records (${dateSummary.slice(0, 35)})`;
    createBackup(backupLabel, true);

    // 6. Save deleted records to Trash Bin for 1-click restore capability
    const affectedPupilNames = Array.from(new Set([
      ...dailyPaymentsToDelete.map(p => p.studentName || 'Pupil'),
      ...examsPaymentsToDelete.map(ep => ep.studentName || 'Pupil')
    ]));

    moveToTrash(
      'bulk_payments',
      `class_fee_clear_${targetClass}_${Date.now()}`,
      {
        dailyPayments: dailyPaymentsToDelete,
        examsPayments: examsPaymentsToDelete
      },
      `Cleared ${dailyPaymentsToDelete.length} daily fee & ${examsPaymentsToDelete.length} exams fee records for ${classLabel} [${dateSummary}] (Total GHC ${totalAmountCleared.toFixed(2)})`,
      {
        class: targetClass,
        amount: totalAmountCleared,
        itemCount: totalRecordsToDelete
      }
    );

    // 7. Register all deleted IDs to prevent synchronization resurrecting them
    const dailyIdsToDelete = dailyPaymentsToDelete.map(p => p.id);
    const allIdsToRegister = [...dailyIdsToDelete, ...dailyMarkerIdsToDelete];
    registerDeletedIds(allIdsToRegister);

    // 8. Update payments state and persistence
    const dailyIdsSet = new Set(dailyIdsToDelete);
    const nextPayments = payments.filter(p => !dailyIdsSet.has(p.id));
    setPayments(nextPayments);
    idbEngine.setItem('s_payments', nextPayments);

    // 9. Update exams payments state if any deleted
    let nextExamsPayments = examsPayments;
    if (examsPaymentsToDelete.length > 0) {
      const examIdsSet = new Set(examsPaymentsToDelete.map(ep => ep.id));
      nextExamsPayments = examsPayments.filter(ep => !examIdsSet.has(ep.id));
      setExamsPayments(nextExamsPayments);
      idbEngine.setItem('s_exams_payments', nextExamsPayments);
    }

    saveState(users, students, nextPayments);

    // 10. Propagate deletion to server & Cloud Firestore via batch endpoint
    if (dailyIdsToDelete.length > 0) {
      if ((rawDb as any).deletePaymentsBatch) {
        (rawDb as any).deletePaymentsBatch(dailyIdsToDelete);
      } else if (db.isActive()) {
        dailyIdsToDelete.forEach(id => db.deletePayment(id));
      }
      if (dailyMarkerIdsToDelete.length > 0 && db.isActive()) {
        dailyMarkerIdsToDelete.forEach(mId => db.deletePayment(mId));
      }
    }

    if (examsPaymentsToDelete.length > 0 && db.isActive()) {
      examsPaymentsToDelete.forEach(ep => {
        if ((db as any).deleteExamsPayment) (db as any).deleteExamsPayment(ep.id);
      });
    }

    if (storageMode !== 'cloud') {
      recordLocallyPendingEdit(
        'bulk',
        'delete',
        `Deleted ${dailyPaymentsToDelete.length} daily fee records and ${examsPaymentsToDelete.length} exams payments for ${classLabel} (${dateSummary})`
      );
    }

    const resultMsg = `Successfully deleted ${dailyPaymentsToDelete.length} daily fee payment record(s)${examsPaymentsToDelete.length > 0 ? ` and ${examsPaymentsToDelete.length} exams payment record(s)` : ''} totaling GHC ${totalAmountCleared.toFixed(2)} for ${classLabel} across ${dateSummary}. Affected ${affectedPupilNames.length} pupils.`;

    logActivity('payments', 'payments', resultMsg, undefined, classLabel, totalAmountCleared);

    return {
      success: true,
      deletedDailyPaymentsCount: dailyPaymentsToDelete.length,
      deletedExamsPaymentsCount: examsPaymentsToDelete.length,
      totalAmountCleared,
      affectedStudentsCount: affectedPupilNames.length,
      targetClass: classLabel,
      dateSummary,
      message: resultMsg
    };
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
    
    if (db.isActive() && recordToSync) {
      db.savePayment(recordToSync);
    } else if (recordToSync) {
      recordLocallyPendingEdit('payment', 'update', `Adjusted past payment for pupil: "${(recordToSync as PaymentRecord).studentName}"`);
    }

    if (recordToSync) {
      const rec = recordToSync as PaymentRecord;
      logActivity(
        'PAYMENT_ADJUSTED',
        'payments',
        `Adjusted past payment for pupil "${rec.studentName}" on ${rec.date} from GHC ${rec.amount} to GHC ${updatedAmount}. Reason: ${reason}`,
        rec.studentId,
        rec.studentName,
        updatedAmount
      );
    }
  };

  const seedFirebaseFromLocal = async (
    customUsers?: UserAccount[],
    customStudents?: Student[],
    customPayments?: PaymentRecord[],
    customTerms?: Term[]
  ) => {
    if (!db.isActive()) {
      return { success: false, message: 'Cloud database configuration is missing!' };
    }
    try {
      const uToSeed = customUsers || users;
      const sToSeed = customStudents || students;
      const pToSeed = customPayments || payments;
      const tToSeed = customTerms || terms;

      const payload = {
        users: uToSeed,
        students: sToSeed,
        payments: pToSeed,
        terms: tToSeed,
        expenses,
        salaries,
        examsPayments,
        examsExpenses,
        examsSettings,
        budgetTargets,
        whatsappLogs,
        teacherEvaluations,
        journalEntries,
        systemSettings
      };

      const success = await db.seedTables(payload);
      if (success) {
        setFirebaseConnected(true);
        clearPendingLocalEdits();
        return { success: true, message: `Successfully synced ${sToSeed.length} pupils and ${pToSeed.length} payment records to Cloud Firestore!` };
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
    const targetExamsPayments = examsPayments.filter(p => p.datePaid === dateStr);
    const activeStudents = students.filter(s => s.active);

    const paidCount = targetDatePayments.filter(p => !p.isAbsent).length;
    const absentCount = targetDatePayments.filter(p => p.isAbsent).length;
    const pendingCount = Math.max(0, activeStudents.length - paidCount - absentCount);

    const totalFeesCollected = targetDatePayments.reduce((acc, p) => acc + ((p.verified && !p.isAbsent) ? p.amount : 0), 0);
    const totalExamsCollected = targetExamsPayments.reduce((acc, p) => acc + p.amountPaid, 0);
    const totalCollected = totalFeesCollected + totalExamsCollected;

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

    targetExamsPayments.forEach(p => {
      byCategory[p.category] = (byCategory[p.category] || 0) + p.amountPaid;
      byClass[p.class] = (byClass[p.class] || 0) + p.amountPaid;
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
    const datesList: string[] = [...payments.map(p => p.date), ...examsPayments.map(p => p.datePaid)];
    const uniqueDates: string[] = Array.from(new Set(datesList)).filter(Boolean).sort();
    
    // Fallback if empty
    if (uniqueDates.length === 0) {
      return [{ date: currentDate, formattedDate: 'Today', amount: 0, transactions: 0 }];
    }

    return uniqueDates.map((dateStr: string) => {
      const datePayments = payments.filter(p => p.date === dateStr && p.verified);
      const dateExamsPayments = examsPayments.filter(p => p.datePaid === dateStr);
      const parts = dateStr.split('-');
      const formattedDate = parts[2] ? `${parts[2]}/${parts[1]}` : dateStr;
      const totalAmount = datePayments.reduce((acc, p) => acc + p.amount, 0) + dateExamsPayments.reduce((acc, p) => acc + p.amountPaid, 0);

      return {
        date: dateStr,
        formattedDate,
        amount: totalAmount,
        transactions: datePayments.length + dateExamsPayments.length
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
    const preSchoolTot = payments.filter(p => p.verified && !p.isAbsent && p.category === 'Pre-school' && p.amount > 0).reduce((s, p) => s + p.amount, 0);
    const primaryTot = payments.filter(p => p.verified && !p.isAbsent && p.category === 'Primary' && p.amount > 0).reduce((s, p) => s + p.amount, 0);
    const jhsTot = payments.filter(p => p.verified && !p.isAbsent && p.category === 'JHS' && p.amount > 0).reduce((s, p) => s + p.amount, 0);

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
    const healed = healTerms(newTerms);
    setTerms(healed);
    idbEngine.setItem('s_terms', healed);
    if (db.isActive()) {
      db.saveTerms(healed);
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

  const completeTerm = (termId: string, isCompleted = true) => {
    const nextTerms = terms.map(t => {
      if (t.id === termId) {
        return {
          ...t,
          isCompleted
        };
      }
      return t;
    });
    saveTerms(nextTerms);
    const targetName = terms.find(t => t.id === termId)?.name || 'Term';
    recordLocallyPendingEdit('term', 'update', `${isCompleted ? 'Closed gate / Completed' : 'Reopened'} school term: "${targetName}"`);
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
    if (db.isActive()) {
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

    // Automatically purge all payments & attendance records on this holiday date so pupils pay GHC 0.00
    const holidayPayments = payments.filter(p => p.date === date);
    if (holidayPayments.length > 0) {
      holidayPayments.forEach(hp => {
        if (db.isActive()) db.deletePayment(hp.id);
      });
      const cleanedPayments = payments.filter(p => p.date !== date);
      setPayments(cleanedPayments);
      idbEngine.setItem('s_payments', cleanedPayments);
    }

    recordLocallyPendingEdit('term', 'update', `Added public holiday on ${date} (cleared ${holidayPayments.length} holiday payment/attendance entries)`);
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
    idbEngine.removeItem('s_users');
    idbEngine.removeItem('s_students');
    idbEngine.removeItem('s_payments');
    idbEngine.removeItem('s_terms');
    setUsers(INITIAL_USERS);
    setStudents(INITIAL_STUDENTS);
    const seedPays = generateSeedPayments();
    setPayments(seedPays);

    idbEngine.setItem('s_users', INITIAL_USERS);
    idbEngine.setItem('s_students', INITIAL_STUDENTS);
    idbEngine.setItem('s_payments', seedPays);
    
    const initialTerms = [{
      id: 'term_default',
      name: 'Term 3 (April - July 2026)',
      startDate: '2026-04-27',
      daysCount: 68,
      schoolDays: generateSchoolDays('2026-04-27', 68),
      publicHolidays: ['2026-05-01', '2026-05-25', '2026-07-01'],
      active: true
    }];
    setTerms(initialTerms);
    idbEngine.setItem('s_terms', initialTerms);

    updateSystemSettings({ disableDemoData: false });

    if (db.isActive()) {
      db.seedTables(INITIAL_USERS, INITIAL_STUDENTS, seedPays, initialTerms).catch(err => {
        console.error("Failed to seed fallback data on backend server:", err);
      });
    }
  };

  const clearSampleStudents = () => {
    setStudents([]);
    setPayments([]);
    idbEngine.setItem('s_students', []);
    idbEngine.setItem('s_payments', []);
    
    saveState(users, [], []);
    updateSystemSettings({ disableDemoData: true });
    
    // Always update database tables on backend (db.json & Firestore) keeping staff users intact
    if (db.isActive()) {
      db.seedTables(users, [], []).catch(err => {
        console.error("Failed to seed empty tables on backend server:", err);
      });
    }

    logActivity('students', 'students', 'Wiped all student records and transaction history to start clean.');
  };

  const purgeOnlyDemoData = async (): Promise<{ success: boolean; message: string }> => {
    const demoStudentIds = new Set(ORIGINAL_DEMO_STUDENT_IDS);
    const demoUserIds = new Set(['accountant-1']);

    // Filter out demo student IDs (s1..s27) and generated simulation IDs starting with 'student_'
    const nextStudents = students.filter(s => !demoStudentIds.has(s.id) && !s.id.startsWith('student_'));
    const nextStudentIds = new Set(nextStudents.map(s => s.id));
    const nextPayments = payments.filter(p => nextStudentIds.has(p.studentId));
    const nextUsers = users.filter(u => !demoUserIds.has(u.id));

    const purgedCount = students.length - nextStudents.length;

    setStudents(nextStudents);
    setPayments(nextPayments);
    setUsers(nextUsers);

    idbEngine.setItem('s_students', nextStudents);
    idbEngine.setItem('s_payments', nextPayments);
    idbEngine.setItem('s_users', nextUsers);
    saveState(nextUsers, nextStudents, nextPayments);

    await updateSystemSettings({ disableDemoData: true });

    if (db.isActive()) {
      db.seedTables(nextUsers, nextStudents, nextPayments).catch(err => {
        console.error("Failed to sync purged tables on backend server:", err);
      });
      try {
        await (db as any).purgeDemoData();
      } catch (err) {
        console.error("Failed to call backend purge-demo API:", err);
      }
    }

    logActivity('students', 'students', `Purged ${purgedCount} demo/compromised student records.`);

    return {
      success: true,
      message: `Cleaned up your registers successfully: Removed ${purgedCount} demo/compromised student record(s) and associated transaction logs. Your register is now ready for clean manual entry.`
    };
  };

  const clearAllPayments = () => {
    const clearedCount = payments.length;
    if (clearedCount > 0) {
      moveToTrash(
        'bulk_payments',
        `clear_all_${Date.now()}`,
        payments,
        `Cleared all ${clearedCount} fee and check-in payment entries while retaining all ${students.length} registered pupils`,
        { itemCount: clearedCount }
      );
    }
    setPayments([]);
    idbEngine.setItem('s_payments', []);
    saveState(users, students, []);
    
    // If backend sync is active, clear payments collection on backend keeping everything else
    if (db.isActive()) {
      db.seedTables(users, students, []).catch(err => {
        console.error("Failed to clear payments table on backend server:", err);
      });
    }

    logActivity('payments', 'payments', `Cleared all ${clearedCount} fee and check-in payment entries while retaining all ${students.length} registered pupils.`);
  };

  const administrativePurge = (options: AdministrativePurgeOptions): AdministrativePurgeResult => {
    let nextPayments = [...payments];
    let nextStudents = [...students];
    let nextExpenses = [...expenses];
    let nextJournals = [...journalEntries];

    let clearedPaymentsCount = 0;
    let clearedAttendanceCount = 0;
    let clearedExamCount = 0;
    let clearedExpensesCount = 0;
    let clearedJournalsCount = 0;
    let purgedDemoStudentsCount = 0;

    // 1. Purge Demo / Simulation Roster Data (if selected)
    if (options.purgeDemoRoster) {
      const demoStudentIds = new Set(ORIGINAL_DEMO_STUDENT_IDS);
      const beforeCount = nextStudents.length;
      nextStudents = nextStudents.filter(s => !demoStudentIds.has(s.id) && !s.id.startsWith('student_'));
      purgedDemoStudentsCount = beforeCount - nextStudents.length;
      const validStudentIds = new Set(nextStudents.map(s => s.id));
      nextPayments = nextPayments.filter(p => validStudentIds.has(p.studentId));
    }

    // 2. Remove Exam Records (Payments & Expenses)
    if (options.removeExamRecords) {
      const initialPaymentsCount = nextPayments.length;
      nextPayments = nextPayments.filter(p => {
        const notes = (p.notes || '').toLowerCase();
        const isExam = notes.includes('exam') || notes.includes('examination') || notes.includes('assessment') || notes.includes('test');
        return !isExam;
      });
      clearedExamCount += (initialPaymentsCount - nextPayments.length);

      const initialExpCount = nextExpenses.length;
      nextExpenses = nextExpenses.filter(e => {
        const desc = (e.description || '').toLowerCase();
        const cat = (e.category || '').toLowerCase();
        const isExam = desc.includes('exam') || desc.includes('examination') || desc.includes('assessment') || desc.includes('test') || cat.includes('exam');
        return !isExam;
      });
      clearedExamCount += (initialExpCount - nextExpenses.length);
    }

    // 3. Reset Attendance Logs (Absent marks & zero-pay check-in entries)
    if (options.resetAttendanceLogs) {
      const initialPaymentsCount = nextPayments.length;
      nextPayments = nextPayments.filter(p => {
        const notes = (p.notes || '').toLowerCase();
        const isAttendanceMarker = p.isAbsent || p.amount === 0 || notes.includes('absent') || notes.includes('zero-pay') || notes.includes('check-in');
        return !isAttendanceMarker;
      });
      clearedAttendanceCount = (initialPaymentsCount - nextPayments.length);
    }

    // 4. Clear All Daily Fee Payments
    if (options.clearDailyPayments) {
      if (options.removeExamRecords) {
        clearedPaymentsCount += nextPayments.length;
        nextPayments = [];
      } else {
        const temp = [...nextPayments];
        nextPayments = [];
        temp.forEach(p => {
          const notes = (p.notes || '').toLowerCase();
          const isExam = notes.includes('exam') || notes.includes('examination') || notes.includes('assessment') || notes.includes('test');
          if (isExam) {
            nextPayments.push(p);
          } else {
            clearedPaymentsCount++;
          }
        });
      }
    }

    // 5. Clear All Operational Expenses
    if (options.clearExpenses) {
      clearedExpensesCount = nextExpenses.length;
      nextExpenses = [];
    }

    // 6. Clear Journal & Ledger Entries
    if (options.clearJournalEntries) {
      clearedJournalsCount = nextJournals.length;
      nextJournals = [];
    }

    // Commit State & Persist
    setPayments(nextPayments);
    idbEngine.setItem('s_payments', nextPayments);

    setStudents(nextStudents);
    idbEngine.setItem('s_students', nextStudents);

    setExpenses(nextExpenses);
    idbEngine.setItem('s_expenses', nextExpenses);

    setJournalEntries(nextJournals);
    idbEngine.setItem('s_journal_entries', nextJournals);

    saveState(users, nextStudents, nextPayments);

    if (db.isActive()) {
      db.seedTables(users, nextStudents, nextPayments).catch(err => {
        console.error("Failed to sync purged tables on backend server:", err);
      });
    }

    const summaryParts: string[] = [];
    if (clearedPaymentsCount > 0) summaryParts.push(`${clearedPaymentsCount} fee payment(s)`);
    if (clearedAttendanceCount > 0) summaryParts.push(`${clearedAttendanceCount} attendance log(s)`);
    if (clearedExamCount > 0) summaryParts.push(`${clearedExamCount} exam record(s)`);
    if (clearedExpensesCount > 0) summaryParts.push(`${clearedExpensesCount} expense entry(ies)`);
    if (clearedJournalsCount > 0) summaryParts.push(`${clearedJournalsCount} journal log(s)`);
    if (purgedDemoStudentsCount > 0) summaryParts.push(`${purgedDemoStudentsCount} demo pupil(s)`);

    const summaryMsg = summaryParts.length > 0
      ? `Administrative Purge Complete: Cleared ${summaryParts.join(', ')}. Master roster of registered pupils remains intact (${nextStudents.length} pupils).`
      : `Administrative Purge: Selected criteria processed. Master roster of registered pupils remains intact (${nextStudents.length} pupils).`;

    logActivity('settings', 'other', summaryMsg);

    return {
      clearedPaymentsCount,
      clearedAttendanceCount,
      clearedExamCount,
      clearedExpensesCount,
      clearedJournalsCount,
      purgedDemoStudentsCount,
      message: summaryMsg
    };
  };

  const getDuplicatePaymentAudit = (): DuplicatePaymentAuditGroup[] => {
    const studentMap = new Map<string, Student>();
    students.forEach(s => studentMap.set(s.id, s));

    const dateMap = new Map<string, PaymentRecord[]>();
    payments.forEach(p => {
      if (!p.studentId || !p.date) return;
      const key = `${p.studentId}_${p.date}`;
      if (!dateMap.has(key)) dateMap.set(key, []);
      dateMap.get(key)!.push(p);
    });

    const auditGroups: DuplicatePaymentAuditGroup[] = [];

    dateMap.forEach((records, key) => {
      if (records.length <= 1) return;

      const [studentId, date] = key.split('_');
      const stud = studentMap.get(studentId);
      const studentName = stud?.name || records[0].studentName || studentId;
      const studentClass = stud?.class || records[0].class || ('Nursery' as StudentClass);

      const hasNonZeroPaid = records.some(r => !r.isAbsent && Number(r.amount || 0) > 0 && r.verified !== false);

      const items: DuplicatePaymentAuditItem[] = [];
      const seenSignatures = new Set<string>();

      records.forEach(r => {
        const amt = Number(r.amount || 0);
        const method = (r.paymentMethod || 'Cash').trim();
        const notes = (r.notes || '').trim();
        const isDebt = (r.id && r.id.endsWith('_debt')) || notes.toLowerCase().includes('debt') || notes.toLowerCase().includes('arrears');
        const isTermPay = (r.id && r.id.includes('term_pay')) || notes.toLowerCase().includes('term fee') || notes.toLowerCase().includes('installment');
        const signature = `${amt}_${method.toLowerCase()}_${notes.toLowerCase()}`;

        let dupType: 'exact_ghost' | 'redundant_zero' | 'legitimate_installment' = 'legitimate_installment';

        if (amt === 0 || r.isAbsent) {
          if (hasNonZeroPaid) {
            dupType = 'redundant_zero';
          } else {
            if (seenSignatures.has('zero_attendance')) {
              dupType = 'redundant_zero';
            } else {
              seenSignatures.add('zero_attendance');
              dupType = 'legitimate_installment';
            }
          }
        } else if (seenSignatures.has(signature)) {
          dupType = 'exact_ghost';
        } else if (!isDebt && !isTermPay && !notes.toLowerCase().includes('momo') && seenSignatures.has(`${amt}_${method.toLowerCase()}`)) {
          dupType = 'exact_ghost';
        } else {
          seenSignatures.add(signature);
          seenSignatures.add(`${amt}_${method.toLowerCase()}`);
          dupType = 'legitimate_installment';
        }

        items.push({
          id: r.id,
          studentId: r.studentId,
          studentName,
          class: studentClass,
          date: r.date,
          amount: amt,
          paymentMethod: r.paymentMethod || 'Cash',
          notes: r.notes || '',
          timestamp: r.timestamp || r.date,
          collectedBy: r.collectedBy || 'Staff',
          verified: r.verified !== false,
          isAbsent: r.isAbsent,
          duplicateType: dupType
        });
      });

      const hasExactGhost = items.some(i => i.duplicateType === 'exact_ghost');
      const hasRedundantZero = items.some(i => i.duplicateType === 'redundant_zero');
      const hasLegitimateInstallment = items.some(i => i.duplicateType === 'legitimate_installment');
      const totalAmount = items.reduce((sum, i) => !i.isAbsent && i.verified ? sum + i.amount : sum, 0);

      auditGroups.push({
        groupKey: key,
        studentId,
        studentName,
        studentClass,
        date,
        records: items,
        hasExactGhost,
        hasRedundantZero,
        hasLegitimateInstallment,
        totalAmount
      });
    });

    auditGroups.sort((a, b) => {
      if ((a.hasExactGhost || a.hasRedundantZero) && !(b.hasExactGhost || b.hasRedundantZero)) return -1;
      if (!(a.hasExactGhost || a.hasRedundantZero) && (b.hasExactGhost || b.hasRedundantZero)) return 1;
      return b.date.localeCompare(a.date);
    });

    return auditGroups;
  };

  const deletePaymentRecord = (paymentId: string): { success: boolean; message: string } => {
    const target = payments.find(p => p.id === paymentId);
    if (!target) {
      return { success: false, message: 'Payment record not found.' };
    }
    registerDeletedIds([paymentId]);
    const nextPayments = payments.filter(p => p.id !== paymentId);
    setPayments(nextPayments);
    saveState(users, students, nextPayments);
    if (db.isActive()) {
      db.deletePayment(paymentId);
    }
    return { success: true, message: `Removed payment entry of GHS ${(target.amount || 0).toFixed(2)} on ${target.date}.` };
  };

  const purgeDuplicatePayments = (options?: {
    onlyExactGhosts?: boolean;
    deleteRedundantZero?: boolean;
    preserveLegitimateInstallments?: boolean;
  }): { count: number; ghostCount: number; redundantZeroCount: number; preservedCount: number; message: string } => {
    createBackup('Pre-Smart Duplicate Payment Purge', true);

    const audit = getDuplicatePaymentAudit();
    const idsToDelete = new Set<string>();
    let ghostCount = 0;
    let redundantZeroCount = 0;
    let preservedCount = 0;

    audit.forEach(group => {
      group.records.forEach(rec => {
        if (rec.duplicateType === 'exact_ghost') {
          idsToDelete.add(rec.id);
          ghostCount++;
        } else if (rec.duplicateType === 'redundant_zero') {
          idsToDelete.add(rec.id);
          redundantZeroCount++;
        } else {
          preservedCount++;
        }
      });
    });

    // Also detect duplicate exams payments (same student, date, term, amount)
    const examsMap = new Map<string, ExamsPayment[]>();
    examsPayments.forEach(ep => {
      const key = `${ep.studentId}_${ep.datePaid}_${ep.termId || 'default'}_${ep.amountPaid}`;
      if (!examsMap.has(key)) examsMap.set(key, []);
      examsMap.get(key)!.push(ep);
    });
    const examIdsToDelete = new Set<string>();
    examsMap.forEach(records => {
      if (records.length > 1) {
        for (let i = 1; i < records.length; i++) {
          examIdsToDelete.add(records[i].id);
        }
      }
    });

    const totalDailyPurged = idsToDelete.size;
    const totalExamPurged = examIdsToDelete.size;
    const totalPurged = totalDailyPurged + totalExamPurged;

    if (totalPurged === 0) {
      return {
        count: 0,
        ghostCount: 0,
        redundantZeroCount: 0,
        preservedCount,
        message: `✅ No duplicate errors found. All ${preservedCount} multi-payment entries represent legitimate receipts matching physical records.`
      };
    }

    if (idsToDelete.size > 0) {
      registerDeletedIds(Array.from(idsToDelete));
      const nextPayments = payments.filter(p => !idsToDelete.has(p.id));
      setPayments(nextPayments);
      saveState(users, students, nextPayments);
      if (db.isActive()) {
        idsToDelete.forEach(id => db.deletePayment(id));
      }
    }

    if (examIdsToDelete.size > 0) {
      const nextExams = examsPayments.filter(ep => !examIdsToDelete.has(ep.id));
      setExamsPayments(nextExams);
      idbEngine.setItem('s_exams_payments', nextExams);
      if (db.isActive() && db.deleteExamsPayment) {
        examIdsToDelete.forEach(id => db.deleteExamsPayment!(id));
      }
    }

    const msg = `✅ Purged ${totalPurged} duplicate record(s) (${ghostCount} ghost sync duplicates, ${redundantZeroCount} redundant 0-markers, ${totalExamPurged} exam duplicates). Preserved ${preservedCount} legitimate installments matching teachers' hard copies.`;
    return {
      count: totalPurged,
      ghostCount,
      redundantZeroCount,
      preservedCount,
      message: msg
    };
  };

  const sanitizeDatabaseIntegrity = (): { orphanedPaymentsCount: number; orphanedExamsCount: number; message: string } => {
    createBackup('Pre-Database Integrity Sanitization', true);

    const validStudentIds = new Set(students.map(s => s.id));

    const orphanedPayments = payments.filter(p => p.studentId && !validStudentIds.has(p.studentId));
    const orphanedExams = examsPayments.filter(ep => ep.studentId && !validStudentIds.has(ep.studentId));

    // Also deduplicate examsPayments by unique ID and unique key
    const seenExams = new Set<string>();
    const duplicateExamIds = new Set<string>();
    examsPayments.forEach(ep => {
      const key = `${ep.studentId}_${ep.datePaid}_${ep.termId || 'default'}_${ep.amountPaid}`;
      if (seenExams.has(key) || seenExams.has(ep.id)) {
        duplicateExamIds.add(ep.id);
      } else {
        seenExams.add(key);
        seenExams.add(ep.id);
      }
    });

    if (orphanedPayments.length === 0 && orphanedExams.length === 0 && duplicateExamIds.size === 0) {
      return {
        orphanedPaymentsCount: 0,
        orphanedExamsCount: 0,
        message: "Database Integrity Verified: No orphaned financial or duplicate exam records found."
      };
    }

    const nextPayments = payments.filter(p => !p.studentId || validStudentIds.has(p.studentId));
    const nextExamsPayments = examsPayments.filter(ep => (!ep.studentId || validStudentIds.has(ep.studentId)) && !duplicateExamIds.has(ep.id));

    setPayments(nextPayments);
    setExamsPayments(nextExamsPayments);

    idbEngine.setItem('s_payments', nextPayments);
    idbEngine.setItem('s_exams_payments', nextExamsPayments);

    saveState(users, students, nextPayments);

    if (db.isActive()) {
      orphanedPayments.forEach(p => db.deletePayment(p.id));
      orphanedExams.forEach(ep => db.deleteExamsPayment(ep.id));
      if (db.deleteExamsPayment) {
        duplicateExamIds.forEach(id => db.deleteExamsPayment!(id));
      }
    }

    const msg = `Database Integrity Sanitized: Removed ${orphanedPayments.length} orphaned payment(s), ${orphanedExams.length} orphaned exam(s), and ${duplicateExamIds.size} duplicate exam payment(s). System backup saved automatically.`;
    
    logActivity('DATABASE_SANITIZED', 'other', msg);

    return {
      orphanedPaymentsCount: orphanedPayments.length,
      orphanedExamsCount: orphanedExams.length,
      message: msg
    };
  };

  const carryForwardTermBalances = (options?: { resetPaymentsForNewTerm?: boolean }): { updatedStudentsCount: number; totalCarriedDebt: number; message: string } => {
    createBackup('Pre-Term Carry Forward Transition', true);

    let updatedStudentsCount = 0;
    let totalCarriedDebt = 0;

    const nextStudents = students.map(s => {
      const discountInfo = getDiscountedTermFee(s, payments, activeTerm, currentDate, systemSettings);
      const termFee = s.termFee || discountInfo.termFee;
      const currentLegacy = s.legacyDebt || 0;
      
      const totalPaid = payments
        .filter(p => p.studentId === s.id && !p.isAbsent && p.verified !== false && p.amount > 0)
        .reduce((sum, p) => sum + p.amount, 0);

      const totalTarget = termFee + currentLegacy;
      const unpaidBalance = Math.max(0, Math.round((totalTarget - totalPaid) * 100) / 100);

      if (unpaidBalance !== currentLegacy) {
        updatedStudentsCount++;
      }
      totalCarriedDebt += unpaidBalance;

      const updatedStudent: Student = {
        ...s,
        legacyDebt: unpaidBalance,
        updatedAt: new Date().toISOString()
      };

      if (db.isActive()) {
        db.saveStudent(updatedStudent);
      }

      return updatedStudent;
    });

    setStudents(nextStudents);
    idbEngine.setItem('s_students', nextStudents);
    saveState(users, nextStudents, payments);

    let extraMsg = '';
    if (options?.resetPaymentsForNewTerm) {
      const emptyPayments: PaymentRecord[] = [];
      setPayments(emptyPayments);
      idbEngine.setItem('s_payments', emptyPayments);
      saveState(users, nextStudents, emptyPayments);
      extraMsg = ' Payment logs cleared for the new academic term.';
    }

    const msg = `Automated Term Carry-Forward Complete: Processed ${updatedStudentsCount} pupil balance(s). Carried forward GHC ${totalCarriedDebt.toFixed(2)} total debt across all cohorts.${extraMsg}`;

    logActivity(
      'STUDENTS_MERGED',
      'students',
      msg
    );

    return {
      updatedStudentsCount,
      totalCarriedDebt,
      message: msg
    };
  };

  const purgeAdvancePayments = (studentIdFilter?: string): { count: number; message: string } => {
    const isAdvanceRecord = (p: PaymentRecord) => {
      if (studentIdFilter && p.studentId !== studentIdFilter) return false;
      const n = (p.notes || '').toLowerCase();
      const isAdvNote = 
        n.includes('advance') || 
        n.includes('prepaid') || 
        n.includes('covered (prepaid') || 
        n.includes('block prepaid') || 
        n.includes('top-up added');
      
      const isZeroMarker = p.amount === 0 && (n.includes('covered') || n.includes('prepaid') || n.includes('advance'));
      return isAdvNote || isZeroMarker;
    };

    const toDelete = payments.filter(isAdvanceRecord);
    if (toDelete.length === 0) {
      return { count: 0, message: "No advance or prepaid payment records found." };
    }

    const idsToDelete = new Set<string>(toDelete.map(p => p.id));
    registerDeletedIds(Array.from(idsToDelete));
    const nextPayments = payments.filter(p => !idsToDelete.has(p.id));

    setPayments(nextPayments);
    saveState(users, students, nextPayments);

    if (db.isActive()) {
      idsToDelete.forEach((id: string) => db.deletePayment(id));
    }

    const msg = `Successfully purged ${toDelete.length} advance/prepaid payment record(s).`;
    return { count: toDelete.length, message: msg };
  };

  const purgeOutOfTermPayments = (studentIdFilter?: string): { count: number; message: string } => {
    return purgeClassOutOfTermAndDuplicates(undefined);
  };

  const purgeClassOutOfTermAndDuplicates = (targetClass?: StudentClass): { count: number; message: string } => {
    if (!activeTerm || !activeTerm.schoolDays || activeTerm.schoolDays.length === 0) {
      return { count: 0, message: "No active term found to establish term boundaries." };
    }

    const termSchoolDays = activeTerm.schoolDays;
    const lastTermDay = termSchoolDays[termSchoolDays.length - 1];
    const maxTermDays = termSchoolDays.length; // Max days in active term
    const allTermSchoolDays = new Set(terms.flatMap(t => t.schoolDays || []));
    const publicHolidays = new Set(activeTerm.publicHolidays || []);

    const targetStudentIds = targetClass 
      ? new Set(students.filter(s => s.class === targetClass).map(s => s.id))
      : null;

    const idsToDelete = new Set<string>();
    const studentPaymentsMap = new Map<string, PaymentRecord[]>();

    payments.forEach(p => {
      if (targetStudentIds && !targetStudentIds.has(p.studentId)) return;

      // 1. Check out-of-term date (> lastTermDay or outside any term calendar after startDate or on public holiday)
      if (p.date > lastTermDay || (!allTermSchoolDays.has(p.date) && p.date > activeTerm.startDate) || publicHolidays.has(p.date)) {
        idsToDelete.add(p.id);
        return;
      }

      if (!studentPaymentsMap.has(p.studentId)) {
        studentPaymentsMap.set(p.studentId, []);
      }
      studentPaymentsMap.get(p.studentId)!.push(p);
    });

    // 2. Duplicate check per student per date & cap at maxTermDays
    studentPaymentsMap.forEach((pList) => {
      pList.sort((a, b) => (a.date + (a.timestamp || '')).localeCompare(b.date + (b.timestamp || '')));

      const seenDates = new Set<string>();
      const validRecords: PaymentRecord[] = [];

      pList.forEach(p => {
        if (idsToDelete.has(p.id)) return;

        if (seenDates.has(p.date) && !p.isAbsent) {
          idsToDelete.add(p.id); // Duplicate on same date
        } else {
          if (!p.isAbsent) seenDates.add(p.date);
          validRecords.push(p);
        }
      });

      // Cap valid records at maxTermDays (e.g., 68 days maximum for this term)
      if (validRecords.length > maxTermDays) {
        const excess = validRecords.slice(maxTermDays);
        excess.forEach(p => idsToDelete.add(p.id));
      }
    });

    if (idsToDelete.size === 0) {
      const classStr = targetClass ? `for Class ${targetClass}` : 'across all classes';
      return { count: 0, message: `No out-of-term, duplicate, or excess payments found ${classStr}. All records comply with term maximum (${maxTermDays} days).` };
    }

    registerDeletedIds(Array.from(idsToDelete));
    const nextPayments = payments.filter(p => !idsToDelete.has(p.id));
    setPayments(nextPayments);
    saveState(users, students, nextPayments);

    if (db.isActive()) {
      idsToDelete.forEach((id: string) => db.deletePayment(id));
    }

    const classLabel = targetClass ? `Class ${targetClass}` : 'All Classes';
    const msg = `Successfully cleaned ${idsToDelete.size} excess / future / duplicate payment entry(ies) for ${classLabel}. Total valid payments capped at term maximum (${maxTermDays} days).`;
    return { count: idsToDelete.size, message: msg };
  };

  const purgeRepeatedAndAdvancePayments = (options: { duplicates?: boolean; advance?: boolean; outOfTerm?: boolean; studentId?: string }): { count: number; message: string } => {
    let totalPurged = 0;
    const msgs: string[] = [];

    if (options.duplicates !== false) {
      const resDup = purgeDuplicatePayments();
      if (resDup.count > 0) {
        totalPurged += resDup.count;
        msgs.push(`${resDup.count} duplicate payment(s)`);
      }
    }

    if (options.advance !== false) {
      const resAdv = purgeAdvancePayments(options.studentId);
      if (resAdv.count > 0) {
        totalPurged += resAdv.count;
        msgs.push(`${resAdv.count} advance/prepaid payment(s)`);
      }
    }

    if (options.outOfTerm) {
      const resOut = purgeOutOfTermPayments(options.studentId);
      if (resOut.count > 0) {
        totalPurged += resOut.count;
        msgs.push(`${resOut.count} out-of-term payment(s)`);
      }
    }

    if (totalPurged === 0) {
      return { count: 0, message: "No duplicate or advance payment records found to clean up." };
    }

    return { 
      count: totalPurged, 
      message: `Clean-up Complete: Purged ${msgs.join(' and ')} successfully.` 
    };
  };

  const purgePublicHolidayPayments = (): { count: number; message: string } => {
    const holidaysList = terms.flatMap(t => t.publicHolidays || []);
    if (!holidaysList.length) return { count: 0, message: "No public holidays registered in any term." };

    const invalidHolidayPayments = payments.filter(p => holidaysList.includes(p.date));
    if (invalidHolidayPayments.length === 0) {
      return { count: 0, message: "No attendance or fee entries found on public holiday dates." };
    }

    const idsToDelete = new Set<string>(invalidHolidayPayments.map(p => p.id));
    registerDeletedIds(Array.from(idsToDelete));
    const nextPayments = payments.filter(p => !idsToDelete.has(p.id));

    setPayments(nextPayments);
    idbEngine.setItem('s_payments', nextPayments);
    saveState(users, students, nextPayments);

    if (db.isActive()) {
      idsToDelete.forEach((id: string) => db.deletePayment(id));
    }

    logActivity('payments', 'payments', `Purged ${idsToDelete.size} payment/attendance records logged on public holidays.`);
    return {
      count: idsToDelete.size,
      message: `Successfully purged ${idsToDelete.size} entry(ies) recorded on public holiday dates.`
    };
  };

  const purgePaymentsExceptYesterdayAndToday = (): { count: number; retainedCount: number; yesterdayStr: string; todayStr: string; message: string } => {
    createBackup('Pre-Purge Non-Yesterday/Today Payments', true);

    const todayStr = currentDate;
    const d = new Date(currentDate + 'T12:00:00Z');
    d.setDate(d.getDate() - 1);
    const yesterdayStr = d.toISOString().split('T')[0];

    const toKeep: PaymentRecord[] = [];
    const toDelete: PaymentRecord[] = [];

    payments.forEach(p => {
      if (p.date === todayStr || p.date === yesterdayStr) {
        toKeep.push(p);
      } else {
        toDelete.push(p);
      }
    });

    if (toDelete.length === 0) {
      return {
        count: 0,
        retainedCount: toKeep.length,
        yesterdayStr,
        todayStr,
        message: `No older fee entries found to purge. All ${toKeep.length} fee record(s) belong to yesterday (${yesterdayStr}) or today (${todayStr}).`
      };
    }

    const idsToDelete = new Set(toDelete.map(p => p.id));
    registerDeletedIds(Array.from(idsToDelete));
    setPayments(toKeep);
    idbEngine.setItem('s_payments', toKeep);
    saveState(users, students, toKeep);

    if (db.isActive()) {
      idsToDelete.forEach(id => db.deletePayment(id));
    }

    const msg = `Payment Audit Clean-up Complete: Successfully deleted ${toDelete.length} fee entry(ies) recorded before yesterday. Retained ${toKeep.length} fee record(s) logged on yesterday (${yesterdayStr}) and today (${todayStr}).`;

    logActivity('payments', 'payments', msg);

    return {
      count: toDelete.length,
      retainedCount: toKeep.length,
      yesterdayStr,
      todayStr,
      message: msg
    };
  };

  const deleteAllAutomaticEntries = (): { deletedPaymentsCount: number; deletedJournalsCount: number; message: string } => {
    const holidaysList = terms.flatMap(t => t.publicHolidays || []);

    // 1. Identify payment entries logged on public holidays OR auto-generated system/debt payments
    const autoPayments = payments.filter(p => {
      if (holidaysList.includes(p.date)) return true;
      if (p.id.endsWith('_debt')) return true;
      const lowerNotes = (p.notes || '').toLowerCase();
      if (
        lowerNotes.includes('auto-') || 
        lowerNotes.includes('automatic') || 
        lowerNotes.includes('system auto-correction') || 
        lowerNotes.includes('auto-book') ||
        lowerNotes.includes('auto-checkin')
      ) return true;
      return false;
    });

    const paymentIdsToDelete = new Set(autoPayments.map(p => p.id));
    const nextPayments = payments.filter(p => !paymentIdsToDelete.has(p.id));

    if (db.isActive()) {
      paymentIdsToDelete.forEach((id: string) => db.deletePayment(id));
    }
    setPayments(nextPayments);
    idbEngine.setItem('s_payments', nextPayments);

    // 2. Identify auto-generated journal entries
    const autoJournals = journalEntries.filter(j => {
      if (j.recordedBy === 'Auto-Ledger Bot') return true;
      const lowerDesc = (j.description || '').toLowerCase();
      if (lowerDesc.includes('auto-book') || lowerDesc.includes('auto-sync') || lowerDesc.includes('auto-ledger')) return true;
      return false;
    });

    const journalIdsToDelete = new Set(autoJournals.map(j => j.id));
    const nextJournals = journalEntries.filter(j => !journalIdsToDelete.has(j.id));

    if (db.isActive()) {
      journalIdsToDelete.forEach((id: string) => db.deleteJournalEntry(id));
    }
    setJournalEntries(nextJournals);
    idbEngine.setItem('s_journal_entries', nextJournals);

    saveState(users, students, nextPayments);

    const msg = `Successfully deleted all automatic entries: Purged ${paymentIdsToDelete.size} auto/holiday payment record(s) and ${journalIdsToDelete.size} auto-booked journal entry(ies).`;
    logActivity('settings', 'other', msg);

    return {
      deletedPaymentsCount: paymentIdsToDelete.size,
      deletedJournalsCount: journalIdsToDelete.size,
      message: msg
    };
  };

  const promoteAllStudents = (customActions?: Record<string, 'promote' | 'repeat' | 'graduate' | 'withdraw'>) => {
    // 1. Create and save a roster backup before making any modification
    const backupId = `promo-bk-${Date.now()}`;
    const newBackup = {
      id: backupId,
      timestamp: new Date().toISOString(),
      studentCount: students.length,
      studentsJson: JSON.stringify(students),
      description: customActions 
        ? `Custom Reconciliation Promotion (${Object.keys(customActions).length} student overrides)` 
        : "Standard Bulk Cohort Promotion"
    };
    const updatedBackups = [newBackup, ...promotionBackups].slice(0, 10);
    setPromotionBackups(updatedBackups);
    idbEngine.setItem('s_promotion_backups', updatedBackups);

    // 2. Compute promotions
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
      // If student is already inactive, keep as-is
      if (!student.active) return student;

      // Check if there is an explicit user action override for this student
      if (customActions && student.id in customActions) {
        const action = customActions[student.id];
        if (action === 'repeat') {
          // Stay in current class, remain active
          return student;
        }
        if (action === 'withdraw') {
          // Set to inactive
          return {
            ...student,
            active: false
          };
        }
        if (action === 'graduate') {
          // Set to inactive (completed)
          return {
            ...student,
            active: false
          };
        }
        // If action is standard 'promote', proceed to CLASS_PROMOTION_MAP rules
      }

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
          category: mapEntry.category,
          active: false // Promoted pupils start as INACTIVE until activated upon returning from vacation
        };
      }

      return student;
    });

    setStudents(updatedStudents);
    saveState(users, updatedStudents, payments);

    if (db.isActive()) {
      db.saveStudentsBulk(updatedStudents).catch(err => {
        console.error("Failed to save bulk promoted students to cloud:", err);
      });
    } else {
      recordLocallyPendingEdit('student', 'update', `Promoted cohorts school-wide to the next academic year`);
    }
  };

  const revertLastPromotion = (backupId?: string): boolean => {
    const targetBackupId = backupId || promotionBackups[0]?.id;
    if (!targetBackupId) return false;

    const backup = promotionBackups.find(b => b.id === targetBackupId);
    if (!backup) return false;

    try {
      const revertedStudents = JSON.parse(backup.studentsJson);
      if (!Array.isArray(revertedStudents)) return false;

      // Set students list to backup state
      setStudents(revertedStudents);
      saveState(users, revertedStudents, payments);

      // Filter out this backup from the list
      const updatedBackups = promotionBackups.filter(b => b.id !== targetBackupId);
      setPromotionBackups(updatedBackups);
      idbEngine.setItem('s_promotion_backups', updatedBackups);

      if (db.isActive()) {
        db.saveStudentsBulk(revertedStudents).catch(err => {
          console.error("Failed to restore bulk student list to cloud:", err);
        });
      } else {
        recordLocallyPendingEdit('student', 'update', `Reverted student cohorts from backup (${backup.timestamp})`);
      }

      return true;
    } catch (e) {
      console.error("Failed to parse promotion backup JSON:", e);
      return false;
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
    idbEngine.setItem('s_expenses', updated);

    if (db.isActive()) {
      db.saveExpense(newExpense).catch(err => {
        console.error("Failed to save expense to cloud:", err);
      });
    }
  };

  const deleteExpense = (expenseId: string) => {
    const targetExp = expenses.find(e => e.id === expenseId);
    if (targetExp) {
      moveToTrash(
        'expense',
        expenseId,
        targetExp,
        `Deleted expense item "${targetExp.description}" (GHC ${targetExp.amount.toFixed(2)}) under ${targetExp.category}`,
        { amount: targetExp.amount }
      );
    }

    const updated = expenses.filter(e => e.id !== expenseId);
    setExpenses(updated);
    idbEngine.setItem('s_expenses', updated);

    if (db.isActive()) {
      db.deleteExpense(expenseId).catch(err => {
        console.error("Failed to delete expense from cloud:", err);
      });
    }

    if (targetExp) {
      logActivity(
        'EXPENSE_DELETED',
        'expenses',
        `Deleted expense item "${targetExp.description}" (GHC ${targetExp.amount.toFixed(2)}) under ${targetExp.category}`,
        undefined,
        undefined,
        targetExp.amount,
        {
          type: 'expense',
          expense: targetExp
        }
      );
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
    idbEngine.setItem('s_budget_targets', updated);

    if (db.isActive()) {
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
    idbEngine.setItem('s_budget_targets', updated);

    if (db.isActive()) {
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
    idbEngine.setItem('s_budget_targets', updated);

    if (db.isActive()) {
      try {
        await db.deleteBudgetTarget(targetId);
      } catch (err) {
        console.error("Failed to delete budget target from cloud:", err);
      }
    }
  };

  const addExamsPayment = async (
    studentId: string,
    amountPaid: number,
    paymentMethod: PaymentMethod,
    notes?: string,
    datePaid?: string
  ) => {
    const student = students.find(s => s.id === studentId);
    if (!student) {
      throw new Error(`Student with ID ${studentId} not found in roster.`);
    }

    // Check if student has pending local updates
    const hasPending = pendingLocalEdits.some(edit => 
      (edit.type === 'student' || edit.type === 'payment') && 
      edit.description.toLowerCase().includes(student.name.toLowerCase())
    );
    if (hasPending) {
      const proceed = window.confirm(`Warning: ${student.name} has pending offline updates that are not yet synced to the cloud.\n\nDo you want to proceed with recording this exams fee?`);
      if (!proceed) {
        throw new Error("Action cancelled by user due to pending offline updates.");
      }
    }

    // Duplicate exams payment check
    const targetDate = datePaid || currentDate;
    const targetTerm = activeTerm?.id || 'term_default';
    const duplicateExamsPayment = examsPayments.find(p => 
      p.studentId === studentId && 
      p.datePaid === targetDate && 
      p.termId === targetTerm && 
      Math.abs(p.amountPaid - amountPaid) < 0.01
    );
    if (duplicateExamsPayment) {
      const proceed = window.confirm(`Warning: An exams fee payment of GHC ${amountPaid.toFixed(2)} has already been recorded for ${student.name} on this date (${targetDate}) for this term.\n\nDo you want to proceed with saving this duplicate exams payment?`);
      if (!proceed) {
        throw new Error("Action cancelled by user to prevent duplicate exams payment.");
      }
    }

    const newPayment: ExamsPayment = {
      id: `ex-pay-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      studentId: student.id,
      studentName: student.name,
      class: student.class,
      category: student.category,
      amountPaid,
      datePaid: datePaid || currentDate,
      collectedBy: currentUser?.name || 'Administrator',
      termId: activeTerm?.id || 'term_default',
      paymentMethod,
      notes,
      timestamp: new Date().toISOString()
    };

    const updated = [newPayment, ...examsPayments];
    setExamsPayments(updated);
    idbEngine.setItem('s_exams_payments', updated);

    if (db.isActive()) {
      try {
        await db.saveExamsPayment(newPayment);
      } catch (err) {
        console.error("Failed to save exams payment to cloud:", err);
      }
    }
  };

  const deleteExamsPayment = async (paymentId: string) => {
    const updated = examsPayments.filter(p => p.id !== paymentId);
    setExamsPayments(updated);
    idbEngine.setItem('s_exams_payments', updated);

    if (db.isActive()) {
      try {
        await db.deleteExamsPayment(paymentId);
      } catch (err) {
        console.error("Failed to delete exams payment from cloud:", err);
      }
    }
  };

  const addExamsExpense = async (
    providerName: string,
    targetClass: StudentClass | 'All-Preschool' | 'All-Primary' | 'All-JHS' | 'Entire-School',
    billingPerChild: number,
    studentCount: number,
    totalAmount: number,
    amountPaid: number,
    status: 'Paid' | 'Unpaid' | 'Partially Paid',
    notes?: string,
    date?: string
  ) => {
    const newExpense: ExamsExpense = {
      id: `ex-exp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      providerName,
      date: date || currentDate,
      targetClass,
      billingPerChild,
      studentCount,
      totalAmount,
      amountPaid,
      status,
      notes,
      timestamp: new Date().toISOString()
    };

    const updated = [newExpense, ...examsExpenses];
    setExamsExpenses(updated);
    idbEngine.setItem('s_exams_expenses', updated);

    if (db.isActive()) {
      try {
        await db.saveExamsExpense(newExpense);
      } catch (err) {
        console.error("Failed to save exams expense to cloud:", err);
      }
    }
  };

  const deleteExamsExpense = async (expenseId: string) => {
    const updated = examsExpenses.filter(e => e.id !== expenseId);
    setExamsExpenses(updated);
    idbEngine.setItem('s_exams_expenses', updated);

    if (db.isActive()) {
      try {
        await db.deleteExamsExpense(expenseId);
      } catch (err) {
        console.error("Failed to delete exams expense from cloud:", err);
      }
    }
  };

  const updateExamsExpense = async (updatedExpense: ExamsExpense) => {
    const updated = examsExpenses.map(e => e.id === updatedExpense.id ? updatedExpense : e);
    setExamsExpenses(updated);
    idbEngine.setItem('s_exams_expenses', updated);

    if (db.isActive()) {
      try {
        await db.saveExamsExpense(updatedExpense);
      } catch (err) {
        console.error("Failed to update exams expense in cloud:", err);
      }
    }
  };

  const updateExamsSettings = async (settings: ExamsSettings) => {
    setExamsSettings(settings);
    idbEngine.setItem('s_exams_settings', settings);

    if (db.isActive()) {
      try {
        await db.saveExamsSettings(settings);
      } catch (err) {
        console.error("Failed to save exams settings to cloud:", err);
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
    idbEngine.setItem('s_salaries', updated);

    if (db.isActive()) {
      db.saveSalary(newSalary).catch(err => {
        console.error("Failed to save salary to cloud:", err);
      });
    }
  };

  const deleteSalary = (salaryId: string) => {
    const updated = salaries.filter(s => s.id !== salaryId);
    setSalaries(updated);
    idbEngine.setItem('s_salaries', updated);

    if (db.isActive()) {
      db.deleteSalary(salaryId).catch(err => {
        console.error("Failed to delete salary from cloud:", err);
      });
    }
  };

  const addTeacherEvaluation = async (evaluation: Omit<TeacherEvaluation, 'id' | 'dateCreated'>) => {
    const newEval: TeacherEvaluation = {
      ...evaluation,
      id: `eval-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      dateCreated: new Date().toISOString()
    };
    const updated = [newEval, ...teacherEvaluations];
    setTeacherEvaluations(updated);
    idbEngine.setItem('s_teacher_evaluations', updated);

    if (db.isActive()) {
      try {
        const success = await db.saveTeacherEvaluation(newEval);
        return success;
      } catch (err) {
        console.error("Failed to save evaluation to cloud:", err);
        return false;
      }
    }
    return true;
  };

  const deleteTeacherEvaluation = async (id: string) => {
    const updated = teacherEvaluations.filter(e => e.id !== id);
    setTeacherEvaluations(updated);
    idbEngine.setItem('s_teacher_evaluations', updated);

    if (db.isActive()) {
      try {
        const success = await db.deleteTeacherEvaluation(id);
        return success;
      } catch (err) {
        console.error("Failed to delete evaluation from cloud:", err);
        return false;
      }
    }
    return true;
  };

  const addJournalEntry = async (entry: Omit<JournalEntry, 'id' | 'timestamp'>) => {
    const newEntry: JournalEntry = {
      ...entry,
      id: `journal-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString()
    };
    const updated = [newEntry, ...journalEntries];
    setJournalEntries(updated);
    idbEngine.setItem('s_journal_entries', updated);

    if (db.isActive()) {
      try {
        const success = await db.saveJournalEntry(newEntry);
        return success;
      } catch (err) {
        console.error("Failed to save journal entry to cloud:", err);
        return false;
      }
    }
    return true;
  };

  const deleteJournalEntry = async (id: string) => {
    const updated = journalEntries.filter(e => e.id !== id);
    setJournalEntries(updated);
    idbEngine.setItem('s_journal_entries', updated);

    if (db.isActive()) {
      try {
        const success = await db.deleteJournalEntry(id);
        return success;
      } catch (err) {
        console.error("Failed to delete journal entry from cloud:", err);
        return false;
      }
    }
    return true;
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

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error('Failed to fetch Audit logs state:', err);
    }
  };

  const logActivity = async (
    action: string,
    category: 'students' | 'payments' | 'expenses' | 'settings' | 'security' | 'other',
    details: string,
    studentId?: string,
    studentName?: string,
    amount?: number,
    snapshotData?: any
  ) => {
    try {
      const res = await fetch('/api/audit-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          category,
          operatorName: currentUser ? currentUser.name : 'System Automation',
          operatorRole: currentUser ? currentUser.role : 'System',
          details,
          studentId,
          studentName,
          amount,
          snapshotData
        })
      });
      const data = await res.json();
      if (data.success) {
        await fetchAuditLogs();
      }
    } catch (err) {
      console.error('Failed to log activity via API:', err);
    }
  };

  const fetchTrashItems = async () => {
    try {
      const res = await fetch('/api/trash');
      if (res.ok) {
        const data = await res.json();
        setTrashItems(data);
      }
    } catch (err) {
      console.error('Failed to fetch Trash items state:', err);
    }
  };

  const moveToTrash = async (
    itemType: 'payment' | 'student' | 'expense' | 'bulk_payments',
    originalId: string,
    recordData: any,
    reason: string,
    meta?: { studentId?: string; studentName?: string; amount?: number; itemCount?: number; class?: string }
  ): Promise<TrashItem> => {
    const deletedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const deletedBy = currentUser ? `${currentUser.name} (${currentUser.role})` : 'System Automation';

    const newItem: TrashItem = {
      id: `trash_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      originalId,
      itemType,
      recordData,
      deletedAt,
      expiresAt,
      deletedBy,
      reason,
      studentId: meta?.studentId,
      studentName: meta?.studentName,
      amount: meta?.amount,
      itemCount: meta?.itemCount,
      class: meta?.class
    };

    setTrashItems(prev => [newItem, ...prev.filter(t => t.id !== newItem.id)]);

    try {
      await fetch('/api/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
    } catch (err) {
      console.error('Failed to save soft-deleted trash item:', err);
    }

    return newItem;
  };

  const restoreTrashItem = async (trashId: string): Promise<{ success: boolean; message: string }> => {
    if (currentUser?.role !== 'Administrator') {
      return { success: false, message: 'Access Denied: Only Administrators can perform soft delete restoration operations.' };
    }

    const item = trashItems.find(t => t.id === trashId);
    if (item) {
      if (item.itemType === 'payment') {
        const paymentToRestore: PaymentRecord = item.recordData.payment || item.recordData;
        if (paymentToRestore && paymentToRestore.id) {
          let nextPayments = [...payments];
          if (!nextPayments.some(p => p.id === paymentToRestore.id)) {
            nextPayments.unshift(paymentToRestore);
          }
          if (Array.isArray(item.recordData.relatedMarkers)) {
            item.recordData.relatedMarkers.forEach((m: PaymentRecord) => {
              if (!nextPayments.some(p => p.id === m.id)) {
                nextPayments.unshift(m);
                if (rawDb.isActive()) rawDb.savePayment(m);
              }
            });
          }
          setPayments(nextPayments);
          saveState(users, students, nextPayments);
          if (rawDb.isActive()) rawDb.savePayment(paymentToRestore);
        }
      } else if (item.itemType === 'bulk_payments') {
        const paymentsArray: PaymentRecord[] = Array.isArray(item.recordData) 
          ? item.recordData 
          : (item.recordData?.payments || []);
        let nextPayments = [...payments];
        paymentsArray.forEach(p => {
          if (p && p.id && !nextPayments.some(existing => existing.id === p.id)) {
            nextPayments.unshift(p);
            if (rawDb.isActive()) rawDb.savePayment(p);
          }
        });
        setPayments(nextPayments);
        saveState(users, students, nextPayments);
      } else if (item.itemType === 'student') {
        const pupilToRestore: Student = item.recordData.student || item.recordData;
        if (pupilToRestore && pupilToRestore.id) {
          let nextStudents = [...students];
          const sIdx = nextStudents.findIndex(s => s.id === pupilToRestore.id);
          if (sIdx >= 0) nextStudents[sIdx] = pupilToRestore;
          else nextStudents.unshift(pupilToRestore);

          let nextPayments = [...payments];
          if (Array.isArray(item.recordData.payments)) {
            item.recordData.payments.forEach((p: PaymentRecord) => {
              if (!nextPayments.some(existing => existing.id === p.id)) {
                nextPayments.unshift(p);
                if (rawDb.isActive()) rawDb.savePayment(p);
              }
            });
          }
          setStudents(nextStudents);
          setPayments(nextPayments);
          saveState(users, nextStudents, nextPayments);
          if (rawDb.isActive()) rawDb.saveStudent(pupilToRestore);
        }
      } else if (item.itemType === 'expense') {
        const expenseToRestore: Expense = item.recordData.expense || item.recordData;
        if (expenseToRestore && expenseToRestore.id) {
          let nextExpenses = [...expenses];
          if (!nextExpenses.some(e => e.id === expenseToRestore.id)) {
            nextExpenses.unshift(expenseToRestore);
          }
          setExpenses(nextExpenses);
          if (rawDb.isActive()) rawDb.saveExpense(expenseToRestore);
        }
      }
    }

    setTrashItems(prev => prev.filter(t => t.id !== trashId));
    const res = await rawDb.restoreTrashItem(trashId, currentUser ? `${currentUser.name} (${currentUser.role})` : 'System Admin');
    await fetchAuditLogs();
    await fetchTrashItems();
    return res;
  };

  const permanentlyDeleteTrashItem = async (trashId: string): Promise<boolean> => {
    setTrashItems(prev => prev.filter(t => t.id !== trashId));
    const res = await rawDb.deleteTrashItem(trashId);
    return res;
  };

  const emptyTrash = async (): Promise<{ success: boolean; message: string }> => {
    if (currentUser?.role !== 'Administrator') {
      return { success: false, message: 'Access Denied: Only Administrators can empty the soft delete trash bin.' };
    }
    setTrashItems([]);
    const res = await rawDb.emptyTrash(currentUser ? `${currentUser.name} (${currentUser.role})` : 'System Admin');
    await fetchAuditLogs();
    return res;
  };

  const restoreDeletedRecord = async (logOrSnapshot: any): Promise<{ success: boolean; message: string }> => {
    if (currentUser?.role !== 'Administrator') {
      return { success: false, message: 'Access Denied: Only Administrators can perform data recovery operations.' };
    }

    // Check if it's a TrashItem directly
    if (logOrSnapshot && logOrSnapshot.expiresAt && logOrSnapshot.itemType) {
      return restoreTrashItem(logOrSnapshot.id);
    }

    let snapshot = logOrSnapshot?.snapshotData || logOrSnapshot;
    if (!snapshot) {
      return { success: false, message: 'No recovery snapshot data available for this record.' };
    }

    // Handle restoring a Pupil
    if (snapshot.type === 'student' && snapshot.student) {
      const pupilToRestore: Student = snapshot.student;
      const existingIndex = students.findIndex(s => s.id === pupilToRestore.id);
      let nextStudents = [...students];
      if (existingIndex >= 0) {
        nextStudents[existingIndex] = pupilToRestore;
      } else {
        nextStudents.unshift(pupilToRestore);
      }

      let nextPayments = [...payments];
      if (Array.isArray(snapshot.payments) && snapshot.payments.length > 0) {
        snapshot.payments.forEach((p: PaymentRecord) => {
          if (!nextPayments.some(existingP => existingP.id === p.id)) {
            nextPayments.unshift(p);
            if (db.isActive()) db.savePayment(p);
          }
        });
      }

      setStudents(nextStudents);
      setPayments(nextPayments);
      saveState(users, nextStudents, nextPayments);

      if (db.isActive()) {
        await db.saveStudent(pupilToRestore);
      }

      await logActivity(
        'PUPIL_RECOVERY_REVERT',
        'students',
        `Reverted accidental deletion: Restored pupil record for "${pupilToRestore.name}" (${pupilToRestore.class})`,
        pupilToRestore.id,
        pupilToRestore.name
      );

      return {
        success: true,
        message: `Successfully restored pupil record "${pupilToRestore.name}" and associated transaction history!`
      };
    }

    // Handle restoring a Payment Record
    if (snapshot.type === 'payment' && snapshot.payment) {
      const paymentToRestore: PaymentRecord = snapshot.payment;
      let nextPayments = [...payments];
      if (!nextPayments.some(p => p.id === paymentToRestore.id)) {
        nextPayments.unshift(paymentToRestore);
      }

      if (Array.isArray(snapshot.relatedMarkers)) {
        snapshot.relatedMarkers.forEach((m: PaymentRecord) => {
          if (!nextPayments.some(p => p.id === m.id)) {
            nextPayments.unshift(m);
            if (db.isActive()) db.savePayment(m);
          }
        });
      }

      setPayments(nextPayments);
      saveState(users, students, nextPayments);

      if (db.isActive()) {
        await db.savePayment(paymentToRestore);
      }

      await logActivity(
        'PAYMENT_RECOVERY_REVERT',
        'payments',
        `Reverted accidental payment void: Restored transaction of GHC ${(paymentToRestore.amount || 0).toFixed(2)} for pupil "${paymentToRestore.studentName || 'Pupil'}"`,
        paymentToRestore.studentId,
        paymentToRestore.studentName,
        paymentToRestore.amount
      );

      return {
        success: true,
        message: `Successfully restored fee payment entry of GHC ${(paymentToRestore.amount || 0).toFixed(2)} for ${paymentToRestore.studentName || 'Pupil'}!`
      };
    }

    // Handle restoring an Expense
    if (snapshot.type === 'expense' && snapshot.expense) {
      const expenseToRestore: Expense = snapshot.expense;
      let nextExpenses = [...expenses];
      if (!nextExpenses.some(e => e.id === expenseToRestore.id)) {
        nextExpenses.unshift(expenseToRestore);
      }
      setExpenses(nextExpenses);
      await idbEngine.setItem('s_expenses', nextExpenses);

      if (db.isActive()) {
        await db.saveExpense(expenseToRestore);
      }

      await logActivity(
        'EXPENSE_RECOVERY_REVERT',
        'expenses',
        `Reverted accidental expense deletion: Restored expense item "${expenseToRestore.description}" (GHC ${expenseToRestore.amount.toFixed(2)})`,
        undefined,
        undefined,
        expenseToRestore.amount
      );

      return {
        success: true,
        message: `Successfully restored expense entry "${expenseToRestore.description}"!`
      };
    }

    // Handle restoring from a system backup snapshot
    if (snapshot.type === 'backup' && snapshot.backupId) {
      restoreBackup(snapshot.backupId);
      return {
        success: true,
        message: `Successfully reverted database state to system recovery snapshot!`
      };
    }

    return { success: false, message: 'Unrecognized snapshot type or corrupt recovery payload.' };
  };

  const sendautomatedWhatsApp = async (
    phone: string,
    message: string,
    studentId?: string,
    studentName?: string,
    type?: string,
    forceDirect?: boolean
  ) => {
    try {
      const gatewayMode = systemSettings?.whatsappGatewayMode || 'direct';
      const isDirect = forceDirect || (gatewayMode === 'direct');

      if (isDirect && typeof window !== 'undefined') {
        let targetPhone = phone.replace(/\D/g, "");
        if (targetPhone.startsWith("0") && targetPhone.length === 10) {
          targetPhone = "233" + targetPhone.substring(1);
        }
        const urlText = encodeURIComponent(message);
        const waUrl = targetPhone 
          ? `https://api.whatsapp.com/send?phone=${targetPhone}&text=${urlText}`
          : `https://api.whatsapp.com/send?text=${urlText}`;
        
        window.open(waUrl, '_blank', 'noopener,noreferrer');
      }

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
          isDirect,
          whatsappGatewayMode: gatewayMode,
          whatsappWebhookUrl: systemSettings?.whatsappWebhookUrl || '',
          whatsappWebhookToken: systemSettings?.whatsappWebhookToken || '',
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

  // Initially fetch whatsapp logs, audit logs, and trash items on storage mode shifts or startup
  useEffect(() => {
    fetchWhatsappLogs();
    fetchAuditLogs();
    fetchTrashItems();
  }, [storageMode]);

  // Monitor budget progressive targets & trigger automated WhatsApp alerts for thresholds 50%, 75%, 100%
  useEffect(() => {
    if (!payments.length || !budgetTargets.length) return;
    
    const adminPhone = systemSettings?.adminWhatsAppPhone;
    if (!adminPhone || adminPhone.trim() === '') return;
    
    const totalFeesReceived = payments.filter(p => !p.isAbsent && p.verified !== false && p.amount > 0).reduce((sum, p) => sum + (p.amount || 0), 0);
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
      idbEngine.setItem('s_budget_targets', updatedTargets);
      
      if (db.isActive()) {
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
      realActiveTerm,
      viewingTermId,
      setViewingTermId,
      addTerm,
      editTerm,
      completeTerm,
      setActiveTerm,
      deleteTerm,
      addPublicHoliday,
      removePublicHoliday,
      currentDate,
      setCurrentDate,
      login,
      sendPasswordReset,
      changePassword,
      logout,
      toggleMfaForUser,
      addStudent,
      updateStudent,
      deleteStudent,
      mergeStudents,
      purgeDeactivatedStudents,
      standardizePupilIds,
      promoteAllStudents,
      promotionBackups,
      revertLastPromotion,
      recordPayment,
      recordMomoPayment,
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
      deleteClassFeeRecords,
      adjustPayment,
      registerStaff,
      updateStaff,
      adjustStaffSalariesByPercentage,
      deleteStaff,
      toggleStaffActive,
      getDailyStats,
      getTeacherMetrics,
      getCashFlowTrend,
      getPendingAlerts,
      sendMonthlyEmailDraft,
      resetData,
      clearSampleStudents,
      purgeOnlyDemoData,
      clearAllPayments,
      administrativePurge,
      purgeDuplicatePayments,
      getDuplicatePaymentAudit,
      deletePaymentRecord,
      sanitizeDatabaseIntegrity,
      carryForwardTermBalances,
      purgeAdvancePayments,
      purgeOutOfTermPayments,
      purgeClassOutOfTermAndDuplicates,
      purgeRepeatedAndAdvancePayments,
      purgePublicHolidayPayments,
      purgePaymentsExceptYesterdayAndToday,
      deleteAllAutomaticEntries,
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
      pendingLocalEdits,
      clearPendingLocalEdits,
      backups,
      createBackup,
      restoreBackup,
      importDatabaseBackup,
      deleteBackup,
      clearAllBackups,
      audioMuted,
      setAudioMuted,
      playFeedbackSound,
      theme,
      setTheme,
      expenses,
      salaries,
      teacherEvaluations,
      addTeacherEvaluation,
      deleteTeacherEvaluation,
      journalEntries,
      addJournalEntry,
      deleteJournalEntry,
      addExpense,
      deleteExpense,
      addSalary,
      deleteSalary,
      whatsappLogs,
      sendautomatedWhatsApp,
      fetchWhatsappLogs,
      auditLogs,
      fetchAuditLogs,
      logActivity,
      restoreDeletedRecord,
      trashItems,
      fetchTrashItems,
      moveToTrash,
      restoreTrashItem,
      permanentlyDeleteTrashItem,
      emptyTrash,
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
      deleteBudgetTarget,
      examsPayments,
      examsExpenses,
      examsSettings,
      addExamsPayment,
      deleteExamsPayment,
      addExamsExpense,
      deleteExamsExpense,
      updateExamsExpense,
      updateExamsSettings
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
