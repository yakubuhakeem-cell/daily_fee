/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useApp, getSchoolWeekForDate, getDiscountedTermFee, getStudentBaselineTermFee } from '../context/AppContext';
import { Student, PaymentRecord, StudentClass } from '../types';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ReferenceLine
} from 'recharts';
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
  TrendingUp,
  BarChart3,
  Info,
  MessageSquare,
  Send,
  Download,
  FileText,
  Clock,
  ArrowUpDown,
  Sparkles,
  Smartphone,
  Link
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VoiceSearchButton } from './VoiceSearchButton';

export const TermPayersTab: React.FC = React.memo(() => {
  const { 
    students, 
    payments, 
    recordPayment, 
    recordMomoPayment,
    currentUser, 
    currentDate,
    theme,
    activeTerm,
    sendautomatedWhatsApp,
    systemSettings,
    users
  } = useApp();

  const baseTermFee = systemSettings?.baselineTermFee ?? 350;
  const currencySymbol = systemSettings?.currencyCode || 'GHC';

  // Search, Class and Payment Status Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OUTSTANDING' | 'PAID'>('ALL');
  
  // Custom navigation state for directory versus the targeted follow-up view
  const [viewMode, setViewMode] = useState<'DIRECTORY' | 'PENDING_REGISTRATIONS' | 'PAYMENT_HISTORY'>('DIRECTORY');

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

  // Active sub-tab inside the selected student modal (Ledger vs Analytics)
  const [drawerActiveTab, setDrawerActiveTab] = useState<'ledger' | 'analytics'>('ledger');

  // Payment mode state inside selected student modal
  const [paymentModeTab, setPaymentModeTab] = useState<'cash' | 'momo'>('cash');

  // Mobile Money simulation and payment link generation states
  const [momoAmountInput, setMomoAmountInput] = useState<string>('');
  const [momoProvider, setMomoProvider] = useState<string>('MTN');
  const [momoPhone, setMomoPhone] = useState<string>('');
  const [momoSimState, setMomoSimState] = useState<'idle' | 'step1' | 'step2' | 'step3' | 'step4' | 'success' | 'failed'>('idle');
  const [momoLogs, setMomoLogs] = useState<string[]>([]);
  const [generatedMomoLink, setGeneratedMomoLink] = useState<string | null>(null);

  useEffect(() => {
    if (selectedStudent) {
      setMomoPhone(selectedStudent.guardianPhone || '');
      // Calculate selected student finance info on selection
      const studentPayments = payments.filter(p => p.studentId === selectedStudent.id && !p.isAbsent);
      const totalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
      const termFee = selectedStudent.termFee || baseTermFee;
      const legacyDebt = selectedStudent.legacyDebt || 0;
      const totalExpected = termFee + legacyDebt;
      const balanceDue = Math.max(0, totalExpected - totalPaid);

      setMomoAmountInput(balanceDue > 0 ? balanceDue.toFixed(2) : '50.00');
      
      // Reset simulator
      setMomoSimState('idle');
      setMomoLogs([]);
      setGeneratedMomoLink(null);
      setPaymentModeTab('cash'); // Reset tab to cash on change
      setDrawerActiveTab('ledger'); // Reset drawer active sub-tab on change
    }
  }, [selectedStudent, payments, baseTermFee]);

  const momoTimersRef = React.useRef<NodeJS.Timeout[]>([]);
  useEffect(() => {
    return () => {
      momoTimersRef.current.forEach(clearTimeout);
      momoTimersRef.current = [];
    };
  }, [selectedStudent]);

  const runMomoSimulation = () => {
    if (!selectedStudent) return;
    const amt = parseFloat(momoAmountInput);
    if (isNaN(amt) || amt <= 0) {
      showToast("Please enter a valid amount to simulate.");
      return;
    }
    if (!momoPhone.trim()) {
      showToast("Please enter a mobile money phone number.");
      return;
    }

    // Clear old timers
    momoTimersRef.current.forEach(clearTimeout);
    momoTimersRef.current = [];

    const txId = 'TXN_' + Math.floor(10000000 + Math.random() * 90000000);
    setMomoSimState('step1');
    setMomoLogs([
      `⚡ [${new Date().toLocaleTimeString()}] INITIATING: Creating API payment session with ID: session_${txId}...`
    ]);

    const t1 = setTimeout(() => {
      setMomoSimState('step2');
      setMomoLogs(prev => [
        ...prev,
        `📲 [${new Date().toLocaleTimeString()}] PUSHING: Triggering remote USSD prompt via ${momoProvider} core gateway on subscriber line ${momoPhone}...`
      ]);
    }, 1500);

    const t2 = setTimeout(() => {
      setMomoSimState('step3');
      setMomoLogs(prev => [
        ...prev,
        `🔑 [${new Date().toLocaleTimeString()}] USER PROMPT: Handset alert sent. Waiting for guardian PIN authentication code & acceptance response...`,
        `💡 SIMULATION KEYBOARD: Prompting guardian with: "Pay ${currencySymbol} ${amt.toFixed(2)} to SAAKO HOLY CHILD ACADEMY? Enter PIN to approve."`
      ]);
    }, 3500);

    const t3 = setTimeout(() => {
      setMomoSimState('step4');
      setMomoLogs(prev => [
        ...prev,
        `✅ [${new Date().toLocaleTimeString()}] PIN AUTHORIZED: Correct PIN verified. Transferring funds from subscriber pocket...`
      ]);
    }, 6000);

    const t4 = setTimeout(() => {
      // Record payment in context!
      recordMomoPayment(
        selectedStudent.id,
        amt,
        txId,
        momoProvider,
        momoPhone,
        'successful',
        `Simulated ${momoProvider} Momo payment [Ref: ${txId}]`
      );

      setMomoSimState('success');
      setMomoLogs(prev => [
        ...prev,
        `🎉 [${new Date().toLocaleTimeString()}] COMPLETED: Ledger updated successfully! ${currencySymbol} ${amt.toFixed(2)} cleared. Digital receipt issued.`
      ]);
      showToast(`Momo Payment of ${currencySymbol} ${amt.toFixed(2)} simulated successfully!`);
    }, 8000);

    momoTimersRef.current = [t1, t2, t3, t4];
  };

  // Quick collection states
  const [collectAmount, setCollectAmount] = useState<string>('');
  const [collectNotes, setCollectNotes] = useState<string>('');
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Single reminder loading state
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  const [whatsAppReminderModal, setWhatsAppReminderModal] = useState<{
    student: Student;
    messageText: string;
    defaultPhone: string;
  } | null>(null);
  const [reminderChannel, setReminderChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [customWAContact, setCustomWAContact] = useState('');
  const [selectedStaffPhone, setSelectedStaffPhone] = useState('');

  // Legacy Debt Report Modal
  const [showDebtReportModal, setShowDebtReportModal] = useState<boolean>(false);

  // Student payment history view states
  const [historySelectedStudentId, setHistorySelectedStudentId] = useState<string | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyClassFilter, setHistoryClassFilter] = useState<string>('ALL');
  const [historySortOrder, setHistorySortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Selected receipt payment for modal & printing
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<PaymentRecord | null>(null);

  const downloadTermReceipt = (
    student: Student,
    payment: PaymentRecord,
    totalPaid: number,
    balanceDue: number
  ) => {
    const txId = `SHC-TERM-${payment.date.replace(/-/g, '')}-${payment.id.substring(0, 8).toUpperCase()}`;
    const rollRef = student.rollNumber || 'SHC-' + student.id.substring(0, 5).toUpperCase();
    const amountStr = `GHC ${payment.amount.toFixed(2)}`;
    const termFee = student.termFee || 350;
    const legacyDebt = student.legacyDebt || 0;
    const totalCommitment = termFee + legacyDebt;
    const auditor = payment.collectedBy || 'Certified Registrar';

    const legacyDebtRowHtml = legacyDebt > 0 ? `
      <div class="summary-row">
        <span>Legacy Debt Balance</span>
        <span style="font-family: monospace; font-weight: bold;">GHC ${legacyDebt.toFixed(2)}</span>
      </div>
    ` : '';

    const notesRowHtml = payment.notes ? `
      <br><strong style="font-size: 9px; color: #fbbf24;">NOTE:</strong> ${payment.notes}
    ` : '';

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Term Fee Receipt - ${student.name} - ${payment.date}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #0b0f19;
      color: #f3f4f6;
      margin: 0;
      padding: 40px 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .receipt-container {
      background-color: #111827;
      border: 4px solid #1f2937;
      border-top: 12px solid #fbbf24;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      width: 100%;
      max-width: 600px;
      padding: 40px;
      position: relative;
      box-sizing: border-box;
    }
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-25deg);
      font-size: 45px;
      font-weight: 900;
      color: rgba(16, 185, 129, 0.05);
      letter-spacing: 4px;
      pointer-events: none;
      text-transform: uppercase;
      border: 4px dashed rgba(16, 185, 129, 0.05);
      padding: 15px 30px;
      white-space: nowrap;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      border-b: 2px solid #1f2937;
      padding-bottom: 24px;
      margin-bottom: 24px;
    }
    .school-title {
      font-size: 18px;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: 0.5px;
      margin: 0;
      text-transform: uppercase;
    }
    .school-subtitle {
      font-size: 10px;
      color: #fbbf24;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin: 6px 0 0 0;
      font-weight: 700;
    }
    .receipt-type {
      background-color: rgba(251, 191, 36, 0.1);
      color: #fbbf24;
      border: 1px solid rgba(251, 191, 36, 0.3);
      font-size: 10px;
      font-weight: 800;
      padding: 6px 12px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      display: inline-block;
      text-align: right;
    }
    .tx-id {
      font-family: monospace;
      font-size: 10px;
      color: #9ca3af;
      margin-top: 8px;
      text-align: right;
    }
    .grid-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .info-block {
      background-color: #0b0f19;
      border: 1px solid #1f2937;
      padding: 14px;
      border-radius: 6px;
    }
    .info-label {
      font-size: 9px;
      font-weight: 700;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .info-value {
      font-size: 12px;
      font-weight: 700;
      color: #ffffff;
    }
    .summary-box {
      border: 1px solid #1f2937;
      border-radius: 6px;
      padding: 20px;
      background-color: rgba(11, 15, 25, 0.6);
      margin-bottom: 24px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #1f2937;
      font-size: 12px;
    }
    .summary-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .amount-value {
      font-size: 20px;
      font-weight: 900;
      color: #10b981;
    }
    .audit-msg {
      font-size: 11px;
      color: #9ca3af;
      background-color: rgba(59, 130, 246, 0.05);
      padding: 14px;
      border-radius: 6px;
      border-left: 4px solid #3b82f6;
      margin-bottom: 24px;
      line-height: 1.5;
    }
    .btn-container {
      display: flex;
      gap: 12px;
      margin-top: 20px;
    }
    .btn {
      flex: 1;
      padding: 12px;
      border: none;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      cursor: pointer;
      letter-spacing: 1px;
      text-align: center;
      transition: all 0.2s;
      text-decoration: none;
    }
    .btn-primary {
      background-color: #fbbf24;
      color: #000000;
    }
    .btn-primary:hover {
      background-color: #f59e0b;
    }
    .btn-secondary {
      background-color: #1f2937;
      color: #f3f4f6;
      border: 1px solid #374151;
    }
    .btn-secondary:hover {
      background-color: #374151;
    }
    .footer {
      text-align: center;
      font-size: 10px;
      color: #4b5563;
      margin-top: 24px;
      border-top: 1px solid #1f2937;
      padding-top: 16px;
    }
    @media print {
      body {
        background-color: white;
        color: black;
        padding: 0;
      }
      .receipt-container {
        border: none;
        box-shadow: none;
        max-width: 100%;
        padding: 0;
        background-color: white;
      }
      .btn-container {
        display: none;
      }
      .info-block {
        background-color: white;
        border: 1px solid #e5e7eb;
      }
      .info-value, .school-title {
        color: black;
      }
      .summary-box {
        background-color: white;
        border: 1px solid #e5e7eb;
      }
      .summary-row {
        border-bottom: 1px solid #e5e7eb;
        color: black;
      }
      .amount-value {
        color: #059669;
      }
      .btn {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="watermark">TERM PAID</div>
    
    <div class="header">
      <div>
        <h1 class="school-title">SAAKO HOLY CHILD ACADEMY</h1>
        <p class="school-subtitle">Sawla, Jelinkon street, Savannah Region • Term Ledger Docket</p>
      </div>
      <div>
        <span class="receipt-type">Term installment</span>
        <div class="tx-id">Ref: ${txId}</div>
      </div>
    </div>

    <div class="grid-container">
      <div class="info-block">
        <div class="info-label">Pupil Name</div>
        <div class="info-value" style="text-transform: uppercase;">${student.name}</div>
      </div>
      <div class="info-block">
        <div class="info-label">Cohort Grade / Class</div>
        <div class="info-value">${student.class} (${student.category})</div>
      </div>
      <div class="info-block">
        <div class="info-label">Enrollment Roll ID</div>
        <div class="info-value">${rollRef}</div>
      </div>
      <div class="info-block">
        <div class="info-label">Student Gender</div>
        <div class="info-value">${student.gender || 'Not Specified'}</div>
      </div>
      <div class="info-block">
        <div class="info-label">Guardian Contact</div>
        <div class="info-value">${student.guardianPhone || 'Not Specified'}</div>
      </div>
      <div class="info-block">
        <div class="info-label">Billing Scheme</div>
        <div class="info-value">Term Fee Scheme</div>
      </div>
      <div class="info-block" style="grid-column: span 2;">
        <div class="info-label">Date Cleared</div>
        <div class="info-value">${payment.date}</div>
      </div>
    </div>

    <div class="summary-box">
      <div class="summary-row">
        <span>Subscribed Term Fee</span>
        <span style="font-family: monospace; font-weight: bold;">GHC ${termFee.toFixed(2)}</span>
      </div>
      ${legacyDebtRowHtml}
      <div class="summary-row" style="background-color: rgba(59, 130, 246, 0.05); padding: 6px 8px; margin: 4px 0;">
        <span>Total Outstanding Obligation</span>
        <span style="font-family: monospace; font-weight: bold;">GHC ${totalCommitment.toFixed(2)}</span>
      </div>
      <div class="summary-row">
        <span>Cumulative Paid to Date</span>
        <span style="font-family: monospace; font-weight: bold; color: #34d399;">GHC ${totalPaid.toFixed(2)}</span>
      </div>
      <div class="summary-row">
        <span>Remaining Balance Due</span>
        <span style="font-family: monospace; font-weight: bold; color: ${balanceDue > 0 ? '#f87171' : '#34d399'};">GHC ${balanceDue.toFixed(2)}</span>
      </div>
      <div class="summary-row" style="border-top: 2px solid #374151; padding-top: 12px; margin-top: 12px;">
        <span style="font-weight: 900; text-transform: uppercase; font-size: 13px;">This Installment Amount</span>
        <span class="amount-value">${amountStr}</span>
      </div>
    </div>

    <div class="audit-msg">
      This acts as secure verification of the term installment ledger update. Collected & stamped by Registrar Office: <strong>${auditor}</strong>.
      ${notesRowHtml}
    </div>

    <div class="btn-container">
      <button class="btn btn-primary" onclick="window.print()">Print Receipt</button>
      <button class="btn btn-secondary" onclick="window.close()">Close</button>
    </div>

    <div class="footer">
      SAAKO HOLY CHILD ACADEMY • Official Termly Ledger Audit System • Ref: ${student.id}
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TERM_RECEIPT_${student.name.replace(/\s+/g, '_')}_${payment.date}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Standalone receipt downloaded for ${student.name}!`);
  };

  // Listen for background auto-flagged pupil updates
  const [autoFlaggedPupils, setAutoFlaggedPupils] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('auto_flagged_debt_pupils');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handleThresholdUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<string[]>;
      if (customEvent && customEvent.detail) {
        setAutoFlaggedPupils(customEvent.detail);
      }
    };
    
    const runLocalCheck = () => {
      try {
        const stored = localStorage.getItem('auto_flagged_debt_pupils');
        if (stored) {
          setAutoFlaggedPupils(JSON.parse(stored));
        }
      } catch (e) {
        console.error(e);
      }
    };

    window.addEventListener('debt-threshold-updated', handleThresholdUpdate);
    const interval = setInterval(runLocalCheck, 5000);

    return () => {
      window.removeEventListener('debt-threshold-updated', handleThresholdUpdate);
      clearInterval(interval);
    };
  }, []);

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
    
    // Pre-index payments for O(1) loop lookup
    const registrationSet = new Set<string>();
    if (payments) {
      for (let i = 0; i < payments.length; i++) {
        const p = payments[i];
        if (p.verified && !p.isAbsent) {
          registrationSet.add(`${p.studentId}_${p.date}`);
        }
      }
    }
    
    return activeTermPayers.map(student => {
      let consecutiveUnpaid: string[] = [];
      let maxConsecutiveUnpaid: string[] = [];
      
      for (const day of validSchoolDays) {
        // A check-in registration exists if there is a verified record for that day that is not marked as absent
        const key = `${student.id}_${day}`;
        const hasRegistration = registrationSet.has(key);
        
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
      const discountInfo = getDiscountedTermFee(s, payments, activeTerm, currentDate, systemSettings);
      const studentFee = discountInfo.termFee;
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
  }, [activeTermPayers, payments, activeTerm, currentDate, systemSettings]);

  // Outstanding students helper for bulk notifications
  const outstandingStudents = useMemo(() => {
    return activeTermPayers.map(s => {
      const discountInfo = getDiscountedTermFee(s, payments, activeTerm, currentDate, systemSettings);
      const studentFee = discountInfo.termFee;
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
  }, [activeTermPayers, payments, activeTerm, currentDate, systemSettings]);

  // Pupils with non-zero legacy debt for targeted debt reporting
  const legacyDebtStudents = useMemo(() => {
    return activeTermPayers.map(s => {
      const discountInfo = getDiscountedTermFee(s, payments, activeTerm, currentDate, systemSettings);
      const studentFee = discountInfo.termFee;
      const legacyDebt = s.legacyDebt || 0;
      const studentPayments = payments.filter(p => p.studentId === s.id && !p.isAbsent);
      const studentTotalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
      const balanceDue = Math.max(0, studentFee + legacyDebt - studentTotalPaid);
      return {
        student: s,
        studentFee,
        legacyDebt,
        totalPaid: studentTotalPaid,
        balanceDue
      };
    }).filter(item => item.legacyDebt > 0);
  }, [activeTermPayers, payments, baseTermFee, activeTerm, currentDate, systemSettings]);

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

  const handleSendSingleReminder = async (student: Student) => {
    const studentFee = student.termFee || getStudentBaselineTermFee(student.class, systemSettings);
    const legacyDebt = student.legacyDebt || 0;
    const studentPayments = payments.filter(p => p.studentId === student.id && !p.isAbsent);
    const studentTotalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
    const balanceDue = Math.max(0, studentFee + legacyDebt - studentTotalPaid);

    if (balanceDue <= 0) {
      showToast(`${student.name}'s term fees are already completely settled!`);
      return;
    }

    const message = `*SAAKO HOLY CHILD ACADEMY*\n*FEES OUTSTANDING NOTICE*\n\n` +
      `*Beneficiary/Pupil:* ${student.name}\n` +
      `*Roll ID:* ${student.rollNumber || 'SHC-' + student.id.substring(0, 5).toUpperCase()}\n` +
      `*Class:* ${student.class}\n\n` +
      `Dear Parent/Guardian,\n` +
      `We wish to remind you that your child has an outstanding Term fee balance of *GHC ${balanceDue.toFixed(2)}* (Total Term Fee: GHC ${studentFee.toFixed(2)}, Legacy Debt: GHC ${legacyDebt.toFixed(2)}, Paid: GHC ${studentTotalPaid.toFixed(2)}).\n\n` +
      `Kindly make payments to settle the outstanding arrears. Thank you.\n\n` +
      `_Authorized Administration System_`;

    setWhatsAppReminderModal({
      student,
      messageText: message,
      defaultPhone: student.guardianPhone || ''
    });
  };

  const handleSendSmsReminder = async (student: Student, balanceDue: number) => {
    const template = systemSettings?.debtAlertTemplate || "Alert: Your ward {name} has accumulated a high school debt of {currency} {debt}. Please settle this balance promptly to ensure compliance with check-in procedures.";
    const currency = systemSettings?.currencyCode || 'GHC';
    const messageText = template
      .replace(/{name}/g, student.name)
      .replace(/{currency}/g, currency)
      .replace(/{debt}/g, balanceDue.toFixed(2));

    setWhatsAppReminderModal({
      student,
      messageText,
      defaultPhone: student.guardianPhone || ''
    });
  };

  const downloadDebtCsvReport = () => {
    if (legacyDebtStudents.length === 0) {
      showToast("No pupils with active legacy debts found to export.");
      return;
    }

    const headers = [
      "Roll ID",
      "Student Name",
      "Class",
      "Guardian Phone",
      "Term Fee (GHC)",
      "Legacy Debt (GHC)",
      "Total Paid (GHC)",
      "Remaining Arrears (GHC)"
    ];

    const escapeCsv = (val: string | number) => {
      const str = String(val === null || val === undefined ? '' : val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = legacyDebtStudents.map(item => {
      const s = item.student;
      const rollId = s.rollNumber || 'SHC-' + s.id.substring(0, 5).toUpperCase();
      return [
        escapeCsv(rollId),
        escapeCsv(s.name),
        escapeCsv(s.class),
        escapeCsv(s.guardianPhone || 'N/A'),
        escapeCsv(item.studentFee),
        escapeCsv(item.legacyDebt),
        escapeCsv(item.totalPaid),
        escapeCsv(item.balanceDue)
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Legacy_Debt_Audit_Report_${currentDate}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Successfully exported Legacy Debt CSV Report!`);
  };

  // Filter Term Payers for display
  const displayedTermPayers = useMemo(() => {
    return activeTermPayers.filter(s => {
      // 1. Name, roll number, class, category, or payment status search
      const query = searchQuery.toLowerCase().trim();
      const normalizedQuery = query.replace(/[-_ ]/g, '');

      const discountInfo = getDiscountedTermFee(s, payments, activeTerm, currentDate, systemSettings);
      const studentFee = discountInfo.termFee;
      const legacyDebt = s.legacyDebt || 0;
      const studentPayments = payments.filter(p => p.studentId === s.id && !p.isAbsent);
      const studentTotalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
      const isPaid = studentTotalPaid >= (studentFee + legacyDebt);

      let matchesSearch = true;
      if (query) {
        const matchesNameOrRoll = 
          s.name.toLowerCase().includes(query) ||
          (s.rollNumber || '').toLowerCase().includes(query);

        const normalizedClass = s.class.toLowerCase().replace(/[-_ ]/g, '');
        const matchesClass = 
          normalizedClass === normalizedQuery || 
          s.class.toLowerCase().includes(query) ||
          (s.category && s.category.toLowerCase().includes(query));

        let matchesStatus = false;
        if (query === 'paid' || query === 'present' || query === 'checked' || query === 'cleared' || query === 'complete' || query === 'completed') {
          matchesStatus = isPaid;
        } else if (query === 'outstanding' || query === 'unpaid' || query === 'arrears' || query === 'debt' || query === 'owing' || query === 'pending') {
          matchesStatus = !isPaid;
        }

        matchesSearch = matchesNameOrRoll || matchesClass || matchesStatus;
      }
      
      // 2. Class filter
      const matchesClassFilter = classFilter === 'ALL' || s.class === classFilter;

      // 3. Status filter
      const matchesStatusFilter = 
        statusFilter === 'ALL' ||
        (statusFilter === 'PAID' && isPaid) ||
        (statusFilter === 'OUTSTANDING' && !isPaid);

      return matchesSearch && matchesClassFilter && matchesStatusFilter;
    });
  }, [activeTermPayers, searchQuery, classFilter, statusFilter, payments, activeTerm, currentDate, systemSettings]);

  // Calculate detailed finances for the selected student in detail panel
  const selectedStudentFinances = useMemo(() => {
    if (!selectedStudent) return null;
    const discountInfo = getDiscountedTermFee(selectedStudent, payments, activeTerm, currentDate, systemSettings);
    const studentFee = discountInfo.termFee;
    const legacyDebt = selectedStudent.legacyDebt || 0;
    const studentPayments = payments.filter(p => p.studentId === selectedStudent.id);
    const paidPayments = studentPayments.filter(p => !p.isAbsent);
    const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalTarget = studentFee + legacyDebt;
    const balanceDue = Math.max(0, totalTarget - totalPaid);
    const prepayValue = Math.max(0, totalPaid - totalTarget); // If they paid extra
    const isCompleted = totalPaid >= totalTarget;
    const percentDone = Math.min(100, (totalPaid / totalTarget) * 100);

    const termSchoolDaysList = activeTerm ? activeTerm.schoolDays : [];
    const holidaysList = activeTerm?.publicHolidays || [];
    const schoolDaysNoHolidaysCount = termSchoolDaysList.filter(d => !holidaysList.includes(d)).length;

    const presentDaysTerm = activeTerm ? activeTerm.schoolDays.filter(d => {
      if (d > currentDate) return false;
      if (holidaysList.includes(d)) return false;
      const record = payments.find(p => p.studentId === selectedStudent.id && p.date === d);
      return !(record?.isAbsent);
    }).length : 0;

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
      percentDone,
      presentDaysTerm,
      schoolDaysNoHolidaysCount,
      discountInfo
    };
  }, [selectedStudent, payments, activeTerm, currentDate, systemSettings]);

  // Calculate detailed analytics for the selected student
  const analyticsData = useMemo(() => {
    if (!selectedStudent || !activeTerm) return null;

    const termDays = activeTerm.schoolDays || [];
    const holidaysList = activeTerm.publicHolidays || [];
    const startDate = activeTerm.startDate;

    // Filter out holidays and days in the future
    const elapsedDays = termDays.filter(d => d <= currentDate && !holidaysList.includes(d));

    // Group elapsed school days by week
    const weekDataMap: { [week: number]: { present: number; absent: number; days: string[] } } = {};

    elapsedDays.forEach(dStr => {
      const weekNum = getSchoolWeekForDate(dStr, startDate);
      if (!weekDataMap[weekNum]) {
        weekDataMap[weekNum] = { present: 0, absent: 0, days: [] };
      }

      const record = payments.find(p => p.studentId === selectedStudent.id && p.date === dStr);
      const isAbsent = !!(record?.isAbsent);

      if (isAbsent) {
        weekDataMap[weekNum].absent += 1;
      } else {
        weekDataMap[weekNum].present += 1;
      }
      weekDataMap[weekNum].days.push(dStr);
    });

    // Convert map to sorted array
    const sortedWeeks = Object.keys(weekDataMap)
      .map(Number)
      .sort((a, b) => a - b);

    const attendanceWeeklyChartData = sortedWeeks.map(weekNum => {
      const data = weekDataMap[weekNum];
      const total = data.present + data.absent;
      const rate = total > 0 ? (data.present / total) * 100 : 0;
      return {
        week: `Wk ${weekNum}`,
        present: data.present,
        absent: data.absent,
        total,
        rate: Math.round(rate),
      };
    });

    // Pie chart data for overall term attendance
    const totalPresent = elapsedDays.filter(dStr => {
      const record = payments.find(p => p.studentId === selectedStudent.id && p.date === dStr);
      return !(record?.isAbsent);
    }).length;

    const totalAbsent = elapsedDays.length - totalPresent;

    const attendancePieData = [
      { name: 'Present', value: totalPresent },
      { name: 'Absent', value: totalAbsent }
    ];

    // Cumulative and individual payment data over time
    const studentTermPayments = payments.filter(p => 
      p.studentId === selectedStudent.id && 
      !p.isAbsent &&
      termDays.includes(p.date)
    );

    const sortedPayments = [...studentTermPayments].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let runningSum = 0;
    const paymentChartData = sortedPayments.map((p, idx) => {
      runningSum += p.amount;
      return {
        idx: idx + 1,
        date: p.date,
        amount: p.amount,
        cumulative: runningSum,
      };
    });

    return {
      attendanceWeeklyChartData,
      attendancePieData,
      paymentChartData,
      totalPresent,
      totalAbsent,
      totalSchoolDays: elapsedDays.length,
      attendanceRate: elapsedDays.length > 0 ? Math.round((totalPresent / elapsedDays.length) * 100) : 0,
    };
  }, [selectedStudent, payments, activeTerm, currentDate]);

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

  // Memoized states for student payment history view
  const filteredHistoryStudents = useMemo(() => {
    return activeTermPayers.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
        (s.rollNumber && s.rollNumber.toLowerCase().includes(historySearchQuery.toLowerCase())) ||
        ('SHC-' + s.id.substring(0, 5).toUpperCase()).toLowerCase().includes(historySearchQuery.toLowerCase());
      const matchesClass = historyClassFilter === 'ALL' || s.class === historyClassFilter;
      return matchesSearch && matchesClass;
    });
  }, [activeTermPayers, historySearchQuery, historyClassFilter]);

  const historySelectedStudent = useMemo(() => {
    if (!historySelectedStudentId) return null;
    return activeTermPayers.find(s => s.id === historySelectedStudentId) || null;
  }, [activeTermPayers, historySelectedStudentId]);

  const historySelectedStudentFinances = useMemo(() => {
    if (!historySelectedStudent) return null;
    const discountInfo = getDiscountedTermFee(historySelectedStudent, payments, activeTerm, currentDate, systemSettings);
    const studentFee = discountInfo.termFee;
    const legacyDebt = historySelectedStudent.legacyDebt || 0;
    const studentPayments = payments.filter(p => p.studentId === historySelectedStudent.id);
    const paidPayments = studentPayments.filter(p => !p.isAbsent);
    
    // Sort chronologically based on historySortOrder
    const sortedPayments = [...paidPayments].sort((a, b) => {
      const timeA = new Date(a.timestamp || a.date).getTime();
      const timeB = new Date(b.timestamp || b.date).getTime();
      return historySortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });

    const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalTarget = studentFee + legacyDebt;
    const balanceDue = Math.max(0, totalTarget - totalPaid);
    const percentDone = Math.min(100, (totalPaid / totalTarget) * 100);
    const isCompleted = totalPaid >= totalTarget;

    return {
      studentFee,
      legacyDebt,
      totalTarget,
      sortedPayments,
      totalPaid,
      balanceDue,
      percentDone,
      isCompleted,
      discountInfo
    };
  }, [historySelectedStudent, payments, historySortOrder, baseTermFee, activeTerm, currentDate, systemSettings]);

  const receiptStudent = useMemo(() => {
    if (!selectedReceiptPayment) return null;
    return activeTermPayers.find(s => s.id === selectedReceiptPayment.studentId) || null;
  }, [activeTermPayers, selectedReceiptPayment]);

  const receiptStudentFinances = useMemo(() => {
    if (!receiptStudent) return null;
    const discountInfo = getDiscountedTermFee(receiptStudent, payments, activeTerm, currentDate, systemSettings);
    const studentFee = discountInfo.termFee;
    const legacyDebt = receiptStudent.legacyDebt || 0;
    const studentPayments = payments.filter(p => p.studentId === receiptStudent.id);
    const paidPayments = studentPayments.filter(p => !p.isAbsent && p.verified);
    const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalTarget = studentFee + legacyDebt;
    const balanceDue = Math.max(0, totalTarget - totalPaid);
    
    return {
      termFee: studentFee,
      legacyDebt,
      totalPaid,
      balanceDue
    };
  }, [receiptStudent, payments, activeTerm, currentDate, systemSettings]);

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
            onClick={() => setShowDebtReportModal(true)}
            className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-mono font-black uppercase text-xs tracking-wider px-4 py-3 flex items-center justify-center gap-2 rounded-xs border-b-2 border-amber-700 transition-all shadow-md cursor-pointer hover:-translate-y-0.5"
            title="Export and print legacy debt audit report"
          >
            <FileText size={15} />
            <span>Export Debt Report</span>
          </button>

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
        <button
          onClick={() => setViewMode('PAYMENT_HISTORY')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider font-mono border-t-2 relative transition-all cursor-pointer ${
            viewMode === 'PAYMENT_HISTORY'
              ? 'border-t-emerald-400 bg-neutral-900/40 text-emerald-400'
              : 'border-t-transparent text-neutral-500 hover:text-neutral-300'
          }`}
        >
          🧾 Student Payment History
        </button>
      </div>

      {viewMode === 'DIRECTORY' ? (
        <>
          {/* Early Payment Discount Admin Badge / Summary Banner if enabled */}
          {systemSettings?.termDiscountEnabled && (
            <div className="bg-amber-950/20 border-2 border-amber-500/30 p-4 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              <div className="flex gap-3">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                <div className="text-left">
                  <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider font-mono">
                    Active Early Payment Discount Scheme
                  </h4>
                  <p className="text-[11px] text-neutral-300 mt-0.5 leading-relaxed font-sans">
                    Pupils who settle their term fee within <span className="text-amber-400 font-extrabold font-mono">Week {systemSettings.termDiscountWeek}</span> of the active academic term are granted a <span className="text-amber-400 font-extrabold font-mono">{systemSettings.termDiscountPercentage}% discount</span> on their term fee.
                  </p>
                </div>
              </div>
              <div className="bg-neutral-950 px-3 py-1.5 border border-neutral-800 rounded font-mono text-[10px] uppercase font-bold shrink-0 text-amber-400/90 flex items-center gap-1.5 self-end md:self-auto">
                <Calendar className="w-3.5 h-3.5" />
                <span>Target: Week {systemSettings.termDiscountWeek} • {systemSettings.termDiscountPercentage}% Off</span>
              </div>
            </div>
          )}

          {/* Advanced Filter, Search, and Status bar */}
      <div className="bg-neutral-900 border-2 border-neutral-800 p-4 flex flex-col md:flex-row items-center gap-4">
        {/* Dynamic Search */}
        <div className="flex items-center gap-2 w-full md:flex-1">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              id="term-payers-search"
              type="text"
              placeholder="Search by name, roll, class, or status (paid, outstanding)..."
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
                  const discountInfo = getDiscountedTermFee(student, payments, activeTerm, currentDate, systemSettings);
                  const termFee = discountInfo.termFee;
                  const legacyDebt = student.legacyDebt || 0;
                  const totalExpected = termFee + legacyDebt;
                  const studentPayments = payments.filter(p => p.studentId === student.id && !p.isAbsent);
                  const totalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
                  const balanceDue = Math.max(0, totalExpected - totalPaid);
                  const isSettled = totalPaid >= totalExpected;
                  const percentPaid = Math.min(100, (totalPaid / totalExpected) * 100);
                  const isLowProgress = percentPaid < 25;

                  // Soft red/amber hue highlighting for low progress (<25%) or significant legacy debt or auto-flagged high debt
                  // Adaptive for daylight / dark mode
                  const isSignificantDebt = legacyDebt >= 100;
                  const hasAnyLegacyDebt = legacyDebt > 0;
                  const isAutoFlagged = autoFlaggedPupils.includes(student.id);

                  const rowClass = isLowProgress || isSignificantDebt
                    ? theme === 'daylight'
                      ? 'bg-red-50/70 hover:bg-red-100/80 transition-all border-l-4 border-l-red-500 group font-bold'
                      : 'bg-red-950/15 hover:bg-red-900/10 transition-all border-l-4 border-l-red-500/80 group font-bold'
                    : isAutoFlagged
                    ? theme === 'daylight'
                      ? 'bg-amber-50/60 hover:bg-amber-100/70 transition-all border-l-4 border-l-amber-500 group font-bold shadow-[inset_4px_0_0_0_#f59e0b]'
                      : 'bg-amber-950/20 hover:bg-amber-900/15 transition-all border-l-4 border-l-amber-500/80 group font-bold'
                    : hasAnyLegacyDebt
                    ? theme === 'daylight'
                      ? 'bg-amber-50/40 hover:bg-amber-100/50 transition-all border-l-4 border-l-red-400 group font-medium'
                      : 'bg-amber-955/5 hover:bg-amber-900/5 transition-all border-l-4 border-l-red-400/60 group font-medium'
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
                                isLowProgress || isSignificantDebt
                                  ? 'text-red-400 group-hover:text-red-300' 
                                  : 'text-white group-hover:text-amber-400'
                              }`}>
                                {student.name}
                              </span>
                              {isAutoFlagged && (
                                <span className="text-[8px] font-black tracking-wide text-amber-400 bg-amber-950/40 border border-amber-500/35 px-1.5 py-0.5 uppercase shrink-0 font-sans flex items-center gap-1 animate-pulse" title="High Debt Threshold Exceeded (Auto-Flagged)">
                                  ⚠️ AUTO-FLAGGED
                                </span>
                              )}
                              {isLowProgress && (
                                <span className="text-[8px] font-black tracking-wide text-red-500 bg-red-950/30 border border-red-500/35 px-1.5 py-0.5 uppercase shrink-0 font-sans">
                                  CRITICAL &lt; 25%
                                </span>
                              )}
                              {hasAnyLegacyDebt && (
                                <span className={`text-[8px] font-black tracking-wide px-1.5 py-0.5 uppercase shrink-0 font-sans ${
                                  isSignificantDebt 
                                    ? 'text-white bg-red-650 border border-red-500 animate-pulse' 
                                    : 'text-red-405 bg-red-955 border border-red-500/30'
                                }`}>
                                  Legacy Debt: GHC {legacyDebt.toFixed(2)}
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

                      <td className="px-6 py-4 font-mono font-black text-white text-left">
                        <div className="flex flex-col">
                          <span className={discountInfo.isApplied ? "text-emerald-400 font-black" : "text-white"}>
                            GHC {termFee.toFixed(2)}
                          </span>
                          {discountInfo.originalFee !== termFee && (
                            <span className="text-[9px] text-neutral-500 font-medium line-through">
                              GHC {discountInfo.originalFee.toFixed(2)}
                            </span>
                          )}
                          {discountInfo.isApplied && (
                            <span className="text-[8px] text-emerald-500 font-black mt-0.5 uppercase tracking-wide">
                              ✓ Early Bird
                            </span>
                          )}
                          {discountInfo.isEligibleButUnpaid && (
                            <span className="text-[8px] text-amber-500 font-black mt-0.5 uppercase tracking-wide animate-pulse">
                              ⏳ Early Bird Eligible
                            </span>
                          )}
                          {legacyDebt > 0 && (
                            <div className="text-[10px] text-red-400 font-bold mt-1" title="Legacy Debt before this system was adopted">
                              + GHC {legacyDebt.toFixed(2)} Legacy
                            </div>
                          )}
                        </div>
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
                        <div className="flex items-center justify-end gap-2 font-mono">
                          {!isSettled && (
                            <button
                              disabled={sendingReminderId === student.id}
                              onClick={() => handleSendSingleReminder(student)}
                              className="bg-emerald-950/40 hover:bg-emerald-900/30 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/50 px-3 py-1.5 text-xs font-black uppercase tracking-tight transition-all cursor-pointer rounded-xs inline-flex items-center gap-1.5 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                              title="Send quick WhatsApp payment reminder to guardian"
                            >
                              <MessageSquare size={13} className={sendingReminderId === student.id ? "animate-bounce" : ""} />
                              <span>{sendingReminderId === student.id ? "Sending..." : "Remind"}</span>
                            </button>
                          )}
                          {!isSettled && balanceDue >= (systemSettings?.debtThresholdLimit ?? 50) && (
                            <button
                              disabled={sendingReminderId === student.id}
                              onClick={() => handleSendSmsReminder(student, balanceDue)}
                              className="bg-amber-950/40 hover:bg-amber-900/30 text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/50 px-3 py-1.5 text-xs font-black uppercase tracking-tight transition-all cursor-pointer rounded-xs inline-flex items-center gap-1.5 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                              title="Send automated high-debt threshold warning alert"
                              id={`btn-sms-reminder-${student.id}`}
                            >
                              <Send size={13} className={sendingReminderId === student.id ? "animate-bounce" : ""} />
                              <span>Send SMS Reminder</span>
                            </button>
                          )}
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
  ) : viewMode === 'PAYMENT_HISTORY' ? (
    /* Student Payment History view */
    <div className="space-y-6 animate-fadeIn" id="payment-history-view-container">
      {/* Banner / Title Card */}
      <div className="bg-neutral-900 border-2 border-emerald-500/25 p-5 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans">
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-950/45 border border-emerald-400/30 px-2 py-0.5 rounded-sm font-mono inline-block">
            ★ SYSTEM CHRONOLOGICAL LEDGER
          </span>
          <h3 className="text-base font-black text-white uppercase tracking-tight font-mono">
            Student Payment History & Audits
          </h3>
          <p className="text-xs text-neutral-400 max-w-2xl leading-relaxed font-sans font-bold">
            Select a student from the active list to access their chronological log of all fees paid. Each entry details the transaction date, exact collection time, logged amount, and the registrar staff member who recorded it.
          </p>
        </div>
        <div className="bg-emerald-950/40 p-3.5 border border-emerald-800/40 flex items-center gap-3.5 shrink-0 select-none">
          <div className="bg-emerald-400 text-neutral-950 font-black p-2 rounded-xs font-mono">
            <Receipt size={18} />
          </div>
          <div>
            <span className="text-[9px] text-neutral-500 font-black uppercase tracking-widest block font-mono">Ledger Database</span>
            <div className="text-sm font-black text-white font-mono mt-0.5">
              {payments ? payments.filter(p => !p.isAbsent).length : 0} Receipts Filed
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-sans">
        {/* Left Side: Student Selection Column (span 4) */}
        <div className="lg:col-span-4 space-y-4 no-print">
          <div className="bg-neutral-900 border-2 border-neutral-800 p-4 space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-amber-400 font-mono">
              ★ Pupil Selector ({filteredHistoryStudents.length} match)
            </h4>

            {/* Selector Search Input */}
            <div className="relative">
              <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Search pupil by name or ID..."
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                className="w-full bg-neutral-950 border-2 border-neutral-850 pl-9 pr-4 py-2 text-xs text-white font-mono outline-none focus:border-amber-400 placeholder:text-neutral-600 transition-colors"
              />
            </div>

            {/* Class Filter Selection */}
            <div className="flex items-center gap-2">
              <Filter size={11} className="text-neutral-500 shrink-0" />
              <select
                value={historyClassFilter}
                onChange={(e) => setHistoryClassFilter(e.target.value)}
                className="w-full bg-neutral-950 border-2 border-neutral-855 px-2.5 py-1.5 text-[10.5px] font-bold text-white outline-none focus:border-amber-400 font-sans transition-colors"
              >
                <option value="ALL">All Cohort Classes</option>
                {studentClasses.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Student list box */}
          <div className="bg-neutral-900 border-2 border-neutral-800 p-3.5 space-y-2 max-h-[30rem] overflow-y-auto">
            {filteredHistoryStudents.length === 0 ? (
              <div className="py-12 text-center text-neutral-500 font-mono text-[10px] uppercase font-black">
                No matched pupils.
              </div>
            ) : (
              filteredHistoryStudents.map(student => {
                const isSelected = student.id === historySelectedStudentId;
                const studentFee = student.termFee || getStudentBaselineTermFee(student.class, systemSettings);
                const legacyDebt = student.legacyDebt || 0;
                const studentPayments = payments.filter(p => p.studentId === student.id && !p.isAbsent);
                const totalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
                const totalTarget = studentFee + legacyDebt;
                const isSettle = totalPaid >= totalTarget;
                const pct = Math.min(100, (totalPaid / totalTarget) * 100);

                return (
                  <button
                    key={student.id}
                    onClick={() => setHistorySelectedStudentId(student.id)}
                    className={`w-full text-left p-3 border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-amber-400 bg-neutral-950/80 shadow-md'
                        : 'border-neutral-855 bg-neutral-950/20 hover:bg-neutral-950/50 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {student.photoUrl ? (
                        <img 
                          src={student.photoUrl} 
                          alt={student.name} 
                          className="w-8 h-8 rounded-full object-cover border border-neutral-700 bg-neutral-950"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-neutral-950 text-neutral-500 font-black text-xs uppercase flex items-center justify-center border border-neutral-800 font-mono shrink-0">
                          {student.name.slice(0,2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className={`text-xs font-black uppercase truncate leading-tight ${isSelected ? 'text-amber-400' : 'text-white'}`}>
                          {student.name}
                        </h4>
                        <span className="text-[9px] text-neutral-500 font-mono font-bold block mt-0.5">
                          {student.class} • {student.rollNumber || 'SHC-' + student.id.substring(0, 5).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-[8.5px] font-mono font-black uppercase px-1.5 py-0.5 border ${
                        isSettle 
                          ? 'text-emerald-400 bg-emerald-950/20 border-emerald-500/20' 
                          : 'text-amber-400 bg-amber-950/20 border-amber-500/20'
                      }`}>
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Detailed Payment Chronicle Table/Feed (span 8) */}
        <div className="lg:col-span-8">
          {historySelectedStudent && historySelectedStudentFinances ? (
            <div className="space-y-6">
              {/* Pupil Details header card */}
              <div className="bg-neutral-900 border-2 border-neutral-800 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {historySelectedStudent.photoUrl ? (
                    <img 
                      src={historySelectedStudent.photoUrl} 
                      alt={historySelectedStudent.name} 
                      className="w-12 h-12 object-cover border-2 border-neutral-700 bg-neutral-950 rounded-xs shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-neutral-950 text-neutral-500 font-extrabold text-base uppercase flex items-center justify-center border border-neutral-855 font-mono shrink-0 rounded-xs">
                      {historySelectedStudent.name.slice(0,2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-tight leading-none">
                      {historySelectedStudent.name}
                    </h3>
                    <p className="text-[11px] text-amber-400 font-mono font-black mt-1.5 uppercase">
                      ROLL ID: {historySelectedStudent.rollNumber || 'SHC-' + historySelectedStudent.id.substring(0, 5).toUpperCase()}
                    </p>
                    <p className="text-[10px] text-neutral-505 font-bold mt-1 uppercase font-sans">
                      Grade {historySelectedStudent.class} • {historySelectedStudent.category} Group • Guardian: {historySelectedStudent.guardianPhone || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="no-print self-stretch sm:self-auto flex items-center justify-end">
                  <button
                    onClick={() => setSelectedStudent(historySelectedStudent)}
                    className="w-full sm:w-auto bg-neutral-950 hover:bg-neutral-850 text-white hover:text-amber-400 border border-neutral-800 hover:border-amber-400 px-4 py-2 text-xs font-black uppercase tracking-wider font-mono transition-all cursor-pointer rounded-xs flex items-center justify-center gap-1.5 hover:-translate-y-0.5 active:translate-y-0"
                    title="Open administrative modal to record dynamic installments, receipts, or send notifications"
                  >
                    <Receipt size={13} />
                    <span>Manage & Collect Fees</span>
                  </button>
                </div>
              </div>

              {/* Financial Stats Bento Sheet */}
              <div className="bg-neutral-900 border-2 border-neutral-800 p-5 space-y-4">
                <span className="text-[10px] font-black uppercase tracking-wide text-neutral-500 block">
                  ★ Fee Clearance Worksheet Balance Sheet
                </span>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-neutral-950 border border-neutral-850 p-3">
                    <span className="text-[8.5px] text-neutral-500 uppercase font-mono block">Baseline Term Quota</span>
                    <strong className="text-white text-sm font-mono font-black mt-1 block">
                      GHC {historySelectedStudentFinances.studentFee.toFixed(2)}
                    </strong>
                  </div>
                  <div className="bg-neutral-950 border border-neutral-850 p-3">
                    <span className="text-[8.5px] text-neutral-500 uppercase font-mono block">Legacy Debt</span>
                    <strong className="text-neutral-400 text-sm font-mono font-black mt-1 block">
                      GHC {historySelectedStudentFinances.legacyDebt.toFixed(2)}
                    </strong>
                  </div>
                  <div className="bg-neutral-950 border border-neutral-850 p-3">
                    <span className="text-[8.5px] text-emerald-400 uppercase font-mono block">Cleared Amount</span>
                    <strong className="text-emerald-400 text-sm font-mono font-black mt-1 block">
                      GHC {historySelectedStudentFinances.totalPaid.toFixed(2)}
                    </strong>
                  </div>
                  <div className="bg-neutral-950 border border-neutral-850 p-3">
                    <span className="text-[8.5px] text-red-400 uppercase font-mono block">Outstanding Arrears</span>
                    <strong className={`${historySelectedStudentFinances.isCompleted ? 'text-emerald-500' : 'text-red-500'} text-sm font-mono font-black mt-1 block`}>
                      GHC {historySelectedStudentFinances.balanceDue.toFixed(2)}
                    </strong>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="bg-neutral-950 p-3 border border-neutral-855">
                  <div className="flex items-center justify-between text-[9px] text-neutral-400 font-black uppercase mb-1.5 font-mono">
                    <span>Progress Clearance Ratio</span>
                    <span className={historySelectedStudentFinances.isCompleted ? 'text-emerald-400' : 'text-amber-400'}>
                      {historySelectedStudentFinances.percentDone.toFixed(1)}% Settled
                    </span>
                  </div>
                  <div className="w-full bg-neutral-900 h-2 rounded-full overflow-hidden border border-neutral-800">
                    <div 
                      className={`h-full ${historySelectedStudentFinances.isCompleted ? 'bg-emerald-500' : 'bg-amber-400'}`} 
                      style={{ width: `${historySelectedStudentFinances.percentDone}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Chronological Payment Logs feed/table */}
              <div className="bg-neutral-900 border-2 border-neutral-800 p-5 space-y-4" id="print-friendly-area">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-white font-mono flex items-center gap-1.5 font-bold">
                    🧾 CHRONOLOGICAL RECORD OF FEES PAID ({historySelectedStudentFinances.sortedPayments.length} transactions)
                  </h4>

                  <div className="no-print flex items-center gap-2">
                    {/* Sort Order Switcher */}
                    <button
                      onClick={() => setHistorySortOrder(order => order === 'asc' ? 'desc' : 'asc')}
                      className="bg-neutral-950 hover:bg-neutral-850 text-neutral-400 hover:text-white border border-neutral-800 px-2.5 py-1.5 text-[9px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer rounded-xs flex items-center gap-1"
                      title="Toggle between ascending (oldest first) and descending (newest first) chronological order"
                    >
                      <ArrowUpDown size={11} />
                      <span>Order: {historySortOrder === 'asc' ? 'Oldest First' : 'Newest First'}</span>
                    </button>

                    {/* Print chronicle Button */}
                    <button
                      onClick={() => {
                        window.print();
                      }}
                      className="bg-neutral-950 hover:bg-neutral-850 text-emerald-400 hover:text-emerald-300 border border-neutral-800 px-2.5 py-1.5 text-[9px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer rounded-xs flex items-center gap-1"
                      title="Trigger browser print window to print or export this chronological receipt ledger as a beautiful PDF"
                    >
                      <Printer size={11} />
                      <span>Print Chronicle</span>
                    </button>
                  </div>
                </div>

                {historySelectedStudentFinances.sortedPayments.length === 0 ? (
                  <div className="p-12 text-center text-neutral-500 bg-neutral-950 border border-neutral-850 animate-fadeIn">
                    <AlertCircle size={24} className="mx-auto text-neutral-600 mb-2" />
                    <p className="text-[11px] font-black uppercase tracking-wide text-neutral-400 font-mono">
                      No collections recorded in database
                    </p>
                    <p className="text-[9.5px] text-neutral-500 mt-1 max-w-sm mx-auto leading-relaxed font-sans font-bold">
                      This pupil has not paid any term fees installments or gate fees yet. Use the 'Manage & Collect Fees' panel above to record their first payment receipt.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto select-all">
                    <table className="w-full text-left border-collapse font-mono text-[11px]">
                      <thead>
                        <tr className="border-b border-neutral-800 text-neutral-500 text-[9px] uppercase tracking-wider">
                          <th className="py-3 px-3 font-bold">#</th>
                          <th className="py-3 px-3 font-bold">Cleared Date</th>
                          <th className="py-3 px-3 font-bold">Logged Time</th>
                          <th className="py-3 px-3 text-right font-bold">Cleared Amount</th>
                          <th className="py-3 px-3 font-bold">Recorded By (Staff)</th>
                          <th className="py-3 px-3 font-bold">Transaction Reference</th>
                          <th className="py-3 px-3 font-bold">Status</th>
                          <th className="py-3 px-3 font-bold text-right no-print">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-850/50">
                        {historySelectedStudentFinances.sortedPayments.map((p, idx) => {
                          const serial = historySortOrder === 'asc' ? idx + 1 : historySelectedStudentFinances.sortedPayments.length - idx;
                          return (
                            <tr key={p.id} className="hover:bg-neutral-950/40 transition-colors">
                              <td className="py-3 px-3 text-neutral-500 font-bold">
                                {serial}
                              </td>
                              <td className="py-3 px-3 font-bold text-white">
                                {p.date}
                              </td>
                              <td className="py-3 px-3 text-neutral-400">
                                {new Date(p.timestamp || p.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </td>
                              <td className="py-3 px-3 text-right font-black text-emerald-400">
                                GHC {p.amount.toFixed(2)}
                              </td>
                              <td className="py-3 px-3 text-neutral-300 font-sans font-bold">
                                {p.collectedBy || 'Administrator'}
                              </td>
                              <td className="py-3 px-3 text-[9.5px] text-neutral-550">
                                REF-{p.id.substring(0, 8).toUpperCase()}
                              </td>
                              <td className="py-3 px-3">
                                <span className="text-[8.5px] bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 font-bold uppercase rounded-xs">
                                  VERIFIED
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right no-print">
                                <button
                                  type="button"
                                  onClick={() => setSelectedReceiptPayment(p)}
                                  className="bg-neutral-900 hover:bg-neutral-800 text-amber-400 hover:text-amber-300 border border-neutral-850 px-2 py-1 text-[9px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer rounded-xs flex items-center gap-1 inline-flex shrink-0"
                                  title="View and print official payment receipt"
                                >
                                  <Receipt size={10} />
                                  <span>View Receipt</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Empty State: Pick a pupil onboarding card */
            <div className="bg-neutral-900 border-4 border-neutral-850 p-12 text-center text-neutral-400 space-y-5 flex flex-col items-center justify-center min-h-[30rem] animate-fadeIn">
              <div className="h-16 w-16 rounded-full bg-neutral-950 border border-neutral-800 flex items-center justify-center text-amber-400">
                <Receipt size={28} className="stroke-[1.5]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-black text-white uppercase tracking-wider font-mono">
                  ★ No Pupil Selected
                </h3>
                <p className="text-xs text-neutral-500 max-w-sm leading-relaxed font-sans font-bold">
                  Select a student from the active roster on the left side to examine their complete chronological payments log, audit collection records, and print ledger reports.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
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
            const termFee = student.termFee || getStudentBaselineTermFee(student.class, systemSettings);
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
                  <div className="flex justify-between text-xs border-t border-neutral-900 pt-2 mt-1">
                    <span className="text-neutral-500 uppercase font-black uppercase">Term Attendance:</span>
                    <strong className="text-amber-400 font-mono">
                      {selectedStudentFinances.presentDaysTerm} / {selectedStudentFinances.schoolDaysNoHolidaysCount} Days Present
                    </strong>
                  </div>
                </div>

                {/* Quick Payment Collection Form */}
                <div className="border border-neutral-800/80 p-5 bg-neutral-950/45 space-y-4">
                  {/* Tab bar header */}
                  <div className="flex border-b border-neutral-800">
                    <button
                      type="button"
                      onClick={() => setPaymentModeTab('cash')}
                      className={`flex-1 py-2 text-[10px] font-mono font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                        paymentModeTab === 'cash'
                          ? 'border-amber-400 text-amber-400 font-extrabold bg-neutral-900/50'
                          : 'border-transparent text-neutral-400 hover:text-white hover:bg-neutral-900/25'
                      }`}
                    >
                      Cash / Bank Log
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentModeTab('momo')}
                      className={`flex-1 py-2 text-[10px] font-mono font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                        paymentModeTab === 'momo'
                          ? 'border-emerald-400 text-emerald-400 font-extrabold bg-neutral-900/50'
                          : 'border-transparent text-neutral-400 hover:text-white hover:bg-neutral-900/25'
                      }`}
                    >
                      Mobile Money Push
                    </button>
                  </div>

                  {paymentModeTab === 'cash' ? (
                    <>
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
                            <div className="space-y-2">
                              <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="p-3 border border-emerald-400/30 bg-emerald-950/20 text-emerald-400 text-[10px] font-bold uppercase flex items-center justify-center gap-1.5"
                              >
                                <Check size={11} className="stroke-[3]" />
                                <span>{formSuccess}</span>
                              </motion.div>
                              
                              <button
                                type="button"
                                onClick={() => {
                                  if (!selectedStudent) return;
                                  const studentPayments = payments.filter(p => p.studentId === selectedStudent.id && !p.isAbsent);
                                  const latestPayment = [...studentPayments].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                                  if (latestPayment) {
                                    setSelectedReceiptPayment(latestPayment);
                                  } else {
                                    showToast("No transaction record found to generate receipt.");
                                  }
                                }}
                                className="w-full bg-amber-400 hover:bg-amber-300 text-neutral-950 font-black font-mono tracking-wider uppercase text-[9px] py-2.5 transition-all cursor-pointer flex items-center justify-center gap-1.5 rounded-xs"
                              >
                                <Receipt size={12} />
                                <span>Print Receipt for this payment</span>
                              </button>
                            </div>
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
                    </>
                  ) : (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="flex items-center gap-2 border-b border-neutral-850 pb-2">
                        <Smartphone size={14} className="text-emerald-400" />
                        <h4 className="text-[11px] font-black uppercase tracking-wider text-white font-mono">
                          Mobile Money Integration
                        </h4>
                      </div>

                      <div className="space-y-3 font-sans">
                        <div>
                          <label className="block text-[10px] text-neutral-400 uppercase font-black mb-1">
                            Amount to Bill ({currencySymbol})
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={momoAmountInput}
                            onChange={(e) => setMomoAmountInput(e.target.value)}
                            disabled={momoSimState !== 'idle' && momoSimState !== 'success' && momoSimState !== 'failed'}
                            placeholder="Amount e.g. 150.00"
                            className="w-full bg-neutral-950 border-2 border-neutral-800 py-2.5 px-3 text-xs text-white font-mono focus:border-emerald-400 focus:outline-none disabled:opacity-50"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-neutral-400 uppercase font-black mb-1">
                              Network Provider
                            </label>
                            <select
                              value={momoProvider}
                              onChange={(e) => setMomoProvider(e.target.value)}
                              disabled={momoSimState !== 'idle' && momoSimState !== 'success' && momoSimState !== 'failed'}
                              className="w-full bg-neutral-950 border-2 border-neutral-850 py-2.5 px-2 text-xs text-white font-mono focus:border-emerald-400 focus:outline-none disabled:opacity-50"
                            >
                              <option value="MTN">MTN MoMo</option>
                              <option value="Telecel">Telecel Cash</option>
                              <option value="AirtelTigo">AT Money</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] text-neutral-400 uppercase font-black mb-1">
                              Subscriber Phone
                            </label>
                            <input
                              type="tel"
                              value={momoPhone}
                              onChange={(e) => setMomoPhone(e.target.value.replace(/\D/g, ''))}
                              disabled={momoSimState !== 'idle' && momoSimState !== 'success' && momoSimState !== 'failed'}
                              placeholder="e.g. 0541234567"
                              className="w-full bg-neutral-950 border-2 border-neutral-850 py-2.5 px-3 text-xs text-white font-mono focus:border-emerald-400 focus:outline-none disabled:opacity-50"
                            />
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2 pt-2">
                          <button
                            type="button"
                            onClick={runMomoSimulation}
                            disabled={momoSimState !== 'idle' && momoSimState !== 'success' && momoSimState !== 'failed'}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-850 text-neutral-950 disabled:text-neutral-500 font-extrabold font-mono tracking-wider uppercase text-[10px] py-3.5 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Smartphone size={12} className="stroke-[2.5]" />
                            <span>
                              {momoSimState === 'idle' ? 'Trigger Live USSD Push' : momoSimState === 'success' ? 'Restart Simulation' : 'Simulator Running...'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const amt = parseFloat(momoAmountInput);
                              if (isNaN(amt) || amt <= 0) {
                                showToast("Please enter a valid amount to generate a payment link.");
                                return;
                              }
                              const link = `${window.location.origin}/pay/momo?studentId=${selectedStudent.id}&amount=${amt}&provider=${momoProvider}&phone=${momoPhone}`;
                              setGeneratedMomoLink(link);
                              navigator.clipboard.writeText(link);
                              showToast("Momo Payment checkout link generated and copied to clipboard!");
                            }}
                            className="w-full bg-neutral-900 hover:bg-neutral-800 text-amber-400 hover:text-amber-300 border border-neutral-800 py-2.5 text-[9px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Link size={12} />
                            <span>Generate & Copy Checkout Link</span>
                          </button>
                        </div>

                        {/* Live Link Feedback */}
                        {generatedMomoLink && (
                          <div className="bg-neutral-950 border border-neutral-850 p-2.5 space-y-1">
                            <span className="text-[8.5px] font-mono text-neutral-500 uppercase tracking-widest block font-bold">
                              🔗 Active Payment Portal URL (Copied)
                            </span>
                            <div className="flex gap-1.5 items-center">
                              <input
                                type="text"
                                readOnly
                                value={generatedMomoLink}
                                className="w-full bg-neutral-900 border-0 p-1.5 text-[9px] text-amber-400 font-mono focus:outline-none select-all"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(generatedMomoLink);
                                  showToast("Payment link copied!");
                                }}
                                className="bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 p-1.5 text-neutral-400 hover:text-white rounded-xs"
                                title="Copy"
                              >
                                <Copy size={11} />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Simulation Console Screen */}
                        {momoSimState !== 'idle' && (
                          <div className="bg-neutral-950 border-2 border-neutral-850 p-4 font-mono text-[9.5px] space-y-2">
                            <div className="flex justify-between items-center border-b border-neutral-900 pb-1.5">
                              <span className="text-neutral-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${momoSimState === 'success' ? 'bg-emerald-500' : 'bg-amber-400 animate-ping'}`} />
                                Live USSD Simulation Screen
                              </span>
                              <span className="text-neutral-550">
                                {momoSimState === 'success' ? 'SUCCESS ✓' : 'PROCESSING...'}
                              </span>
                            </div>

                            {/* Logs screen */}
                            <div className="space-y-1.5 max-h-36 overflow-y-auto select-text scrollbar-thin">
                              {momoLogs.map((log, idx) => (
                                <p key={idx} className="text-neutral-300 tracking-tight leading-relaxed">
                                  {log}
                                </p>
                              ))}
                            </div>

                            {/* Dynamic Live Indicator Graphic */}
                            {momoSimState !== 'success' && momoSimState !== 'failed' && (
                              <div className="pt-2 border-t border-neutral-900/50 flex items-center justify-between text-neutral-500 italic">
                                <span>Waiting on network handshake...</span>
                                <span className="animate-pulse">● TRANSMITTING</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2: Financial records list & receipt ledger (Span 7) */}
              <div className="md:col-span-7 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-4">
                    <span className="text-[10px] font-black uppercase tracking-wide text-neutral-500 block">
                      ★ TRANSACTION BALANCE SHEET
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDrawerActiveTab('ledger')}
                        className={`text-[9.5px] font-mono font-black uppercase tracking-wider px-3 py-1 border transition-all cursor-pointer ${
                          drawerActiveTab === 'ledger'
                            ? 'bg-amber-400 text-neutral-950 border-amber-400'
                            : 'bg-transparent text-neutral-400 border-neutral-850 hover:text-white'
                        }`}
                        id="tab-view-ledger"
                      >
                        Ledger & Receipts
                      </button>
                      <button
                        type="button"
                        onClick={() => setDrawerActiveTab('analytics')}
                        className={`text-[9.5px] font-mono font-black uppercase tracking-wider px-3 py-1 border transition-all cursor-pointer ${
                          drawerActiveTab === 'analytics'
                            ? 'bg-amber-400 text-neutral-950 border-amber-400'
                            : 'bg-transparent text-neutral-400 border-neutral-850 hover:text-white'
                        }`}
                        id="tab-view-analytics"
                      >
                        Visual Analytics
                      </button>
                    </div>
                  </div>

                  {drawerActiveTab === 'ledger' && (
                    <div className="animate-fadeIn">
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
                              
                              <div className="text-right flex items-center gap-3">
                                <div className="text-right">
                                  <div className="text-emerald-400 font-black text-sm">
                                    GHC {p.amount.toFixed(2)}
                                  </div>
                                  <span className="text-[8.5px] text-neutral-500 font-sans block mt-0.5 uppercase">
                                    By {p.collectedBy}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setSelectedReceiptPayment(p)}
                                  className="bg-neutral-900 hover:bg-neutral-800 text-amber-400 hover:text-amber-300 border border-neutral-800 px-2 py-1.5 text-[9px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer rounded-xs flex items-center gap-1 inline-flex shrink-0 self-center"
                                  title="Print / View Official Receipt"
                                >
                                  <Receipt size={10} />
                                  <span>Receipt</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {drawerActiveTab === 'analytics' && analyticsData && (
                    <div className="space-y-4 animate-fadeIn">
                      {/* Financial Progress Area Chart */}
                      <div className="bg-neutral-950 border border-neutral-850 p-4">
                        <div className="flex items-center justify-between border-b border-neutral-900 pb-2 mb-3">
                          <span className="text-[10px] font-black uppercase tracking-wide text-amber-400 font-mono flex items-center gap-1.5">
                            <TrendingUp size={12} className="text-amber-400" />
                            Cumulative Payment Clearance Trend
                          </span>
                          <span className="text-[9px] font-mono text-neutral-550 font-bold uppercase">
                            GHC CLEARANCE OVER TIME
                          </span>
                        </div>

                        {analyticsData.paymentChartData.length === 0 ? (
                          <div className="py-12 text-center text-neutral-500 font-sans">
                            <AlertCircle size={20} className="mx-auto text-neutral-600 mb-2" />
                            <p className="text-[11px] font-bold uppercase text-neutral-405 leading-normal">
                              No payment logs found for this term.
                            </p>
                            <p className="text-[9px] text-neutral-505 mt-0.5 leading-relaxed">
                              Installment collections logged on the left panel will draw a trend line here.
                            </p>
                          </div>
                        ) : (
                          <div className="h-44 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart
                                data={analyticsData.paymentChartData}
                                margin={{ top: 15, right: 10, left: -20, bottom: 0 }}
                              >
                                <defs>
                                  <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.25}/>
                                    <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid stroke="#171717" strokeDasharray="3 3" />
                                <XAxis 
                                  dataKey="date" 
                                  stroke="#525252" 
                                  fontSize={8} 
                                  fontFamily="monospace"
                                  tickLine={false}
                                />
                                <YAxis 
                                  stroke="#525252" 
                                  fontSize={8} 
                                  fontFamily="monospace"
                                  tickLine={false}
                                />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: '#0a0a0a', 
                                    borderColor: '#404040',
                                    borderRadius: '2px',
                                    fontFamily: 'monospace',
                                    fontSize: '9px',
                                    color: '#fff'
                                  }}
                                  labelStyle={{ color: '#909090', fontWeight: 'bold' }}
                                />
                                <ReferenceLine 
                                  y={selectedStudentFinances.totalTarget} 
                                  stroke="#f43f5e" 
                                  strokeDasharray="4 4" 
                                  label={{ 
                                    value: `Quota target: GHC ${selectedStudentFinances.totalTarget.toFixed(0)}`, 
                                    fill: '#f43f5e', 
                                    fontSize: 8, 
                                    position: 'top',
                                    fontFamily: 'monospace'
                                  }} 
                                />
                                <Area 
                                  type="monotone" 
                                  dataKey="cumulative" 
                                  name="Cumulative Paid"
                                  stroke="#eab308" 
                                  strokeWidth={2}
                                  fillOpacity={1} 
                                  fill="url(#colorCumulative)" 
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>

                      {/* Attendance & Registration Info Row */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        {/* Donut Chart: Overall attendance rate */}
                        <div className="md:col-span-5 bg-neutral-950 border border-neutral-850 p-4 flex flex-col justify-between">
                          <div>
                            <div className="border-b border-neutral-900 pb-1.5 mb-3">
                              <span className="text-[10px] font-black uppercase tracking-wide text-emerald-400 font-mono">
                                Term Attendance
                              </span>
                            </div>

                            {analyticsData.totalSchoolDays === 0 ? (
                              <div className="py-8 text-center text-neutral-500 text-[10px]">
                                No attendance records.
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                <div className="w-16 h-16 shrink-0 relative flex items-center justify-center">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                      <Pie
                                        data={analyticsData.attendancePieData}
                                        innerRadius={18}
                                        outerRadius={28}
                                        paddingAngle={3}
                                        dataKey="value"
                                      >
                                        <Cell fill="#10b981" /> {/* Present */}
                                        <Cell fill="#f43f5e" /> {/* Absent */}
                                      </Pie>
                                    </PieChart>
                                  </ResponsiveContainer>
                                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-[10px] font-mono font-black text-emerald-400 leading-none">
                                      {analyticsData.attendanceRate}%
                                    </span>
                                  </div>
                                </div>

                                <div className="space-y-1 font-mono text-[9px] leading-tight">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span className="text-neutral-400">Present:</span>
                                    <strong className="text-white">{analyticsData.totalPresent}d</strong>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                    <span className="text-neutral-400">Absent:</span>
                                    <strong className="text-white">{analyticsData.totalAbsent}d</strong>
                                  </div>
                                  <div className="pt-1.5 border-t border-neutral-900 text-[8px] text-neutral-550 uppercase">
                                    Out of {analyticsData.totalSchoolDays} school days
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Stacked Bar Chart: Weekly Distribution */}
                        <div className="md:col-span-7 bg-neutral-950 border border-neutral-850 p-4">
                          <div className="border-b border-neutral-900 pb-1.5 mb-3">
                            <span className="text-[10px] font-black uppercase tracking-wide text-neutral-400 font-mono">
                              Weekly Registration Frequency
                            </span>
                          </div>

                          {analyticsData.attendanceWeeklyChartData.length === 0 ? (
                            <div className="py-8 text-center text-neutral-500 text-[10px]">
                              No active school weeks yet.
                            </div>
                          ) : (
                            <div className="h-20 w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={analyticsData.attendanceWeeklyChartData}
                                  margin={{ top: 5, right: 5, left: -30, bottom: 0 }}
                                >
                                  <CartesianGrid stroke="#171717" vertical={false} />
                                  <XAxis 
                                    dataKey="week" 
                                    stroke="#525252" 
                                    fontSize={8} 
                                    fontFamily="monospace"
                                    tickLine={false}
                                  />
                                  <YAxis 
                                    stroke="#525252" 
                                    fontSize={8} 
                                    fontFamily="monospace"
                                    allowDecimals={false}
                                    tickLine={false}
                                  />
                                  <Tooltip
                                    contentStyle={{ 
                                      backgroundColor: '#0a0a0a', 
                                      borderColor: '#404040',
                                      borderRadius: '2px',
                                      fontFamily: 'monospace',
                                      fontSize: '9px',
                                      color: '#fff'
                                    }}
                                  />
                                  <Bar dataKey="present" name="Presents" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                                  <Bar dataKey="absent" name="Absents" stackId="a" fill="#f43f5e" radius={[1, 1, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </div>
                      </div>
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

      {/* Debt Report Modal Backdrop */}
      <AnimatePresence>
        {showDebtReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDebtReportModal(false)}
              className="absolute inset-0 bg-neutral-950/80 backdrop-blur-xs"
              id="debt-report-modal-backdrop"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-neutral-900 border-4 border-neutral-800 w-full max-w-5xl p-6 md:p-8 rounded shadow-2xl relative z-10 overflow-y-auto max-h-[90vh] flex flex-col gap-6"
              id="debt-report-panel"
            >
              {/* Close Button top-right */}
              <button
                onClick={() => setShowDebtReportModal(false)}
                className="absolute top-4 right-4 bg-neutral-950 text-neutral-400 hover:text-white hover:border-amber-400 p-2 border border-neutral-800 transition-colors cursor-pointer"
                title="Close modal"
              >
                <X size={16} />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 border-b-2 border-neutral-800 pb-4">
                <FileText size={22} className="text-amber-400" />
                <div>
                  <h3 className="text-base font-black uppercase tracking-widest text-white font-mono">
                    Legacy Debt Audit Report
                  </h3>
                  <p className="text-[11px] text-neutral-400 font-bold mt-0.5">
                    Dynamically compiled list of all active pupils currently carrying a pre-adoption outstanding legacy debt.
                  </p>
                </div>
              </div>

              {/* Printable Area Wrapper */}
              <div className="flex-1 overflow-y-auto pr-1">
                <div className="print-report-container p-6 bg-neutral-950 border border-neutral-800 rounded text-left" id="printable-debt-report-content">
                  {/* Print custom styles inside printable container */}
                  <style>{`
                    @media print {
                      body * {
                        visibility: hidden !important;
                      }
                      #printable-debt-report-content, #printable-debt-report-content * {
                        visibility: visible !important;
                      }
                      #printable-debt-report-content {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100% !important;
                        background: #ffffff !important;
                        color: #000000 !important;
                        border: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                      }
                      .print\\:no-print {
                        display: none !important;
                      }
                      .print\\:text-black {
                        color: #000000 !important;
                      }
                      .print\\:border-black {
                        border-color: #000000 !important;
                      }
                      .print\\:bg-white {
                        background-color: #ffffff !important;
                      }
                    }
                  `}</style>

                  {/* Document Header for Printing */}
                  <div className="mb-6 border-b-2 border-dashed border-neutral-800 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:border-black">
                    <div>
                      <h1 className="text-lg font-black text-white uppercase tracking-wider font-mono print:text-black">
                        SAAKO HOLY CHILD ACADEMY
                      </h1>
                      <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-tight print:text-black mt-0.5">
                        Academic Administration & Financial Ledger Registry
                      </p>
                      <p className="text-[9px] text-amber-400 font-mono font-black uppercase mt-1 print:text-black">
                        Report type: Active Pupils Legacy Debt Registry
                      </p>
                    </div>
                    <div className="text-left md:text-right font-mono text-[10px] text-neutral-400 print:text-black">
                      <div>Generated Date: <span className="text-white font-extrabold print:text-black">{currentDate}</span></div>
                      <div>Term Period: <span className="text-white font-extrabold print:text-black">{activeTerm?.name || 'Active Term'}</span></div>
                      <div>System Status: <span className="text-emerald-400 font-black uppercase print:text-black">Certified Ledger</span></div>
                    </div>
                  </div>

                  {/* Bento Stats Row in Report */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 print:border-black print:text-black">
                    <div className="bg-neutral-900/60 p-4 border border-neutral-800 print:bg-white print:border-black">
                      <span className="text-[8px] text-neutral-500 uppercase font-black tracking-widest block font-sans print:text-black">Debtors Count</span>
                      <strong className="text-base text-white font-mono font-black mt-1 block print:text-black">
                        {legacyDebtStudents.length} Active Pupils
                      </strong>
                    </div>
                    <div className="bg-neutral-900/60 p-4 border border-neutral-800 print:bg-white print:border-black">
                      <span className="text-[8px] text-red-400 uppercase font-black tracking-widest block font-sans print:text-black">Cumulative Arrears Sum</span>
                      <strong className="text-base text-red-400 font-mono font-black mt-1 block print:text-black">
                        GHC {legacyDebtStudents.reduce((sum, item) => sum + item.legacyDebt, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    </div>
                    <div className="bg-neutral-900/60 p-4 border border-neutral-800 print:bg-white print:border-black">
                      <span className="text-[8px] text-emerald-400 uppercase font-black tracking-widest block font-sans print:text-black">Remaining Balance Sum</span>
                      <strong className="text-base text-emerald-400 font-mono font-black mt-1 block print:text-black">
                        GHC {legacyDebtStudents.reduce((sum, item) => sum + item.balanceDue, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>

                  {/* Main Debtors Table */}
                  {legacyDebtStudents.length === 0 ? (
                    <div className="p-12 text-center text-neutral-500 bg-neutral-900/40 border border-neutral-800 rounded print:text-black print:bg-white print:border-black">
                      <AlertCircle size={24} className="mx-auto text-neutral-600 mb-2 print:text-black" />
                      <p className="text-xs font-black uppercase text-neutral-300 font-mono print:text-black">
                        No active pupil files carry legacy debt
                      </p>
                      <p className="text-[10px] text-neutral-500 mt-1 print:text-black">
                        Congratulations! All pupils are currently free from pre-adoption outstanding legacy balances.
                      </p>
                    </div>
                  ) : (
                    <div className="border border-neutral-800 overflow-x-auto print:border-black print:text-black">
                      <table className="w-full text-left font-mono text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-neutral-900 border-b border-neutral-800 uppercase tracking-widest text-[9px] text-neutral-400 font-black print:bg-white print:border-black print:text-black">
                            <th className="px-4 py-3 border-r border-neutral-800 print:border-black">Roll ID</th>
                            <th className="px-4 py-3 border-r border-neutral-800 print:border-black">Pupil Name</th>
                            <th className="px-4 py-3 border-r border-neutral-800 print:border-black text-center">Class</th>
                            <th className="px-4 py-3 border-r border-neutral-800 print:border-black">Guardian Phone</th>
                            <th className="px-4 py-3 border-r border-neutral-800 print:border-black text-right">Term Fee</th>
                            <th className="px-4 py-3 border-r border-neutral-800 print:border-black text-right">Legacy Debt</th>
                            <th className="px-4 py-3 border-r border-neutral-800 print:border-black text-right">Paid To Date</th>
                            <th className="px-4 py-3 text-right">Balance Due</th>
                          </tr>
                        </thead>
                        <tbody>
                          {legacyDebtStudents.map((item, index) => {
                            const s = item.student;
                            const rollId = s.rollNumber || 'SHC-' + s.id.substring(0, 5).toUpperCase();
                            return (
                              <tr 
                                key={s.id}
                                className={`border-b border-neutral-850 hover:bg-neutral-900/30 transition-colors print:border-black print:bg-white print:text-black ${
                                  index % 2 === 1 ? 'bg-neutral-950/40 print:bg-neutral-100/20' : ''
                                }`}
                              >
                                <td className="px-4 py-2.5 font-bold border-r border-neutral-855 print:border-black">{rollId}</td>
                                <td className="px-4 py-2.5 font-sans font-bold text-white print:text-black border-r border-neutral-855 print:border-black">{s.name}</td>
                                <td className="px-4 py-2.5 text-center font-bold border-r border-neutral-855 print:border-black">{s.class}</td>
                                <td className="px-4 py-2.5 border-r border-neutral-855 print:border-black">
                                  {s.guardianPhone ? (
                                    <span className="text-neutral-300 print:text-black font-semibold">{s.guardianPhone}</span>
                                  ) : (
                                    <span className="text-neutral-600 print:text-black font-extrabold italic uppercase tracking-wider text-[9px]">No Contact</span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-right border-r border-neutral-855 print:border-black text-neutral-400 print:text-black">GHC {item.studentFee.toFixed(2)}</td>
                                <td className="px-4 py-2.5 text-right font-black border-r border-neutral-855 print:border-black text-red-400 print:text-black">GHC {item.legacyDebt.toFixed(2)}</td>
                                <td className="px-4 py-2.5 text-right border-r border-neutral-855 print:border-black text-emerald-400 print:text-black">GHC {item.totalPaid.toFixed(2)}</td>
                                <td className={`px-4 py-2.5 text-right font-black ${item.balanceDue > 0 ? 'text-red-500' : 'text-emerald-500'} print:text-black`}>GHC {item.balanceDue.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Signatures block for printing */}
                  <div className="mt-12 hidden print:flex print-signature-block justify-between items-center text-[10px] font-mono border-t border-neutral-300 pt-8 print:text-black print:border-black">
                    <div>
                      <div className="border-b border-black w-48 mb-1.5" />
                      <p className="font-bold text-neutral-600">Issued By: Yakubu Hakeem</p>
                      <p className="text-[8.5px] text-neutral-400 mt-0.5">Accountant & Administrator</p>
                    </div>
                    <div className="text-right">
                      <div className="border-b border-black w-48 mb-1.5 ml-auto" />
                      <p className="font-bold text-neutral-600">Approved Stamp / Date</p>
                      <p className="text-[8.5px] text-neutral-400 mt-0.5">Saako Holy Child Academy Registry</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Footer Buttons */}
              <div className="border-t border-neutral-800 pt-5 flex flex-wrap gap-3.5 justify-end">
                <button
                  type="button"
                  onClick={downloadDebtCsvReport}
                  className="bg-neutral-950 hover:bg-neutral-850 text-white hover:text-amber-400 border border-neutral-800 hover:border-amber-400 px-5 py-3 text-xs font-black uppercase tracking-wider transition-all cursor-pointer rounded-xs flex items-center gap-2"
                >
                  <Download size={14} />
                  <span>Download CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black px-5 py-3 text-xs font-mono uppercase tracking-wider transition-all cursor-pointer rounded-xs flex items-center gap-2 border-b-2 border-amber-700"
                >
                  <Printer size={14} />
                  <span>Print Report / Save PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDebtReportModal(false)}
                  className="bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800 py-3 px-6 font-mono text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {whatsAppReminderModal && (
        <div id="whats-app-reminder-modal" className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-neutral-900 border-4 border-amber-400 p-6 max-w-lg w-full rounded-none space-y-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.55)] relative text-white">
            <button
              onClick={() => {
                setWhatsAppReminderModal(null);
                setCustomWAContact('');
                setSelectedStaffPhone('');
                setReminderChannel('whatsapp');
              }}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white font-mono text-xs p-1 cursor-pointer font-black border border-neutral-800 hover:border-red-500 hover:text-red-500 px-1.5 py-0.5 transition-all"
            >
              ✕ CLOSE
            </button>

            <div className="space-y-1">
              <span className="text-[9px] font-mono font-black uppercase tracking-widest text-amber-400">
                {reminderChannel === 'whatsapp' ? 'WhatsApp Reminder Dispatch' : 'SMS Reminder Dispatch'}
              </span>
              <h3 className="text-base font-black uppercase tracking-tight font-mono text-white">
                Remind: {whatsAppReminderModal.student.name}
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
                value={whatsAppReminderModal.messageText}
                className="w-full h-28 bg-neutral-950 border border-neutral-800 p-3 text-[10.5px] font-mono rounded-none text-neutral-350 resize-none select-all focus:outline-none"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(whatsAppReminderModal.messageText);
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
                        const urlText = encodeURIComponent(whatsAppReminderModal.messageText);
                        const waUrl = `https://api.whatsapp.com/send?text=${urlText}`;
                        if (typeof window !== 'undefined') {
                          window.open(waUrl, '_blank', 'noopener,noreferrer');
                          showToast("WhatsApp Contact Picker opened!");
                        }
                        // Trigger background logging
                        try {
                          await sendautomatedWhatsApp(
                            'Universal Share Picker',
                            whatsAppReminderModal.messageText,
                            whatsAppReminderModal.student.id,
                            whatsAppReminderModal.student.name,
                            'term-single-outstanding'
                          );
                        } catch (e) {}
                        setWhatsAppReminderModal(null);
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
                  {whatsAppReminderModal.defaultPhone && (
                    <div className="bg-neutral-950/40 p-3 border border-neutral-850 hover:border-amber-400/40 transition-all rounded-xs space-y-2">
                      <div>
                        <h4 className="text-xs font-black uppercase font-mono text-white">2. Registered Parent/Guardian</h4>
                        <p className="text-[9.5px] text-neutral-400 font-bold leading-tight">
                          Registered Number: <span className="text-amber-400 font-black">{whatsAppReminderModal.defaultPhone}</span>
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          let targetPhone = whatsAppReminderModal.defaultPhone.replace(/\D/g, "");
                          if (targetPhone.startsWith("0") && targetPhone.length === 10) {
                            targetPhone = "233" + targetPhone.substring(1);
                          }
                          const urlText = encodeURIComponent(whatsAppReminderModal.messageText);
                          const waUrl = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${urlText}`;
                          if (typeof window !== 'undefined') {
                            window.open(waUrl, '_blank', 'noopener,noreferrer');
                            showToast(`WhatsApp opened with Guardian (${whatsAppReminderModal.defaultPhone})!`);
                          }
                          // Trigger background logging
                          try {
                            await sendautomatedWhatsApp(
                              whatsAppReminderModal.defaultPhone,
                              whatsAppReminderModal.messageText,
                              whatsAppReminderModal.student.id,
                              whatsAppReminderModal.student.name,
                              'term-single-outstanding'
                            );
                          } catch (e) {}
                          setWhatsAppReminderModal(null);
                          setCustomWAContact('');
                          setSelectedStaffPhone('');
                        }}
                        className="w-full bg-neutral-950 hover:bg-neutral-850 text-white hover:text-amber-400 border border-neutral-800 py-2 text-[10px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer rounded-xs"
                      >
                        💬 Send directly to Guardian ({whatsAppReminderModal.defaultPhone})
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
                            const urlText = encodeURIComponent(whatsAppReminderModal.messageText);
                            const waUrl = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${urlText}`;
                            if (typeof window !== 'undefined') {
                              window.open(waUrl, '_blank', 'noopener,noreferrer');
                              showToast(`WhatsApp opened with Staff member!`);
                            }
                            // Trigger background logging
                            try {
                              await sendautomatedWhatsApp(
                                selectedStaffPhone,
                                whatsAppReminderModal.messageText,
                                whatsAppReminderModal.student.id,
                                whatsAppReminderModal.student.name,
                                'term-single-outstanding'
                              );
                            } catch (e) {}
                            setWhatsAppReminderModal(null);
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
                          const urlText = encodeURIComponent(whatsAppReminderModal.messageText);
                          const waUrl = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${urlText}`;
                          if (typeof window !== 'undefined') {
                            window.open(waUrl, '_blank', 'noopener,noreferrer');
                            showToast(`WhatsApp opened with custom recipient!`);
                          }
                          // Trigger background logging
                          try {
                            await sendautomatedWhatsApp(
                              customWAContact,
                              whatsAppReminderModal.messageText,
                              whatsAppReminderModal.student.id,
                              whatsAppReminderModal.student.name,
                              'term-single-outstanding'
                            );
                          } catch (e) {}
                          setWhatsAppReminderModal(null);
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
                        const smsUrl = `sms:?body=${encodeURIComponent(whatsAppReminderModal.messageText)}`;
                        if (typeof window !== 'undefined') {
                          window.open(smsUrl, '_blank');
                          showToast("Native SMS picker launched!");
                        }
                        // Copy message automatically for safety
                        navigator.clipboard.writeText(whatsAppReminderModal.messageText);
                        // Trigger background logging
                        try {
                          await sendautomatedWhatsApp(
                            'Universal SMS Picker',
                            whatsAppReminderModal.messageText,
                            whatsAppReminderModal.student.id,
                            whatsAppReminderModal.student.name,
                            'sms-single-outstanding'
                          );
                        } catch (e) {}
                        setWhatsAppReminderModal(null);
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
                  {whatsAppReminderModal.defaultPhone && (
                    <div className="bg-neutral-950/40 p-3 border border-neutral-850 hover:border-amber-400/40 transition-all rounded-xs space-y-2">
                      <div>
                        <h4 className="text-xs font-black uppercase font-mono text-white">2. Registered Parent/Guardian (SMS)</h4>
                        <p className="text-[9.5px] text-neutral-400 font-bold leading-tight">
                          Registered Phone: <span className="text-amber-400 font-black">{whatsAppReminderModal.defaultPhone}</span>
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={async () => {
                            let cleanPhone = whatsAppReminderModal.defaultPhone.replace(/\D/g, "");
                            const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(whatsAppReminderModal.messageText)}`;
                            if (typeof window !== 'undefined') {
                              window.open(smsUrl, '_blank');
                              showToast(`SMS App launched for ${whatsAppReminderModal.defaultPhone}!`);
                            }
                            navigator.clipboard.writeText(whatsAppReminderModal.messageText);
                            // Trigger background logging
                            try {
                              await sendautomatedWhatsApp(
                                whatsAppReminderModal.defaultPhone,
                                whatsAppReminderModal.messageText,
                                whatsAppReminderModal.student.id,
                                whatsAppReminderModal.student.name,
                                'sms-single-outstanding'
                              );
                            } catch (e) {}
                            setWhatsAppReminderModal(null);
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
                              const res = await sendautomatedWhatsApp(
                                whatsAppReminderModal.defaultPhone,
                                whatsAppReminderModal.messageText,
                                whatsAppReminderModal.student.id,
                                whatsAppReminderModal.student.name,
                                'sms-single-outstanding'
                              );
                              if (res.success) {
                                showToast("SMS dispatch token registered & logged successfully!");
                              } else {
                                showToast("Logged (Simulation Mode) successfully.");
                              }
                            } catch (e) {
                              showToast("Logged (Simulation Mode).");
                            }
                            setWhatsAppReminderModal(null);
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
                            const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(whatsAppReminderModal.messageText)}`;
                            if (typeof window !== 'undefined') {
                              window.open(smsUrl, '_blank');
                              showToast(`SMS App launched for ${selectedStaffPhone}!`);
                            }
                            navigator.clipboard.writeText(whatsAppReminderModal.messageText);
                            // Trigger background logging
                            try {
                              await sendautomatedWhatsApp(
                                selectedStaffPhone,
                                whatsAppReminderModal.messageText,
                                whatsAppReminderModal.student.id,
                                whatsAppReminderModal.student.name,
                                'sms-single-outstanding'
                              );
                            } catch (e) {}
                            setWhatsAppReminderModal(null);
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
                          const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(whatsAppReminderModal.messageText)}`;
                          if (typeof window !== 'undefined') {
                            window.open(smsUrl, '_blank');
                            showToast(`SMS App launched for ${customWAContact}!`);
                          }
                          navigator.clipboard.writeText(whatsAppReminderModal.messageText);
                          // Trigger background logging
                          try {
                            await sendautomatedWhatsApp(
                              customWAContact,
                              whatsAppReminderModal.messageText,
                              whatsAppReminderModal.student.id,
                              whatsAppReminderModal.student.name,
                              'sms-single-outstanding'
                            );
                          } catch (e) {}
                          setWhatsAppReminderModal(null);
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
      )}

      {selectedReceiptPayment && receiptStudent && receiptStudentFinances && (
        <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print animate-fade-in">
          <div className="bg-neutral-900 border-4 border-amber-400 p-6 max-w-lg w-full rounded-none space-y-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.55)] relative text-white">
            <button
              onClick={() => setSelectedReceiptPayment(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white font-mono text-xs p-1 cursor-pointer font-black border border-neutral-800 hover:border-red-500 hover:text-red-500 px-1.5 py-0.5 transition-all"
            >
              ✕ CLOSE
            </button>
            
            <div className="text-center space-y-1 pb-2 border-b border-neutral-850">
              <span className="text-[9px] font-mono font-black uppercase tracking-widest text-amber-400 block">SAAKO HOLY CHILD ACADEMY</span>
              <h3 className="text-sm font-black uppercase tracking-tight font-mono text-white">
                OFFICIAL TERM SCHEME RECEIPT
              </h3>
              <p className="text-[10px] text-neutral-500 font-mono">
                REF-{selectedReceiptPayment.id.substring(0, 8).toUpperCase()}
              </p>
            </div>

            {/* Receipt Content Card */}
            <div className="bg-neutral-950 border border-neutral-800 p-4 space-y-3 font-mono text-[11px] rounded-none">
              <div className="flex justify-between border-b border-neutral-900 pb-1.5">
                <span className="text-neutral-550 uppercase font-bold">PUPIL BENEFICIARY:</span>
                <span className="text-white font-black uppercase">{receiptStudent.name}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-900 pb-1.5">
                <span className="text-neutral-550 uppercase font-bold">ADMISSION ROLL ID:</span>
                <span className="text-amber-400 font-black">{receiptStudent.rollNumber || `SHC-${receiptStudent.id.substring(0, 5).toUpperCase()}`}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-900 pb-1.5">
                <span className="text-neutral-550 uppercase font-bold">COHORT CLASS:</span>
                <span className="text-white font-bold">{receiptStudent.class} ({receiptStudent.category})</span>
              </div>
              <div className="flex justify-between border-b border-neutral-900 pb-1.5">
                <span className="text-neutral-550 uppercase font-bold">DATE CLEARED:</span>
                <span className="text-white font-bold">{selectedReceiptPayment.date}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-900 pb-1.5">
                <span className="text-neutral-550 uppercase font-bold">REGISTRAR STAFF:</span>
                <span className="text-white font-bold">{selectedReceiptPayment.collectedBy || 'Certified Registrar'}</span>
              </div>
              
              {/* Financials details */}
              <div className="bg-neutral-900/40 p-3.5 border border-neutral-850 space-y-2 mt-4 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Subscribed Term Fee:</span>
                  <span className="text-neutral-200">GHC {receiptStudentFinances.termFee.toFixed(2)}</span>
                </div>
                {receiptStudentFinances.legacyDebt > 0 && (
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Legacy Debt Carried:</span>
                    <span className="text-neutral-200">GHC {receiptStudentFinances.legacyDebt.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-neutral-850/50 pt-1 text-xs">
                  <span className="text-neutral-400 uppercase font-black text-[9px]">Total Cumulative Paid:</span>
                  <span className="text-emerald-400 font-black">GHC {receiptStudentFinances.totalPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400 uppercase font-black text-[9px]">Remaining Balance:</span>
                  <span className={`${receiptStudentFinances.balanceDue > 0 ? 'text-rose-400' : 'text-emerald-400'} font-black`}>
                    GHC {receiptStudentFinances.balanceDue.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Transacted amount badge */}
              <div className="border-t-2 border-dashed border-neutral-800 pt-3 mt-4 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-neutral-500 font-black block uppercase">TRANSACTION STATUS</span>
                  <span className="text-[10px] text-emerald-400 font-black">✓ VERIFIED & RECORDED</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-neutral-500 font-black block uppercase">AMOUNT PAID</span>
                  <span className="text-base text-emerald-400 font-black">
                    GHC {selectedReceiptPayment.amount.toFixed(2)}
                  </span>
                </div>
              </div>
              
              {selectedReceiptPayment.notes && (
                <div className="text-[9.5px] text-neutral-400 border-t border-neutral-900 pt-2 italic leading-relaxed">
                  Memo: "{selectedReceiptPayment.notes}"
                </div>
              )}
            </div>

            {/* Receipt actions */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="bg-amber-400 hover:bg-amber-300 text-neutral-950 font-black font-mono tracking-wider uppercase text-[10px] py-3.5 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow"
              >
                <Printer size={13} className="stroke-[3.5]" />
                <span>Print Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => downloadTermReceipt(receiptStudent, selectedReceiptPayment, receiptStudentFinances.totalPaid, receiptStudentFinances.balanceDue)}
                className="bg-neutral-950 hover:bg-neutral-850 text-white hover:text-amber-400 border border-neutral-800 py-3.5 text-[10px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Download size={13} />
                <span>Download Docket</span>
              </button>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const messageText = `*SAAKO HOLY CHILD ACADEMY*\n*OFFICIAL TERM FEE RECEIPT*\n\n` +
                    `*Pupil:* ${receiptStudent.name}\n` +
                    `*Admission ID:* ${receiptStudent.rollNumber || `SHC-${receiptStudent.id.substring(0, 5).toUpperCase()}`}\n` +
                    `*Class:* ${receiptStudent.class} (${receiptStudent.category})\n` +
                    `*Payment Date:* ${selectedReceiptPayment.date}\n` +
                    `*Receipt Reference:* REF-${selectedReceiptPayment.id.substring(0, 8).toUpperCase()}\n\n` +
                    `_Financial Summary:_\n` +
                    `* Installment Settled: GHC ${selectedReceiptPayment.amount.toFixed(2)}\n` +
                    `* Total Term Fee: GHC ${receiptStudentFinances.termFee.toFixed(2)}\n` +
                    `${receiptStudentFinances.legacyDebt > 0 ? `* Legacy Debt Carried: GHC ${receiptStudentFinances.legacyDebt.toFixed(2)}\n` : ''}` +
                    `* Cumulative Paid to Date: GHC ${receiptStudentFinances.totalPaid.toFixed(2)}\n` +
                    `* Remaining Balance: GHC ${receiptStudentFinances.balanceDue.toFixed(2)}\n\n` +
                    `_Thank you for your prompt payment and support of our pupils. Verified by: ${selectedReceiptPayment.collectedBy || 'Certified Registrar'}._`;

                  setWhatsAppReminderModal({
                    student: receiptStudent,
                    messageText,
                    defaultPhone: receiptStudent.guardianPhone || ''
                  });
                }}
                className="w-full bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 hover:border-emerald-500 py-3 text-[10px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <MessageSquare size={12} />
                <span>Share on WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedReceiptPayment(null)}
                className="w-full bg-neutral-950 hover:bg-neutral-850 text-neutral-400 hover:text-white border border-neutral-800 py-3 text-[10px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                ✕ Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PORTRAIT PHYSICAL PRINT-READY RECEIPT PAGE (HIDDEN ON SCREEN, VISIBLE ON PRINT) */}
      {selectedReceiptPayment && receiptStudent && receiptStudentFinances && (
        <div id="print-term-receipt" className="hidden print:block bg-white text-black p-8 font-sans leading-relaxed max-w-[210mm] mx-auto">
          {/* DUAL COPIES OF THE RECEIPT: DOCK 1 (GUARDIAN'S COPY) & DOCK 2 (SCHOOL COPY) */}
          
          {/* -------------------- GUARDIAN COPY -------------------- */}
          <div className="space-y-4 pb-8">
            <div className="flex justify-between items-start border-b-2 border-black pb-3">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 border-2 border-black bg-black text-white font-black font-mono text-center flex items-center justify-center text-xs">
                  SHCA
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-tight">SAAKO HOLY CHILD ACADEMY</h2>
                  <span className="text-[9px] text-neutral-600 block uppercase">Official Scholastic Receipts Registry</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[9px] border-2 border-black font-black uppercase px-2 py-0.5">GUARDIAN'S COPY</span>
                <span className="text-[9px] font-mono block mt-1.5 text-neutral-600">REF: REF-{selectedReceiptPayment.id.substring(0, 8).toUpperCase()}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono my-3">
              <div>
                <span className="text-[8px] text-neutral-500 block">PUPIL BENEFICIARY:</span>
                <strong className="text-black uppercase text-sm block">{receiptStudent.name}</strong>
              </div>
              <div>
                <span className="text-[8px] text-neutral-500 block">ADMISSION ROLL NUMBER:</span>
                <strong className="text-black block">{receiptStudent.rollNumber || `SHC-${receiptStudent.id.substring(0, 5).toUpperCase()}`}</strong>
              </div>
              <div>
                <span className="text-[8px] text-neutral-500 block">COHORT GRADE:</span>
                <strong className="text-black block">{receiptStudent.class} ({receiptStudent.category})</strong>
              </div>
              <div>
                <span className="text-[8px] text-neutral-500 block">STUDENT GENDER:</span>
                <strong className="text-black block">{receiptStudent.gender || 'Not Specified'}</strong>
              </div>
              <div>
                <span className="text-[8px] text-neutral-500 block">GUARDIAN CONTACT:</span>
                <strong className="text-black block">{receiptStudent.guardianPhone || 'Not Specified'}</strong>
              </div>
              <div>
                <span className="text-[8px] text-neutral-500 block">BILLING SCHEME:</span>
                <strong className="text-black block">{receiptStudent.paymentType === 'Term' ? 'Term Fee Scheme' : 'Daily Gate Scheme'}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-[8px] text-neutral-500 block">DATE CLEARED:</span>
                <strong className="text-black block">{selectedReceiptPayment.date}</strong>
              </div>
            </div>

            {/* Financial statement breakdown table */}
            <table className="w-full text-left text-xs my-4 border-collapse font-mono">
              <thead>
                <tr className="border-b border-black">
                  <th className="py-1 font-bold">FEES TYPE DESCRIPTION</th>
                  <th className="py-1 text-right font-bold">DEBIT COMMITMENT</th>
                  <th className="py-1 text-right font-bold">CUMULATIVE PAID</th>
                  <th className="py-1 text-right font-bold">BALANCE DUE</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-neutral-200">
                  <td className="py-1.5">Standard School Term Subscription Fee</td>
                  <td className="py-1.5 text-right">GHC {receiptStudentFinances.termFee.toFixed(2)}</td>
                  <td className="py-1.5 text-right">-</td>
                  <td className="py-1.5 text-right">-</td>
                </tr>
                {receiptStudentFinances.legacyDebt > 0 && (
                  <tr className="border-b border-neutral-200">
                    <td className="py-1.5">Pre-adoption Legacy Arrears / Debt Carried</td>
                    <td className="py-1.5 text-right">GHC {receiptStudentFinances.legacyDebt.toFixed(2)}</td>
                    <td className="py-1.5 text-right">-</td>
                    <td className="py-1.5 text-right">-</td>
                  </tr>
                )}
                <tr className="border-b-2 border-black font-bold bg-neutral-50">
                  <td className="py-1.5 font-sans">Summary (Fee Obligation + Legacy Arrears)</td>
                  <td className="py-1.5 text-right">GHC {(receiptStudentFinances.termFee + receiptStudentFinances.legacyDebt).toFixed(2)}</td>
                  <td className="py-1.5 text-right text-emerald-700">GHC {receiptStudentFinances.totalPaid.toFixed(2)}</td>
                  <td className="py-1.5 text-right text-rose-700">GHC {receiptStudentFinances.balanceDue.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            {/* Cleared payment row with stamp */}
            <div className="flex justify-between items-center my-4 pt-1">
              <div className="border border-emerald-600/50 bg-emerald-50 p-2 border-dashed flex items-center gap-2 max-w-sm">
                <div className="text-[10px] text-emerald-800 leading-tight font-sans">
                  <div className="font-black text-[8px] uppercase tracking-wider">OFFICIAL SYSTEM SEAL</div>
                  <div>AUTHORIZED & CHECKED-IN</div>
                  <div className="font-mono text-[7.5px] text-neutral-500">SIGN: {selectedReceiptPayment.collectedBy || 'Certified Registrar'}</div>
                </div>
              </div>
              
              <div className="text-right">
                <span className="text-[8px] text-neutral-500 font-black uppercase block font-sans">INSTANT AMOUNT PAID</span>
                <strong className="text-lg font-black font-mono text-emerald-700">GHC {selectedReceiptPayment.amount.toFixed(2)}</strong>
              </div>
            </div>

            {selectedReceiptPayment.notes && (
              <div className="text-[9px] text-neutral-600 font-mono italic">
                Notes: "{selectedReceiptPayment.notes}"
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-8 pt-6 font-mono text-[9px]">
              <div className="border-t border-neutral-400 pt-1 text-center">
                Parent Signature & Date
              </div>
              <div className="border-t border-neutral-400 pt-1 text-center">
                Registrar Staff Sign / Stamp
              </div>
            </div>
          </div>

          {/* TEAR OFF DIVIDER */}
          <div className="border-t-2 border-dashed border-neutral-400 my-6 pt-4 text-center select-none text-[8.5px] font-mono tracking-widest text-neutral-500 flex items-center justify-center gap-2">
            <span>✂</span>
            <span>TEAR ALONG THIS LINE TO SEPARATE COPIES</span>
            <span>✂</span>
          </div>

          {/* -------------------- SCHOOL ARCHIVE COPY -------------------- */}
          <div className="space-y-4 pt-4">
            <div className="flex justify-between items-start border-b-2 border-black pb-3">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 border-2 border-black bg-black text-white font-black font-mono text-center flex items-center justify-center text-xs">
                  SHCA
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-tight">SAAKO HOLY CHILD ACADEMY</h2>
                  <span className="text-[9px] text-neutral-600 block uppercase">Official Scholastic Receipts Registry</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[9px] border-2 border-black bg-neutral-100 font-black uppercase px-2 py-0.5">SCHOOL ARCHIVE COPY</span>
                <span className="text-[9px] font-mono block mt-1.5 text-neutral-600">REF: REF-{selectedReceiptPayment.id.substring(0, 8).toUpperCase()}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono my-3">
              <div>
                <span className="text-[8px] text-neutral-500 block">PUPIL BENEFICIARY:</span>
                <strong className="text-black uppercase text-sm block">{receiptStudent.name}</strong>
              </div>
              <div>
                <span className="text-[8px] text-neutral-500 block">ADMISSION ROLL NUMBER:</span>
                <strong className="text-black block">{receiptStudent.rollNumber || `SHC-${receiptStudent.id.substring(0, 5).toUpperCase()}`}</strong>
              </div>
              <div>
                <span className="text-[8px] text-neutral-500 block">COHORT GRADE:</span>
                <strong className="text-black block">{receiptStudent.class} ({receiptStudent.category})</strong>
              </div>
              <div>
                <span className="text-[8px] text-neutral-500 block">STUDENT GENDER:</span>
                <strong className="text-black block">{receiptStudent.gender || 'Not Specified'}</strong>
              </div>
              <div>
                <span className="text-[8px] text-neutral-500 block">GUARDIAN CONTACT:</span>
                <strong className="text-black block">{receiptStudent.guardianPhone || 'Not Specified'}</strong>
              </div>
              <div>
                <span className="text-[8px] text-neutral-500 block">BILLING SCHEME:</span>
                <strong className="text-black block">{receiptStudent.paymentType === 'Term' ? 'Term Fee Scheme' : 'Daily Gate Scheme'}</strong>
              </div>
              <div className="col-span-2">
                <span className="text-[8px] text-neutral-500 block">DATE CLEARED:</span>
                <strong className="text-black block">{selectedReceiptPayment.date}</strong>
              </div>
            </div>

            {/* Condensed table for school archive */}
            <table className="w-full text-left text-[11px] my-3 border-collapse font-mono">
              <thead>
                <tr className="border-b border-black">
                  <th className="py-1 font-bold">SUMMARY BREAKDOWN</th>
                  <th className="py-1 text-right font-bold">AMOUNT VALUE</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-1">Standard Term fee Due</td>
                  <td className="py-1 text-right">GHC {receiptStudentFinances.termFee.toFixed(2)}</td>
                </tr>
                {receiptStudentFinances.legacyDebt > 0 && (
                  <tr>
                    <td className="py-1">Legacy Debt Carried</td>
                    <td className="py-1 text-right">GHC {receiptStudentFinances.legacyDebt.toFixed(2)}</td>
                  </tr>
                )}
                <tr>
                  <td className="py-1">Total Obligation</td>
                  <td className="py-1 text-right font-bold">GHC {(receiptStudentFinances.termFee + receiptStudentFinances.legacyDebt).toFixed(2)}</td>
                </tr>
                <tr className="border-t border-black font-bold">
                  <td className="py-1.5">THIS INSTALLMENT RECORDED</td>
                  <td className="py-1.5 text-right text-emerald-700">GHC {selectedReceiptPayment.amount.toFixed(2)}</td>
                </tr>
                <tr className="border-t border-neutral-300 font-bold">
                  <td className="py-1">Total Paid to Date (Including this)</td>
                  <td className="py-1 text-right">GHC {receiptStudentFinances.totalPaid.toFixed(2)}</td>
                </tr>
                <tr className="border-t border-neutral-300 font-bold">
                  <td className="py-1">Outstanding Balance Remaining</td>
                  <td className="py-1 text-right text-rose-700">GHC {receiptStudentFinances.balanceDue.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            {selectedReceiptPayment.notes && (
              <div className="text-[9px] text-neutral-600 font-mono italic">
                Memo: "{selectedReceiptPayment.notes}"
              </div>
            )}

            <div className="grid grid-cols-2 gap-8 pt-4 font-mono text-[9px]">
              <div className="border-t border-neutral-400 pt-1 text-center">
                Depositor Signature
              </div>
              <div className="border-t border-neutral-400 pt-1 text-center">
                Registrar Verification & Seal
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
