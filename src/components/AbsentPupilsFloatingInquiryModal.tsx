/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Student, PaymentRecord, StudentClass, SchoolCategory } from '../types';
import { getClassCategory } from '../initialData';
import { SchoolLogo } from './SchoolLogo';
import {
  BellRing,
  HeartHandshake,
  MessageSquare,
  Phone,
  Send,
  Check,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Search,
  Filter,
  UserCheck,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Printer,
  Copy,
  ExternalLink,
  HelpCircle,
  Activity,
  ShieldAlert,
  UserX,
  Stethoscope,
  Car,
  CloudRain,
  Coins,
  Smile,
  MessageCircle,
  FileEdit,
  Save,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface AbsentPupilsFloatingInquiryModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  overrideDate?: string;
}

const COMMON_ABSENCE_REASONS = [
  { id: 'sick', label: 'Sickness / Hospital Visit', icon: Stethoscope, color: 'text-rose-400 bg-rose-950/40 border-rose-800' },
  { id: 'travel', label: 'Family Travel / Out of Town', icon: Car, color: 'text-amber-400 bg-amber-950/40 border-amber-800' },
  { id: 'weather', label: 'Heavy Rain / Transport Delay', icon: CloudRain, color: 'text-sky-400 bg-sky-950/40 border-sky-800' },
  { id: 'fees', label: 'Financial / Family Matters', icon: Coins, color: 'text-purple-400 bg-purple-950/40 border-purple-800' },
  { id: 'bereavement', label: 'Family Emergency / Bereavement', icon: AlertCircle, color: 'text-orange-400 bg-orange-950/40 border-orange-800' },
  { id: 'late', label: 'Expected Late Arrival Today', icon: Clock, color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800' },
  { id: 'unreachable', label: 'Unreachable / No Response', icon: UserX, color: 'text-neutral-400 bg-neutral-900 border-neutral-750' },
  { id: 'other', label: 'Other Custom Reason', icon: FileEdit, color: 'text-neutral-300 bg-neutral-900 border-neutral-700' }
];

export const AbsentPupilsFloatingInquiryModal: React.FC<AbsentPupilsFloatingInquiryModalProps> = ({
  isOpen: externalIsOpen,
  onClose: externalOnClose,
  overrideDate
}) => {
  const {
    students,
    payments,
    currentDate,
    currentTerm,
    currentUser,
    systemSettings,
    sendautomatedWhatsApp,
    adjustPayment,
    recordPayment,
    playFeedbackSound
  } = useApp();

  const activeDate = overrideDate || currentDate;
  const currency = systemSettings?.currencySymbol || 'GH₵';
  const schoolName = systemSettings?.schoolName || 'SAAKO HOLY CHILD ACADEMY';

  // Internal visibility state for the floating widget
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isDismissedForSession, setIsDismissedForSession] = useState<boolean>(false);

  // Sync with external modal control if provided
  useEffect(() => {
    if (externalIsOpen !== undefined) {
      setIsExpanded(externalIsOpen);
    }
  }, [externalIsOpen]);

  // Filtering and search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | SchoolCategory>('All');
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [contactStatusFilter, setContactStatusFilter] = useState<'all' | 'contacted' | 'pending' | 'consecutive'>('all');

  // Tracking per-student enquiry actions
  const [contactedStudents, setContactedStudents] = useState<Record<string, { timestamp: string; method: 'whatsapp' | 'call' | 'sms'; reason?: string }>>({});
  const [editingReasonStudentId, setEditingReasonStudentId] = useState<string | null>(null);
  const [tempReasonText, setTempReasonText] = useState<string>('');
  const [copiedStudentId, setCopiedStudentId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Find all absent pupils for the active date
  const absentPupilsData = useMemo(() => {
    const activeStudents = (students || []).filter((s) => s.active !== false);
    
    // Find all payment records for activeDate marked with isAbsent === true
    const absentRecords = (payments || []).filter(
      (p) => p.date === activeDate && p.isAbsent === true
    );

    // Map each absent record to its student details and historical context
    const list = absentRecords.map((record) => {
      const student = activeStudents.find((s) => s.id === record.studentId) || {
        id: record.studentId,
        name: record.studentName,
        class: record.class,
        category: record.category,
        rollNumber: 'N/A',
        active: true
      } as Student;

      // Find past absences in the active term
      const termAbsenceRecords = (payments || []).filter(
        (p) =>
          p.studentId === student.id &&
          p.isAbsent === true &&
          (!currentTerm || p.termId === currentTerm.id || p.date.startsWith(activeDate.slice(0, 7)))
      );

      // Sort dates descending
      const sortedAbsenceDates = termAbsenceRecords
        .map((p) => p.date)
        .filter((d, idx, arr) => arr.indexOf(d) === idx)
        .sort((a, b) => b.localeCompare(a));

      const totalTermAbsences = sortedAbsenceDates.length;

      // Check consecutive absence (if missed yesterday or previous school day)
      const yesterday = new Date(activeDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      const wasAbsentYesterday = sortedAbsenceDates.includes(yesterdayStr);

      const consecutiveDaysCount = wasAbsentYesterday ? 2 : 1;

      // Check if a note already exists in the record
      const existingNote = record.notes || '';

      return {
        recordId: record.id,
        student,
        record,
        existingNote,
        totalTermAbsences,
        wasAbsentYesterday,
        consecutiveDaysCount,
        sortedAbsenceDates
      };
    });

    return list;
  }, [students, payments, activeDate, currentTerm]);

  // Overall attendance statistics for today
  const attendanceStats = useMemo(() => {
    const activeStudents = (students || []).filter((s) => s.active !== false);
    const totalEnrolled = activeStudents.length;
    const totalAbsent = absentPupilsData.length;
    
    const todayPresentPayments = (payments || []).filter(
      (p) => p.date === activeDate && !p.isAbsent && p.verified !== false
    );
    const totalPresent = todayPresentPayments.length;
    const pendingUnmarked = Math.max(0, totalEnrolled - totalPresent - totalAbsent);
    const attendanceRate = totalEnrolled > 0 ? Math.round(((totalEnrolled - totalAbsent) / totalEnrolled) * 1000) / 10 : 100;

    const consecutiveAbsentees = absentPupilsData.filter((item) => item.wasAbsentYesterday || item.consecutiveDaysCount > 1);
    const contactedCount = absentPupilsData.filter((item) => !!contactedStudents[item.student.id] || !!item.existingNote).length;

    return {
      totalEnrolled,
      totalAbsent,
      totalPresent,
      pendingUnmarked,
      attendanceRate,
      consecutiveCount: consecutiveAbsentees.length,
      contactedCount,
      pendingInquiryCount: Math.max(0, totalAbsent - contactedCount)
    };
  }, [students, payments, activeDate, absentPupilsData, contactedStudents]);

  // Filtered list based on user search & class filter
  const filteredAbsentees = useMemo(() => {
    return absentPupilsData.filter((item) => {
      const s = item.student;
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.rollNumber && s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.guardianPhone && s.guardianPhone.includes(searchQuery)) ||
        s.class.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === 'All' || getClassCategory(s.class) === categoryFilter;
      const matchesClass = selectedClass === 'All' || s.class === selectedClass;

      let matchesContact = true;
      const isContacted = !!contactedStudents[s.id] || !!item.existingNote;
      if (contactStatusFilter === 'contacted') matchesContact = isContacted;
      if (contactStatusFilter === 'pending') matchesContact = !isContacted;
      if (contactStatusFilter === 'consecutive') matchesContact = item.wasAbsentYesterday;

      return matchesSearch && matchesCategory && matchesClass && matchesContact;
    });
  }, [absentPupilsData, searchQuery, categoryFilter, selectedClass, contactStatusFilter, contactedStudents]);

  // Generate warm, friendly, informative enquiry message
  const generateEnquiryMessage = (student: Student, item: any) => {
    const parentSalutation = 'Dear Parent/Guardian';
    const pupilName = student.name;
    const pupilClass = student.class;
    const dateFormatted = new Date(activeDate).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    let consecutiveNote = '';
    if (item.wasAbsentYesterday) {
      consecutiveNote = ` We noted that ${pupilName} was also not in class yesterday.`;
    }

    return `Good day ${parentSalutation},

Warm greetings from ${schoolName}! 🌟

We noticed that your ward, *${pupilName}* (${pupilClass}), is absent from school today, ${dateFormatted}.${consecutiveNote}

We value every pupil's presence and welfare, and we want to ensure that all is well with ${pupilName} and the family. 

Kindly let us know if:
1. ${pupilName} is feeling unwell, or
2. There is any emergency/travel, or
3. There is any assistance the school administration can offer.

We wish ${pupilName} the best of health and look forward to welcoming them back in class soon!

Warm regards,
*Administration & Welfare Desk*
${schoolName}
${systemSettings?.adminWhatsAppPhone ? `Contact: ${systemSettings.adminWhatsAppPhone}` : ''}`.trim();
  };

  // 1-Click WhatsApp Sender
  const handleSendWhatsApp = async (student: Student, item: any) => {
    const rawPhone = student.guardianPhone?.trim();
    if (!rawPhone) {
      alert(`No guardian phone number is enrolled for ${student.name}. Please edit the pupil's profile to add a phone number.`);
      return;
    }

    playFeedbackSound?.('click');
    const message = generateEnquiryMessage(student, item);

    try {
      if (sendautomatedWhatsApp) {
        await sendautomatedWhatsApp(rawPhone, message, student.id, student.name, 'absence_inquiry', true);
      } else {
        let phoneDigits = rawPhone.replace(/\D/g, '');
        if (phoneDigits.startsWith('0') && phoneDigits.length === 10) {
          phoneDigits = '233' + phoneDigits.substring(1);
        }
        const waUrl = `https://api.whatsapp.com/send?phone=${phoneDigits}&text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
      }

      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setContactedStudents((prev) => ({
        ...prev,
        [student.id]: { timestamp: nowTime, method: 'whatsapp' }
      }));

      playFeedbackSound?.('success');
      showToast(`Friendly WhatsApp absence enquiry sent to ${student.name}'s guardian!`);
    } catch (err) {
      console.error('Error sending WhatsApp enquiry:', err);
      showToast(`Launched WhatsApp chat for ${student.name}.`);
    }
  };

  // Copy message to clipboard
  const handleCopyMessage = (student: Student, item: any) => {
    playFeedbackSound?.('click');
    const msg = generateEnquiryMessage(student, item);
    navigator.clipboard.writeText(msg);
    setCopiedStudentId(student.id);
    showToast(`Care message for ${student.name} copied to clipboard!`);
    setTimeout(() => setCopiedStudentId(null), 3000);
  };

  // Log or update the reason for absence
  const handleSaveAbsenceReason = (item: any, reason: string) => {
    playFeedbackSound?.('click');
    const formattedNote = reason.trim();
    
    try {
      adjustPayment(
        item.recordId,
        0,
        true,
        formattedNote,
        `Logged absence enquiry reason: ${formattedNote}`
      );

      setContactedStudents((prev) => ({
        ...prev,
        [item.student.id]: {
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          method: prev[item.student.id]?.method || 'call',
          reason: formattedNote
        }
      }));

      setEditingReasonStudentId(null);
      setTempReasonText('');
      playFeedbackSound?.('success');
      showToast(`Absence reason saved for ${item.student.name}: "${formattedNote}"`);
    } catch (err) {
      console.error('Error saving absence note:', err);
      showToast(`Failed to update reason note.`);
    }
  };

  // Mark Present if pupil arrived late
  const handleMarkPresentLate = (student: Student, item: any) => {
    if (!confirm(`Mark ${student.name} as Present (Arrived Late)?\nThis will remove the absent status for today (${activeDate}).`)) {
      return;
    }

    playFeedbackSound?.('click');
    try {
      // Standard daily fee or 0
      const defaultFee = systemSettings?.baselineDailyFee ?? 5.00;
      recordPayment(student.id, defaultFee, true);
      playFeedbackSound?.('success');
      showToast(`Marked ${student.name} as Present!`);
    } catch (err) {
      console.error('Error marking pupil present:', err);
    }
  };

  // Print Absence Welfare Sheet
  const handlePrintAbsenceSheet = () => {
    playFeedbackSound?.('click');
    window.print();
  };

  // Handle closing modal
  const handleClose = () => {
    setIsExpanded(false);
    if (externalOnClose) externalOnClose();
  };

  // If no absent pupils exist, and not explicitly opened by user, we can show a minimal celebratory badge
  const noAbsentees = absentPupilsData.length === 0;

  return (
    <>
      {/* ========================================================= */}
      {/* FLOATING ACTION PILL (BOTTOM-RIGHT DOCKED IN ADMIN PANEL) */}
      {/* ========================================================= */}
      {!isExpanded && !isDismissedForSession && (
        <div className="fixed bottom-6 right-6 z-40 print:hidden animate-fade-in">
          <div
            onClick={() => {
              playFeedbackSound?.('click');
              setIsExpanded(true);
            }}
            className={`cursor-pointer group flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl shadow-2xl border-2 transition-all duration-300 hover:scale-105 ${
              noAbsentees
                ? 'bg-neutral-900/95 border-emerald-500/40 text-neutral-200 shadow-emerald-950/40'
                : 'bg-neutral-950/95 border-amber-500/80 text-white shadow-amber-950/50 hover:border-amber-400'
            } backdrop-blur-md`}
          >
            {/* Animated Icon */}
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold relative shrink-0 ${
                noAbsentees
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-amber-400 text-black shadow-lg animate-pulse'
              }`}
            >
              {noAbsentees ? (
                <CheckCircle2 size={20} />
              ) : (
                <>
                  <BellRing size={20} className="animate-bounce" />
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white font-mono font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-neutral-950">
                    {absentPupilsData.length}
                  </span>
                </>
              )}
            </div>

            {/* Label & Details */}
            <div className="pr-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded">
                  Pupil Care
                </span>
                <span className="text-[10px] font-mono text-neutral-400">
                  {activeDate}
                </span>
              </div>
              <div className="text-xs font-bold text-white font-sans mt-0.5 flex items-center gap-1.5">
                {noAbsentees ? (
                  <span className="text-emerald-400">100% Attendance Today!</span>
                ) : (
                  <span>
                    <strong className="text-amber-400 font-mono text-sm">{absentPupilsData.length}</strong> Absentee{absentPupilsData.length > 1 ? 's' : ''} • Welfare Check
                  </span>
                )}
              </div>
              <p className="text-[10px] text-neutral-400 font-mono">
                {noAbsentees ? 'All enrolled pupils in school' : 'Click to enquire on absent pupils'}
              </p>
            </div>

            {/* Quick Dismiss Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsDismissedForSession(true);
              }}
              title="Hide floating widget for this session"
              className="text-neutral-500 hover:text-neutral-300 p-1 rounded-full hover:bg-neutral-800 transition-colors ml-1"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EXPANDED POPUP MODAL & CARE ENQUIRY DIALOGUE              */}
      {/* ========================================================= */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 md:p-6 overflow-y-auto print:p-0 print:bg-white print:static">
          <div className="bg-neutral-950 border-4 border-amber-500 max-w-5xl w-full p-4 sm:p-6 md:p-8 space-y-6 shadow-[12px_12px_0px_0px_rgba(245,158,11,0.25)] relative my-2 sm:my-4 print:border-none print:shadow-none print:p-0 print:w-full print:max-w-none print:bg-white text-white print:text-black font-sans">
            
            {/* Screen Only: Top Header & Close Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-neutral-850 pb-4 print:hidden">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-400/10 border-2 border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                  <HeartHandshake className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-black uppercase bg-amber-400 text-black px-2 py-0.5 rounded-xs">
                      Pupil Attendance Welfare
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400">
                      Date: <strong className="text-white">{activeDate}</strong>
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white font-mono mt-0.5 flex items-center gap-2">
                    <span>Absentee Care & Guardian Enquiry Desk</span>
                    <span className="text-xs bg-rose-500/20 border border-rose-500/40 text-rose-300 font-mono font-bold px-2 py-0.5 rounded-full">
                      {absentPupilsData.length} Marked Absent
                    </span>
                  </h2>
                  <p className="text-xs text-neutral-400 font-sans">
                    Reach out with warm, friendly enquiries to find out why pupils missed school, check their health, and support families.
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintAbsenceSheet}
                  className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-850 border border-neutral-700 text-neutral-200 hover:text-white text-xs font-mono font-bold uppercase rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Print daily absentee enquiry list for headteacher and class teachers"
                >
                  <Printer size={14} className="text-amber-400" />
                  <span>Print List</span>
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="p-2 text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-600 rounded transition-colors cursor-pointer"
                  title="Minimize enquiry window"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Print Only Letterhead */}
            <div className="hidden print:block border-b-2 border-black pb-4 mb-4 text-black font-sans">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <SchoolLogo size={65} />
                  <div>
                    <h1 className="text-xl font-black uppercase tracking-wider">{schoolName}</h1>
                    <p className="text-xs font-bold italic">{systemSettings?.customMotto || 'Holiness Is Our Key'}</p>
                    <p className="text-[10px] text-gray-700">{systemSettings?.customLocation || 'Sawla, Savannah Region'} • Attendance & Child Welfare Desk</p>
                  </div>
                </div>
                <div className="text-right text-xs font-mono">
                  <div className="font-bold uppercase text-[11px] bg-black text-white px-2 py-0.5 inline-block">
                    DAILY ABSENTEE & WELFARE REPORT
                  </div>
                  <p className="mt-1 font-bold">Date: {activeDate}</p>
                  <p className="text-[10px] text-gray-600">Total Enrolled: {attendanceStats.totalEnrolled} Pupils</p>
                  <p className="text-[10px] text-gray-600">Total Absent: {attendanceStats.totalAbsent} Pupils ({attendanceStats.attendanceRate}% Attendance Rate)</p>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t-2 border-black text-center">
                <h2 className="text-sm font-black uppercase tracking-wider">
                  DAILY ABSENT PUPIL ENQUIRY & FOLLOW-UP RECORD
                </h2>
              </div>
            </div>

            {/* Toast Notification Alert */}
            {toastMessage && (
              <div className="bg-emerald-950/90 border-2 border-emerald-500 p-3 rounded text-xs text-emerald-300 font-mono flex items-center gap-2.5 animate-fade-in print:hidden">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold">{toastMessage}</span>
              </div>
            )}

            {/* ========================================================= */}
            {/* STATS OVERVIEW CARDS (SCREEN ONLY)                        */}
            {/* ========================================================= */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
              {/* Stat 1: Total Absent */}
              <div className="bg-neutral-900/90 border-2 border-rose-500/40 p-3.5 rounded-lg space-y-1">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider">
                    Absent Today
                  </span>
                  <UserX size={14} className="text-rose-400" />
                </div>
                <div className="text-2xl font-black font-mono text-rose-300">
                  {attendanceStats.totalAbsent} <span className="text-xs text-neutral-400 font-sans font-normal">Pupils</span>
                </div>
                <div className="text-[10px] font-mono text-neutral-400">
                  {attendanceStats.attendanceRate}% School Attendance
                </div>
              </div>

              {/* Stat 2: Enquiries Sent */}
              <div className="bg-neutral-900/90 border-2 border-emerald-500/40 p-3.5 rounded-lg space-y-1">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider">
                    Contacted / Logged
                  </span>
                  <CheckCircle2 size={14} className="text-emerald-400" />
                </div>
                <div className="text-2xl font-black font-mono text-emerald-400">
                  {attendanceStats.contactedCount} <span className="text-xs text-neutral-400 font-sans font-normal">/ {attendanceStats.totalAbsent}</span>
                </div>
                <div className="text-[10px] font-mono text-neutral-400">
                  {attendanceStats.pendingInquiryCount} Follow-ups Remaining
                </div>
              </div>

              {/* Stat 3: Consecutive Missed Days */}
              <div className="bg-neutral-900/90 border-2 border-amber-500/40 p-3.5 rounded-lg space-y-1">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider">
                    Consecutive Missed
                  </span>
                  <AlertCircle size={14} className="text-amber-400" />
                </div>
                <div className="text-2xl font-black font-mono text-amber-300">
                  {attendanceStats.consecutiveCount} <span className="text-xs text-neutral-400 font-sans font-normal">Pupils (2+ Days)</span>
                </div>
                <div className="text-[10px] font-mono text-neutral-400">
                  High Priority Welfare Check
                </div>
              </div>

              {/* Stat 4: Total Active Present */}
              <div className="bg-neutral-900/90 border-2 border-neutral-800 p-3.5 rounded-lg space-y-1">
                <div className="flex items-center justify-between text-neutral-400">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider">
                    Present in Class
                  </span>
                  <UserCheck size={14} className="text-sky-400" />
                </div>
                <div className="text-2xl font-black font-mono text-sky-300">
                  {attendanceStats.totalPresent} <span className="text-xs text-neutral-400 font-sans font-normal">Pupils</span>
                </div>
                <div className="text-[10px] font-mono text-neutral-400">
                  Out of {attendanceStats.totalEnrolled} active roll
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* SEARCH & FILTER CONTROLS (SCREEN ONLY)                    */}
            {/* ========================================================= */}
            <div className="bg-neutral-900/80 border-2 border-neutral-800 p-3.5 rounded-lg space-y-3 print:hidden">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Search input */}
                <div className="relative w-full sm:w-72">
                  <Search size={14} className="absolute left-3 top-2.5 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Search pupil name, roll, phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 py-1.5 pl-9 pr-3 text-xs font-mono text-white focus:outline-none focus:border-amber-400 rounded"
                  />
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                  <span className="text-[10px] font-mono uppercase font-bold text-neutral-400 flex items-center gap-1 mr-1">
                    <Filter size={11} /> Filter:
                  </span>
                  {[
                    { id: 'all', label: `All (${absentPupilsData.length})` },
                    { id: 'pending', label: `Pending Inquiry (${attendanceStats.pendingInquiryCount})` },
                    { id: 'contacted', label: `Contacted (${attendanceStats.contactedCount})` },
                    { id: 'consecutive', label: `2+ Consecutive (${attendanceStats.consecutiveCount})` }
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setContactStatusFilter(f.id as any)}
                      className={`px-2.5 py-1 text-xs font-mono font-bold rounded transition-colors cursor-pointer ${
                        contactStatusFilter === f.id
                          ? 'bg-amber-400 text-black'
                          : 'bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Class category filters */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-neutral-850 text-xs font-mono">
                <span className="text-[10px] text-neutral-500 uppercase font-bold">Category:</span>
                {['All', 'Pre-school', 'Primary', 'JHS'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setCategoryFilter(cat as any);
                      setSelectedClass('All');
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                      categoryFilter === cat
                        ? 'bg-neutral-800 text-amber-300 border border-amber-500/50'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* ========================================================= */}
            {/* PUPILS ABSENTEE LIST CARDS & ACTIONS                      */}
            {/* ========================================================= */}
            {filteredAbsentees.length === 0 ? (
              <div className="p-10 border-2 border-neutral-800 rounded-lg text-center space-y-3 bg-neutral-900/40">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Smile size={28} />
                </div>
                <h3 className="text-base font-black uppercase font-mono text-white">
                  {absentPupilsData.length === 0
                    ? '100% Attendance! No Pupils Marked Absent'
                    : 'No Matching Absent Pupils Found'}
                </h3>
                <p className="text-xs text-neutral-400 max-w-md mx-auto">
                  {absentPupilsData.length === 0
                    ? 'All active enrolled pupils in the school have been checked into class today. Outstanding attendance rate!'
                    : 'Try clearing your search keyword or switching filters to see all absent pupils.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[550px] overflow-y-auto pr-1">
                {filteredAbsentees.map((item, index) => {
                  const s = item.student;
                  const rawPhone = s.guardianPhone?.trim();
                  const contactState = contactedStudents[s.id];
                  const hasExistingReason = !!item.existingNote || !!contactState?.reason;
                  const currentReasonText = contactState?.reason || item.existingNote || '';
                  const isConsecutive = item.wasAbsentYesterday || item.consecutiveDaysCount > 1;

                  return (
                    <div
                      key={item.recordId}
                      className={`p-4 rounded-lg border-2 transition-all space-y-3 bg-neutral-900/70 ${
                        isConsecutive
                          ? 'border-amber-500/60 shadow-lg shadow-amber-950/20'
                          : 'border-neutral-800 hover:border-neutral-700'
                      } print:border-black print:bg-white print:p-3 print:space-y-2`}
                    >
                      {/* Pupil Top Row: Identity, Badges, Contact info */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className="w-10 h-10 rounded-full bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center text-amber-400 font-mono font-black text-sm shrink-0 overflow-hidden print:border-black print:text-black">
                            {s.photoUrl ? (
                              <img
                                src={s.photoUrl}
                                alt={s.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              s.name.slice(0, 2).toUpperCase()
                            )}
                          </div>

                          {/* Name & Class */}
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black text-white print:text-black font-sans">
                                {s.name}
                              </h4>
                              <span className="px-2 py-0.5 bg-amber-400/20 border border-amber-400/40 text-amber-300 print:bg-gray-100 print:text-black print:border-black text-[10px] font-mono font-black rounded">
                                {s.class}
                              </span>
                              <span className="text-[10px] font-mono text-neutral-400 print:text-gray-600">
                                #{s.rollNumber || 'Pupil'}
                              </span>
                            </div>

                            {/* Absence context badge */}
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              {isConsecutive ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-950/60 border border-rose-500/60 text-rose-300 print:bg-red-50 print:text-red-900 text-[10px] font-mono font-bold rounded">
                                  <AlertCircle size={11} className="text-rose-400" />
                                  2nd Consecutive Day Absent (Missed Yesterday)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-neutral-850 border border-neutral-750 text-neutral-300 print:bg-gray-100 print:text-gray-800 text-[10px] font-mono rounded">
                                  <Calendar size={11} className="text-amber-400" />
                                  1st Day Absent This Week
                                </span>
                              )}

                              <span className="text-[10px] font-mono text-neutral-400 print:text-gray-600">
                                Total Term Absences: <strong className="text-neutral-200 print:text-black">{item.totalTermAbsences} days</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Guardian Contact Info */}
                        <div className="text-left sm:text-right">
                          <div className="text-[10px] uppercase font-mono font-bold text-neutral-400 print:text-gray-700">
                            Registered Guardian Contact:
                          </div>
                          <div className="flex items-center sm:justify-end gap-2 mt-0.5">
                            {rawPhone ? (
                              <>
                                <a
                                  href={`tel:${rawPhone}`}
                                  className="text-xs font-mono font-bold text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1 print:text-black"
                                  title="Click to phone guardian directly"
                                >
                                  <Phone size={11} />
                                  <span>{rawPhone}</span>
                                </a>
                              </>
                            ) : (
                              <span className="text-xs font-mono text-rose-400 italic">
                                No phone recorded
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Middle: Absence Reason Note & Status */}
                      <div className="bg-neutral-950/80 print:bg-gray-50 p-2.5 rounded border border-neutral-800 print:border-gray-300 text-xs font-mono">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <Stethoscope size={14} className="text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[10px] uppercase font-bold text-neutral-400 print:text-gray-700 block">
                                Enquiry Status / Reason for Absence:
                              </span>
                              {currentReasonText ? (
                                <p className="text-xs text-amber-300 print:text-black font-sans font-medium mt-0.5">
                                  "{currentReasonText}"
                                </p>
                              ) : (
                                <p className="text-xs text-neutral-500 italic print:text-gray-600 mt-0.5">
                                  No reason recorded yet. Please click "Log Reason" below after contacting the guardian.
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Contacted Timestamp Badge */}
                          {contactState && (
                            <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-500/50 text-emerald-400 text-[10px] font-bold rounded flex items-center gap-1 shrink-0 self-start sm:self-center">
                              <Check size={12} />
                              <span>Enquired via {contactState.method} at {contactState.timestamp}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Reason Quick-Selector Drawer (When editing) */}
                      {editingReasonStudentId === s.id && (
                        <div className="bg-neutral-950 p-3 rounded-lg border-2 border-amber-500/50 space-y-2.5 print:hidden animate-fade-in">
                          <div className="text-xs font-mono font-bold text-amber-400 flex items-center justify-between">
                            <span>Select or type reason provided by parent:</span>
                            <button
                              type="button"
                              onClick={() => setEditingReasonStudentId(null)}
                              className="text-neutral-400 hover:text-white"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          {/* Quick presets */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            {COMMON_ABSENCE_REASONS.map((r) => {
                              const Icon = r.icon;
                              return (
                                <button
                                  key={r.id}
                                  type="button"
                                  onClick={() => handleSaveAbsenceReason(item, r.label)}
                                  className={`p-1.5 rounded border text-[10px] font-mono text-left flex items-center gap-1.5 transition-colors cursor-pointer hover:border-amber-400 ${r.color}`}
                                >
                                  <Icon size={12} />
                                  <span className="truncate">{r.label}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Custom input */}
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="text"
                              placeholder="Or type custom reason (e.g., Traveled to Kumasi for funeral with mother)..."
                              value={tempReasonText}
                              onChange={(e) => setTempReasonText(e.target.value)}
                              className="flex-1 bg-neutral-900 border border-neutral-800 px-3 py-1.5 text-xs font-mono text-white rounded focus:outline-none focus:border-amber-400"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (tempReasonText.trim()) {
                                  handleSaveAbsenceReason(item, tempReasonText.trim());
                                }
                              }}
                              className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-black text-xs font-mono font-black uppercase rounded cursor-pointer transition-colors"
                            >
                              Save Note
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Screen Action Toolbar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-850 print:hidden">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* 1-Click WhatsApp Enquiry */}
                          <button
                            type="button"
                            onClick={() => handleSendWhatsApp(s, item)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-black uppercase tracking-wider rounded flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                            title="Send friendly care message via WhatsApp to parent"
                          >
                            <MessageCircle size={14} className="fill-white" />
                            <span>WhatsApp Care Check</span>
                          </button>

                          {/* Direct Call */}
                          {rawPhone && (
                            <a
                              href={`tel:${rawPhone}`}
                              onClick={() => {
                                setContactedStudents((prev) => ({
                                  ...prev,
                                  [s.id]: {
                                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                    method: 'call'
                                  }
                                }));
                              }}
                              className="px-2.5 py-1.5 bg-neutral-850 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 hover:text-white text-xs font-mono font-bold rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Call parent via phone"
                            >
                              <Phone size={13} className="text-emerald-400" />
                              <span>Call Parent</span>
                            </a>
                          )}

                          {/* Copy Message */}
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(s, item)}
                            className="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-mono rounded flex items-center gap-1 transition-colors cursor-pointer"
                            title="Copy polite enquiry message text to clipboard"
                          >
                            {copiedStudentId === s.id ? (
                              <>
                                <Check size={13} className="text-emerald-400" />
                                <span className="text-emerald-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={13} />
                                <span>Copy Text</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Log / Edit Reason */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingReasonStudentId(editingReasonStudentId === s.id ? null : s.id);
                              setTempReasonText(currentReasonText);
                            }}
                            className="px-2.5 py-1.5 bg-neutral-850 hover:bg-neutral-800 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold rounded flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <FileEdit size={13} />
                            <span>{hasExistingReason ? 'Update Reason' : 'Log Reason'}</span>
                          </button>

                          {/* Arrived Late (Mark Present) */}
                          <button
                            type="button"
                            onClick={() => handleMarkPresentLate(s, item)}
                            className="px-2.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-750 text-neutral-400 hover:text-sky-300 text-xs font-mono rounded flex items-center gap-1 transition-colors cursor-pointer"
                            title="If pupil arrived late, remove absent mark and record present"
                          >
                            <UserCheck size={13} />
                            <span>Arrived Late</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Print Sign-off Section */}
            <div className="hidden print:grid grid-cols-2 gap-10 pt-8 mt-6 border-t-2 border-black text-black font-sans text-xs">
              <div>
                <p className="font-bold uppercase text-[10px] text-gray-700">Follow-up Conducted By (Welfare Officer / Admin):</p>
                <div className="border-b border-black pt-8"></div>
                <p className="text-[10px] mt-1">Name: ____________________ Date: ____________________</p>
              </div>

              <div>
                <p className="font-bold uppercase text-[10px] text-gray-700">Reviewed By (Headteacher / Principal):</p>
                <div className="border-b border-black pt-8"></div>
                <p className="text-[10px] mt-1">Signature & Stamp: ____________________</p>
              </div>
            </div>

            {/* Screen Only Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t-2 border-neutral-850 print:hidden text-xs font-mono text-neutral-400">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-amber-400" />
                <span>
                  Regular absence welfare checks build parent trust, improve pupil safety, and protect school attendance consistency.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold uppercase rounded border border-neutral-700 transition-colors cursor-pointer"
                >
                  Close Desk
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
