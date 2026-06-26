/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SchoolCategory = 'Pre-school' | 'Primary' | 'JHS';

export type StudentClass = 
  | 'Nursery' | 'KG1' | 'KG2' // Pre-school
  | 'B1' | 'B2' | 'B3' | 'B4' | 'B5' | 'B6' // Primary
  | 'B7' | 'B8' | 'B9'; // JHS

export interface Student {
  id: string;
  name: string;
  class: StudentClass;
  category: SchoolCategory;
  rollNumber: string;
  active: boolean;
  guardianPhone?: string;
  photoUrl?: string;
  discount?: number; // Optional daily check-in discount amount (0.00 to 5.00)
  gender?: 'Male' | 'Female';
  paymentType?: 'Daily' | 'Term'; // Billing calculation model: daily (default) vs static term subscription
  termFee?: number; // Fixed fee for entire school term for Term Payer (e.g. 350.00 GHC)
  legacyDebt?: number; // Pre-adoption/outstanding legacy debt to be integrated into their system balance (GHC)
}

export interface PaymentHistoryEntry {
  modifiedBy: string;
  modifiedAt: string;
  oldAmount: number;
  newAmount: number;
  oldIsAbsent?: boolean;
  newIsAbsent?: boolean;
  reason: string;
}

export interface PaymentRecord {
  id: string;
  studentId: string;
  studentName: string;
  class: StudentClass;
  category: SchoolCategory;
  amount: number; // always GHC 5.00
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO string
  collectedBy: string; // Teacher name / ID
  verified: boolean;
  notes?: string;
  isAbsent?: boolean; // True if the student was marked absent today
  clearedDates?: string[]; // The array of past school days cleared by this debt payment
  history?: PaymentHistoryEntry[];
}

export type UserRole = 'Administrator' | 'Teacher' | 'Accountant' | 'Headmaster';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  assignedClass?: StudentClass; // For teachers
  assignedClasses?: StudentClass[]; // For teachers overseeing multiple gates
  mfaEnabled: boolean;
  mfaSecret?: string; // QR code / setup value
  passwordEnabled?: boolean;
  password?: string;
  active?: boolean;
  stipendSalary?: number; // Teacher monthly stipend/salary
  momoNumber?: string; // Teacher Momo contact number
  momoName?: string; // Teacher Momo registered name
}

export interface Term {
  id: string;
  name: string; // e.g. 'Term 1 - 2026'
  startDate: string; // YYYY-MM-DD
  daysCount: number; // Allocated school days
  schoolDays: string[]; // Mon-Fri dates generated from startDate
  active: boolean;
  publicHolidays?: string[]; // Array of YYYY-MM-DD dates representing holidays
}

export interface PendingEdit {
  id: string;
  type: 'student' | 'payment' | 'user' | 'term' | 'bulk';
  action: 'create' | 'update' | 'delete';
  description: string;
  timestamp: string;
}

export interface BackupRecord {
  id: string;
  timestamp: string;
  label: string;
  isAuto: boolean;
  counts: {
    students: number;
    payments: number;
    users: number;
    terms: number;
  };
  data: {
    students: Student[];
    payments: PaymentRecord[];
    users: UserAccount[];
    terms: Term[];
  };
}

export type ExpenseCategory = 
  | 'Food' 
  | 'Utilities' 
  | 'Utility'
  | 'Maintenance' 
  | 'Transport' 
  | 'Supplies' 
  | 'Uniforms' 
  | 'Payroll' 
  | 'Others';

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  category: ExpenseCategory;
  description: string;
  approvedBy: string;
  timestamp: string; // ISO timestamp
}

export type PaymentMethod = 'Cash' | 'Mobile Money' | 'Bank Transfer';

export interface WorkerSalary {
  id: string;
  date: string; // YYYY-MM-DD (payment execution date)
  workerName: string;
  userId?: string; // Links to UserAccount.id if applicable
  monthYear: string; // e.g. "June 2026" or "YYYY-MM"
  role: string;
  baseSalary: number;
  allowance: number;
  deduction: number;
  netPaid: number; // base + allowance - deduction
  paymentMethod: PaymentMethod;
  notes?: string;
  timestamp: string; // ISO timestamp
  momoNumber?: string; // Momo payment contact number
  momoName?: string; // Momo payment name
  ssnitDeduction?: number;         // SSNIT (Option 1)
  incomeTaxDeduction?: number;     // Income Tax / PAYE (Option 2)
  welfareDeduction?: number;       // Welfare Contribution (Option 3)
  healthInsDeduction?: number;     // Health Insurance (Option 4)
  responsibilityAllowance?: number; // Responsibility (Option 5)
  transportAllowance?: number;     // Transport (Option 6)
  rentAllowance?: number;          // Rent (Option 7)
  momoFeeAbsorbed?: number;        // MOMO Fee (Option 8)
}

export interface SystemSettings {
  schoolName: string;
  systemName: string;
  schoolLogoUrl: string;
  baselineDailyFee: number;
  baselineTermFee: number;
  currencyCode: string;
  customMotto?: string;
  customLocation?: string;
  autoSendCheckInAlert?: boolean;
  autoSendArrearsAlert?: boolean;
  primaryColor?: string;
  adminWhatsAppPhone?: string;
}

export interface BudgetTarget {
  id: string;
  itemName: string;
  targetAmount: number;
  savedPercentage: number;
  createdAt: string; // ISO date string (YYYY-MM-DD or full timestamp)
  active: boolean;
  completed: boolean;
  description?: string;
  category?: string;
  notifiedThresholds?: number[];
}




