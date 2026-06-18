/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Student, PaymentRecord, StudentClass } from '../types';
import { 
  Users, 
  Receipt, 
  AlertCircle, 
  CheckCircle2, 
  Search, 
  Filter, 
  ChevronRight, 
  Calendar, 
  User, 
  DollarSign, 
  Plus, 
  X, 
  Printer, 
  Volume2, 
  VolumeX,
  CreditCard,
  UserCheck,
  Building,
  Check,
  Copy,
  Info,
  MessageSquare,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VoiceSearchButton } from './VoiceSearchButton';

export const TermPayersTab: React.FC = () => {
  const { 
    students, 
    payments, 
    recordPayment, 
    currentUser, 
    currentDate,
    theme,
    activeTerm,
    sendautomatedWhatsApp
  } = useApp();

  // Search, Class and Payment Status Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OUTSTANDING' | 'PAID'>('ALL');
  
  // Custom navigation state for directory versus the targeted follow-up view
  const [viewMode, setViewMode] = useState<'DIRECTORY' | 'PENDING_REGISTRATIONS'>('DIRECTORY');

  // SMS target states for interactive targeted counselor alerts
  const [smsTarget, setSmsTarget] = useState<{ student: Student; consecutiveDays: number; unpaidDates: string[] } | null>(null);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsSuccess, setSmsSuccess] = useState(false);

  // Simple local toast system for smooth feedback
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(prev => prev === msg ? null : prev);
    }, 4500);
  };

  // Bulk notifications states
  const [showBulkNotifyModal, setShowBulkNotifyModal] = useState(false);
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [bulkNotifyProgress, setBulkNotifyProgress] = useState<{
    current: number;
    total: number;
    logs: { name: string; success: boolean; msg?: string }[];
  } | null>(null);

  // Selected student for detail overlay/modal and quick collection
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Quick collection states
  const [collectAmount, setCollectAmount] = useState<string>('');
  const [collectNotes, setCollectNotes] = useState<string>('');
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Active Term Payers list
  const activeTermPayers = useMemo(() => {
    return students.filter(s => s.active !== false && s.paymentType === 'Term');
  }, [students]);

  // Find all school days up to currentDate for active term
  const validSchoolDays = useMemo(() => {
    if (!activeTerm || !activeTerm.schoolDays) return [];
    const holidays = activeTerm.publicHolidays || [];
    return [...activeTerm.schoolDays].filter(d => d <= currentDate && !holidays.includes(d)).sort();
  }, [activeTerm, currentDate]);

  // Find Term Payer students who missed their daily check-in registrations for 3+ consecutive school days
  const pendingPaymentsStudents = useMemo(() => {
    if (validSchoolDays.length < 3) return [];
    
    return activeTermPayers.map(student => {
      let consecutiveUnpaid: string[] = [];
      let maxConsecutiveUnpaid: string[] = [];
      
      for (const day of validSchoolDays) {
        // A check-in registration exists if there is a verified record for that day that is not marked as absent
        const hasRegistration = (payments || []).some(
          p => p.studentId === student.id && p.date === day && p.verified && !p.isAbsent
        );
        
        if (!hasRegistration) {
          consecutiveUnpaid.push(day);
          if (consecutiveUnpaid.length > maxConsecutiveUnpaid.length) {
            maxConsecutiveUnpaid = [...consecutiveUnpaid];
          }
        } else {
          consecutiveUnpaid = [];
        }
      }
      
      return {
        student,
        consecutiveDays: maxConsecutiveUnpaid.length,
        unpaidDates: maxConsecutiveUnpaid
      };
    }).filter(item => item.consecutiveDays >= 3)
      .sort((a, b) => b.consecutiveDays - a.consecutiveDays);
  }, [activeTermPayers, payments, validSchoolDays]);

  // Compute stats based on ALL active Term Payers
  const stats = useMemo(() => {
    let totalExpected = 0;
    let totalPaid = 0;
    let fullySettledCount = 0;
    let outstandingCount = 0;

    activeTermPayers.forEach(s => {
      const studentFee = s.termFee || 350;
      const legacyDebt = s.legacyDebt || 0;
      totalExpected += studentFee + legacyDebt;

      const studentPayments = payments.filter(p => p.studentId === s.id && !p.isAbsent);
      const studentTotalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
      totalPaid += studentTotalPaid;

      if (studentTotalPaid >= (studentFee + legacyDebt)) {
        fullySettledCount++;
      } else {
        outstandingCount++;
      }
    });

    const outstandingBalance = Math.max(0, totalExpected - totalPaid);
    const collectionPercent = totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0;

    return {
      activeLength: activeTermPayers.length,
      totalExpected,
      totalPaid,
      outstandingBalance,
      collectionPercent,
      fullySettledCount,
      outstandingCount
    };
  }, [activeTermPayers, payments]);

  // Outstanding students helper for bulk notifications
  const outstandingStudents = useMemo(() => {
    return activeTermPayers.map(s => {
      const studentFee = s.termFee || 350;
      const legacyDebt = s.legacyDebt || 0;
      const studentPayments = payments.filter(p => p.studentId === s.id && !p.isAbsent);
      const studentTotalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
      const balanceDue = Math.max(0, studentFee + legacyDebt - studentTotalPaid);
      return {
        student: s,
        studentFee,
        legacyDebt,
        totalPaid: studentTotalPaid,
        balanceDue,
        isOutstanding: balanceDue > 0
      };
    }).filter(item => item.isOutstanding);
  }, [activeTermPayers, payments]);

  // Bulk notifications handler
  const handleTriggerBulkNotifications = async () => {
    if (outstandingStudents.length === 0) {
      showToast("No pupils with outstanding balances found.");
      return;
    }

    setIsBulkSending(true);
    setBulkNotifyProgress({
      current: 0,
      total: outstandingStudents.length,
      logs: []
    });

    for (let i = 0; i < outstandingStudents.length; i++) {
      const item = outstandingStudents[i];
      const s = item.student;
      const due = item.balanceDue;
      const fee = item.studentFee;
      const paid = item.totalPaid;
      
      const message = `*SAAKO HOLY CHILD ACADEMY*\n*FEES OUTSTANDING NOTICE*\n\n` +
        `*Beneficiary/Pupil:* ${s.name}\n` +
        `*Roll ID:* ${s.rollNumber || 'SHC-' + s.id.substring(0, 5).toUpperCase()}\n` +
        `*Class:* ${s.class}\n\n` +
        `Dear Parent/Guardian,\n` +
        `We wish to remind you that your child has an outstanding Term fee balance of *GHC ${due.toFixed(2)}* (Total Term Fee: GHC ${fee.toFixed(2)}, Paid: GHC ${paid.toFixed(2)}).\n\n` +
        `Kindly make payments to settle the outstanding arrears. Thank you.\n\n` +
        `_Authorized Administration System_`;

      let success = false;
      let errorMsg = '';
      
      try {
        if (sendautomatedWhatsApp) {
          const res = await sendautomatedWhatsApp(
            s.guardianPhone || '',
            message,
            s.id,
            s.name,
            'term-bulk-outstanding'
          );
          success = res.success;
          if (!res.success && res.error) {
            errorMsg = res.error;
          }
        } else {
          errorMsg = 'API function sendautomatedWhatsApp not available';
        }
      } catch (err: any) {
        errorMsg = err.message || 'Unknown network error';
      }

      setBulkNotifyProgress(prev => {
        if (!prev) return null;
        return {
          ...prev,
          current: i + 1,
          logs: [
            ...prev.logs,
            { name: s.name, success, msg: success ? 'Sent' : errorMsg || 'Failed' }
          ]
        };
      });

      // Artificial short delay to prevent network throttling
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setIsBulkSending(false);
    showToast(`Bulk dispatch completed for ${outstandingStudents.length} accounts!`);
  };

  // Filter Term Payers for display
  const displayedTermPayers = useMemo(() => {
    return activeTermPayers.filter(s => {
      // 1. Name or roll number search
      const matchesSearch = 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase());
      
      // 2. Class filter
      const matchesClass = classFilter === 'ALL' || s.class === classFilter;

      // 3. Status filter
      const studentFee = s.termFee || 350;
      const studentPayments = payments.filter(p => p.studentId === s.id && !p.isAbsent);
      const studentTotalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
      const isPaid = studentTotalPaid >= studentFee;

      const matchesStatus = 
        statusFilter === 'ALL' ||
        (statusFilter === 'PAID' && isPaid) ||
        (statusFilter === 'OUTSTANDING' && !isPaid);

      return matchesSearch && matchesClass && matchesStatus;
    });
  }, [activeTermPayers, searchQuery, classFilter, statusFilter, payments]);

  // Calculate detailed finances for the selected student in detail panel
  const selectedStudentFinances = useMemo(() => {
    if (!selectedStudent) return null;
    const studentFee = selectedStudent.termFee || 350;
    const legacyDebt = selectedStudent.legacyDebt || 0;
    const studentPayments = payments.filter(p => p.studentId === selectedStudent.id);
    const paidPayments = studentPayments.filter(p => !p.isAbsent);
    const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalTarget = studentFee + legacyDebt;
    const balanceDue = Math.max(0, totalTarget - totalPaid);
    const prepayValue = Math.max(0, totalPaid - totalTarget); // If they paid extra
    const isCompleted = totalPaid >= totalTarget;
    const percentDone = Math.min(100, (totalPaid / totalTarget) * 100);

    return {
      studentFee,
      legacyDebt,
      totalTarget,
      studentPayments,
      paidPayments,
      totalPaid,
      balanceDue,
      prepayValue,
      isCompleted,
      percentDone
    };
  }, [selectedStudent, payments]);

  // Handle Incremental Collect Payment
  const handleCollectPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!selectedStudent) return;
    const amt = parseFloat(collectAmount);
    if (isNaN(amt) || amt <= 0) {
      setFormError('Please specify a valid financial amount greater than GHC 0.00');
      return;
    }

    try {
      // Execute the ledger record via context
      recordPayment(selectedStudent.id, true, amt);
      setFormSuccess(`GHC ${amt.toFixed(2)} recorded successfully!`);
      setCollectAmount('');
      setCollectNotes('');
      
      // Keep state in sync or close with delay
      setTimeout(() => {
        setFormSuccess(null);
      }, 3000);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred filing ledger record.');
    }
  };

  // Helper list of potential classes for filtering
  const studentClasses: StudentClass[] = [
    'Nursery', 'KG1', 'KG2',
    'B1', 'B2', 'B3', 'B4', 'B5', 'B6',
    'B7', 'B8', 'B9'
  ];

  return (
    <div className="space-y-6" id="term-payers-registry-workspace">
      {/* Upper header section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b-4 border-neutral-800 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-amber-400 font-extrabold text-xs tracking-wider uppercase bg-amber-400/10 border border-amber-400/35 px-2 py-0.5 rounded-xs">
              Scheme Directory
            </span>
            <span className="text-neutral-500 font-mono text-[9px]">LOCKED CHANNELS ACTIVE</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight font-sans">
            Term Payers Ledger Status
          </h2>
          <p className="text-xs text-neutral-400 mt-1 font-bold">
            Administrative overview of pupils bound to fixed-term scholastic schemes. Allows quick state audits, filters, and records collection.
          </p>
        </div>

        {/* Global actions and summary count */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowBulkNotifyModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-black uppercase text-xs tracking-wider px-4 py-3 flex items-center justify-center gap-2 rounded-xs border-b-2 border-emerald-800 transition-all shadow-md cursor-pointer hover:-translate-y-0.5"
            title="Send bulk WhatsApp reminder notifications to guardians of all outstanding term payers"
          >
            <MessageSquare size={15} />
            <span>Notify Arrears</span>
          </button>

          <div className="bg-neutral-900 border-2 border-neutral-800 p-3 flex items-center gap-3.5 select-none">
            <div className="bg-amber-400 text-neutral-950 font-black p-2 rounded-xs">
              <Users size={18} />
            </div>
            <div>
              <span className="text-[9px] text-neutral-500 font-black uppercase tracking-widest block font-sans">Term Enrollment</span>
              <div className="text-base font-black text-white font-mono mt-0.5">
                {activeTermPayers.length} Active Pupils
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Aggregate Financial Bento Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="term-analytics-grid">
        {/* Expected Term Revenue */}
        <div className="bg-neutral-900 border-2 border-neutral-800 p-4 relative overflow-hidden flex flex-col justify-between">
          <div>
            <span className="text-[9px] text-neutral-500 font-black uppercase tracking-wider block font-mono">
              ★ Total Expected Fees
            </span>
            <h3 className="text-xl md:text-2xl font-black text-white font-mono tracking-tight mt-1">
              GHC {stats.totalExpected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="text-[10px] text-neutral-400 font-bold mt-4 uppercase border-t border-neutral-800 pt-2 flex justify-between">
            <span>Quota Expected</span>
            <span className="text-amber-400">Term Aggregate</span>
          </div>
        </div>

        {/* Aggregate Collections Received */}
        <div className="bg-neutral-900 border-2 border-neutral-800 p-4 relative overflow-hidden flex flex-col justify-between">
          <div>
            <span className="text-[9px] text-emerald-400 font-black uppercase tracking-wider block font-mono">
              ✓ Cleared Collections
            </span>
            <h3 className="text-xl md:text-2xl font-black text-emerald-400 font-mono tracking-tight mt-1">
              GHC {stats.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="mt-4 border-t border-neutral-800 pt-2">
            <div className="flex items-center justify-between text-[10px] text-neutral-400 font-bold uppercase mb-1">
              <span>Collection Progress</span>
              <span className="text-emerald-400 font-mono font-black">{stats.collectionPercent.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-neutral-950 h-1.5 rounded-full overflow-hidden border border-neutral-855">
              <div 
                className="bg-emerald-500 h-full transition-all duration-500" 
                style={{ width: `${Math.min(100, stats.collectionPercent)}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Outstanding Deficit */}
        <div className="bg-neutral-900 border-2 border-neutral-800 p-4 relative overflow-hidden flex flex-col justify-between">
          <div>
            <span className="text-[9px] text-red-400 font-black uppercase tracking-wider block font-mono font-bold">
              ❌ Escrow Outstanding Deficit
            </span>
            <h3 className="text-xl md:text-2xl font-black text-red-500 font-mono tracking-tight mt-1">
              GHC {stats.outstandingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="text-[10px] text-neutral-400 font-bold mt-4 uppercase border-t border-neutral-800 pt-2 flex justify-between">
            <span>To Be Collected</span>
            <span className="text-red-400 font-black">{stats.outstandingCount} Out of {stats.activeLength} Pupils</span>
          </div>
        </div>

        {/* Completion Statistics */}
        <div className="bg-neutral-900 border-2 border-neutral-800 p-4 relative overflow-hidden flex flex-col justify-between">
          <div>
            <span className="text-[9px] text-amber-400 font-black uppercase tracking-wider block font-mono">
              👑 Completion Quota Ratio
            </span>
            <h3 className="text-xl md:text-2xl font-black text-white font-mono tracking-tight mt-1">
              {stats.fullySettledCount} <span className="text-xs text-neutral-500">of</span> {stats.activeLength}
            </h3>
          </div>
          <div className="text-[10px] text-neutral-400 font-bold mt-4 uppercase border-t border-neutral-800 pt-2 flex justify-between">
            <span>Accounts Cleared</span>
            <span className="text-emerald-400 font-black bg-emerald-950/20 px-1 border border-emerald-990/30">
              {stats.activeLength > 0 ? ((stats.fullySettledCount / stats.activeLength) * 100).toFixed(0) : '0'}% Settled
            </span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-neutral-800 gap-2 mb-6">
        <button
          onClick={() => setViewMode('DIRECTORY')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider font-mono border-t-2 transition-all cursor-pointer ${
            viewMode === 'DIRECTORY'
              ? 'border-t-amber-400 bg-neutral-900/40 text-amber-400'
              : 'border-t-transparent text-neutral-500 hover:text-neutral-300'
          }`}
        >
          🗂️ Scheme Pupil Registry ({activeTermPayers.length})
        </button>
        <button
          onClick={() => setViewMode('PENDING_REGISTRATIONS')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider font-mono border-t-2 relative transition-all cursor-pointer ${
            viewMode === 'PENDING_REGISTRATIONS'
              ? 'border-t-red-500 bg-neutral-900/40 text-red-400'
              : 'border-t-transparent text-neutral-500 hover:text-neutral-300'
          }`}
        >
          🚨 Pending Payments Alert ({pendingPaymentsStudents.length})
          {pendingPaymentsStudents.length > 0 && (
            <span className="absolute -top-1.5 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-655 text-[8px] font-black text-white animate-pulse">
              {pendingPaymentsStudents.length}
            </span>
          )}
        </button>
      </div>

      {viewMode === 'DIRECTORY' ? (
        <>
          {/* Advanced Filter, Search, and Status bar */}
      <div className="bg-neutral-900 border-2 border-neutral-800 p-4 flex flex-col md:flex-row items-center gap-4">
        {/* Dynamic Search */}
        <div className="flex items-center gap-2 w-full md:flex-1">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              id="term-payers-search"
              type="text"
              placeholder="Search term payers by pupil name, roll ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-950 border-2 border-neutral-800 pl-10 pr-16 py-2 text-xs text-white font-medium outline-none focus:border-amber-400 focus:ring-0 placeholder:text-neutral-600 transition-colors"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <VoiceSearchButton
                inputId="term-payers-search"
                onTranscript={(text) => setSearchQuery(text)}
              />
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 border border-neutral-800 bg-neutral-950 font-mono text-[8px] text-neutral-500 rounded-xs leading-none pointer-events-none uppercase font-bold tracking-wider select-none">
                Ctrl+K
              </kbd>
            </div>
          </div>
          {/* Keyboard shortcut info indicator reminder */}
          <div 
            className="hidden md:flex items-center justify-center text-neutral-500 hover:text-amber-400 border border-neutral-800 bg-neutral-950 hover:border-amber-400 transition-all cursor-help h-[36px] w-9 shrink-0 select-none"
            title="Keyboard Shortcut Reminder: Press 'Ctrl+K' (or 'Cmd+K' on macOS) from anywhere at any time to focus this term payers search box instantly"
          >
            <Info size={13} className="stroke-[2.5]" />
          </div>
        </div>

        {/* Filter select by Grade Class */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={12} className="text-neutral-500 shrink-0" />
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-full md:w-44 bg-neutral-950 border-2 border-neutral-800 px-3 py-2 text-xs text-white font-bold outline-none focus:border-amber-400 transition-colors"
          >
            <option value="ALL">All Cohort Classes</option>
            {studentClasses.map(cls => (
              <option key={cls} value={cls}>{cls} (Cohort Class)</option>
            ))}
          </select>
        </div>

        {/* Clear Filter selectors */}
        <div className="flex items-center gap-1.5 w-full md:w-auto bg-neutral-950 p-0.5 border-2 border-neutral-850">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`text-[10px] font-black uppercase tracking-wider font-mono px-3 py-1.5 cursor-pointer select-none transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-amber-400 text-neutral-950'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            All Schemes
          </button>
          <button
            onClick={() => setStatusFilter('OUTSTANDING')}
            className={`text-[10px] font-black uppercase tracking-wider font-mono px-3 py-1.5 cursor-pointer select-none transition-colors ${
              statusFilter === 'OUTSTANDING'
                ? 'bg-red-950/20 text-red-400 border border-red-500/30'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            Outstanding Balance
          </button>
          <button
            onClick={() => setStatusFilter('PAID')}
            className={`text-[10px] font-black uppercase tracking-wider font-mono px-3 py-1.5 cursor-pointer select-none transition-colors ${
              statusFilter === 'PAID'
                ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/30'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            Fully Cleared
          </button>
        </div>
      </div>

      {/* Directory Table Display */}
      <div className="bg-neutral-900 border-2 border-neutral-800 overflow-hidden">
        {displayedTermPayers.length === 0 ? (
          <div className="p-12 text-center text-neutral-500">
            <AlertCircle size={32} className="mx-auto text-neutral-600 mb-3" />
            <h4 className="text-sm font-black uppercase tracking-wide text-neutral-400">No Term Payers Found</h4>
            <p className="text-xs text-neutral-505 mt-1">
              No registered pupil matches your search or filter configuration. Check spelling or clear filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-950 text-neutral-400 font-mono text-[10px] font-black uppercase border-b border-neutral-800">
                  <th className="px-6 py-3.5">Pupil Profile</th>
                  <th className="px-6 py-3.5">Class / Cate</th>
                  <th className="px-6 py-3.5">Subscribed Fee</th>
                  <th className="px-6 py-3.5">Total Paid</th>
                  <th className="px-6 py-3.5">Balance Due</th>
                  <th className="px-6 py-3.5 text-center">Collection Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 text-xs text-neutral-250 font-medium">
                {displayedTermPayers.map((student) => {
                  const termFee = student.termFee || 350;
                  const legacyDebt = student.legacyDebt || 0;
                  const totalExpected = termFee + legacyDebt;
                  const studentPayments = payments.filter(p => p.studentId === student.id && !p.isAbsent);
                  const totalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
                  const balanceDue = Math.max(0, totalExpected - totalPaid);
                  const isSettled = totalPaid >= totalExpected;
                  const percentPaid = Math.min(100, (totalPaid / totalExpected) * 100);
                  const isLowProgress = percentPaid < 25;

                  // Soft red hue highlighting for low progress (<25%)
                  // Adaptive for daylight / dark mode
                  const rowClass = isLowProgress
                    ? theme === 'daylight'
                      ? 'bg-red-50/70 hover:bg-red-100/80 transition-all border-l-4 border-l-red-500 group font-bold'
                      : 'bg-red-950/15 hover:bg-red-900/10 transition-all border-l-4 border-l-red-500/80 group font-bold'
                    : 'hover:bg-neutral-850/60 transition-colors border-l-4 border-l-transparent group';

                  return (
                    <tr 
                      key={student.id} 
                      className={rowClass}
                      id={`row-student-${student.id}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {/* Photo avatar or initials placeholder */}
                          {student.photoUrl ? (
                            <img 
                              src={student.photoUrl} 
                              alt={student.name} 
                              className="w-10 h-10 object-cover border border-neutral-700 bg-neutral-800 text-[10px] flex items-center justify-center shrink-0 rounded-xs"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-neutral-950 text-neutral-400 font-black text-sm uppercase flex items-center justify-center border border-neutral-800 font-mono shrink-0 rounded-xs">
                              {student.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`font-extrabold uppercase tracking-tight transition-colors ${
                                isLowProgress 
                                  ? 'text-red-400 group-hover:text-red-300' 
                                  : 'text-white group-hover:text-amber-400'
                              }`}>
                                {student.name}
                              </span>
                              {isLowProgress && (
                                <span className="text-[8px] font-black tracking-wide text-red-500 bg-red-950/30 border border-red-500/35 px-1.5 py-0.5 uppercase shrink-0 font-sans">
                                  CRITICAL &lt; 25%
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-neutral-500 font-mono mt-0.5 font-bold">
                              ID: {student.rollNumber || 'SHC-' + student.id.substring(0, 5).toUpperCase()}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-bold font-sans">
                        <span className="text-white bg-neutral-950 px-2 py-1 border border-neutral-800">
                          {student.class}
                        </span>
                        <span className="text-neutral-500 block text-[10px] mt-1.5 uppercase font-mono">
                          {student.category}
                        </span>
                      </td>

                      <td className="px-6 py-4 font-mono font-black text-white">
                        <div>GHC {termFee.toFixed(2)}</div>
                        {legacyDebt > 0 && (
                          <div className="text-[10px] text-red-400 font-bold mt-1" title="Legacy Debt before this system was adopted">
                            + GHC {legacyDebt.toFixed(2)} Legacy
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 max-w-[140px]">
                          <div className="flex items-baseline justify-between gap-2 font-mono">
                            <span className="font-black text-emerald-400">GHC {totalPaid.toFixed(2)}</span>
                            <span className="text-[9px] text-neutral-400 font-extrabold bg-neutral-950 px-1 py-0.5 border border-neutral-800 rounded-2xs">
                              {percentPaid.toFixed(0)}%
                            </span>
                          </div>
                          {/* Aesthetic precise track progress meter */}
                          <div className="w-full bg-neutral-950 h-2 border border-neutral-800 rounded-xs overflow-hidden p-[1px]">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${percentPaid}%` }}
                              transition={{ duration: 0.5, ease: 'easeOut' }}
                              className={`h-full rounded-2xs transition-all duration-300 ${
                                isSettled 
                                  ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]' 
                                  : isLowProgress
                                  ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]'
                                  : 'bg-amber-450 bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.4)]'
                              }`}
                            />
                          </div>
                          <span className="text-[8.5px] text-neutral-500 font-mono block uppercase tracking-tight">
                            {isSettled ? 'Fully Settled' : `GHC ${balanceDue.toFixed(2)} Left`}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono text-xs">
                        {isSettled ? (
                          <span className="text-emerald-500 font-black">-</span>
                        ) : (
                          <span className="text-red-500 font-bold block bg-red-950/20 px-2 py-1 border border-red-500/25">
                            GHC {balanceDue.toFixed(2)}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        {isSettled ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-black uppercase text-emerald-400 bg-emerald-950/30 border border-emerald-500/30 px-2.5 py-1">
                            <CheckCircle2 size={10} className="text-emerald-400" />
                            Cleared
                          </span>
                        ) : isLowProgress ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-black uppercase text-red-500 bg-red-950/20 border border-red-500/30 px-2.5 py-1 animate-pulse" title="High risk deficit: Term payments below 25%">
                            <AlertCircle size={10} className="text-red-400" />
                            &lt; 25% Alert
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-black uppercase text-amber-500 bg-amber-955/20 border border-amber-600/30 px-2.5 py-1 animate-pulse">
                            <AlertCircle size={10} />
                            Outstanding
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedStudent(student)}
                            className="bg-neutral-950 text-white hover:text-amber-400 hover:border-amber-400 border border-neutral-800 px-3 py-1.5 text-xs font-black uppercase tracking-tight transition-all cursor-pointer rounded-xs inline-flex items-center gap-1 hover:-translate-y-0.5 active:translate-y-0"
                            title="Detailed payment ledger and check-in dates log"
                          >
                            <span>Ledger Logs</span>
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  ) : (
    /* Pending Payments / Daily Registrations Alert view */
    <div className="space-y-6 animate-fadeIn" id="pending-registrations-container">
      <div className="bg-neutral-900 border-2 border-red-500/25 p-5 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase text-red-400 bg-red-950/45 border border-red-400/30 px-2 py-0.5 rounded-xs font-mono inline-block">
            ★ OUTSTANDING REGISTRY ACTION PANEL
          </span>
          <h3 className="text-sm font-black text-white uppercase tracking-tight font-sans">
            Pending Daily Check-In Registers Alert
          </h3>
          <p className="text-xs text-neutral-405 max-w-2xl leading-relaxed">
            The pupils isolated below are registered under the locked <strong>Scholastic Term Scheme</strong>, but have records indicating missed gate fee check-ins for <strong>3 or more consecutive school days</strong>. Use this roster for targeted counselor calls or direct ledger follow-ups with parents.
          </p>
        </div>
        <div className="bg-red-500 text-neutral-950 font-black p-3.5 rounded-xs font-mono text-center shrink-0 min-w-[140px] select-none">
          <span className="text-[9px] uppercase tracking-wider block leading-none font-bold">Unpaid Alert</span>
          <div className="text-2xl font-black mt-1 leading-none">{pendingPaymentsStudents.length}</div>
          <span className="text-[8px] uppercase tracking-widest block leading-none mt-1 text-neutral-905/80 font-bold font-sans">Students Due</span>
        </div>
      </div>

      {pendingPaymentsStudents.length === 0 ? (
        <div className="bg-neutral-900 border-2 border-neutral-800 p-12 text-center text-neutral-400 space-y-4">
          <CheckCircle2 size={44} className="mx-auto text-emerald-500 animate-bounce" />
          <div>
            <h4 className="text-xs uppercase font-mono font-black text-white tracking-widest">Registry Completely Clear</h4>
            <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
              Outstanding daily register compliance is 100%! All Term Scheme pupils have checked in at the gate consistently.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingPaymentsStudents.map(({ student, consecutiveDays, unpaidDates }) => {
            const termFee = student.termFee || 350;
            const legacyDebt = student.legacyDebt || 0;
            const totalExpected = termFee + legacyDebt;
            const studentPayments = payments.filter(p => p.studentId === student.id && !p.isAbsent);
            const totalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
            const balanceDue = Math.max(0, totalExpected - totalPaid);
            const percentPaid = Math.min(100, (totalPaid / totalExpected) * 100);

            return (
              <div key={student.id} className="bg-neutral-900 border-2 border-neutral-800 hover:border-red-500/40 p-5 space-y-4 transition-all hover:shadow-lg relative overflow-hidden" id={`pending-card-${student.id}`}>
                <div className="absolute top-4 right-4 bg-red-955 border border-red-500/45 text-red-400 text-[10px] font-mono font-black uppercase px-2.5 py-1 select-none animate-pulse">
                  {consecutiveDays} Consecutive Days missed
                </div>

                <div className="flex items-center gap-3">
                  {student.photoUrl ? (
                    <img 
                      src={student.photoUrl} 
                      alt={student.name} 
                      className="w-12 h-12 object-cover border border-neutral-700 bg-neutral-950 text-xs rounded-xs shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-neutral-950 text-neutral-500 font-extrabold text-sm uppercase flex items-center justify-center border border-neutral-800 font-mono shrink-0 rounded-xs">
                      {student.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-tight group-hover:text-amber-400 transition-colors">
                      {student.name}
                    </h4>
                    <div className="text-[10px] text-neutral-400 mt-1 font-bold space-x-2 flex">
                      <span className="bg-neutral-950 py-0.5 px-2 border border-neutral-850 font-sans text-neutral-300">{student.class}</span>
                      <span className="text-neutral-500 font-mono">ID: {student.rollNumber || 'SHC-' + student.id.substring(0, 5).toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-neutral-955 p-3.5 border border-neutral-850 space-y-2">
                  <div className="flex justify-between items-baseline text-[9px] font-mono font-black uppercase text-neutral-500">
                    <span>Term payment {legacyDebt > 0 ? '(incl. legacy debt)' : ''}</span>
                    <span className="text-white font-black">GHC {totalPaid.toFixed(2)} / GHC {totalExpected.toFixed(2)} ({percentPaid.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-400 h-full transition-all" style={{ width: `${percentPaid}%` }} />
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-neutral-500 font-bold">
                    <span>Overall Arrears Balance:</span>
                    <span className="text-red-400 font-black">GHC {balanceDue.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[8.5px] font-black text-neutral-400 uppercase tracking-widest font-mono">
                    🔴 Unregistered / Missed Check-in Dates ({unpaidDates.length} Days)
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {unpaidDates.map(dateStr => (
                      <span key={dateStr} className="text-[9.5px] font-mono font-extrabold text-red-200 bg-red-950/40 border border-red-500/35 px-2 py-0.5" title="No presence or verified payment logged for this day">
                        {dateStr}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-neutral-850">
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(student)}
                    className="flex-1 bg-neutral-955 hover:bg-neutral-850 text-white border border-neutral-800 hover:border-amber-400 py-2.5 text-[10px] font-black font-mono uppercase tracking-wider transition-all cursor-pointer rounded-xs flex items-center justify-center gap-1.5"
                    title="Open tuition payment modal logs and registration tools"
                  >
                    <Receipt size={11} />
                    <span>Inspect Tuition Ledger</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSmsSuccess(false);
                      setSmsTarget({ student, consecutiveDays, unpaidDates });
                    }}
                    className="flex-1 bg-red-950/20 hover:bg-red-900/10 text-red-400 border border-red-500/30 hover:border-red-400 py-2.5 text-[10px] font-black font-mono uppercase tracking-wider transition-all cursor-pointer rounded-xs flex items-center justify-center gap-1.5"
                    title="Draft standard follow-up text alert to guardian"
                  >
                    <Calendar size={11} className="text-red-400" />
                    <span>SMS Registry Warning</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  )}

  {/* SMS Follow-Up Alert Modal Backdrop */}
  <AnimatePresence>
    {smsTarget && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSmsTarget(null)}
          className="absolute inset-0 bg-neutral-950/80 backdrop-blur-xs"
          id="sms-modal-backdrop"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-neutral-900 border-4 border-red-500 w-full max-w-md p-6 md:p-8 rounded shadow-2xl relative z-10 space-y-6"
          id="targeted-sms-alert-panel"
        >
          <button
            onClick={() => setSmsTarget(null)}
            className="absolute top-4 right-4 bg-neutral-950 text-neutral-400 hover:text-white hover:border-red-500 p-2 border border-neutral-800 transition-colors cursor-pointer rounded-none"
            id="btn-close-sms-modal"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-2 border-b-2 border-neutral-800 pb-3">
            <AlertCircle size={20} className="text-red-505 animate-pulse" />
            <h3 className="text-sm font-black uppercase tracking-widest text-white font-mono">
              Registry Follow-Up Dispatcher
            </h3>
          </div>

          <div className="space-y-4 font-sans text-left">
            <p className="text-xs text-neutral-400 font-bold leading-relaxed">
              Generate high-priority attendance warning notice for pupil: <strong className="text-white font-extrabold">{smsTarget.student.name}</strong>.
            </p>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[8.5px] font-black text-neutral-405 uppercase tracking-widest font-mono">
                  Receiver Guardian Phone Number
                </label>
                {smsTarget.student.guardianPhone && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(smsTarget.student.guardianPhone || '');
                      showToast(`Copied Contact Number: ${smsTarget.student.guardianPhone}`);
                    }}
                    className="text-[9px] hover:text-white text-amber-400 px-2 py-0.5 border border-amber-500/30 hover:border-amber-450 bg-neutral-950 font-mono uppercase tracking-wider font-extrabold flex items-center gap-1 transition cursor-pointer"
                  >
                    <span>Copy Contact</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                value={smsTarget.student.guardianPhone || ''}
                onChange={(e) => {
                  const nextPhone = e.target.value.replace(/\D/g, '');
                  setSmsTarget({
                    ...smsTarget,
                    student: { ...smsTarget.student, guardianPhone: nextPhone }
                  });
                }}
                placeholder="Type or verify phone number e.g. 0541234567"
                className="w-full bg-neutral-955 border border-neutral-800 py-3 px-3.5 font-mono text-xs text-white focus:outline-none focus:border-red-500 placeholder:text-neutral-700 font-extrabold"
              />
            </div>

            <div className="relative">
              <div className="bg-neutral-955 text-neutral-350 font-mono text-[10.5px] p-4 border border-neutral-850 leading-relaxed uppercase space-y-1 select-text">
                <span className="text-neutral-500 font-black block tracking-widest">Sender Mask: SAAKOCHECK (REGISTRY ALERT)</span>
                <p className="border-t border-neutral-800/85 my-2 pt-1.5" />
                <p className="text-red-400 leading-normal normal-case">
                  Hello. REGISTRY UPDATE: Records show that {smsTarget.student.name} has missed standard daily school register check-ins for {smsTarget.consecutiveDays} consecutive school days (Dates: {smsTarget.unpaidDates.join(', ')}). Under Term Scheme requirements, all daily gate registrations must be logged. Please contact school administration immediately. - Yakubu Hakeem
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const msg = `Hello. REGISTRY UPDATE: Records show that ${smsTarget.student.name} has missed standard daily school register check-ins for ${smsTarget.consecutiveDays} consecutive school days (Dates: ${smsTarget.unpaidDates.join(', ')}). Under Term Scheme requirements, all daily gate registrations must be logged. Please contact school administration immediately. - Yakubu Hakeem`;
                  navigator.clipboard.writeText(msg);
                  showToast(`Copied full alert text to clipboard!`);
                }}
                className="absolute right-2.5 bottom-2.5 text-[8.5px] text-amber-450 bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1 font-mono font-bold hover:text-white transition cursor-pointer"
              >
                Copy Message Text
              </button>
            </div>

            {!smsTarget.student.guardianPhone && (
              <p className="text-[10px] text-amber-505 font-bold font-mono uppercase bg-amber-950/20 border border-amber-900/60 p-2.5 rounded-sm">
                ⚠️ Alert: No active contact registered. Please input guardian's phone number above.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              disabled={isSendingSms || !smsTarget.student.guardianPhone}
              onClick={() => {
                setIsSendingSms(true);
                setTimeout(() => {
                  setIsSendingSms(false);
                  setSmsSuccess(true);
                  showToast(`SMS Dispatch Token registered for ${smsTarget.student.name}'s guardian.`);
                  setTimeout(() => {
                    setSmsTarget(null);
                  }, 1200);
                }, 1500);
              }}
              className="w-full text-xs bg-red-650 hover:bg-red-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white py-3.5 font-mono font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 rounded-none border border-red-600"
            >
              {isSendingSms ? (
                <span className="animate-pulse">DISPATCHING GATE NOTICE...</span>
              ) : smsSuccess ? (
                <span className="text-emerald-400">DISPATCHED SUCCESSFULLY ✓</span>
              ) : (
                <span>DISPATCH ACTIVE SMS NOTICE</span>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>

  {/* Bulk WhatsApp Notification Dialog */}
  <AnimatePresence>
    {showBulkNotifyModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            if (!isBulkSending) setShowBulkNotifyModal(false);
          }}
          className="absolute inset-0 bg-neutral-950/80 backdrop-blur-xs"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-neutral-900 border-4 border-emerald-500 w-full max-w-2xl p-6 md:p-8 rounded shadow-2xl relative z-10 space-y-6 max-h-[90vh] overflow-y-auto"
        >
          <button
            onClick={() => setShowBulkNotifyModal(false)}
            disabled={isBulkSending}
            className="absolute top-4 right-4 bg-neutral-950 text-neutral-405 hover:text-white hover:border-emerald-500 p-2 border border-neutral-800 transition-colors cursor-pointer rounded-none disabled:opacity-50"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-2 border-b-2 border-neutral-800 pb-3">
            <MessageSquare size={20} className="text-emerald-405" />
            <h3 className="text-sm font-black uppercase tracking-widest text-white font-mono">
              Bulk Outstanding Fees WhatsApp Dispatcher
            </h3>
          </div>

          <p className="text-xs text-neutral-400 font-bold leading-relaxed">
            Configure and dispatch bulk notifications to guardians of all pupils with outstanding term fee balances.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* List of affected pupils */}
            <div className="border border-neutral-800 bg-neutral-950 p-4 space-y-3 max-h-[250px] overflow-y-auto">
              <span className="text-[9px] font-mono font-black uppercase tracking-widest text-neutral-500 block">
                Targeted Accounts ({outstandingStudents.length})
              </span>
              <div className="divide-y divide-neutral-900 space-y-2">
                {outstandingStudents.length === 0 ? (
                  <p className="text-xs text-neutral-500 font-bold font-mono">No students with outstanding balances found.</p>
                ) : (
                  outstandingStudents.map(item => (
                    <div key={item.student.id} className="flex justify-between items-center text-[11px] font-mono py-1">
                      <div>
                        <span className="text-white block font-extrabold uppercase">{item.student.name}</span>
                        <span className="text-neutral-500 text-[9px] block">Phone: {item.student.guardianPhone || 'No active contact'}</span>
                      </div>
                      <span className="text-red-400 font-extrabold">GHC {item.balanceDue.toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Template preview */}
            <div className="border border-neutral-800 bg-neutral-950 p-4 space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-mono font-black uppercase tracking-widest text-neutral-500 block mb-1">
                  Alert Message Template Preview
                </span>
                <div className="bg-neutral-900 border border-neutral-800 p-3 italic text-[10px] text-neutral-350 rounded-xs leading-relaxed max-h-[160px] overflow-y-auto">
                  <strong>*SAAKO HOLY CHILD ACADEMY*</strong><br />
                  <strong>*FEES OUTSTANDING NOTICE*</strong><br />
                  <br />
                  *Beneficiary/Pupil:* [Pupil Name]<br />
                  *Class:* [Class]<br />
                  <br />
                  We wish to remind you that your child has an outstanding Term fee balance of <strong>*GHC [Balance Due]*</strong> (Total Term Fee: GHC [Term Fee], Paid: GHC [Paid]).<br />
                  <br />
                  Kindly make payments to settle the outstanding arrears. Thank you.<br />
                  <br />
                  <em>_Authorized Administration System_</em>
                </div>
              </div>
              <span className="text-[8.5px] text-neutral-500 block font-mono">
                ℹ Bulk messages will be broadcasted individually to each guardian number consecutively.
              </span>
            </div>
          </div>

          {/* Progress list if sending */}
          {bulkNotifyProgress && (
            <div className="border border-neutral-800 bg-neutral-950 p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-mono font-black uppercase tracking-widest text-neutral-400">
                  Broadcast Dispatch Progress
                </span>
                <span className="text-emerald-400 font-mono font-black text-xs">
                  {bulkNotifyProgress.current} / {bulkNotifyProgress.total} Complete
                </span>
              </div>
              <div className="w-full bg-neutral-900 h-2 rounded-full overflow-hidden border border-neutral-800">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${bulkNotifyProgress.total > 0 ? (bulkNotifyProgress.current / bulkNotifyProgress.total) * 100 : 0}%` }}
                />
              </div>
              {/* Individual logs */}
              <div className="max-h-[120px] overflow-y-auto divide-y divide-neutral-900">
                {bulkNotifyProgress.logs.map((log, index) => (
                  <div key={index} className="flex justify-between items-center py-1.5 text-[10px] font-mono">
                    <span className="text-neutral-300 uppercase">{log.name}</span>
                    <span className={log.success ? 'text-emerald-405 font-black' : 'text-red-405 font-black'}>
                      {log.msg}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dialog Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              disabled={isBulkSending || outstandingStudents.length === 0}
              onClick={handleTriggerBulkNotifications}
              className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-850 disabled:text-neutral-550 text-white py-3 px-4 font-mono font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-emerald-700"
            >
              {isBulkSending ? (
                <span className="animate-pulse flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-305 animate-ping" />
                  DISPATCHING BROADCAST NOTICES...
                </span>
              ) : (
                <>
                  <Send size={12} />
                  <span>Execute Bulk Alert Broadcast</span>
                </>
              )}
            </button>
            <button
              type="button"
              disabled={isBulkSending}
              onClick={() => setShowBulkNotifyModal(false)}
              className="text-xs bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800 py-3 px-6 font-mono font-black uppercase tracking-wider transition-all cursor-pointer rounded-none disabled:opacity-50"
            >
              Dismiss
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>

  {/* Local Toast Portal Notifications */}
  <AnimatePresence>
    {toast && (
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed bottom-6 right-6 z-[100] bg-neutral-900 border-2 border-red-500 text-white font-mono text-[10px] font-black uppercase tracking-wide px-5 py-4 shadow-2xl flex items-center gap-3"
        id="local-toast-notification"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
        <span>{toast}</span>
      </motion.div>
    )}
  </AnimatePresence>

      {/* Slide Drawer / Modal Backdrop for detailed Pupil Record */}
      <AnimatePresence>
        {selectedStudent && selectedStudentFinances && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Modal glass backdrop background */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStudent(null)}
              className="absolute inset-0 bg-neutral-950/80 backdrop-blur-xs"
              id="ledger-modal-backdrop"
            />

            {/* Slide up dialog viewport wrapper */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-neutral-900 border-4 border-neutral-800 w-full max-w-4xl p-6 md:p-8 rounded shadow-2xl relative z-10 overflow-y-auto max-h-[90vh] grid grid-cols-1 md:grid-cols-12 gap-6"
              id="term-payer-details-panel"
            >
              {/* Close Button top-right corner */}
              <button
                onClick={() => setSelectedStudent(null)}
                className="absolute top-4 right-4 bg-neutral-950 text-neutral-405 hover:text-white hover:border-amber-400 p-2 border border-neutral-800 transition-colors cursor-pointer"
                id="btn-close-ledger-modal"
              >
                <X size={16} />
              </button>

              {/* Column 1: Pupil card details (Span 4) */}
              <div className="md:col-span-5 space-y-6">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wide text-amber-400 bg-amber-400/5 border border-amber-300/25 px-2 py-0.5 rounded-sm inline-block">
                    ★ REGISTRATION RECORD
                  </span>
                  <div className="flex items-center gap-3.5 mt-3">
                    {selectedStudent.photoUrl ? (
                      <img 
                        src={selectedStudent.photoUrl} 
                        alt={selectedStudent.name} 
                        className="w-14 h-14 object-cover border-2 border-neutral-700 bg-neutral-950 text-xs rounded-xs"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-neutral-950 text-neutral-500 font-extrabold text-lg uppercase flex items-center justify-center border border-neutral-800 font-mono shrink-0 rounded-xs">
                        {selectedStudent.name.slice(0,2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-tight leading-none leading-tight">
                        {selectedStudent.name}
                      </h3>
                      <p className="text-xs text-amber-400 font-mono font-black mt-1">
                        ROLL ID: {selectedStudent.rollNumber || 'SHC-' + selectedStudent.id.substring(0, 5).toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Subsystem meta values */}
                <div className="bg-neutral-950 p-4 border-l-4 border-amber-400 space-y-2 font-sans">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500 uppercase font-black uppercase">Academic Grade:</span>
                    <strong className="text-white font-mono">{selectedStudent.class} ({selectedStudent.category})</strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500 uppercase font-black uppercase">Active Clearance:</span>
                    <strong className="text-emerald-400 font-sans uppercase">ALL-ACCESS PASS</strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500 uppercase font-black uppercase">Guardian SMS Contact:</span>
                    <strong className="text-white font-mono">{selectedStudent.guardianPhone || 'NOT CONFIGURED'}</strong>
                  </div>
                </div>

                {/* Quick Payment Collection Form */}
                <div className="border border-neutral-800/80 p-5 bg-neutral-950/45 space-y-4">
                  <div className="flex items-center gap-2 border-b border-neutral-850 pb-2">
                    <CreditCard size={14} className="text-amber-400" />
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-white font-mono">
                      Log Custom Scheme Payment
                    </h4>
                  </div>

                  <form onSubmit={handleCollectPayment} className="space-y-3 font-sans" id="scheme-collection-form">
                    <div>
                      <label className="block text-[10px] text-neutral-500 uppercase font-black mb-1">
                        Immediate Collection Amount (GHC)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-black text-neutral-500">
                          GHC
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="Amount e.g. 50.00"
                          value={collectAmount}
                          onChange={(e) => setCollectAmount(e.target.value)}
                          className="w-full bg-neutral-950 border-2 border-neutral-800 pl-12 pr-4 py-2.5 text-xs text-white font-mono outline-none focus:border-amber-400 focus:ring-0 transition-colors"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black font-mono tracking-wider uppercase text-[10px] py-3.5 transition-all cursor-pointer flex items-center justify-center gap-1 hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <Plus size={11} className="stroke-[3.5]" />
                      <span>Log Collection Entry</span>
                    </button>

                    {/* Status Feedback alerts inside drawer info */}
                    <AnimatePresence>
                      {formSuccess && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="p-3 border border-emerald-400/30 bg-emerald-950/20 text-emerald-400 text-[10px] font-bold uppercase flex items-center justify-center gap-1.5"
                        >
                          <Check size={11} className="stroke-[3]" />
                          <span>{formSuccess}</span>
                        </motion.div>
                      )}
                      
                      {formError && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="p-3 border border-red-500/30 bg-red-950/20 text-red-400 text-[10px] font-bold uppercase flex items-center justify-center gap-1.5"
                        >
                          <AlertCircle size={11} />
                          <span>{formError}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </form>
                </div>
              </div>

              {/* Column 2: Financial records list & receipt ledger (Span 7) */}
              <div className="md:col-span-7 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wide text-neutral-500 block">
                    ★ TRANSACTION BALANCE SHEET
                  </span>

                  {/* Summary row */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 mt-3 mb-6">
                    <div className="bg-neutral-950 border border-neutral-800 p-3.5">
                      <span className="text-[9px] text-neutral-500 uppercase font-black block">Fixed quota</span>
                      <strong className="text-white text-base font-mono font-black mt-1 block">
                        GHC {selectedStudentFinances.studentFee.toFixed(2)}
                      </strong>
                    </div>
                    <div className="bg-neutral-950 border border-neutral-800 p-3.5">
                      <span className="text-[9px] text-emerald-400 uppercase font-bold block">Amount Cleared</span>
                      <strong className="text-emerald-400 text-base font-mono font-black mt-1 block">
                        GHC {selectedStudentFinances.totalPaid.toFixed(2)}
                      </strong>
                    </div>
                    <div className="bg-neutral-950 border border-neutral-800 p-3.5 col-span-2 md:col-span-1">
                      <span className="text-[9px] text-red-400 uppercase font-black block">Remaining Balance</span>
                      <strong className={`${selectedStudentFinances.isCompleted ? 'text-emerald-500' : 'text-red-550'} text-base font-mono font-black mt-1 block`}>
                        GHC {selectedStudentFinances.balanceDue.toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  {/* Balance progression progress bar */}
                  <div className="mb-6 bg-neutral-950 p-4 border border-neutral-850">
                    <div className="flex items-center justify-between text-[10px] text-neutral-400 font-bold uppercase mb-2 font-mono">
                      <span>Ledger Clearance Rate</span>
                      <span className={selectedStudentFinances.isCompleted ? 'text-emerald-400 font-extrabold' : 'text-amber-400 font-extrabold'}>
                        {selectedStudentFinances.percentDone.toFixed(0)}% SETTLED
                      </span>
                    </div>
                    <div className="w-full bg-neutral-900 h-2.5 rounded-full overflow-hidden border border-neutral-800">
                      <div 
                        className={`h-full ${selectedStudentFinances.isCompleted ? 'bg-emerald-500' : 'bg-amber-400'}`} 
                        style={{ width: `${selectedStudentFinances.percentDone}%` }}
                      />
                    </div>
                  </div>

                  {/* Payment Docket history table */}
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-neutral-400 border-b border-neutral-800 pb-2 mb-3 font-mono">
                    🧾 ITEMISED RECEIPT LOGS ({selectedStudentFinances.paidPayments.length} entries)
                  </h4>

                  {selectedStudentFinances.paidPayments.length === 0 ? (
                    <div className="p-8 text-center text-neutral-500 bg-neutral-950 border border-neutral-850">
                      <AlertCircle size={20} className="mx-auto text-neutral-600 mb-2" />
                      <p className="text-[11px] font-bold uppercase text-neutral-405 leading-normal">
                        No financial transactions on file.
                      </p>
                      <p className="text-[9px] text-neutral-505 mt-0.5 leading-relaxed">
                        Use the left panel to register the student's installments or school payments.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[18rem] overflow-y-auto">
                      {selectedStudentFinances.paidPayments.map((p, idx) => (
                        <div 
                          key={p.id} 
                          className="bg-neutral-950 border border-neutral-850 p-3 flex items-center justify-between font-mono text-[11px]"
                          id={`payment-log-${p.id}`}
                        >
                          <div>
                            <span className="text-[8px] font-bold uppercase tracking-wide bg-neutral-900 text-neutral-400 px-1.5 py-0.5 border border-neutral-800 inline-block mb-1.5">
                              ENTRY {idx + 1}
                            </span>
                            <div className="text-[9px] text-neutral-500 uppercase font-black">
                              LOGGED ON: {p.date} • {new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {p.notes && (
                              <div className="text-[10px] text-neutral-300 font-sans font-bold mt-1 max-w-[17rem] md:max-w-md break-words italic">
                                "{p.notes}"
                              </div>
                            )}
                          </div>
                          
                          <div className="text-right">
                            <div className="text-emerald-400 font-black text-sm">
                              GHC {p.amount.toFixed(2)}
                            </div>
                            <span className="text-[8.5px] text-neutral-500 font-sans block mt-0.5 uppercase">
                              By {p.collectedBy}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-neutral-800 pt-5 mt-6 flex justify-end">
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="bg-neutral-950 hover:bg-neutral-850 text-white hover:text-amber-400 border-2 border-neutral-800 hover:border-amber-400 px-5 py-2.5 text-xs font-black uppercase tracking-tight transition-all cursor-pointer rounded-xs shadow"
                  >
                    Done Viewing
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
