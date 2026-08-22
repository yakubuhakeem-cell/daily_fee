/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SchoolCategory = 'Pre-school' | 'Primary' | 'JHS';

export type StudentClass = 
  | 'Nursery' | 'KG1' | 'KG2' // Pre-school
  | 'B1' | 'B2' | 'B3' | 'B4' | 'B5' | 'B6' // Primary
  | 'B7' | 'B8' | 'B9'; // JHS

export const ALL_CLASSES: StudentClass[] = [
  'Nursery', 'KG1', 'KG2', 
  'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 
  'B7', 'B8', 'B9'
];

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
  idCardDeactivated?: boolean;
  enrollmentDate?: string; // Pupil's first day / enrollment date (YYYY-MM-DD) to ignore older dates for debt
  updatedAt?: string; // ISO string timestamp for LWW conflict resolution
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
  updatedAt?: string; // ISO string timestamp for LWW conflict resolution
  collectedBy: string; // Teacher name / ID
  verified: boolean;
  notes?: string;
  isAbsent?: boolean; // True if the student was marked absent today
  lateFeeApplied?: number; // Predefined late registration penalty applied (GHC)
  clearedDates?: string[]; // The array of past school days cleared by this debt payment
  history?: PaymentHistoryEntry[];
  paymentMethod?: PaymentMethod;
  momoTransactionId?: string;
  momoStatus?: 'pending' | 'successful' | 'failed' | 'refunded';
  momoProvider?: string;
  momoPhoneNumber?: string;
  termId?: string;
}

export type UserRole = 'Administrator' | 'Teacher' | 'Accountant' | 'Headmaster';

export interface TeacherEthicsEvaluation {
  academicYear?: string;
  positiveEthics: string[];
  negativeEthics: string[];
  overallScore?: number;
  overallRating?: string;
  qualificationStatus: 'Qualified (Full Increment)' | 'Qualified (Partial Increment)' | 'Withheld (Ethics Review)' | 'Maintained (No Change)';
  incrementPercentage: number;
  previousSalary: number;
  proposedSalary: number;
  evaluatedBy?: string;
  evaluatedDate?: string;
  evaluationNotes?: string;
}

export interface StaffPermissions {
  canRecordPayments?: boolean;
  canEditPayments?: boolean;
  canDeletePayments?: boolean;
  canManageStudents?: boolean;
  canManageExams?: boolean;
  canViewReports?: boolean;
  canManageSettings?: boolean;
}

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
  photoUrl?: string; // Staff photo URL for ID cards
  employeeId?: string; // Custom employee ID e.g. EMP-2026-001
  department?: string; // Custom department e.g. Administration, Academic, Security
  gender?: 'Male' | 'Female'; // Gender analysis
  employmentType?: 'Full-Time' | 'Part-Time' | 'Contract' | 'Volunteer'; // Employment status
  idCardDeactivated?: boolean;
  appointmentDate?: string; // e.g., '2026-01-15'
  contractEndDate?: string; // e.g., '2027-01-15'
  renewalOption?: 'Automatic' | 'Manual Review' | 'Fixed Term' | 'Non-Renewable';
  renewalPeriod?: string; // e.g., '1 Year', '6 Months', etc.
  signatureUrl?: string; // Staff/Employee digital signature
  managementSignatureUrl?: string; // Signatory officer digital signature
  personalAddress?: string; // Teacher/Staff personal address for contracts
  ethicsEvaluation?: TeacherEthicsEvaluation; // Professional ethics & salary promotion analysis
  permissions?: StaffPermissions; // Toggleable granular staff permissions
  updatedAt?: string; // ISO string timestamp for LWW conflict resolution
}

export interface Term {
  id: string;
  name: string; // e.g. 'Term 1 - 2026'
  startDate: string; // YYYY-MM-DD
  daysCount: number; // Allocated school days
  schoolDays: string[]; // Mon-Fri dates generated from startDate
  active: boolean;
  publicHolidays?: string[]; // Array of YYYY-MM-DD dates representing holidays
  isCompleted?: boolean; // True when term is completed/gate is closed
  updatedAt?: string; // ISO string timestamp for LWW conflict resolution
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
    examsPayments?: number;
    examsExpenses?: number;
  };
  data: {
    students: Student[];
    payments: PaymentRecord[];
    users: UserAccount[];
    terms: Term[];
    examsPayments?: ExamsPayment[];
    examsExpenses?: ExamsExpense[];
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
  baselineTermFeePreSchool?: number;
  baselineTermFeePrimary?: number;
  baselineTermFeeJhs?: number;
  currencyCode: string;
  customMotto?: string;
  customLocation?: string;
  autoSendCheckInAlert?: boolean;
  autoSendArrearsAlert?: boolean;
  primaryColor?: string;
  adminWhatsAppPhone?: string;
  termDiscountEnabled?: boolean;
  termDiscountWeek?: number;
  termDiscountPercentage?: number;
  debtThresholdLimit?: number;
  debtThresholdDays?: number;
  debtAlertTemplate?: string;
  debtAlertMethod?: 'whatsapp' | 'sms' | 'both';
  lateFeeEnabled?: boolean;
  lateFeeCutoffTime?: string; // e.g. "08:30"
  lateFeePercentage?: number; // e.g. 10 (representing 10%)
  disableDemoData?: boolean;
  whatsappGatewayType?: 'api' | 'direct';
  whatsappGatewayMode?: 'twilio' | 'webhook' | 'direct';
  whatsappWebhookUrl?: string;
  whatsappWebhookToken?: string;
  theme?: 'dark' | 'daylight';
  pupilIdFormat?: 'PREFIX_CLASS_NUM' | 'PREFIX_YEAR_CLASS_NUM' | 'PREFIX_YEAR_NUM' | 'PREFIX_NUM' | 'CLASS_NUM' | 'CUSTOM_NUM';
  pupilIdPrefix?: string; // e.g. "SHC"
  pupilIdPadding?: number; // e.g. 2, 3, or 4 (default 3)
  pupilIdSeparator?: string; // e.g. "-" or "/"
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

export interface ExamsPayment {
  id: string;
  studentId: string;
  studentName: string;
  class: StudentClass;
  category: SchoolCategory;
  amountPaid: number;
  datePaid: string; // YYYY-MM-DD
  collectedBy: string;
  termId: string; // references activeTerm.id
  paymentMethod: PaymentMethod;
  notes?: string;
  timestamp: string;
}

export interface ExamsExpense {
  id: string;
  providerName: string; // Exam company/publisher, e.g. Oxford Exams Ghana
  date: string; // YYYY-MM-DD
  targetClass: StudentClass | 'All-Preschool' | 'All-Primary' | 'All-JHS' | 'Entire-School';
  billingPerChild: number;
  studentCount: number;
  totalAmount: number;
  amountPaid: number;
  status: 'Paid' | 'Unpaid' | 'Partially Paid';
  notes?: string;
  timestamp: string;
}

export interface ExamsClassFeeStructure {
  feeCharged: number; // e.g. GHC 35
  companyBilling: number; // e.g. GHC 20
}

export interface ExamsSettings {
  classFees: Record<StudentClass, ExamsClassFeeStructure>;
  eligibleClasses?: StudentClass[];
}

export interface EthicConfig {
  id: string;
  label: string;
  type: 'positive' | 'negative';
  percentage: number; // e.g. 5 for 5%
  description: string;
}

export const STANDARD_ETHICS: EthicConfig[] = [
  // Negative
  { id: 'neg-late', label: 'Late Coming / Poor Punctuality', type: 'negative', percentage: 2, description: 'Repeated lateness without excuse' },
  { id: 'neg-negligence', label: 'Negligence of Duty', type: 'negative', percentage: 5, description: 'Leaving classroom unattended or failure to supervise students' },
  { id: 'neg-absent', label: 'Unapproved Absenteeism', type: 'negative', percentage: 10, description: 'Absence from school without prior notice or permit' },
  { id: 'neg-lessons', label: 'Failure to Submit Lesson Notes', type: 'negative', percentage: 4, description: 'Failure to prep or submit required teaching plans' },
  { id: 'neg-control', label: 'Poor Classroom Control', type: 'negative', percentage: 3, description: 'Inability to maintain orderly class environment' },
  { id: 'neg-misconduct', label: 'General Professional Misconduct', type: 'negative', percentage: 5, description: 'Violation of general school policies or standards' },

  // Positive
  { id: 'pos-attendance', label: 'Perfect Attendance Consistency', type: 'positive', percentage: 5, description: '100% active presence and devotion' },
  { id: 'pos-punctuality', label: 'Excellent Punctuality & Early Bird', type: 'positive', percentage: 3, description: 'Always arriving before assembly time' },
  { id: 'pos-delivery', label: 'Outstanding Lesson Notes & Delivery', type: 'positive', percentage: 4, description: 'Meticulously crafted notes and active teaching' },
  { id: 'pos-engagement', label: 'High Student Engagement & Care', type: 'positive', percentage: 3, description: 'Goes above and beyond to support struggling students' },
  { id: 'pos-hours', label: 'Active Teamwork & Extra Hours', type: 'positive', percentage: 5, description: 'Staying after school or helping with special events' },
  { id: 'pos-dressing', label: 'Professionalism & Clean Dressing', type: 'positive', percentage: 2, description: 'An exemplary role model in speech, dress, and conduct' }
];

export interface TeacherEvaluation {
  id: string;
  teacherId: string;
  teacherName: string;
  monthYear: string; // e.g. "June 2026" or "2026-06"
  attendanceScore: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  punctualityScore: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  negligenceReports?: string;
  checkedEthics: string[]; // List of ethic IDs
  calculatedDeduction: number; // total percentage deduction
  calculatedBenefit: number;   // total percentage benefit
  notes?: string;
  recordedBy?: string;
  dateCreated: string;
  customPercentages?: Record<string, number>;
  customAttendancePct?: number | null;
  customPunctualityPct?: number | null;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  category: 'students' | 'payments' | 'expenses' | 'settings' | 'security' | 'other';
  operatorName: string;
  operatorRole: string;
  details: string;
  studentId?: string;
  studentName?: string;
  amount?: number;
  snapshotData?: any;
}

export interface TrashItem {
  id: string;
  originalId: string;
  itemType: 'payment' | 'student' | 'expense' | 'bulk_payments';
  recordData: any;
  deletedAt: string;
  expiresAt: string;
  deletedBy: string;
  reason: string;
  studentId?: string;
  studentName?: string;
  amount?: number;
  itemCount?: number;
  class?: string;
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  recordedBy: string;
  timestamp: string; // ISO string
}

export interface AdministrativePurgeOptions {
  clearDailyPayments?: boolean;
  resetAttendanceLogs?: boolean;
  removeExamRecords?: boolean;
  clearExpenses?: boolean;
  clearJournalEntries?: boolean;
  purgeDemoRoster?: boolean;
}

export interface AdministrativePurgeResult {
  clearedPaymentsCount: number;
  clearedAttendanceCount: number;
  clearedExamCount: number;
  clearedExpensesCount: number;
  clearedJournalsCount: number;
  purgedDemoStudentsCount: number;
  message: string;
}

export interface DuplicatePaymentAuditItem {
  id: string;
  studentId: string;
  studentName: string;
  class: StudentClass;
  date: string;
  amount: number;
  paymentMethod?: string;
  notes?: string;
  timestamp: string;
  collectedBy: string;
  verified: boolean;
  isAbsent?: boolean;
  duplicateType: 'exact_ghost' | 'redundant_zero' | 'legitimate_installment';
}

export interface DuplicatePaymentAuditGroup {
  groupKey: string;
  studentId: string;
  studentName: string;
  studentClass: StudentClass;
  date: string;
  records: DuplicatePaymentAuditItem[];
  hasExactGhost: boolean;
  hasRedundantZero: boolean;
  hasLegitimateInstallment: boolean;
  totalAmount: number;
}

export interface DeleteClassFeesOptions {
  targetClass: StudentClass | 'ALL';
  scope: 'full_term' | 'specific_weeks' | 'custom_range' | 'all_time';
  selectedWeeks?: number[];
  startDate?: string;
  endDate?: string;
  feeCategory?: 'daily_only' | 'exams_only' | 'both';
  studentIds?: string[];
}

export interface DeleteClassFeesResult {
  success: boolean;
  deletedDailyPaymentsCount: number;
  deletedExamsPaymentsCount: number;
  totalAmountCleared: number;
  affectedStudentsCount: number;
  targetClass: string;
  dateSummary: string;
  message: string;
}

// ==========================================
// GHANA STANDARD-BASED & COMMON CORE CURRICULUM TYPES
// ==========================================

export type GESGrade = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type NaCCALevel = 'Advanced' | 'Proficient' | 'Developing' | 'Beginning';

export interface CurriculumSubject {
  id: string;
  name: string;
  code: string;
  level: 'KG' | 'Primary' | 'JHS' | 'All';
  isCore: boolean;
  category: 'Core' | 'Elective';
  description?: string;
  order: number;
}

export interface AcademicAssessment {
  id: string;
  studentId: string;
  studentName: string;
  class: StudentClass;
  termId: string;
  academicYear: string;
  subjectId: string;
  subjectName: string;
  classExercisesScore?: number; // Raw class exercises / activities
  homeworkScore?: number;        // Raw homework / projects
  projectScore?: number;         // Raw group project / practical
  classTestScore?: number;       // Raw class test / mid-term
  sbaRawScore?: number;          // Total raw continuous assessment score
  sbaMaxScore?: number;          // Max possible raw SBA score (e.g. 50 or 100)
  sbaScore: number;              // Weighted continuous assessment score (e.g. out of 50 or 30)
  examRawScore?: number;         // Raw end of term exam score
  examMaxScore?: number;         // Max raw exam score (e.g. 100 or 50)
  examScore: number;             // Weighted exam score (e.g. out of 50 or 70)
  totalScore: number;            // Overall 100% total (sbaScore + examScore)
  grade: GESGrade;               // 1 = Highest, 9 = Lowest
  gradeDescription: string;      // e.g. "Advanced", "Proficient", "Credit", "Pass", "Weak"
  achievementLevel: NaCCALevel;  // "Advanced" | "Proficient" | "Developing" | "Beginning"
  subjectPosition?: number;      // Rank in subject for that class
  teacherRemark?: string;        // Specific subject comment
  enteredBy: string;             // Staff name / ID
  enteredAt: string;             // Timestamp
  updatedAt?: string;
}

export interface TerminalReport {
  id: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  class: StudentClass;
  termId: string;
  academicYear: string;
  termName: string;
  daysPresent: number;
  totalDays: number;
  conduct: string;              // e.g. "Respectful, disciplined and highly cooperative."
  attitude: string;             // e.g. "Demonstrates exceptional devotion to learning."
  interest: string;             // e.g. "Science exploration, Creative arts & Debating."
  classTeacherRemarks: string;  // e.g. "Brilliant academic performance. Keep up the high standard!"
  headteacherRemarks: string;   // e.g. "Outstanding result. Recommended for academic honors."
  promotedTo?: string;          // e.g. "Promoted to Basic 4"
  positionInClass?: number;     // e.g. 1
  totalClassPupils?: number;    // e.g. 28
  totalScore: number;           // Total aggregate of marks
  averageScore: number;         // Percentage mean
  aggregateGrade: number;       // Best 6 GES grade aggregate (lower is better, e.g. 6 to 54)
  reopeningDate?: string;       // Next term resumption date
  vacationDate?: string;        // Current term closure date
  headteacherSignatureUrl?: string;
  classTeacherSignatureUrl?: string;
  feeStatus?: {
    termFee: number;
    amountPaid: number;
    balance: number;
    status: 'Cleared' | 'Partially Paid' | 'Arrears Outstanding';
  };
  verified?: boolean;
  updatedAt?: string;
}

export interface TeacherAllocation {
  id: string;
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
  class: StudentClass;
  isClassTeacher?: boolean;
  academicYear: string;
}

export interface AcademicSettings {
  sbaWeight: number;            // default 50 (50% SBA + 50% Exam) or 30 (30% SBA + 70% Exam) or 40 (40:60)
  examWeight: number;           // default 50 or 70 or 60
  academicYear: string;         // e.g. "2025/2026"
  activeTermNumber: 1 | 2 | 3;
  nextTermReopeningDate: string;
  vacationDate: string;
  headteacherName: string;
  headteacherTitle: string;     // "Headmaster" | "Headmistress" | "Principal"
  headteacherSignatureUrl?: string;
  schoolMotto: string;
  schoolAddress?: string;
  schoolPhone?: string;
  customSchoolCrestUrl?: string;
  showPositionOnReport: boolean;
  showAttendanceOnReport: boolean;
  showConductOnReport: boolean;
  showTeacherRemarks: boolean;
  showHeadteacherRemarks: boolean;
  showFeeStatusOnReport: boolean;
  showMedalsOnReport?: boolean;
  gradingScale: 'GES_9_POINT' | 'STANDARD_PERCENT';
}







