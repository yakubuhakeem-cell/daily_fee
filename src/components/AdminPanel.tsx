/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useApp, getStudentB9ExpiryDate, getDiscountedTermFee, isTermPayer } from '../context/AppContext';
import { StudentClass, Student, UserRole, SchoolCategory, TeacherEthicsEvaluation, StaffPermissions, UserAccount } from '../types';
import { Plus, UserPlus, Trash2, Edit2, ShieldAlert, Check, X, ToggleLeft, ToggleRight, Database, Server, RefreshCw, Copy, Share2, Users, BellRing, MessageSquareCode, UserCheck, Camera, Upload, Download, Search, QrCode, Printer, Contact, Award, DollarSign, Info, MessageSquare, Smartphone, Sliders, Bot, FileText, FileSignature, CalendarDays, ChevronDown, ChevronRight, Scale, LayoutGrid, List, Sparkles, KeyRound, Percent, TrendingUp, Coins, BadgePercent, ArrowUpRight, CheckCircle, AlertTriangle, CopyCheck, HeartHandshake, UserX } from 'lucide-react';
import { getClassCategory, generateRandomPassword } from '../initialData';
import { getStudentPickupCode } from '../utils/pickupCode';
import { PickupPassesModal } from './PickupPassesModal';
import { AdmissionFormModal } from './AdmissionFormModal';
import { ExpendituresTab } from './ExpendituresTab';
import { LedgerTab } from './LedgerTab';
import { WhatsAppLogsTab } from './WhatsAppLogsTab';
import { VoiceSearchButton } from './VoiceSearchButton';
import { SettingsPanel } from './SettingsPanel';
import { IdCardsGeneratorTab } from './IdCardsGeneratorTab';
import { AiAssistantTab } from './AiAssistantTab';
import { EnrollmentSummaryWidget } from './EnrollmentSummaryWidget';
import { SchoolLogo } from './SchoolLogo';
import { PerformanceTab } from './PerformanceTab';
import { DatabaseTab } from './DatabaseTab';
import { ImageCropperModal } from './ImageCropperModal';
import { EditStudentModal } from './EditStudentModal';
import { EditStaffModal } from './EditStaffModal';
import { TeacherSalaryIncrementModal } from './TeacherSalaryIncrementModal';
import { AbsentPupilsFloatingInquiryModal } from './AbsentPupilsFloatingInquiryModal';

interface SignaturePadProps {
  title: string;
  value: string;
  onChange: (val: string) => void;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ title, value, onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000000';

    if (value) {
      const img = new Image();
      img.src = value;
      img.onload = () => {
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
    } else {
      ctx.clearRect(0, 0, rect.width, rect.height);
    }
  }, [value]);

  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX = 0;
    let clientY = 0;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: any) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      onChange(dataUrl);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange('');
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 p-3 rounded-sm space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono font-black text-amber-500 uppercase tracking-widest">{title}</span>
        {value && (
          <button 
            type="button"
            onClick={clearCanvas}
            className="text-[9px] font-mono font-bold text-rose-400 hover:text-rose-300 uppercase tracking-wider px-1.5 py-0.5 bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 rounded transition-colors cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>
      
      <div className="relative border border-dashed border-neutral-800 bg-white rounded-sm h-28 cursor-crosshair overflow-hidden touch-none">
        <canvas 
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 w-full h-full"
        />
        {!value && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-[10px] font-mono text-neutral-400 select-none">
            Draw Signature Here (Pointer or Touch)
          </div>
        )}
      </div>
    </div>
  );
};

export const AdminPanel: React.FC = React.memo(() => {
  const { 
    students, 
    users, 
    addStudent, 
    updateStudent, 
    deleteStudent, 
    toggleMfaForUser,
    registerStaff,
    updateStaff,
    adjustStaffSalariesByPercentage,
    deleteStaff,
    toggleStaffActive,
    currentUser,
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
    payments,
    examsPayments = [],
    adjustPayment,
    resetData,
    mergeStudents,
    purgeDeactivatedStudents,
    promoteAllStudents,
    promotionBackups,
    revertLastPromotion,
    backups,
    createBackup,
    restoreBackup,
    deleteBackup,
    clearAllBackups,
    audioMuted,
    setAudioMuted,
    playFeedbackSound,
    whatsappLogs,
    fetchWhatsappLogs,
    terms,
    expenses,
    salaries,
    budgetTargets,
    systemSettings,
    sendautomatedWhatsApp
  } = useApp();

  const [localTimeLeft, setLocalTimeLeft] = useState<number>(30 * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setLocalTimeLeft(prev => {
        if (prev <= 1) return 30 * 60;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [activeTab, setActiveTab] = useState<'students' | 'mfa' | 'gates' | 'database' | 'expenditures' | 'performance' | 'whatsapp' | 'settings' | 'idcards' | 'ai_assistant'>('students');
  const [studentFilter, setStudentFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [studentViewStyle, setStudentViewStyle] = useState<'list' | 'album'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRegistryCategories, setExpandedRegistryCategories] = useState<Record<SchoolCategory, boolean>>({
    'Pre-school': true,
    'Primary': true,
    'JHS': true,
  });
  const [expandedStudentIds, setExpandedStudentIds] = useState<Record<string, boolean>>({});
  const [showPickupPassesModal, setShowPickupPassesModal] = useState(false);
  const [showAdmissionFormModal, setShowAdmissionFormModal] = useState(false);
  const [admissionFormStudent, setAdmissionFormStudent] = useState<Student | null>(null);
  const [showDuplicateAuditModal, setShowDuplicateAuditModal] = useState(false);
  const [studentToEditModal, setStudentToEditModal] = useState<Student | null>(null);
  const [staffToEditModal, setStaffToEditModal] = useState<UserAccount | null>(null);

  // Group duplicate student records by matching normalized Name and Class
  const duplicateStudentGroups = useMemo(() => {
    const groups = new Map<string, Student[]>();
    students.forEach(s => {
      const normName = (s.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const normClass = (s.class || '').trim().toLowerCase();
      if (!normName || !normClass) return;
      const key = `${normName}||${normClass}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    });

    const duplicates: { key: string; name: string; className: StudentClass; candidates: Student[] }[] = [];
    groups.forEach((list, key) => {
      if (list.length > 1) {
        duplicates.push({
          key,
          name: list[0].name,
          className: list[0].class,
          candidates: list
        });
      }
    });
    return duplicates;
  }, [students]);

  const handleAuditDuplicatesClick = () => {
    if (currentUser?.role !== 'Administrator') {
      alert('Access Denied: Only Administrators are permitted to audit and merge duplicate pupil records.');
      return;
    }
    if (duplicateStudentGroups.length === 0) {
      showToast('✨ No duplicate student records detected! All pupil records are unique across classes.');
    } else {
      setShowDuplicateAuditModal(true);
    }
  };

  const handleMergeAllDuplicatesAuto = () => {
    if (currentUser?.role !== 'Administrator') return;
    if (duplicateStudentGroups.length === 0) return;

    if (!confirm(`Are you sure you want to automatically merge all ${duplicateStudentGroups.length} duplicate pupil groups?\n\nFor each group, payment and exam fee histories will be safely reassigned to the primary pupil record, and redundant duplicates removed.`)) {
      return;
    }

    let mergedGroupsCount = 0;
    let totalDuplicatesRemoved = 0;

    duplicateStudentGroups.forEach(group => {
      const primary = group.candidates[0]; // First candidate as primary
      for (let i = 1; i < group.candidates.length; i++) {
        const dupCandidate = group.candidates[i];
        const res = mergeStudents(primary.id, dupCandidate.id);
        if (res.success) {
          totalDuplicatesRemoved++;
        }
      }
      mergedGroupsCount++;
    });

    showToast(`⚡ Successfully merged ${mergedGroupsCount} duplicate groups! Removed ${totalDuplicatesRemoved} redundant pupil records and preserved all financial check-ins.`);
    setShowDuplicateAuditModal(false);
  };

  // Percentage Wage / Salary Adjustment Modal states
  const [showSalaryAdjustModal, setShowSalaryAdjustModal] = useState(false);
  const [showTeacherSalaryIncrementModal, setShowTeacherSalaryIncrementModal] = useState(false);
  const [showAbsenteeEnquiryModal, setShowAbsenteeEnquiryModal] = useState(false);
  const [adjustTargetRole, setAdjustTargetRole] = useState<string>('All');
  const [adjustPercentage, setAdjustPercentage] = useState<number>(10);
  const [adjustMode, setAdjustMode] = useState<'increase' | 'decrease'>('increase');
  const [adjustReason, setAdjustReason] = useState<string>('Annual School Wage Boost & Promotion Adjustment');
  const [selectedStaffIdsForAdjust, setSelectedStaffIdsForAdjust] = useState<string[]>([]);
  const [salaryAdjustSearch, setSalaryAdjustSearch] = useState<string>('');
  const [salaryAdjustSuccessMsg, setSalaryAdjustSuccessMsg] = useState<string | null>(null);

  // Appointment Letter & Renewal Modal states
  const [appointmentModalUser, setAppointmentModalUser] = useState<any | null>(null);
  const [appLetterDate, setAppLetterDate] = useState('');
  const [appStartDate, setAppStartDate] = useState('');
  const [appEndDate, setAppEndDate] = useState('');
  const [appRenewalOpt, setAppRenewalOpt] = useState<'Automatic' | 'Manual Review' | 'Fixed Term' | 'Non-Renewable'>('Automatic');
  const [appRenewalPeriod, setAppRenewalPeriod] = useState('1 Year');
  const [appJobTitle, setAppJobTitle] = useState('');
  const [appDepartment, setAppDepartment] = useState('');
  const [appSalary, setAppSalary] = useState('');
  const [appAllowance, setAppAllowance] = useState('0.00');
  const [appSignatoryName, setAppSignatoryName] = useState('Madam Mary Appiah');
  const [appSignatoryTitle, setAppSignatoryTitle] = useState('Board Chairperson & Registrar');
  const [isRenewalTab, setIsRenewalTab] = useState(false); // active tab inside modal (Appointment vs Renewal Letter)
  const [appStaffSignature, setAppStaffSignature] = useState<string>('');
  const [appManagementSignature, setAppManagementSignature] = useState<string>('');
  const [appPersonalAddress, setAppPersonalAddress] = useState<string>('');

  // Teacher Professional & Ethics Evaluation state for Appointment / Re-appointment modal
  const [ethicsAcademicYear, setEthicsAcademicYear] = useState('2025/2026 Academic Year');
  const [selectedPositiveEthics, setSelectedPositiveEthics] = useState<string[]>([
    'Punctuality & Morning Assembly Attendance',
    'Scheme of Learning & Lesson Notes Submission',
    'Student Mentorship & Pastoral Care',
    'Assessment & Grading Integrity',
    'Professional Conduct & Staff Collaboration'
  ]);
  const [selectedNegativeEthics, setSelectedNegativeEthics] = useState<string[]>([]);
  const [ethicsQualificationStatus, setEthicsQualificationStatus] = useState<'Qualified (Full Increment)' | 'Qualified (Partial Increment)' | 'Withheld (Ethics Review)' | 'Maintained (No Change)'>('Qualified (Full Increment)');
  const [ethicsIncrementPercentage, setEthicsIncrementPercentage] = useState<number>(10);
  const [ethicsPreviousSalary, setEthicsPreviousSalary] = useState<number>(0);
  const [ethicsEvaluationNotes, setEthicsEvaluationNotes] = useState<string>('Teacher demonstrated exemplary professional ethics, regular attendance, and high student engagement in the previous academic year.');
  const [includeEthicsAnnexure, setIncludeEthicsAnnexure] = useState<boolean>(true);

  const ALL_POSITIVE_ETHICS = [
    'Punctuality & Morning Assembly Attendance',
    'Scheme of Learning & Daily Lesson Notes Submission',
    'Classroom Discipline & Positive Behavior Management',
    'Student Mentorship, Pastoral Care & Anti-Bullying Vigilance',
    'Assessment Integrity & Timely Exam Marking / Report Entry',
    'Active Pupil Attendance Register Marking & Truancy Tracking',
    'Integration of Teaching Aids, ICT & Interactive Learning Tools',
    'Active Duty Supervision (Gate, Playground, Dining & Assembly)',
    'Clean Disciplinary Record & Strict Code of Conduct Compliance',
    'Clean, Organized & Stimulating Classroom Environment Maintenance',
    'Regular Parent-Teacher Communication & Student Progress Reporting',
    'Professional Staff Collaboration, Peer Mentorship & Support',
    'Involvement in Co-Curricular Activities, Clubs & Sports',
    'Active Participation in Continuing Professional Development (CPD)',
    'Careful Care, Preservation & Inventory of School Property & Books'
  ];

  const ALL_NEGATIVE_ETHICS = [
    'Habitual Lateness or Unexcused Absence from Campus / Class',
    'Delayed Lesson Notes or Scheme of Learning Submission',
    'Delayed Assessment Marking, Report Card Entry or Grading Errors',
    'Poor Classroom Discipline / Excessive Noise or Pupil Chaos',
    'Unprofessional Language, Temperament or Conduct with Pupils / Staff',
    'Neglect of Assigned Duty Duties (Gate, Playground, Dining, Assembly)',
    'Inappropriate Mobile Phone Usage or Distraction During Class Hours',
    'Non-Compliance with Dress Code, Appearance or Grooming Standards',
    'Unexcused Absence from Staff Meetings, PTA or Training Seminars',
    'Neglect of Pupil Attendance Register Marking or Truancy Logs',
    'Irresponsible Handling, Damage or Loss of School Property / Textbooks',
    'Unauthorized Campus Absence or Class Abandonment Without Exeat'
  ];

  const getEthicsScoreDetails = (positives: string[], negatives: string[]) => {
    const maxPos = ALL_POSITIVE_ETHICS.length || 1;
    const posPercent = (positives.length / maxPos) * 100;
    const demeritDeductions = negatives.length * 8;
    const score = Math.max(0, Math.min(100, Math.round(posPercent - demeritDeductions)));
    let rating = 'Satisfactory';
    if (score >= 85) rating = 'Exemplary Conduct';
    else if (score >= 70) rating = 'Commendable Conduct';
    else if (score >= 50) rating = 'Satisfactory';
    else rating = 'Requires Ethics Review';
    return { score, rating };
  };

  const openAppointmentModal = (u: any) => {
    setAppointmentModalUser(u);
    setAppLetterDate(new Date().toISOString().split('T')[0]);
    setAppStartDate(u.appointmentDate || new Date().toISOString().split('T')[0]);
    
    if (u.contractEndDate) {
      setAppEndDate(u.contractEndDate);
    } else {
      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      setAppEndDate(oneYearLater.toISOString().split('T')[0]);
    }
    
    setAppRenewalOpt(u.renewalOption || 'Automatic');
    setAppRenewalPeriod(u.renewalPeriod || '1 Year');
    setAppJobTitle(u.role === 'Teacher' ? 'Classroom Educator' : u.role);
    setAppDepartment(u.department || (u.role === 'Teacher' ? 'Academic Department' : 'Administrative Department'));
    setAppSalary(u.stipendSalary?.toString() || '0.00');
    setAppAllowance('0.00');
    setAppStaffSignature(u.signatureUrl || '');
    setAppManagementSignature(u.managementSignatureUrl || '');
    setAppPersonalAddress(u.personalAddress || '');
    setIsRenewalTab(false);

    // Initialize Professional Ethics & Salary Promotion Evaluation
    const prevSalary = u.stipendSalary || 0;
    setEthicsPreviousSalary(prevSalary);
    if (u.ethicsEvaluation) {
      setEthicsAcademicYear(u.ethicsEvaluation.academicYear || '2025/2026 Academic Year');
      setSelectedPositiveEthics(u.ethicsEvaluation.positiveEthics || []);
      setSelectedNegativeEthics(u.ethicsEvaluation.negativeEthics || []);
      setEthicsQualificationStatus(u.ethicsEvaluation.qualificationStatus || 'Qualified (Full Increment)');
      setEthicsIncrementPercentage(u.ethicsEvaluation.incrementPercentage ?? 10);
      setEthicsEvaluationNotes(u.ethicsEvaluation.evaluationNotes || '');
    } else {
      setEthicsAcademicYear('2025/2026 Academic Year');
      setSelectedPositiveEthics([
        'Punctuality & Morning Assembly Attendance',
        'Scheme of Learning & Daily Lesson Notes Submission',
        'Classroom Discipline & Positive Behavior Management',
        'Student Mentorship, Pastoral Care & Anti-Bullying Vigilance',
        'Assessment Integrity & Timely Exam Marking / Report Entry',
        'Active Pupil Attendance Register Marking & Truancy Tracking',
        'Integration of Teaching Aids, ICT & Interactive Learning Tools',
        'Clean Disciplinary Record & Strict Code of Conduct Compliance'
      ]);
      setSelectedNegativeEthics([]);
      setEthicsQualificationStatus('Qualified (Full Increment)');
      setEthicsIncrementPercentage(10);
      setEthicsEvaluationNotes(`${u.name} has demonstrated commendable professional conduct, regular class attendance, and positive student outcomes in the preceding academic year.`);
    }
    setIncludeEthicsAnnexure(true);
  };

  const handleSaveAppointment = () => {
    if (!appointmentModalUser) return;

    const { score, rating } = getEthicsScoreDetails(selectedPositiveEthics, selectedNegativeEthics);

    const currentEthicsPayload: TeacherEthicsEvaluation = {
      academicYear: ethicsAcademicYear,
      positiveEthics: selectedPositiveEthics,
      negativeEthics: selectedNegativeEthics,
      overallScore: score,
      overallRating: rating,
      qualificationStatus: ethicsQualificationStatus,
      incrementPercentage: ethicsIncrementPercentage,
      previousSalary: ethicsPreviousSalary,
      proposedSalary: parseFloat(appSalary) || 0,
      evaluatedBy: appSignatoryName,
      evaluatedDate: appLetterDate,
      evaluationNotes: ethicsEvaluationNotes
    };

    const res = updateStaff(
      appointmentModalUser.id,
      appointmentModalUser.name,
      appointmentModalUser.email,
      appointmentModalUser.role,
      appointmentModalUser.assignedClass,
      !!appointmentModalUser.mfaEnabled,
      !!appointmentModalUser.passwordEnabled,
      appointmentModalUser.password || '',
      appointmentModalUser.role === 'Teacher' ? (appointmentModalUser.assignedClasses || (appointmentModalUser.assignedClass ? [appointmentModalUser.assignedClass] : [])) : undefined,
      parseFloat(appSalary) || undefined,
      appointmentModalUser.momoNumber,
      appointmentModalUser.momoName,
      appointmentModalUser.photoUrl,
      appointmentModalUser.employeeId,
      appDepartment,
      appointmentModalUser.gender,
      appointmentModalUser.employmentType,
      !!appointmentModalUser.idCardDeactivated,
      appStartDate,
      appEndDate,
      appRenewalOpt,
      appRenewalPeriod,
      appStaffSignature,
      appManagementSignature,
      appPersonalAddress,
      currentEthicsPayload
    );

    if (res.success) {
      setAppointmentModalUser({
        ...appointmentModalUser,
        stipendSalary: parseFloat(appSalary),
        department: appDepartment,
        appointmentDate: appStartDate,
        contractEndDate: appEndDate,
        renewalOption: appRenewalOpt,
        renewalPeriod: appRenewalPeriod,
        signatureUrl: appStaffSignature,
        managementSignatureUrl: appManagementSignature,
        personalAddress: appPersonalAddress,
        ethicsEvaluation: currentEthicsPayload
      });
      showToast("Appointment terms & ethics evaluation successfully updated in system registers.");
    } else {
      showToast(res.error || "Failed to save appointment terms.");
    }
  };

  const handleProcessRenewal = (monthsCount: number, stipendAdjustment: number, renewalClause: typeof appRenewalOpt) => {
    if (!appointmentModalUser) return;
    
    const baseDate = appEndDate ? new Date(appEndDate) : new Date();
    baseDate.setMonth(baseDate.getMonth() + monthsCount);
    const newEndDate = baseDate.toISOString().split('T')[0];
    
    const newSalary = (parseFloat(appSalary) || 0) + stipendAdjustment;
    const newRenewalPeriodStr = `${monthsCount >= 12 ? (monthsCount / 12).toFixed(0) + ' Year(s)' : monthsCount + ' Month(s)'}`;

    const { score, rating } = getEthicsScoreDetails(selectedPositiveEthics, selectedNegativeEthics);

    const currentEthicsPayload: TeacherEthicsEvaluation = {
      academicYear: ethicsAcademicYear,
      positiveEthics: selectedPositiveEthics,
      negativeEthics: selectedNegativeEthics,
      overallScore: score,
      overallRating: rating,
      qualificationStatus: ethicsQualificationStatus,
      incrementPercentage: ethicsIncrementPercentage,
      previousSalary: ethicsPreviousSalary,
      proposedSalary: newSalary || 0,
      evaluatedBy: appSignatoryName,
      evaluatedDate: appLetterDate,
      evaluationNotes: ethicsEvaluationNotes
    };

    const res = updateStaff(
      appointmentModalUser.id,
      appointmentModalUser.name,
      appointmentModalUser.email,
      appointmentModalUser.role,
      appointmentModalUser.assignedClass,
      !!appointmentModalUser.mfaEnabled,
      !!appointmentModalUser.passwordEnabled,
      appointmentModalUser.password || '',
      appointmentModalUser.role === 'Teacher' ? (appointmentModalUser.assignedClasses || (appointmentModalUser.assignedClass ? [appointmentModalUser.assignedClass] : [])) : undefined,
      newSalary || undefined,
      appointmentModalUser.momoNumber,
      appointmentModalUser.momoName,
      appointmentModalUser.photoUrl,
      appointmentModalUser.employeeId,
      appDepartment,
      appointmentModalUser.gender,
      appointmentModalUser.employmentType,
      !!appointmentModalUser.idCardDeactivated,
      appStartDate,
      newEndDate,
      renewalClause,
      newRenewalPeriodStr,
      appStaffSignature,
      appManagementSignature,
      appPersonalAddress,
      currentEthicsPayload
    );

    if (res.success) {
      const extensionDateFormatted = new Date(newEndDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      setAppEndDate(newEndDate);
      setAppSalary(newSalary.toString());
      setAppRenewalOpt(renewalClause);
      setAppRenewalPeriod(newRenewalPeriodStr);
      setAppointmentModalUser({
        ...appointmentModalUser,
        stipendSalary: newSalary,
        contractEndDate: newEndDate,
        renewalOption: renewalClause,
        renewalPeriod: newRenewalPeriodStr,
        signatureUrl: appStaffSignature,
        managementSignatureUrl: appManagementSignature,
        personalAddress: appPersonalAddress,
        ethicsEvaluation: currentEthicsPayload
      });
      
      playFeedbackSound('confirm');
      showToast(`Appointment successfully renewed for ${appointmentModalUser.name} until ${extensionDateFormatted}!`);
    } else {
      showToast(res.error || "Failed to process renewal contract.");
    }
  };

  const handlePrintAppointmentLetter = (isRenewalLetter = false) => {
    if (!appointmentModalUser) return;

    let printIframe = document.getElementById('letter-print-iframe') as HTMLIFrameElement;
    if (!printIframe) {
      printIframe = document.createElement('iframe');
      printIframe.id = 'letter-print-iframe';
      printIframe.setAttribute('style', 'position:fixed; right:0; bottom:0; width:0; height:0; border:0; pointer-events:none;');
      document.body.appendChild(printIframe);
    }

    const iframeDoc = printIframe.contentWindow?.document || printIframe.contentDocument;
    if (!iframeDoc) return;

    const formattedLetterDate = new Date(appLetterDate || new Date()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const formattedStartDate = new Date(appStartDate || new Date()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const formattedEndDate = new Date(appEndDate || new Date()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const schoolName = systemSettings?.schoolName || 'SAWLA COMPREHENSIVE ACADEMY';
    const schoolSlogan = systemSettings?.schoolSlogan || systemSettings?.customMotto || 'Holiness is our key';
    const schoolAddress = systemSettings?.schoolBoxAddress || 'P. O. Box LS 15, Sawla Savannah Region • Sawla, Jelinkon street, Savannah Region, Ghana';
    const schoolPhone = systemSettings?.schoolPhone || '+233 24 123 4567';
    const schoolEmail = systemSettings?.schoolEmail || 'info@sawlacomprehensive.edu.gh';

    const getLogoSvgHtml = (size = 90, forceFallback = false): string => {
      if (systemSettings?.schoolLogoUrl && !forceFallback) {
        const fallbackSvg = getLogoSvgHtml(size, true);
        return `
          <div style="display: inline-block; width: ${size}px; height: ${size}px; position: relative; vertical-align: middle;">
            <img src="${systemSettings.schoolLogoUrl}" style="width: ${size}px; height: ${size}px; object-fit: contain; border-radius: 50%;" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';" />
            <span style="display: none; width: ${size}px; height: ${size}px; vertical-align: top;">
              ${fallbackSvg}
            </span>
          </div>
        `;
      }
      const sName = schoolName.toUpperCase();
      const sLoc = systemSettings?.customLocation || 'Sawla';
      const sMotto = systemSettings?.customMotto || 'Holiness Is Our Key';
      return `
        <svg width="${size}" height="${size}" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <path id="academy-text-arc" d="M 52 205 A 148 148 0 1 1 348 205" fill="none" />
          </defs>
          <circle cx="200" cy="200" r="190" fill="#ffffff" stroke="#04563a" strokeWidth="11" />
          <circle cx="200" cy="200" r="146" fill="none" stroke="#04563a" strokeWidth="3.5" />
          <text>
            <textPath href="#academy-text-arc" startOffset="50%" textAnchor="middle" fill="#04563a" fontWeight="900" fontSize="23" letterSpacing="1px" fontFamily="system-ui, -apple-system, sans-serif">
              ${sName}
            </textPath>
          </text>
          <g id="central-heraldic-shield">
            <path d="M 98 185 A 102 102 0 0 1 302 185 Z" fill="#009e60" stroke="#04563a" strokeWidth="3" />
            <path d="M 98 185 A 102 102 0 0 0 200 287 L 200 185 Z" fill="#024227" stroke="#04563a" strokeWidth="3" />
            <path d="M 200 185 L 200 287 A 102 102 0 0 0 302 185 Z" fill="#fbf7f4" stroke="#04563a" strokeWidth="3" />
          </g>
          <g id="upper-hemisphere-book-pen">
            <path d="M 134 180 C 168 174, 192 174, 200 181 C 208 174, 232 174, 266 180" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
            <path d="M 200 180 C 185 160, 163 160, 138 168 L 138 141 C 163 133, 185 133, 200 153 Z" fill="#d0f2e5" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M 200 180 C 215 160, 237 160, 262 168 L 262 141 C 237 133, 215 133, 200 153 Z" fill="#d0f2e5" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M 241 114 L 189 171 L 184 172 L 187 167 L 235 110 Z" fill="#ffffff" stroke="#04563a" strokeWidth="1.5" />
            <line x1="225" y1="126" x2="201" y2="152" stroke="#04563a" strokeWidth="1.5" />
          </g>
          <g id="lower-left-farming-tools">
            <path d="M 125 240 Q 120 230 131 228 L 150 242 L 139 254 Z" fill="#b0bec5" stroke="#37474f" strokeWidth="1.5" strokeLinejoin="round" />
            <line x1="127" y1="239" x2="187" y2="208" stroke="#cca480" strokeWidth="4" strokeLinecap="round" />
            <path d="M 179 248 C 170 230, 155 212, 140 204 L 144 200 C 160 209, 175 228, 184 246 Z" fill="#eceff1" stroke="#455a64" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="181" y="245" width="5" height="10" transform="rotate(25 181 245)" fill="#6d4c41" stroke="#3e2723" strokeWidth="1.2" />
          </g>
          <g id="lower-right-hearth-broom">
            <path d="M 222 205 L 232 200 L 236 211 L 226 216 Z" fill="#212121" stroke="#000000" strokeWidth="1" />
            <line x1="227" y1="205" x2="263" y2="263" stroke="#424242" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="227" y1="205" x2="251" y2="267" stroke="#333333" strokeWidth="2.0" strokeLinecap="round" />
            <line x1="227" y1="205" x2="274" y2="257" stroke="#424242" strokeWidth="2.0" strokeLinecap="round" />
            <line x1="227" y1="205" x2="241" y2="268" stroke="#212121" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="227" y1="205" x2="281" y2="249" stroke="#555555" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="227" y1="205" x2="232" y2="269" stroke="#555555" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="225" y="209" width="9" height="3" rx="0.5" fill="#fbc02d" />
            <rect x="227" y="215" width="10" height="3.5" rx="0.5" fill="#fbc02d" transform="rotate(-15 227 215)" />
          </g>
          <g id="bottom-crest-banner">
            <circle cx="106" cy="303" r="18" fill="#024227" stroke="#04563a" strokeWidth="2.5" />
            <text x="106" y="308" textAnchor="middle" fill="#ffffff" fontWeight="900" fontSize="13" fontFamily="system-ui, -apple-system, sans-serif">20</text>
            <circle cx="294" cy="303" r="18" fill="#024227" stroke="#04563a" strokeWidth="2.5" />
            <text x="294" y="308" textAnchor="middle" fill="#ffffff" fontWeight="900" fontSize="13" fontFamily="system-ui, -apple-system, sans-serif">03</text>
            <path d="M 120 307 Q 200 334 280 307 L 277 285 Q 200 312 123 285 Z" fill="#024227" stroke="#04563a" strokeWidth="3.5" strokeLinejoin="round" />
            <text x="200" y="304" textAnchor="middle" fill="#ffffff" fontWeight="900" fontSize="14" letterSpacing="1px" fontFamily="system-ui, -apple-system, sans-serif">${sLoc}</text>
          </g>
          <text x="200" y="346" textAnchor="middle" fill="#024227" fontWeight="900" fontSize="13" letterSpacing="0.8px" fontFamily="Georgia, serif">${sMotto}</text>
        </svg>
      `;
    };

    let htmlContent = '';

    if (!isRenewalLetter) {
      htmlContent = `
        <html>
          <head>
            <title>Letter of Appointment - ${appointmentModalUser.name}</title>
            <style>
              body {
                font-family: 'Times New Roman', Times, serif;
                margin: 50px;
                line-height: 1.6;
                color: #1f2937;
                font-size: 14px;
                position: relative;
              }
              .letterhead {
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 3px double #04563a;
                padding-bottom: 15px;
                margin-bottom: 35px;
              }
              .letterhead-logo {
                width: 95px;
                height: 95px;
                flex-shrink: 0;
              }
              .letterhead-details {
                text-align: right;
                flex-grow: 1;
                padding-left: 20px;
              }
              .school-name {
                font-family: 'Georgia', serif;
                font-size: 24px;
                font-weight: 800;
                color: #024227;
                letter-spacing: 0.5px;
                margin: 0;
                text-transform: uppercase;
              }
              .school-slogan {
                font-family: 'Georgia', serif;
                font-size: 11px;
                font-style: italic;
                margin: 3px 0 6px 0;
                color: #d97706;
                font-weight: bold;
              }
              .school-contact {
                font-size: 10px;
                color: #4b5563;
                margin: 1px 0;
                font-family: Arial, sans-serif;
              }
              .watermark-container {
                position: absolute;
                top: 45%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-12deg);
                opacity: 0.04;
                pointer-events: none;
                z-index: -1;
              }
              .letter-date {
                text-align: right;
                margin-bottom: 25px;
                font-weight: bold;
                font-family: Arial, sans-serif;
                font-size: 12px;
                color: #374151;
              }
              .recipient-info {
                margin-bottom: 30px;
                line-height: 1.5;
                font-family: Arial, sans-serif;
                font-size: 12px;
                color: #374151;
              }
              .recipient-name {
                font-weight: bold;
                font-size: 14px;
                color: #024227;
                font-family: 'Times New Roman', serif;
              }
              .letter-subject {
                text-align: center;
                font-weight: bold;
                font-size: 15px;
                text-decoration: underline;
                text-transform: uppercase;
                margin: 25px 0;
                color: #024227;
                font-family: 'Georgia', serif;
                letter-spacing: 0.3px;
              }
              .letter-body {
                text-align: justify;
              }
              .clause-title {
                font-weight: bold;
                margin-top: 20px;
                margin-bottom: 5px;
                color: #024227;
                font-family: 'Georgia', serif;
                font-size: 13px;
              }
              .signature-section {
                margin-top: 55px;
                display: flex;
                justify-content: space-between;
                page-break-inside: avoid;
              }
              .signature-block {
                width: 45%;
              }
              .signature-line {
                border-top: 1px solid #777;
                margin-top: 45px;
                padding-top: 5px;
                text-align: center;
                font-size: 12px;
              }
              @media print {
                body { margin: 30px; }
              }
            </style>
          </head>
          <body>
            <div class="letterhead">
              <div class="letterhead-logo">
                ${getLogoSvgHtml(95)}
              </div>
              <div class="letterhead-details">
                <div class="school-name">${schoolName}</div>
                <div class="school-slogan">${schoolSlogan}</div>
                <div class="school-contact">${schoolAddress}</div>
                <div class="school-contact">Tel: ${schoolPhone} | Email: ${schoolEmail}</div>
              </div>
            </div>

            <div class="watermark-container">
              ${getLogoSvgHtml(380)}
            </div>

            <div class="letter-date">Date: ${formattedLetterDate}</div>

            <div class="recipient-info">
              To:<br/>
              <span class="recipient-name">${appointmentModalUser.name}</span><br/>
              ${appPersonalAddress ? appPersonalAddress.replace(/\n/g, '<br/>') : `${appDepartment}<br/>Personal Address Not Set`}
            </div>

            <div class="letter-subject">RE: LETTER OF APPOINTMENT AS ${appJobTitle.toUpperCase()}</div>

            <div class="letter-body">
              <p>Dear ${appointmentModalUser.name.split(' ')[0] || 'Sir/Madam'},</p>
              
              <p>On behalf of the Board of Directors and the Management of <strong>${schoolName}</strong>, I am pleased to offer you a formal appointment as <strong>${appJobTitle}</strong> in the ${appDepartment}, effective from <strong>${formattedStartDate}</strong>.</p>
              
              <p>This appointment is subject to the following core terms and conditions of employment:</p>

              <div class="clause-title">1. Duties and Responsibilities</div>
              <p>Your duties shall include, but are not limited to, the instruction of students, curriculum development, classroom management, student assessment verification, active checkpoint gate registry audits, and any other academic or administrative responsibilities as assigned by the Headmaster or School Board.</p>

              <div class="clause-title">2. Salary and Remuneration</div>
              <p>You will receive a basic monthly stipend of <strong>GHC ${parseFloat(appSalary).toFixed(2)}</strong>, payable on or before the last working day of each calendar month. This remuneration is subject to periodic reviews based on performance audits and school development metrics.</p>

              <div class="clause-title">3. Contract Term and Renewal Options</div>
              <p>This appointment is on a <strong>${appointmentModalUser.employmentType || 'Full-Time'}</strong> basis starting on <strong>${formattedStartDate}</strong> and scheduled to conclude on <strong>${formattedEndDate}</strong>. The contract includes the following renewal provision: <strong>${appRenewalOpt}</strong>. Under this clause, any extension will be subject to a <strong>${appRenewalPeriod}</strong> extension period upon mutual consent and performance audits.</p>

              <div class="clause-title">4. Code of Conduct</div>
              <p>You are expected to adhere to the highest standard of professional ethics, respect student confidentiality, uphold classroom attendance registries, and strictly comply with the school's regulations and child protection policies.</p>

              <p>If you accept these terms of appointment, please sign and return the duplicate copy of this letter to the administrative office.</p>
              
              <p>We look forward to your valuable contribution to academic excellence at our institution.</p>
              
              <p>Yours faithfully,</p>
            </div>

            <div class="signature-section">
              <div class="signature-block">
                For School Management:<br/>
                <div style="height: 50px; display: flex; align-items: flex-end; justify-content: center; margin-bottom: 5px;">
                  ${appManagementSignature ? `<img src="${appManagementSignature}" style="max-height: 50px; max-width: 150px; object-fit: contain;" />` : ''}
                </div>
                <div class="signature-line">
                  <strong>${appSignatoryName}</strong><br/>
                  ${appSignatoryTitle}
                </div>
              </div>
              
              <div class="signature-block" style="text-align: right;">
                Employee Acceptance:<br/>
                <div style="height: 50px; display: flex; align-items: flex-end; justify-content: center; margin-bottom: 5px;">
                  ${appStaffSignature ? `<img src="${appStaffSignature}" style="max-height: 50px; max-width: 150px; object-fit: contain;" />` : ''}
                </div>
                <div class="signature-line" style="text-align: center;">
                  <strong>${appointmentModalUser.name}</strong><br/>
                  Signature & Date
                </div>
              </div>
            </div>
          </body>
        </html>
      `;
    } else {
      htmlContent = `
        <html>
          <head>
            <title>Letter of Contract Renewal - ${appointmentModalUser.name}</title>
            <style>
              body {
                font-family: 'Times New Roman', Times, serif;
                margin: 50px;
                line-height: 1.6;
                color: #1f2937;
                font-size: 14px;
                position: relative;
              }
              .letterhead {
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 3px double #04563a;
                padding-bottom: 15px;
                margin-bottom: 35px;
              }
              .letterhead-logo {
                width: 95px;
                height: 95px;
                flex-shrink: 0;
              }
              .letterhead-details {
                text-align: right;
                flex-grow: 1;
                padding-left: 20px;
              }
              .school-name {
                font-family: 'Georgia', serif;
                font-size: 24px;
                font-weight: 800;
                color: #024227;
                letter-spacing: 0.5px;
                margin: 0;
                text-transform: uppercase;
              }
              .school-slogan {
                font-family: 'Georgia', serif;
                font-size: 11px;
                font-style: italic;
                margin: 3px 0 6px 0;
                color: #d97706;
                font-weight: bold;
              }
              .school-contact {
                font-size: 10px;
                color: #4b5563;
                margin: 1px 0;
                font-family: Arial, sans-serif;
              }
              .watermark-container {
                position: absolute;
                top: 45%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-12deg);
                opacity: 0.04;
                pointer-events: none;
                z-index: -1;
              }
              .letter-date {
                text-align: right;
                margin-bottom: 25px;
                font-weight: bold;
                font-family: Arial, sans-serif;
                font-size: 12px;
                color: #374151;
              }
              .recipient-info {
                margin-bottom: 30px;
                line-height: 1.5;
                font-family: Arial, sans-serif;
                font-size: 12px;
                color: #374151;
              }
              .recipient-name {
                font-weight: bold;
                font-size: 14px;
                color: #024227;
                font-family: 'Times New Roman', serif;
              }
              .letter-subject {
                text-align: center;
                font-weight: bold;
                font-size: 15px;
                text-decoration: underline;
                text-transform: uppercase;
                margin: 25px 0;
                color: #024227;
                font-family: 'Georgia', serif;
                letter-spacing: 0.3px;
              }
              .letter-body {
                text-align: justify;
              }
              .clause-title {
                font-weight: bold;
                margin-top: 20px;
                margin-bottom: 5px;
                color: #024227;
                font-family: 'Georgia', serif;
                font-size: 13px;
              }
              .signature-section {
                margin-top: 55px;
                display: flex;
                justify-content: space-between;
                page-break-inside: avoid;
              }
              .signature-block {
                width: 45%;
              }
              .signature-line {
                border-top: 1px solid #777;
                margin-top: 45px;
                padding-top: 5px;
                text-align: center;
                font-size: 12px;
              }
              @media print {
                body { margin: 30px; }
              }
            </style>
          </head>
          <body>
            <div class="letterhead">
              <div class="letterhead-logo">
                ${getLogoSvgHtml(95)}
              </div>
              <div class="letterhead-details">
                <div class="school-name">${schoolName}</div>
                <div class="school-slogan">${schoolSlogan}</div>
                <div class="school-contact">${schoolAddress}</div>
                <div class="school-contact">Tel: ${schoolPhone} | Email: ${schoolEmail}</div>
              </div>
            </div>

            <div class="watermark-container">
              ${getLogoSvgHtml(380)}
            </div>

            <div class="letter-date">Date: ${formattedLetterDate}</div>

            <div class="recipient-info">
              To:<br/>
              <span class="recipient-name">${appointmentModalUser.name}</span><br/>
              ${appPersonalAddress ? appPersonalAddress.replace(/\n/g, '<br/>') : `${appDepartment}<br/>Personal Address Not Set`}
            </div>

            <div class="letter-subject">RE: RENEWAL & EXTENSION OF APPOINTMENT CONTRACT</div>

            <div class="letter-body">
              <p>Dear ${appointmentModalUser.name.split(' ')[0] || 'Sir/Madam'},</p>
              
              <p>Following a comprehensive review of your service records, student registry metrics, and gate operations oversight, we are pleased to inform you that the Management Board of <strong>${schoolName}</strong> has approved the renewal of your employment contract.</p>
              
              <p>The terms and conditions of this renewal and extension are detailed below:</p>

              <div class="clause-title">1. Period of Extension</div>
              <p>Your appointment has been extended for a further period of <strong>${appRenewalPeriod}</strong>, commencing immediately upon the expiration of your previous term, and is now scheduled to conclude on <strong>${formattedEndDate}</strong>.</p>

              <div class="clause-title">2. Adjusted Remuneration</div>
              <p>Effective from the start of this extension, your basic monthly stipend is adjusted to <strong>GHC ${parseFloat(appSalary).toFixed(2)}</strong>. This is a reflection of your dedication to the growth of our institution. All other components of your financial contract, including registered MoMo payout details, remain active.</p>

              <div class="clause-title">3. Future Renewal Parameters</div>
              <p>This renewed contract holds the following renewal clause status: <strong>${appRenewalOpt}</strong>. A subsequent extension or review will be initiated towards the end of this current term, subject to performance metrics.</p>

              <div class="clause-title">4. Terms and Continuity</div>
              <p>All other administrative guidelines, teacher code of conduct parameters, and registry obligations as specified in your original Letter of Appointment remain in full force and effect during this extension period.</p>

              <p>Please indicate your acceptance of this renewal contract and its terms by signing and returning the duplicate copy of this extension notice to the admin desk.</p>
              
              <p>Congratulations on this well-deserved renewal. We appreciate your continued partnership in guiding our scholars.</p>
              
              <p>Yours faithfully,</p>
            </div>

            <div class="signature-section">
              <div class="signature-block">
                For School Management:<br/>
                <div style="height: 50px; display: flex; align-items: flex-end; justify-content: center; margin-bottom: 5px;">
                  ${appManagementSignature ? `<img src="${appManagementSignature}" style="max-height: 50px; max-width: 150px; object-fit: contain;" />` : ''}
                </div>
                <div class="signature-line">
                  <strong>${appSignatoryName}</strong><br/>
                  ${appSignatoryTitle}
                </div>
              </div>
              
              <div class="signature-block" style="text-align: right;">
                Employee Acceptance:<br/>
                <div style="height: 50px; display: flex; align-items: flex-end; justify-content: center; margin-bottom: 5px;">
                  ${appStaffSignature ? `<img src="${appStaffSignature}" style="max-height: 50px; max-width: 150px; object-fit: contain;" />` : ''}
                </div>
                <div class="signature-line" style="text-align: center;">
                  <strong>${appointmentModalUser.name}</strong><br/>
                  Signature & Date
                </div>
              </div>
            </div>

            ${includeEthicsAnnexure ? `
              <div style="margin-top: 35px; page-break-before: auto; border-top: 2px solid #024227; padding-top: 15px;">
                <div style="font-family: 'Georgia', serif; font-size: 12px; font-weight: bold; color: #024227; text-transform: uppercase; text-align: center; margin-bottom: 3px; letter-spacing: 0.5px;">
                  ANNEXURE: TEACHER PROFESSIONAL ETHICS & SALARY PROMOTION EVALUATION
                </div>
                <div style="font-size: 10px; color: #4b5563; font-style: italic; text-align: center; margin-bottom: 12px; font-family: Arial, sans-serif;">
                  Behavioral & Professional Audit for Preceding Academic Period (${ethicsAcademicYear})
                </div>

                <table style="width: 100%; border-collapse: collapse; font-size: 10px; font-family: Arial, sans-serif; margin-bottom: 12px;">
                  <thead>
                    <tr style="background-color: #f3f4f6; color: #024227;">
                      <th style="border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; width: 50%; font-weight: bold;">
                        Positive Ethics & Commendable Behaviors Observed (${selectedPositiveEthics.length})
                      </th>
                      <th style="border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; width: 50%; font-weight: bold;">
                        Infractions & Areas of Improvement (${selectedNegativeEthics.length})
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style="border: 1px solid #d1d5db; padding: 8px; vertical-align: top; color: #065f46; line-height: 1.4;">
                        ${selectedPositiveEthics.length > 0 
                          ? `<ul style="margin: 0; padding-left: 14px;">${selectedPositiveEthics.map(item => `<li style="margin-bottom: 3px;"><strong>✓</strong> ${item}</li>`).join('')}</ul>`
                          : '<span style="color: #6b7280; font-style: italic;">No specific positive ethics highlighted.</span>'
                        }
                      </td>
                      <td style="border: 1px solid #d1d5db; padding: 8px; vertical-align: top; color: #991b1b; line-height: 1.4;">
                        ${selectedNegativeEthics.length > 0 
                          ? `<ul style="margin: 0; padding-left: 14px;">${selectedNegativeEthics.map(item => `<li style="margin-bottom: 3px;"><strong>⚠</strong> ${item}</li>`).join('')}</ul>`
                          : '<div style="color: #059669; font-weight: bold;">✓ Clean Ethics Record (Zero demerits or queries recorded)</div>'
                        }
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 10px 12px; font-family: Arial, sans-serif; line-height: 1.5;">
                  <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 4px;">
                    <span><strong>Conduct Score & Rating:</strong></span>
                    <span style="font-weight: bold; color: #024227;">
                      ${getEthicsScoreDetails(selectedPositiveEthics, selectedNegativeEthics).score}% 
                      (${getEthicsScoreDetails(selectedPositiveEthics, selectedNegativeEthics).rating})
                    </span>
                  </div>

                  <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 4px;">
                    <span><strong>Salary Increment Qualification Status:</strong></span>
                    <span style="font-weight: bold; color: ${ethicsQualificationStatus.includes('Qualified') ? '#065f46' : '#b91c1c'}; text-transform: uppercase;">
                      ${ethicsQualificationStatus}
                    </span>
                  </div>

                  <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 4px;">
                    <span><strong>Administrator Selected Increment Rate:</strong></span>
                    <span style="font-weight: bold; color: #024227;">
                      ${ethicsIncrementPercentage >= 0 ? `+${ethicsIncrementPercentage}%` : `${ethicsIncrementPercentage}%`}
                    </span>
                  </div>

                  <div style="border-top: 1px dashed #cbd5e1; padding-top: 6px; margin-top: 6px; font-size: 10px;">
                    <strong>Remuneration Adjustment Breakdown:</strong> Previous Base: <strong>GHC ${ethicsPreviousSalary.toFixed(2)}</strong> &nbsp;➔&nbsp; Approved Increase (${ethicsIncrementPercentage >= 0 ? '+' : ''}${ethicsIncrementPercentage}%): <strong style="color: #059669;">${ethicsIncrementPercentage >= 0 ? '+GHC' : '-GHC'} ${Math.abs(ethicsPreviousSalary * ethicsIncrementPercentage / 100).toFixed(2)}</strong> &nbsp;➔&nbsp; Final Monthly Stipend: <strong style="color: #024227; font-size: 11px;">GHC ${parseFloat(appSalary || '0').toFixed(2)}</strong>
                  </div>

                  ${ethicsEvaluationNotes ? `<div style="margin-top: 6px; font-size: 9px; color: #475569; font-style: italic;"><strong>Administrator Remarks:</strong> ${ethicsEvaluationNotes}</div>` : ''}
                </div>
              </div>
            ` : ''}
          </body>
        </html>
      `;
    }

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    setTimeout(() => {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
    }, 500);
  };

  const [showLedgerSwitchModal, setShowLedgerSwitchModal] = useState(false);
  const [isSyncingTransition, setIsSyncingTransition] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showPurgeDemoConfirm, setShowPurgeDemoConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [backupLabel, setBackupLabel] = useState('');
  const [showRestoreConfirmId, setShowRestoreConfirmId] = useState<string | null>(null);
  const [showBackupPurgeConfirm, setShowBackupPurgeConfirm] = useState(false);
  const [selectedIdCardStudent, setSelectedIdCardStudent] = useState<Student | null>(null);
  const [historyModalStudent, setHistoryModalStudent] = useState<Student | null>(null);
  const [isEditingPortfolio, setIsEditingPortfolio] = useState(false);
  const [portfolioEditName, setPortfolioEditName] = useState("");
  const [portfolioEditPhone, setPortfolioEditPhone] = useState("");
  const [portfolioEditPhoto, setPortfolioEditPhoto] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (historyModalStudent) {
      setPortfolioEditName(historyModalStudent.name || '');
      setPortfolioEditPhone(historyModalStudent.guardianPhone || '');
      setPortfolioEditPhoto(historyModalStudent.photoUrl);
      setIsEditingPortfolio(false);
    }
  }, [historyModalStudent]);

  const [idCardQrDataUrl, setIdCardQrDataUrl] = useState<string>('');
  const [idCardTheme, setIdCardTheme] = useState<'dark' | 'light'>('dark');

  // Bulk print student ID cards state
  const [showBulkPrintModal, setShowBulkPrintModal] = useState(false);
  const [bulkPrintSelectedIds, setBulkPrintSelectedIds] = useState<string[]>([]);
  const [bulkPrintClassFilter, setBulkPrintClassFilter] = useState<string>('all');
  const [bulkPrintTheme, setBulkPrintTheme] = useState<'dark' | 'light'>('dark');
  const [bulkQrCodes, setBulkQrCodes] = useState<Record<string, string>>({});
  const [bulkPrintSearch, setBulkPrintSearch] = useState<string>('');
  const [bulkPreviewStudentId, setBulkPreviewStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedIdCardStudent) {
      // Encode both name and unique ID into the QR Code for robust check-in scanning
      const qrPayload = JSON.stringify({
        id: selectedIdCardStudent.id,
        name: selectedIdCardStudent.name,
        rollNumber: selectedIdCardStudent.rollNumber || ''
      });

      QRCode.toDataURL(qrPayload, {
        margin: 1,
        width: 150,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
        .then(url => {
          setIdCardQrDataUrl(url);
        })
        .catch(err => {
          console.error("Failed to generate QR Code offline using local qrcode library", err);
          setIdCardQrDataUrl('');
        });
    } else {
      setIdCardQrDataUrl('');
    }
  }, [selectedIdCardStudent]);
  
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
          backups
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

  // Compute filtered students for bulk print picker
  const bulkFilteredStudents = useMemo(() => {
    return students.filter(st => {
      if (!st.active) return false; // Only active students
      if (bulkPrintClassFilter !== 'all' && st.class !== bulkPrintClassFilter) return false;
      if (bulkPrintSearch) {
        const query = bulkPrintSearch.toLowerCase();
        const matchesName = st.name.toLowerCase().includes(query);
        const matchesId = st.id.toLowerCase().includes(query) || (st.rollNumber && st.rollNumber.toLowerCase().includes(query));
        if (!matchesName && !matchesId) return false;
      }
      return true;
    });
  }, [students, bulkPrintClassFilter, bulkPrintSearch]);

  // Set first filtered student as active preview if none or mismatch
  useEffect(() => {
    if (bulkFilteredStudents.length > 0 && (!bulkPreviewStudentId || !bulkFilteredStudents.some(s => s.id === bulkPreviewStudentId))) {
      setBulkPreviewStudentId(bulkFilteredStudents[0].id);
    } else if (bulkFilteredStudents.length === 0) {
      setBulkPreviewStudentId(null);
    }
  }, [bulkFilteredStudents, bulkPreviewStudentId]);

  const generateBulkQrCodes = async (studentsList: Student[]) => {
    const codes: Record<string, string> = { ...bulkQrCodes };
    let updated = false;
    for (const student of studentsList) {
      if (codes[student.id]) continue;
      const qrPayload = JSON.stringify({
        id: student.id,
        name: student.name,
        rollNumber: student.rollNumber || ''
      });
      try {
        const url = await QRCode.toDataURL(qrPayload, {
          margin: 1,
          width: 150,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });
        codes[student.id] = url;
        updated = true;
      } catch (err) {
        console.error("Failed to generate bulk QR code", err);
      }
    }
    if (updated) {
      setBulkQrCodes(codes);
    }
  };

  useEffect(() => {
    if (showBulkPrintModal && bulkFilteredStudents.length > 0) {
      generateBulkQrCodes(bulkFilteredStudents);
    }
  }, [showBulkPrintModal, bulkFilteredStudents]);

  const handleBulkPrint = async () => {
    const selectedStudents = students.filter(s => bulkPrintSelectedIds.includes(s.id));
    if (selectedStudents.length === 0) {
      alert("No students selected for printing.");
      return;
    }

    // Double check missing QR codes
    const missingStudents = selectedStudents.filter(s => !bulkQrCodes[s.id]);
    if (missingStudents.length > 0) {
      await generateBulkQrCodes(selectedStudents);
    }

    let printIframe = document.getElementById('idcard-print-iframe') as HTMLIFrameElement;
    if (!printIframe) {
      printIframe = document.createElement('iframe');
      printIframe.id = 'idcard-print-iframe';
      printIframe.setAttribute('style', 'position:fixed; right:0; bottom:0; width:0; height:0; border:0; pointer-events:none;');
      document.body.appendChild(printIframe);
    }

    const iframeDoc = printIframe.contentWindow?.document || printIframe.contentDocument;
    if (!iframeDoc) return;

    const isDarkTheme = bulkPrintTheme === 'dark';
    const schoolName = systemSettings?.schoolName || 'SAAKO HOLY CHILD ACADEMY';
    const getLogoSvgHtml = (size = 18, forceFallback = false): string => {
      if (systemSettings?.schoolLogoUrl && !forceFallback) {
        const fallbackSvg = getLogoSvgHtml(size, true);
        return `
          <div style="display: inline-block; width: ${size}px; height: ${size}px; position: relative; vertical-align: middle;">
            <img src="${systemSettings.schoolLogoUrl}" style="width: ${size}px; height: ${size}px; object-fit: contain; border-radius: 50%;" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';" />
            <span style="display: none; width: ${size}px; height: ${size}px; vertical-align: top;">
              ${fallbackSvg}
            </span>
          </div>
        `;
      }
      const sName = schoolName.toUpperCase();
      const sLoc = systemSettings?.customLocation || 'Sawla';
      const sMotto = systemSettings?.customMotto || 'Holiness Is Our Key';
      return `
        <svg width="${size}" height="${size}" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" style="border-radius: 50%;">
          <defs>
            <path id="academy-text-arc" d="M 52 205 A 148 148 0 1 1 348 205" fill="none" />
          </defs>
          <circle cx="200" cy="200" r="190" fill="#ffffff" stroke="#04563a" strokeWidth="11" />
          <circle cx="200" cy="200" r="146" fill="none" stroke="#04563a" strokeWidth="3.5" />
          <text>
            <textPath href="#academy-text-arc" startOffset="50%" textAnchor="middle" fill="#04563a" fontWeight="900" fontSize="23" letterSpacing="1px" fontFamily="system-ui, -apple-system, sans-serif">
              ${sName}
            </textPath>
          </text>
          <g id="central-heraldic-shield">
            <path d="M 98 185 A 102 102 0 0 1 302 185 Z" fill="#009e60" stroke="#04563a" strokeWidth="3" />
            <path d="M 98 185 A 102 102 0 0 0 200 287 L 200 185 Z" fill="#024227" stroke="#04563a" strokeWidth="3" />
            <path d="M 200 185 L 200 287 A 102 102 0 0 0 302 185 Z" fill="#fbf7f4" stroke="#04563a" strokeWidth="3" />
          </g>
          <g id="upper-hemisphere-book-pen">
            <path d="M 134 180 C 168 174, 192 174, 200 181 C 208 174, 232 174, 266 180" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
            <path d="M 200 180 C 185 160, 163 160, 138 168 L 138 141 C 163 133, 185 133, 200 153 Z" fill="#d0f2e5" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M 200 180 C 215 160, 237 160, 262 168 L 262 141 C 237 133, 215 133, 200 153 Z" fill="#d0f2e5" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M 241 114 L 189 171 L 184 172 L 187 167 L 235 110 Z" fill="#ffffff" stroke="#04563a" strokeWidth="1.5" />
            <line x1="225" y1="126" x2="201" y2="152" stroke="#04563a" strokeWidth="1.5" />
          </g>
          <g id="lower-left-farming-tools">
            <path d="M 125 240 Q 120 230 131 228 L 150 242 L 139 254 Z" fill="#b0bec5" stroke="#37474f" strokeWidth="1.5" strokeLinejoin="round" />
            <line x1="127" y1="239" x2="187" y2="208" stroke="#cca480" strokeWidth="4" strokeLinecap="round" />
            <path d="M 179 248 C 170 230, 155 212, 140 204 L 144 200 C 160 209, 175 228, 184 246 Z" fill="#eceff1" stroke="#455a64" strokeWidth="1.5" strokeLinecap="round" />
          </g>
          <g id="lower-right-hearth-broom">
            <path d="M 222 205 L 232 200 L 236 211 L 226 216 Z" fill="#212121" stroke="#000000" strokeWidth="1" />
            <line x1="227" y1="205" x2="263" y2="263" stroke="#424242" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="227" y1="205" x2="251" y2="267" stroke="#333333" strokeWidth="2.0" strokeLinecap="round" />
            <line x1="227" y1="205" x2="274" y2="257" stroke="#424242" strokeWidth="2.0" strokeLinecap="round" />
            <line x1="227" y1="205" x2="241" y2="268" stroke="#212121" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="227" y1="205" x2="281" y2="249" stroke="#555555" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="227" y1="205" x2="232" y2="269" stroke="#555555" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="225" y="209" width="9" height="3" rx="0.5" fill="#fbc02d" />
            <rect x="227" y="215" width="10" height="3.5" rx="0.5" fill="#fbc02d" transform="rotate(-15 227 215)" />
          </g>
          <g id="bottom-crest-banner">
            <circle cx="106" cy="303" r="18" fill="#024227" stroke="#04563a" strokeWidth="2.5" />
            <text x="106" y="308" textAnchor="middle" fill="#ffffff" fontWeight="900" fontSize="13" fontFamily="system-ui, -apple-system, sans-serif">20</text>
            <circle cx="294" cy="303" r="18" fill="#024227" stroke="#04563a" strokeWidth="2.5" />
            <text x="294" y="308" textAnchor="middle" fill="#ffffff" fontWeight="900" fontSize="13" fontFamily="system-ui, -apple-system, sans-serif">03</text>
            <path d="M 120 307 Q 200 334 280 307 L 277 285 Q 200 312 123 285 Z" fill="#024227" stroke="#04563a" strokeWidth="3.5" strokeLinejoin="round" />
            <text x="200" y="304" textAnchor="middle" fill="#ffffff" fontWeight="900" fontSize="14" letterSpacing="1px" fontFamily="system-ui, -apple-system, sans-serif">${sLoc}</text>
          </g>
          <text x="200" y="346" textAnchor="middle" fill="#024227" fontWeight="900" fontSize="13" letterSpacing="0.8px" fontFamily="Georgia, serif">${sMotto}</text>
        </svg>
      `;
    };

    const cardBgFront = isDarkTheme 
      ? 'background: linear-gradient(135deg, #171717 0%, #0a0a0a 100%) !important; color: #ffffff !important;'
      : 'background: linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%) !important; color: #111111 !important; border: 1.5px solid #d4d4d8 !important;';

    const cardBgBack = isDarkTheme 
      ? 'background: linear-gradient(135deg, #171717 0%, #0a0a0a 100%) !important; color: #ffffff !important;'
      : 'background: linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%) !important; color: #111111 !important; border: 1.5px solid #d4d4d8 !important;';

    const textMain = isDarkTheme ? 'color: #ffffff !important;' : 'color: #111111 !important;';
    const textMuted = isDarkTheme ? 'color: #8e8e93 !important;' : 'color: #52525b !important;';
    const borderCol = isDarkTheme ? 'border-color: #27272a !important;' : 'border-color: #e4e4e7 !important;';
    const subBg = isDarkTheme ? 'background-color: #0c0a09 !important;' : 'background-color: #f4f4f5 !important;';

    const termName = activeTerm?.name || "Academic Term";
    const expiryDate = activeTerm?.endDate || "Term End";

    const cardsHtml = selectedStudents.map(student => {
      const qrUrl = bulkQrCodes[student.id] || '';
      const rollNumber = student.rollNumber || 'SHC-' + student.id.substring(0, 5).toUpperCase();
      return `
      <div class="card-pair-wrapper">
        <div class="id-card">
          <div class="accent-top"></div>
          <div class="header">
            <div class="header-logo-container">
              ${getLogoSvgHtml(18)}
              <div class="logo-text">${schoolName.toUpperCase()}</div>
            </div>
            <div>
              <span class="active-pass-badge">Active Pass</span>
            </div>
          </div>

          <div class="main-content">
            <div class="avatar-container">
              <div class="avatar">
                ${student.photoUrl 
                  ? `<img src="${student.photoUrl}" alt="${student.name}" />`
                  : `<div class="avatar-placeholder">${student.name.slice(0, 2).toUpperCase()}</div>`
                }
              </div>
              <span class="avatar-label">STUDENT INFO</span>
            </div>

            <div class="details">
              <div>
                <span class="field-label">Pupil Name</span>
                <span class="field-val-name">${student.name}</span>
              </div>
              <div class="meta-grid">
                <div>
                  <span class="field-label">Class</span>
                  <span class="field-val-meta">${student.class}</span>
                </div>
                <div>
                  <span class="field-label">Gender</span>
                  <span class="field-val-gender">${student.gender || '—'}</span>
                </div>
              </div>
              <div class="reg-id-box">
                REG-ID: <span class="reg-id-badge">${rollNumber}</span>
              </div>
            </div>

            <div class="qr-code-box">
              <img class="qr-code-img" src="${qrUrl}" />
              <span class="qr-label">GATE PASS</span>
            </div>
          </div>

          <div class="footer">
            <div class="footer-left">
              SYSTEM ACCREDITED <span class="footer-expiry">EXP: ${expiryDate}</span>
            </div>
            <div class="term-label">${termName.toUpperCase()}</div>
          </div>
        </div>

        <div class="id-card id-card-back">
          <div class="accent-top" style="background-color: ${isDarkTheme ? '#27272a' : '#d4d4d8'} !important;"></div>
          <div class="header">
            <span class="rules-title" style="margin: 0;">SECURITY CARD POLICY &amp; RULES</span>
          </div>

          <div class="back-body">
            <ol class="rules-list">
              <li>This card remains the property of SHCA-Sawla.</li>
              <li>Always present this card for scanning &amp; gate check-ins.</li>
              <li>Loss of credential elements must be reported immediately.</li>
              <li>Unauthorized duplication or counterfeit transfer is prohibited.</li>
            </ol>

            <div class="contact-meta">
              <div>
                <span class="contact-label">Guardian Mobile</span>
                <span class="contact-val">${student.guardianPhone || 'NOT ENROLLED'}</span>
              </div>
              <div style="text-align: right;">
                <span class="contact-label">Authorized Registrar</span>
                <span class="contact-val" style="color: ${isDarkTheme ? '#fbbf24' : '#d97706'} !important;">YAKUBU HAKEEM</span>
              </div>
            </div>

            <div class="status-banner-back">
              Validation Active &bull; Valid thru Term Closure (${expiryDate})
            </div>
          </div>

          <div class="barcode-area">
            <div class="barcode-lines">
              ${Array.from({ length: 32 }).map((_, idx) => `
                <div class="barcode-bar" style="opacity: ${idx % 3 === 0 || idx % 4 === 1 ? 1 : 0};"></div>
              `).join('')}
            </div>
            <div class="barcode-label">
              *SHCA-${student.id.substring(0, 8).toUpperCase()}*
            </div>
          </div>
        </div>
      </div>
      `;
    }).join('');

    const docContent = `
<!DOCTYPE html>
<html>
  <head>
    <title>SHCA Student ID Cards - Bulk Print</title>
    <meta charset="utf-8">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=JetBrains+Mono:wght@400;700;800&display=swap" rel="stylesheet">
    <style>
      @page {
        size: portrait;
        margin: 15mm 10mm;
      }
      html, body {
        margin: 0;
        padding: 0;
        background-color: #ffffff;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body {
        font-family: 'Inter', sans-serif;
      }
      .bulk-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
        align-items: center;
        justify-content: center;
      }
      .card-pair-wrapper {
        display: flex;
        flex-direction: row;
        gap: 12px;
        page-break-inside: avoid;
        break-inside: avoid;
        margin-bottom: 20px;
        border-bottom: 1px dashed #d4d4d8;
        padding-bottom: 20px;
      }
      .card-pair-wrapper:last-child {
        border-bottom: none;
      }
      .id-card {
        width: 324px;
        height: 204px;
        border-radius: 8px;
        border: 1.5px solid ${isDarkTheme ? '#3f3f46' : '#d4d4d8'} !important;
        box-sizing: border-box;
        overflow: hidden;
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        ${cardBgFront}
      }
      .accent-top {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4.5px;
        background-color: ${isDarkTheme ? '#fbbf24' : '#d97706'} !important;
      }
      .header {
        padding: 8px 10px 4px 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid ${isDarkTheme ? '#27272a' : '#e4e4e7'} !important;
        margin-top: 4.5px;
        box-sizing: border-box;
      }
      .header-logo-container {
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .logo-badge {
        width: 16px;
        height: 16px;
        background-color: #fbbf24 !important;
        color: #000000 !important;
        border-radius: 2px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
        font-size: 8px;
        letter-spacing: -0.5px;
      }
      .logo-text {
        font-weight: 900;
        font-size: 8.5px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        ${textMain}
      }
      .active-pass-badge {
        font-size: 5.5px;
        font-weight: 900;
        background-color: #022c22 !important;
        color: #34d399 !important;
        border: 1px solid #10b981 !important;
        padding: 1px 3px;
        border-radius: 2px;
        text-transform: uppercase;
      }
      .main-content {
        padding: 5px 10px;
        display: flex;
        gap: 8px;
        flex: 1;
        align-items: center;
        box-sizing: border-box;
      }
      .avatar-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.5px;
      }
      .avatar {
        width: 54px;
        height: 54px;
        border-radius: 4.5px;
        background-color: ${isDarkTheme ? '#09090b' : '#f4f4f5'} !important;
        border: 1px solid ${isDarkTheme ? '#27272a' : '#e4e4e7'} !important;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      .avatar-placeholder {
        font-family: 'JetBrains Mono', monospace;
        font-weight: 900;
        font-size: 14px;
        text-transform: uppercase;
        ${textMain}
      }
      .avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover !important;
      }
      .avatar-label {
        font-size: 4.8px;
        font-family: 'JetBrains Mono', monospace;
        font-weight: 900;
        letter-spacing: 0.5px;
        ${textMuted}
      }
      .details {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 1.5px;
      }
      .field-label {
        font-size: 5.5px;
        font-family: 'JetBrains Mono', monospace;
        font-weight: 700;
        text-transform: uppercase;
        ${textMuted}
      }
      .field-val-name {
        font-size: 9.5px;
        font-weight: 900;
        text-transform: uppercase;
        max-width: 140px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
        letter-spacing: -0.1px;
        ${textMain}
      }
      .meta-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 3px;
      }
      .field-val-meta {
        font-size: 7.5px;
        font-weight: 900;
        font-family: 'JetBrains Mono', monospace;
        color: ${isDarkTheme ? '#fbbf24' : '#d97706'} !important;
      }
      .field-val-gender {
        font-size: 7.5px;
        font-weight: 700;
        ${textMain}
      }
      .reg-id-box {
        margin-top: 1px;
        font-size: 5.5px;
        font-family: 'JetBrains Mono', monospace;
        ${textMuted}
      }
      .reg-id-badge {
        font-weight: 800;
        background-color: ${isDarkTheme ? '#09090b' : '#f4f4f5'} !important;
        border: 1px solid ${isDarkTheme ? '#27272a' : '#e4e4e7'} !important;
        padding: 0.5px 2.5px;
        border-radius: 1.5px;
        margin-left: 2px;
        ${textMain}
      }
      .qr-code-box {
        width: 42px;
        height: 42px;
        background-color: #ffffff !important;
        padding: 1.5px;
        border-radius: 2px;
        border: 1px solid ${isDarkTheme ? '#27272a' : '#d4d4d8'} !important;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5px;
        box-sizing: border-box;
      }
      .qr-code-img {
        width: 34px;
        height: 34px;
      }
      .qr-label {
        font-size: 3.5px;
        font-family: 'JetBrains Mono', monospace;
        font-weight: 900;
        color: #000000 !important;
        letter-spacing: 0.1px;
        line-height: 1;
      }
      .footer {
        padding: 3px 10px;
        border-top: 1px solid ${isDarkTheme ? '#27272a' : '#e4e4e7'} !important;
        font-family: 'JetBrains Mono', monospace;
        font-size: 5.8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        ${subBg}
      }
      .footer-left {
        font-weight: 705;
        ${textMuted}
      }
      .footer-expiry {
        font-weight: 900;
        background-color: ${isDarkTheme ? '#000000' : '#e4e4e7'} !important;
        border: 1px solid ${isDarkTheme ? '#27272a' : '#d4d4d8'} !important;
        padding: 0.5px 2px;
        border-radius: 1.5px;
        font-size: 5px;
        margin-left: 2px;
        ${textMain}
      }
      .term-label {
        font-weight: 900;
        color: ${isDarkTheme ? '#fbbf24' : '#d97706'} !important;
      }
      
      /* BACK SIDE */
      .id-card-back {
        ${cardBgBack}
      }
      .back-body {
        padding: 6px 10px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        flex: 1;
        box-sizing: border-box;
      }
      .rules-title {
        font-size: 6.5px;
        font-family: 'JetBrains Mono', monospace;
        font-weight: 900;
        letter-spacing: 0.5px;
        margin-bottom: 2px;
        ${textMuted}
      }
      .rules-list {
        margin: 0;
        padding-left: 10px;
        font-size: 5.5px;
        font-weight: 700;
        line-height: 1.25;
        ${textMuted}
      }
      .rules-list li {
        margin-bottom: 1px;
      }
      .contact-meta {
        display: flex;
        justify-content: space-between;
        font-family: 'JetBrains Mono', monospace;
        font-size: 5.5px;
        border-top: 1px dashed ${isDarkTheme ? '#27272a' : '#d4d4d8'} !important;
        padding-top: 2.5px;
        margin-top: 2px;
      }
      .contact-label {
        display: block;
        font-size: 4.5px;
        ${textMuted}
      }
      .contact-val {
        font-weight: 800;
        ${textMain}
      }
      .status-banner-back {
        border-radius: 2px;
        padding: 1.5px;
        text-align: center;
        font-family: 'JetBrains Mono', monospace;
        font-size: 5px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        background-color: ${isDarkTheme ? '#09090b' : '#f4f4f5'} !important;
        border: 1px solid ${isDarkTheme ? '#18181b' : '#e4e4e7'} !important;
        ${textMuted}
      }
      .barcode-area {
        background-color: #ffffff !important;
        padding: 3px 10px;
        border-top: 1px solid ${isDarkTheme ? '#27272a' : '#e4e4e7'} !important;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
      }
      .barcode-lines {
        width: 100%;
        height: 14px;
        display: flex;
        align-items: stretch;
        gap: 0.8px;
        background-color: #ffffff !important;
      }
      .barcode-bar {
        flex: 1;
        background-color: #000000 !important;
      }
      .barcode-label {
        font-family: 'JetBrains Mono', monospace;
        font-size: 5px;
        font-weight: 700;
        letter-spacing: 1px;
        color: #52525b !important;
        margin-top: 1px;
      }
    </style>
  </head>
  <body>
    <div class="bulk-container">
      ${cardsHtml}
    </div>

    <script>
      window.onload = function() {
        setTimeout(function() {
          window.focus();
          window.print();
        }, 500);
      };
    </script>
  </body>
</html>
    `;

    iframeDoc.open();
    iframeDoc.write(docContent);
    iframeDoc.close();
  };

  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [promotionConfirmedText, setPromotionConfirmedText] = useState('');
  const [promotionTab, setPromotionTab] = useState<'bulk' | 'reconcile' | 'single' | 'backups'>('bulk');
  const [selectedPromoStudentId, setSelectedPromoStudentId] = useState<string>('');
  const [inLinePromoStudentId, setInLinePromoStudentId] = useState<string>('');
  const [inLineRepeatClass, setInLineRepeatClass] = useState<StudentClass>('B1');
  
  // Reconciliation promotion planner states
  const [reconcileClassFilter, setReconcileClassFilter] = useState<string>('All');
  const [reconcileSearch, setReconcileSearch] = useState<string>('');
  const [reconcileActions, setReconcileActions] = useState<Record<string, 'promote' | 'repeat' | 'withdraw'>>({});

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

  // Filter students based on state (active, inactive, or all) and search query
  const filteredStudentsForList = useMemo(() => {
    let list = students;
    if (studentFilter === 'active') {
      list = students.filter(st => st.active);
    } else if (studentFilter === 'inactive') {
      list = students.filter(st => !st.active);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const normalizedQuery = query.replace(/[-_ ]/g, '');

      // Pre-index payments for today for O(1) lookup inside the filter loop
      const todayPaymentsMap = new Map<string, any>();
      if (payments) {
        payments.forEach(p => {
          if (p.date === currentDate) {
            todayPaymentsMap.set(p.studentId, p);
          }
        });
      }

      list = list.filter(st => {
        // Name & Roll matches
        const matchesNameOrRoll = 
          st.name.toLowerCase().includes(query) || 
          st.id.toLowerCase().includes(query) ||
          (st.rollNumber || '').toLowerCase().includes(query);

        // Class and Category matches
        const normalizedClass = st.class.toLowerCase().replace(/[-_ ]/g, '');
        const matchesClass = 
          normalizedClass === normalizedQuery || 
          st.class.toLowerCase().includes(query) ||
          (st.category && st.category.toLowerCase().includes(query));

        // Payment status check
        const todayPay = todayPaymentsMap.get(st.id);
        const isAbsent = !!todayPay && !!todayPay.isAbsent;
        const isPaid = !!todayPay && !todayPay.isAbsent && todayPay.verified;
        const isUnmarked = !todayPay;

        let matchesStatus = false;
        if (query === 'absent' || query === 'missing' || query === 'away') {
          matchesStatus = isAbsent;
        } else if (query === 'paid' || query === 'present' || query === 'checked' || query === 'checkin' || query === 'checked in' || query === 'checked-in') {
          matchesStatus = isPaid;
        } else if (query === 'unmarked' || query === 'pending' || query === 'not checked' || query === 'not marked' || query === 'unpaid' || query === 'not paid') {
          matchesStatus = isUnmarked;
        } else if (query === 'term' || query === 'term payer' || query === 'term payers') {
          matchesStatus = isTermPayer(st);
        } else if (query === 'daily' || query === 'daily payer' || query === 'daily payers') {
          matchesStatus = !isTermPayer(st);
        }

        // Pickup Security Code match
        const pCode = getStudentPickupCode(st).code;
        const matchesPickupCode = pCode.toLowerCase().includes(query) ||
          pCode.replace(/[-_ ]/g, '').toLowerCase().includes(normalizedQuery);

        return matchesNameOrRoll || matchesClass || matchesStatus || matchesPickupCode;
      });
    }
    return list;
  }, [students, studentFilter, searchQuery]);

  // Group filtered students by their grade categories
  const groupedFilteredStudents = useMemo(() => {
    const groups: Record<SchoolCategory, Student[]> = {
      'Pre-school': [],
      'Primary': [],
      'JHS': [],
    };
    filteredStudentsForList.forEach(st => {
      const cat = st.category || 'Primary';
      if (groups[cat]) {
        groups[cat].push(st);
      } else {
        groups['Primary'].push(st);
      }
    });
    return groups;
  }, [filteredStudentsForList]);

  // State for SMS Modal
  const [smsTarget, setSmsTarget] = useState<{
    student: Student;
    consecutiveDays: number;
    unpaidDates: string[];
  } | null>(null);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsSuccess, setSmsSuccess] = useState(false);
  const [reminderChannel, setReminderChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [customWAContact, setCustomWAContact] = useState('');
  const [selectedStaffPhone, setSelectedStaffPhone] = useState('');

  // Delete Confirmation Modal state
  const [deleteConf, setDeleteConf] = useState<{
    isOpen: boolean;
    type: 'student' | 'purge_inactive' | 'staff';
    targetId?: string;
    targetName: string;
    userInput: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    type: 'student',
    targetName: '',
    userInput: '',
    onConfirm: () => {}
  });

  // Find all school days up to currentDate
  const validSchoolDays = useMemo(() => {
    if (!activeTerm || !activeTerm.schoolDays) return [];
    const holidays = activeTerm.publicHolidays || [];
    return [...activeTerm.schoolDays].filter(d => d <= currentDate && !holidays.includes(d)).sort();
  }, [activeTerm, currentDate]);

  // Dynamic Expiry Calculation based on activeTerm and currentDate
  const expiryInfo = useMemo(() => {
    if (!activeTerm || !activeTerm.schoolDays || activeTerm.schoolDays.length === 0) {
      // Fallback: 90 days from currentDate
      const d = currentDate ? new Date(currentDate) : new Date();
      d.setDate(d.getDate() + 90);
      const fallbackExpiry = d.toISOString().split('T')[0];
      return {
        expiryDate: fallbackExpiry,
        daysRemaining: 90,
        isNearingExpiry: false,
        isExpired: false,
        termName: '25/26 TERM'
      };
    }

    // Get sorted school days to locate first and last day
    const sortedDays = [...activeTerm.schoolDays].sort();
    const expiryDate = sortedDays[sortedDays.length - 1]; // Last school day of the active term
    
    // Parse to calculate remaining days
    const current = currentDate ? new Date(currentDate) : new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - current.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    // "Nearing its expiration date" -> let's say less than or equal to 14 days remaining
    const isNearingExpiry = daysRemaining > 0 && daysRemaining <= 14;
    const isExpired = daysRemaining <= 0;

    return {
      expiryDate,
      daysRemaining,
      isNearingExpiry,
      isExpired,
      termName: activeTerm.name || '25/26 TERM'
    };
  }, [activeTerm, currentDate]);

  // Find students who have not paid for 3 or more consecutive school days
  const consecutiveUnpaidAlerts = useMemo(() => {
    if (validSchoolDays.length < 3) return [];
    
    // Pre-index payments for O(1) loop lookup
    const verifiedPaymentSet = new Set<string>();
    if (payments) {
      for (let i = 0; i < payments.length; i++) {
        const p = payments[i];
        if (p.verified) {
          verifiedPaymentSet.add(`${p.studentId}_${p.date}`);
        }
      }
    }
    
    return students.filter(s => s.active && s.paymentType !== 'Term').map(student => {
      // Find the consecutive unpaid tracks
      let consecutiveUnpaid: string[] = [];
      let maxConsecutiveUnpaid: string[] = [];
      
      for (const day of validSchoolDays) {
        const key = `${student.id}_${day}`;
        const hasPaid = verifiedPaymentSet.has(key);
        
        if (!hasPaid) {
          consecutiveUnpaid.push(day);
          if (consecutiveUnpaid.length > maxConsecutiveUnpaid.length) {
            maxConsecutiveUnpaid = [...consecutiveUnpaid];
          }
        } else {
          // Reset
          consecutiveUnpaid = [];
        }
      }
      
      return {
        student,
        consecutiveDays: maxConsecutiveUnpaid.length,
        unpaidDates: maxConsecutiveUnpaid
      };
    }).filter(item => item.consecutiveDays >= 3);
  }, [students, payments, validSchoolDays]);

  // Find all unassigned active pupils (Active students whose class has no active Teacher assigned)
  const unassignedPupils = useMemo(() => {
    if (!students || !users) return [];
    return students.filter(s => {
      if (!s.active) return false;
      const hasTeacher = users.some(
        u => u.role === 'Teacher' && 
        (u.assignedClass === s.class || u.assignedClasses?.includes(s.class)) && 
        u.active !== false
      );
      return !hasTeacher;
    });
  }, [students, users]);

  // Find all students with missing registration records today (Active students who have no payment logged for currentDate)
  const missingRegistrations = useMemo(() => {
    if (!students) return [];
    const paidStudentIds = new Set(
      (payments || []).filter(p => p.date === currentDate).map(p => p.studentId)
    );
    return students.filter(s => s.active && !paidStudentIds.has(s.id));
  }, [students, payments, currentDate]);

  // Find all students marked absent today for welfare enquiry
  const todayAbsentRecords = useMemo(() => {
    return (payments || []).filter(p => p.date === currentDate && p.isAbsent === true);
  }, [payments, currentDate]);

  const [showUnassignedDetails, setShowUnassignedDetails] = useState(false);
  const [showMissingDetails, setShowMissingDetails] = useState(false);

  // Add student form state
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentClass, setNewStudentClass] = useState<StudentClass>('B1');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentPhoto, setNewStudentPhoto] = useState<string | null>(null);
  const [newStudentDiscount, setNewStudentDiscount] = useState<number>(0);
  const [newStudentGender, setNewStudentGender] = useState<'Male' | 'Female'>('Male');
  const [newStudentPaymentType, setNewStudentPaymentType] = useState<'Daily' | 'Term'>('Daily');
  const [newStudentTermFee, setNewStudentTermFee] = useState<number>(350);
  const [newStudentLegacyDebt, setNewStudentLegacyDebt] = useState<number>(0);
  const [newStudentEnrollmentDate, setNewStudentEnrollmentDate] = useState('');
  const [editStudentObj, setEditStudentObj] = useState<Student | null>(null);

  // Image Cropping state
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);
  const [onCropperComplete, setOnCropperComplete] = useState<((cropped: string) => void) | null>(null);

  // Arrears log collapse state
  const [isArrearsCollapsed, setIsArrearsCollapsed] = useState(true);

  // CSV Import states
  const [csvPreviewRows, setCsvPreviewRows] = useState<any[]>([]);
  const [csvParsingError, setCsvParsingError] = useState<string | null>(null);
  const [isCsvDragging, setIsCsvDragging] = useState(false);
  const [showCsvPreviewModal, setShowCsvPreviewModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [pastedRosterText, setPastedRosterText] = useState('');
  const [importSource, setImportSource] = useState<'upload' | 'paste'>('upload');

  const normalizeClassOrGrade = (val: string): StudentClass | null => {
    const clean = val.trim().toUpperCase().replace(/[\s-_]/g, '');
    
    if (clean === 'NURSERY') return 'Nursery';
    if (clean === 'KG1' || clean === 'KINDERGARTEN1' || clean === 'KINDERGARTENONE') return 'KG1';
    if (clean === 'KG2' || clean === 'KINDERGARTENTWO') return 'KG2';
    
    const matchB = clean.match(/^(?:B|BASIC|GRADE|PRIMARY|CLASS)(\d)$/);
    if (matchB) {
      const num = matchB[1];
      const bClass = `B${num}` as StudentClass;
      const validB = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9'];
      if (validB.includes(bClass)) return bClass;
    }
    
    if (/^[1-9]$/.test(clean)) {
      return `B${clean}` as StudentClass;
    }
    
    const directClasses: Record<string, StudentClass> = {
      'NURSERY': 'Nursery',
      'KG1': 'KG1',
      'KG2': 'KG2',
      'B1': 'B1',
      'B2': 'B2',
      'B3': 'B3',
      'B4': 'B4',
      'B5': 'B5',
      'B6': 'B6',
      'B7': 'B7',
      'B8': 'B8',
      'B9': 'B9'
    };
    
    return directClasses[clean] || null;
  };

  const validateCsvRow = (row: any) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const name = row.name ? row.name.trim() : null;
    if (!name) {
      errors.push("Missing pupil full name");
    } else if (name.length < 3) {
      warnings.push("Pupil name is unusually short");
    }
    
    const rawClass = row.rawClass ? row.rawClass.trim() : null;
    let normalized: StudentClass | null = null;
    if (!rawClass) {
      errors.push("Missing class/grade field");
    } else {
      normalized = normalizeClassOrGrade(rawClass);
      if (!normalized) {
        errors.push(`Invalid class or grade '${rawClass}'. Hand-entered grades must be KG1, KG2, Nursery, B1-B9.`);
      } else if (normalized.toLowerCase() !== rawClass.toLowerCase()) {
        warnings.push(`Normalized '${rawClass}' to '${normalized}'`);
      }
    }
    
    let guardianPhone = row.guardianPhone ? row.guardianPhone.toString().trim().replace(/\D/g, '') : undefined;
    if (row.guardianPhone && !guardianPhone) {
      warnings.push("Guardian phone contains no digits; ignored");
      guardianPhone = undefined;
    } else if (guardianPhone && (guardianPhone.length < 9 || guardianPhone.length > 15)) {
      warnings.push(`Unusual phone number length (${guardianPhone.length} digits)`);
    }
    
    let discountVal = 0;
    if (row.discount !== undefined && row.discount !== '') {
      const dVal = parseFloat(row.discount);
      if (isNaN(dVal)) {
        warnings.push("Discount is not a number; reset to 0");
      } else if (dVal < 0 || dVal > 5) {
        warnings.push("Discount must be GHC 0 to 5; capped.");
        discountVal = Math.max(0, Math.min(5, dVal));
      } else {
        discountVal = dVal;
      }
    }

    let parsedGender: 'Male' | 'Female' | undefined = undefined;
    if (row.rawGender) {
      const cleanG = row.rawGender.trim().toLowerCase();
      if (cleanG.startsWith('m')) {
        parsedGender = 'Male';
      } else if (cleanG.startsWith('f')) {
        parsedGender = 'Female';
      } else {
        warnings.push(`Unrecognized gender '${row.rawGender}'; defaulting to Male`);
        parsedGender = 'Male';
      }
    }
    
    return {
      ...row,
      name: name || '',
      guardianPhone,
      discount: discountVal,
      normalizedClass: normalized,
      gender: parsedGender,
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };

  const parseCSV = (text: string) => {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentVal = '';
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentVal += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((char === ',' || char === '\t') && !inQuotes) {
        row.push(currentVal.trim());
        currentVal = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(currentVal.trim());
        if (row.length > 0 && !(row.length === 1 && row[0] === '')) {
          lines.push(row);
        }
        row = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    
    if (currentVal || row.length > 0) {
      row.push(currentVal.trim());
      if (row.length > 0 && !(row.length === 1 && row[0] === '')) {
        lines.push(row);
      }
    }
    
    return lines;
  };

  const handleCsvFileLoad = (file: File) => {
    setCsvParsingError(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          setCsvParsingError("The CSV file is empty or could not be read.");
          return;
        }
        
        const parsedLines = parseCSV(text);
        if (parsedLines.length < 2) {
          setCsvParsingError("The spreadsheet must contain at least a header row and one student data row.");
          return;
        }
        
        const headers = parsedLines[0].map(h => h.toLowerCase().trim());
        
        let nameIdx = headers.findIndex(h => h.includes('name'));
        let classIdx = headers.findIndex(h => h.includes('class') || h.includes('grade') || h.includes('level'));
        let phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('contact') || h.includes('guardian') || h.includes('mobile'));
        let discountIdx = headers.findIndex(h => h.includes('discount') || h.includes('fee') || h.includes('scholarship') || h.includes('rate'));
        let genderIdx = headers.findIndex(h => h.includes('gender') || h.includes('sex'));
        
        if (nameIdx === -1) nameIdx = 0;
        if (classIdx === -1) classIdx = headers.length > 1 ? 1 : -1;
        if (phoneIdx === -1 && headers.length > 2) phoneIdx = 2;
        if (discountIdx === -1 && headers.length > 3) discountIdx = 3;
        if (genderIdx === -1 && headers.length > 4) genderIdx = 4;
        
        if (classIdx === -1 && nameIdx === -1) {
          setCsvParsingError("Could not detect Name and Class columns. Please make sure the header row contains columns labeled 'Name' and 'Class'.");
          return;
        }
        
        const rowsToValidate: any[] = [];
        for (let i = 1; i < parsedLines.length; i++) {
          const line = parsedLines[i];
          if (line.length === 0 || (line.length === 1 && line[0] === '')) {
            continue;
          }
          
          const rawName = nameIdx !== -1 && nameIdx < line.length ? line[nameIdx] : '';
          const rawClass = classIdx !== -1 && classIdx < line.length ? line[classIdx] : '';
          const rawPhone = phoneIdx !== -1 && phoneIdx < line.length ? line[phoneIdx] : '';
          const rawDiscount = discountIdx !== -1 && discountIdx < line.length ? line[discountIdx] : '';
          const rawGender = genderIdx !== -1 && genderIdx < line.length ? line[genderIdx] : '';
          
          const validatedRow = validateCsvRow({
            rowIndex: i + 1,
            name: rawName,
            rawClass: rawClass,
            guardianPhone: rawPhone,
            discount: rawDiscount,
            rawGender: rawGender
          });
          
          rowsToValidate.push(validatedRow);
        }
        
        if (rowsToValidate.length === 0) {
          setCsvParsingError("The CSV file contained no valid student rows under the header.");
          return;
        }
        
        setCsvPreviewRows(rowsToValidate);
        setShowCsvPreviewModal(true);
      } catch (err: any) {
        setCsvParsingError(`Error parsing CSV file: ${err.message || err}`);
      }
    };
    
    reader.readAsText(file);
  };

  const handleProcessPastedText = (rawText: string) => {
    setCsvParsingError(null);
    if (!rawText.trim()) {
      setCsvParsingError("The text input is empty. Please copy-paste some valid rows under a header.");
      return;
    }

    try {
      const parsedLines = parseCSV(rawText.trim());
      if (parsedLines.length < 2) {
        setCsvParsingError("The pasted dataset must contain at least a header row and one student data row.");
        return;
      }

      const headers = parsedLines[0].map(h => h.toLowerCase().trim());

      let nameIdx = headers.findIndex(h => h.includes('name'));
      let classIdx = headers.findIndex(h => h.includes('class') || h.includes('grade') || h.includes('level'));
      let phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('contact') || h.includes('guardian') || h.includes('mobile'));
      let discountIdx = headers.findIndex(h => h.includes('discount') || h.includes('fee') || h.includes('scholarship') || h.includes('rate'));
      let genderIdx = headers.findIndex(h => h.includes('gender') || h.includes('sex'));

      if (nameIdx === -1) nameIdx = 0;
      if (classIdx === -1) classIdx = headers.length > 1 ? 1 : -1;
      if (phoneIdx === -1 && headers.length > 2) phoneIdx = 2;
      if (discountIdx === -1 && headers.length > 3) discountIdx = 3;
      if (genderIdx === -1 && headers.length > 4) genderIdx = 4;

      if (classIdx === -1 && nameIdx === -1) {
        setCsvParsingError("Could not detect Name and Class columns in the pasted text headers. Ensure your top row includes columns like 'Name' and 'Class'.");
        return;
      }

      const rowsToValidate: any[] = [];
      for (let i = 1; i < parsedLines.length; i++) {
        const line = parsedLines[i];
        if (line.length === 0 || (line.length === 1 && line[0] === '')) {
          continue;
        }

        const rawName = nameIdx !== -1 && nameIdx < line.length ? line[nameIdx] : '';
        const rawClass = classIdx !== -1 && classIdx < line.length ? line[classIdx] : '';
        const rawPhone = phoneIdx !== -1 && phoneIdx < line.length ? line[phoneIdx] : '';
        const rawDiscount = discountIdx !== -1 && discountIdx < line.length ? line[discountIdx] : '';
        const rawGender = genderIdx !== -1 && genderIdx < line.length ? line[genderIdx] : '';

        const validatedRow = validateCsvRow({
          rowIndex: i + 1,
          name: rawName,
          rawClass: rawClass,
          guardianPhone: rawPhone,
          discount: rawDiscount,
          rawGender: rawGender
        });

        rowsToValidate.push(validatedRow);
      }

      if (rowsToValidate.length === 0) {
        setCsvParsingError("The pasted text contained no valid student rows under the header.");
        return;
      }

      setCsvPreviewRows(rowsToValidate);
      setShowCsvPreviewModal(true);
      setShowBulkImportModal(false); // Close setup wizard to switch to review mode
    } catch (err: any) {
      setCsvParsingError(`Error parsing pasted dataset: ${err.message || err}`);
    }
  };

  const handleDownloadSampleCsv = () => {
    const csvContent = "Full Name,Class,Guardian Phone,Discount\n" +
                       "Priscilla Owusu,B1,0541234567,2.50\n" +
                       "Kofi Mensah,KG1,0507654321,0.00\n" +
                       "Abena Boateng,Nursery,,5.00";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "student_roster_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const executeCsvImport = () => {
    const validRows = csvPreviewRows.filter(r => r.isValid);
    if (validRows.length === 0) return;

    validRows.forEach(row => {
      addStudent(
        row.name.trim(),
        row.normalizedClass,
        row.guardianPhone?.trim() || undefined,
        undefined,
        row.discount,
        row.gender
      );
    });

    showToast(`Successfully enrolled ${validRows.length} students from CSV roster!`);
    setShowCsvPreviewModal(false);
    setCsvPreviewRows([]);
  };
  
  // Success indicator
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Add staff form state
  const [adminRegName, setAdminRegName] = useState('');
  const [adminRegEmail, setAdminRegEmail] = useState('');
  const [adminRegRole, setAdminRegRole] = useState<UserRole>('Teacher');
  const [adminRegClass, setAdminRegClass] = useState<StudentClass>('B1');
  const [adminRegClasses, setAdminRegClasses] = useState<StudentClass[]>(['B1']);
  const [adminRegMfa, setAdminRegMfa] = useState(false);
  const [adminRegPasswordEnabled, setAdminRegPasswordEnabled] = useState(false);
  const [adminRegPassword, setAdminRegPassword] = useState('');
  const [adminRegStipendSalary, setAdminRegStipendSalary] = useState('');
  const [adminRegMomoNumber, setAdminRegMomoNumber] = useState('');
  const [adminRegMomoName, setAdminRegMomoName] = useState('');
  const [adminRegGender, setAdminRegGender] = useState<'Male' | 'Female'>('Male');
  const [adminRegEmploymentType, setAdminRegEmploymentType] = useState<'Full-Time' | 'Part-Time' | 'Contract' | 'Volunteer'>('Full-Time');
  const [adminRegAppointmentDate, setAdminRegAppointmentDate] = useState('');
  const [adminRegContractEndDate, setAdminRegContractEndDate] = useState('');
  const [adminRegRenewalOption, setAdminRegRenewalOption] = useState<'Automatic' | 'Manual Review' | 'Fixed Term' | 'Non-Renewable'>('Automatic');
  const [adminRegRenewalPeriod, setAdminRegRenewalPeriod] = useState('1 Year');
  const [adminRegPersonalAddress, setAdminRegPersonalAddress] = useState('');
  const [adminRegPermissions, setAdminRegPermissions] = useState<StaffPermissions>({
    canRecordPayments: true,
    canEditPayments: false,
    canDeletePayments: false,
    canManageStudents: false,
    canManageExams: true,
    canViewReports: false,
    canManageSettings: false
  });
  const [editStaffObj, setEditStaffObj] = useState<any | null>(null);

  const teacherStats = useMemo(() => {
    const teachers = users.filter(u => u.role === 'Teacher');
    
    // Categorized by getClassCategory
    const stats = {
      'Pre-school': { total: 0, male: 0, female: 0, fullTime: 0, partTime: 0 },
      'Primary': { total: 0, male: 0, female: 0, fullTime: 0, partTime: 0 },
      'JHS': { total: 0, male: 0, female: 0, fullTime: 0, partTime: 0 },
      'Unassigned/Core': { total: 0, male: 0, female: 0, fullTime: 0, partTime: 0 },
      overall: {
        total: users.length,
        teachersCount: teachers.length,
        maleTeachers: teachers.filter(t => t.gender === 'Male').length,
        femaleTeachers: teachers.filter(t => t.gender === 'Female').length,
        genderUnspecified: teachers.filter(t => !t.gender).length,
        fullTime: teachers.filter(t => t.employmentType === 'Full-Time' || !t.employmentType).length,
        partTime: teachers.filter(t => t.employmentType === 'Part-Time').length,
        contract: teachers.filter(t => t.employmentType === 'Contract').length,
        volunteer: teachers.filter(t => t.employmentType === 'Volunteer').length,
      }
    };

    teachers.forEach(t => {
      const classes = t.assignedClasses || (t.assignedClass ? [t.assignedClass] : []);
      let category: 'Pre-school' | 'Primary' | 'JHS' | 'Unassigned/Core' = 'Unassigned/Core';
      if (classes.length > 0) {
        const cat = getClassCategory(classes[0]);
        if (cat === 'Pre-school') category = 'Pre-school';
        else if (cat === 'Primary') category = 'Primary';
        else if (cat === 'JHS') category = 'JHS';
      }

      stats[category].total += 1;
      if (t.gender === 'Male') stats[category].male += 1;
      else if (t.gender === 'Female') stats[category].female += 1;
      
      const type = t.employmentType || 'Full-Time';
      if (type === 'Full-Time') stats[category].fullTime += 1;
      else if (type === 'Part-Time') stats[category].partTime += 1;
    });

    return stats;
  }, [users]);

  const handleAdminRegisterStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminRegName.trim() || !adminRegEmail.trim()) return;

    const result = registerStaff(
      adminRegName.trim(),
      adminRegEmail.trim(),
      adminRegRole,
      adminRegRole === 'Teacher' ? (adminRegClasses[0] || 'B1') : undefined,
      adminRegMfa,
      adminRegPasswordEnabled,
      adminRegPassword.trim(),
      adminRegRole === 'Teacher' ? adminRegClasses : undefined,
      adminRegStipendSalary ? parseFloat(adminRegStipendSalary) : undefined,
      adminRegMomoNumber.trim() || undefined,
      adminRegMomoName.trim() || undefined,
      undefined, // photoUrl
      undefined, // employeeId
      undefined, // department
      adminRegGender,
      adminRegEmploymentType,
      undefined, // idCardDeactivated
      adminRegAppointmentDate || undefined,
      adminRegContractEndDate || undefined,
      adminRegRenewalOption || undefined,
      adminRegRenewalPeriod || undefined,
      adminRegPersonalAddress.trim() || undefined,
      adminRegPermissions
    );

    if (result.success) {
      setAdminRegName('');
      setAdminRegEmail('');
      setAdminRegMfa(false);
      setAdminRegPasswordEnabled(false);
      setAdminRegPassword('');
      setAdminRegClasses(['B1']);
      setAdminRegStipendSalary('');
      setAdminRegMomoNumber('');
      setAdminRegMomoName('');
      setAdminRegGender('Male');
      setAdminRegEmploymentType('Full-Time');
      setAdminRegAppointmentDate('');
      setAdminRegContractEndDate('');
      setAdminRegRenewalOption('Automatic');
      setAdminRegRenewalPeriod('1 Year');
      setAdminRegPersonalAddress('');
      setAdminRegPermissions({
        canRecordPayments: true,
        canEditPayments: false,
        canDeletePayments: false,
        canManageStudents: false,
        canManageExams: true,
        canViewReports: false,
        canManageSettings: false
      });
      showToast('Staff register updated with new entry.');
    } else {
      showToast(result.error || 'Check administrator database permissions & connection.');
    }
  };

  const handleAdminEditStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStaffObj || !editStaffObj.name.trim() || !editStaffObj.email.trim()) return;

    const result = updateStaff(
      editStaffObj.id,
      editStaffObj.name.trim(),
      editStaffObj.email.trim(),
      editStaffObj.role,
      editStaffObj.assignedClass,
      !!editStaffObj.mfaEnabled,
      !!editStaffObj.passwordEnabled,
      editStaffObj.password || '',
      editStaffObj.role === 'Teacher' ? (editStaffObj.assignedClasses || (editStaffObj.assignedClass ? [editStaffObj.assignedClass] : [])) : undefined,
      editStaffObj.stipendSalary ? parseFloat(editStaffObj.stipendSalary.toString()) : undefined,
      editStaffObj.momoNumber?.trim() || undefined,
      editStaffObj.momoName?.trim() || undefined,
      undefined, // photoUrl
      undefined, // employeeId
      undefined, // department
      editStaffObj.gender || 'Male',
      editStaffObj.employmentType || 'Full-Time',
      !!editStaffObj.idCardDeactivated,
      editStaffObj.appointmentDate,
      editStaffObj.contractEndDate,
      editStaffObj.renewalOption,
      editStaffObj.renewalPeriod,
      undefined, // signatureUrl
      undefined, // managementSignatureUrl
      editStaffObj.personalAddress || undefined,
      undefined, // ethicsEvaluation
      editStaffObj.permissions
    );

    if (result.success) {
      setEditStaffObj(null);
      showToast('Staff profile details updated successfully.');
    } else {
      showToast(result.error || 'Failed to update staff profile.');
    }
  };

  const handleAssignGateTeacher = (cls: StudentClass, teacherId: string) => {
    // 1. For all other teachers currently assigned to this classroom gate checkpoint, remove 'cls' from their assignments
    users.forEach(u => {
      if (u.role === 'Teacher' && u.id !== teacherId) {
        const hasSingle = u.assignedClass === cls;
        const hasMulti = u.assignedClasses?.includes(cls);
        if (hasSingle || hasMulti) {
          const currentMulti = u.assignedClasses || (u.assignedClass ? [u.assignedClass] : []);
          const newMulti = currentMulti.filter(c => c !== cls);
          const newSingle = newMulti[0];
          updateStaff(u.id, u.name, u.email, u.role, newSingle, !!u.mfaEnabled, !!u.passwordEnabled, u.password || '', newMulti);
        }
      }
    });

    // 2. Assign the newly selected teacher to this gate (and append to their existing assigned gates)
    if (teacherId) {
      const selectedT = users.find(u => u.id === teacherId);
      if (selectedT) {
        const currentMulti = selectedT.assignedClasses || (selectedT.assignedClass ? [selectedT.assignedClass] : []);
        const newMulti = currentMulti.includes(cls) ? currentMulti : [...currentMulti, cls];
        const newSingle = newMulti[0] || cls;
        const result = updateStaff(
          selectedT.id,
          selectedT.name,
          selectedT.email,
          selectedT.role,
          newSingle,
          !!selectedT.mfaEnabled,
          !!selectedT.passwordEnabled,
          selectedT.password || '',
          newMulti
        );
        if (result.success) {
          showToast(`Successfully assigned ${selectedT.name} to oversee ${cls} Gate Checkpoint.`);
        } else {
          showToast(result.error || `Failed to assign ${selectedT.name} to ${cls}.`);
        }
      }
    } else {
      showToast(`Gate Teacher unassigned and reset to system fallback for ${cls}.`);
    }
  };

  const classes: StudentClass[] = [
    'Nursery', 'KG1', 'KG2',
    'B1', 'B2', 'B3', 'B4', 'B5', 'B6',
    'B7', 'B8', 'B9'
  ];

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setCropperSrc(reader.result);
          setOnCropperComplete(() => (cropped: string) => {
            if (isEdit && editStudentObj) {
              setEditStudentObj({
                ...editStudentObj,
                photoUrl: cropped
              });
            } else {
              setNewStudentPhoto(cropped);
            }
            setCropperSrc(null);
            setOnCropperComplete(null);
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    const isDuplicate = students.some(
      s => s.name.trim().toLowerCase() === newStudentName.trim().toLowerCase() && s.class === newStudentClass
    );

    if (isDuplicate) {
      playFeedbackSound('error');
      showToast(`Conflict error: Pupil "${newStudentName.trim()}" is already registered in class ${newStudentClass}!`);
      return;
    }

    addStudent(
      newStudentName.trim(), 
      newStudentClass, 
      newStudentPhone.trim() || undefined, 
      newStudentPhoto || undefined,
      newStudentDiscount,
      newStudentGender,
      newStudentPaymentType,
      newStudentTermFee,
      newStudentLegacyDebt,
      newStudentEnrollmentDate || undefined
    );
    setNewStudentName('');
    setNewStudentPhone('');
    setNewStudentPhoto(null);
    setNewStudentDiscount(0);
    setNewStudentGender('Male');
    setNewStudentPaymentType('Daily');
    setNewStudentTermFee(350);
    setNewStudentLegacyDebt(0);
    setNewStudentEnrollmentDate('');
    showToast('Student successfully registered to the daily ledger catalog.');
  };

  const handleResetAddStudentForm = () => {
    setNewStudentName('');
    setNewStudentClass('B1');
    setNewStudentPhone('');
    setNewStudentPhoto(null);
    setNewStudentDiscount(0);
    setNewStudentGender('Male');
    setNewStudentPaymentType('Daily');
    setNewStudentTermFee(350);
    setNewStudentLegacyDebt(0);
    setNewStudentEnrollmentDate('');
    showToast('Student registration form cleared.');
  };

  const handleStartEdit = (student: Student) => {
    setStudentToEditModal(student);
  };

  const handleToggleStudentActive = (student: Student) => {
    updateStudent({
      ...student,
      active: !student.active
    });
    showToast(`Status toggled for ${student.name}.`);
  };

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 3000);
  };

  return (
    <div className="space-y-6 font-sans">
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

      {/* Delete Confirmation Safeguard Modal */}
      {deleteConf.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in animate-duration-200">
          <div className="bg-neutral-950 border-4 border-red-600 max-w-md w-full p-6 space-y-6 shadow-[10px_10px_0px_0px_rgba(220,38,38,0.25)] relative">
            <div className="flex items-center gap-3 border-b-2 border-neutral-850 pb-4">
              <Trash2 className="text-red-500 animate-pulse" size={28} />
              <div>
                <span className="text-[10px] font-mono tracking-widest text-red-500 uppercase font-black">CRITICAL DELETION GUARD</span>
                <h3 className="text-base font-black uppercase tracking-tight text-white font-mono">Confirm Radical Purge Action</h3>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-neutral-300 leading-relaxed font-semibold">
                You are about to permanently purge the following entry from the records. Once done, this action <strong className="text-red-500">CANNOT BE UNDONE</strong> and will sever all database linkages:
              </p>
              
              <div className="p-3 bg-red-950/20 border-2 border-red-900/60 rounded text-center">
                <p className="text-[10px] font-mono uppercase text-neutral-400">Target Record Name</p>
                <p className="text-sm font-black font-mono text-white mt-1 uppercase tracking-wider">
                  {deleteConf.targetName}
                </p>
                <p className="text-[9px] font-mono text-red-400 mt-1 uppercase tracking-widest font-bold">
                  {deleteConf.type === 'student' ? 'Student Record' : deleteConf.type === 'purge_inactive' ? 'Deactivated Pupils Purge' : 'Staff/Teacher Account'}
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                  Type <span className="text-red-500 font-extrabold bg-red-950/40 px-1.5 border border-red-900/40 font-bold font-mono">DELETE</span> to authorize:
                </label>
                <input
                  type="text"
                  value={deleteConf.userInput}
                  placeholder="Type DELETE here..."
                  onChange={(e) => setDeleteConf(prev => ({ ...prev, userInput: e.target.value }))}
                  className="w-full bg-neutral-950 border-2 border-neutral-800 focus:border-red-600 py-2.5 px-3.5 text-xs text-white font-mono font-bold focus:outline-none uppercase tracking-widest"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && deleteConf.userInput.trim().toUpperCase() === 'DELETE') {
                      deleteConf.onConfirm();
                      setDeleteConf(prev => ({ ...prev, isOpen: false }));
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConf({ isOpen: false, type: 'student', targetName: '', userInput: '', onConfirm: () => {} })}
                className="w-1/3 py-3 px-4 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 hover:text-white font-bold uppercase text-xs tracking-wider transition-colors cursor-pointer font-mono"
              >
                Cancel
              </button>
              
              <button
                type="button"
                disabled={deleteConf.userInput.trim().toUpperCase() !== 'DELETE'}
                onClick={() => {
                  deleteConf.onConfirm();
                  setDeleteConf({ isOpen: false, type: 'student', targetName: '', userInput: '', onConfirm: () => {} });
                }}
                className={`w-2/3 py-3 px-4 font-black uppercase text-xs tracking-wider font-mono transition-all cursor-pointer ${
                  deleteConf.userInput.trim().toUpperCase() === 'DELETE'
                    ? 'bg-red-600 hover:bg-red-500 text-white hover:scale-[1.02] active:scale-[0.98]'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-650 cursor-not-allowed opacity-50'
                }`}
              >
                Permanent Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Alert Header */}
      {successMsg && (
        <div className="bg-amber-400 text-black border-4 border-neutral-800 p-4 text-xs font-black flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] font-mono uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <Check size={16} className="bg-black/10 p-0.5" />
            <span>{successMsg}</span>
          </div>
        </div>
      )}

      {/* IMAGE CROPPER MODAL */}
      {cropperSrc && onCropperComplete && (
        <ImageCropperModal
          imageSrc={cropperSrc}
          onCrop={(cropped) => {
            onCropperComplete(cropped);
          }}
          onCancel={() => {
            setCropperSrc(null);
            setOnCropperComplete(null);
          }}
        />
      )}

      {/* BULK DATA IMPORT WIZARD MODAL */}
      {showBulkImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in animate-duration-200">
          <div className="bg-neutral-950 border-4 border-amber-500 max-w-3xl w-full p-6 space-y-6 shadow-[10px_10px_0px_0px_rgba(245,158,11,0.25)] relative max-h-[95vh] flex flex-col justify-between overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-neutral-850 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <Database className="text-amber-500 animate-pulse" size={28} />
                <div>
                  <span className="text-[10px] font-mono tracking-widest text-amber-500 uppercase font-black">ADMINISTRATOR TOOLKIT</span>
                  <h3 className="text-lg font-black uppercase tracking-tight text-white font-mono">Bulk Pupil Import Wizard</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBulkImportModal(false);
                  setPastedRosterText('');
                  setCsvParsingError(null);
                }}
                className="text-neutral-500 hover:text-white transition-colors p-1 cursor-pointer bg-transparent border-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Step 1: Standardized Template Guide */}
            <div className="bg-neutral-900 border-2 border-neutral-800 p-4 space-y-2 shrink-0">
              <h4 className="text-[10px] font-mono font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                📋 Required Column Layout & CSV Template Standard
              </h4>
              <p className="text-[11px] text-neutral-350 leading-relaxed font-semibold">
                To guarantee correct automatic assignment, your spreadsheet or pasted cells must respect this header line format and these exact column names:
              </p>
              <div className="overflow-x-auto text-[10px] font-mono">
                <table className="w-full text-center border-collapse">
                  <thead>
                    <tr className="bg-neutral-950 text-neutral-450 border border-neutral-800 uppercase text-[9px]">
                      <th className="p-2 border-r border-neutral-800">Full Name (Required)</th>
                      <th className="p-2 border-r border-neutral-800">Class (Required)</th>
                      <th className="p-2 border-r border-neutral-800">Guardian Phone (Optional)</th>
                      <th className="p-2">Discount (Optional)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-neutral-950/40 text-neutral-300 border border-neutral-800">
                      <td className="p-2 border-r border-neutral-805">Priscilla Owusu</td>
                      <td className="p-2 border-r border-neutral-805">B1</td>
                      <td className="p-2 border-r border-neutral-805">0541234567</td>
                      <td className="p-2 font-bold text-amber-400">2.50</td>
                    </tr>
                    <tr className="bg-neutral-950/40 text-neutral-300 border border-neutral-800">
                      <td className="p-2 border-r border-neutral-805">Kofi Mensah</td>
                      <td className="p-2 border-r border-neutral-805">KG1</td>
                      <td className="p-2 border-r border-neutral-805">0507654321</td>
                      <td className="p-2 font-bold text-amber-400">0.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="bg-neutral-950 hover:bg-neutral-800 text-amber-500 hover:text-amber-400 border border-neutral-800 hover:border-amber-500/45 px-3 py-1.5 font-mono text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                >
                  📥 Download Sample Template .CSV
                </button>
              </div>
            </div>

            {/* Input Selection Tabs */}
            <div className="space-y-4 flex-1 flex flex-col min-h-0">
              <div className="flex border-b-2 border-neutral-850 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setImportSource('upload');
                    setCsvParsingError(null);
                  }}
                  className={`px-4 py-2.5 font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer border-b-2 -mb-[2px] bg-transparent ${
                    importSource === 'upload'
                      ? 'border-amber-400 text-amber-400 bg-neutral-900/50'
                      : 'border-transparent text-neutral-555 hover:text-neutral-300'
                  }`}
                >
                  📁 Option A: Roster File Upload
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImportSource('paste');
                    setCsvParsingError(null);
                  }}
                  className={`px-4 py-2.5 font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer border-b-2 -mb-[2px] bg-transparent ${
                    importSource === 'paste'
                      ? 'border-amber-400 text-amber-400 bg-neutral-900/50'
                      : 'border-transparent text-neutral-555 hover:text-neutral-300'
                  }`}
                >
                  📝 Option B: Copy-Paste Cells
                </button>
              </div>

              {/* Tab Content Dynamic View */}
              <div className="flex-1 min-h-[160px] flex flex-col justify-center">
                {importSource === 'upload' ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsCsvDragging(true);
                    }}
                    onDragLeave={() => setIsCsvDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsCsvDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        handleCsvFileLoad(file);
                        setShowBulkImportModal(false); // Switch focus to the preview table
                      }
                    }}
                    className={`border-2 border-dashed p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center flex-1 min-h-[150px] ${
                      isCsvDragging
                        ? "border-amber-400 bg-amber-955/20"
                        : "border-neutral-800 hover:border-neutral-700 bg-neutral-950/20"
                    }`}
                    onClick={() => document.getElementById('modal-csv-file-input')?.click()}
                  >
                    <Upload size={28} className={isCsvDragging ? "text-amber-400 mb-2 animate-bounce" : "text-neutral-500 mb-2"} />
                    <span className="text-xs font-mono font-black text-neutral-250 uppercase tracking-wider block">
                      Drag & Drop Standardized CSV File
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500 uppercase mt-1 block">
                      or click to select file from your machine
                    </span>
                    <input
                      id="modal-csv-file-input"
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleCsvFileLoad(file);
                          setShowBulkImportModal(false); // Switch focus to the preview table
                        }
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="space-y-3 flex-1 flex flex-col">
                    <p className="text-[10px] text-neutral-405 uppercase font-mono font-bold leading-relaxed">
                      Copy whole rows from Excel or Google Sheets (with the header row included) and paste them directly in the zone below:
                    </p>
                    <textarea
                      value={pastedRosterText}
                      onChange={(e) => setPastedRosterText(e.target.value)}
                      placeholder="Full Name&#9;Class&#9;Guardian Phone&#9;Discount&#10;Priscilla Owusu&#9;B1&#9;0541234567&#9;2.50&#10;Kofi Mensah&#9;KG1&#9;0507654321&#9;0.00"
                      className="w-full flex-1 min-h-[160px] bg-neutral-950 border-2 border-neutral-800 font-mono text-xs p-4 focus:outline-none focus:border-amber-400 text-white placeholder:text-neutral-700"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleProcessPastedText(pastedRosterText)}
                        className="bg-amber-400 hover:bg-amber-300 text-black px-4 py-2.5 font-mono text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 border-0"
                        disabled={!pastedRosterText.trim()}
                      >
                        🚀 Parse & Validate Copied Dataset
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Parsing Errors within the Setup Wizard */}
              {csvParsingError && (
                <div className="bg-red-955 border-2 border-red-900/60 p-3 text-left shrink-0">
                  <p className="text-[9px] font-mono font-black text-rose-400 uppercase tracking-widest mb-1">
                    ⚠️ Import Parsing Conflict:
                  </p>
                  <p className="text-[10px] font-mono font-bold text-neutral-350 leading-snug">
                    {csvParsingError}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="border-t-2 border-neutral-850 pt-4 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowBulkImportModal(false);
                  setPastedRosterText('');
                  setCsvParsingError(null);
                }}
                className="w-full py-3 px-4 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 hover:text-white font-bold uppercase text-xs tracking-wider transition-colors cursor-pointer font-mono text-center"
              >
                Close Import Toolkit
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CSV Spreadsheet Bulk Import Review Modal */}
      {showCsvPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in animate-duration-200">
          <div className="bg-neutral-950 border-4 border-amber-500 max-w-4xl w-full p-6 space-y-6 shadow-[10px_10px_0px_0px_rgba(245,158,11,0.25)] relative max-h-[90vh] flex flex-col justify-between">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-neutral-850 pb-4">
              <div className="flex items-center gap-3">
                <Database className="text-amber-500 animate-pulse" size={28} />
                <div>
                  <span className="text-[10px] font-mono tracking-widest text-amber-500 uppercase font-black">BULK SPREADSHEET VALIDATION ENGINE</span>
                  <h3 className="text-lg font-black uppercase tracking-tight text-white font-mono">Verify Enrollee Ledger Dataset</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCsvPreviewModal(false);
                  setCsvPreviewRows([]);
                }}
                className="text-neutral-550 hover:text-white transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Stats Indicators */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-neutral-900 border-2 border-neutral-800 p-3 text-center">
                <span className="block text-[9px] font-mono text-neutral-400 uppercase font-bold">Total Rows</span>
                <span className="text-lg font-mono font-black text-white">{csvPreviewRows.length}</span>
              </div>
              <div className="bg-neutral-900 border-2 border-neutral-800 p-3 text-center">
                <span className="block text-[9px] font-mono text-emerald-500 uppercase font-extrabold">Ready to Enroll</span>
                <span className="text-lg font-mono font-black text-emerald-400">
                  {csvPreviewRows.filter(r => r.isValid).length}
                </span>
              </div>
              <div className="bg-neutral-900 border-2 border-neutral-800 p-3 text-center">
                <span className="block text-[9px] font-mono text-red-500 uppercase font-extrabold">Validation Errors</span>
                <span className="text-lg font-mono font-black text-red-400">
                  {csvPreviewRows.filter(r => !r.isValid).length}
                </span>
              </div>
            </div>

            {/* List Row Preview */}
            <div className="flex-1 overflow-y-auto border-2 border-neutral-800 bg-neutral-950/40 p-1 font-mono text-xs text-white max-h-[40vh]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-900 text-neutral-450 text-[9px] uppercase tracking-wider sticky top-0">
                    <th className="p-3 border-b border-neutral-850">Row</th>
                    <th className="p-3 border-b border-neutral-850">Pupil Full Name</th>
                    <th className="p-3 border-b border-neutral-850">Hand-entered Class</th>
                    <th className="p-3 border-b border-neutral-850">Verified Grade</th>
                    <th className="p-3 border-b border-neutral-850">Contact / Phone</th>
                    <th className="p-3 border-b border-neutral-850">Discount</th>
                    <th className="p-3 border-b border-neutral-850">Validation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900">
                  {csvPreviewRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-neutral-900/40 text-[11px]">
                      <td className="p-3 font-semibold text-neutral-500">#{row.rowIndex}</td>
                      <td className="p-3 font-black uppercase text-white">{row.name || <span className="text-red-500 italic">empty</span>}</td>
                      <td className="p-3 text-neutral-400">{row.rawClass || <span className="text-red-500 italic">empty</span>}</td>
                      <td className="p-3">
                        {row.normalizedClass ? (
                          <span className="px-1.5 py-0.5 rounded-sm bg-amber-400/10 text-amber-400 font-extrabold border border-amber-500/25">
                            {row.normalizedClass}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-sm bg-red-955 text-red-400 font-extrabold border border-red-900/40 uppercase text-[9px]">
                            UNRESOLVED
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-neutral-405">{row.guardianPhone || <span className="text-neutral-600 font-mono">—</span>}</td>
                      <td className="p-3 text-amber-400 font-black">GHC {row.discount.toFixed(2)}</td>
                      <td className="p-3">
                        <div className="space-y-1">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-400 bg-emerald-950/20 px-1.5 py-0.5 rounded border border-emerald-990 uppercase">
                              <Check size={10} /> Valid Roster Entry
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              {row.errors.map((err: string, i: number) => (
                                <span key={i} className="block text-[8px] font-black text-rose-450 bg-red-955 px-1.5 py-0.5 rounded border border-red-900/30 uppercase leading-normal">
                                  🚫 {err}
                                </span>
                              ))}
                            </div>
                          )}
                          {row.warnings.map((warn: string, i: number) => (
                            <span key={i} className="block text-[8px] font-medium text-amber-400 bg-amber-955 px-1.5 py-0.5 rounded border border-amber-900/30 normal-case leading-normal">
                              ⚠️ {warn}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions */}
            <div className="border-t-2 border-neutral-850 pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCsvPreviewModal(false);
                  setCsvPreviewRows([]);
                }}
                className="w-1/3 py-3 px-4 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 hover:text-white font-bold uppercase text-xs tracking-wider transition-colors cursor-pointer font-mono"
              >
                Discard Dataset
              </button>
              
              <button
                type="button"
                disabled={csvPreviewRows.filter(r => r.isValid).length === 0}
                onClick={executeCsvImport}
                className={`w-2/3 py-3 px-4 font-black uppercase text-xs tracking-wider font-mono transition-all flex items-center justify-between cursor-pointer ${
                  csvPreviewRows.some(r => r.isValid)
                    ? 'bg-amber-400 hover:bg-amber-350 text-black hover:scale-[1.01] active:scale-[0.99]'
                    : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
                }`}
              >
                <span>🚀 Confirm Bulk Enrollment</span>
                <span className="bg-black/10 px-2 py-0.5 rounded text-[10px]">
                  Import {csvPreviewRows.filter(r => r.isValid).length} Students
                </span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Admin header with controls */}
      <div className="bg-neutral-900 border-4 border-neutral-800 p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-black uppercase italic tracking-tight text-white leading-none">Authorized Administration Core</h2>
          <p className="text-xs text-neutral-400 mt-2 font-bold max-w-xl">
            Configure pupil registers, categories, and secure Multi-Factor authorization profiles. Action triggers require verified session levels.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-neutral-950 border-2 border-neutral-850 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('students')}
            title="Pupil Registry: Enroll new pupils, search records, edit contact details, and upload photos"
            className={`flex-1 md:flex-none px-5 py-2.5 font-black text-[11px] uppercase tracking-widest transition-all ${
              activeTab === 'students'
                ? 'bg-amber-400 text-black'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            Pupil Registry
          </button>
          <button
            onClick={() => setActiveTab('mfa')}
            title="Staff Registry & Security: Manage teacher accounts, roles, access permissions, and passcodes"
            className={`flex-1 md:flex-none px-5 py-2.5 font-black text-[11px] uppercase tracking-widest transition-all ${
              activeTab === 'mfa'
                ? 'bg-amber-400 text-black'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            Staff Registry & Security
          </button>
          <button
            onClick={() => setActiveTab('gates')}
            title="Gate Assignments: Assign teachers to oversee specific gate entry checkpoints"
            className={`flex-1 md:flex-none px-5 py-2.5 font-black text-[11px] uppercase tracking-widest transition-all gap-2 flex items-center justify-center ${
              activeTab === 'gates'
                ? 'bg-amber-400 text-black'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            <UserCheck size={13} />
            Gate Assignments
          </button>

          <button
            onClick={() => setActiveTab('expenditures')}
            title="Expenditures: Track daily operational expenses, utility disbursements, and salaries"
            className={`flex-1 md:flex-none px-5 py-2.5 font-black text-[11px] uppercase tracking-widest transition-all gap-2 flex items-center justify-center ${
              activeTab === 'expenditures'
                ? 'bg-amber-400 text-black'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            <DollarSign size={13} />
            Expenditures
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            title="General Ledger: Audit double-entry bookkeeping journal entries and balance sheets"
            className={`flex-1 md:flex-none px-5 py-2.5 font-black text-[11px] uppercase tracking-widest transition-all gap-2 flex items-center justify-center ${
              activeTab === 'ledger'
                ? 'bg-amber-400 text-black'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            <Scale size={13} />
            General Ledger
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            title="Performance: Evaluate staff key performance indicators, reviews, and ratings"
            className={`flex-1 md:flex-none px-5 py-2.5 font-black text-[11px] uppercase tracking-widest transition-all gap-2 flex items-center justify-center ${
              activeTab === 'performance'
                ? 'bg-amber-400 text-black'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            <Award size={13} />
            Performance
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            title="WhatsApp Logs: Monitor automated WhatsApp payment receipts and parent messaging history"
            className={`flex-1 md:flex-none px-5 py-2.5 font-black text-[11px] uppercase tracking-widest transition-all gap-2 flex items-center justify-center ${
              activeTab === 'whatsapp'
                ? 'bg-amber-400 text-black'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            <MessageSquare size={13} />
            WhatsApp Logs
          </button>
          <button
            id="admin-tab-idcards-btn"
            onClick={() => setActiveTab('idcards')}
            title="Generate ID Cards: Batch generate and print barcode pupil ID cards and gate passes"
            className={`flex-1 md:flex-none px-5 py-2.5 font-black text-[11px] uppercase tracking-widest transition-all gap-2 flex items-center justify-center ${
              activeTab === 'idcards'
                ? 'bg-amber-400 text-black'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            <Contact size={13} />
            Generate ID Cards
          </button>
          <button
            id="admin-tab-aiassistant-btn"
            onClick={() => setActiveTab('ai_assistant')}
            title="AI Assistant: Query AI helper for school insights, financial analytics, and pupil summaries"
            className={`flex-1 md:flex-none px-5 py-2.5 font-black text-[11px] uppercase tracking-widest transition-all gap-2 flex items-center justify-center ${
              activeTab === 'ai_assistant'
                ? 'bg-amber-400 text-black'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            <Bot size={13} />
            AI Assistant
          </button>

          <button
            id="admin-tab-database-btn"
            onClick={() => setActiveTab('database')}
            title="Database Connect: Manage Firebase cloud database synchronization, seeding, and health"
            className={`flex-1 md:flex-none px-5 py-2.5 font-black text-[11px] uppercase tracking-widest transition-all gap-2 flex items-center justify-center ${
              activeTab === 'database'
                ? 'bg-amber-400 text-black'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            <Database size={13} />
            Database Connect
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            title="System Settings: Configure term dates, school name, currency formats, and fee parameters"
            className={`flex-1 md:flex-none px-5 py-2.5 font-black text-[11px] uppercase tracking-widest transition-all gap-2 flex items-center justify-center ${
              activeTab === 'settings'
                ? 'bg-amber-400 text-black'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            <Sliders size={13} />
            System Settings
          </button>
        </div>
      </div>

      {activeTab === 'students' ? (
        <div className="space-y-6">
          {/* Daily Administration Audit & Alerts Board */}
          <div className="bg-neutral-900 border-4 border-neutral-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b-2 border-neutral-850 pb-3">
              <div className="flex items-center gap-3">
                <ShieldAlert className={(unassignedPupils.length > 0 || missingRegistrations.length > 0) ? "text-red-500 animate-pulse" : "text-emerald-500"} size={22} />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest font-mono">
                    Administrative Daily Day-Audit Desk
                  </h3>
                  <p className="text-[10px] text-neutral-400 uppercase font-mono font-bold tracking-wider mt-0.5">
                    Live system check for <span className="text-amber-400">{currentDate}</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-[10px] font-mono font-black uppercase px-2.5 py-1 border ${
                  (unassignedPupils.length > 0 || missingRegistrations.length > 0)
                    ? 'bg-red-950/40 border-red-900 text-red-500 animate-pulse'
                    : 'bg-emerald-950/40 border-emerald-900 text-emerald-500'
                }`}>
                  {(unassignedPupils.length > 0 || missingRegistrations.length > 0) ? 'Action Required' : 'Cleared & Compliant'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Missing Daily Registrations */}
              <div className={`p-4 border-2 ${missingRegistrations.length > 0 ? "bg-red-950/10 border-red-900/60" : "bg-neutral-950 border-neutral-850"} flex flex-col justify-between space-y-4`}>
                <div className="space-y-1">
                  <span className="text-[9px] text-neutral-500 font-mono font-black uppercase tracking-widest block">Daily Check-In Status</span>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-black font-mono ${missingRegistrations.length > 0 ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`}>
                      {missingRegistrations.length}
                    </span>
                    <span className="text-xs text-neutral-400 font-bold">Unregistered today</span>
                  </div>
                  <p className="text-[10px] text-neutral-400 leading-relaxed font-semibold">
                    {missingRegistrations.length > 0 
                      ? "Pupils have cleared past physical checkpoints but are missing today's standard GHC 5.00 entry log."
                      : "All active students have completed entry check-ins for the current school day."}
                  </p>
                </div>

                {missingRegistrations.length > 0 && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowMissingDetails(!showMissingDetails)}
                      className="text-[10px] font-mono font-black uppercase text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {showMissingDetails ? 'Hide Missing Pupils list [-]' : 'View Missing Pupils list [+]'}
                    </button>
                    
                    {showMissingDetails && (
                      <div className="mt-3 bg-neutral-950/80 border border-neutral-800 p-2.5 max-h-[160px] overflow-y-auto divide-y divide-neutral-850 space-y-2">
                        {missingRegistrations.map(student => (
                          <div key={student.id} className="flex justify-between items-center text-[10px] pt-2 first:pt-0">
                            <div>
                              <span className="font-extrabold text-white uppercase">{student.name}</span>
                              <span className="text-neutral-500 ml-1.5 font-mono">[{student.class}]</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                // Calls context update to record immediate check-in
                                useApp().recordPayment(student.id, true);
                              }}
                              className="px-2 py-0.5 bg-emerald-950/40 hover:bg-emerald-500 hover:text-black border border-emerald-990 text-emerald-400 font-mono text-[9px] font-black uppercase cursor-pointer transition-all"
                            >
                              Check-In
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card 2: Absent Pupils & Welfare Enquiries */}
              <div className={`p-4 border-2 ${todayAbsentRecords.length > 0 ? "bg-amber-950/20 border-amber-500/70" : "bg-neutral-950 border-neutral-850"} flex flex-col justify-between space-y-4`}>
                <div className="space-y-1">
                  <span className="text-[9px] text-neutral-500 font-mono font-black uppercase tracking-widest block">Pupil Absence Welfare</span>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-black font-mono ${todayAbsentRecords.length > 0 ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`}>
                      {todayAbsentRecords.length}
                    </span>
                    <span className="text-xs text-neutral-400 font-bold">Marked absent today</span>
                  </div>
                  <p className="text-[10px] text-neutral-400 leading-relaxed font-semibold">
                    {todayAbsentRecords.length > 0
                      ? "Pupils are marked absent from class. Check with parents via 1-click WhatsApp/Call to enquire on their health and reason."
                      : "Zero pupil absences recorded today. Full class attendance recorded."}
                  </p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playFeedbackSound('click');
                      setShowAbsenteeEnquiryModal(true);
                    }}
                    className={`w-full text-center py-2 font-mono text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      todayAbsentRecords.length > 0
                        ? 'bg-amber-400 hover:bg-amber-300 text-black border border-amber-400 shadow-md'
                        : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-750'
                    }`}
                  >
                    <HeartHandshake size={13} />
                    <span>{todayAbsentRecords.length > 0 ? `Enquire on ${todayAbsentRecords.length} Absentee${todayAbsentRecords.length > 1 ? 's' : ''}` : 'Open Absentee Care Desk'}</span>
                  </button>
                </div>
              </div>

              {/* Card 3: Unassigned Pupils */}
              <div className={`p-4 border-2 ${unassignedPupils.length > 0 ? "bg-red-950/10 border-red-900/60" : "bg-neutral-950 border-neutral-850"} flex flex-col justify-between space-y-4`}>
                <div className="space-y-1">
                  <span className="text-[9px] text-neutral-500 font-mono font-black uppercase tracking-widest block">Class Gate Placement</span>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-black font-mono ${unassignedPupils.length > 0 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
                      {unassignedPupils.length}
                    </span>
                    <span className="text-xs text-neutral-400 font-bold">Unassigned pupils</span>
                  </div>
                  <p className="text-[10px] text-neutral-400 leading-relaxed font-semibold">
                    {unassignedPupils.length > 0 
                      ? "Pupils are enrolled in classes that do not have an active gate teacher assigned to oversee entry logs."
                      : "Every active student belongs to a class with an active assigned gate teacher."}
                  </p>
                </div>

                {unassignedPupils.length > 0 && (
                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setShowUnassignedDetails(!showUnassignedDetails)}
                      className="text-[10px] font-mono font-black uppercase text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {showUnassignedDetails ? 'Hide Unassigned Classes [-]' : 'View Unassigned Classes [+]'}
                    </button>
                    
                    {showUnassignedDetails && (
                      <div className="mt-1 bg-neutral-950/80 border border-neutral-800 p-2.5 max-h-[160px] overflow-y-auto divide-y divide-neutral-850 space-y-2">
                        {Array.from(new Set(unassignedPupils.map(p => p.class))).map(cls => {
                          const clsPupils = unassignedPupils.filter(p => p.class === cls);
                          return (
                            <div key={cls} className="flex justify-between items-center text-[10px] pt-2 first:pt-0">
                              <div>
                                <span className="font-extrabold text-amber-400 font-mono">{cls}: </span>
                                <span className="text-neutral-300 font-semibold">{clsPupils.length} pupil(s)</span>
                              </div>
                              <span className="text-[9px] font-mono text-red-400 uppercase font-bold">No checkpoint teacher</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => setActiveTab('gates')}
                      className="w-full text-center py-1.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 font-mono text-[9px] font-black uppercase tracking-wider border border-neutral-800 transition-colors cursor-pointer"
                    >
                      Go to Gate Assignments &rarr;
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Automated Daily Alerts for 3+ Unpaid Days */}
          {consecutiveUnpaidAlerts.length > 0 ? (
            <div className="bg-neutral-900 border-4 border-red-500 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-neutral-800 pb-3">
                <div className="flex items-center gap-3">
                  <BellRing className="text-red-500 animate-pulse" size={20} />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-red-500 font-mono">
                      Urgent Attendance & Arrears Alerts ({consecutiveUnpaidAlerts.length} Pupils)
                    </h3>
                    <p className="text-[10px] text-neutral-400 uppercase font-mono font-bold tracking-wider mt-0.5">
                      Critical Warning: Pupils with 3+ consecutive unpaid standard school days detected
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsArrearsCollapsed(!isArrearsCollapsed)}
                  className="bg-neutral-950 hover:bg-neutral-800 text-amber-400 border-2 border-neutral-850 px-4 py-2.5 text-xs font-mono font-black uppercase tracking-widest cursor-pointer select-none transition-all duration-150 shrink-0 self-start sm:self-center"
                >
                  {isArrearsCollapsed ? '📂 EXPAND LOG ▾' : '📁 FOLD LOG ▴'}
                </button>
              </div>
              
              {!isArrearsCollapsed && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {consecutiveUnpaidAlerts.map(({ student, consecutiveDays, unpaidDates }) => (
                    <div key={student.id} className="bg-neutral-950 border-2 border-neutral-850 p-4 flex flex-col justify-between gap-3 hover:border-red-500/40 transition-all">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-xs font-black text-white uppercase tracking-tight">{student.name}</span>
                          <span className="text-[9px] font-black text-red-500 bg-red-950/40 border border-red-900/60 px-2 py-0.5 font-mono uppercase tracking-widest shrink-0">
                            {consecutiveDays} days due
                          </span>
                        </div>
                        <div className="mt-2 space-y-1 font-mono text-[9px] text-neutral-450 font-bold uppercase">
                          <div>Class Group: <span className="text-amber-400 font-extrabold">{student.class}</span></div>
                          <div>Guardian Contact: <span className="text-neutral-200">{student.guardianPhone || 'No SMS Verified'}</span></div>
                          <div className="text-red-400/80 leading-normal mt-1.5 normal-case font-medium">
                            Missed: {unpaidDates.join(', ')}
                          </div>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setSmsTarget({ student, consecutiveDays, unpaidDates });
                          setSmsSuccess(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-950/20 hover:bg-red-600 border-2 border-red-900 hover:border-red-500 hover:text-white hover:scale-[1.01] active:scale-[0.99] transition-all text-red-400 text-[10px] font-black uppercase tracking-widest cursor-pointer font-mono"
                      >
                        <BellRing size={12} className="stroke-[2.5]" />
                        <span>Send Urgent SMS</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-neutral-900 border-4 border-neutral-800 p-5 flex items-center gap-3">
              <Check className="text-emerald-500 bg-emerald-950/20 p-0.5 border border-emerald-800" size={18} />
              <div>
                <span className="text-[10px] font-mono tracking-widest text-emerald-500 uppercase font-black">All Pupil Catalog Secure</span>
                <p className="text-[9px] text-neutral-400 uppercase font-mono font-bold tracking-wider mt-0.5">
                  No gate clearance arrears of 3+ consecutive days detected for active term pupils.
                </p>
              </div>
            </div>
          )}

          {/* Collapsible Enrolment Summary details */}
          <div className="mb-2">
            <EnrollmentSummaryWidget students={students || []} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Forms & CSV Imports */}
          <div className="space-y-6 col-span-1">
            {/* Add student card */}
            <div className="bg-neutral-900 border-4 border-neutral-800 p-8 h-fit space-y-6">
              <form onSubmit={handleAddStudentSubmit} className="space-y-5">
                <div className="flex items-center justify-between gap-2 pb-3 border-b-2 border-neutral-800">
                  <div className="flex items-center gap-3">
                    <UserPlus size={18} className="text-amber-400" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Register Student</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBulkImportModal(true)}
                    className="bg-neutral-800 hover:bg-amber-400 hover:text-black border border-neutral-700 hover:border-amber-400 px-2.5 py-1 text-[8px] font-mono font-black uppercase tracking-widest transition-all cursor-pointer border-0"
                    id="btn-trigger-bulk-import"
                    title="Bulk import pupils from spreadsheet template or copy-pasted block"
                  >
                    🚀 Bulk Import
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                      Pupil Full Name (English Ledger)
                    </label>
                    <input
                      type="text"
                      required
                      value={newStudentName}
                      onChange={(e) => setNewStudentName(e.target.value)}
                      placeholder="e.g. Priscilla Owusu"
                      className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-700"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                        Target Class
                      </label>
                      <select
                        value={newStudentClass}
                        onChange={(e) => setNewStudentClass(e.target.value as StudentClass)}
                        className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                      >
                        {classes.map(cls => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                        Calculated Category
                      </label>
                      <div className="bg-neutral-950 border-2 border-neutral-850 py-3 px-4 text-xs text-amber-400 font-black font-mono uppercase tracking-wider">
                        {getClassCategory(newStudentClass)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                      Pupil Gender
                    </label>
                    <div className="flex gap-3">
                      {(['Male', 'Female'] as const).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setNewStudentGender(g)}
                          className={`flex-1 py-3 px-4 text-xs font-mono font-black uppercase tracking-widest border-2 transition-all cursor-pointer ${
                            newStudentGender === g
                              ? 'bg-amber-400 text-black border-amber-400 font-black'
                              : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
                          }`}
                        >
                          {g === 'Male' ? '👦 Male' : '👧 Female'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                      Guardian Phone Number
                    </label>
                    <input
                      type="text"
                      value={newStudentPhone}
                      onChange={(e) => setNewStudentPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 0541234567"
                      className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                      Pupil Payment Scheme
                    </label>
                    <div className="flex gap-3 text-center">
                      {(['Daily', 'Term'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setNewStudentPaymentType(t)}
                          className={`flex-1 py-3 px-4 text-xs font-mono font-black uppercase tracking-widest border-2 transition-all cursor-pointer ${
                            newStudentPaymentType === t
                              ? 'bg-amber-400 text-black border-amber-400 font-black'
                              : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
                          }`}
                        >
                          {t === 'Daily' ? '📅 Daily Payer' : '🎓 Term Payer'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                      Pupil's First Day / Start Date
                    </label>
                    <input
                      type="date"
                      value={newStudentEnrollmentDate}
                      onChange={(e) => setNewStudentEnrollmentDate(e.target.value)}
                      className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 font-mono"
                    />
                    <p className="text-[9px] font-mono text-neutral-500 mt-1 uppercase tracking-wide">
                      Select date if new child to ignore previous dates as debt. Leave blank if old student to calculate full term debt.
                    </p>
                  </div>

                  {newStudentPaymentType === 'Term' ? (
                    <div>
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                        Flat Term Fee Amount (GHC)
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={newStudentTermFee}
                        onChange={(e) => setNewStudentTermFee(Math.max(1, parseFloat(e.target.value) || 0))}
                        className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-700 font-mono"
                        placeholder="e.g. 350.00"
                      />
                      <p className="text-[9px] font-mono text-neutral-550 mt-1 uppercase tracking-wide">
                        Paying a customized static flat charge of <strong className="text-amber-500">GHC {newStudentTermFee.toFixed(2)}</strong> for the entire term (exempt from daily debt).
                      </p>

                      <div className="mt-4">
                        <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                          Pre-adoption Outstanding Legacy Debt (GHC) - Optional
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={newStudentLegacyDebt || ''}
                          onChange={(e) => setNewStudentLegacyDebt(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-700 font-mono"
                          placeholder="e.g. 150.00"
                        />
                        <p className="text-[9px] font-mono text-neutral-550 mt-1 uppercase tracking-wide">
                          Manually enter any pre-adoption outstanding debt (e.g. <strong className="text-red-400">GHC {(newStudentLegacyDebt || 0).toFixed(2)}</strong>) to be integrated into this pupil's ledger and outstanding balance.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                        Daily Check-In Discount (GHC)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          max="5"
                          step="0.5"
                          value={newStudentDiscount}
                          onChange={(e) => setNewStudentDiscount(Math.max(0, Math.min(5, parseFloat(e.target.value) || 0)))}
                          className="w-1/2 bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-700"
                        />
                        <div className="flex-1 flex gap-1 font-mono">
                          {[0, 2.50, 5].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setNewStudentDiscount(val)}
                              className={`flex-1 text-[9px] font-mono font-black border transition-all ${
                                newStudentDiscount === val
                                  ? 'bg-amber-400 text-black border-amber-400'
                                  : 'bg-neutral-950 text-neutral-500 border-neutral-800 hover:text-white hover:bg-neutral-850'
                              }`}
                            >
                              {val === 0 ? 'None' : val === 5 ? '100% Free' : `GHC ${val.toFixed(2)}`}
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="text-[9px] font-mono text-neutral-500 mt-1 uppercase tracking-wide">
                        Standard fee is GHC 5.00. Effective daily rate: <strong className="text-amber-500">GHC {(5.00 - newStudentDiscount).toFixed(2)}</strong>
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                      Student Passport Photo / Picture
                    </label>
                    {newStudentPhoto ? (
                      <div className="relative w-full aspect-video sm:aspect-[4/3] bg-neutral-950 border-2 border-dashed border-amber-400 p-4 flex flex-col items-center justify-center gap-3">
                        <img 
                          src={newStudentPhoto} 
                          alt="Student passport preview" 
                          className="w-16 h-16 rounded-full object-cover border-2 border-amber-400"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => setNewStudentPhoto(null)}
                          className="text-[10px] font-mono font-black text-red-500 hover:text-red-400 uppercase tracking-wider bg-neutral-900 border border-neutral-800 px-3 py-1.5 transition-colors cursor-pointer"
                        >
                          Remove Photo
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full min-h-[96px] bg-neutral-950 border-2 border-dashed border-neutral-800 hover:border-neutral-600 p-4 cursor-pointer transition-all">
                        <Upload size={18} className="text-neutral-500 mb-1.5" />
                        <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider text-center">Upload Photo/Passport</span>
                        <span className="text-[8px] font-mono text-neutral-600 uppercase mt-0.5">JPEG / PNG up to 2MB</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => handlePhotoUpload(e, false)} 
                          className="hidden" 
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    id="btn-reset-new-student"
                    type="button"
                    onClick={handleResetAddStudentForm}
                    className="w-5/12 text-[10px] font-black uppercase tracking-widest bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-600 text-red-400 hover:text-red-300 py-3.5 transition-all text-center cursor-pointer font-mono"
                  >
                    Reset
                  </button>
                  <button
                    id="btn-submit-new-student"
                    type="submit"
                    className="w-7/12 text-[10px] font-black uppercase tracking-widest bg-white hover:bg-amber-400 text-black py-3.5 transition-all text-center cursor-pointer font-sans"
                  >
                    Confirm Enrollment
                  </button>
                </div>
              </form>
            </div>

            {/* CSV Bulk Import Card */}
            <div className="bg-neutral-900 border-4 border-neutral-800 p-8 h-fit space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b-2 border-neutral-800">
                <Database size={18} className="text-amber-400" />
                <h3 className="text-sm font-black uppercase tracking-widest text-white">Mass Enrollment Roster</h3>
              </div>

              <p className="text-[11px] text-neutral-350 font-semibold leading-relaxed">
                Onboard whole classrooms or grades simultaneously. Reduce tedious keystroke entries by uploading a custom spreadsheet or copy-pasting active pupil lists directly.
              </p>

              <div className="space-y-4 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulkImportModal(true)}
                  className="w-full text-xs font-mono font-black border-2 border-amber-500 bg-amber-500/10 hover:bg-amber-400 hover:text-black text-amber-400 py-3 uppercase tracking-widest transition-all text-center cursor-pointer flex items-center justify-center gap-2 border-0"
                  id="btn-sidebar-launch-bulk"
                >
                  🚀 Open Import Toolkit
                </button>
                <p className="text-[8px] font-mono text-neutral-500 uppercase tracking-wide text-center">
                  Supports Excel copy/paste cells & standard .CSV files
                </p>
              </div>
            </div>

            {/* Inline Single Student Promotion & Repetition Desk */}
            <div className="bg-neutral-900 border-4 border-neutral-800 p-8 h-fit space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b-2 border-neutral-800">
                <Award size={18} className="text-amber-400" />
                <h3 className="text-sm font-black uppercase tracking-widest text-white">Academic Progression Desk</h3>
              </div>

              <p className="text-[11px] text-neutral-350 font-semibold leading-relaxed">
                Alter or progress grade levels for a specific pupil. Choose either single logical promotion to the next academic level, or designate custom repetition.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                    Select Active Student
                  </label>
                  <select
                    value={inLinePromoStudentId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setInLinePromoStudentId(id);
                      const currentS = students.find(s => s.id === id);
                      if (currentS) {
                        setInLineRepeatClass(currentS.class);
                      }
                    }}
                    className="w-full bg-neutral-950 border-2 border-neutral-800 focus:border-amber-400 text-white font-mono text-xs p-3 font-semibold focus:outline-none"
                  >
                    <option value="">-- Choose active student --</option>
                    {students.filter(s => s.active).map(student => (
                      <option key={student.id} value={student.id}>
                        {student.name} ({student.class})
                      </option>
                    ))}
                  </select>
                </div>

                {inLinePromoStudentId && (() => {
                  const studentInHand = students.find(s => s.id === inLinePromoStudentId);
                  if (!studentInHand) return null;

                  const CLASS_PROMOTION_MAP: Record<StudentClass, { nextClass: StudentClass | null; category: 'Pre-school' | 'Primary' | 'JHS'; completes: boolean }> = {
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

                  const mapEntry = CLASS_PROMOTION_MAP[studentInHand.class];
                  const nextClassString = mapEntry?.completes ? 'Completed / Graduate' : mapEntry?.nextClass || 'N/A';

                  return (
                    <div className="space-y-4 pt-2 border-t border-neutral-850">
                      {/* Promo Action Button */}
                      <div className="bg-neutral-950 p-3.5 border border-neutral-800 rounded-sm space-y-2">
                        <div className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase text-[9px] font-mono tracking-wider">
                          <Award size={12} className="stroke-[2.5]" />
                          <span>Standard Logical Promotion</span>
                        </div>
                        <p className="text-[10px] text-neutral-400 font-semibold">
                          Advance {studentInHand.name} from <strong className="text-white">{studentInHand.class}</strong> to <strong className="text-emerald-400">{nextClassString}</strong>.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            if (currentUser?.role !== 'Administrator') {
                              alert('Access Denied: Only Administrators are permitted to make student grade alterations.');
                              return;
                            }
                            if (mapEntry?.completes) {
                              updateStudent({
                                ...studentInHand,
                                active: false
                              });
                              showToast(`Successfully marked ${studentInHand.name} as Completed/Graduated.`);
                            } else if (mapEntry?.nextClass) {
                              updateStudent({
                                ...studentInHand,
                                class: mapEntry.nextClass,
                                category: mapEntry.category,
                                active: false
                              });
                              showToast(`Successfully promoted ${studentInHand.name} to ${mapEntry.nextClass}. Set to INACTIVE pending return from vacation.`);
                            }
                            setInLinePromoStudentId('');
                          }}
                          className="w-full mt-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-black uppercase text-[10px] tracking-wider border-none rounded-sm transition-colors cursor-pointer"
                        >
                          ⚡ Execute Promotion
                        </button>
                      </div>

                      {/* Repetition Class & Action Block */}
                      <div className="bg-neutral-950 p-3.5 border border-neutral-800 rounded-sm space-y-3">
                        <div className="flex items-center gap-1.5 text-amber-500 font-bold uppercase text-[9px] font-mono tracking-wider">
                          <RefreshCw size={11} className="stroke-[2.5]" />
                          <span>Custom Repetition / Assignment</span>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[8px] font-mono text-neutral-500 uppercase font-black">
                            Select Repetition Target Grade
                          </label>
                          <select
                            value={inLineRepeatClass}
                            onChange={(e) => setInLineRepeatClass(e.target.value as StudentClass)}
                            className="w-full bg-neutral-900 border border-neutral-800 text-white font-mono text-[10px] p-2 focus:outline-none focus:border-amber-400"
                          >
                            {['Nursery', 'KG1', 'KG2', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9'].map(cls => (
                              <option key={cls} value={cls}>
                                {cls} (Repeat / Assign Grade)
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (currentUser?.role !== 'Administrator') {
                              alert('Access Denied: Only Administrators are permitted to make student grade alterations.');
                              return;
                            }
                            const targetCategory = getClassCategory(inLineRepeatClass);
                            updateStudent({
                              ...studentInHand,
                              class: inLineRepeatClass,
                              category: targetCategory,
                              active: true
                            });
                            showToast(`Successfully set ${studentInHand.name} to repeat/enroll in grade: ${inLineRepeatClass}.`);
                            setInLinePromoStudentId('');
                          }}
                          className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-black font-mono font-black uppercase text-[10px] tracking-wider border-none rounded-sm transition-colors cursor-pointer"
                        >
                          🔄 Confirm Repetition
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Directory Listings */}
          <div className="bg-neutral-900 border-4 border-neutral-800 col-span-1 lg:col-span-2 overflow-hidden flex flex-col justify-between">
            <div className="p-6 bg-neutral-950 border-b-2 border-neutral-850 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1.5">
                <span className="text-[10px] font-black text-neutral-400 font-mono uppercase tracking-widest block">Student Directory Catalog ({filteredStudentsForList.length})</span>
                
                {/* Gender Totals Summary */}
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[9.5px] font-mono font-bold text-neutral-500 uppercase tracking-widest pb-1 border-b border-neutral-850/35">
                  <span className="text-neutral-450">DIRECTORY:</span>
                  <span className="text-sky-400 font-black">👦 Male: <strong className="text-white">{students.filter(s => s.gender === 'Male').length}</strong></span>
                  <span>/</span>
                  <span className="text-pink-400 font-black">👧 Female: <strong className="text-white">{students.filter(s => s.gender === 'Female').length}</strong></span>
                  {students.filter(s => !s.gender).length > 0 && (
                    <>
                      <span>/</span>
                      <span className="text-neutral-500">Unspecified: <strong className="text-neutral-350">{students.filter(s => !s.gender).length}</strong></span>
                    </>
                  )}
                  {students.some(s => !s.active) && (
                    <>
                      <span className="text-neutral-605">|</span>
                      <span className="text-neutral-450">ACTIVE ONLY:</span>
                      <span className="text-sky-400 font-black">👦 Male: <strong className="text-emerald-400">{students.filter(s => s.active && s.gender === 'Male').length}</strong></span>
                      <span>/</span>
                      <span className="text-pink-400 font-black">👧 Female: <strong className="text-emerald-400">{students.filter(s => s.active && s.gender === 'Female').length}</strong></span>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {students.some(s => !s.active) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (currentUser?.role !== 'Administrator') {
                          alert('Access Denied: Only Administrators are permitted to purge deactivated students completely.');
                          return;
                        }
                        const count = students.filter(s => !s.active).length;
                        setDeleteConf({
                          isOpen: true,
                          type: 'purge_inactive',
                          targetName: `ALL ${count} DEACTIVATED STUDENTS`,
                          userInput: '',
                          onConfirm: () => {
                            purgeDeactivatedStudents();
                            showToast(`Successfully purged ${count} deactivated pupil files and clean-wiped all transaction roots.`);
                          }
                        });
                      }}
                      className={`mt-1 px-3 py-1 text-[9px] font-mono font-black uppercase tracking-widest cursor-pointer transition-all flex items-center gap-1.5 border-2 ${
                        currentUser?.role === 'Administrator'
                          ? 'bg-red-600 hover:bg-red-500 text-white border-red-700 shadow-[2px_2px_0px_0px_rgba(220,38,38,0.2)] animate-pulse hover:scale-[1.02] active:scale-[0.98]'
                          : 'bg-neutral-950 border-neutral-850 text-neutral-600 cursor-not-allowed opacity-50'
                      }`}
                      title={currentUser?.role !== 'Administrator' ? 'Administrator Only (Access Denied)' : 'Permanently erase all deactivated students and their past records'}
                    >
                      <Trash2 size={11} className="stroke-[3]" />
                      <span>Purge Inactive ({students.filter(s => !s.active).length}){currentUser?.role !== 'Administrator' ? ' (Admin only)' : ''}</span>
                    </button>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => {
                      if (currentUser?.role !== 'Administrator') {
                        alert('Access Denied: Only Administrators are permitted to execute student promotions.');
                        return;
                      }
                      setShowPromotionModal(true);
                      setPromotionConfirmedText('');
                    }}
                    className={`mt-1 px-3 py-1 text-[9px] font-mono font-black uppercase tracking-widest cursor-pointer transition-all flex items-center gap-1.5 border-2 ${
                      currentUser?.role === 'Administrator'
                        ? 'border-amber-500 bg-amber-500/10 hover:bg-amber-400 hover:text-black hover:border-amber-400 text-amber-400 shadow-[2px_2px_0px_0px_rgba(245,158,11,0.15)]'
                        : 'bg-neutral-950 border-neutral-850 text-neutral-600 cursor-not-allowed opacity-50'
                    }`}
                    title={currentUser?.role !== 'Administrator' ? 'Administrator Only (Access Denied)' : 'Promote all active pupil cohorts to the next grade class level'}
                  >
                    <Award size={11} className="stroke-[3]" />
                    <span>Promote Cohorts {currentUser?.role !== 'Administrator' ? ' (Admin only)' : ''}</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setBulkPrintSelectedIds(students.filter(s => s.active).map(s => s.id));
                      setBulkPrintClassFilter('all');
                      setBulkPrintSearch('');
                      setShowBulkPrintModal(true);
                    }}
                    className="mt-1 px-3 py-1 text-[9px] font-mono font-black uppercase tracking-widest cursor-pointer transition-all flex items-center gap-1.5 border-2 border-amber-500 bg-amber-500/10 hover:bg-amber-400 hover:text-black hover:border-amber-400 text-amber-400 shadow-[2px_2px_0px_0px_rgba(245,158,11,0.15)]"
                    title="Generate and print physical student ID cards with scan QR codes in bulk"
                  >
                    <QrCode size={11} className="stroke-[3]" />
                    <span>Print QR Badges</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPickupPassesModal(true)}
                    className="mt-1 px-3 py-1 text-[9px] font-mono font-black uppercase tracking-widest cursor-pointer transition-all flex items-center gap-1.5 border-2 border-emerald-500 bg-emerald-500/10 hover:bg-emerald-400 hover:text-black hover:border-emerald-400 text-emerald-400 shadow-[2px_2px_0px_0px_rgba(16,185,129,0.15)]"
                    title="View and print active weekly pickup security passes for pupil dismissal"
                  >
                    <KeyRound size={11} className="stroke-[3]" />
                    <span>Weekly Pickup Passes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAdmissionFormStudent(null);
                      setShowAdmissionFormModal(true);
                    }}
                    className="mt-1 px-3 py-1 text-[9px] font-mono font-black uppercase tracking-widest cursor-pointer transition-all flex items-center gap-1.5 border-2 border-sky-500 bg-sky-500/10 hover:bg-sky-400 hover:text-black hover:border-sky-400 text-sky-400 shadow-[2px_2px_0px_0px_rgba(14,165,233,0.15)]"
                    title="Print official pupil admission & enrollment forms or blank forms for prospective parents"
                  >
                    <FileSignature size={11} className="stroke-[3]" />
                    <span>Admission Forms</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAuditDuplicatesClick}
                    className={`mt-1 px-3 py-1 text-[9px] font-mono font-black uppercase tracking-widest cursor-pointer transition-all flex items-center gap-1.5 border-2 ${
                      duplicateStudentGroups.length > 0
                        ? 'border-rose-500 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 shadow-[2px_2px_0px_0px_rgba(244,63,94,0.2)] animate-pulse'
                        : 'border-amber-500 bg-amber-500/10 hover:bg-amber-400 hover:text-black hover:border-amber-400 text-amber-400 shadow-[2px_2px_0px_0px_rgba(245,158,11,0.15)]'
                    }`}
                    title="Scan and audit for duplicate student records with matching Name and Class"
                  >
                    <CopyCheck size={11} className="stroke-[3]" />
                    <span>Audit Duplicates {duplicateStudentGroups.length > 0 ? `(${duplicateStudentGroups.length} Group${duplicateStudentGroups.length > 1 ? 's' : ''})` : ''}</span>
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 shrink-0">
                {/* Status Filters */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setStudentFilter('all')}
                    className={`px-3 py-1.5 text-[10px] font-mono font-black uppercase tracking-wider border-2 transition-all cursor-pointer ${
                      studentFilter === 'all'
                        ? 'bg-amber-400 text-black border-amber-405 shadow-[2px_2px_0px_0px_rgba(251,191,36,0.15)] font-black'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-450 hover:text-white hover:border-neutral-700 font-bold'
                    }`}
                  >
                    All ({students.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentFilter('active')}
                    className={`px-3 py-1.5 text-[10px] font-mono font-black uppercase tracking-wider border-2 transition-all cursor-pointer ${
                      studentFilter === 'active'
                        ? 'bg-emerald-555 border-emerald-500 bg-emerald-450 text-black shadow-[2px_2px_0px_0px_rgba(52,211,153,0.15)] font-black'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-455 hover:text-white hover:border-neutral-700 font-bold'
                    }`}
                  >
                    Active ({students.filter(s => s.active).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentFilter('inactive')}
                    className={`px-3 py-1.5 text-[10px] font-mono font-black uppercase tracking-wider border-2 transition-all cursor-pointer ${
                      studentFilter === 'inactive'
                        ? 'bg-red-950/40 text-red-500 border-red-800 shadow-[2px_2px_0px_0px_rgba(239,68,68,0.15)] font-black'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-455 hover:text-white hover:border-neutral-700 font-bold'
                    }`}
                  >
                    Deactivated ({students.filter(s => !s.active).length})
                  </button>
                </div>

                {/* View Toggles (List vs Album) */}
                <div className="flex bg-neutral-950 border-2 border-neutral-850 p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setStudentViewStyle('list')}
                    title="Switch to List view with categories and progress details"
                    className={`px-3 py-1 text-[10px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border-2 ${
                      studentViewStyle === 'list'
                        ? 'bg-amber-400 text-black border-amber-400 font-black'
                        : 'bg-neutral-950 border-transparent text-neutral-400 hover:text-white font-bold'
                    }`}
                  >
                    <List size={11} className="stroke-[3.5]" />
                    <span>List</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentViewStyle('album')}
                    title="Switch to Album grid view for profile photo identification"
                    className={`px-3 py-1 text-[10px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border-2 ${
                      studentViewStyle === 'album'
                        ? 'bg-amber-400 text-black border-amber-400 font-black'
                        : 'bg-neutral-950 border-transparent text-neutral-400 hover:text-white font-bold'
                    }`}
                  >
                    <LayoutGrid size={11} className="stroke-[3.5]" />
                    <span>Album</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Pupil Lookup Bar */}
            <div className="px-6 py-4 bg-neutral-950/60 border-b-2 border-neutral-850 flex items-center gap-3">
              <Search size={14} className="text-neutral-500 shrink-0" />
              <input
                id="admin-student-search"
                type="text"
                placeholder="Search by name, ID, class, or status (paid, absent, unmarked)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-xs text-white placeholder-neutral-650 focus:outline-none focus:ring-0 font-mono font-bold uppercase tracking-wider"
              />
              <VoiceSearchButton
                inputId="admin-student-search"
                onTranscript={(text) => setSearchQuery(text)}
                className="shrink-0"
              />
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 border border-neutral-800 bg-neutral-950 font-mono text-[8px] text-neutral-500 rounded-xs leading-none pointer-events-none uppercase font-bold tracking-wider select-none shrink-0">
                Ctrl+K
              </kbd>
              
              {/* Keyboard shortcut info indicator reminder */}
              <div 
                className="hidden md:flex items-center justify-center text-neutral-500 hover:text-amber-400 cursor-help select-none shrink-0"
                title="Keyboard Shortcut Reminder: Press 'Ctrl+K' (or 'Cmd+K' on macOS) from anywhere at any time to focus this student search box instantly"
              >
                <Info size={12} className="stroke-[2.5]" />
              </div>

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-[10px] font-mono font-black text-neutral-400 hover:text-white uppercase transition-all cursor-pointer shrink-0"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Mass Vacation Return Activation Bar (Shows when filter is 'inactive' or when inactive pupils exist) */}
            {studentFilter === 'inactive' && (
              <div className="p-4 bg-emerald-950/20 border-b-2 border-emerald-500/40 space-y-3 font-mono">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <Sparkles size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-black text-emerald-400 uppercase tracking-wider block">
                        ⚡ VACATION RETURN &amp; RE-ENROLLMENT ACTIVATION TOOL
                      </span>
                      <span className="text-[10px] text-neutral-300 font-semibold block">
                        Promoted pupils stay inactive after vacation until activated. Click below to activate as pupils report back!
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const inactiveStudents = students.filter(s => !s.active);
                      if (inactiveStudents.length === 0) {
                        showToast("No inactive pupils found to activate.");
                        return;
                      }
                      if (confirm(`Are you sure you want to activate ALL ${inactiveStudents.length} inactive pupils school-wide?`)) {
                        inactiveStudents.forEach(st => updateStudent({ ...st, active: true }));
                        showToast(`⚡ Successfully activated ALL ${inactiveStudents.length} inactive pupils school-wide!`);
                      }
                    }}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5 shrink-0 border-none"
                  >
                    <span>⚡ Activate All Inactive ({students.filter(s => !s.active).length})</span>
                  </button>
                </div>

                {/* Class-by-Class Activation Quick Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-neutral-800">
                  <span className="text-[9px] text-neutral-400 uppercase font-black mr-1">Activate By Class:</span>
                  {(['Nursery', 'KG1', 'KG2', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9'] as StudentClass[]).map(cls => {
                    const count = students.filter(s => s.class === cls && !s.active).length;
                    if (count === 0) return null;
                    return (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => {
                          const inClass = students.filter(s => s.class === cls && !s.active);
                          inClass.forEach(st => updateStudent({ ...st, active: true }));
                          showToast(`⚡ Activated all ${inClass.length} inactive pupil(s) in ${cls}!`);
                        }}
                        className="px-2.5 py-1 bg-neutral-900 hover:bg-emerald-950 border border-emerald-800 text-[9px] text-emerald-400 uppercase font-bold transition-all cursor-pointer flex items-center gap-1"
                        title={`Activate all ${count} inactive pupils in ${cls}`}
                      >
                        <span>{cls} ({count})</span>
                        <span className="text-emerald-400 font-extrabold">⚡</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className={`overflow-y-auto max-h-[480px] ${studentViewStyle === 'list' ? 'divide-y-2 divide-neutral-850' : 'p-6 bg-neutral-950/20'}`}>
              {filteredStudentsForList.length === 0 ? (
                <div className="p-12 text-center text-xs font-mono font-black uppercase text-neutral-500 tracking-wider">
                  📂 No students matching filters found or directory is empty.
                </div>
              ) : studentViewStyle === 'album' ? (
                /* Album Grid View */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredStudentsForList.map(st => {
                    const discountInfo = getDiscountedTermFee(st, payments, activeTerm, currentDate, systemSettings);
                    const studentFee = discountInfo.termFee;
                    const legacyDebt = st.legacyDebt || 0;
                    const totalTarget = studentFee + legacyDebt;
                    const studentPayments = payments.filter(p => p.studentId === st.id && !p.isAbsent);
                    const totalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
                    const percentDone = totalTarget > 0 ? Math.min(100, (totalPaid / totalTarget) * 100) : 0;

                    const todayPay = payments?.find(p => p.studentId === st.id && p.date === currentDate);
                    const isAbsent = !!todayPay && !!todayPay.isAbsent;
                    const isPaid = !!todayPay && !todayPay.isAbsent && todayPay.verified;

                    return (
                      <div 
                        key={st.id} 
                        className={`group bg-neutral-950 border-2 transition-all p-3 flex flex-col justify-between hover:scale-[1.01] active:scale-[0.99] ${
                          st.active 
                            ? 'border-neutral-850 hover:border-amber-400/60 shadow-[3px_3px_0px_0px_rgba(251,191,36,0.05)]' 
                            : 'border-red-950/60 opacity-60 hover:opacity-100 hover:border-red-500/40'
                        }`}
                      >
                        {/* Image Frame */}
                        <div className="relative w-full aspect-[4/5] overflow-hidden bg-neutral-900 border border-neutral-800 rounded-sm mb-3">
                          {/* Attendance Indicator pill */}
                          <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 z-10">
                            <span className={`text-[8px] font-mono font-black uppercase px-1.5 py-0.5 border ${
                              !st.active
                                ? 'bg-neutral-950/95 border-neutral-800 text-neutral-500'
                                : isPaid
                                  ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-400'
                                  : isAbsent
                                    ? 'bg-red-950/95 border-red-500/50 text-red-400'
                                    : 'bg-amber-950/95 border-amber-500/50 text-amber-400'
                            }`}>
                              {!st.active ? 'Inactive' : isPaid ? 'Present' : isAbsent ? 'Absent' : 'Unmarked'}
                            </span>
                          </div>

                          {st.photoUrl ? (
                            <img 
                              src={st.photoUrl} 
                              alt={st.name} 
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className={`w-full h-full flex flex-col items-center justify-center font-mono uppercase transition-colors ${
                              st.gender === 'Male'
                                ? 'bg-gradient-to-br from-neutral-900 to-sky-950/30 text-sky-400'
                                : st.gender === 'Female'
                                  ? 'bg-gradient-to-br from-neutral-900 to-pink-950/30 text-pink-400'
                                  : 'bg-gradient-to-br from-neutral-900 to-neutral-850 text-neutral-400'
                            }`}>
                              <span className="text-xl font-black tracking-widest">{st.name.slice(0, 2).toUpperCase()}</span>
                              <span className="text-[8px] text-neutral-500 font-bold mt-1">{st.gender === 'Male' ? '👦 Boy' : st.gender === 'Female' ? '👧 Girl' : '👤 Pupil'}</span>
                            </div>
                          )}

                          {/* Upload Hover Overlay */}
                          <label 
                            className="absolute bottom-1.5 right-1.5 p-1.5 rounded-full bg-black/80 hover:bg-amber-400 hover:text-black text-neutral-400 hover:scale-110 cursor-pointer transition-all border border-neutral-800 opacity-0 group-hover:opacity-100 focus-within:opacity-100 z-10" 
                            title="Upload new photo"
                          >
                            <Camera size={11} className="stroke-[2.5]" />
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="sr-only" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    if (typeof reader.result === 'string') {
                                      setCropperSrc(reader.result);
                                      setOnCropperComplete(() => (cropped: string) => {
                                        updateStudent({
                                          ...st,
                                          photoUrl: cropped
                                        });
                                        showToast(`Photo updated for ${st.name}.`);
                                        setCropperSrc(null);
                                        setOnCropperComplete(null);
                                      });
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        </div>

                        {/* Name & Class info */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <p 
                              onClick={() => setHistoryModalStudent(st)}
                              className={`text-xs font-black text-white hover:text-amber-400 cursor-pointer transition-colors uppercase tracking-tight truncate ${!st.active ? 'line-through text-neutral-500' : ''}`}
                              title="Click to view history"
                            >
                              {st.name}
                            </p>
                            <div className="flex items-center justify-between text-[8px] font-mono font-black uppercase tracking-widest mt-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-amber-400 bg-neutral-900 px-1.5 py-0.5 border border-neutral-850">{st.class}</span>
                                {!st.active && (
                                  <span className="text-[7.5px] font-mono font-black text-rose-500 bg-rose-950/30 px-1.5 py-0.5 border border-rose-900/40 tracking-wider">
                                    WITHDRAWN
                                  </span>
                                )}
                              </div>
                              <span className="text-neutral-500">#{st.rollNumber}</span>
                            </div>
                          </div>

                          {/* Miniature progress bar */}
                          <div className="mt-2.5">
                            <div className="flex justify-between items-center text-[7.5px] font-mono text-neutral-500 font-extrabold uppercase mb-1">
                              <span>Settled</span>
                              <span className={percentDone >= 100 ? 'text-emerald-400' : 'text-neutral-400'}>{percentDone.toFixed(0)}%</span>
                            </div>
                            <div className="h-1 w-full bg-neutral-900 border border-neutral-850 p-[1px]">
                              <div 
                                className={`h-full transition-all duration-350 ${
                                  percentDone >= 100 
                                    ? 'bg-emerald-500' 
                                    : percentDone > 50 
                                      ? 'bg-amber-400' 
                                      : 'bg-rose-500'
                                }`}
                                style={{ width: `${percentDone}%` }}
                              />
                            </div>
                          </div>

                          {/* Interactive button bar */}
                          <div className="mt-3 pt-2 border-t border-neutral-850/50 grid grid-cols-5 gap-1">
                            <button
                              type="button"
                              onClick={() => setHistoryModalStudent(st)}
                              title="View pupil full ledger/history"
                              className="p-1.5 border border-neutral-800 hover:border-amber-400 hover:text-amber-400 bg-neutral-950 text-neutral-400 transition-colors cursor-pointer flex items-center justify-center rounded-xs"
                            >
                              <FileText size={10} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAdmissionFormStudent(st);
                                setShowAdmissionFormModal(true);
                              }}
                              title="Print Official Admission & Enrollment Form"
                              className="p-1.5 border border-neutral-800 hover:border-sky-400 hover:text-sky-400 bg-neutral-950 text-neutral-400 transition-colors cursor-pointer flex items-center justify-center rounded-xs"
                            >
                              <FileSignature size={10} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedIdCardStudent(st)}
                              title="Print physical ID Card"
                              className="p-1.5 border border-neutral-800 hover:border-amber-400 hover:text-amber-400 bg-neutral-950 text-neutral-400 transition-colors cursor-pointer flex items-center justify-center rounded-xs"
                            >
                              <Printer size={10} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(st)}
                              title="Edit details"
                              className="p-1.5 border border-neutral-800 hover:border-neutral-600 bg-neutral-950 text-neutral-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center rounded-xs"
                            >
                              <Edit2 size={10} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStudentActive(st)}
                              title={st.active ? 'Deactivate pupil' : 'Reactivate pupil'}
                              className={`p-1.5 border transition-colors cursor-pointer flex items-center justify-center rounded-xs ${
                                st.active 
                                  ? 'border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600 bg-neutral-950' 
                                  : 'border-red-850 text-red-500 bg-red-950/20'
                              }`}
                            >
                              {st.active ? <Check size={10} className="stroke-[3.5]" /> : <X size={10} className="stroke-[3.5]" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* List View (Accordion Categories) */
                ((['Pre-school', 'Primary', 'JHS'] as SchoolCategory[]).map(cat => {
                  const categoryStudents = groupedFilteredStudents[cat] || [];
                  if (categoryStudents.length === 0) return null;

                  const isExpanded = expandedRegistryCategories[cat];
                  const categoryTitles: Record<SchoolCategory, string> = {
                    'Pre-school': '🧸 PRE-SCHOOL GRADES (NURSERY, KG1 & KG2)',
                    'Primary': '✏️ PRIMARY COHORT (B1 TO B6)',
                    'JHS': '🎓 JUNIOR HIGH SCHOOL / JHS (B7 TO B9)'
                  };

                  return (
                    <div key={cat} className="border-b border-neutral-850 last:border-b-0">
                      {/* Accordion Header Button */}
                      <button
                        type="button"
                        onClick={() => setExpandedRegistryCategories(prev => ({ ...prev, [cat]: !prev[cat] }))}
                        className="w-full px-6 py-4 bg-neutral-950/80 hover:bg-neutral-900/60 transition-all flex items-center justify-between cursor-pointer font-sans text-left border-b border-neutral-850/60"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-amber-400 uppercase tracking-wider font-mono">
                            {categoryTitles[cat]}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[10px] font-mono font-black uppercase bg-neutral-900 border border-neutral-800 text-neutral-400 px-2 py-0.5 rounded-sm">
                            {categoryStudents.length} {categoryStudents.length === 1 ? 'PUPIL' : 'PUPILS'}
                          </span>
                          <span className="text-neutral-500 hover:text-white transition-colors">
                            {isExpanded ? (
                              <ChevronDown size={14} className="stroke-[3]" />
                            ) : (
                              <ChevronRight size={14} className="stroke-[3]" />
                            )}
                          </span>
                        </div>
                      </button>

                      {/* Accordion Content */}
                      {isExpanded && (
                        <div className="divide-y divide-neutral-850/60 bg-neutral-900/10">
                          {categoryStudents.map(st => {
                            const discountInfo = getDiscountedTermFee(st, payments, activeTerm, currentDate, systemSettings);
                            const studentFee = discountInfo.termFee;
                            const legacyDebt = st.legacyDebt || 0;
                            const totalTarget = studentFee + legacyDebt;
                            const studentPayments = payments.filter(p => p.studentId === st.id && !p.isAbsent);
                            const totalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
                            const percentDone = totalTarget > 0 ? Math.min(100, (totalPaid / totalTarget) * 100) : 0;
                            const balanceDue = Math.max(0, totalTarget - totalPaid);

                            const isStudentExpanded = !!expandedStudentIds[st.id];
                            const studentAllPayments = payments.filter(p => p.studentId === st.id);
                            const formattedEnrollmentDate = st.enrollmentDate ? (() => {
                              try {
                                return new Date(`${st.enrollmentDate}T00:00:00`).toLocaleDateString("en-US", {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                });
                              } catch (e) {
                                return st.enrollmentDate;
                              }
                            })() : 'Not Specified';

                            return (
                              <div key={st.id} className="border-b border-neutral-850/40 last:border-0 bg-neutral-900/10">
                                {/* Student Header Row */}
                                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-neutral-800/10 transition-colors">
                                  <div 
                                    className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1 cursor-pointer select-none"
                                    onClick={() => setExpandedStudentIds(prev => ({ ...prev, [st.id]: !prev[st.id] }))}
                                  >
                                    {/* Student Avatar Widget */}
                                    <div className="shrink-0 w-11 h-11 relative">
                                      {st.photoUrl ? (
                                        <img 
                                          src={st.photoUrl} 
                                          alt={st.name} 
                                          className="w-11 h-11 rounded-full object-cover border-2 border-neutral-800"
                                          referrerPolicy="no-referrer"
                                        />
                                      ) : (
                                        <div className="w-11 h-11 rounded-full bg-neutral-950 border-2 border-neutral-850 flex items-center justify-center text-xs font-black text-amber-400 font-mono tracking-tighter uppercase">
                                          {st.name.slice(0, 2).toUpperCase()}
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className="space-y-2 flex-1 min-w-0">
                                      <p 
                                        className={`text-base font-black text-white hover:text-amber-400 transition-colors uppercase tracking-tight flex items-center gap-1.5 ${!st.active ? 'line-through text-neutral-500' : ''}`}
                                        title="Click to toggle detailed payment history & enrollment info"
                                      >
                                        {isStudentExpanded ? (
                                          <ChevronDown size={16} className="text-amber-400 shrink-0 stroke-[3]" />
                                        ) : (
                                          <ChevronRight size={16} className="text-neutral-500 hover:text-white shrink-0 stroke-[3]" />
                                        )}
                                        <span>{st.name}</span>
                                        <span className="text-neutral-500 hover:text-amber-400 text-[10px] lowercase font-mono font-normal no-underline">
                                          ({isStudentExpanded ? 'click to collapse' : 'click to expand details'})
                                        </span>
                                      </p>
                                      <div className="flex flex-wrap gap-2.5 items-center text-[10px] text-neutral-400 font-mono font-bold uppercase tracking-wider">
                                        <span className="bg-neutral-955 border border-neutral-800 px-2.5 py-0.5 text-amber-400 font-black">{st.class}</span>
                                        {st.gender && (
                                          <>
                                            <span>•</span>
                                            <span className="bg-neutral-955 border border-neutral-800 px-2 py-0.5 text-neutral-300 font-extrabold flex items-center gap-0.5">
                                              {st.gender === 'Male' ? '👦 M' : '👧 F'}
                                            </span>
                                          </>
                                        )}
                                        <span>•</span>
                                        <span>Category: {st.category}</span>
                                        <span>•</span>
                                        <span>ID: {st.rollNumber}</span>
                                        {st.discount !== undefined && st.discount > 0 && (
                                          <>
                                            <span>•</span>
                                            <span className="bg-amber-955 border border-amber-500/35 px-2 py-0.5 text-amber-400 font-black">
                                              DISCOUNT: GHC {st.discount.toFixed(2)}/DAY
                                            </span>
                                          </>
                                        )}
                                      </div>

                                      {/* Visual Fee-Payment Progress Bar */}
                                      <div className="pt-2 max-w-md w-full sm:w-[320px] md:w-[360px]">
                                        <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-wider mb-1">
                                          <span className="text-neutral-500 font-black">
                                            {isTermPayer(st) ? 'Term Fee Scheme' : 'Daily Gate Scheme'}
                                          </span>
                                          <span className={`font-black ${percentDone >= 100 ? 'text-emerald-400' : percentDone > 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                                            GHC {totalPaid.toFixed(2)} / GHC {totalTarget.toFixed(2)} ({percentDone.toFixed(0)}%)
                                          </span>
                                        </div>
                                        <div className="h-2 w-full bg-neutral-950 border border-neutral-850 p-[1px] rounded-none">
                                          <div 
                                            className={`h-full transition-all duration-500 ${
                                              percentDone >= 100 
                                                ? 'bg-emerald-500' 
                                                : percentDone > 50 
                                                  ? 'bg-amber-400' 
                                                  : 'bg-rose-500'
                                            }`}
                                            style={{ width: `${percentDone}%` }}
                                          />
                                        </div>
                                        {balanceDue > 0 ? (
                                          <div className="text-[8.5px] text-neutral-500 font-mono mt-1 flex items-center gap-1.5">
                                            <span>Balance Due:</span>
                                            <span className="font-bold text-neutral-300">GHC {balanceDue.toFixed(2)}</span>
                                          </div>
                                        ) : (
                                          <div className="text-[8.5px] text-emerald-500 font-mono mt-1 font-black uppercase flex items-center gap-1.5">
                                            <span>✓ Fully Cleared &amp; Settled</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 self-end md:self-center">
                                    {/* Admission Form trigger */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAdmissionFormStudent(st);
                                        setShowAdmissionFormModal(true);
                                      }}
                                      title="Print Official Admission & Enrollment Form"
                                      className="p-2 border-2 border-neutral-800 hover:border-sky-400 hover:text-sky-400 bg-neutral-950 text-neutral-400 transition-colors cursor-pointer flex items-center justify-center gap-1 font-mono text-[9px] font-black uppercase tracking-wider"
                                    >
                                      <FileSignature size={13} className="stroke-[2.5]" />
                                      <span className="hidden sm:inline">Admission Form</span>
                                    </button>

                                    {/* ID Card trigger */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedIdCardStudent(st);
                                      }}
                                      title="Generate & Print Student ID Card with QR Code"
                                      className="p-2 border-2 border-neutral-800 hover:border-amber-400 hover:text-amber-400 bg-neutral-950 text-neutral-400 transition-colors cursor-pointer flex items-center justify-center gap-1 font-mono text-[9px] font-black uppercase tracking-wider"
                                    >
                                      <Printer size={13} className="stroke-[2.5]" />
                                      <span className="hidden sm:inline">Print ID</span>
                                    </button>

                                    {/* Active toggle */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleStudentActive(st);
                                      }}
                                      title={st.active ? 'Deactivate from checkout register' : 'Reactivate into register'}
                                      className={`p-2 border-2 transition-colors cursor-pointer ${
                                        st.active 
                                          ? 'border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600 bg-neutral-950' 
                                          : 'border-red-800 text-red-500 bg-red-950/20'
                                      }`}
                                    >
                                      {st.active ? <Check size={14} className="stroke-[3]" /> : <X size={14} className="stroke-[3]" />}
                                    </button>

                                    {/* Edit trigger */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStartEdit(st);
                                      }}
                                      className="p-2 border-2 border-neutral-800 hover:border-neutral-600 bg-neutral-950 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                                    >
                                      <Edit2 size={13} />
                                    </button>

                                    {/* Delete trigger */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (currentUser?.role !== 'Administrator') {
                                          alert('Access Denied: Only Administrators are permitted to delete student records completely from the system.');
                                          return;
                                        }
                                        setDeleteConf({
                                          isOpen: true,
                                          type: 'student',
                                          targetId: st.id,
                                          targetName: st.name,
                                          userInput: '',
                                          onConfirm: () => {
                                            deleteStudent(st.id);
                                            showToast('Pupil record purged.');
                                          }
                                        });
                                      }}
                                      className={`p-2 border-2 transition-colors cursor-pointer ${
                                        currentUser?.role === 'Administrator'
                                          ? 'border-red-900 bg-neutral-950 text-red-500 hover:bg-red-950/30'
                                          : 'border-neutral-855 bg-neutral-950 text-neutral-600 cursor-not-allowed opacity-50'
                                      }`}
                                      title={currentUser?.role !== 'Administrator' ? 'Administrator Only (Access Denied)' : 'Delete Student / Purge'}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>

                                {/* Expanded Sub-Accordion Content */}
                                {isStudentExpanded && (
                                  <div className="px-6 pb-6 pt-2 bg-neutral-950/40 border-t border-neutral-850/20 animate-fade-in">
                                    <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-sm space-y-4 font-sans">
                                      {/* Sub-header detailing date parameters */}
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-850 pb-2.5 gap-2.5">
                                        <div className="flex items-center gap-2">
                                          <CalendarDays size={14} className="text-amber-400" />
                                          <span className="text-[11px] font-mono font-bold text-neutral-350">
                                            📅 Pupil Enrollment Date: <strong className="text-amber-400">{formattedEnrollmentDate}</strong>
                                          </span>
                                        </div>
                                        <div className="text-left sm:text-right font-mono text-[10px]">
                                          <span className="text-neutral-400 block font-bold">
                                            Total Logged Payments: <strong className="text-emerald-400 font-mono">GHC {totalPaid.toFixed(2)}</strong>
                                          </span>
                                          <span className="text-neutral-500 text-[9px] block">
                                            Active Term: {activeTerm?.name || 'Unspecified'}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Chronological Presence & Payment History Timeline */}
                                      <div className="space-y-2">
                                        <span className="text-[9.5px] font-mono font-black text-neutral-400 uppercase tracking-widest block font-bold">
                                          Detailed Payment history ({studentAllPayments.length} entries)
                                        </span>

                                        <div className="bg-neutral-900/30 border border-neutral-850 rounded-sm overflow-hidden divide-y divide-neutral-900 max-h-[180px] overflow-y-auto">
                                          {studentAllPayments.length === 0 ? (
                                            <div className="p-6 text-center text-[10.5px] font-mono font-bold uppercase text-neutral-500 tracking-wide">
                                              No payment history logs or daily transactions recorded for this student.
                                            </div>
                                          ) : (
                                            [...studentAllPayments].sort((a,b) => b.date.localeCompare(a.date)).map((pay) => (
                                              <div key={pay.id} className="p-3 flex items-center justify-between hover:bg-neutral-900/40 text-xs font-mono">
                                                <div className="flex items-center gap-2.5">
                                                  <div className={`w-2 h-2 rounded-full ${pay.isAbsent ? 'bg-red-500' : 'bg-emerald-400'}`} />
                                                  <div>
                                                    <span className="text-white font-black block text-[11px]">{pay.date}</span>
                                                    <span className="text-[9.5px] text-neutral-500 block">
                                                      Collector: {pay.collectedBy || 'Staff Registrar'}
                                                    </span>
                                                  </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                  {pay.isAbsent ? (
                                                    <span className="text-[9px] bg-red-950/70 text-red-400 border border-red-900/40 px-2 py-0.5 text-right font-black uppercase rounded-xs">
                                                      Absent
                                                    </span>
                                                  ) : (
                                                    <div className="text-right">
                                                      <span className="text-[10.5px] text-emerald-400 font-black block">
                                                        GHC {pay.amount.toFixed(2)}
                                                      </span>
                                                      <span className="text-[8px] text-neutral-550 block uppercase tracking-wide">
                                                        {pay.paymentMethod ? `${pay.paymentMethod}` : 'Present / Paid'}
                                                      </span>
                                                    </div>
                                                  )}

                                                  <span className={`text-[8.5px] select-none font-bold px-1.5 py-0.2 border rounded-sm uppercase ${pay.verified ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50' : 'bg-amber-951 text-amber-300 border-amber-900/30'}`}>
                                                    {pay.verified ? 'Verified' : 'Pending'}
                                                  </span>
                                                </div>
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }))
              )}
            </div>
          </div>
        </div>
      </div>
      ) : activeTab === 'mfa' ? (
        <div className="space-y-6">
          {/* Staff & Teacher Statistics Summary Banner */}
          <div className="bg-neutral-900 border-4 border-neutral-800 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-3">
              <div>
                <h4 className="text-sm font-black uppercase font-mono tracking-wider flex items-center gap-2 text-amber-400">
                  <Users size={16} /> Staff & Teacher Analysis Dashboard
                </h4>
                <p className="text-[10px] text-neutral-400">Demographic distribution, categories, and employment classification summary</p>
              </div>
              <div className="flex gap-4 text-xs font-mono">
                <div className="bg-neutral-950 px-3 py-1.5 border border-neutral-850 rounded">
                  <span className="text-neutral-500 font-bold uppercase text-[9px] block">Total Staff</span>
                  <span className="text-base font-black text-white">{teacherStats.overall.total}</span>
                </div>
                <div className="bg-neutral-950 px-3 py-1.5 border border-neutral-850 rounded">
                  <span className="text-neutral-500 font-bold uppercase text-[9px] block">Active Teachers</span>
                  <span className="text-base font-black text-amber-400">{teacherStats.overall.teachersCount}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Pre-school Card */}
              <div className="bg-neutral-950 p-4 border border-neutral-800 rounded-lg space-y-3 font-sans">
                <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 font-mono">🧸 Pre-school</span>
                  <span className="text-sm font-black text-white">{teacherStats['Pre-school'].total} Teachers</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div className="bg-neutral-900/40 p-2 rounded border border-neutral-850">
                    <span className="text-neutral-500 block">Male</span>
                    <span className="text-xs font-bold text-white">{teacherStats['Pre-school'].male}</span>
                  </div>
                  <div className="bg-neutral-900/40 p-2 rounded border border-neutral-850">
                    <span className="text-neutral-500 block">Female</span>
                    <span className="text-xs font-bold text-white">{teacherStats['Pre-school'].female}</span>
                  </div>
                </div>
                <div className="text-[9px] text-neutral-400 font-mono">
                  Full-Time: {teacherStats['Pre-school'].fullTime} | Part-Time: {teacherStats['Pre-school'].partTime}
                </div>
              </div>

              {/* Primary Card */}
              <div className="bg-neutral-950 p-4 border border-neutral-800 rounded-lg space-y-3 font-sans">
                <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 font-mono">✏️ Primary</span>
                  <span className="text-sm font-black text-white">{teacherStats['Primary'].total} Teachers</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div className="bg-neutral-900/40 p-2 rounded border border-neutral-850">
                    <span className="text-neutral-500 block">Male</span>
                    <span className="text-xs font-bold text-white">{teacherStats['Primary'].male}</span>
                  </div>
                  <div className="bg-neutral-900/40 p-2 rounded border border-neutral-850">
                    <span className="text-neutral-500 block">Female</span>
                    <span className="text-xs font-bold text-white">{teacherStats['Primary'].female}</span>
                  </div>
                </div>
                <div className="text-[9px] text-neutral-400 font-mono">
                  Full-Time: {teacherStats['Primary'].fullTime} | Part-Time: {teacherStats['Primary'].partTime}
                </div>
              </div>

              {/* JHS Card */}
              <div className="bg-neutral-950 p-4 border border-neutral-800 rounded-lg space-y-3 font-sans">
                <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 font-mono">🔬 JHS</span>
                  <span className="text-sm font-black text-white">{teacherStats['JHS'].total} Teachers</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div className="bg-neutral-900/40 p-2 rounded border border-neutral-850">
                    <span className="text-neutral-500 block">Male</span>
                    <span className="text-xs font-bold text-white">{teacherStats['JHS'].male}</span>
                  </div>
                  <div className="bg-neutral-900/40 p-2 rounded border border-neutral-850">
                    <span className="text-neutral-500 block">Female</span>
                    <span className="text-xs font-bold text-white">{teacherStats['JHS'].female}</span>
                  </div>
                </div>
                <div className="text-[9px] text-neutral-400 font-mono">
                  Full-Time: {teacherStats['JHS'].fullTime} | Part-Time: {teacherStats['JHS'].partTime}
                </div>
              </div>

              {/* Employment Breakdown Card */}
              <div className="bg-neutral-950 p-4 border border-neutral-800 rounded-lg space-y-2 font-sans">
                <div className="border-b border-neutral-900 pb-1.5 font-sans">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 font-mono">💼 Employment Types</span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Full:</span>
                    <span className="font-bold text-white">{teacherStats.overall.fullTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Part:</span>
                    <span className="font-bold text-white">{teacherStats.overall.partTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Cont:</span>
                    <span className="font-bold text-white">{teacherStats.overall.contract}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Vol:</span>
                    <span className="font-bold text-white">{teacherStats.overall.volunteer}</span>
                  </div>
                </div>
                <div className="text-[8px] text-neutral-500 font-sans uppercase tracking-wider pt-1 border-t border-neutral-900/60">
                  Total Genders: {teacherStats.overall.maleTeachers}M | {teacherStats.overall.femaleTeachers}F
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Staff Registration or Editing Card on Left */}
          <div className="bg-neutral-900 border-4 border-neutral-800 p-8 h-fit space-y-5">
            {editStaffObj ? (
              <form onSubmit={handleAdminEditStaffSubmit} className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b-2 border-neutral-800">
                  <div className="flex items-center gap-3">
                    <Edit2 size={18} className="text-amber-400" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Modify Staff Profile</h3>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setEditStaffObj(null)}
                    className="text-xs font-black text-neutral-500 hover:text-white uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                      Staff Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editStaffObj.name}
                      onChange={(e) => setEditStaffObj({ ...editStaffObj, name: e.target.value })}
                      placeholder="e.g. Mrs. Rebecca Hanson"
                      className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                      Professional Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={editStaffObj.email}
                      onChange={(e) => setEditStaffObj({ ...editStaffObj, email: e.target.value })}
                      placeholder="e.g. rebecca.hanson@school.edu"
                      className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-700"
                    />
                  </div>

                  <div className="space-y-4 font-sans">
                    <div className="grid grid-cols-2 gap-3">
                      <div className={editStaffObj.role === 'Teacher' ? 'col-span-2 sm:col-span-1' : 'col-span-2'}>
                        <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                          Administrative Role
                        </label>
                        <select
                          value={editStaffObj.role}
                          onChange={(e) => setEditStaffObj({ ...editStaffObj, role: e.target.value as UserRole, assignedClass: e.target.value === 'Teacher' ? editStaffObj.assignedClass || 'B1' : undefined })}
                          className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                        >
                          <option value="Teacher">Teacher</option>
                          <option value="Accountant">Accountant</option>
                          <option value="Administrator">Administrator</option>
                          <option value="Headmaster">Headmaster</option>
                        </select>
                      </div>

                      {editStaffObj.role !== 'Teacher' && (
                        <div>
                          <label className="block text-[10px] font-black text-neutral-555 uppercase tracking-widest mb-1.5 font-mono">
                            Scope Level
                          </label>
                          <div className="bg-neutral-950 border-2 border-neutral-850 py-3 px-4 text-xs text-neutral-500 font-extrabold font-mono uppercase tracking-wider">
                            {editStaffObj.role === 'Administrator' || editStaffObj.role === 'Headmaster' ? 'All Areas' : 'Accounting Desk'}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 bg-neutral-950/40 p-3 border border-neutral-850 rounded">
                      <div>
                        <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                          Gender Analysis
                        </label>
                        <select
                          value={editStaffObj.gender || 'Male'}
                          onChange={(e) => setEditStaffObj({ ...editStaffObj, gender: e.target.value as 'Male' | 'Female' })}
                          className="w-full bg-neutral-900 border-2 border-neutral-800 py-2.5 px-3 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                          Employment Type
                        </label>
                        <select
                          value={editStaffObj.employmentType || 'Full-Time'}
                          onChange={(e) => setEditStaffObj({ ...editStaffObj, employmentType: e.target.value as any })}
                          className="w-full bg-neutral-900 border-2 border-neutral-800 py-2.5 px-3 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                        >
                          <option value="Full-Time">Full-Time</option>
                          <option value="Part-Time">Part-Time</option>
                          <option value="Contract">Contract</option>
                          <option value="Volunteer">Volunteer</option>
                        </select>
                      </div>
                    </div>

                    {editStaffObj.role === 'Teacher' && (
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest font-mono">
                          Assigned Gate Checkpoints (Multi-Select)
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 bg-neutral-950/60 p-3.5 border border-neutral-850 rounded">
                          {classes.map(cls => {
                            const currentClasses = editStaffObj.assignedClasses || (editStaffObj.assignedClass ? [editStaffObj.assignedClass] : []);
                            const isChecked = currentClasses.includes(cls);
                            return (
                              <label key={cls} className="flex items-center gap-2 text-xs font-bold text-neutral-300 hover:text-white cursor-pointer select-none py-1.5 px-2 hover:bg-neutral-900/50 rounded transition-colors">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    const nextClasses = isChecked
                                      ? currentClasses.filter(c => c !== cls)
                                      : [...currentClasses, cls];
                                    setEditStaffObj({
                                      ...editStaffObj,
                                      assignedClasses: nextClasses,
                                      assignedClass: nextClasses[0] || undefined
                                    });
                                  }}
                                  className="w-4 h-4 accent-amber-400 cursor-pointer"
                                />
                                <span className="font-mono">{cls}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="bg-neutral-950 p-5 sm:p-6 border-2 border-amber-500/40 rounded-lg space-y-4 shadow-lg">
                      <div className="flex items-center justify-between pb-2.5 border-b border-neutral-800">
                        <span className="text-xs font-black uppercase tracking-widest text-amber-400 font-mono flex items-center gap-2">
                          💵 Financial & Momo Payout Profile
                        </span>
                        <span className="text-[10px] font-mono font-bold text-amber-300/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                          Payroll & Mobile Money Setup
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                        <div className="space-y-2">
                          <label className="block text-xs font-black text-amber-300 uppercase tracking-wider font-mono">
                            Monthly Stipend/Salary (GHC)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={editStaffObj.stipendSalary || ''}
                            onChange={(e) => setEditStaffObj({ ...editStaffObj, stipendSalary: e.target.value })}
                            placeholder="e.g. 1500.00"
                            className="w-full bg-neutral-900 border-2 border-neutral-700 py-3 px-4 text-sm font-mono font-bold text-white focus:outline-none focus:border-amber-400 focus:bg-neutral-950 focus:ring-2 focus:ring-amber-500/20 rounded placeholder:text-neutral-500 transition-all"
                          />

                          {/* Percentage Quick Adjust Shortcuts */}
                          <div className="space-y-1 pt-1">
                            <span className="text-[9px] font-mono text-amber-400 uppercase font-bold block">
                              ⚡ Quick % Wage Adjust:
                            </span>
                            <div className="flex flex-wrap items-center gap-1">
                              {[5, 10, 15, 20].map((pct) => (
                                <button
                                  key={pct}
                                  type="button"
                                  onClick={() => {
                                    const current = parseFloat(editStaffObj.stipendSalary) || 0;
                                    const nextVal = (current * (1 + pct / 100)).toFixed(2);
                                    setEditStaffObj({ ...editStaffObj, stipendSalary: nextVal });
                                    playFeedbackSound('click');
                                  }}
                                  className="px-2 py-0.5 bg-neutral-900 hover:bg-emerald-950 border border-neutral-700 hover:border-emerald-500 text-[9px] font-mono font-bold text-emerald-400 rounded transition-colors cursor-pointer"
                                  title={`Increase salary by +${pct}%`}
                                >
                                  +{pct}%
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  const current = parseFloat(editStaffObj.stipendSalary) || 0;
                                  const nextVal = (current * 0.95).toFixed(2);
                                  setEditStaffObj({ ...editStaffObj, stipendSalary: nextVal });
                                  playFeedbackSound('click');
                                }}
                                className="px-2 py-0.5 bg-neutral-900 hover:bg-rose-950 border border-neutral-700 hover:border-rose-500 text-[9px] font-mono font-bold text-rose-400 rounded transition-colors cursor-pointer"
                                title="Reduce salary by -5%"
                              >
                                -5%
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-black text-amber-300 uppercase tracking-wider font-mono">
                            Momo Registered No.
                          </label>
                          <input
                            type="text"
                            value={editStaffObj.momoNumber || ''}
                            onChange={(e) => setEditStaffObj({ ...editStaffObj, momoNumber: e.target.value })}
                            placeholder="e.g. 0541234567"
                            className="w-full bg-neutral-900 border-2 border-neutral-700 py-3 px-4 text-sm font-mono font-bold text-white focus:outline-none focus:border-amber-400 focus:bg-neutral-950 focus:ring-2 focus:ring-amber-500/20 rounded placeholder:text-neutral-500 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-black text-amber-300 uppercase tracking-wider font-mono">
                            Registered Momo Name
                          </label>
                          <input
                            type="text"
                            value={editStaffObj.momoName || ''}
                            onChange={(e) => setEditStaffObj({ ...editStaffObj, momoName: e.target.value })}
                            placeholder="e.g. Mary Appiah"
                            className="w-full bg-neutral-900 border-2 border-neutral-700 py-3 px-4 text-sm font-mono font-bold text-white focus:outline-none focus:border-amber-400 focus:bg-neutral-950 focus:ring-2 focus:ring-amber-500/20 rounded placeholder:text-neutral-500 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Granular Staff Permissions Section */}
                    <div className="bg-neutral-950/80 p-5 border-2 border-neutral-800 rounded space-y-3 font-mono">
                      <div className="flex items-center justify-between pb-2 border-b border-neutral-850">
                        <span className="text-xs font-black uppercase tracking-widest text-amber-400 font-mono flex items-center gap-2">
                          <ShieldAlert size={15} /> Granular Access Permissions
                        </span>
                        <span className="text-[10px] text-neutral-500 uppercase">Interactive Checkboxes</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {[
                          { key: 'canRecordPayments', label: '💳 Record Fee Payments', desc: 'Allow recording daily & term payments' },
                          { key: 'canEditPayments', label: '✏️ Modify Payment Logs', desc: 'Allow editing or updating payment entries' },
                          { key: 'canDeletePayments', label: '🗑️ Delete Payment Records', desc: 'Allow purging payment records' },
                          { key: 'canManageStudents', label: '🎓 Manage Pupil Roster', desc: 'Allow adding, editing or deleting pupils' },
                          { key: 'canManageExams', label: '📝 Manage Exam System', desc: 'Allow recording exam marks & fees' },
                          { key: 'canViewReports', label: '📊 View Reports & Audit', desc: 'Allow viewing financial reports & audits' },
                          { key: 'canManageSettings', label: '⚙️ System & Term Settings', desc: 'Allow modifying school terms & settings' }
                        ].map(item => {
                          const currentPerms: StaffPermissions = editStaffObj.permissions || {
                            canRecordPayments: true,
                            canEditPayments: editStaffObj.role === 'Administrator' || editStaffObj.role === 'Headmaster' || editStaffObj.role === 'Accountant',
                            canDeletePayments: editStaffObj.role === 'Administrator' || editStaffObj.role === 'Headmaster',
                            canManageStudents: editStaffObj.role !== 'Teacher',
                            canManageExams: true,
                            canViewReports: editStaffObj.role !== 'Teacher',
                            canManageSettings: editStaffObj.role === 'Administrator' || editStaffObj.role === 'Headmaster'
                          };
                          const isChecked = !!currentPerms[item.key as keyof StaffPermissions];
                          return (
                            <label key={item.key} className={`p-2.5 rounded border flex items-start gap-2.5 cursor-pointer transition-all ${isChecked ? 'bg-amber-950/20 border-amber-600/60 text-white' : 'bg-neutral-900/40 border-neutral-800 text-neutral-400 hover:border-neutral-700'}`}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  setEditStaffObj({
                                    ...editStaffObj,
                                    permissions: {
                                      ...currentPerms,
                                      [item.key]: e.target.checked
                                    }
                                  });
                                }}
                                className="w-4 h-4 mt-0.5 accent-amber-400 cursor-pointer shrink-0"
                              />
                              <div>
                                <span className="font-bold text-xs block text-white">{item.label}</span>
                                <span className="text-[10px] text-neutral-400 block">{item.desc}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Appointment & Contract Parameters */}
                    <div className="bg-neutral-950/80 p-5 border-2 border-neutral-800 rounded space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-neutral-850">
                        <span className="text-xs font-black uppercase tracking-widest text-amber-400 font-mono">📅 Appointment & Contract Terms</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                            Appointment Date
                          </label>
                          <input
                            type="date"
                            value={editStaffObj.appointmentDate || ''}
                            onChange={(e) => setEditStaffObj({ ...editStaffObj, appointmentDate: e.target.value })}
                            className="w-full bg-neutral-900 border-2 border-neutral-800 py-2 px-3 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                            Contract End Date
                          </label>
                          <input
                            type="date"
                            value={editStaffObj.contractEndDate || ''}
                            onChange={(e) => setEditStaffObj({ ...editStaffObj, contractEndDate: e.target.value })}
                            className="w-full bg-neutral-900 border-2 border-neutral-800 py-2 px-3 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                            Renewal Provision
                          </label>
                          <select
                            value={editStaffObj.renewalOption || 'Automatic'}
                            onChange={(e: any) => setEditStaffObj({ ...editStaffObj, renewalOption: e.target.value })}
                            className="w-full bg-neutral-900 border-2 border-neutral-800 py-2.5 px-3.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                          >
                            <option value="Automatic">Automatic</option>
                            <option value="Manual Review">Manual Review</option>
                            <option value="Fixed Term">Fixed Term</option>
                            <option value="Non-Renewable">Non-Renewable</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                            Standard Span
                          </label>
                          <input
                            type="text"
                            value={editStaffObj.renewalPeriod || '1 Year'}
                            onChange={(e) => setEditStaffObj({ ...editStaffObj, renewalPeriod: e.target.value })}
                            placeholder="e.g. 1 Year"
                            className="w-full bg-neutral-900 border-2 border-neutral-800 py-2.5 px-3.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-600"
                          />
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                          Teacher Personal Address (for contract/appointment letters)
                        </label>
                        <input
                          type="text"
                          value={editStaffObj.personalAddress || ''}
                          onChange={(e) => setEditStaffObj({ ...editStaffObj, personalAddress: e.target.value })}
                          placeholder="e.g. P. O. Box GP 1234, Accra, Ghana"
                          className="w-full bg-neutral-900 border-2 border-neutral-800 py-2.5 px-3.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-600"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-2 bg-neutral-950/40 p-4 border border-neutral-850 rounded">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="admin-edit-mfa-checkbox"
                        checked={!!editStaffObj.mfaEnabled}
                        onChange={(e) => setEditStaffObj({ ...editStaffObj, mfaEnabled: e.target.checked })}
                        className="w-4 h-4 accent-amber-400 cursor-pointer"
                      />
                      <label htmlFor="admin-edit-mfa-checkbox" className="text-xs text-neutral-300 font-mono uppercase tracking-wider cursor-pointer select-none">
                        Enforce Secure MFA Locks
                      </label>
                    </div>

                    <div className="flex items-center gap-3 border-t border-neutral-900 pt-2">
                      <input
                        type="checkbox"
                        id="admin-edit-password-checkbox"
                        checked={!!editStaffObj.passwordEnabled}
                        onChange={(e) => setEditStaffObj({ ...editStaffObj, passwordEnabled: e.target.checked })}
                        className="w-4 h-4 accent-amber-400 cursor-pointer"
                      />
                      <label htmlFor="admin-edit-password-checkbox" className="text-xs text-neutral-300 font-mono uppercase tracking-wider cursor-pointer select-none">
                        Enforce Password Protection
                      </label>
                    </div>

                    {!!editStaffObj.passwordEnabled && (
                      <div className="mt-1 pl-7 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="block text-[9px] font-black text-neutral-400 uppercase tracking-widest font-mono">
                            Set Account Password
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const gen = generateRandomPassword(8);
                              setEditStaffObj({ ...editStaffObj, password: gen });
                            }}
                            className="text-[9px] font-black text-amber-400 hover:text-amber-300 uppercase tracking-wider flex items-center gap-1 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 cursor-pointer transition-colors"
                          >
                            <Sparkles size={10} />
                            <span>Generate Password</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          required={!!editStaffObj.passwordEnabled}
                          value={editStaffObj.password || ''}
                          onChange={(e) => setEditStaffObj({ ...editStaffObj, password: e.target.value })}
                          placeholder="Secret password (e.g. secure123)"
                          className="w-full bg-neutral-950 border-2 border-neutral-800 py-2.5 px-3 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-700"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditStaffObj(null)}
                    className="w-1/3 text-xs bg-neutral-950 border-2 border-neutral-800 hover:border-neutral-700 text-neutral-400 py-3 font-black uppercase tracking-widest transition-colors"
                  >
                    Quit
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 text-xs bg-white hover:bg-amber-400 text-black py-3 font-black uppercase tracking-widest transition-colors cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAdminRegisterStaff} className="space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b-2 border-neutral-800">
                  <UserPlus size={18} className="text-amber-400" />
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Register Staff Profile</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                      Staff Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={adminRegName}
                      onChange={(e) => setAdminRegName(e.target.value)}
                      placeholder="e.g. Mrs. Rebecca Hanson"
                      className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                      Professional Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={adminRegEmail}
                      onChange={(e) => setAdminRegEmail(e.target.value)}
                      placeholder="e.g. rebecca.hanson@school.edu"
                      className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-700"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className={adminRegRole === 'Teacher' ? 'col-span-2 sm:col-span-1' : 'col-span-2'}>
                        <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                          Administrative Role
                        </label>
                        <select
                          value={adminRegRole}
                          onChange={(e) => setAdminRegRole(e.target.value as UserRole)}
                          className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                        >
                          <option value="Teacher">Teacher</option>
                          <option value="Accountant">Accountant</option>
                          <option value="Administrator">Administrator</option>
                          <option value="Headmaster">Headmaster</option>
                        </select>
                      </div>

                      {adminRegRole !== 'Teacher' && (
                        <div>
                          <label className="block text-[10px] font-black text-neutral-555 uppercase tracking-widest mb-1.5 font-mono">
                            Scope Level
                          </label>
                          <div className="bg-neutral-950 border-2 border-neutral-850 py-3 px-4 text-xs text-neutral-500 font-extrabold font-mono uppercase tracking-wider">
                            {adminRegRole === 'Administrator' || adminRegRole === 'Headmaster' ? 'All Areas' : 'Accounting Desk'}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 bg-neutral-950/40 p-3 border border-neutral-850 rounded">
                      <div>
                        <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                          Gender Analysis
                        </label>
                        <select
                          value={adminRegGender}
                          onChange={(e) => setAdminRegGender(e.target.value as 'Male' | 'Female')}
                          className="w-full bg-neutral-900 border-2 border-neutral-800 py-2.5 px-3 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                          Employment Type
                        </label>
                        <select
                          value={adminRegEmploymentType}
                          onChange={(e) => setAdminRegEmploymentType(e.target.value as any)}
                          className="w-full bg-neutral-900 border-2 border-neutral-800 py-2.5 px-3 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                        >
                          <option value="Full-Time">Full-Time</option>
                          <option value="Part-Time">Part-Time</option>
                          <option value="Contract">Contract</option>
                          <option value="Volunteer">Volunteer</option>
                        </select>
                      </div>
                    </div>

                    {adminRegRole === 'Teacher' && (
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest font-mono">
                          Assigned Gate Checkpoints (Multi-Select)
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 bg-neutral-950/60 p-3.5 border border-neutral-850 rounded">
                          {classes.map(cls => {
                            const isChecked = adminRegClasses.includes(cls);
                            return (
                              <label key={cls} className="flex items-center gap-2 text-xs font-bold text-neutral-300 hover:text-white cursor-pointer select-none py-1.5 px-2 hover:bg-neutral-900/50 rounded transition-colors">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    const nextClasses = isChecked
                                      ? adminRegClasses.filter(c => c !== cls)
                                      : [...adminRegClasses, cls];
                                    setAdminRegClasses(nextClasses);
                                  }}
                                  className="w-4 h-4 accent-amber-400 cursor-pointer"
                                />
                                <span className="font-mono">{cls}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="bg-neutral-950 p-5 sm:p-6 border-2 border-amber-500/40 rounded-lg space-y-4 shadow-lg">
                      <div className="flex items-center justify-between pb-2.5 border-b border-neutral-800">
                        <span className="text-xs font-black uppercase tracking-widest text-amber-400 font-mono flex items-center gap-2">
                          💵 Financial & Momo Payout Profile
                        </span>
                        <span className="text-[10px] font-mono font-bold text-amber-300/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                          Payroll & Mobile Money Setup
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                        <div className="space-y-2">
                          <label className="block text-xs font-black text-amber-300 uppercase tracking-wider font-mono">
                            Monthly Stipend/Salary (GHC)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={adminRegStipendSalary}
                            onChange={(e) => setAdminRegStipendSalary(e.target.value)}
                            placeholder="e.g. 1500.00"
                            className="w-full bg-neutral-900 border-2 border-neutral-700 py-3 px-4 text-sm font-mono font-bold text-white focus:outline-none focus:border-amber-400 focus:bg-neutral-950 focus:ring-2 focus:ring-amber-500/20 rounded placeholder:text-neutral-500 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-black text-amber-300 uppercase tracking-wider font-mono">
                            Momo Registered No.
                          </label>
                          <input
                            type="text"
                            value={adminRegMomoNumber}
                            onChange={(e) => setAdminRegMomoNumber(e.target.value)}
                            placeholder="e.g. 0541234567"
                            className="w-full bg-neutral-900 border-2 border-neutral-700 py-3 px-4 text-sm font-mono font-bold text-white focus:outline-none focus:border-amber-400 focus:bg-neutral-950 focus:ring-2 focus:ring-amber-500/20 rounded placeholder:text-neutral-500 transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-black text-amber-300 uppercase tracking-wider font-mono">
                            Registered Momo Name
                          </label>
                          <input
                            type="text"
                            value={adminRegMomoName}
                            onChange={(e) => setAdminRegMomoName(e.target.value)}
                            placeholder="e.g. Mary Appiah"
                            className="w-full bg-neutral-900 border-2 border-neutral-700 py-3 px-4 text-sm font-mono font-bold text-white focus:outline-none focus:border-amber-400 focus:bg-neutral-950 focus:ring-2 focus:ring-amber-500/20 rounded placeholder:text-neutral-500 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Granular Access Permissions Section */}
                    <div className="bg-neutral-950/80 p-5 border-2 border-neutral-800 rounded space-y-3 font-mono">
                      <div className="flex items-center justify-between pb-2 border-b border-neutral-850">
                        <span className="text-xs font-black uppercase tracking-widest text-amber-400 font-mono flex items-center gap-2">
                          <ShieldAlert size={15} /> Granular Access Permissions
                        </span>
                        <span className="text-[10px] text-neutral-500 uppercase">Interactive Checkboxes</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {[
                          { key: 'canRecordPayments', label: '💳 Record Fee Payments', desc: 'Allow recording daily & term payments' },
                          { key: 'canEditPayments', label: '✏️ Modify Payment Logs', desc: 'Allow editing or updating payment entries' },
                          { key: 'canDeletePayments', label: '🗑️ Delete Payment Records', desc: 'Allow purging payment records' },
                          { key: 'canManageStudents', label: '🎓 Manage Pupil Roster', desc: 'Allow adding, editing or deleting pupils' },
                          { key: 'canManageExams', label: '📝 Manage Exam System', desc: 'Allow recording exam marks & fees' },
                          { key: 'canViewReports', label: '📊 View Reports & Audit', desc: 'Allow viewing financial reports & audits' },
                          { key: 'canManageSettings', label: '⚙️ System & Term Settings', desc: 'Allow modifying school terms & settings' }
                        ].map(item => {
                          const isChecked = !!(adminRegPermissions as any)[item.key];
                          return (
                            <label key={item.key} className={`p-2.5 rounded border flex items-start gap-2.5 cursor-pointer transition-all ${isChecked ? 'bg-amber-950/20 border-amber-600/60 text-white' : 'bg-neutral-900/40 border-neutral-800 text-neutral-400 hover:border-neutral-700'}`}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  setAdminRegPermissions({
                                    ...adminRegPermissions,
                                    [item.key]: e.target.checked
                                  });
                                }}
                                className="w-4 h-4 mt-0.5 accent-amber-400 cursor-pointer shrink-0"
                              />
                              <div>
                                <span className="font-bold text-xs block text-white">{item.label}</span>
                                <span className="text-[10px] text-neutral-400 block">{item.desc}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Appointment & Contract Parameters */}
                    <div className="bg-neutral-950/80 p-5 border-2 border-neutral-800 rounded space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-neutral-850">
                        <span className="text-xs font-black uppercase tracking-widest text-amber-400 font-mono">📅 Appointment & Contract Terms</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                            Appointment Date
                          </label>
                          <input
                            type="date"
                            value={adminRegAppointmentDate}
                            onChange={(e) => setAdminRegAppointmentDate(e.target.value)}
                            className="w-full bg-neutral-900 border-2 border-neutral-800 py-2 px-3 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                            Contract End Date
                          </label>
                          <input
                            type="date"
                            value={adminRegContractEndDate}
                            onChange={(e) => setAdminRegContractEndDate(e.target.value)}
                            className="w-full bg-neutral-900 border-2 border-neutral-800 py-2 px-3 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                            Renewal Provision
                          </label>
                          <select
                            value={adminRegRenewalOption}
                            onChange={(e: any) => setAdminRegRenewalOption(e.target.value)}
                            className="w-full bg-neutral-900 border-2 border-neutral-800 py-2.5 px-3.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                          >
                            <option value="Automatic">Automatic</option>
                            <option value="Manual Review">Manual Review</option>
                            <option value="Fixed Term">Fixed Term</option>
                            <option value="Non-Renewable">Non-Renewable</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                            Standard Span
                          </label>
                          <input
                            type="text"
                            value={adminRegRenewalPeriod}
                            onChange={(e) => setAdminRegRenewalPeriod(e.target.value)}
                            placeholder="e.g. 1 Year"
                            className="w-full bg-neutral-900 border-2 border-neutral-800 py-2.5 px-3.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-600"
                          />
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                          Teacher Personal Address (for contract/appointment letters)
                        </label>
                        <input
                          type="text"
                          value={adminRegPersonalAddress}
                          onChange={(e) => setAdminRegPersonalAddress(e.target.value)}
                          placeholder="e.g. P. O. Box GP 1234, Accra, Ghana"
                          className="w-full bg-neutral-900 border-2 border-neutral-800 py-2.5 px-3.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-600"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-2 bg-neutral-950/40 p-4 border border-neutral-850 rounded">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="admin-reg-mfa-checkbox"
                        checked={adminRegMfa}
                        onChange={(e) => setAdminRegMfa(e.target.checked)}
                        className="w-4 h-4 accent-amber-400 cursor-pointer"
                      />
                      <label htmlFor="admin-reg-mfa-checkbox" className="text-xs text-neutral-300 font-mono uppercase tracking-wider cursor-pointer select-none">
                        Enforce Secure MFA Locks
                      </label>
                    </div>

                    <div className="flex items-center gap-3 border-t border-neutral-900 pt-2">
                      <input
                        type="checkbox"
                        id="admin-reg-password-checkbox"
                        checked={adminRegPasswordEnabled}
                        onChange={(e) => setAdminRegPasswordEnabled(e.target.checked)}
                        className="w-4 h-4 accent-amber-400 cursor-pointer"
                      />
                      <label htmlFor="admin-reg-password-checkbox" className="text-xs text-neutral-300 font-mono uppercase tracking-wider cursor-pointer select-none">
                        Enforce Password Protection
                      </label>
                    </div>

                    {adminRegPasswordEnabled && (
                      <div className="mt-1 pl-7 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="block text-[9px] font-black text-neutral-400 uppercase tracking-widest font-mono">
                            Set Account Password
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const gen = generateRandomPassword(8);
                              setAdminRegPassword(gen);
                            }}
                            className="text-[9px] font-black text-amber-400 hover:text-amber-300 uppercase tracking-wider flex items-center gap-1 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 cursor-pointer transition-colors"
                          >
                            <Sparkles size={10} />
                            <span>Generate Password</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          required={adminRegPasswordEnabled}
                          value={adminRegPassword}
                          onChange={(e) => setAdminRegPassword(e.target.value)}
                          placeholder="Secret password (e.g. secure123)"
                          className="w-full bg-neutral-950 border-2 border-neutral-800 py-2.5 px-3 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-700"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full text-xs font-black uppercase tracking-widest bg-white hover:bg-amber-400 text-black py-3.5 transition-colors cursor-pointer"
                >
                  Register Staff Profile
                </button>
              </form>
            )}
          </div>

          {/* Staff Registry & Security on Right (col-span-2) */}
          <div className="bg-neutral-900 border-4 border-neutral-800 p-8 space-y-6 col-span-1 lg:col-span-2 h-fit">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-neutral-800">
              <div className="space-y-1">
                <h3 className="text-xl font-black uppercase italic text-white tracking-tight flex items-center gap-3">
                  <ShieldAlert size={20} className="text-amber-400" /> Staff Directory, Accounts & Security
                </h3>
                <p className="text-xs text-neutral-400 font-bold leading-relaxed">
                  Configure staff user credentials, adjust wage rates/promotions (%), and enforce security locks.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTeacherSalaryIncrementModal(true)}
                  className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black text-[11px] font-mono font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer rounded-sm shadow-md transition-all shrink-0"
                  title="Comprehensive Teacher & Worker Salary Increment Summary, Individual % Variations, Monthly/Term Outflow Projections & Printable Document"
                >
                  <TrendingUp size={15} className="stroke-[2.5]" />
                  <span>Salary Increment Summary</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedStaffIdsForAdjust(users.map(u => u.id));
                    setSalaryAdjustSuccessMsg(null);
                    setShowSalaryAdjustModal(true);
                  }}
                  className="px-3 py-2 bg-neutral-950 hover:bg-neutral-850 text-neutral-300 hover:text-white border border-neutral-800 text-[11px] font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer rounded-sm transition-colors shrink-0"
                  title="Quick percentage wage adjuster for worker promotions"
                >
                  <Percent size={14} className="text-amber-400" />
                  <span>Quick % Adjuster</span>
                </button>
              </div>
            </div>

            <div className="divide-y-2 divide-neutral-850 border-2 border-neutral-80 w-full overflow-hidden bg-neutral-950">
              {users.map(u => {
                const matchesCurrentUser = currentUser?.id === u.id;
                const isUserActive = u.active !== false;
                
                return (
                  <div key={u.id} className="p-6 flex flex-col xl:flex-row justify-between xl:items-center gap-4 hover:bg-neutral-900/10 transition-colors">
                    <div className="space-y-2">
                       <div className="flex flex-wrap items-center gap-2.5">
                        <p className={`text-base font-black uppercase tracking-tight ${!isUserActive ? 'line-through text-neutral-500' : 'text-white'}`}>{u.name}</p>
                        <span className="text-[10px] font-black text-amber-400 bg-neutral-900 border border-neutral-800 px-2.5 py-0.5 tracking-widest uppercase font-mono">
                          {u.role} {u.role === 'Teacher' ? (
                            u.assignedClasses && u.assignedClasses.length > 0 
                              ? `(Gates: ${u.assignedClasses.join(', ')})`
                              : u.assignedClass 
                                ? `(Gate: ${u.assignedClass})` 
                                : '[No Gates Assigned]'
                          ) : '[All Core]'}
                        </span>
                        {matchesCurrentUser && (
                          <span className="text-[10px] bg-white text-black font-mono font-black px-2.5 py-0.5 uppercase tracking-widest">YOU</span>
                        )}
                        {!isUserActive && (
                          <span className="text-[10px] bg-red-950 border border-red-800 text-red-500 font-extrabold font-mono px-2.5 py-0.5 uppercase tracking-widest">DEACTIVATED</span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 font-mono font-bold">{u.email}</p>
                      {u.mfaEnabled && u.mfaSecret && (
                        <div className="inline-flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-300 font-mono tracking-wider w-full sm:w-auto">
                          <span>TOTP SECURE SECRET-KEY: <strong className="font-extrabold text-amber-400 select-all font-mono">{u.mfaSecret}</strong></span>
                          <span className="hidden sm:inline text-neutral-600">|</span>
                          <span className="text-emerald-450 uppercase font-black">(SIMULATED VALIDATION OTP: <strong className="font-extrabold text-white select-all">123456</strong>)</span>
                        </div>
                      )}

                      {u.passwordEnabled && (
                        <div className="mt-1.5 flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-300 font-mono tracking-wider w-full sm:w-auto">
                          <span>AUTH ENGINE: <strong className="font-extrabold text-amber-400 font-mono">FIREBASE AUTHENTICATION (Email / Password)</strong></span>
                        </div>
                      )}

                      {((u.stipendSalary !== undefined && u.stipendSalary > 0) || u.momoNumber || u.gender || u.employmentType) && (
                        <div className="mt-1.5 flex flex-wrap gap-2.5 items-center text-[10px] uppercase font-mono tracking-wider">
                          {u.gender && (
                            <span className="bg-neutral-900 border border-neutral-800 text-neutral-300 px-2.5 py-0.5 rounded font-extrabold font-mono">
                              {u.gender === 'Male' ? '♂ Male' : '♀ Female'}
                            </span>
                          )}
                          {u.employmentType && (
                            <span className="bg-neutral-900 border border-neutral-800 text-amber-400 px-2.5 py-0.5 rounded font-extrabold font-mono">
                              💼 {u.employmentType}
                            </span>
                          )}
                          {u.stipendSalary !== undefined && u.stipendSalary > 0 && (
                            <span className="bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 px-2.5 py-0.5 rounded font-bold">
                              💵 Stipend: GHC {u.stipendSalary.toFixed(2)}
                            </span>
                          )}
                          {u.momoNumber && (
                            <span className="bg-amber-950/40 text-amber-400 border border-amber-905/30 px-2.5 py-0.5 rounded font-bold">
                              ☎ MoMo: {u.momoNumber} {u.momoName ? `(${u.momoName})` : ''}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Granular Permission Badges */}
                      {u.permissions && (
                        <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                          <span className="text-[9px] font-mono text-neutral-500 font-bold uppercase tracking-wider">Access Rights:</span>
                          {u.permissions.canRecordPayments && <span className="text-[9px] bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">💳 Payments</span>}
                          {u.permissions.canEditPayments && <span className="text-[9px] bg-blue-950/60 border border-blue-800/80 text-blue-300 px-1.5 py-0.5 rounded font-mono font-bold">✏️ Edit Logs</span>}
                          {u.permissions.canDeletePayments && <span className="text-[9px] bg-red-950/60 border border-red-800/80 text-red-300 px-1.5 py-0.5 rounded font-mono font-bold">🗑️ Delete</span>}
                          {u.permissions.canManageStudents && <span className="text-[9px] bg-amber-950/60 border border-amber-800/80 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">🎓 Pupils</span>}
                          {u.permissions.canManageExams && <span className="text-[9px] bg-purple-950/60 border border-purple-800/80 text-purple-300 px-1.5 py-0.5 rounded font-mono font-bold">📝 Exams</span>}
                          {u.permissions.canViewReports && <span className="text-[9px] bg-cyan-950/60 border border-cyan-800/80 text-cyan-300 px-1.5 py-0.5 rounded font-mono font-bold">📊 Reports</span>}
                          {u.permissions.canManageSettings && <span className="text-[9px] bg-indigo-950/60 border border-indigo-800/80 text-indigo-300 px-1.5 py-0.5 rounded font-mono font-bold">⚙️ Settings</span>}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      {/* Appointment Letter & Contract Renewal Button */}
                      <button
                        onClick={() => openAppointmentModal(u)}
                        title={`Generate Appointment Letter or Renew Contract for ${u.name}`}
                        className="p-2 border-2 border-neutral-800 hover:border-amber-500 bg-neutral-950 text-neutral-400 hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono font-bold"
                      >
                        <FileText size={13} />
                        <span>Letter & Renewal</span>
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => setStaffToEditModal(u)}
                        title={`Edit ${u.name}'s profile`}
                        className="p-2 border-2 border-neutral-800 hover:border-neutral-600 bg-neutral-950 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => {
                          if (currentUser?.role !== 'Administrator') {
                            alert("Access Denied: Only Administrators are permitted to delete staff profiles completely. (Your current role is: " + (currentUser?.role || "Guest") + ")");
                            return;
                          }
                          if (matchesCurrentUser) {
                            alert("Access Denied: You cannot delete your own profile while logged in.");
                            return;
                          }
                          setDeleteConf({
                            isOpen: true,
                            type: 'staff',
                            targetId: u.id,
                            targetName: u.name,
                            userInput: '',
                            onConfirm: () => {
                              const result = deleteStaff(u.id);
                              if (result.success) {
                                showToast(`Staff profile for ${u.name} has been deleted.`);
                              } else {
                                showToast(result.error || "Failed to delete staff member.");
                              }
                            }
                          });
                        }}
                        disabled={matchesCurrentUser}
                        title={
                          matchesCurrentUser 
                            ? "Cannot delete yourself" 
                            : `Delete ${u.name}'s profile`
                        }
                        className={`p-2 border-2 ${
                          matchesCurrentUser
                            ? 'border-neutral-900 bg-neutral-900/30 text-neutral-700 cursor-not-allowed'
                            : 'border-neutral-800 hover:border-red-650 bg-neutral-950 text-neutral-400 hover:text-red-500 transition-colors cursor-pointer'
                        }`}
                      >
                        <Trash2 size={13} />
                      </button>

                      {/* Deactivate Toggle */}
                      <div className="flex items-center gap-2 border-l border-neutral-850 pl-3">
                        <span className={`text-[10px] font-black uppercase tracking-widest font-mono ${isUserActive ? 'text-emerald-450' : 'text-neutral-500'}`}>
                          {isUserActive ? 'ACTIVE' : 'DISABLED'}
                        </span>
                        <button
                          onClick={() => {
                            if (matchesCurrentUser) {
                              showToast("You cannot deactivate your own profile while logged in.");
                              return;
                            }
                            const res = toggleStaffActive(u.id);
                            if (res.success) {
                              showToast(`Staff account for ${u.name} is now ${!isUserActive ? 'Active' : 'Disabled'}.`);
                            } else {
                              showToast(res.error || "Failed to toggle active state.");
                            }
                          }}
                          disabled={matchesCurrentUser}
                          title={matchesCurrentUser ? "Cannot deactivate yourself" : `Toggle portal active access for ${u.name}`}
                          className={`cursor-pointer ${matchesCurrentUser ? 'opacity-30 cursor-not-allowed' : ''}`}
                        >
                          {isUserActive ? (
                            <ToggleRight size={38} className="text-emerald-500 stroke-[1.5]" />
                          ) : (
                            <ToggleLeft size={38} className="text-neutral-700 stroke-[1.5]" />
                          )}
                        </button>
                      </div>

                      {/* MFA Toggle */}
                      <div className="flex items-center gap-2 border-l border-neutral-850 pl-3">
                        <span className={`text-[10px] font-black uppercase tracking-widest font-mono ${u.mfaEnabled ? 'text-amber-400' : 'text-neutral-500'}`}>
                          {u.mfaEnabled ? 'MFA LOCK' : 'MFA OPEN'}
                        </span>
                        <button
                          onClick={() => {
                            toggleMfaForUser(u.id);
                            showToast(`Security settings toggled for ${u.name}.`);
                          }}
                          className="cursor-pointer"
                        >
                          {u.mfaEnabled ? (
                            <ToggleRight size={38} className="text-amber-400 stroke-[1.5]" />
                          ) : (
                            <ToggleLeft size={38} className="text-neutral-700 stroke-[1.5]" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        </div>
      ) : activeTab === 'gates' ? (
        <div className="space-y-6">
          <div className="bg-neutral-900 border-4 border-neutral-800 p-8 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b-2 border-neutral-800 gap-4">
              <div className="space-y-1">
                <h3 className="text-xl font-black uppercase italic text-white tracking-tight flex items-center gap-3">
                  <UserCheck size={24} className="text-amber-400" /> Classroom Gates & Checkpoint Teachers Setup
                </h3>
                <p className="text-xs text-neutral-400 font-bold max-w-2xl font-mono uppercase tracking-wider pl-0.5">
                  Designate verified teachers to lead student entry registry validation and gate payment verification at checkpoints.
                </p>
              </div>

              <div className="flex gap-4 font-mono font-bold text-xs uppercase tracking-wider text-right">
                <div className="bg-neutral-950 px-4 py-2.5 border border-neutral-850">
                  <span className="text-neutral-500 mr-2">Core Gates:</span>
                  <span className="text-white">12</span>
                </div>
                <div className="bg-neutral-950 px-4 py-2.5 border border-neutral-850">
                  <span className="text-neutral-500 mr-2">Assigned:</span>
                  <span className="text-amber-400 font-extrabold font-mono">
                    {users.filter(u => u.role === 'Teacher' && (u.assignedClass || (u.assignedClasses && u.assignedClasses.length > 0)) && u.active !== false).length}
                  </span>
                </div>
              </div>
            </div>

            {/* Grid of checkpoint assignments */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {classes.map((cls) => {
                const assignedTeacher = users.find(u => u.role === 'Teacher' && (u.assignedClass === cls || u.assignedClasses?.includes(cls)) && u.active !== false);
                const category = getClassCategory(cls);

                // Default fallbacks for display labels matching AppContext
                let defaultName = 'Madam Mary Appiah';
                if (cls === 'Nursery') defaultName = 'Mrs. Abigail Mensah';
                else if (cls === 'B1') defaultName = 'Mr. Emmanuel Gyamfi';
                else if (cls === 'KG1') defaultName = 'Mrs. Grace Annan';
                else if (cls === 'KG2') defaultName = 'Mrs. Beatrice Boateng';
                else if (cls === 'B2') defaultName = 'Mr. Samuel Osei';
                else if (cls === 'B3') defaultName = 'Mr. Kofi Boateng';
                else if (cls === 'B4') defaultName = 'Mrs. Rita Owusu';
                else if (cls === 'B5') defaultName = 'Mr. Desmond Taylor';
                else if (cls === 'B6') defaultName = 'Mrs. Joyce Arthur';
                else if (cls === 'B7') defaultName = 'Mr. Richard Boadu';
                else if (cls === 'B8') defaultName = 'Madam Faustina Asare';
                else if (cls === 'B9') defaultName = 'Mr. Philip Ansah';

                const activeCount = students.filter(s => s.class === cls && s.active).length;

                return (
                  <div key={cls} className="bg-neutral-950 border-2 border-neutral-850 p-6 flex flex-col justify-between gap-5 hover:border-neutral-700 transition">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest bg-neutral-900 border border-neutral-800 px-2 py-0.5 font-mono">
                          {category} LEVEL
                        </span>
                        <h4 className="text-2xl font-black text-white font-mono leading-none pt-2">{cls} Checkpoint</h4>
                        <div className="text-[10px] font-bold text-neutral-450 uppercase tracking-widest font-mono">
                          Enrolment: <span className="text-amber-400 font-extrabold">{activeCount} Pupils</span>
                        </div>
                      </div>
                      
                      {assignedTeacher ? (
                        <span className="text-[9px] font-black font-mono border border-emerald-950 bg-emerald-950/20 text-emerald-400 px-2 py-1 uppercase tracking-widest leading-none">
                          Active
                        </span>
                      ) : (
                        <span className="text-[9px] font-black font-mono border border-neutral-850 bg-neutral-900 text-neutral-500 px-2 py-1 uppercase tracking-widest leading-none">
                          Fallback
                        </span>
                      )}
                    </div>

                    <div className="space-y-3.5 py-3 border-t border-b border-neutral-850">
                      <div className="space-y-1">
                        <span className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest block">Active Gate Teacher</span>
                        <div className="font-mono text-sm leading-tight">
                          {assignedTeacher ? (
                            <span className="text-white font-extrabold">{assignedTeacher.name}</span>
                          ) : (
                            <span className="text-neutral-450 italic font-medium">{defaultName} <span className="text-neutral-600 font-sans font-normal text-xs">(Fallback Default)</span></span>
                          )}
                        </div>
                        {assignedTeacher && (
                          <span className="text-[10px] text-neutral-400 block font-mono truncate pt-0.5">{assignedTeacher.email}</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[9px] font-black text-neutral-400 uppercase tracking-widest font-mono pl-0.5">
                        Designate Checkpoint Teacher
                      </label>
                      <select
                        value={assignedTeacher?.id || ''}
                        onChange={(e) => handleAssignGateTeacher(cls, e.target.value)}
                        className="w-full bg-neutral-905 border-2 border-neutral-800 focus:border-amber-400 hover:border-neutral-750 text-xs font-mono font-bold text-white py-2.5 px-3.5 focus:outline-none cursor-pointer transition-colors"
                      >
                        <option value="">[Use System Fallback Default]</option>
                        {users
                          .filter(u => u.role === 'Teacher' && u.active !== false)
                          .map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.email})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : activeTab === 'database' ? (
        <DatabaseTab showToast={showToast} setActiveTab={setActiveTab} />
      ) : activeTab === 'performance' ? (
        <PerformanceTab />
      ) : activeTab === 'whatsapp' ? (
        <WhatsAppLogsTab />
      ) : activeTab === 'settings' ? (
        <SettingsPanel />
      ) : activeTab === 'idcards' ? (
        <IdCardsGeneratorTab />
      ) : activeTab === 'ledger' ? (
        <LedgerTab />
      ) : activeTab === 'ai_assistant' ? (
        <AiAssistantTab />
      ) : (
        <ExpendituresTab />
      )}
      {/* SMS Urgent notification Modal Overlay */}
      {smsTarget && (() => {
        const waMessage = `*SAAKO HOLY CHILD ACADEMY*\n*URGENT DAILY ARREARS ALERT*\n\n` +
          `*Beneficiary/Pupil:* ${smsTarget.student.name}\n` +
          `*Class:* ${smsTarget.student.class}\n` +
          `*Missed Days:* ${smsTarget.consecutiveDays} days\n` +
          `*Outstanding Amount:* GHC ${(smsTarget.consecutiveDays * 5).toFixed(2)}\n\n` +
          `Dear Parent/Guardian,\n` +
          `Our registers show that your child has missed daily gate check-in fee collections for ${smsTarget.consecutiveDays} consecutive school days (Dates: ${smsTarget.unpaidDates.join(', ')}). Outstanding: GHC ${(smsTarget.consecutiveDays * 5).toFixed(2)}.\n\n` +
          `Kindly make payments at the gate register to avoid access disruption. Thank you.\n\n` +
          `_Authorized Administration System_`;

        const smsMessage = `Hello. URGENT ALERT: Our registers show that ${smsTarget.student.name} has missed gate check-in fee collections for ${smsTarget.consecutiveDays} consecutive school days (Dates: ${smsTarget.unpaidDates.join(', ')}). Outstanding: GHC ${(smsTarget.consecutiveDays * 5).toFixed(2)}. Make payments at the gate register to avoid access disruption. - Yakubu Hakeem (Administrator)`;

        const currentMsgText = reminderChannel === 'whatsapp' ? waMessage : smsMessage;
        const defaultPhone = smsTarget.student.guardianPhone || '';

        return (
          <div id="daily-payer-reminder-modal" className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print">
            <div className="relative w-full max-w-md bg-neutral-900 border-4 border-red-500 p-6 md:p-8 space-y-6 shadow-[8px_8px_0px_0px_rgba(239,68,68,0.25)] text-white">
              <button
                type="button"
                onClick={() => {
                  setSmsTarget(null);
                  setCustomWAContact('');
                  setSelectedStaffPhone('');
                  setReminderChannel('whatsapp');
                }}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white font-mono text-xs p-1 cursor-pointer font-black border border-neutral-800 hover:border-red-500 hover:text-red-500 px-1.5 py-0.5 transition-all"
              >
                ✕ ESC
              </button>

              <div className="space-y-1">
                <span className="text-[9px] font-mono font-black uppercase tracking-widest text-amber-400">
                  {reminderChannel === 'whatsapp' ? 'WhatsApp Reminder Dispatch' : 'SMS Reminder Dispatch'}
                </span>
                <h3 className="text-base font-black uppercase tracking-tight font-mono text-white">
                  Remind: {smsTarget.student.name}
                </h3>
              </div>

              {/* Communication Channel Tabs */}
              <div className="flex border-2 border-neutral-800 p-1 bg-neutral-950/85">
                <button
                  type="button"
                  onClick={() => setReminderChannel('whatsapp')}
                  className={`flex-1 py-2 text-center font-mono text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    reminderChannel === 'whatsapp'
                      ? 'bg-emerald-950 border border-emerald-800 text-emerald-400 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  💬 WhatsApp Mode
                </button>
                <button
                  type="button"
                  onClick={() => setReminderChannel('sms')}
                  className={`flex-1 py-2 text-center font-mono text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    reminderChannel === 'sms'
                      ? 'bg-amber-955 border border-amber-800 text-amber-400 shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  📱 SMS Mode
                </button>
              </div>

              {/* Message Preview */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-black uppercase tracking-wider text-neutral-400 block">Message Preview (Auto-generated)</label>
                <textarea
                  readOnly
                  value={currentMsgText}
                  className="w-full h-28 bg-neutral-950 border border-neutral-800 p-3 text-[10.5px] font-mono rounded-none text-neutral-350 resize-none select-all focus:outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(currentMsgText);
                    showToast("Message text copied to clipboard!");
                  }}
                  className="w-full bg-neutral-950 hover:bg-neutral-850 text-neutral-400 hover:text-amber-400 border border-neutral-800 py-1.5 text-[9px] font-mono font-black uppercase tracking-wider transition-all rounded-xs cursor-pointer"
                >
                  📋 Copy Text to Clipboard
                </button>
              </div>

              <div className="border-t border-neutral-850 my-2 pt-2 space-y-3">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-amber-400 block">
                  {reminderChannel === 'whatsapp' ? 'Choose WhatsApp Contact Option:' : 'Choose SMS Contact Option:'}
                </span>

                {reminderChannel === 'whatsapp' ? (
                  <>
                    {/* Option 1: Open WhatsApp Contact Picker */}
                    <div className="bg-neutral-950/40 p-3 border border-neutral-850 hover:border-emerald-500/40 transition-all rounded-xs space-y-2">
                      <div>
                        <h4 className="text-xs font-black uppercase font-mono text-emerald-400">1. WhatsApp Contact Picker (Universal Share)</h4>
                        <p className="text-[9.5px] text-neutral-400 font-bold leading-tight">
                          Launches WhatsApp so you can search and choose ANY contact or group directly from your WhatsApp chats.
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          const urlText = encodeURIComponent(currentMsgText);
                          const waUrl = `https://api.whatsapp.com/send?text=${urlText}`;
                          if (typeof window !== 'undefined') {
                            window.open(waUrl, '_blank', 'noopener,noreferrer');
                            showToast("WhatsApp Contact Picker opened!");
                          }
                          // Trigger background logging
                          try {
                            if (sendautomatedWhatsApp) {
                              await sendautomatedWhatsApp(
                                'Universal Share Picker',
                                currentMsgText,
                                smsTarget.student.id,
                                smsTarget.student.name,
                                'daily-arrears-alert'
                              );
                            }
                          } catch (e) {}
                          setSmsTarget(null);
                          setCustomWAContact('');
                          setSelectedStaffPhone('');
                        }}
                        className="w-full bg-emerald-950 hover:bg-emerald-900 text-emerald-400 hover:text-emerald-300 border border-emerald-800 py-2 text-[10px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer rounded-xs flex items-center justify-center gap-1.5"
                      >
                        <MessageSquare size={12} />
                        <span>Choose Contact & Send on WhatsApp</span>
                      </button>
                    </div>

                    {/* Option 2: Send to Guardian */}
                    {defaultPhone && (
                      <div className="bg-neutral-950/40 p-3 border border-neutral-850 hover:border-amber-400/40 transition-all rounded-xs space-y-2">
                        <div>
                          <h4 className="text-xs font-black uppercase font-mono text-white">2. Registered Parent/Guardian</h4>
                          <p className="text-[9.5px] text-neutral-400 font-bold leading-tight">
                            Registered Number: <span className="text-amber-400 font-black">{defaultPhone}</span>
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            let targetPhone = defaultPhone.replace(/\D/g, "");
                            if (targetPhone.startsWith("0") && targetPhone.length === 10) {
                              targetPhone = "233" + targetPhone.substring(1);
                            }
                            const urlText = encodeURIComponent(currentMsgText);
                            const waUrl = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${urlText}`;
                            if (typeof window !== 'undefined') {
                              window.open(waUrl, '_blank', 'noopener,noreferrer');
                              showToast(`WhatsApp opened with Guardian (${defaultPhone})!`);
                            }
                            // Trigger background logging
                            try {
                              if (sendautomatedWhatsApp) {
                                await sendautomatedWhatsApp(
                                  defaultPhone,
                                  currentMsgText,
                                  smsTarget.student.id,
                                  smsTarget.student.name,
                                  'daily-arrears-alert'
                                );
                              }
                            } catch (e) {}
                            setSmsTarget(null);
                            setCustomWAContact('');
                            setSelectedStaffPhone('');
                          }}
                          className="w-full bg-neutral-950 hover:bg-neutral-850 text-white hover:text-amber-400 border border-neutral-800 py-2 text-[10px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer rounded-xs"
                        >
                          💬 Send directly to Guardian ({defaultPhone})
                        </button>
                      </div>
                    )}

                    {/* Option 3: Send to school staff/teacher */}
                    {users && users.length > 0 && (
                      <div className="bg-neutral-950/40 p-3 border border-neutral-850 hover:border-amber-400/40 transition-all rounded-xs space-y-2">
                        <h4 className="text-xs font-black uppercase font-mono text-white">3. School Staff / Class Teacher</h4>
                        <div className="flex gap-2">
                          <select
                            value={selectedStaffPhone}
                            onChange={(e) => setSelectedStaffPhone(e.target.value)}
                            className="bg-neutral-950 border border-neutral-800 rounded-xs text-[10px] font-mono font-bold text-white px-2 py-1.5 flex-1 focus:outline-none focus:border-amber-400"
                          >
                            <option value="">-- SELECT STAFF MEMBER --</option>
                            {users.map(u => (
                              u.phone ? <option key={u.id} value={u.phone}>{u.name} ({u.role || 'Staff'}) - {u.phone}</option> : null
                            ))}
                          </select>
                          <button
                            disabled={!selectedStaffPhone}
                            onClick={async () => {
                              let targetPhone = selectedStaffPhone.replace(/\D/g, "");
                              if (targetPhone.startsWith("0") && targetPhone.length === 10) {
                                targetPhone = "233" + targetPhone.substring(1);
                              }
                              const urlText = encodeURIComponent(currentMsgText);
                              const waUrl = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${urlText}`;
                              if (typeof window !== 'undefined') {
                                window.open(waUrl, '_blank', 'noopener,noreferrer');
                                showToast(`WhatsApp opened with Staff member!`);
                              }
                              // Trigger background logging
                              try {
                                if (sendautomatedWhatsApp) {
                                  await sendautomatedWhatsApp(
                                    selectedStaffPhone,
                                    currentMsgText,
                                    smsTarget.student.id,
                                    smsTarget.student.name,
                                    'daily-arrears-alert'
                                  );
                                }
                              } catch (e) {}
                              setSmsTarget(null);
                              setCustomWAContact('');
                              setSelectedStaffPhone('');
                            }}
                            className="bg-amber-400 hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-400 text-black px-4 py-1.5 text-[10px] font-mono font-black uppercase rounded-xs cursor-pointer"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Option 4: Custom Number */}
                    <div className="bg-neutral-950/40 p-3 border border-neutral-850 hover:border-amber-400/40 transition-all rounded-xs space-y-2">
                      <h4 className="text-xs font-black uppercase font-mono text-white">4. Type Custom Phone Number</h4>
                      <div className="flex gap-2">
                        <input
                          type="tel"
                          value={customWAContact}
                          onChange={(e) => setCustomWAContact(e.target.value)}
                          placeholder="e.g. 0244000000"
                          className="bg-neutral-950 border border-neutral-800 rounded-xs text-[10px] font-mono font-bold text-white px-2 py-1.5 flex-1 focus:outline-none focus:border-amber-400"
                        />
                        <button
                          disabled={!customWAContact.trim()}
                          onClick={async () => {
                            let targetPhone = customWAContact.replace(/\D/g, "");
                            if (targetPhone.startsWith("0") && targetPhone.length === 10) {
                              targetPhone = "233" + targetPhone.substring(1);
                            }
                            const urlText = encodeURIComponent(currentMsgText);
                            const waUrl = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${urlText}`;
                            if (typeof window !== 'undefined') {
                              window.open(waUrl, '_blank', 'noopener,noreferrer');
                              showToast(`WhatsApp opened with custom recipient!`);
                            }
                            // Trigger background logging
                            try {
                              if (sendautomatedWhatsApp) {
                                await sendautomatedWhatsApp(
                                  customWAContact,
                                  currentMsgText,
                                  smsTarget.student.id,
                                  smsTarget.student.name,
                                  'daily-arrears-alert'
                                );
                              }
                            } catch (e) {}
                            setSmsTarget(null);
                            setCustomWAContact('');
                            setSelectedStaffPhone('');
                          }}
                          className="bg-amber-400 hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-400 text-black px-4 py-1.5 text-[10px] font-mono font-black uppercase rounded-xs cursor-pointer"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Option 1: Universal SMS Picker */}
                    <div className="bg-neutral-950/40 p-3 border border-neutral-850 hover:border-amber-500/40 transition-all rounded-xs space-y-2">
                      <div>
                        <h4 className="text-xs font-black uppercase font-mono text-amber-400">1. SMS Client App Picker (Universal)</h4>
                        <p className="text-[9.5px] text-neutral-400 font-bold leading-tight">
                          Launches your device's native SMS messaging app prefilled with the outstanding debt alert text.
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          const smsUrl = `sms:?body=${encodeURIComponent(currentMsgText)}`;
                          if (typeof window !== 'undefined') {
                            window.open(smsUrl, '_blank');
                            showToast("Native SMS picker launched!");
                          }
                          // Copy message automatically for safety
                          navigator.clipboard.writeText(currentMsgText);
                          // Trigger background logging
                          try {
                            if (sendautomatedWhatsApp) {
                              await sendautomatedWhatsApp(
                                'Universal SMS Picker',
                                currentMsgText,
                                smsTarget.student.id,
                                smsTarget.student.name,
                                'sms-daily-arrears'
                              );
                            }
                          } catch (e) {}
                          setSmsTarget(null);
                          setCustomWAContact('');
                          setSelectedStaffPhone('');
                          setReminderChannel('whatsapp');
                        }}
                        className="w-full bg-amber-955 hover:bg-amber-900 text-amber-400 hover:text-amber-300 border border-amber-850 py-2 text-[10px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer rounded-xs flex items-center justify-center gap-1.5"
                      >
                        <Smartphone size={12} />
                        <span>Choose Contact & Send via Native SMS</span>
                      </button>
                    </div>

                    {/* Option 2: Send SMS directly to Guardian */}
                    {defaultPhone && (
                      <div className="bg-neutral-950/40 p-3 border border-neutral-850 hover:border-amber-400/40 transition-all rounded-xs space-y-2">
                        <div>
                          <h4 className="text-xs font-black uppercase font-mono text-white">2. Registered Parent/Guardian (SMS)</h4>
                          <p className="text-[9.5px] text-neutral-400 font-bold leading-tight">
                            Registered Phone: <span className="text-amber-400 font-black">{defaultPhone}</span>
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={async () => {
                              let cleanPhone = defaultPhone.replace(/\D/g, "");
                              const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(currentMsgText)}`;
                              if (typeof window !== 'undefined') {
                                window.open(smsUrl, '_blank');
                                showToast(`SMS App launched for ${defaultPhone}!`);
                              }
                              navigator.clipboard.writeText(currentMsgText);
                              // Trigger background logging
                              try {
                                if (sendautomatedWhatsApp) {
                                  await sendautomatedWhatsApp(
                                    defaultPhone,
                                    currentMsgText,
                                    smsTarget.student.id,
                                    smsTarget.student.name,
                                    'sms-daily-arrears'
                                  );
                                }
                              } catch (e) {}
                              setSmsTarget(null);
                              setCustomWAContact('');
                              setSelectedStaffPhone('');
                              setReminderChannel('whatsapp');
                            }}
                            className="flex-1 bg-neutral-950 hover:bg-neutral-850 text-white hover:text-amber-400 border border-neutral-800 py-2 text-[10px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer rounded-xs"
                          >
                            📱 Open Native SMS
                          </button>

                          <button
                            onClick={async () => {
                              showToast("Dispatching via cloud SMS carrier gateway...");
                              try {
                                if (sendautomatedWhatsApp) {
                                  const res = await sendautomatedWhatsApp(
                                    defaultPhone,
                                    currentMsgText,
                                    smsTarget.student.id,
                                    smsTarget.student.name,
                                    'sms-daily-arrears'
                                  );
                                  if (res.success) {
                                    showToast("SMS dispatch token registered & logged successfully!");
                                  } else {
                                    showToast("Logged (Simulation Mode) successfully.");
                                  }
                                }
                              } catch (e) {
                                showToast("Logged (Simulation Mode).");
                              }
                              setSmsTarget(null);
                              setCustomWAContact('');
                              setSelectedStaffPhone('');
                              setReminderChannel('whatsapp');
                            }}
                            className="bg-amber-400 hover:bg-amber-500 text-black px-4 py-2 text-[10px] font-mono font-black uppercase rounded-xs cursor-pointer text-center"
                          >
                            Send via Cloud API
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Option 3: Send SMS to school staff/teacher */}
                    {users && users.length > 0 && (
                      <div className="bg-neutral-950/40 p-3 border border-neutral-850 hover:border-amber-400/40 transition-all rounded-xs space-y-2">
                        <h4 className="text-xs font-black uppercase font-mono text-white">3. School Staff / Class Teacher (SMS)</h4>
                        <div className="flex gap-2">
                          <select
                            value={selectedStaffPhone}
                            onChange={(e) => setSelectedStaffPhone(e.target.value)}
                            className="bg-neutral-950 border border-neutral-800 rounded-xs text-[10px] font-mono font-bold text-white px-2 py-1.5 flex-1 focus:outline-none focus:border-amber-400"
                          >
                            <option value="">-- SELECT STAFF MEMBER --</option>
                            {users.map(u => (
                              u.phone ? <option key={u.id} value={u.phone}>{u.name} ({u.role || 'Staff'}) - {u.phone}</option> : null
                            ))}
                          </select>
                          <button
                            disabled={!selectedStaffPhone}
                            onClick={async () => {
                              let cleanPhone = selectedStaffPhone.replace(/\D/g, "");
                              const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(currentMsgText)}`;
                              if (typeof window !== 'undefined') {
                                window.open(smsUrl, '_blank');
                                showToast(`SMS App launched for ${selectedStaffPhone}!`);
                              }
                              navigator.clipboard.writeText(currentMsgText);
                              // Trigger background logging
                              try {
                                if (sendautomatedWhatsApp) {
                                  await sendautomatedWhatsApp(
                                    selectedStaffPhone,
                                    currentMsgText,
                                    smsTarget.student.id,
                                    smsTarget.student.name,
                                    'sms-daily-arrears'
                                  );
                                }
                              } catch (e) {}
                              setSmsTarget(null);
                              setCustomWAContact('');
                              setSelectedStaffPhone('');
                              setReminderChannel('whatsapp');
                            }}
                            className="bg-amber-400 hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-400 text-black px-4 py-1.5 text-[10px] font-mono font-black uppercase rounded-xs cursor-pointer"
                          >
                            Send SMS
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Option 4: Custom Number (SMS) */}
                    <div className="bg-neutral-950/40 p-3 border border-neutral-850 hover:border-amber-400/40 transition-all rounded-xs space-y-2">
                      <h4 className="text-xs font-black uppercase font-mono text-white">4. Type Custom Phone Number (SMS)</h4>
                      <div className="flex gap-2">
                        <input
                          type="tel"
                          value={customWAContact}
                          onChange={(e) => setCustomWAContact(e.target.value)}
                          placeholder="e.g. 0244000000"
                          className="bg-neutral-950 border border-neutral-800 rounded-xs text-[10px] font-mono font-bold text-white px-2 py-1.5 flex-1 focus:outline-none focus:border-amber-400"
                        />
                        <button
                          disabled={!customWAContact.trim()}
                          onClick={async () => {
                            let cleanPhone = customWAContact.replace(/\D/g, "");
                            const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(currentMsgText)}`;
                            if (typeof window !== 'undefined') {
                              window.open(smsUrl, '_blank');
                              showToast(`SMS App launched for ${customWAContact}!`);
                            }
                            navigator.clipboard.writeText(currentMsgText);
                            // Trigger background logging
                            try {
                              if (sendautomatedWhatsApp) {
                                await sendautomatedWhatsApp(
                                  customWAContact,
                                  currentMsgText,
                                  smsTarget.student.id,
                                  smsTarget.student.name,
                                  'sms-daily-arrears'
                                );
                              }
                            } catch (e) {}
                            setSmsTarget(null);
                            setCustomWAContact('');
                            setSelectedStaffPhone('');
                            setReminderChannel('whatsapp');
                          }}
                          className="bg-amber-400 hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-400 text-black px-4 py-1.5 text-[10px] font-mono font-black uppercase rounded-xs cursor-pointer"
                        >
                          Send SMS
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Interactive Student Portfolio Ledger and Registration History Modal */}
      {historyModalStudent && (() => {
        const studentPayments = payments.filter(p => p.studentId === historyModalStudent.id);
        const totalPaidThisTerm = studentPayments.filter(p => !p.isAbsent && p.verified !== false && p.amount > 0).reduce((sum, p) => sum + p.amount, 0);
        const totalAbsentDays = studentPayments.filter(p => p.isAbsent).length;
        
        const termDaysList = activeTerm ? activeTerm.schoolDays.filter(d => {
          if (d > currentDate) return false;
          if ((activeTerm.publicHolidays || []).includes(d)) return false;
          const afterEnrollment = historyModalStudent.enrollmentDate ? d >= historyModalStudent.enrollmentDate : true;
          return afterEnrollment;
        }) : [];

        const nonAbsentRecordsCount = studentPayments.filter(p => !p.isAbsent).length;
        const totalRegisteredDays = Math.max(nonAbsentRecordsCount, Math.max(0, termDaysList.length - totalAbsentDays));

        return (
          <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="relative w-full max-w-2xl bg-neutral-900 border-4 border-amber-500 p-6 md:p-8 space-y-6 shadow-[8px_8px_0px_0px_rgba(251,191,36,0.15)] text-white">
              
              {/* Header section */}
              <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
                <div className="flex items-start gap-3">
                  {historyModalStudent.photoUrl ? (
                    <div className="w-12 h-12 bg-neutral-950 border-2 border-amber-400 overflow-hidden shrink-0">
                      <img src={historyModalStudent.photoUrl} alt={historyModalStudent.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="p-2.5 bg-amber-400/10 border border-amber-400 text-amber-300 shrink-0">
                      <Users size={20} />
                    </div>
                  )}
                  <div>
                    <span className="text-[9px] text-amber-400 font-mono tracking-widest font-black uppercase block">Student Portfolio Ledger</span>
                    <h3 className="text-base font-black uppercase tracking-tight">{historyModalStudent.name}</h3>
                    <p className="text-[11px] text-neutral-400 mt-1">
                      Check-in statistics, custom billing logs and credentials for active school term.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setHistoryModalStudent(null)} 
                  className="p-1 cursor-pointer text-neutral-400 hover:text-white transition-colors"
                  title="Close History Portfolio"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Stats overview bento grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Academic credentials or Quick Edit */}
                <div className="bg-neutral-950 p-4 border border-neutral-800 rounded-sm space-y-3">
                  <div className="flex justify-between items-center border-b border-neutral-900 pb-1">
                    <span className="text-[9px] font-mono text-neutral-500 uppercase font-black block tracking-widest">
                      {isEditingPortfolio ? 'Quick Edit Profile' : 'Academic Status'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingPortfolio(!isEditingPortfolio)}
                      className="text-[9px] font-mono uppercase font-black text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 size={10} />
                      <span>{isEditingPortfolio ? 'View Status' : 'Edit Profile'}</span>
                    </button>
                  </div>

                  {isEditingPortfolio ? (
                    <div className="space-y-3 font-mono">
                      {/* Name Input */}
                      <div className="space-y-1">
                        <span className="text-[9px] text-neutral-450 uppercase font-bold block">Student Name</span>
                        <input
                          type="text"
                          value={portfolioEditName}
                          onChange={(e) => setPortfolioEditName(e.target.value)}
                          className="w-full bg-neutral-900 border border-neutral-800 px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                          placeholder="Full Name"
                        />
                      </div>

                      {/* Contact Input */}
                      <div className="space-y-1">
                        <span className="text-[9px] text-neutral-455 uppercase font-bold block">Guardian Contact</span>
                        <input
                          type="text"
                          value={portfolioEditPhone}
                          onChange={(e) => setPortfolioEditPhone(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-neutral-900 border border-neutral-800 px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                          placeholder="e.g. 0240000000"
                        />
                      </div>

                      {/* Photo Upload Input */}
                      <div className="space-y-1">
                        <span className="text-[9px] text-neutral-450 uppercase font-bold block">Profile Picture</span>
                        <div className="flex items-center gap-3 bg-neutral-900 p-2 border border-neutral-800">
                          {portfolioEditPhoto ? (
                            <div className="relative w-12 h-12 border border-neutral-700 bg-neutral-950 overflow-hidden shrink-0">
                              <img src={portfolioEditPhoto} alt="Preview" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setPortfolioEditPhoto(undefined)}
                                className="absolute inset-0 bg-black/70 hover:bg-black/90 flex items-center justify-center text-red-500 opacity-0 hover:opacity-100 transition-opacity"
                                title="Remove photo"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ) : (
                            <div className="w-12 h-12 bg-neutral-950 border border-neutral-800 flex items-center justify-center text-neutral-500 text-[10px] shrink-0 font-bold">
                              No Photo
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <label className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-[10px] text-amber-400 cursor-pointer transition-all uppercase font-black tracking-wider">
                              <Camera size={10} />
                              <span>Upload</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      if (typeof reader.result === 'string') {
                                        setCropperSrc(reader.result);
                                        setOnCropperComplete(() => (cropped: string) => {
                                          setPortfolioEditPhoto(cropped);
                                          setCropperSrc(null);
                                          setOnCropperComplete(null);
                                        });
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                            <p className="text-[8px] text-neutral-500 mt-1 uppercase tracking-wider">JPG or PNG image</p>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (!portfolioEditName.trim()) {
                              showToast('Student name is required.');
                              return;
                            }
                            const updated: Student = {
                              ...historyModalStudent,
                              name: portfolioEditName.trim(),
                              guardianPhone: portfolioEditPhone.trim(),
                              photoUrl: portfolioEditPhoto
                            };
                            updateStudent(updated);
                            setHistoryModalStudent(updated);
                            setIsEditingPortfolio(false);
                            showToast('Pupil profile saved successfully!');
                          }}
                          className="flex-1 py-1.5 px-3 bg-emerald-500 hover:bg-emerald-450 text-black font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer text-center"
                        >
                          Save Profile
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPortfolioEditName(historyModalStudent.name || '');
                            setPortfolioEditPhone(historyModalStudent.guardianPhone || '');
                            setPortfolioEditPhoto(historyModalStudent.photoUrl);
                            setIsEditingPortfolio(false);
                          }}
                          className="py-1.5 px-3 bg-neutral-900 hover:bg-neutral-850 text-neutral-400 hover:text-white font-black text-[10px] border border-neutral-800 hover:border-neutral-750 uppercase tracking-wider transition-all cursor-pointer text-center"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div>
                          <span className="text-[9.5px] text-neutral-450 block uppercase font-bold">Grade Level</span>
                          <strong className="text-white text-[13px]">{historyModalStudent.class}</strong>
                        </div>
                        <div>
                          <span className="text-[9.5px] text-neutral-455 block uppercase font-bold">Category</span>
                          <strong className="text-amber-400 text-[11px]">{historyModalStudent.category}</strong>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div>
                          <span className="text-[9.5px] text-neutral-450 block uppercase font-bold">Identity Code</span>
                          <strong className="text-white text-[11px]">{historyModalStudent.rollNumber || 'N/A'}</strong>
                        </div>
                        <div>
                          <span className="text-[9.5px] text-neutral-455 block uppercase font-bold">Enrollment</span>
                          <span className={`text-[10px] font-black px-1.5 py-0.2 uppercase rounded ${historyModalStudent.active ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/30' : 'bg-red-955 text-red-500 border border-red-900/30'}`}>
                            {historyModalStudent.active ? 'Active' : 'Suspended'}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs font-mono pt-1">
                        <span className="text-[9.5px] text-neutral-500 block uppercase font-bold">Guardian Verified Contact</span>
                        <strong className="text-neutral-300 tracking-tight font-extrabold">{historyModalStudent.guardianPhone || 'No registered mobile'}</strong>
                      </div>
                    </>
                  )}
                </div>

                {/* Term Financial ledger stats */}
                <div className="bg-neutral-955 border border-neutral-800 p-4 rounded-sm space-y-2.5 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-mono text-neutral-500 uppercase font-black block tracking-widest border-b border-neutral-900 pb-1">Payment Balance</span>
                    
                    <div className="flex justify-between items-baseline pt-1.5">
                      <span className="text-[10px] font-bold text-neutral-400 font-mono uppercase">Total Paid (Term):</span>
                      <span className="text-xl font-black text-amber-400 font-mono tracking-tighter">
                        GHC {totalPaidThisTerm.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-neutral-950 p-2.5 border border-neutral-900 rounded-xs flex items-center justify-around text-center text-xs font-mono gap-1">
                    <div>
                      <span className="text-[8px] text-neutral-500 block uppercase font-black">Checked In</span>
                      <strong className="text-emerald-400 font-black text-sm">{totalRegisteredDays}d</strong>
                    </div>
                    <div className="h-6 w-[1.5px] bg-neutral-900" />
                    <div>
                      <span className="text-[8px] text-neutral-500 block uppercase font-black">Logged Absent</span>
                      <strong className="text-red-500 font-black text-sm">{totalAbsentDays}d</strong>
                    </div>
                    <div className="h-6 w-[1.5px] bg-neutral-900" />
                    <div>
                      <span className="text-[8px] text-neutral-500 block uppercase font-black">Billing Scheme</span>
                      <span className="text-[9px] bg-neutral-900 border border-neutral-800 text-amber-500 px-1 py-0.2 block rounded font-black mt-0.5">
                        {historyModalStudent.paymentType || 'Daily'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Registration and check-ins timeline history log */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-black text-neutral-400 uppercase tracking-widest block font-bold">
                  Presence Chronicle & Registration History ({studentPayments.length} entries)
                </span>
                
                <div className="bg-neutral-950 border border-neutral-850 rounded-sm overflow-hidden divide-y divide-neutral-900 max-h-[220px] overflow-y-auto">
                  {studentPayments.length === 0 ? (
                    <div className="p-8 text-center text-xs font-mono font-bold uppercase text-neutral-500 tracking-wide">
                      No matching check-in logs or daily transactions recorded for this student.
                    </div>
                  ) : (
                    [...studentPayments].sort((a,b) => b.date.localeCompare(a.date)).map((pay) => (
                      <div key={pay.id} className="p-3.5 flex items-center justify-between hover:bg-neutral-900/45 text-xs font-mono">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${pay.isAbsent ? 'bg-red-500' : 'bg-emerald-400'}`} />
                          <div>
                            <span className="text-white font-black block font-bold text-[11px]">{pay.date}</span>
                            <span className="text-[9.5px] text-neutral-500 block">
                              Collector: {pay.collectedBy || 'Staff Registrar'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {pay.isAbsent ? (
                            <span className="text-[10px] bg-red-950 text-red-400 border border-red-900/40 px-2 py-0.5 text-right font-black uppercase rounded-xs">
                              Absent
                            </span>
                          ) : (
                            <div className="text-right">
                              <span className="text-[10.5px] text-emerald-400 font-black block">
                                GHC {pay.amount.toFixed(2)}
                              </span>
                              <span className="text-[8px] text-neutral-550 block uppercase tracking-wide">
                                Present / Paid
                              </span>
                            </div>
                          )}

                          <span className={`text-[8.5px] select-none font-bold px-1.5 py-0.2 border rounded-sm uppercase ${pay.verified ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50' : 'bg-amber-951 text-amber-300 border-amber-900/30'}`}>
                            {pay.verified ? 'Verified' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="border-t border-neutral-800 pt-4 flex flex-col sm:flex-row gap-3 font-mono">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIdCardStudent(historyModalStudent);
                    setHistoryModalStudent(null);
                  }}
                  className="flex-1 py-3 px-4 bg-amber-400 hover:bg-amber-300 text-black font-black uppercase text-xs tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <QrCode size={14} className="stroke-[2.5]" />
                  <span>Generate QR Access ID Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHistoryModalStudent(null)}
                  className="w-full sm:w-1/3 py-3 px-4 bg-neutral-950 hover:bg-neutral-850 text-neutral-400 hover:text-white font-medium uppercase text-xs tracking-wider transition-colors border border-neutral-850 cursor-pointer"
                >
                  Close Portfolio
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Student ID Card Print Modal */}
      {selectedIdCardStudent && (() => {
        const student = selectedIdCardStudent;
        const isDarkTheme = idCardTheme === 'dark';
        const studentExpiryDate = getStudentB9ExpiryDate(student.class, currentDate, activeTerm);
        const isExpired = studentExpiryDate < currentDate;
        const current = currentDate ? new Date(currentDate) : new Date();
        const expiry = new Date(studentExpiryDate);
        const diffTime = expiry.getTime() - current.getTime();
        const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        const isNearingExpiry = daysRemaining > 0 && daysRemaining <= 14;

        const handleDirectPrint = () => {
          const schoolName = systemSettings?.schoolName || 'SAAKO HOLY CHILD ACADEMY';
          const getLogoSvgHtml = (size = 18, forceFallback = false): string => {
            if (systemSettings?.schoolLogoUrl && !forceFallback) {
              const fallbackSvg = getLogoSvgHtml(size, true);
              return `
                <div style="display: inline-block; width: ${size}px; height: ${size}px; position: relative; vertical-align: middle;">
                  <img src="${systemSettings.schoolLogoUrl}" style="width: ${size}px; height: ${size}px; object-fit: contain; border-radius: 50%;" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';" />
                  <span style="display: none; width: ${size}px; height: ${size}px; vertical-align: top;">
                    ${fallbackSvg}
                  </span>
                </div>
              `;
            }
            const sName = schoolName.toUpperCase();
            const sLoc = systemSettings?.customLocation || 'Sawla';
            const sMotto = systemSettings?.customMotto || 'Holiness Is Our Key';
            return `
              <svg width="${size}" height="${size}" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" style="border-radius: 50%;">
                <defs>
                  <path id="academy-text-arc" d="M 52 205 A 148 148 0 1 1 348 205" fill="none" />
                </defs>
                <circle cx="200" cy="200" r="190" fill="#ffffff" stroke="#04563a" strokeWidth="11" />
                <circle cx="200" cy="200" r="146" fill="none" stroke="#04563a" strokeWidth="3.5" />
                <text>
                  <textPath href="#academy-text-arc" startOffset="50%" textAnchor="middle" fill="#04563a" fontWeight="900" fontSize="23" letterSpacing="1px" fontFamily="system-ui, -apple-system, sans-serif">
                    ${sName}
                  </textPath>
                </text>
                <g id="central-heraldic-shield">
                  <path d="M 98 185 A 102 102 0 0 1 302 185 Z" fill="#009e60" stroke="#04563a" strokeWidth="3" />
                  <path d="M 98 185 A 102 102 0 0 0 200 287 L 200 185 Z" fill="#024227" stroke="#04563a" strokeWidth="3" />
                  <path d="M 200 185 L 200 287 A 102 102 0 0 0 302 185 Z" fill="#fbf7f4" stroke="#04563a" strokeWidth="3" />
                </g>
                <g id="upper-hemisphere-book-pen">
                  <path d="M 134 180 C 168 174, 192 174, 200 181 C 208 174, 232 174, 266 180" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
                  <path d="M 200 180 C 185 160, 163 160, 138 168 L 138 141 C 163 133, 185 133, 200 153 Z" fill="#d0f2e5" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M 200 180 C 215 160, 237 160, 262 168 L 262 141 C 237 133, 215 133, 200 153 Z" fill="#d0f2e5" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M 241 114 L 189 171 L 184 172 L 187 167 L 235 110 Z" fill="#ffffff" stroke="#04563a" strokeWidth="1.5" />
                  <line x1="225" y1="126" x2="201" y2="152" stroke="#04563a" strokeWidth="1.5" />
                </g>
                <g id="lower-left-farming-tools">
                  <path d="M 125 240 Q 120 230 131 228 L 150 242 L 139 254 Z" fill="#b0bec5" stroke="#37474f" strokeWidth="1.5" strokeLinejoin="round" />
                  <line x1="127" y1="239" x2="187" y2="208" stroke="#cca480" strokeWidth="4" strokeLinecap="round" />
                  <path d="M 179 248 C 170 230, 155 212, 140 204 L 144 200 C 160 209, 175 228, 184 246 Z" fill="#eceff1" stroke="#455a64" strokeWidth="1.5" strokeLinecap="round" />
                </g>
                <g id="lower-right-hearth-broom">
                  <path d="M 222 205 L 232 200 L 236 211 L 226 216 Z" fill="#212121" stroke="#000000" strokeWidth="1" />
                  <line x1="227" y1="205" x2="263" y2="263" stroke="#424242" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="227" y1="205" x2="251" y2="267" stroke="#333333" strokeWidth="2.0" strokeLinecap="round" />
                  <line x1="227" y1="205" x2="274" y2="257" stroke="#424242" strokeWidth="2.0" strokeLinecap="round" />
                  <line x1="227" y1="205" x2="241" y2="268" stroke="#212121" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="227" y1="205" x2="281" y2="249" stroke="#555555" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="227" y1="205" x2="232" y2="269" stroke="#555555" strokeWidth="1.5" strokeLinecap="round" />
                  <rect x="225" y="209" width="9" height="3" rx="0.5" fill="#fbc02d" />
                  <rect x="227" y="215" width="10" height="3.5" rx="0.5" fill="#fbc02d" transform="rotate(-15 227 215)" />
                </g>
                <g id="bottom-crest-banner">
                  <circle cx="106" cy="303" r="18" fill="#024227" stroke="#04563a" strokeWidth="2.5" />
                  <text x="106" y="308" textAnchor="middle" fill="#ffffff" fontWeight="900" fontSize="13" fontFamily="system-ui, -apple-system, sans-serif">20</text>
                  <circle cx="294" cy="303" r="18" fill="#024227" stroke="#04563a" strokeWidth="2.5" />
                  <text x="294" y="308" textAnchor="middle" fill="#ffffff" fontWeight="900" fontSize="13" fontFamily="system-ui, -apple-system, sans-serif">03</text>
                  <path d="M 120 307 Q 200 334 280 307 L 277 285 Q 200 312 123 285 Z" fill="#024227" stroke="#04563a" strokeWidth="3.5" strokeLinejoin="round" />
                  <text x="200" y="304" textAnchor="middle" fill="#ffffff" fontWeight="900" fontSize="14" letterSpacing="1px" fontFamily="system-ui, -apple-system, sans-serif">${sLoc}</text>
                </g>
                <text x="200" y="346" textAnchor="middle" fill="#024227" fontWeight="900" fontSize="13" letterSpacing="0.8px" fontFamily="Georgia, serif">${sMotto}</text>
              </svg>
            `;
          };

          let printIframe = document.getElementById('idcard-print-iframe') as HTMLIFrameElement;
          if (!printIframe) {
            printIframe = document.createElement('iframe');
            printIframe.id = 'idcard-print-iframe';
            printIframe.setAttribute('style', 'position:fixed; right:0; bottom:0; width:0; height:0; border:0; pointer-events:none;');
            document.body.appendChild(printIframe);
          }

          const iframeDoc = printIframe.contentWindow?.document || printIframe.contentDocument;
          if (!iframeDoc) return;

          // Force colors explicitly with direct styles
          const cardBgFront = isDarkTheme 
            ? 'background: linear-gradient(135deg, #171717 0%, #0a0a0a 100%) !important; color: #ffffff !important;'
            : 'background: linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%) !important; color: #111111 !important; border: 1.5px solid #d4d4d8 !important;';

          const cardBgBack = isDarkTheme 
            ? 'background: linear-gradient(135deg, #171717 0%, #0a0a0a 100%) !important; color: #ffffff !important;'
            : 'background: linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%) !important; color: #111111 !important; border: 1.5px solid #d4d4d8 !important;';

          const textMain = isDarkTheme ? 'color: #ffffff !important;' : 'color: #111111 !important;';
          const textMuted = isDarkTheme ? 'color: #8e8e93 !important;' : 'color: #52525b !important;';
          const borderCol = isDarkTheme ? 'border-color: #27272a !important;' : 'border-color: #e4e4e7 !important;';
          const subBg = isDarkTheme ? 'background-color: #0c0a09 !important;' : 'background-color: #f4f4f5 !important;';

          const docContent = `
<!DOCTYPE html>
<html>
  <head>
    <title>SHCA Student ID - ${student.name}</title>
    <meta charset="utf-8">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=JetBrains+Mono:wght@400;700;800&display=swap" rel="stylesheet">
    <style>
      @page {
        size: landscape;
        margin: 0;
      }
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background-color: #ffffff;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        box-sizing: border-box;
      }
      .print-container {
        display: flex;
        flex-direction: row;
        gap: 16px;
        justify-content: center;
        align-items: center;
      }
      .id-card {
        width: 324px;
        height: 204px;
        border-radius: 8px;
        border: 1.5px solid ${isDarkTheme ? '#3f3f46' : '#d4d4d8'} !important;
        box-sizing: border-box;
        overflow: hidden;
        position: relative;
        font-family: 'Inter', sans-serif;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-shadow: none;
        ${cardBgFront}
      }
      .accent-top {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4.5px;
        background-color: ${isDarkTheme ? '#fbbf24' : '#d97706'} !important;
      }
      .header {
        padding: 8px 10px 4px 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid ${isDarkTheme ? '#27272a' : '#e4e4e7'} !important;
        margin-top: 4.5px;
        box-sizing: border-box;
      }
      .header-logo-container {
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .logo-badge {
        width: 16px;
        height: 16px;
        background-color: #fbbf24 !important;
        color: #000000 !important;
        border-radius: 2px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
        font-size: 8px;
        letter-spacing: -0.5px;
      }
      .logo-text {
        font-weight: 900;
        font-size: 8.5px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        ${textMain}
      }
      .active-pass-badge {
        font-size: 5.5px;
        font-weight: 900;
        background-color: #022c22 !important;
        color: #34d399 !important;
        border: 1px solid #10b981 !important;
        padding: 1px 3px;
        border-radius: 2px;
        text-transform: uppercase;
      }
      .expired-pass-badge {
        font-size: 5.5px;
        font-weight: 900;
        background-color: #450a0a !important;
        color: #f87171 !important;
        border: 1px solid #b91c1c !important;
        padding: 1px 3px;
        border-radius: 2px;
        text-transform: uppercase;
      }
      .main-content {
        padding: 5px 10px;
        display: flex;
        gap: 8px;
        flex: 1;
        align-items: center;
        box-sizing: border-box;
      }
      .avatar-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.5px;
      }
      .avatar {
        width: 54px;
        height: 54px;
        border-radius: 4.5px;
        background-color: ${isDarkTheme ? '#09090b' : '#f4f4f5'} !important;
        border: 1px solid ${isDarkTheme ? '#27272a' : '#e4e4e7'} !important;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      .avatar-placeholder {
        font-family: 'JetBrains Mono', monospace;
        font-weight: 900;
        font-size: 14px;
        text-transform: uppercase;
        ${textMain}
      }
      .avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover !important;
      }
      .avatar-label {
        font-size: 4.8px;
        font-family: 'JetBrains Mono', monospace;
        font-weight: 900;
        letter-spacing: 0.5px;
        ${textMuted}
      }
      .details {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 1.5px;
      }
      .field-label {
        font-size: 5.5px;
        font-family: 'JetBrains Mono', monospace;
        font-weight: 700;
        text-transform: uppercase;
        ${textMuted}
      }
      .field-val-name {
        font-size: 9.5px;
        font-weight: 900;
        text-transform: uppercase;
        max-width: 140px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
        letter-spacing: -0.1px;
        ${textMain}
      }
      .meta-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 3px;
      }
      .field-val-meta {
        font-size: 7.5px;
        font-weight: 900;
        font-family: 'JetBrains Mono', monospace;
        color: ${isDarkTheme ? '#fbbf24' : '#d97706'} !important;
      }
      .field-val-gender {
        font-size: 7.5px;
        font-weight: 700;
        ${textMain}
      }
      .reg-id-box {
        margin-top: 1px;
        font-size: 5.5px;
        font-family: 'JetBrains Mono', monospace;
        ${textMuted}
      }
      .reg-id-badge {
        font-weight: 800;
        background-color: ${isDarkTheme ? '#09090b' : '#f4f4f5'} !important;
        border: 1px solid ${isDarkTheme ? '#27272a' : '#e4e4e7'} !important;
        padding: 0.5px 2.5px;
        border-radius: 1.5px;
        margin-left: 2px;
        ${textMain}
      }
      .qr-code-box {
        width: 42px;
        height: 42px;
        background-color: #ffffff !important;
        padding: 1.5px;
        border-radius: 2px;
        border: 1px solid ${isDarkTheme ? '#27272a' : '#d4d4d8'} !important;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5px;
        box-sizing: border-box;
      }
      .qr-code-img {
        width: 34px;
        height: 34px;
      }
      .qr-label {
        font-size: 3.5px;
        font-family: 'JetBrains Mono', monospace;
        font-weight: 900;
        color: #000000 !important;
        letter-spacing: 0.1px;
        line-height: 1;
      }
      .footer {
        padding: 3px 10px;
        border-top: 1px solid ${isDarkTheme ? '#27272a' : '#e4e4e7'} !important;
        font-family: 'JetBrains Mono', monospace;
        font-size: 5.8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        ${subBg}
      }
      .footer-left {
        font-weight: 705;
        ${textMuted}
      }
      .footer-expiry {
        font-weight: 900;
        background-color: ${isDarkTheme ? '#000000' : '#e4e4e7'} !important;
        border: 1px solid ${isDarkTheme ? '#27272a' : '#d4d4d8'} !important;
        padding: 0.5px 2px;
        border-radius: 1.5px;
        font-size: 5px;
        margin-left: 2px;
        ${textMain}
      }
      .term-label {
        font-weight: 900;
        color: ${isDarkTheme ? '#fbbf24' : '#d97706'} !important;
      }
      
      /* BACK SIDE */
      .id-card-back {
        ${cardBgBack}
      }
      .back-body {
        padding: 6px 10px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        flex: 1;
        box-sizing: border-box;
      }
      .rules-title {
        font-size: 6.5px;
        font-family: 'JetBrains Mono', monospace;
        font-weight: 900;
        letter-spacing: 0.5px;
        margin-bottom: 2px;
        ${textMuted}
      }
      .rules-list {
        margin: 0;
        padding-left: 10px;
        font-size: 5.5px;
        font-weight: 700;
        line-height: 1.25;
        ${textMuted}
      }
      .rules-list li {
        margin-bottom: 1px;
      }
      .contact-meta {
        display: flex;
        justify-content: space-between;
        font-family: 'JetBrains Mono', monospace;
        font-size: 5.5px;
        border-top: 1px dashed ${isDarkTheme ? '#27272a' : '#d4d4d8'} !important;
        padding-top: 2.5px;
        margin-top: 2px;
      }
      .contact-label {
        display: block;
        font-size: 4.5px;
        ${textMuted}
      }
      .contact-val {
        font-weight: 800;
        ${textMain}
      }
      .status-banner-back {
        border-radius: 2px;
        padding: 1.5px;
        text-align: center;
        font-family: 'JetBrains Mono', monospace;
        font-size: 5px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        background-color: ${isDarkTheme ? '#09090b' : '#f4f4f5'} !important;
        border: 1px solid ${isDarkTheme ? '#18181b' : '#e4e4e7'} !important;
        ${textMuted}
      }
      .barcode-area {
        background-color: #ffffff !important;
        padding: 3px 10px;
        border-top: 1px solid ${isDarkTheme ? '#27272a' : '#e4e4e7'} !important;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
      }
      .barcode-lines {
        width: 100%;
        height: 14px;
        display: flex;
        align-items: stretch;
        gap: 0.8px;
        background-color: #ffffff !important;
      }
      .barcode-bar {
        flex: 1;
        background-color: #000000 !important;
      }
      .barcode-label {
        font-family: 'JetBrains Mono', monospace;
        font-size: 5px;
        font-weight: 700;
        letter-spacing: 1px;
        color: #52525b !important;
        margin-top: 1px;
      }
    </style>
  </head>
  <body>
    <div class="print-container">
      <div class="id-card">
        <div class="accent-top"></div>
        <div class="header">
          <div class="header-logo-container">
            ${getLogoSvgHtml(18)}
            <div class="logo-text">${schoolName.toUpperCase()}</div>
          </div>
          <div>
            <span class="${isExpired ? 'expired-pass-badge' : 'active-pass-badge'}">
              ${isExpired ? 'Expired' : 'Active Pass'}
            </span>
          </div>
        </div>

        <div class="main-content">
          <div class="avatar-container">
            <div class="avatar">
              ${student.photoUrl 
                ? `<img src="${student.photoUrl}" alt="${student.name}" />`
                : `<div class="avatar-placeholder">${student.name.slice(0, 2).toUpperCase()}</div>`
              }
            </div>
            <span class="avatar-label">STUDENT INFO</span>
          </div>

          <div class="details">
            <div>
              <span class="field-label">Pupil Name</span>
              <span class="field-val-name">${student.name}</span>
            </div>
            <div class="meta-grid">
              <div>
                <span class="field-label">Class</span>
                <span class="field-val-meta">${student.class}</span>
              </div>
              <div>
                <span class="field-label">Gender</span>
                <span class="field-val-gender">${student.gender || '—'}</span>
              </div>
            </div>
            <div class="reg-id-box">
              REG-ID: <span class="reg-id-badge">${student.rollNumber || 'SHC-' + student.id.substring(0, 5).toUpperCase()}</span>
            </div>
          </div>

          <div class="qr-code-box">
            <img class="qr-code-img" src="${idCardQrDataUrl}" />
            <span class="qr-label">GATE PASS</span>
          </div>
        </div>

        <div class="footer">
          <div class="footer-left">
            SYSTEM ACCREDITED <span class="footer-expiry">EXP: ${studentExpiryDate}</span>
          </div>
          <div class="term-label">${expiryInfo.termName.toUpperCase()}</div>
        </div>
      </div>

      <div class="id-card id-card-back">
        <div class="accent-top" style="background-color: ${isDarkTheme ? '#27272a' : '#d4d4d8'} !important;"></div>
        <div class="header">
          <span class="rules-title" style="margin: 0;">SECURITY CARD POLICY &amp; RULES</span>
        </div>

        <div class="back-body">
          <ol class="rules-list">
            <li>This card remains the property of SHCA-Sawla.</li>
            <li>Always present this card for scanning &amp; gate check-ins.</li>
            <li>Loss of credential elements must be reported immediately.</li>
            <li>Unauthorized duplication or counterfeit transfer is prohibited.</li>
          </ol>

          <div class="contact-meta">
            <div>
              <span class="contact-label">Guardian Mobile</span>
              <span class="contact-val">${student.guardianPhone || 'NOT ENROLLED'}</span>
            </div>
            <div style="text-align: right;">
              <span class="contact-label">Authorized Registrar</span>
              <span class="contact-val" style="color: ${isDarkTheme ? '#fbbf24' : '#d97706'} !important;">YAKUBU HAKEEM</span>
            </div>
          </div>

          <div class="status-banner-back">
            Validation Active &bull; Valid thru Term Closure (${studentExpiryDate})
          </div>
        </div>

        <div class="barcode-area">
          <div class="barcode-lines">
            ${Array.from({ length: 32 }).map((_, idx) => `
              <div class="barcode-bar" style="opacity: ${idx % 3 === 0 || idx % 4 === 1 ? 1 : 0};"></div>
            `).join('')}
          </div>
          <div class="barcode-label">
            *SHCA-${student.id.substring(0, 8).toUpperCase()}*
          </div>
        </div>
      </div>
    </div>

    <script>
      window.onload = function() {
        setTimeout(function() {
          window.focus();
          window.print();
        }, 300);
      };
    </script>
  </body>
</html>
          `;

          iframeDoc.open();
          iframeDoc.write(docContent);
          iframeDoc.close();
        };

        return (
          <div id="id-card-modal-container" className="fixed inset-0 z-50 bg-neutral-955/95 backdrop-blur-md flex items-center justify-center p-4 font-sans overflow-y-auto">
            <div className="relative w-full max-w-2xl bg-neutral-900 border-4 border-amber-400 p-6 md:p-8 space-y-6 shadow-[8px_8px_0px_0px_rgba(251,191,36,0.15)] text-white flex flex-col">
              
              {/* Header */}
              <div className="flex justify-between items-start border-b border-neutral-800 pb-4 shrink-0">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-amber-400/10 border border-amber-400 text-amber-300 shrink-0">
                    <Contact size={20} />
                  </div>
                  <div>
                    <span className="text-[9px] text-amber-450 font-mono tracking-widest font-black uppercase block font-bold">Credential Printing Desk</span>
                    <h3 className="text-base font-black uppercase tracking-tight">Student Access Badge Issuer</h3>
                    <p className="text-[11px] text-neutral-401 mt-1">
                      Preview and generate official double-sided laminating cards. Perfect size for standard wallets.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedIdCardStudent(null)} 
                  className="p-1 cursor-pointer text-neutral-450 hover:text-white transition-colors"
                  title="Close Window"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Theme Settings Panel */}
              <div className="bg-neutral-950 p-4 border-2 border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-amber-400 block font-black">BADGE THEME OPTION:</span>
                  <p className="text-[11px] text-neutral-400">Choose custom look. Carbon uses dark premium styling. Light saves printer ink / toner.</p>
                </div>
                <div className="flex items-center gap-1 bg-neutral-900 p-1 border border-neutral-800 rounded">
                  <button
                    type="button"
                    onClick={() => setIdCardTheme('dark')}
                    className={`px-3 py-1.5 font-mono text-[10px] uppercase font-bold tracking-wider rounded-xs transition-all cursor-pointer ${idCardTheme === 'dark' ? 'bg-amber-400 text-black font-black' : 'text-neutral-500 hover:text-neutral-200'}`}
                  >
                    Carbon Midnight
                  </button>
                  <button
                    type="button"
                    onClick={() => setIdCardTheme('light')}
                    className={`px-3 py-1.5 font-mono text-[10px] uppercase font-bold tracking-wider rounded-xs transition-all cursor-pointer ${idCardTheme === 'light' ? 'bg-amber-400 text-black font-black' : 'text-neutral-500 hover:text-neutral-200'}`}
                  >
                    Eco Ink-Saver
                  </button>
                </div>
              </div>

              {/* Print Target Grid Card Content (Aesthetic Preview) */}
              <div id="id-card-print-target" className="flex flex-col md:flex-row items-center justify-center gap-6 py-4 px-2 bg-neutral-950 border-2 border-neutral-800 rounded p-6">
                
                {/* Front Side Card Cardboard */}
                <div className={`w-[340px] h-[215px] relative rounded-xl border-2 shadow-xl overflow-hidden flex flex-col justify-between shrink-0 transition-all duration-300 ${
                  idCardTheme === 'dark'
                    ? 'bg-gradient-to-br from-neutral-900 via-neutral-900 to-black text-white border-neutral-700'
                    : 'bg-gradient-to-br from-white via-neutral-50 to-neutral-100 text-neutral-900 border-neutral-300 shadow-sm'
                }`}>
                  {/* Visual Top Accent Pattern */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-400" />
                  <div className="absolute top-1.5 right-6 w-16 h-12 bg-amber-400/5 rounded-full blur-xl pointer-events-none" />

                  {/* Card Top Header */}
                  <div className={`px-3.5 pt-3 flex items-center justify-between border-b pb-1.5 ${
                    idCardTheme === 'dark' ? 'border-neutral-800/60' : 'border-neutral-200'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      {/* Tiny Logo mark */}
                      <div className="w-5 h-5 bg-amber-400 text-neutral-905 rounded-sm flex items-center justify-center font-black text-[10px] tracking-tighter">
                        SH
                      </div>
                      <div>
                        <span className={`text-[10px] font-black uppercase tracking-wider block ${
                          idCardTheme === 'dark' ? 'text-white' : 'text-neutral-800'
                        }`}>SHCA-Sawla</span>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-1.5">
                      {expiryInfo.isExpired ? (
                        <span className="text-[6.5px] font-black bg-red-950/80 text-red-400 border border-red-900/40 py-0.5 px-1.5 rounded-sm uppercase tracking-wider animate-pulse">
                          Expired
                        </span>
                      ) : expiryInfo.isNearingExpiry ? (
                        <span className="text-[6.5px] font-black bg-amber-955/80 text-amber-400 border border-amber-900/40 py-0.5 px-1.5 rounded-sm uppercase tracking-wider animate-pulse">
                          ⚠️ Renewal Due
                        </span>
                      ) : null}
                      <span className="text-[6.5px] font-black bg-emerald-950/80 text-emerald-400 border border-emerald-905 py-0.5 px-1.5 rounded-sm uppercase tracking-wide">
                        Active Pass
                      </span>
                    </div>
                  </div>

                  {/* Card Main content with Photo & Details */}
                  <div className="px-3.5 py-2 flex gap-3 flex-1 items-center">
                    {/* Left Avatar Passport area */}
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-16 h-16 rounded-md flex items-center justify-center overflow-hidden shrink-0 ${
                        idCardTheme === 'dark' ? 'bg-neutral-955 border-neutral-750' : 'bg-neutral-200 border-neutral-350'
                      }`}>
                        {student.photoUrl ? (
                          <img 
                            src={student.photoUrl} 
                            alt={student.name} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className={`font-mono font-black text-[18px] uppercase ${
                            idCardTheme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'
                          }`}>
                            {student.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className={`text-[5px] font-mono tracking-widest uppercase font-black ${
                        idCardTheme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'
                      }`}>STUDENT INFO</span>
                    </div>

                    {/* Middle details column */}
                    <div className="flex-1 space-y-1">
                      <div>
                        <span className={`text-[7px] font-mono block uppercase font-bold ${
                          idCardTheme === 'dark' ? 'text-neutral-500' : 'text-neutral-450'
                        }`}>Pupil Name</span>
                        <span className={`text-xs font-black block uppercase tracking-tight line-clamp-1 ${
                          idCardTheme === 'dark' ? 'text-white' : 'text-neutral-900'
                        }`}>
                          {student.name}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <span className={`text-[7px] font-mono block uppercase font-bold ${
                            idCardTheme === 'dark' ? 'text-neutral-500' : 'text-neutral-450'
                          }`}>Class</span>
                          <span className="text-[10px] font-extrabold text-amber-500 font-mono">
                            {student.class}
                          </span>
                        </div>
                        <div>
                          <span className={`text-[7px] font-mono block uppercase font-bold ${
                            idCardTheme === 'dark' ? 'text-neutral-500' : 'text-neutral-450'
                          }`}>Gender</span>
                          <span className={`text-[9px] font-bold ${
                            idCardTheme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'
                          }`}>
                            {student.gender || '—'}
                          </span>
                        </div>
                      </div>

                      <div className="pt-0.5">
                        <span className={`text-[7.5px] font-mono block font-bold ${
                          idCardTheme === 'dark' ? 'text-neutral-450' : 'text-neutral-600'
                        }`}>
                          REG-ID: <strong className={`px-1 py-0.5 border rounded-xs ml-0.5 ${
                            idCardTheme === 'dark' ? 'text-white bg-neutral-950 border-neutral-800' : 'text-neutral-900 bg-neutral-200 border-neutral-300'
                          }`}>{student.rollNumber || 'SHC-'+student.id.substring(0,5).toUpperCase()}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Right QR Code column */}
                    <div className="flex flex-col items-center justify-center gap-1 shrink-0 bg-white p-1 rounded-sm border border-neutral-300">
                      {idCardQrDataUrl ? (
                        <img 
                          src={idCardQrDataUrl}
                          alt="Student QR Verification Key"
                          className="w-12 h-12"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-neutral-200 animate-pulse rounded-sm" />
                      )}
                      <span className="text-[5.5px] font-black text-black font-mono tracking-tighter uppercase leading-none">GATE PASS</span>
                    </div>
                  </div>

                  {/* Card Footer Banner */}
                  <div className={`border-t px-3 py-1 flex items-center justify-between text-[6.5px] font-mono ${
                    idCardTheme === 'dark' ? 'bg-neutral-955 border-neutral-850 text-neutral-500' : 'bg-neutral-100 border-neutral-250 text-neutral-500'
                  }`}>
                    <span className="font-bold flex items-center gap-1.5">
                      <span>SYSTEM ACCREDITED</span>
                      <span className={`text-[5.5px] border px-1 py-0.2 rounded-sm font-black tracking-tighter ${
                        idCardTheme === 'dark' ? 'bg-neutral-900 border-neutral-800 text-neutral-401' : 'bg-neutral-200 border-neutral-300 text-neutral-705'
                      }`}>
                        EXP: {studentExpiryDate}
                      </span>
                    </span>
                    <span className="text-amber-600 font-extrabold">{expiryInfo.termName.toUpperCase()}</span>
                  </div>
                </div>

                {/* Back Side Card Cardboard */}
                <div className={`w-[340px] h-[215px] relative rounded-xl border-2 shadow-xl overflow-hidden flex flex-col justify-between shrink-0 transition-all duration-300 ${
                  idCardTheme === 'dark'
                    ? 'bg-gradient-to-bl from-neutral-900 via-neutral-955 to-neutral-900 text-white border-neutral-700'
                    : 'bg-gradient-to-bl from-white via-neutral-50 to-neutral-100 text-neutral-900 border-neutral-300 shadow-sm'
                }`}>
                  {/* Visual Accent bar */}
                  <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                    idCardTheme === 'dark' ? 'bg-neutral-800' : 'bg-neutral-300'
                  }`} />

                  {/* Back Header */}
                  <div className={`px-4 pt-3 pb-1 border-b ${
                    idCardTheme === 'dark' ? 'border-neutral-850' : 'border-neutral-200'
                  }`}>
                    <span className={`text-[7.5px] font-black font-mono tracking-widest block uppercase ${
                      idCardTheme === 'dark' ? 'text-neutral-550' : 'text-neutral-450'
                    }`}>SECURITY POLICY & INSTRUCTIONS</span>
                  </div>

                  {/* Back core info list */}
                  <div className="px-4 py-2 flex flex-col justify-center flex-1 space-y-2">
                    <ol className={`list-decimal list-inside text-[7px] font-bold space-y-1 ${
                      idCardTheme === 'dark' ? 'text-neutral-401' : 'text-neutral-600'
                    }`}>
                      <li>This card remains the property of SHCA-Sawla.</li>
                      <li>Always present this card for scanning &amp; gate check-ins.</li>
                      <li>Loss of credential elements must be reported immediately.</li>
                      <li>Unauthorized duplication or counterfeit transfer is strictly prohibited.</li>
                    </ol>

                    <div className="flex items-center justify-between pt-1 font-mono text-[7px]">
                      <div>
                        <span className="text-neutral-500 block text-[6px]">Guardian Mobile</span>
                        <span className={`font-extrabold ${idCardTheme === 'dark' ? 'text-neutral-300' : 'text-neutral-800'}`}>{student.guardianPhone || 'NOT ENROLLED'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-neutral-500 block text-[6px]">Authorized Registrar</span>
                        <span className="text-amber-500 font-black">YAKUBU HAKEEM</span>
                      </div>
                    </div>

                    {isExpired ? (
                      <div className="bg-red-950/80 border border-red-900/55 rounded px-2 py-1 text-center font-mono text-[5.8px] text-red-400 font-black uppercase tracking-wider animate-pulse flex items-center justify-center gap-1.5 shrink-0">
                        <span>⚠️ SHCA BADGE EXPIRED</span>
                        <span>&bull;</span>
                        <span>CONTACT ACCREDITED OFFICERS</span>
                      </div>
                    ) : isNearingExpiry ? (
                      <div className="bg-amber-955/80 border border-amber-900/55 rounded px-2 py-1 text-center font-mono text-[5.8px] text-amber-400 font-black uppercase tracking-wider animate-pulse flex items-center justify-center gap-1.5 shrink-0">
                        <span>⚠️ RENEWAL DUE</span>
                        <span>&bull;</span>
                        <span>{daysRemaining} school days remaining</span>
                      </div>
                    ) : (
                      <div className={`px-2 py-0.5 border rounded text-center text-[5.5px] font-extrabold font-mono tracking-tight uppercase shrink-0 ${
                        idCardTheme === 'dark' ? 'bg-neutral-950 border-neutral-900 text-neutral-450' : 'bg-neutral-100 border-neutral-250 text-neutral-500'
                      }`}>
                        Validation Active &amp; Valid thru Term Closure ({studentExpiryDate})
                      </div>
                    )}
                  </div>

                  {/* Authentic bottom barcode graphics overlay */}
                  <div className="bg-white px-4 py-2 flex flex-col items-center justify-center shrink-0 border-t border-neutral-200">
                    {/* Pure stylized CSS barcode lines */}
                    <div className="w-full h-5 flex items-stretch gap-[1.5px] bg-white opacity-90">
                      {[3,2,1,4,1,3,1,2,3,1,2,1,4,1,2,3,1,2,1,2,3,1,4,1,2,3,4,1,2,3,1,2,1,2,3,4,1,2].map((w,i) => (
                        <div 
                          key={i} 
                          className="bg-black flex-1" 
                          style={{ opacity: i % 2 === 0 ? 1 : 0 }} 
                        />
                      ))}
                    </div>
                    <span className="text-[6px] font-mono text-neutral-500 font-bold tracking-[0.2em] uppercase mt-0.5">
                      *SHCA-{student.id.substring(0,8).toUpperCase()}*
                    </span>
                  </div>
                </div>

              </div>

              {/* Actions Footer */}
              <div id="id-card-actions-panel" className="border-t border-neutral-800 pt-4 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleDirectPrint}
                  className="flex-1 py-3 px-4 bg-amber-400 hover:bg-amber-300 text-black font-black uppercase text-xs tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(251,191,36,0.25)]"
                >
                  <Printer size={14} className="stroke-[2.5]" />
                  <span>Direct Print Badge (Isolated Print Flow)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedIdCardStudent(null)}
                  className="w-full sm:w-1/3 py-3 px-4 bg-neutral-950 hover:bg-neutral-850 text-neutral-450 hover:text-white font-mono uppercase text-xs tracking-wider transition-colors border border-neutral-850 cursor-pointer"
                >
                  Quit Preview
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Bulk QR Pass / Credentials Badge Generator Modal */}
      {showBulkPrintModal && (() => {
        const previewStudent = students.find(s => s.id === bulkPreviewStudentId);
        const termName = activeTerm?.name || "Active School Term";
        const expiryDate = activeTerm?.endDate || "Term End Date";

        const isFilteredSelected = bulkFilteredStudents.every(s => bulkPrintSelectedIds.includes(s.id));
        const handleToggleSelectAllFiltered = () => {
          if (isFilteredSelected) {
            // Deselect all filtered
            setBulkPrintSelectedIds(prev => prev.filter(id => !bulkFilteredStudents.some(s => s.id === id)));
          } else {
            // Select all filtered
            setBulkPrintSelectedIds(prev => {
              const otherSelected = prev.filter(id => !bulkFilteredStudents.some(s => s.id === id));
              return [...otherSelected, ...bulkFilteredStudents.map(s => s.id)];
            });
          }
        };

        return (
          <div className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="relative w-full max-w-5xl bg-neutral-900 border-4 border-amber-500 p-6 md:p-8 space-y-6 shadow-[8px_8px_0px_0px_rgba(245,158,11,0.15)] text-white flex flex-col md:max-h-[90vh]">
              
              {/* Header */}
              <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-amber-400/10 border border-amber-400 text-amber-300 shrink-0">
                    <QrCode size={20} />
                  </div>
                  <div>
                    <span className="text-[9px] text-amber-400 font-mono tracking-widest font-black uppercase block">Bulk ID Issuer Desk</span>
                    <h3 className="text-base font-black uppercase tracking-tight">Print QR Gate Check-In Passes</h3>
                    <p className="text-[11px] text-neutral-400 mt-1">
                      Batch generate QR student credentials. Selected student badges are formatted into a grid for paper-saving prints.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowBulkPrintModal(false)} 
                  className="p-1 cursor-pointer text-neutral-400 hover:text-white transition-colors"
                  title="Close Bulk Issuer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden flex-1">
                
                {/* Column Left: Filters & Selection Directory */}
                <div className="lg:col-span-5 flex flex-col space-y-4 overflow-hidden h-full">
                  <div className="space-y-2 shrink-0">
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest font-mono">
                      Step 1: Filter Directory Listing
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <select
                          value={bulkPrintClassFilter}
                          onChange={(e) => setBulkPrintClassFilter(e.target.value)}
                          className="w-full bg-neutral-950 border-2 border-neutral-800 py-2 px-3 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                        >
                          <option value="all">All Classes</option>
                          {classes.map(cls => (
                            <option key={cls} value={cls}>{cls}</option>
                          ))}
                        </select>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search student..."
                          value={bulkPrintSearch}
                          onChange={(e) => setBulkPrintSearch(e.target.value)}
                          className="w-full bg-neutral-950 border-2 border-neutral-800 py-2 px-3 text-xs font-mono font-bold text-white placeholder-neutral-700 focus:outline-none focus:border-amber-400 uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-1 px-2.5 bg-neutral-950/50 border border-neutral-800/60 rounded-xs text-[10px] font-mono font-bold tracking-wide shrink-0">
                    <span className="text-neutral-400 uppercase">
                      Found: <strong className="text-amber-400">{bulkFilteredStudents.length}</strong> pupil records
                    </span>
                    <button
                      type="button"
                      onClick={handleToggleSelectAllFiltered}
                      className="text-amber-400 hover:text-white font-black uppercase tracking-wider text-[9px] cursor-pointer"
                    >
                      {isFilteredSelected ? "⬜ Deselect All" : "☑️ Select All"}
                    </button>
                  </div>

                  {/* Scrollable list */}
                  <div className="flex-1 overflow-y-auto border-2 border-neutral-800 bg-neutral-950 divide-y divide-neutral-850/50 rounded-sm pr-1 min-h-[220px]">
                    {bulkFilteredStudents.length === 0 ? (
                      <div className="p-8 text-center text-xs font-mono font-black uppercase text-neutral-600">
                        No students match the criteria.
                      </div>
                    ) : (
                      bulkFilteredStudents.map(st => {
                        const isSelected = bulkPrintSelectedIds.includes(st.id);
                        const isPreviewing = bulkPreviewStudentId === st.id;
                        return (
                          <div 
                            key={st.id} 
                            onClick={() => setBulkPreviewStudentId(st.id)}
                            className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                              isPreviewing ? 'bg-neutral-800/40 border-l-4 border-amber-400' : 'hover:bg-neutral-850/20'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setBulkPrintSelectedIds(prev => [...prev, st.id]);
                                  } else {
                                    setBulkPrintSelectedIds(prev => prev.filter(id => id !== st.id));
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded border-2 border-neutral-700 bg-neutral-950 text-amber-500 focus:ring-0 cursor-pointer"
                              />
                              <div className="min-w-0" onClick={() => setBulkPreviewStudentId(st.id)}>
                                <span className={`text-[11px] font-black uppercase block tracking-tight line-clamp-1 cursor-pointer ${isSelected ? 'text-white' : 'text-neutral-450'}`}>
                                  {st.name}
                                </span>
                                <span className="text-[8.5px] font-mono font-bold text-neutral-500 uppercase tracking-widest block mt-0.5">
                                  ID: {st.rollNumber || st.id.substring(0, 8).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <span className="text-[9px] font-mono font-black text-amber-400 bg-amber-400/5 px-2 py-0.5 uppercase shrink-0 border border-amber-400/10">
                              {st.class}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Column Right: Interactive Previewer */}
                <div className="lg:col-span-7 flex flex-col space-y-4 border-t lg:border-t-0 lg:border-l border-neutral-800/80 lg:pl-6 pt-4 lg:pt-0 overflow-y-auto">
                  <div className="flex items-center justify-between shrink-0">
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest font-mono">
                      Step 2: Real-time Aesthetic Layout Preview
                    </label>
                    <div className="flex items-center gap-1 bg-neutral-950 p-1 border-2 border-neutral-800 text-[9px] font-mono">
                      <button
                        type="button"
                        onClick={() => setBulkPrintTheme('dark')}
                        className={`px-2 py-0.5 uppercase font-black tracking-wider transition-colors cursor-pointer ${
                          bulkPrintTheme === 'dark' ? 'bg-amber-400 text-black' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        Midnight
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkPrintTheme('light')}
                        className={`px-2 py-0.5 uppercase font-black tracking-wider transition-colors cursor-pointer ${
                          bulkPrintTheme === 'light' ? 'bg-amber-400 text-black' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        Eco-Ink
                      </button>
                    </div>
                  </div>

                  {previewStudent ? (
                    <div className="flex-1 flex flex-col justify-center items-center gap-6 py-6 px-4 bg-neutral-950 border-2 border-neutral-800 rounded p-6">
                      
                      {/* Live Front Preview */}
                      <div className="flex flex-col xl:flex-row items-center gap-6">
                        
                        {/* Front Card */}
                        <div className={`w-[314px] h-[198px] relative rounded-xl border-2 shadow-xl overflow-hidden flex flex-col justify-between shrink-0 transition-all duration-300 ${
                          bulkPrintTheme === 'dark'
                            ? 'bg-gradient-to-br from-neutral-900 via-neutral-900 to-black text-white border-neutral-700'
                            : 'bg-gradient-to-br from-white via-neutral-50 to-neutral-100 text-neutral-900 border-neutral-300 shadow-sm'
                        }`}>
                          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400" />
                          
                          {/* Card Header */}
                          <div className={`px-3 pt-2.5 flex items-center justify-between border-b pb-1 ${
                            bulkPrintTheme === 'dark' ? 'border-neutral-800/60' : 'border-neutral-200'
                          }`}>
                            <div className="flex items-center gap-1">
                              <div className="w-4.5 h-4.5 bg-amber-400 text-black rounded-xs flex items-center justify-center font-black text-[9px] tracking-tighter">
                                SH
                              </div>
                              <span className={`text-[9px] font-black uppercase tracking-wider block ${
                                bulkPrintTheme === 'dark' ? 'text-white' : 'text-neutral-800'
                              }`}>SHCA-Sawla</span>
                            </div>
                            <span className="text-[5.5px] font-black bg-emerald-950/80 text-emerald-400 border border-emerald-905 py-0.5 px-1.5 rounded-sm uppercase tracking-wide">
                              Active Pass
                            </span>
                          </div>

                          {/* Card Body */}
                          <div className="px-3 py-1 flex gap-2.5 flex-1 items-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <div className={`w-13 h-13 rounded flex items-center justify-center overflow-hidden shrink-0 border ${
                                bulkPrintTheme === 'dark' ? 'bg-neutral-955 border-neutral-750' : 'bg-neutral-200 border-neutral-350'
                              }`}>
                                {previewStudent.photoUrl ? (
                                  <img 
                                    src={previewStudent.photoUrl} 
                                    alt={previewStudent.name} 
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className={`font-mono font-black text-[15px] uppercase ${
                                    bulkPrintTheme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'
                                  }`}>
                                    {previewStudent.name.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <span className={`text-[4.5px] font-mono tracking-widest uppercase font-black ${
                                bulkPrintTheme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'
                              }`}>STUDENT INFO</span>
                            </div>

                            <div className="flex-1 space-y-1">
                              <div>
                                <span className={`text-[6px] font-mono block uppercase font-bold ${
                                  bulkPrintTheme === 'dark' ? 'text-neutral-500' : 'text-neutral-450'
                                }`}>Pupil Name</span>
                                <span className={`text-[11px] font-black block uppercase tracking-tight line-clamp-1 ${
                                  bulkPrintTheme === 'dark' ? 'text-white' : 'text-neutral-900'
                                }`}>
                                  {previewStudent.name}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-1">
                                <div>
                                  <span className={`text-[6px] font-mono block uppercase font-bold ${
                                    bulkPrintTheme === 'dark' ? 'text-neutral-500' : 'text-neutral-450'
                                  }`}>Class</span>
                                  <span className="text-[9.5px] font-extrabold text-amber-500 font-mono">
                                    {previewStudent.class}
                                  </span>
                                </div>
                                <div>
                                  <span className={`text-[6px] font-mono block uppercase font-bold ${
                                    bulkPrintTheme === 'dark' ? 'text-neutral-500' : 'text-neutral-450'
                                  }`}>Gender</span>
                                  <span className={`text-[8px] font-bold ${
                                    bulkPrintTheme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'
                                  }`}>
                                    {previewStudent.gender || '—'}
                                  </span>
                                </div>
                              </div>

                              <div className="text-[7px] font-mono uppercase tracking-wide flex items-center gap-1 text-neutral-400">
                                REG-ID:
                                <strong className={`font-mono px-1 border rounded-sm ${
                                  bulkPrintTheme === 'dark' ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-100 border-neutral-300 text-neutral-800'
                                }`}>
                                  {previewStudent.rollNumber || 'SHC-' + previewStudent.id.substring(0, 5).toUpperCase()}
                                </strong>
                              </div>
                            </div>

                            <div className={`p-1 border rounded shrink-0 flex flex-col items-center justify-center gap-0.5 bg-white`}>
                              {bulkQrCodes[previewStudent.id] ? (
                                <img 
                                  src={bulkQrCodes[previewStudent.id]} 
                                  alt="QR Code Pass" 
                                  className="w-10 h-10 object-contain"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-neutral-100 flex items-center justify-center">
                                  <RefreshCw size={12} className="text-neutral-400 animate-spin" />
                                </div>
                              )}
                              <span className="text-[4px] font-mono font-black tracking-widest text-neutral-950">GATE PASS</span>
                            </div>
                          </div>

                          {/* Card Footer */}
                          <div className={`px-3.5 py-1 text-[6.5px] font-mono border-t flex items-center justify-between ${
                            bulkPrintTheme === 'dark' ? 'bg-neutral-950/60 border-neutral-800/80 text-neutral-450' : 'bg-neutral-100 border-neutral-200 text-neutral-600'
                          }`}>
                            <span>SYSTEM ACCREDITED <strong className={`font-black ${bulkPrintTheme === 'dark' ? 'text-white' : 'text-black'}`}>EXP: {expiryDate}</strong></span>
                            <span className="text-amber-500 font-extrabold font-mono text-[6.5px] uppercase tracking-wider">{termName}</span>
                          </div>
                        </div>

                        {/* Back Card */}
                        <div className={`w-[314px] h-[198px] relative rounded-xl border-2 shadow-xl overflow-hidden flex flex-col justify-between shrink-0 transition-all duration-300 ${
                          bulkPrintTheme === 'dark'
                            ? 'bg-gradient-to-br from-neutral-900 via-neutral-900 to-black text-white border-neutral-700'
                            : 'bg-gradient-to-br from-white via-neutral-50 to-neutral-100 text-neutral-900 border-neutral-300 shadow-sm'
                        }`}>
                          <div className="absolute top-0 left-0 right-0 h-1 bg-neutral-800" />
                          <div className="px-3.5 pt-2 border-b pb-1 border-neutral-800/50">
                            <span className="text-[7.5px] font-mono font-extrabold text-neutral-400 uppercase tracking-widest">
                              SECURITY CARD POLICY &amp; RULES
                            </span>
                          </div>

                          <div className="px-3.5 py-1.5 flex-1 flex flex-col justify-between">
                            <ol className="text-[6.5px] list-decimal list-inside space-y-0.5 text-neutral-400 font-bold leading-tight">
                              <li>This card remains the property of SHCA-Sawla.</li>
                              <li>Always present this card for scanning &amp; gate check-ins.</li>
                              <li>Loss of credential elements must be reported immediately.</li>
                              <li>Unauthorized duplication or counterfeit transfer is prohibited.</li>
                            </ol>

                            <div className="grid grid-cols-2 gap-2 text-[6.5px] font-mono border-t border-dashed border-neutral-800/40 pt-1.5 mt-1">
                              <div>
                                <span className="text-neutral-500 block text-[5px]">Guardian Mobile</span>
                                <strong className="text-white block uppercase tracking-tight">{previewStudent.guardianPhone || 'NOT ENROLLED'}</strong>
                              </div>
                              <div className="text-right">
                                <span className="text-neutral-500 block text-[5px]">Authorized Registrar</span>
                                <strong className="text-amber-400 block uppercase tracking-tight">YAKUBU HAKEEM</strong>
                              </div>
                            </div>

                            <div className="text-center text-[5px] font-mono font-black py-0.5 bg-neutral-950/40 border border-neutral-850 text-neutral-500 uppercase tracking-widest rounded-sm mt-1">
                              Validation Active &bull; Valid thru Term Closure ({expiryDate})
                            </div>
                          </div>

                          <div className="bg-white px-3 py-1.5 border-t border-neutral-800/30 flex flex-col items-center justify-center shrink-0">
                            <div className="w-full flex items-stretch gap-[0.5px] h-3 bg-white">
                              {Array.from({ length: 32 }).map((_, idx) => (
                                <div key={idx} className={`flex-1 bg-black ${idx % 3 === 0 || idx % 4 === 1 ? 'opacity-100' : 'opacity-0'}`} />
                              ))}
                            </div>
                            <span className="text-[5.5px] font-mono font-bold text-neutral-600 tracking-wider block mt-0.5">
                              *SHCA-{previewStudent.id.substring(0, 8).toUpperCase()}*
                            </span>
                          </div>
                        </div>

                      </div>

                    </div>
                  ) : (
                    <div className="flex-1 bg-neutral-950 border-2 border-neutral-800 rounded p-12 text-center text-xs font-mono font-black uppercase text-neutral-600 flex items-center justify-center">
                      No active student selected for preview.
                    </div>
                  )}
                </div>

              </div>

              {/* Bottom Actions */}
              <div className="border-t border-neutral-800 pt-5 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                <div className="text-xs font-mono text-neutral-400">
                  Total Selected: <strong className="text-amber-400 font-extrabold text-sm">{bulkPrintSelectedIds.length}</strong> student passes ready.
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleBulkPrint}
                    disabled={bulkPrintSelectedIds.length === 0}
                    className="flex-1 sm:flex-initial py-3 px-6 bg-amber-400 hover:bg-amber-300 disabled:bg-neutral-800 disabled:text-neutral-600 text-black font-black uppercase text-xs tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(251,191,36,0.25)]"
                  >
                    <Printer size={14} className="stroke-[2.5]" />
                    <span>PRINT {bulkPrintSelectedIds.length} SELECTED BADGES</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowBulkPrintModal(false)}
                    className="w-full sm:w-auto py-3 px-5 bg-neutral-950 hover:bg-neutral-850 text-neutral-450 hover:text-white font-mono uppercase text-xs tracking-wider transition-colors border border-neutral-850 cursor-pointer"
                  >
                    Close Desk
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Academic Cohort Promotion Modal Overlay */}
      {showPromotionModal && (
        <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className={`relative w-full transition-all duration-300 ${promotionTab === 'reconcile' ? 'max-w-4xl' : 'max-w-2xl'} bg-neutral-900 border-4 border-amber-500 p-6 md:p-8 space-y-6 shadow-[8px_8px_0px_0px_rgba(245,158,11,0.15)] text-white`}>
            <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <Award size={22} className="text-amber-400" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest font-mono">Academic Year Promotion Desk</h3>
                  <p className="text-[10px] text-neutral-400 uppercase font-mono font-bold mt-0.5">
                    {promotionTab === 'bulk' ? 'Bulk Grade Cohort Management' : 
                     promotionTab === 'reconcile' ? 'Interactive Reconciliation Planner' : 
                     promotionTab === 'single' ? 'Single Student Promotion & Repetition' : 
                     'Roster Promotion Backups & Rollbacks'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowPromotionModal(false);
                  setSelectedPromoStudentId('');
                }} 
                className="p-1 cursor-pointer text-neutral-450 hover:text-white transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap border-b border-neutral-800 gap-1">
              <button
                type="button"
                onClick={() => setPromotionTab('bulk')}
                className={`flex-1 py-2 px-3 text-[10px] md:text-xs font-mono font-black uppercase tracking-wider border-b-2 transition-all ${
                  promotionTab === 'bulk'
                    ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                👥 Bulk Cohorts
              </button>
              <button
                type="button"
                onClick={() => {
                  setPromotionTab('reconcile');
                  // Initialize reconcileActions with standard transitions for all active students by default
                  const defaultActions: Record<string, 'promote' | 'repeat' | 'withdraw'> = {};
                  students.filter(s => s.active).forEach(s => {
                    defaultActions[s.id] = 'promote';
                  });
                  setReconcileActions(defaultActions);
                }}
                className={`flex-1 py-2 px-3 text-[10px] md:text-xs font-mono font-black uppercase tracking-wider border-b-2 transition-all ${
                  promotionTab === 'reconcile'
                    ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                ⚖️ Roster Planner
              </button>
              <button
                type="button"
                onClick={() => setPromotionTab('single')}
                className={`flex-1 py-2 px-3 text-[10px] md:text-xs font-mono font-black uppercase tracking-wider border-b-2 transition-all ${
                  promotionTab === 'single'
                    ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                👤 Single Student
              </button>
              <button
                type="button"
                onClick={() => setPromotionTab('backups')}
                className={`flex-1 py-2 px-3 text-[10px] md:text-xs font-mono font-black uppercase tracking-wider border-b-2 transition-all ${
                  promotionTab === 'backups'
                    ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                ⏱️ History & Rollbacks
              </button>
            </div>

            {promotionTab === 'bulk' ? (
              <>
                <div className="space-y-4 font-sans text-xs">
                  <p className="text-neutral-300 leading-relaxed font-semibold">
                    This utility will promote all currently active pupils school-wide to the next academic level in bulk. Promoted pupils are set to <strong className="text-amber-400 font-mono">INACTIVE</strong> (Pending Vacation Return) so you can track real enrollment as pupils report back. Activate them individually or in bulk as they re-enroll!
                  </p>

                  <div className="bg-neutral-950 border border-neutral-850 p-4 space-y-3">
                    <span className="text-[9px] font-mono font-black text-neutral-500 uppercase tracking-widest block font-bold">Standard Grade Cohort Transition Flow</span>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-[10px] text-neutral-300 divide-y divide-neutral-900">
                      <div className="flex justify-between py-1 border-none"><span>Nursery ➜ KG 1</span> <span className="text-emerald-400 font-bold">Promoted</span></div>
                      <div className="flex justify-between py-1 border-none"><span>KG 1 ➜ KG 2</span> <span className="text-emerald-400 font-bold">Promoted</span></div>
                      <div className="flex justify-between py-1"><span>KG 2 ➜ B1 (Primary)</span> <span className="text-emerald-400 font-bold">Promoted</span></div>
                      <div className="flex justify-between py-1"><span>B1 ➜ B2</span> <span className="text-emerald-400 font-bold">Promoted</span></div>
                      <div className="flex justify-between py-1"><span>B2 ➜ B3</span> <span className="text-emerald-400 font-bold">Promoted</span></div>
                      <div className="flex justify-between py-1"><span>B3 ➜ B4</span> <span className="text-emerald-400 font-bold">Promoted</span></div>
                      <div className="flex justify-between py-1"><span>B4 ➜ B5</span> <span className="text-emerald-400 font-bold">Promoted</span></div>
                      <div className="flex justify-between py-1"><span>B5 ➜ B6</span> <span className="text-emerald-400 font-bold">Promoted</span></div>
                      <div className="flex justify-between py-1"><span>B6 ➜ B7 (JHS 1)</span> <span className="text-emerald-400 font-bold">Promoted</span></div>
                      <div className="flex justify-between py-1"><span>B7 ➜ B8</span> <span className="text-emerald-400 font-bold">Promoted</span></div>
                      <div className="flex justify-between py-1"><span>B8 ➜ B9 (JHS 3)</span> <span className="text-emerald-400 font-bold">Promoted</span></div>
                      <div className="flex justify-between py-1"><span>B9 ➜ Left/Graduated</span> <span className="text-amber-500 font-bold">Graduated</span></div>
                    </div>
                  </div>

                  <div className="bg-amber-955/15 border border-amber-500/20 p-4 font-mono text-[10px] text-amber-500 uppercase font-black tracking-widest leading-relaxed font-bold">
                    ⚠️ WARNING: THIS PERFORMANCE ACTION IS PERMANENT AND NOT REVERSIBLE. IT WILL INSTANTLY ALTER THE GRADE BINDINGS OF ALL {students.filter(s => s.active).length} ACTIVE PUPILS. 
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-mono font-black text-neutral-450 tracking-wider block font-bold">Confirm Mass Promotion Action</label>
                    <p className="text-[10px] text-neutral-400 font-semibold mb-1">Type the word <strong className="text-white font-mono">PROMOTE</strong> below to authorize savior database updates:</p>
                    <input
                      type="text"
                      value={promotionConfirmedText}
                      onChange={(e) => setPromotionConfirmedText(e.target.value)}
                      placeholder="Type PROMOTE here..."
                      className="w-full bg-neutral-950 border-2 border-neutral-800 focus:border-amber-400 text-white font-mono uppercase text-xs p-3 font-black focus:outline-none"
                    />
                  </div>
                </div>

                <div className="border-t border-neutral-800 pt-4 flex gap-3">
                  <button
                    type="button"
                    disabled={promotionConfirmedText !== 'PROMOTE'}
                    onClick={() => {
                      promoteAllStudents();
                      showToast("Successfully completed mass cohort promotions school-wide! Inactive pupils purged.");
                      setShowPromotionModal(false);
                      setPromotionConfirmedText('');
                    }}
                    className={`flex-1 py-3 px-4 font-black uppercase text-xs tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 border-none ${
                      promotionConfirmedText === 'PROMOTE'
                        ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-[4px_4px_0px_0px_#10b981]'
                        : 'bg-neutral-950 text-neutral-600 border border-neutral-850 cursor-not-allowed opacity-50'
                    }`}
                  >
                    ⚡ Execute Cohort Promotions
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPromotionModal(false);
                      setPromotionConfirmedText('');
                    }}
                    className="w-1/3 py-3 px-4 bg-neutral-950 hover:bg-neutral-850 text-neutral-400 hover:text-white font-mono uppercase text-xs tracking-wider transition-colors border border-neutral-850"
                  >
                    Abort
                  </button>
                </div>
              </>
            ) : promotionTab === 'reconcile' ? (
              <>
                <div className="space-y-4 font-sans text-xs">
                  <p className="text-neutral-300 leading-relaxed font-semibold">
                    The Reconciliation Planner lets you customize decisions on a child-by-child level before running annual promotions. Prevent roster drift by marking repeating or withdrawn students!
                  </p>

                  {/* Stats Grid */}
                  {(() => {
                    let promote = 0;
                    let repeat = 0;
                    let withdraw = 0;
                    let graduate = 0;
                    const activeStudents = students.filter(s => s.active);
                    
                    const CLASS_PROMOTION_MAP: Record<StudentClass, { nextClass: StudentClass | null; category: 'Pre-school' | 'Primary' | 'JHS'; completes: boolean }> = {
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

                    activeStudents.forEach(student => {
                      const action = reconcileActions[student.id] || 'promote';
                      if (action === 'repeat') {
                        repeat++;
                      } else if (action === 'withdraw') {
                        withdraw++;
                      } else {
                        const standardNext = CLASS_PROMOTION_MAP[student.class];
                        if (standardNext?.completes) {
                          graduate++;
                        } else {
                          promote++;
                        }
                      }
                    });

                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-neutral-950 p-4 border border-neutral-850 rounded-sm">
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono font-black text-neutral-500 uppercase tracking-widest block font-bold">👤 Active Roster</span>
                          <span className="text-sm font-black text-white font-mono">{activeStudents.length} Students</span>
                        </div>
                        <div className="space-y-1 border-l border-neutral-900 pl-3">
                          <span className="text-[9px] font-mono font-black text-emerald-500 uppercase tracking-widest block font-bold">🚀 Promoting</span>
                          <span className="text-sm font-black text-emerald-400 font-mono">{promote} Pupils</span>
                        </div>
                        <div className="space-y-1 border-l border-neutral-900 pl-3">
                          <span className="text-[9px] font-mono font-black text-amber-500 uppercase tracking-widest block font-bold">🔄 Repeating</span>
                          <span className="text-sm font-black text-amber-400 font-mono">{repeat} Pupils</span>
                        </div>
                        <div className="space-y-1 border-l border-neutral-900 pl-3">
                          <span className="text-[9px] font-mono font-black text-red-500 uppercase tracking-widest block font-bold">🎓 Leave/Grad</span>
                          <span className="text-sm font-black text-red-400 font-mono">{withdraw + graduate} Pupils</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Filter controls */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 space-y-1">
                      <label className="text-[9px] uppercase font-mono font-black text-neutral-450 tracking-wider block font-bold">Filter Current Grade</label>
                      <select
                        value={reconcileClassFilter}
                        onChange={(e) => setReconcileClassFilter(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-850 focus:border-amber-400 text-white font-mono text-xs p-2 focus:outline-none"
                      >
                        <option value="All">All Grades (Full School)</option>
                        {['Nursery', 'KG1', 'KG2', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9'].map(cls => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex-1 space-y-1">
                      <label className="text-[9px] uppercase font-mono font-black text-neutral-450 tracking-wider block font-bold">Search Student Name / RFID</label>
                      <input
                        type="text"
                        value={reconcileSearch}
                        onChange={(e) => setReconcileSearch(e.target.value)}
                        placeholder="Search student..."
                        className="w-full bg-neutral-950 border border-neutral-850 focus:border-amber-400 text-white font-mono text-xs p-2 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Student list table/scroll panel */}
                  {(() => {
                    const activeStudents = students.filter(s => s.active);
                    const filteredActiveStudents = activeStudents.filter(student => {
                      const matchesClass = reconcileClassFilter === 'All' || student.class === reconcileClassFilter;
                      const matchesSearch = student.name.toLowerCase().includes(reconcileSearch.toLowerCase()) || 
                                            (student.rollNumber && student.rollNumber.toLowerCase().includes(reconcileSearch.toLowerCase()));
                      return matchesClass && matchesSearch;
                    });

                    const CLASS_PROMOTION_MAP: Record<StudentClass, { nextClass: StudentClass | null; category: 'Pre-school' | 'Primary' | 'JHS'; completes: boolean }> = {
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

                    if (filteredActiveStudents.length === 0) {
                      return (
                        <div className="bg-neutral-950/40 border border-neutral-850 border-dashed rounded-sm p-8 text-center text-neutral-500 font-mono text-[10px]">
                          No students matching your search/filters were found.
                        </div>
                      );
                    }

                    return (
                      <div className="max-h-72 overflow-y-auto border border-neutral-800 bg-neutral-950 divide-y divide-neutral-900 rounded-sm pr-1">
                        {filteredActiveStudents.map(student => {
                          const standardNext = CLASS_PROMOTION_MAP[student.class];
                          const currentAction = reconcileActions[student.id] || 'promote';
                          
                          let nextDest = '';
                          if (currentAction === 'repeat') {
                            nextDest = `${student.class} (Repeat)`;
                          } else if (currentAction === 'withdraw') {
                            nextDest = 'Left / Withdrawn';
                          } else {
                            nextDest = standardNext?.completes ? 'Graduated' : standardNext?.nextClass || 'N/A';
                          }

                          return (
                            <div key={student.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 gap-2">
                              <div>
                                <div className="font-semibold text-white uppercase text-[11px]">{student.name}</div>
                                <div className="text-[9px] font-mono text-neutral-450">
                                  Current Class: <span className="text-white">{student.class}</span> &bull; ID: {student.id.substring(0,6)}
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-[10px] font-mono text-neutral-300 mr-2 bg-neutral-900 px-2 py-0.5 border border-neutral-800">
                                  Next Grade: <span className={currentAction === 'repeat' ? 'text-amber-400 font-bold' : currentAction === 'withdraw' ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>{nextDest}</span>
                                </div>
                                
                                <div className="flex bg-neutral-900 border border-neutral-800 rounded-sm overflow-hidden p-0.5">
                                  <button
                                    type="button"
                                    onClick={() => setReconcileActions(prev => ({ ...prev, [student.id]: 'promote' }))}
                                    className={`px-2 py-1 font-mono text-[9px] uppercase font-black tracking-wider transition-colors border-none cursor-pointer ${
                                      currentAction === 'promote' 
                                        ? 'bg-emerald-500 text-black font-bold' 
                                        : 'bg-transparent text-neutral-450 hover:text-white'
                                    }`}
                                  >
                                    Promote
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setReconcileActions(prev => ({ ...prev, [student.id]: 'repeat' }))}
                                    className={`px-2 py-1 font-mono text-[9px] uppercase font-black tracking-wider transition-colors border-none cursor-pointer ${
                                      currentAction === 'repeat' 
                                        ? 'bg-amber-500 text-black font-bold' 
                                        : 'bg-transparent text-neutral-450 hover:text-white'
                                    }`}
                                  >
                                    Repeat
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setReconcileActions(prev => ({ ...prev, [student.id]: 'withdraw' }))}
                                    className={`px-2 py-1 font-mono text-[9px] uppercase font-black tracking-wider transition-colors border-none cursor-pointer ${
                                      currentAction === 'withdraw' 
                                        ? 'bg-red-500 text-white font-bold' 
                                        : 'bg-transparent text-neutral-450 hover:text-white'
                                    }`}
                                  >
                                    Withdraw
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Confirmation text */}
                  <div className="bg-amber-955/15 border border-amber-500/20 p-4 font-mono text-[10px] text-amber-500 uppercase font-black tracking-widest leading-relaxed font-bold">
                    ⚠️ WARNING: EXECUTING PROMOTIONS TRANSITIONS ENTIRE ROSTERS BEYOND BACKUPS. EXAM BILLINGS AND DAILY ATTENDANCE RULES WILL CORRESPOND TO THESE CUSTOM GRADE BINDINGS IMMEDIATELY.
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-mono font-black text-neutral-450 tracking-wider block font-bold">Authorize Reconciliation Execution</label>
                    <p className="text-[10px] text-neutral-400 font-semibold mb-1">Type <strong className="text-white font-mono">PROMOTE PLAN</strong> below to verify and execute Savior database updates:</p>
                    <input
                      type="text"
                      value={promotionConfirmedText}
                      onChange={(e) => setPromotionConfirmedText(e.target.value)}
                      placeholder="Type PROMOTE PLAN here..."
                      className="w-full bg-neutral-950 border-2 border-neutral-800 focus:border-amber-400 text-white font-mono uppercase text-xs p-3 font-black focus:outline-none"
                    />
                  </div>
                </div>

                <div className="border-t border-neutral-800 pt-4 flex gap-3">
                  <button
                    type="button"
                    disabled={promotionConfirmedText !== 'PROMOTE PLAN'}
                    onClick={() => {
                      promoteAllStudents(reconcileActions);
                      showToast("Successfully executed custom reconciliation promotion! snapshot backup stored.");
                      setShowPromotionModal(false);
                      setPromotionConfirmedText('');
                      setReconcileActions({});
                    }}
                    className={`flex-1 py-3 px-4 font-black uppercase text-xs tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 border-none ${
                      promotionConfirmedText === 'PROMOTE PLAN'
                        ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-[4px_4px_0px_0px_#10b981]'
                        : 'bg-neutral-950 text-neutral-600 border border-neutral-850 cursor-not-allowed opacity-50'
                    }`}
                  >
                    ⚡ Execute Reconciliation Promotion
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPromotionModal(false);
                      setPromotionConfirmedText('');
                    }}
                    className="w-1/3 py-3 px-4 bg-neutral-950 hover:bg-neutral-850 text-neutral-400 hover:text-white font-mono uppercase text-xs tracking-wider transition-colors border border-neutral-850"
                  >
                    Abort
                  </button>
                </div>
              </>
            ) : promotionTab === 'backups' ? (
              <>
                <div className="space-y-4 font-sans text-xs">
                  <p className="text-neutral-300 leading-relaxed font-semibold">
                    Every time school-wide promotions are triggered, a snapshot backup is automatically stored. If you notice "roster drift" or errors, you can restore previous roster states here.
                  </p>

                  {promotionBackups.length === 0 ? (
                    <div className="bg-neutral-950/40 border border-neutral-850 border-dashed rounded-sm p-8 text-center text-neutral-500 font-mono text-[10px] leading-relaxed">
                      No past snapshots found in local secure storage.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {promotionBackups.map((backup) => (
                        <div key={backup.id} className="bg-neutral-950 border border-neutral-850 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-sm">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-amber-400 font-mono font-black uppercase text-[9px] tracking-wider bg-amber-500/10 px-1.5 py-0.5 border border-amber-500/20 rounded-sm">
                                Snapshot Backup
                              </span>
                              <span className="text-[10px] font-mono text-neutral-400">
                                {new Date(backup.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-white font-bold mt-2 uppercase">{backup.description}</p>
                            <div className="text-[10px] font-mono text-neutral-500 mt-1">
                              Records: <span className="text-neutral-300 font-bold">{backup.studentCount} pupils</span> &bull; ID: {backup.id}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Are you absolutely sure you want to ROLLBACK the school roster to this snapshot from ${new Date(backup.timestamp).toLocaleString()}?\n\nThis will overwrite all current student grade assignments with the snapshot state.`)) {
                                const success = revertLastPromotion(backup.id);
                                if (success) {
                                  showToast("Successfully rolled back school roster to the selected backup state!");
                                  setShowPromotionModal(false);
                                } else {
                                  showToast("Failed to restore the selected roster backup.");
                                }
                              }
                            }}
                            className="py-2 px-3 bg-red-600 hover:bg-red-500 text-white font-mono font-black uppercase text-[10px] tracking-wider border-none rounded-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <RefreshCw size={12} />
                            <span>Restore Snapshot</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-neutral-800 pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPromotionModal(false);
                    }}
                    className="w-1/3 py-3 px-4 bg-neutral-950 hover:bg-neutral-850 text-neutral-400 hover:text-white font-mono uppercase text-xs tracking-wider transition-colors border border-neutral-850"
                  >
                    Close snap desk
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-4 font-sans text-xs">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-mono font-black text-neutral-450 tracking-wider block font-bold">Select Student to Manage</label>
                    <select
                      value={selectedPromoStudentId}
                      onChange={(e) => setSelectedPromoStudentId(e.target.value)}
                      className="w-full bg-neutral-950 border-2 border-neutral-800 focus:border-amber-400 text-white font-mono text-xs p-3 font-semibold focus:outline-none"
                    >
                      <option value="">-- Choose active student --</option>
                      {students.filter(s => s.active).map(student => (
                        <option key={student.id} value={student.id}>
                          {student.name} ({student.class}) - {student.rollNumber || 'No RFID'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedPromoStudentId && (() => {
                    const studentInHand = students.find(s => s.id === selectedPromoStudentId);
                    if (!studentInHand) return null;

                    const CLASS_PROMOTION_MAP: Record<StudentClass, { nextClass: StudentClass | null; category: 'Pre-school' | 'Primary' | 'JHS'; completes: boolean }> = {
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

                    const mapEntry = CLASS_PROMOTION_MAP[studentInHand.class];
                    const nextClassString = mapEntry?.completes ? 'Completed/Graduated' : mapEntry?.nextClass || 'N/A';
                    
                    return (
                      <div className="space-y-4">
                        {/* Student Info Card */}
                        <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-sm flex items-center gap-4">
                          {studentInHand.photoUrl ? (
                            <img
                              src={studentInHand.photoUrl}
                              alt={studentInHand.name}
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 rounded object-cover border-2 border-neutral-800"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-neutral-900 border border-neutral-800 rounded flex items-center justify-center text-neutral-500 font-mono font-bold uppercase text-lg">
                              {studentInHand.name.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="text-amber-400 font-black font-mono text-[9px] tracking-wider block uppercase font-bold">Selected Student Record</span>
                            <span className="text-xs font-black text-white block truncate uppercase">{studentInHand.name}</span>
                            <div className="flex items-center gap-2 mt-1 text-[9px] font-mono text-neutral-400">
                              <span>Grade: <strong className="text-white">{studentInHand.class}</strong> ({studentInHand.category})</span>
                              <span>&bull;</span>
                              <span>ID: <strong className="text-white">{studentInHand.id.substring(0,8)}</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* Actions Desk */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Promotion Option Block */}
                          <div className="bg-neutral-950/60 border border-neutral-850 p-4 space-y-3 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase text-[9px] font-mono tracking-wider">
                                <Award size={13} className="stroke-[2]" />
                                <span>Academic Promotion</span>
                              </div>
                              <p className="text-[10px] text-neutral-400 mt-2 leading-relaxed font-semibold">
                                Promote this student to the next logical academic standard class level. 
                              </p>
                              <div className="mt-3 bg-neutral-900 p-2 border border-neutral-850 rounded-sm font-mono text-[10px] space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-neutral-500">Current Rank:</span>
                                  <span className="font-extrabold text-neutral-300">{studentInHand.class}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-neutral-500">Next Target:</span>
                                  <span className="font-extrabold text-emerald-400 uppercase">{nextClassString}</span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (currentUser?.role !== 'Administrator') {
                                  alert('Access Denied: Only Administrators are permitted to make student grade alterations.');
                                  return;
                                }
                                if (mapEntry?.completes) {
                                  updateStudent({
                                    ...studentInHand,
                                    active: false
                                  });
                                  showToast(`Successfully marked ${studentInHand.name} as Completed/Graduated and set to inactive.`);
                                } else if (mapEntry?.nextClass) {
                                  updateStudent({
                                    ...studentInHand,
                                    class: mapEntry.nextClass,
                                    category: mapEntry.category,
                                    active: false
                                  });
                                  showToast(`Successfully promoted ${studentInHand.name} to ${mapEntry.nextClass}. Set to INACTIVE pending return from vacation.`);
                                }
                                setSelectedPromoStudentId('');
                              }}
                              className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-black uppercase text-[10px] tracking-wider border-none rounded-sm transition-colors cursor-pointer"
                            >
                              ⚡ Promote to {mapEntry?.completes ? 'Graduate' : nextClassString}
                            </button>
                          </div>

                          {/* Repetition Block */}
                          <div className="bg-neutral-950/60 border border-neutral-850 p-4 space-y-3 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-1.5 text-amber-500 font-bold uppercase text-[9px] font-mono tracking-wider">
                                <RefreshCw size={12} className="stroke-[2]" />
                                <span>Class Repetition</span>
                              </div>
                              <p className="text-[10px] text-neutral-400 mt-2 leading-relaxed font-semibold">
                                Retain this student in their current grade class, or select a custom class to repeat.
                              </p>
                              <div className="mt-3 space-y-2">
                                <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest block font-bold">Select Target Grade</span>
                                <select
                                  id="single-student-repeat-class-selector"
                                  className="w-full bg-neutral-900 border border-neutral-800 text-neutral-300 font-mono text-[10px] p-2 focus:outline-none focus:border-amber-400"
                                  defaultValue={studentInHand.class}
                                >
                                  {['Nursery', 'KG1', 'KG2', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9'].map(cls => (
                                    <option key={cls} value={cls}>
                                      {cls} (Repeat grade class)
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (currentUser?.role !== 'Administrator') {
                                  alert('Access Denied: Only Administrators are permitted to make student grade alterations.');
                                  return;
                                }
                                const selectEl = document.getElementById('single-student-repeat-class-selector') as HTMLSelectElement;
                                const targetClass = selectEl?.value as StudentClass;
                                
                                if (targetClass) {
                                  const targetCategory = getClassCategory(targetClass);
                                  updateStudent({
                                    ...studentInHand,
                                    class: targetClass,
                                    category: targetCategory,
                                    active: true
                                  });
                                  showToast(`Successfully set ${studentInHand.name} to repeat/enroll in grade class: ${targetClass}.`);
                                }
                                setSelectedPromoStudentId('');
                              }}
                              className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-black font-mono font-black uppercase text-[10px] tracking-wider border-none rounded-sm transition-colors cursor-pointer"
                            >
                              🔄 Confirm Repetition Grade
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {!selectedPromoStudentId && (
                    <div className="bg-neutral-950/40 border border-neutral-850 border-dashed rounded-sm p-8 text-center text-neutral-500 font-mono text-[10px] leading-relaxed">
                      Select a pupil from school registry roster above to start single promotion / repetition desk operations.
                    </div>
                  )}
                </div>

                <div className="border-t border-neutral-800 pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPromotionModal(false);
                      setSelectedPromoStudentId('');
                    }}
                    className="w-1/3 py-3 px-4 bg-neutral-950 hover:bg-neutral-850 text-neutral-400 hover:text-white font-mono uppercase text-xs tracking-wider transition-colors border border-neutral-850"
                  >
                    Close Desk
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Percentage Wage & Promotion Salary Adjuster Modal */}
      {showSalaryAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in animate-duration-200 overflow-y-auto">
          <div className="bg-neutral-950 border-4 border-amber-500 max-w-5xl w-full p-6 space-y-6 shadow-[10px_10px_0px_0px_rgba(245,158,11,0.25)] relative my-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-neutral-850 pb-4 gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded">
                  <Percent className="text-amber-400" size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-wider text-amber-400 font-mono flex items-center gap-2">
                    <span>Percentage Wage & Promotion Salary Adjuster</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-mono font-bold">
                      AUTOMATED % ENGINE
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400 font-sans mt-0.5">
                    Adjust staff & teacher salaries by percentage for promotions, annual wage increases, or inflation indexation.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSalaryAdjustModal(false);
                    setShowTeacherSalaryIncrementModal(true);
                  }}
                  className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-amber-500/40 text-amber-400 hover:text-amber-300 text-xs font-mono font-bold uppercase rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Open full interactive and printable salary increment summary sheet"
                >
                  <TrendingUp size={14} />
                  <span>Full Printable Summary</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSalaryAdjustModal(false)}
                  className="p-1.5 text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 transition-colors cursor-pointer rounded"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Success Toast Banner */}
            {salaryAdjustSuccessMsg && (
              <div className="p-4 bg-emerald-950/80 border-2 border-emerald-500/50 rounded flex items-center justify-between text-xs font-mono font-bold text-emerald-300 animate-fade-in">
                <div className="flex items-center gap-2">
                  <Check size={18} className="text-emerald-400 shrink-0" />
                  <span>{salaryAdjustSuccessMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSalaryAdjustSuccessMsg(null)}
                  className="text-emerald-400 hover:text-white text-xs underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Controls Bar */}
            <div className="bg-neutral-900 border-2 border-neutral-800 p-5 rounded-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* Mode Selector */}
                <div className="md:col-span-3 space-y-1.5">
                  <label className="block text-[10px] font-black text-amber-400 uppercase tracking-widest font-mono">
                    Adjustment Direction
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 bg-neutral-950 p-1 border border-neutral-800 rounded">
                    <button
                      type="button"
                      onClick={() => {
                        setAdjustMode('increase');
                        playFeedbackSound('click');
                      }}
                      className={`py-1.5 px-2 text-[10px] font-mono font-black uppercase rounded transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                        adjustMode === 'increase'
                          ? 'bg-emerald-500 text-black shadow'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <TrendingUp size={12} />
                      <span>Increment (+)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAdjustMode('decrease');
                        playFeedbackSound('click');
                      }}
                      className={`py-1.5 px-2 text-[10px] font-mono font-black uppercase rounded transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                        adjustMode === 'decrease'
                          ? 'bg-rose-500 text-white shadow'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <X size={12} />
                      <span>Reduction (-)</span>
                    </button>
                  </div>
                </div>

                {/* Percentage Shortcuts & Input */}
                <div className="md:col-span-5 space-y-1.5">
                  <label className="block text-[10px] font-black text-amber-400 uppercase tracking-widest font-mono flex items-center justify-between">
                    <span>Percentage Rate (%)</span>
                    <span className="text-neutral-400 font-normal">Presets or Custom Rate</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[5, 10, 15, 20].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setAdjustPercentage(preset);
                            playFeedbackSound('click');
                          }}
                          className={`px-2.5 py-2 text-[10px] font-mono font-black rounded border transition-colors cursor-pointer ${
                            adjustPercentage === preset
                              ? 'bg-amber-500 text-black border-amber-400'
                              : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-600'
                          }`}
                        >
                          {preset}%
                        </button>
                      ))}
                    </div>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        max="200"
                        value={adjustPercentage}
                        onChange={(e) => setAdjustPercentage(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full bg-neutral-950 border border-neutral-800 py-1.5 px-3 pr-7 text-xs font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-400 text-right rounded"
                      />
                      <span className="absolute right-2.5 top-2 text-xs font-mono text-neutral-500 font-bold">%</span>
                    </div>
                  </div>
                </div>

                {/* Role / Group Filter */}
                <div className="md:col-span-4 space-y-1.5">
                  <label className="block text-[10px] font-black text-amber-400 uppercase tracking-widest font-mono">
                    Filter Staff Group / Role
                  </label>
                  <select
                    value={adjustTargetRole}
                    onChange={(e) => {
                      const role = e.target.value;
                      setAdjustTargetRole(role);
                      if (role === 'All') {
                        setSelectedStaffIdsForAdjust(users.map(u => u.id));
                      } else {
                        setSelectedStaffIdsForAdjust(users.filter(u => u.role === role).map(u => u.id));
                      }
                    }}
                    className="w-full bg-neutral-950 border border-neutral-800 py-2 px-3 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 rounded"
                  >
                    <option value="All">All Staff Members ({users.length})</option>
                    <option value="Teacher">Classroom Teachers ({users.filter(u => u.role === 'Teacher').length})</option>
                    <option value="Administrator">Administrators ({users.filter(u => u.role === 'Administrator').length})</option>
                    <option value="Accountant">Accountants ({users.filter(u => u.role === 'Accountant').length})</option>
                    <option value="Driver">Drivers & Transport ({users.filter(u => u.role === 'Driver').length})</option>
                    <option value="Kitchen Staff">Kitchen & Catering ({users.filter(u => u.role === 'Kitchen Staff').length})</option>
                    <option value="Security">Security & Gate Keepers ({users.filter(u => u.role === 'Security').length})</option>
                  </select>
                </div>

              </div>

              {/* Reason / Note Input */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest font-mono">
                  Adjustment Purpose / Promotion Note
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Promotion to Senior Educator, Annual School Wage Increase 2026..."
                  className="w-full bg-neutral-950 border border-neutral-800 py-2 px-3 text-xs font-mono text-white focus:outline-none focus:border-amber-400 rounded"
                />
              </div>
            </div>

            {/* Filter Search & Select All Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral-900/60 p-3 border border-neutral-800 rounded">
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-2.5 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search staff by name or email..."
                  value={salaryAdjustSearch}
                  onChange={(e) => setSalaryAdjustSearch(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 py-1.5 pl-9 pr-3 text-xs font-mono text-white focus:outline-none focus:border-amber-400 rounded"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedStaffIdsForAdjust(users.map(u => u.id))}
                  className="text-[10px] font-mono text-amber-400 hover:text-amber-300 uppercase font-bold cursor-pointer"
                >
                  Select All ({users.length})
                </button>
                <span className="text-neutral-700">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedStaffIdsForAdjust([])}
                  className="text-[10px] font-mono text-neutral-400 hover:text-white uppercase font-bold cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>
            </div>

            {/* Preview Staff List Table */}
            <div className="border border-neutral-800 rounded overflow-hidden max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-10 font-mono text-[10px] text-neutral-400 uppercase tracking-wider">
                  <tr>
                    <th className="p-3 text-center w-12">Apply</th>
                    <th className="p-3">Staff Member</th>
                    <th className="p-3">Role</th>
                    <th className="p-3 text-right">Current Wage</th>
                    <th className="p-3 text-center">Adjust (%)</th>
                    <th className="p-3 text-right">Difference</th>
                    <th className="p-3 text-right">New Proposed Salary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850 bg-neutral-950 font-mono">
                  {users
                    .filter(u => 
                      (adjustTargetRole === 'All' || u.role === adjustTargetRole) &&
                      (u.name.toLowerCase().includes(salaryAdjustSearch.toLowerCase()) || u.email.toLowerCase().includes(salaryAdjustSearch.toLowerCase()))
                    )
                    .map((staff) => {
                      const isSelected = selectedStaffIdsForAdjust.includes(staff.id);
                      const currentWage = staff.stipendSalary || 0;
                      const multiplier = adjustMode === 'increase' ? (1 + adjustPercentage / 100) : (1 - adjustPercentage / 100);
                      const proposedWage = Math.max(0, Math.round((currentWage * multiplier) * 100) / 100);
                      const diff = proposedWage - currentWage;

                      return (
                        <tr 
                          key={staff.id}
                          className={`transition-colors ${
                            isSelected ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'opacity-40 hover:opacity-70'
                          }`}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedStaffIdsForAdjust(prev => [...prev, staff.id]);
                                } else {
                                  setSelectedStaffIdsForAdjust(prev => prev.filter(id => id !== staff.id));
                                }
                              }}
                              className="w-4 h-4 accent-amber-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 font-sans">
                            <div className="font-bold text-white text-xs">{staff.name}</div>
                            <div className="text-[10px] text-neutral-500 font-mono">{staff.email}</div>
                          </td>
                          <td className="p-3 text-neutral-300">
                            <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 text-[10px] font-bold text-amber-400 rounded">
                              {staff.role}
                            </span>
                          </td>
                          <td className="p-3 text-right font-bold text-neutral-300">
                            GHC {currentWage.toFixed(2)}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              adjustMode === 'increase' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' : 'bg-rose-950 text-rose-400 border border-rose-800/40'
                            }`}>
                              {adjustMode === 'increase' ? '+' : '-'}{adjustPercentage}%
                            </span>
                          </td>
                          <td className={`p-3 text-right font-bold ${diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {diff >= 0 ? `+GHC ${diff.toFixed(2)}` : `-GHC ${Math.abs(diff).toFixed(2)}`}
                          </td>
                          <td className="p-3 text-right font-black text-amber-400 text-sm">
                            GHC {proposedWage.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Impact Summary & Confirm Button */}
            {(() => {
              const selectedUsers = users.filter(u => selectedStaffIdsForAdjust.includes(u.id));
              const currentPayrollTotal = selectedUsers.reduce((sum, u) => sum + (u.stipendSalary || 0), 0);
              const multiplier = adjustMode === 'increase' ? (1 + adjustPercentage / 100) : (1 - adjustPercentage / 100);
              const proposedPayrollTotal = selectedUsers.reduce((sum, u) => sum + Math.max(0, Math.round(((u.stipendSalary || 0) * multiplier) * 100) / 100), 0);
              const netDifference = proposedPayrollTotal - currentPayrollTotal;

              return (
                <div className="bg-neutral-900 border-2 border-neutral-800 p-4 rounded flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-xs font-mono">
                    <div className="flex items-center gap-3">
                      <span className="text-neutral-400">Target Staff Count: <strong className="text-white">{selectedUsers.length}</strong></span>
                      <span className="text-neutral-700">|</span>
                      <span className="text-neutral-400">Current Payroll: <strong className="text-white">GHC {currentPayrollTotal.toFixed(2)}</strong></span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-neutral-400">New Proposed Payroll: <strong className="text-amber-400 font-black">GHC {proposedPayrollTotal.toFixed(2)}</strong></span>
                      <span className="text-neutral-700">|</span>
                      <span className="text-neutral-400">Net Shift: <strong className={netDifference >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {netDifference >= 0 ? `+GHC ${netDifference.toFixed(2)}` : `-GHC ${Math.abs(netDifference).toFixed(2)}`}
                      </strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setShowSalaryAdjustModal(false)}
                      className="px-4 py-2.5 bg-neutral-950 hover:bg-neutral-850 text-neutral-300 text-xs font-mono font-bold uppercase border border-neutral-800 rounded transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={selectedUsers.length === 0}
                      onClick={() => {
                        const adjustments = selectedUsers.map(u => {
                          const currentWage = u.stipendSalary || 0;
                          const calculated = Math.max(0, Math.round((currentWage * multiplier) * 100) / 100);
                          return {
                            userId: u.id,
                            percentage: adjustMode === 'increase' ? adjustPercentage : -adjustPercentage,
                            newSalary: calculated,
                            reason: adjustReason
                          };
                        });

                        const res = adjustStaffSalariesByPercentage(adjustments);
                        if (res.success) {
                          playFeedbackSound('success');
                          setSalaryAdjustSuccessMsg(`Successfully adjusted wages by ${adjustMode === 'increase' ? '+' : '-'}${adjustPercentage}% for ${res.count} staff members!`);
                          setTimeout(() => {
                            setShowSalaryAdjustModal(false);
                          }, 1800);
                        }
                      }}
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-2 rounded cursor-pointer transition-colors shadow"
                    >
                      <Check size={16} className="stroke-[3]" />
                      <span>Apply % Adjustments ({selectedUsers.length})</span>
                    </button>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      )}

      {/* Teacher & Staff Salary Increment Summary & Term Outflow Projection Modal */}
      <TeacherSalaryIncrementModal
        isOpen={showTeacherSalaryIncrementModal}
        onClose={() => setShowTeacherSalaryIncrementModal(false)}
      />

      {/* Staff Appointment & Renewal System Modal */}
      {appointmentModalUser && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 py-6 sm:py-10 animate-fade-in animate-duration-200 overflow-y-auto">
          <div className="bg-neutral-950 border-4 border-amber-500 max-w-5xl w-full p-4 sm:p-6 space-y-4 shadow-[10px_10px_0px_0px_rgba(245,158,11,0.25)] relative my-0 sm:my-2 max-h-[92vh] sm:max-h-[88vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-neutral-850 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <FileSignature className="text-amber-500 shrink-0" size={24} />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-amber-400 font-mono">Staff Appointment & Renewal System</h3>
                  <p className="text-xs text-neutral-400 font-sans mt-0.5">
                    Configure terms, generate official appointment letters, and process formal contract extensions for <strong className="text-white font-mono">{appointmentModalUser.name}</strong> ({appointmentModalUser.role})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAppointmentModalUser(null)}
                className="p-1 text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 transition-colors cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-neutral-800 shrink-0">
              <button
                onClick={() => setIsRenewalTab(false)}
                className={`flex-1 py-2.5 px-4 font-mono text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  !isRenewalTab
                    ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <FileText size={14} />
                Letter of Appointment
              </button>
              <button
                onClick={() => setIsRenewalTab(true)}
                className={`flex-1 py-2.5 px-4 font-mono text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isRenewalTab
                    ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <CalendarDays size={14} />
                Contract Renewal & Extensions
              </button>
            </div>

            {/* Content Tabs Body Container */}
            <div className="flex-1 overflow-y-auto pr-1">
              {!isRenewalTab ? (
                /* Tab 1: Letter of Appointment */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Form Inputs (Left) */}
                  <div className="lg:col-span-5 space-y-4 max-h-[calc(80vh-160px)] overflow-y-auto pr-2">
                  <div className="bg-neutral-900/40 p-4 border border-neutral-850 space-y-4">
                    <span className="text-[10px] font-mono font-black text-amber-500 uppercase tracking-widest block border-b border-neutral-800 pb-1.5">Employment Details</span>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-mono font-black text-neutral-400 uppercase block mb-1">Letter Date</label>
                        <input
                          type="date"
                          value={appLetterDate}
                          onChange={(e) => setAppLetterDate(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 text-white font-mono text-xs p-2 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono font-black text-neutral-400 uppercase block mb-1">Effective Start Date</label>
                        <input
                          type="date"
                          value={appStartDate}
                          onChange={(e) => setAppStartDate(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 text-white font-mono text-xs p-2 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-mono font-black text-neutral-400 uppercase block mb-1">Contract End Date</label>
                        <input
                          type="date"
                          value={appEndDate}
                          onChange={(e) => setAppEndDate(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 text-white font-mono text-xs p-2 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono font-black text-neutral-400 uppercase block mb-1">Department</label>
                        <input
                          type="text"
                          value={appDepartment}
                          onChange={(e) => setAppDepartment(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 text-white font-mono text-xs p-2 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-mono font-black text-neutral-400 uppercase block mb-1">Monthly Stipend (GHC)</label>
                        <input
                          type="number"
                          value={appSalary}
                          onChange={(e) => setAppSalary(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 text-white font-mono text-xs p-2 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono font-black text-neutral-400 uppercase block mb-1">Job Title / Designation</label>
                        <input
                          type="text"
                          value={appJobTitle}
                          onChange={(e) => setAppJobTitle(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 text-white font-mono text-xs p-2 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono font-black text-neutral-400 uppercase block mb-1">Teacher Personal Address</label>
                      <textarea
                        rows={2}
                        value={appPersonalAddress}
                        onChange={(e) => setAppPersonalAddress(e.target.value)}
                        placeholder="e.g. P.O. Box GP 1234, Accra, Ghana"
                        className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 text-white font-mono text-xs p-2 focus:outline-none resize-none"
                      />
                    </div>
                  </div>

                  <div className="bg-neutral-900/40 p-4 border border-neutral-850 space-y-4">
                    <span className="text-[10px] font-mono font-black text-amber-500 uppercase tracking-widest block border-b border-neutral-800 pb-1.5">Renewal Provision Parameters</span>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-mono font-black text-neutral-400 uppercase block mb-1">Renewal Clause</label>
                        <select
                          value={appRenewalOpt}
                          onChange={(e: any) => setAppRenewalOpt(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 text-white font-mono text-xs p-2 focus:outline-none"
                        >
                          <option value="Automatic">Automatic</option>
                          <option value="Manual Review">Manual Review</option>
                          <option value="Fixed Term">Fixed Term</option>
                          <option value="Non-Renewable">Non-Renewable</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-mono font-black text-neutral-400 uppercase block mb-1">Standard Period</label>
                        <input
                          type="text"
                          value={appRenewalPeriod}
                          onChange={(e) => setAppRenewalPeriod(e.target.value)}
                          placeholder="e.g. 1 Year"
                          className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 text-white font-mono text-xs p-2 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-neutral-900/40 p-4 border border-neutral-850 space-y-4">
                    <span className="text-[10px] font-mono font-black text-amber-500 uppercase tracking-widest block border-b border-neutral-800 pb-1.5">Signatory Authority</span>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-mono font-black text-neutral-400 uppercase block mb-1">Signatory Officer Name</label>
                        <input
                          type="text"
                          value={appSignatoryName}
                          onChange={(e) => setAppSignatoryName(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 text-white font-mono text-xs p-2 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono font-black text-neutral-400 uppercase block mb-1">Designated Officer Title</label>
                        <input
                          type="text"
                          value={appSignatoryTitle}
                          onChange={(e) => setAppSignatoryTitle(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 text-white font-mono text-xs p-2 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Digital Signature Capture */}
                  <div className="bg-neutral-900/40 p-4 border border-neutral-850 space-y-4">
                    <div className="border-b border-neutral-800 pb-1.5 flex items-center justify-between">
                      <span className="text-[10px] font-mono font-black text-amber-500 uppercase tracking-widest block">Digital Signature Capture</span>
                      <span className="text-[9px] font-mono text-neutral-500 font-bold uppercase">Ink-on-Screen</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <SignaturePad 
                        title="Authorized Signatory (Management)" 
                        value={appManagementSignature} 
                        onChange={setAppManagementSignature} 
                      />
                      <SignaturePad 
                        title="Employee Acceptance Signature" 
                        value={appStaffSignature} 
                        onChange={setAppStaffSignature} 
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleSaveAppointment}
                      className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-black font-mono font-black uppercase text-xs tracking-wider border-none rounded-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Check size={14} />
                      Save System Registers
                    </button>
                  </div>
                </div>

                {/* Print & Preview Panel (Right) */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-black text-neutral-400 uppercase tracking-wider block">Live Formal Letter Preview</span>
                    <button
                      type="button"
                      onClick={() => handlePrintAppointmentLetter(false)}
                      className="py-1.5 px-3 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-amber-500 text-amber-400 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 rounded-sm cursor-pointer"
                    >
                      <Printer size={12} />
                      Print Appointment Letter
                    </button>
                  </div>

                  {/* Letter Blueprint Visual Board */}
                  <div className="border border-neutral-800 bg-[#fbfbf9] p-6 text-neutral-900 rounded-sm shadow-inner min-h-[460px] overflow-y-auto max-h-[480px] font-serif text-xs leading-relaxed select-none relative">
                    {/* Faint Watermark inside the React visual preview */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none z-0 rotate-[-12deg]">
                      <SchoolLogo size={280} lightBackground={true} />
                    </div>

                    <div className="relative z-10">
                      <div className="flex items-center justify-between border-b-2 border-emerald-800/20 pb-3 mb-4">
                        <div className="w-[60px] h-[60px] shrink-0">
                          <SchoolLogo size={60} lightBackground={true} />
                        </div>
                        <div className="text-right flex-grow pl-3">
                          <h4 className="text-[13px] font-extrabold uppercase font-sans tracking-wide m-0 text-emerald-950">{systemSettings?.schoolName || 'SAWLA COMPREHENSIVE ACADEMY'}</h4>
                          <p className="text-[9px] italic text-amber-600 font-bold m-0">{systemSettings?.schoolSlogan || systemSettings?.customMotto || 'Holiness is our key'}</p>
                          <p className="text-[8px] font-sans text-neutral-500 m-0">{systemSettings?.schoolBoxAddress || 'P. O. Box LS 15, Sawla Savannah Region • Sawla, Jelinkon street, Savannah Region, Ghana'}</p>
                        </div>
                      </div>

                      <div className="text-right font-sans font-bold text-[9px] mb-4 text-neutral-600">
                        Date: {new Date(appLetterDate || new Date()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>

                      <div className="mb-4 text-[10px] text-neutral-700 leading-normal">
                        To:<br/>
                        <strong className="text-[11px] text-emerald-950 font-sans block mb-1">{appointmentModalUser.name}</strong>
                        {appPersonalAddress ? (
                          <div className="whitespace-pre-line text-neutral-600 font-mono text-[9px] leading-relaxed bg-neutral-100/40 p-2 border border-neutral-200/60 rounded max-w-sm">
                            {appPersonalAddress}
                          </div>
                        ) : (
                          <>
                            <span className="font-mono text-[9px] bg-neutral-100 px-1 py-0.5 rounded">{appDepartment}</span><br/>
                            <span className="text-neutral-400 italic text-[9px]">Personal Address Not Set</span>
                          </>
                        )}
                      </div>

                      <div className="text-center font-bold underline my-3 text-[10px] uppercase text-emerald-900 tracking-wide font-sans">
                        RE: LETTER OF APPOINTMENT AS {appJobTitle || 'STAFF MEMBER'}
                      </div>

                      <div className="text-justify space-y-2 text-[10px] text-neutral-800">
                        <p>Dear {appointmentModalUser.name.split(' ')[0] || 'Sir/Madam'},</p>
                        <p>On behalf of the School Management, I am pleased to offer you a formal appointment as <strong className="text-emerald-950">{appJobTitle || 'Staff Member'}</strong> in the <strong>{appDepartment || 'Academic Department'}</strong>, effective from <strong>{new Date(appStartDate || new Date()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.</p>
                        <p>You will receive a basic monthly stipend of <strong>GHC {parseFloat(appSalary || '0').toFixed(2)}</strong>. This appointment runs until <strong>{new Date(appEndDate || new Date()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>, under our standard <strong>{appRenewalOpt}</strong> renewal options clause.</p>
                        <p>Your duties shall include student instruction, assessment bookkeeping audits, gate safety assignments, and upholding our professional code of ethics.</p>
                        <p>Please return a signed copy of this letter to acknowledge your acceptance.</p>
                      </div>

                      <div className="mt-8 flex justify-between items-end text-[9px] pt-4 border-t border-dashed border-neutral-200">
                        <div>
                          For School Management:<br/>
                          {appManagementSignature ? (
                            <div className="h-10 flex items-center justify-start my-1 bg-amber-50/10 rounded border border-neutral-100 p-0.5">
                              <img src={appManagementSignature} alt="Authorized Signatory" className="max-h-10 object-contain max-w-[120px]" />
                            </div>
                          ) : (
                            <div className="h-5" />
                          )}
                          <strong>{appSignatoryName}</strong><br/>
                          <span className="text-neutral-500">{appSignatoryTitle}</span>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <span className="block">Employee Acceptance:</span>
                          {appStaffSignature ? (
                            <div className="h-10 flex items-center justify-end my-1 bg-amber-50/10 rounded border border-neutral-100 p-0.5">
                              <img src={appStaffSignature} alt="Employee Acceptance" className="max-h-10 object-contain max-w-[120px]" />
                            </div>
                          ) : (
                            <div className="h-5" />
                          )}
                          <strong>{appointmentModalUser.name}</strong><br/>
                          <span className="text-neutral-500">Signature & Date</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Tab 2: Contract Renewal & Extensions */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Contract Extensions Planner Form (Left) */}
                <div className="lg:col-span-5 space-y-4 max-h-[calc(80vh-160px)] overflow-y-auto pr-2">
                  <div className="bg-neutral-900/40 p-4 border border-neutral-850 space-y-3">
                    <span className="text-[10px] font-mono font-black text-amber-500 uppercase tracking-widest block border-b border-neutral-800 pb-1.5">Current Contract Registration</span>
                    
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-[9px] uppercase font-mono font-bold text-neutral-400 block">Scheduled Expiry</span>
                        <strong className="text-amber-400 font-mono text-xs">
                          {appointmentModalUser.contractEndDate 
                            ? new Date(appointmentModalUser.contractEndDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                            : 'Not Registered'
                          }
                        </strong>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-mono font-bold text-neutral-400 block">Current Stipend</span>
                        <strong className="text-emerald-400 font-mono text-xs">GHC {parseFloat(appSalary).toFixed(2)}</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs pt-1 border-t border-neutral-900">
                      <div>
                        <span className="text-[9px] uppercase font-mono font-bold text-neutral-400 block">Renewal Clause</span>
                        <span className="text-neutral-200 font-semibold">{appRenewalOpt}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-mono font-bold text-neutral-400 block">Renewal Span</span>
                        <span className="text-neutral-200 font-semibold">{appRenewalPeriod}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-neutral-900/40 p-4 border border-neutral-850 space-y-4">
                    <span className="text-[10px] font-mono font-black text-amber-500 uppercase tracking-widest block border-b border-neutral-800 pb-1.5">Quick Renewal Presets</span>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleProcessRenewal(6, 0, appRenewalOpt)}
                        className="py-3 px-2 bg-neutral-950 hover:bg-neutral-900 text-neutral-300 hover:text-amber-400 border border-neutral-800 hover:border-amber-500 rounded font-mono text-[10px] font-bold text-center cursor-pointer transition-colors"
                      >
                        ⏱️ +6 Months<br/>
                        <span className="text-[8px] text-neutral-500">Keep Stipend</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleProcessRenewal(12, 100, appRenewalOpt)}
                        className="py-3 px-2 bg-neutral-950 hover:bg-neutral-900 text-neutral-300 hover:text-amber-400 border border-neutral-800 hover:border-amber-500 rounded font-mono text-[10px] font-bold text-center cursor-pointer transition-colors"
                      >
                        🎓 +1 Year<br/>
                        <span className="text-[8px] text-emerald-400">+GHC 100.00</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleProcessRenewal(24, 250, appRenewalOpt)}
                        className="py-3 px-2 bg-neutral-950 hover:bg-neutral-900 text-neutral-300 hover:text-amber-400 border border-neutral-800 hover:border-amber-500 rounded font-mono text-[10px] font-bold text-center cursor-pointer transition-colors"
                      >
                        ⚡ +2 Years<br/>
                        <span className="text-[8px] text-emerald-400">+GHC 250.00</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-neutral-900/40 p-4 border border-neutral-850 space-y-4">
                    <span className="text-[10px] font-mono font-black text-amber-500 uppercase tracking-widest block border-b border-neutral-800 pb-1.5">Custom Contract Extensions</span>
                    
                    {(() => {
                      const CustomRenewalForm = () => {
                        const [months, setMonths] = useState('12');
                        const [adjustment, setAdjustment] = useState('50');
                        const [clause, setClause] = useState<any>(appRenewalOpt);

                        return (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] font-mono font-black text-neutral-400 uppercase block mb-1">Extension Span (Months)</label>
                                <input
                                  type="number"
                                  value={months}
                                  onChange={(e) => setMonths(e.target.value)}
                                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 text-white font-mono text-xs p-2 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-mono font-black text-neutral-400 uppercase block mb-1">Stipend Increase (GHC)</label>
                                <input
                                  type="number"
                                  value={adjustment}
                                  onChange={(e) => setAdjustment(e.target.value)}
                                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 text-white font-mono text-xs p-2 focus:outline-none"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] font-mono font-black text-neutral-400 uppercase block mb-1">Future Clause</label>
                                <select
                                  value={clause}
                                  onChange={(e: any) => setClause(e.target.value)}
                                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 text-white font-mono text-xs p-2 focus:outline-none"
                                >
                                  <option value="Automatic">Automatic</option>
                                  <option value="Manual Review">Manual Review</option>
                                  <option value="Fixed Term">Fixed Term</option>
                                  <option value="Non-Renewable">Non-Renewable</option>
                                </select>
                              </div>
                              <div className="flex items-end">
                                <button
                                  type="button"
                                  onClick={() => handleProcessRenewal(parseInt(months) || 0, parseFloat(adjustment) || 0, clause)}
                                  className="w-full py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-black uppercase text-xs tracking-wider border-none rounded-sm transition-colors cursor-pointer"
                                >
                                  🔄 Authorize Renewal
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      };
                      return <CustomRenewalForm />;
                    })()}
                  </div>

                  {/* Digital Signature Capture */}
                  <div className="bg-neutral-900/40 p-4 border border-neutral-850 space-y-4">
                    <div className="border-b border-neutral-800 pb-1.5 flex items-center justify-between">
                      <span className="text-[10px] font-mono font-black text-amber-500 uppercase tracking-widest block">Digital Signature Capture</span>
                      <span className="text-[9px] font-mono text-neutral-500 font-bold uppercase">Ink-on-Screen</span>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <SignaturePad 
                        title="Authorized Signatory (Management)" 
                        value={appManagementSignature} 
                        onChange={setAppManagementSignature} 
                      />
                      <SignaturePad 
                        title="Employee Acceptance Signature" 
                        value={appStaffSignature} 
                        onChange={setAppStaffSignature} 
                      />
                    </div>
                  </div>

                  {/* Teacher Professional Ethics & Salary Promotion Evaluation Card */}
                  <div className="bg-neutral-900/90 border border-amber-500/40 p-4 rounded space-y-4 shadow-xl">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                      <div className="flex items-center gap-2">
                        <Award className="text-amber-400" size={16} />
                        <span className="text-xs font-mono font-black text-amber-400 uppercase tracking-wider">
                          Teacher Ethics & Salary Promotion Evaluation
                        </span>
                      </div>
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-mono font-bold">
                        ATTACHED TO RE-APPOINTMENT
                      </span>
                    </div>

                    {/* Evaluation Period */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-mono font-black text-neutral-400 uppercase block mb-1">Academic Year Evaluated</label>
                        <input
                          type="text"
                          value={ethicsAcademicYear}
                          onChange={(e) => setEthicsAcademicYear(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 text-white font-mono text-xs p-2 rounded focus:outline-none"
                          placeholder="e.g. 2025/2026 Academic Year"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono font-black text-neutral-400 uppercase block mb-1">Qualification Decision</label>
                        <select
                          value={ethicsQualificationStatus}
                          onChange={(e: any) => setEthicsQualificationStatus(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-500 text-amber-400 font-mono text-xs p-2 rounded focus:outline-none font-bold"
                        >
                          <option value="Qualified (Full Increment)">Qualified (Full Increment)</option>
                          <option value="Qualified (Partial Increment)">Qualified (Partial Increment)</option>
                          <option value="Withheld (Ethics Review)">Withheld (Ethics Review)</option>
                          <option value="Maintained (No Change)">Maintained (No Change)</option>
                        </select>
                      </div>
                    </div>

                    {/* Positive Ethics Checklist */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-mono font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                          <CheckCircle size={12} /> Positive Professional Ethics ({selectedPositiveEthics.length})
                        </label>
                        <button
                          type="button"
                          onClick={() => setSelectedPositiveEthics(selectedPositiveEthics.length === ALL_POSITIVE_ETHICS.length ? [] : [...ALL_POSITIVE_ETHICS])}
                          className="text-[9px] font-mono text-emerald-400 hover:underline uppercase cursor-pointer"
                        >
                          {selectedPositiveEthics.length === ALL_POSITIVE_ETHICS.length ? 'Clear All' : 'Select All'}
                        </button>
                      </div>
                      <div className="bg-neutral-950 p-2.5 border border-neutral-800 rounded space-y-1.5 max-h-36 overflow-y-auto">
                        {ALL_POSITIVE_ETHICS.map((item) => {
                          const isChecked = selectedPositiveEthics.includes(item);
                          return (
                            <label key={item} className="flex items-center gap-2 text-xs text-neutral-300 font-sans cursor-pointer hover:text-white select-none">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedPositiveEthics(prev => [...prev, item]);
                                  } else {
                                    setSelectedPositiveEthics(prev => prev.filter(i => i !== item));
                                  }
                                }}
                                className="accent-emerald-500 rounded cursor-pointer"
                              />
                              <span className={isChecked ? 'text-emerald-300 font-medium' : 'text-neutral-500'}>{item}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Negative Ethics / Infractions Checklist */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-mono font-black text-rose-400 uppercase tracking-widest flex items-center gap-1">
                          <AlertTriangle size={12} /> Infractions & Demerits ({selectedNegativeEthics.length})
                        </label>
                        <button
                          type="button"
                          onClick={() => setSelectedNegativeEthics([])}
                          className="text-[9px] font-mono text-rose-400 hover:underline uppercase cursor-pointer"
                        >
                          Clean Record
                        </button>
                      </div>
                      <div className="bg-neutral-950 p-2.5 border border-neutral-800 rounded space-y-1.5 max-h-32 overflow-y-auto">
                        {ALL_NEGATIVE_ETHICS.map((item) => {
                          const isChecked = selectedNegativeEthics.includes(item);
                          return (
                            <label key={item} className="flex items-center gap-2 text-xs text-neutral-300 font-sans cursor-pointer hover:text-white select-none">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedNegativeEthics(prev => [...prev, item]);
                                  } else {
                                    setSelectedNegativeEthics(prev => prev.filter(i => i !== item));
                                  }
                                }}
                                className="accent-rose-500 rounded cursor-pointer"
                              />
                              <span className={isChecked ? 'text-rose-300 font-semibold' : 'text-neutral-500'}>{item}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Percentage Selector & Remuneration Adjustment Calculator */}
                    <div className="bg-neutral-950 p-3 border border-neutral-800 rounded space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-mono font-black text-amber-400 uppercase tracking-widest flex items-center gap-1">
                          <Percent size={12} /> Admin Selected Increment Rate (%)
                        </label>
                        <span className="text-[10px] font-mono font-bold text-neutral-400">
                          Base: GHC {ethicsPreviousSalary.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {[0, 5, 10, 15, 20].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => {
                              setEthicsIncrementPercentage(pct);
                              playFeedbackSound('click');
                            }}
                            className={`flex-1 py-1 text-xs font-mono font-black rounded border transition-colors cursor-pointer ${
                              ethicsIncrementPercentage === pct
                                ? 'bg-amber-500 text-black border-amber-400'
                                : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                            }`}
                          >
                            {pct > 0 ? `+${pct}%` : `${pct}%`}
                          </button>
                        ))}
                        <div className="w-20">
                          <input
                            type="number"
                            value={ethicsIncrementPercentage}
                            onChange={(e) => setEthicsIncrementPercentage(parseFloat(e.target.value) || 0)}
                            className="w-full bg-neutral-900 border border-neutral-800 text-right p-1 text-xs font-mono font-bold text-amber-400 rounded focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>

                      {/* Live Shift Breakdown */}
                      {(() => {
                        const incrementVal = ethicsPreviousSalary * (ethicsIncrementPercentage / 100);
                        const proposedNewVal = Math.max(0, Math.round((ethicsPreviousSalary + incrementVal) * 100) / 100);
                        return (
                          <div className="p-2.5 bg-neutral-900/80 border border-neutral-800 rounded flex flex-col sm:flex-row items-center justify-between gap-2">
                            <div className="text-[10px] font-mono text-neutral-300 space-y-0.5">
                              <div>
                                Shift: <span className={ethicsIncrementPercentage >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                  {ethicsIncrementPercentage >= 0 ? `+GHC ${incrementVal.toFixed(2)}` : `-GHC ${Math.abs(incrementVal).toFixed(2)}`}
                                </span>
                              </div>
                              <div>
                                New Proposed Base: <strong className="text-amber-400 text-xs font-bold">GHC {proposedNewVal.toFixed(2)}</strong>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setAppSalary(proposedNewVal.toFixed(2));
                                playFeedbackSound('confirm');
                                showToast(`Applied ${ethicsIncrementPercentage >= 0 ? '+' : ''}${ethicsIncrementPercentage}% (${proposedNewVal.toFixed(2)} GHC) to contract stipend!`);
                              }}
                              className="py-1.5 px-2.5 bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-mono font-black uppercase tracking-wider rounded transition-colors cursor-pointer shrink-0"
                            >
                              Apply % to Stipend
                            </button>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Evaluator Justification Notes */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono font-black text-neutral-400 uppercase block">
                        Ethics Evaluation & Justification Remarks
                      </label>
                      <textarea
                        rows={2}
                        value={ethicsEvaluationNotes}
                        onChange={(e) => setEthicsEvaluationNotes(e.target.value)}
                        placeholder="Detailed observations regarding teacher punctuality, lesson plans, student care, and ethics justification..."
                        className="w-full bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-200 p-2 rounded focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* Include Annexure Toggle */}
                    <label className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={includeEthicsAnnexure}
                        onChange={(e) => setIncludeEthicsAnnexure(e.target.checked)}
                        className="accent-amber-500 w-4 h-4 cursor-pointer"
                      />
                      <span>Attach Ethics Annexure to Re-Appointment Notice</span>
                    </label>
                  </div>
                </div>

                {/* Print & Preview Renewal Notice (Right) */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-black text-neutral-400 uppercase tracking-wider block">Extension Letter Blueprint</span>
                    <button
                      type="button"
                      onClick={() => handlePrintAppointmentLetter(true)}
                      className="py-1.5 px-3 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-amber-500 text-amber-400 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 rounded-sm cursor-pointer"
                    >
                      <Printer size={12} />
                      Print Contract Extension Notice
                    </button>
                  </div>

                  {/* Letter Blueprint Visual Board */}
                  <div className="border border-neutral-800 bg-[#fbfbf9] p-6 text-neutral-900 rounded-sm shadow-inner min-h-[460px] overflow-y-auto max-h-[480px] font-serif text-xs leading-relaxed select-none relative">
                    {/* Faint Watermark inside the React visual preview */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none z-0 rotate-[-12deg]">
                      <SchoolLogo size={280} lightBackground={true} />
                    </div>

                    <div className="relative z-10">
                      <div className="flex items-center justify-between border-b-2 border-emerald-800/20 pb-3 mb-4">
                        <div className="w-[60px] h-[60px] shrink-0">
                          <SchoolLogo size={60} lightBackground={true} />
                        </div>
                        <div className="text-right flex-grow pl-3">
                          <h4 className="text-[13px] font-extrabold uppercase font-sans tracking-wide m-0 text-emerald-950">{systemSettings?.schoolName || 'SAWLA COMPREHENSIVE ACADEMY'}</h4>
                          <p className="text-[9px] italic text-amber-600 font-bold m-0">{systemSettings?.schoolSlogan || systemSettings?.customMotto || 'Holiness is our key'}</p>
                          <p className="text-[8px] font-sans text-neutral-500 m-0">{systemSettings?.schoolBoxAddress || 'P. O. Box LS 15, Sawla Savannah Region • Sawla, Jelinkon street, Savannah Region, Ghana'}</p>
                        </div>
                      </div>

                      <div className="text-right font-sans font-bold text-[9px] mb-4 text-neutral-600">
                        Date: {new Date(appLetterDate || new Date()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>

                      <div className="mb-4 text-[10px] text-neutral-700 leading-normal">
                        To:<br/>
                        <strong className="text-[11px] text-emerald-950 font-sans block mb-1">{appointmentModalUser.name}</strong>
                        {appPersonalAddress ? (
                          <div className="whitespace-pre-line text-neutral-600 font-mono text-[9px] leading-relaxed bg-neutral-100/40 p-2 border border-neutral-200/60 rounded max-w-sm">
                            {appPersonalAddress}
                          </div>
                        ) : (
                          <>
                            <span className="font-mono text-[9px] bg-neutral-100 px-1 py-0.5 rounded">{appDepartment || 'Academic Registry'}</span><br/>
                            <span className="text-neutral-400 italic text-[9px]">Personal Address Not Set</span>
                          </>
                        )}
                      </div>

                      <div className="text-center font-bold underline my-3 text-[10px] uppercase text-emerald-900 tracking-wide font-sans">
                        RE: RENEWAL & EXTENSION OF APPOINTMENT CONTRACT
                      </div>

                      <div className="text-justify space-y-2 text-[10px] text-neutral-800">
                        <p>Dear {appointmentModalUser.name.split(' ')[0] || 'Sir/Madam'},</p>
                        <p>Following a review of your academic and administrative service registers, we are pleased to inform you that your employment contract with <strong className="text-emerald-950">{systemSettings?.schoolName || 'SAWLA COMPREHENSIVE ACADEMY'}</strong> has been formally renewed.</p>
                        <p>Your contract has been extended for a renewal period of <strong className="text-amber-700">{appRenewalPeriod}</strong>, and is now scheduled to conclude on <strong>{new Date(appEndDate || new Date()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.</p>
                        <p>In appreciation of your service, your adjusted basic monthly stipend is set to <strong className="text-emerald-800">GHC {parseFloat(appSalary || '0').toFixed(2)}</strong>. All other terms and conditions specified in your original letter of appointment remain in full force.</p>
                        <p>Please indicate your acceptance by signing and returning this duplicate letter.</p>
                      </div>

                      <div className="mt-8 flex justify-between items-end text-[9px] pt-4 border-t border-dashed border-neutral-200">
                        <div>
                          For School Management:<br/>
                          {appManagementSignature ? (
                            <div className="h-10 flex items-center justify-start my-1 bg-amber-50/10 rounded border border-neutral-100 p-0.5">
                              <img src={appManagementSignature} alt="Authorized Signatory" className="max-h-10 object-contain max-w-[120px]" />
                            </div>
                          ) : (
                            <div className="h-5" />
                          )}
                          <strong>{appSignatoryName}</strong><br/>
                          <span className="text-neutral-500">{appSignatoryTitle}</span>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <span className="block">Employee Acceptance:</span>
                          {appStaffSignature ? (
                            <div className="h-10 flex items-center justify-end my-1 bg-amber-50/10 rounded border border-neutral-100 p-0.5">
                              <img src={appStaffSignature} alt="Employee Acceptance" className="max-h-10 object-contain max-w-[120px]" />
                            </div>
                          ) : (
                            <div className="h-5" />
                          )}
                          <strong>{appointmentModalUser.name}</strong><br/>
                          <span className="text-neutral-500">Signature & Date</span>
                        </div>
                      </div>

                      {includeEthicsAnnexure && (
                        <div className="mt-8 pt-6 border-t-2 border-emerald-900/30 font-sans">
                          <div className="text-center font-serif text-[11px] font-bold text-emerald-950 uppercase tracking-wider mb-1">
                            ANNEXURE: TEACHER PROFESSIONAL ETHICS & SALARY PROMOTION EVALUATION
                          </div>
                          <p className="text-center text-[8px] text-neutral-500 italic mb-3">
                            Behavioral & Professional Audit for Preceding Academic Period ({ethicsAcademicYear})
                          </p>

                          <div className="grid grid-cols-2 gap-3 text-[9px] mb-3">
                            <div className="border border-emerald-200 bg-emerald-50/30 p-2 rounded">
                              <span className="font-bold text-emerald-900 block border-b border-emerald-200 pb-1 mb-1">
                                Positive Ethics & Behaviors ({selectedPositiveEthics.length})
                              </span>
                              {selectedPositiveEthics.length > 0 ? (
                                <ul className="space-y-1 text-emerald-950">
                                  {selectedPositiveEthics.map((item) => (
                                    <li key={item} className="flex items-start gap-1">
                                      <span className="text-emerald-600 font-bold">✓</span>
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-neutral-400 italic">No specific positive items recorded.</span>
                              )}
                            </div>

                            <div className="border border-rose-200 bg-rose-50/30 p-2 rounded">
                              <span className="font-bold text-rose-900 block border-b border-rose-200 pb-1 mb-1">
                                Infractions & Areas of Improvement ({selectedNegativeEthics.length})
                              </span>
                              {selectedNegativeEthics.length > 0 ? (
                                <ul className="space-y-1 text-rose-950">
                                  {selectedNegativeEthics.map((item) => (
                                    <li key={item} className="flex items-start gap-1">
                                      <span className="text-rose-600 font-bold">⚠</span>
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="text-emerald-700 font-bold flex items-center gap-1 mt-1">
                                  <span>✓ Clean Conduct Record (Zero Demerits Noted)</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="bg-neutral-100/80 border border-neutral-300/80 p-2.5 rounded text-[9px] space-y-1.5 text-neutral-800 font-sans">
                            <div className="flex justify-between items-center">
                              <span><strong>Conduct Rating Score:</strong></span>
                              <span className="font-bold text-emerald-900">
                                {getEthicsScoreDetails(selectedPositiveEthics, selectedNegativeEthics).score}% 
                                ({getEthicsScoreDetails(selectedPositiveEthics, selectedNegativeEthics).rating})
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span><strong>Salary Increment Qualification Status:</strong></span>
                              <span className={`font-bold uppercase ${ethicsQualificationStatus.includes('Qualified') ? 'text-emerald-800' : 'text-rose-800'}`}>
                                {ethicsQualificationStatus}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span><strong>Administrator Approved Increment (%):</strong></span>
                              <span className="font-bold text-emerald-950">
                                {ethicsIncrementPercentage >= 0 ? `+${ethicsIncrementPercentage}%` : `${ethicsIncrementPercentage}%`}
                              </span>
                            </div>
                            <div className="border-t border-dashed border-neutral-300 pt-1 flex justify-between items-center font-bold">
                              <span>Remuneration Adjustment Breakdown:</span>
                              <span>
                                Previous: GHC {ethicsPreviousSalary.toFixed(2)} &nbsp;➔&nbsp; 
                                <span className={ethicsIncrementPercentage >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                                  {ethicsIncrementPercentage >= 0 ? '+' : ''}{ethicsIncrementPercentage}%
                                </span> &nbsp;➔&nbsp; 
                                <strong className="text-emerald-950 text-[10px]">New Stipend: GHC {parseFloat(appSalary || '0').toFixed(2)}</strong>
                              </span>
                            </div>
                            {ethicsEvaluationNotes && (
                              <p className="text-[8px] italic text-neutral-600 border-t border-neutral-200/80 pt-1">
                                <strong>Evaluator Remarks:</strong> {ethicsEvaluationNotes}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Pupil Records Audit & Merge Modal */}
      {showDuplicateAuditModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-neutral-950 border-4 border-amber-500 max-w-4xl w-full p-6 space-y-5 shadow-2xl rounded-lg max-h-[90vh] flex flex-col justify-between">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b-2 border-neutral-850">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-amber-500 text-black font-mono text-[9px] font-black uppercase tracking-widest rounded-sm">
                    AUDIT DUPLICATES
                  </span>
                  <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-wider">
                    {duplicateStudentGroups.length} Duplicate Group(s) Identified
                  </span>
                </div>
                <h3 className="text-base font-black text-white font-mono uppercase tracking-tight flex items-center gap-2">
                  <CopyCheck size={18} className="text-amber-400" />
                  Audit & Resolve Duplicate Pupil Records
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDuplicateAuditModal(false)}
                className="p-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer rounded-sm"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Banner / Description */}
            <div className="bg-neutral-900 border-2 border-neutral-800 p-4 space-y-3 font-mono text-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <p className="text-neutral-300 leading-relaxed">
                  The system detected pupil profiles with matching <strong>Name and Class</strong>.
                  You can review each candidate pair below to combine payment/attendance histories or remove redundant records.
                </p>
                <button
                  type="button"
                  onClick={handleMergeAllDuplicatesAuto}
                  className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-black border border-amber-400 font-mono text-[10px] font-black uppercase tracking-wider flex items-center gap-2 shrink-0 cursor-pointer shadow-lg transition-all font-bold"
                >
                  <Sparkles size={13} />
                  <span>Merge All Automatically ({duplicateStudentGroups.length} Groups)</span>
                </button>
              </div>
            </div>

            {/* List of Duplicate Groups */}
            <div className="overflow-y-auto space-y-4 pr-1 flex-1 font-mono">
              {duplicateStudentGroups.map((group, groupIdx) => {
                return (
                  <div key={group.key} className="bg-neutral-900 border-2 border-rose-900/60 p-4 space-y-3 rounded">
                    <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white uppercase tracking-wider">
                          Group #{groupIdx + 1}: <span className="text-amber-400">{group.name}</span>
                        </span>
                        <span className="px-2 py-0.5 bg-purple-950 border border-purple-800 text-purple-300 text-[10px] font-bold rounded-sm uppercase">
                          Class: {group.className}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                        {group.candidates.length} Candidate Profiles
                      </span>
                    </div>

                    {/* Candidate Comparison Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {group.candidates.map((cand, candIdx) => {
                        const candPaymentsCount = payments.filter(p => p.studentId === cand.id).length;
                        const candExamsCount = examsPayments.filter(ep => ep.studentId === cand.id).length;
                        const isPrimaryCandidate = candIdx === 0;

                        return (
                          <div 
                            key={cand.id}
                            className={`p-3.5 border-2 space-y-2.5 relative ${
                              isPrimaryCandidate 
                                ? 'bg-neutral-950 border-amber-500/80' 
                                : 'bg-neutral-950/80 border-neutral-800'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="space-y-0.5">
                                <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500 block">
                                  {isPrimaryCandidate ? '⭐ Candidate A (Primary / Older)' : `Candidate ${String.fromCharCode(65 + candIdx)} (Secondary)`}
                                </span>
                                <h5 className="font-extrabold text-white text-xs">{cand.name}</h5>
                                <span className="text-[10px] text-neutral-400 block font-mono">ID: {cand.id}</span>
                              </div>
                              <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border ${
                                cand.active !== false 
                                  ? 'bg-emerald-950 text-emerald-400 border-emerald-800' 
                                  : 'bg-rose-950 text-rose-300 border-rose-800'
                              }`}>
                                {cand.active !== false ? 'Active' : 'Deactivated'}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[10px] bg-neutral-900 p-2 border border-neutral-850">
                              <div>
                                <span className="text-neutral-500 block font-bold">Roll Number:</span>
                                <span className="text-white font-black">{cand.rollNumber || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-neutral-500 block font-bold">Daily Payments:</span>
                                <span className="text-emerald-400 font-black">{candPaymentsCount} records</span>
                              </div>
                              <div>
                                <span className="text-neutral-500 block font-bold">Exam Payments:</span>
                                <span className="text-purple-300 font-black">{candExamsCount} records</span>
                              </div>
                              <div>
                                <span className="text-neutral-500 block font-bold">Guardian Contact:</span>
                                <span className="text-amber-300 font-bold">{cand.guardianPhone || cand.parentPhone || 'N/A'}</span>
                              </div>
                            </div>

                            {/* Candidate Specific Action Buttons */}
                            <div className="pt-2 flex flex-wrap gap-2 border-t border-neutral-850">
                              {!isPrimaryCandidate ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const res = mergeStudents(group.candidates[0].id, cand.id);
                                      if (res.success) {
                                        showToast(res.message);
                                      }
                                    }}
                                    className="px-2.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-black text-[9.5px] font-black uppercase tracking-wider border border-amber-400 cursor-pointer transition-all flex items-center gap-1 font-bold"
                                  >
                                    <Sparkles size={11} />
                                    <span>Merge into Candidate A</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to permanently delete duplicate student profile "${cand.name}" (${cand.id})?`)) {
                                        deleteStudent(cand.id);
                                        showToast(`Deleted duplicate pupil profile "${cand.name}".`);
                                      }
                                    }}
                                    className="px-2.5 py-1.5 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[9.5px] font-black uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1 font-bold"
                                  >
                                    <Trash2 size={11} />
                                    <span>Delete Candidate</span>
                                  </button>
                                </>
                              ) : (
                                <span className="text-[10px] text-amber-400/90 font-bold italic flex items-center gap-1 py-1">
                                  <Info size={11} /> Primary target record for merged transactions
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-neutral-850 flex justify-end font-mono">
              <button
                type="button"
                onClick={() => setShowDuplicateAuditModal(false)}
                className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-black uppercase tracking-wider border border-neutral-800 cursor-pointer font-bold"
              >
                Close Audit Dialog
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pickup Security Passes Modal */}
      <PickupPassesModal
        isOpen={showPickupPassesModal}
        onClose={() => setShowPickupPassesModal(false)}
        students={students}
        systemSettings={systemSettings}
      />

      {/* Official Pupil Admission & Enrollment Form Modal */}
      <AdmissionFormModal
        isOpen={showAdmissionFormModal}
        onClose={() => {
          setShowAdmissionFormModal(false);
          setAdmissionFormStudent(null);
        }}
        initialStudent={admissionFormStudent}
      />

      {/* Edit Student Modal Popup */}
      <EditStudentModal
        student={studentToEditModal}
        isOpen={!!studentToEditModal}
        onClose={() => setStudentToEditModal(null)}
      />

      {/* Edit Staff Modal Popup */}
      <EditStaffModal
        staff={staffToEditModal}
        isOpen={!!staffToEditModal}
        onClose={() => setStaffToEditModal(null)}
      />

      {/* Absent Pupils Floating & Modal Welfare Enquiry Desk */}
      <AbsentPupilsFloatingInquiryModal
        isOpen={showAbsenteeEnquiryModal}
        onClose={() => setShowAbsenteeEnquiryModal(false)}
      />
    </div>
  );
});
