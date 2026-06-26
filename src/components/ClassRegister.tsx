/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useApp, PendingAlert, calculateStudentFinancialState } from '../context/AppContext';
import { StudentClass, Student, SchoolCategory, PaymentRecord } from '../types';
import { Check, X, Search, Landmark, BellRing, ChevronRight, ChevronLeft, CheckSquare, Users, MessageSquareCode, CalendarDays, CalendarPlus, CalendarX, Plus, ChevronDown, Trash2, Coins, History, Printer, Camera, Upload, Copy, Pencil, QrCode, AlertCircle, User, Phone, DollarSign, Award, ShieldAlert, CheckCircle2, TrendingUp, Info, Download, MessageSquare, RefreshCw, Layers } from 'lucide-react';
import { motion } from 'motion/react';
import { Html5Qrcode } from 'html5-qrcode';
import { SchoolLogo } from './SchoolLogo';
import { VoiceSearchButton } from './VoiceSearchButton';
import QRCode from 'qrcode';

export const ClassRegister: React.FC = React.memo(() => {
  const { 
    students, 
    payments, 
    currentDate, 
    setCurrentDate,
    recordPayment, 
    recordPresentZeroPay,
    recordAbsent,
    recordAdvancePayment,
    recordBackwardPayment,
    bulkRecordPayments,
    recordPupilBulkDates,
    adjustPayment,
    currentUser,
    deletePayment,
    clearDailyPaymentsForClass,
    deleteStudentPayments,
    terms,
    activeTerm,
    addTerm,
    editTerm,
    setActiveTerm,
    deleteTerm,
    addPublicHoliday,
    removePublicHoliday,
    users,
    updateStudent,
    deleteStudent,
    audioMuted,
    playFeedbackSound,
    sendautomatedWhatsApp,
    systemSettings,
    autoSendCheckInAlert,
    setAutoSendCheckInAlert,
    autoSendArrearsAlert,
    setAutoSendArrearsAlert
  } = useApp();

  const baseDailyFee = systemSettings?.baselineDailyFee ?? 5.00;
  const baseTermFee = systemSettings?.baselineTermFee ?? 350.00;
  const currencySymbol = systemSettings?.currencyCode || 'GHC';

  // Pick initial class based on teacher assignment or default B1
  const initialClass = useMemo(() => {
    if (currentUser?.role === 'Teacher') {
      if (currentUser.assignedClasses && currentUser.assignedClasses.length > 0) {
        return currentUser.assignedClasses[0];
      }
      if (currentUser.assignedClass) {
        return currentUser.assignedClass;
      }
    }
    return 'B1' as StudentClass;
  }, [currentUser]);

  const [selectedClass, setSelectedClass] = useState<StudentClass>(initialClass);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedStudentId, setHighlightedStudentId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'unmarked' | 'present' | 'absent' | 'arrears' | 'term_payers'>('all');
  const [guardianSmsStudent, setGuardianSmsStudent] = useState<Student | null>(null);
  const [successSms, setSuccessSms] = useState(false);
  const [receiptStudent, setReceiptStudent] = useState<Student | null>(null);
  const [selectedRecordForReceipt, setSelectedRecordForReceipt] = useState<{ student: Student; payment: PaymentRecord } | null>(null);
  const [lastLoggedStudent, setLastLoggedStudent] = useState<Student | null>(null);
  const [showPrintHardcopyModal, setShowPrintHardcopyModal] = useState(false);

  const [qrStudent, setQrStudent] = useState<Student | null>(null);
  const [generatedQrUrl, setGeneratedQrUrl] = useState<string>('');

  // Pupil-specific bulk check-in/payment state variables
  const [bulkPupil, setBulkPupil] = useState<Student | null>(null);
  const [selectedBulkDates, setSelectedBulkDates] = useState<string[]>([]);
  const [bulkActionType, setBulkActionType] = useState<'paid' | 'absent' | 'present_zero' | 'clear'>('paid');
  const [bulkCustomAmount, setBulkCustomAmount] = useState<string>('');

  // Pupil-specific daily note state variables
  const [editingNoteStudentId, setEditingNoteStudentId] = useState<string | null>(null);
  const [noteInputValue, setNoteInputValue] = useState<string>('');

  // Auto-reset filters when student class is toggled
  useEffect(() => {
    setStatusFilter('all');
    setSearchQuery('');
  }, [selectedClass]);

  useEffect(() => {
    if (!qrStudent) {
      setGeneratedQrUrl('');
      return;
    }
    const generate = async () => {
      try {
        const payload = `SAAKOCHECK:STUDENT:${qrStudent.id}`;
        const url = await QRCode.toDataURL(payload, {
          width: 360,
          margin: 3,
          color: {
            dark: '#171717',
            light: '#FFFFFF'
          }
        });
        setGeneratedQrUrl(url);
      } catch (err) {
        console.error('Failed to generate QR Code:', err);
      }
    };
    generate();
  }, [qrStudent]);

  // Global Shortcut: Pressing '/' focuses the register search field instantly
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if within input/textarea/select elements to prevent interrupting text typing
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.tagName === 'SELECT' ||
        activeEl.getAttribute('contenteditable') === 'true'
      );
      
      if (isInput) return;

      if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.getElementById('class-register-search');
        if (searchInput) {
          searchInput.focus();
          (searchInput as HTMLInputElement).select();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  const [lowBalanceThreshold, setLowBalanceThreshold] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('low_balance_threshold');
      return saved ? Number(saved) : 100;
    } catch {
      return 100;
    }
  });

  // Photo capturing/uploading states
  const [selectedPhotoStudent, setSelectedPhotoStudent] = useState<Student | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // QR code scanner states
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [testScanStudentId, setTestScanStudentId] = useState<string>('');
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [qrFeedbacks, setQrFeedbacks] = useState<{ id: string; text: string; type: 'success' | 'warning' | 'error' }[]>([]);
  const [qrScanMode, setQrScanMode] = useState<'auto' | 'custom_prompt' | 'view_only'>('auto');
  const [qrActivePromptStudent, setQrActivePromptStudent] = useState<Student | null>(null);
  const [qrCustomAmountInput, setQrCustomAmountInput] = useState<string>('');
  const [scanHistoryList, setScanHistoryList] = useState<{ id: string; studentId: string; studentName: string; rollNumber: string; class: string; timestamp: string; statusText: string; success: boolean }[]>([]);
  const lastScanTimeRef = React.useRef<{ code: string; time: number } | null>(null);

  const addQrFeedback = (text: string, type: 'success' | 'warning' | 'error') => {
    const id = Math.random().toString(36).substring(2, 9);
    setQrFeedbacks(prev => [{ id, text, type }, ...prev].slice(0, 5));
  };

  const playBeep = (type: 'success' | 'warning' | 'error' = 'success') => {
    if (audioMuted) return;
    if (type === 'success') {
      playFeedbackSound('success');
    } else if (type === 'error') {
      playFeedbackSound('error');
    } else {
      playFeedbackSound('warning');
    }
  };

  const handleQrCodeScanned = (decodedText: string) => {
    const trimmedText = decodedText.trim();
    if (!trimmedText) return;

    // Ignore additional scans if we are already displaying a custom amount prompt
    if (qrActivePromptStudent) {
      return;
    }

    const now = Date.now();
    if (lastScanTimeRef.current && lastScanTimeRef.current.code === trimmedText && (now - lastScanTimeRef.current.time) < 2500) {
      return;
    }
    lastScanTimeRef.current = { code: trimmedText, time: now };

    let parsedText = trimmedText;
    if (trimmedText.startsWith('SAAKOCHECK:STUDENT:')) {
      const parts = trimmedText.split(':');
      if (parts[2]) {
        parsedText = parts[2];
      }
    } else {
      try {
        const parsed = JSON.parse(trimmedText);
        if (parsed.id) parsedText = String(parsed.id);
        else if (parsed.rollNumber) parsedText = String(parsed.rollNumber);
      } catch (e) {
        if (trimmedText.includes('?id=')) {
          const urlParams = new URLSearchParams(trimmedText.split('?')[1]);
          const pId = urlParams.get('id');
          if (pId) parsedText = pId;
        }
      }
    }

    const cleanedText = parsedText.trim().toLowerCase();

    // Match with student catalog
    const student = students.find(s => 
      s.id.toLowerCase() === cleanedText ||
      s.rollNumber.toLowerCase() === cleanedText
    );

    if (!student) {
      playBeep('error');
      addQrFeedback(`⚠️ Code unrecognized: "${trimmedText}"`, 'error');
      return;
    }

    if (!student.active) {
      playBeep('warning');
      addQrFeedback(`⚠️ Pupil "${student.name}" is marked as inactive!`, 'warning');
      setScanHistoryList(prev => [{
        id: Math.random().toString(),
        studentId: student.id,
        studentName: student.name,
        rollNumber: student.rollNumber,
        class: student.class,
        timestamp: new Date().toLocaleTimeString(),
        statusText: 'Inactive Account',
        success: false
      }, ...prev].slice(0, 8));
      return;
    }

    const isPaidToday = payments.some(p => p.studentId === student.id && p.date === currentDate && !p.id.endsWith('_debt'));

    if (isPaidToday) {
      if (qrScanMode === 'custom_prompt') {
        playBeep('success');
        setQrActivePromptStudent(student);
        setQrCustomAmountInput(baseDailyFee.toFixed(2));
        addQrFeedback(`🔍 Top-Up Mode: "${student.name}" (${student.class}) is checked in. Enter advance top-up amount!`, 'warning');
        return;
      }

      playBeep('error');
      addQrFeedback(`⚠️ Already Registered: "${student.name}" (${student.class}) has checked in.`, 'warning');
      setScanHistoryList(prev => [{
        id: Math.random().toString(),
        studentId: student.id,
        studentName: student.name,
        rollNumber: student.rollNumber,
        class: student.class,
        timestamp: new Date().toLocaleTimeString(),
        statusText: 'Already Paid Today',
        success: false
      }, ...prev].slice(0, 8));
      return;
    }

    const debtInfo = studentDebtMap.get(student.id);
    const isAlreadyCoveredInAdvance = debtInfo?.isPaidToday && !isPaidToday;

    if (isAlreadyCoveredInAdvance) {
      if (qrScanMode === 'view_only') {
        playBeep('success');
        addQrFeedback(`🔍 Identified PREPAID: "${student.name}" (Class: ${student.class}). Pupil has an advance/prepaid balance covering today!`, 'success');
        setScanHistoryList(prev => [{
          id: Math.random().toString(),
          studentId: student.id,
          studentName: student.name,
          rollNumber: student.rollNumber,
          class: student.class,
          timestamp: new Date().toLocaleTimeString(),
          statusText: 'Prepaid Covered (View)',
          success: true
        }, ...prev].slice(0, 8));
      } else if (qrScanMode === 'custom_prompt') {
        playBeep('success');
        setQrActivePromptStudent(student);
        setQrCustomAmountInput(baseDailyFee.toFixed(2));
        addQrFeedback(`🔍 Prepaid Top-Up: "${student.name}" (${student.class}) is active. Enter custom overpayment/advance!`, 'warning');
      } else {
        // Automatically check them in with GHC 0.00 since they are prepaid
        recordPayment(student.id, true, 0.00, "Covered (Prepaid in advance block via remainder)");
        playBeep('success');
        addQrFeedback(`✅ Checked in: "${student.name}" (Class: ${student.class}) • Attendance registered via PREPAID advance balance (GHC 0.00)!`, 'success');
        setScanHistoryList(prev => [{
          id: Math.random().toString(),
          studentId: student.id,
          studentName: student.name,
          rollNumber: student.rollNumber,
          class: student.class,
          timestamp: new Date().toLocaleTimeString(),
          statusText: 'Present (Prepaid)',
          success: true
        }, ...prev].slice(0, 8));
      }
      return;
    }

    const dailyRate = Math.max(0, baseDailyFee - (student.discount || 0));

    if (qrScanMode === 'auto') {
      recordPayment(student.id, true);
      playBeep('success');
      addQrFeedback(`✅ Checked in: "${student.name}" (Class: ${student.class}) • Fee ${currencySymbol} ${dailyRate.toFixed(2)} logged!`, 'success');
      setScanHistoryList(prev => [{
        id: Math.random().toString(),
        studentId: student.id,
        studentName: student.name,
        rollNumber: student.rollNumber,
        class: student.class,
        timestamp: new Date().toLocaleTimeString(),
        statusText: `${currencySymbol} ${dailyRate.toFixed(2)} logged`,
        success: true
      }, ...prev].slice(0, 8));
    } else if (qrScanMode === 'custom_prompt') {
      playBeep('success');
      setQrActivePromptStudent(student);
      setQrCustomAmountInput(dailyRate.toFixed(2)); // auto-prefill with daily rate for super fast editing
      addQrFeedback(`🔍 Code Read: "${student.name}" (${student.class}). Enter/Confirm custom amount!`, 'warning');
    } else {
      playBeep('success');
      addQrFeedback(`🔍 Identified: "${student.name}" (Class: ${student.class}). Ready to record ${currencySymbol} ${dailyRate.toFixed(2)}.`, 'success');
      setScanHistoryList(prev => [{
        id: Math.random().toString(),
        studentId: student.id,
        studentName: student.name,
        rollNumber: student.rollNumber,
        class: student.class,
        timestamp: new Date().toLocaleTimeString(),
        statusText: 'Awaiting manual entry',
        success: true
      }, ...prev].slice(0, 8));
    }
  };

  useEffect(() => {
    if (!isQrModalOpen) {
      setQrFeedbacks([]);
      setTestScanStudentId('');
      return;
    }

    let isMounted = true;
    let qrScannerInstance: Html5Qrcode | null = null;
    let isCurrentlyScanning = false;

    const startScanner = async () => {
      try {
        setScannerError(null);
        const viewport = document.getElementById("qr-scanner-viewport");
        if (!viewport) {
          if (isMounted) {
            setScannerError("Scanner viewport element not mounted yet.");
          }
          return;
        }

        const html5QrCode = new Html5Qrcode("qr-scanner-viewport");
        qrScannerInstance = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (width, height) => {
              const min = Math.min(width, height);
              const size = Math.floor(min * 0.7);
              return { width: size, height: size };
            }
          },
          (decodedText) => {
            if (isMounted) {
              handleQrCodeScanned(decodedText);
            }
          },
          () => {} // silent parse failure callbacks to stay quiet
        );

        isCurrentlyScanning = true;

        if (!isMounted) {
          isCurrentlyScanning = false;
          html5QrCode.stop().then(() => {
            html5QrCode.clear();
          }).catch(err => console.warn("Delayed scanner stop cleanup error:", err));
        }
      } catch (err: any) {
        console.warn("Retrying scanner with camera enumeration:", err);
        try {
          if (!isMounted) return;
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            if (!isMounted) return;
            const html5QrCode = new Html5Qrcode("qr-scanner-viewport");
            qrScannerInstance = html5QrCode;

            await html5QrCode.start(
              devices[0].id,
              {
                fps: 10,
                qrbox: (width, height) => {
                  const min = Math.min(width, height);
                  const size = Math.floor(min * 0.7);
                  return { width: size, height: size };
                }
              },
              (decodedText) => {
                if (isMounted) {
                  handleQrCodeScanned(decodedText);
                }
              },
              () => {}
            );

            isCurrentlyScanning = true;

            if (!isMounted) {
              isCurrentlyScanning = false;
              html5QrCode.stop().then(() => {
                html5QrCode.clear();
              }).catch(err => console.warn("Delayed camera enumeration stop cleanup error:", err));
            }
          } else {
            if (isMounted) {
              setScannerError("No digital cameras detected. Ensure camera permissions are granted.");
            }
          }
        } catch (innerErr: any) {
          if (isMounted) {
            setScannerError(innerErr.message || "Failed to initialize video input streaming.");
          }
        }
      }
    };

    const timer = setTimeout(() => {
      startScanner();
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (qrScannerInstance) {
        if (isCurrentlyScanning) {
          qrScannerInstance.stop().then(() => {
            qrScannerInstance?.clear();
          }).catch(err => {
            console.error("Scanner stop cleanup error:", err);
          });
        } else {
          // If the startup sequence is still in flight, schedule a delayed cleanup to prevent camera lock.
          setTimeout(() => {
            try {
              qrScannerInstance?.stop().then(() => {
                qrScannerInstance?.clear();
              }).catch(() => {});
            } catch (e) {}
          }, 600);
        }
      }
    };
  }, [isQrModalOpen]);

  const handleQrCustomAmountSubmit = () => {
    if (!qrActivePromptStudent) return;
    
    const parsedAmount = parseFloat(qrCustomAmountInput.trim());
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      showToast("Please enter a valid non-negative custom amount.");
      return;
    }

    recordPayment(qrActivePromptStudent.id, true, parsedAmount);
    playBeep('success');
    addQrFeedback(`✅ Checked in: "${qrActivePromptStudent.name}" (Class: ${qrActivePromptStudent.class}) • Custom Fee GHC ${parsedAmount.toFixed(2)} logged!`, 'success');
    
    setScanHistoryList(prev => [{
      id: Math.random().toString(),
      studentId: qrActivePromptStudent.id,
      studentName: qrActivePromptStudent.name,
      rollNumber: qrActivePromptStudent.rollNumber,
      class: qrActivePromptStudent.class,
      timestamp: new Date().toLocaleTimeString(),
      statusText: `GHC ${parsedAmount.toFixed(2)} logged`,
      success: true
    }, ...prev].slice(0, 8));

    setQrActivePromptStudent(null);
  };

  useEffect(() => {
    if (qrActivePromptStudent) {
      const timer = setTimeout(() => {
        const inputEl = document.getElementById("qr-custom-amount-input");
        if (inputEl) {
          (inputEl as HTMLInputElement).focus();
          (inputEl as HTMLInputElement).select();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [qrActivePromptStudent]);

  // Success toast notification states
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const toastTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setSuccessMsg(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setSuccessMsg(null);
      toastTimeoutRef.current = null;
    }, 3000);
  };

  const handlePrevDate = () => {
    const parts = currentDate.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // 0-indexed
      const day = parseInt(parts[2], 10);
      const dateObj = new Date(year, month, day);
      dateObj.setDate(dateObj.getDate() - 1);
      
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const d = String(dateObj.getDate()).padStart(2, '0');
      const newDateStr = `${y}-${m}-${d}`;
      setCurrentDate(newDateStr);
      showToast(`Ledger date updated to ${newDateStr}.`);
    } else {
      // Fallback
      const d = new Date(currentDate);
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() - 1);
        const newDateStr = d.toISOString().split('T')[0];
        setCurrentDate(newDateStr);
        showToast(`Ledger date updated to ${newDateStr}.`);
      }
    }
  };

  const handleNextDate = () => {
    const parts = currentDate.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // 0-indexed
      const day = parseInt(parts[2], 10);
      const dateObj = new Date(year, month, day);
      dateObj.setDate(dateObj.getDate() + 1);
      
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const d = String(dateObj.getDate()).padStart(2, '0');
      const newDateStr = `${y}-${m}-${d}`;
      setCurrentDate(newDateStr);
      showToast(`Ledger date updated to ${newDateStr}.`);
    } else {
      // Fallback
      const d = new Date(currentDate);
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() + 1);
        const newDateStr = d.toISOString().split('T')[0];
        setCurrentDate(newDateStr);
        showToast(`Ledger date updated to ${newDateStr}.`);
      }
    }
  };

  const startCamera = async (modeOverride?: 'user' | 'environment') => {
    setCameraError(null);
    const targetMode = modeOverride || cameraFacingMode;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 320, facingMode: targetMode }
      });
      setCameraStream(stream);
      setCameraActive(true);
      // Wait a tiny bit for the block to render videoRef
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 50);
    } catch (err: any) {
      console.error(err);
      setCameraError('Permission denied or camera device not found.');
    }
  };

  const toggleCameraFacingMode = async () => {
    const nextMode = cameraFacingMode === 'user' ? 'environment' : 'user';
    setCameraFacingMode(nextMode);
    if (cameraActive) {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 320, facingMode: nextMode }
        });
        setCameraStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.error(err);
        setCameraError('Failed to toggle camera. The requested mode may not be supported on this device.');
      }
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && selectedPhotoStudent) {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const video = videoRef.current;
        const size = Math.min(video.videoWidth || 320, video.videoHeight || 320);
        const xOffset = ((video.videoWidth || 320) - size) / 2;
        const yOffset = ((video.videoHeight || 320) - size) / 2;
        ctx.drawImage(video, xOffset, yOffset, size, size, 0, 0, 300, 300);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        updateStudent({
          ...selectedPhotoStudent,
          photoUrl: dataUrl
        });
        stopCamera();
        setSelectedPhotoStudent(null);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedPhotoStudent) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          updateStudent({
            ...selectedPhotoStudent,
            photoUrl: reader.result
          });
          setSelectedPhotoStudent(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Action/Delete Confirmation Modal State (e.g. for student delete, deactivate, or term delete)
  const [deleteConf, setDeleteConf] = useState<{
    isOpen: boolean;
    type: 'student_delete' | 'student_deactivate' | 'term_delete';
    targetId: string;
    targetName: string;
    userInput: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    type: 'student_delete',
    targetId: '',
    targetName: '',
    userInput: '',
    onConfirm: () => {}
  });

  // Term management UI states
  const [showTermCreator, setShowTermCreator] = useState(false);
  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [showHolidayManager, setShowHolidayManager] = useState(false);
  const [holidayInputDate, setHolidayInputDate] = useState('');
  const [newTermName, setNewTermName] = useState('');
  const [newTermStartDate, setNewTermStartDate] = useState('2026-06-01');
  const [newTermDays, setNewTermDays] = useState(20); // default to 4 school weeks (20 days)
  const [newTermIsActive, setNewTermIsActive] = useState(true);
  const [isTermDropdownOpen, setIsTermDropdownOpen] = useState(false);

  // Advance payment modal states
  const [advanceStudent, setAdvanceStudent] = useState<Student | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState<number>(25); // GHC 25 default
  const [advanceSuccess, setAdvanceSuccess] = useState(false);

  // Debt backward payment modal states
  const [debtStudent, setDebtStudent] = useState<Student | null>(null);
  const [debtAmount, setDebtAmount] = useState<number>(5);
  const [includeTodayInDebtSettle, setIncludeTodayInDebtSettle] = useState<boolean>(true);
  const [debtSuccess, setDebtSuccess] = useState(false);

  // Transaction History modal states
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);
  const [historyModalTab, setHistoryModalTab] = useState<'profile' | 'ledger' | 'print'>('profile');
  const [paymentToDelete, setPaymentToDelete] = useState<{ id: string; label: string; studentName: string } | null>(null);
  const [showDeleteAllPaymentsConfirm, setShowDeleteAllPaymentsConfirm] = useState(false);
  const [showResetDailyConfirm, setShowResetDailyConfirm] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [whatsAppShareModal, setWhatsAppShareModal] = useState<{
    type: 'profile' | 'invoice' | 'receipt' | 'arrears_warning' | 'check_in';
    student: Student;
    payment?: PaymentRecord;
    messageText: string;
    defaultPhone: string;
  } | null>(null);
  const [customWAContact, setCustomWAContact] = useState('');
  const [selectedStaffPhone, setSelectedStaffPhone] = useState('');

  useEffect(() => {
    setSelectedStudentIds([]);
  }, [selectedClass, currentDate]);

  const isHoliday = useMemo(() => {
    return !!activeTerm?.publicHolidays?.includes(currentDate);
  }, [activeTerm, currentDate]);

  // Manual payment state for individual student row inline input
  const [manualAmountStudentId, setManualAmountStudentId] = useState<string | null>(null);
  const [manualAmountValue, setManualAmountValue] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'dirty' | 'saving' | 'saved' | 'failed'>('idle');
  const lastSavedValueRef = React.useRef<string>('');
  const autoSaveTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Listen for manual value changes to update row input indicators without triggering background database calls
  useEffect(() => {
    if (!manualAmountStudentId) {
      setSaveStatus('idle');
      return;
    }
    const amt = parseFloat(manualAmountValue);
    if (isNaN(amt) || amt < 0) {
      setSaveStatus('failed');
      return;
    }
    if (manualAmountValue !== lastSavedValueRef.current) {
      setSaveStatus('dirty');
    } else {
      setSaveStatus('saved');
    }
  }, [manualAmountValue, manualAmountStudentId]);

  // Grouped classes lists for selection
  const preSchoolClasses: StudentClass[] = ['Nursery', 'KG1', 'KG2'];
  const primaryClasses: StudentClass[] = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'];
  const jhsClasses: StudentClass[] = ['B7', 'B8', 'B9'];

  // Calculate daily (today's) cash totals per class
  const classDailyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    payments.forEach(p => {
      if (p.date === currentDate) {
        totals[p.class] = (totals[p.class] || 0) + p.amount;
      }
    });
    return totals;
  }, [payments, currentDate]);

  // Calculate total student enrolment per class
  const classEnrolments = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach(s => {
      if (s.active) {
        counts[s.class] = (counts[s.class] || 0) + 1;
      }
    });
    return counts;
  }, [students]);

  // All active students in selected class
  const classStudents = useMemo(() => {
    return students
      .filter(s => s.class === selectedClass && s.active)
      .sort((a, b) => (a.rollNumber || '').localeCompare(b.rollNumber || '', undefined, { numeric: true, sensitivity: 'base' }));
  }, [students, selectedClass]);

  // Today's paid student ids in this class
  const paidStudentMap = useMemo(() => {
    const paidList = payments.filter(p => p.class === selectedClass && p.date === currentDate && !p.id.endsWith('_debt'));
    const map = new Map<string, { paymentId: string; verified: boolean; collectedBy: string; isAbsent?: boolean; amount?: number; notes?: string }>();
    paidList.forEach(p => {
      map.set(p.studentId, { paymentId: p.id, verified: p.verified, collectedBy: p.collectedBy, isAbsent: p.isAbsent, amount: p.amount, notes: p.notes });
    });
    return map;
  }, [payments, selectedClass, currentDate]);

  // Map of student debt: unpaid past school days and total GHC arrears (running balance)
  const studentDebtMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calculateStudentFinancialState>>();
    
    // Calculate for active class students
    classStudents.forEach(student => {
      const state = calculateStudentFinancialState(student, payments, activeTerm, currentDate, baseDailyFee);
      map.set(student.id, state);
    });

    // Also calculate for historyStudent if specified and not already calculated
    if (historyStudent && !map.has(historyStudent.id)) {
      const state = calculateStudentFinancialState(historyStudent, payments, activeTerm, currentDate, baseDailyFee);
      map.set(historyStudent.id, state);
    }

    // Also calculate for debtStudent if specified and not already calculated
    if (debtStudent && !map.has(debtStudent.id)) {
      const state = calculateStudentFinancialState(debtStudent, payments, activeTerm, currentDate, baseDailyFee);
      map.set(debtStudent.id, state);
    }

    return map;
  }, [classStudents, payments, activeTerm, currentDate, baseDailyFee, historyStudent, debtStudent]);

  // Filter students by search query and status filter
  const filteredStudents = useMemo(() => {
    let list = classStudents;

    if (statusFilter === 'unmarked') {
      list = list.filter(s => !paidStudentMap.has(s.id));
    } else if (statusFilter === 'present') {
      list = list.filter(s => paidStudentMap.has(s.id) && !paidStudentMap.get(s.id)?.isAbsent);
    } else if (statusFilter === 'absent') {
      list = list.filter(s => paidStudentMap.has(s.id) && !!paidStudentMap.get(s.id)?.isAbsent);
    } else if (statusFilter === 'arrears') {
      list = list.filter(s => {
        const debtObj = studentDebtMap.get(s.id);
        const outstanding = (debtObj?.outstandingBalance || 0);
        return outstanding > 0;
      });
    } else if (statusFilter === 'term_payers') {
      list = list.filter(s => s.paymentType === 'Term');
    }

    if (!searchQuery.trim()) return list;
    return list.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [classStudents, searchQuery, statusFilter, paidStudentMap, studentDebtMap]);

  // Find the first unmarked student in the current view to automatically guide high-volume workflow
  const nextUnmarkedStudent = useMemo(() => {
    return filteredStudents.find(s => {
      const pInfo = paidStudentMap.get(s.id);
      const isP = !!pInfo && !pInfo.isAbsent;
      const isA = !!pInfo && !!pInfo.isAbsent;
      return !isP && !isA;
    });
  }, [filteredStudents, paidStudentMap]);

  // Quick-search matches for absolute positioned suggestion overlay
  const quickSearchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    return classStudents.filter(s => 
      s.name.toLowerCase().includes(query) ||
      s.rollNumber.toLowerCase().includes(query)
    ).slice(0, 5);
  }, [classStudents, searchQuery]);

  // Handle selecting a student from the quick-search results to automatically scroll-to-view and high-contrast flash/highlight
  const handleSelectQuickSearchStudent = (student: Student) => {
    setSearchQuery('');
    setHighlightedStudentId(student.id);

    showToast(`Located "${student.name}" in today's class ledger.`);

    setTimeout(() => {
      const targetId = `student-row-${student.id}`;
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);

    // Auto-clear highlight after 3 seconds
    setTimeout(() => {
      setHighlightedStudentId(null);
    }, 3000);
  };

  // Helper to automatically scroll to the next unmarked student in the current filtered class view after marking a payment or absent
  const scrollToNextUnpaid = (currentStudentId: string) => {
    // Find index of current student that was just marked
    const currentIndex = filteredStudents.findIndex(s => s.id === currentStudentId);
    if (currentIndex === -1) return;

    // Search forward from current student for the next unmarked student (neither paid nor absent today)
    let nextStudent = filteredStudents.slice(currentIndex + 1).find(s => {
      const pInfo = paidStudentMap.get(s.id);
      const isP = !!pInfo && !pInfo.isAbsent;
      const isA = !!pInfo && !!pInfo.isAbsent;
      return !isP && !isA;
    });

    // If none found forward, search from the beginning to the current student
    if (!nextStudent) {
      nextStudent = filteredStudents.slice(0, currentIndex).find(s => {
        const pInfo = paidStudentMap.get(s.id);
        const isP = !!pInfo && !pInfo.isAbsent;
        const isA = !!pInfo && !!pInfo.isAbsent;
        return !isP && !isA;
      });
    }

    // Fallback: if no unmarked students exist at all, just scroll to the immediate next physical student in list
    if (!nextStudent && currentIndex + 1 < filteredStudents.length) {
      nextStudent = filteredStudents[currentIndex + 1];
    }

    // Scroll smoothly to that student container row
    if (nextStudent) {
      const targetId = `student-row-${nextStudent.id}`;
      setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150); // Small timeout to let state update and class list render
    }
  };

  // Summaries
  const paidCount = useMemo(() => {
    return classStudents.filter(s => {
      const isAbsent = paidStudentMap.has(s.id) && !!paidStudentMap.get(s.id)!.isAbsent;
      const isPaid = !isAbsent && (studentDebtMap.get(s.id)?.isPaidToday || false);
      return isPaid;
    }).length;
  }, [classStudents, paidStudentMap, studentDebtMap]);

  const absentCount = useMemo(() => {
    return classStudents.filter(s => paidStudentMap.has(s.id) && !!paidStudentMap.get(s.id)!.isAbsent).length;
  }, [classStudents, paidStudentMap]);

  const outstandingCount = Math.max(0, classStudents.length - paidCount - absentCount);

  const collectionTotal = useMemo(() => {
    return payments
      .filter(p => p.class === selectedClass && p.date === currentDate && !p.isAbsent)
      .reduce((acc, p) => acc + p.amount, 0);
  }, [payments, selectedClass, currentDate]);

  const classExpectedFees = useMemo(() => {
    return classStudents.reduce((acc, s) => {
      // Term payers do not contribute to daily cash drawer total expectations
      if (s.paymentType === 'Term') {
        return acc;
      }
      // Standard daily fee is dynamic less discount
      const dailyRate = Math.max(0, baseDailyFee - (s.discount || 0));
      return acc + dailyRate;
    }, 0);
  }, [classStudents, baseDailyFee]);

  const classCollectionPercentage = useMemo(() => {
    if (classExpectedFees <= 0) return 0;
    return (collectionTotal / classExpectedFees) * 100;
  }, [collectionTotal, classExpectedFees]);

  // Real-time school-wide attendance metrics for current date
  const schoolAttendanceStats = useMemo(() => {
    const activeStudents = students.filter(s => s.active);
    const totalActive = activeStudents.length;
    
    const todayPayments = payments.filter(p => p.date === currentDate && !p.id.endsWith('_debt'));
    const presentIds = new Set(todayPayments.filter(p => !p.isAbsent).map(p => p.studentId));
    const absentIds = new Set(todayPayments.filter(p => p.isAbsent).map(p => p.studentId));
    
    let checkedInCount = 0;
    let absentCountSchool = 0;
    
    activeStudents.forEach(s => {
      if (presentIds.has(s.id)) {
        checkedInCount++;
      } else if (absentIds.has(s.id)) {
        absentCountSchool++;
      }
    });
    
    const markedCount = checkedInCount + absentCountSchool;
    const percentage = totalActive > 0 ? (markedCount / totalActive) * 100 : 0;
    
    return {
      totalActive,
      checkedIn: checkedInCount,
      absent: absentCountSchool,
      unmarked: Math.max(0, totalActive - markedCount),
      percentage: Math.round(percentage)
    };
  }, [students, payments, currentDate]);

  // Real-time selected-class attendance metrics for current date
  const classAttendanceStats = useMemo(() => {
    const totalActive = classStudents.length;
    const checkedIn = classStudents.filter(s => {
      const isAbsent = paidStudentMap.has(s.id) && !!paidStudentMap.get(s.id)!.isAbsent;
      const isPaid = !isAbsent && (studentDebtMap.get(s.id)?.isPaidToday || false);
      return isPaid;
    }).length;
    
    const absent = classStudents.filter(s => paidStudentMap.has(s.id) && !!paidStudentMap.get(s.id)!.isAbsent).length;
    const markedCount = checkedIn + absent;
    const percentage = totalActive > 0 ? (markedCount / totalActive) * 100 : 0;
    
    return {
      totalActive,
      checkedIn,
      absent,
      unmarked: Math.max(0, totalActive - markedCount),
      percentage: Math.round(percentage)
    };
  }, [classStudents, paidStudentMap, studentDebtMap]);

  const globalCollectionTotal = useMemo(() => {
    return payments
      .filter(p => p.date === currentDate && !p.isAbsent)
      .reduce((acc, p) => acc + p.amount, 0);
  }, [payments, currentDate]);

  const globalPaidCount = useMemo(() => {
    return payments.filter(p => p.date === currentDate && !p.isAbsent).length;
  }, [payments, currentDate]);

  // Group school days of activeTerm into weeks of Mon-Fri
  const weeksOfTerm = useMemo(() => {
    if (!activeTerm || !activeTerm.schoolDays || !activeTerm.schoolDays.length) return [];
    
    const weeks: { weekNumber: number; days: string[] }[] = [];
    let currentWeek: string[] = [];
    let weekIndex = 1;
    
    activeTerm.schoolDays.forEach((dayStr) => {
      currentWeek.push(dayStr);
      if (currentWeek.length === 5) {
        weeks.push({ weekNumber: weekIndex++, days: currentWeek });
        currentWeek = [];
      }
    });
    
    if (currentWeek.length > 0) {
      weeks.push({ weekNumber: weekIndex, days: currentWeek });
    }
    
    return weeks;
  }, [activeTerm]);

  // Dynamic calculation of days being paid in the advance fee modal
  const advanceCalculatedDays = useMemo(() => {
    if (!advanceStudent || !activeTerm || !activeTerm.schoolDays || activeTerm.schoolDays.length === 0) return [];
    
    const dailyRate = Math.max(0.01, baseDailyFee - (advanceStudent.discount || 0));
    const daysToCover = Math.floor(advanceAmount / dailyRate);
    if (daysToCover <= 0) return [];

    const schoolDays = activeTerm.schoolDays;
    let startIndex = schoolDays.indexOf(currentDate);
    if (startIndex === -1) {
      startIndex = schoolDays.findIndex(d => d >= currentDate);
      if (startIndex === -1) startIndex = 0;
    }

    const datesToRecord: string[] = [];
    let scanIndex = startIndex;

    // 1. Scan ahead to find unpaid school weekdays
    while (datesToRecord.length < daysToCover && scanIndex < schoolDays.length) {
      const dStr = schoolDays[scanIndex];
      const isDayPaid = payments.some(p => p.studentId === advanceStudent.id && p.date === dStr);
      if (!isDayPaid) {
        datesToRecord.push(dStr);
      }
      scanIndex++;
    }

    // 2. Fallback: If some days couldn't be filled due to existing payments,
    // let's grab the next available days from the term (even if already paid) 
    // to complete the days count
    if (datesToRecord.length < daysToCover) {
      let secondaryIndex = startIndex;
      while (datesToRecord.length < daysToCover && secondaryIndex < schoolDays.length) {
        const dStr = schoolDays[secondaryIndex];
        if (!datesToRecord.includes(dStr)) {
          datesToRecord.push(dStr);
        }
        secondaryIndex++;
      }
    }

    return datesToRecord;
  }, [advanceStudent, advanceAmount, activeTerm, currentDate, payments]);

  // Dynamic calculation of days being paid in the debt backwards modal
  const debtCalculatedDays = useMemo(() => {
    if (!debtStudent || !activeTerm) return [];
    
    const dailyRate = Math.max(0.01, baseDailyFee - (debtStudent.discount || 0));
    const daysToCover = Math.floor((debtAmount + 0.005) / dailyRate);
    if (daysToCover <= 0) return [];

    const debtInfo = studentDebtMap.get(debtStudent.id);
    if (!debtInfo) return [];

    return debtInfo.pastUnpaidDays.slice(0, daysToCover);
  }, [debtStudent, debtAmount, studentDebtMap, activeTerm]);

  // Memoized transaction list for history student
  const studentPayments = useMemo(() => {
    if (!historyStudent) return [];
    
    // Get all raw payments of this student
    const studentRaw = payments.filter(p => p.studentId === historyStudent.id);
    
    return studentRaw.sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      return b.timestamp.localeCompare(a.timestamp);
    });
  }, [payments, historyStudent]);

  // Memoized calculations for history modal student
  const { histArrears, histSchoolOwes } = useMemo(() => {
    if (!historyStudent) return { histArrears: 0, histSchoolOwes: 0 };
    const arrears = studentDebtMap.get(historyStudent.id)?.totalDebt || 0;
    const schoolOwes = payments
      .filter(p => p.studentId === historyStudent.id && p.verified && p.date > currentDate)
      .reduce((sum, p) => sum + p.amount, 0);
    return { histArrears: arrears, histSchoolOwes: schoolOwes };
  }, [historyStudent, studentDebtMap, payments, currentDate]);

  // Memoized chronological daily log combining payment and attendance status for entire term history
  const completeHistoryList = useMemo(() => {
    if (!historyStudent || !activeTerm || !activeTerm.schoolDays) return [];
    
    const holidays = activeTerm.publicHolidays || [];
    const pastSchoolDays = activeTerm.schoolDays.filter(d => d <= currentDate);
    
    return pastSchoolDays.map((dayStr) => {
      const pRecord = payments.find(p => p.studentId === historyStudent.id && p.date === dayStr);
      
      const isHoliday = holidays.includes(dayStr);
      const isAbsent = pRecord?.isAbsent || false;
      const isVerified = pRecord?.verified || false;
      const isTermPayer = historyStudent.paymentType === 'Term';
      
      let statusLabel = 'Unpaid Arrears';
      let statusColor = 'text-red-650 font-extrabold';
      let statusBg = 'bg-red-50 text-red-750 border-red-200';
      let feeLabel = `${currencySymbol} ${baseDailyFee.toFixed(2)}`;
      let paymentRef = '- -';
      let collector = '- -';
      
      if (isHoliday) {
        statusLabel = 'Holiday';
        statusColor = 'text-neutral-500 font-medium';
        statusBg = 'bg-neutral-100 text-neutral-600 border-neutral-200';
        feeLabel = 'Exempt';
      } else if (isAbsent) {
        statusLabel = 'Absent';
        statusColor = 'text-amber-600 font-extrabold';
        statusBg = 'bg-amber-50 text-amber-700 border-amber-200';
        feeLabel = 'Exempt';
        paymentRef = pRecord?.id.substring(0, 8).toUpperCase() || 'EXCUSED';
        collector = pRecord?.collectedBy || '- -';
      } else if (pRecord) {
        statusLabel = isVerified ? 'Present (Paid)' : 'Present (Pending)';
        statusColor = isVerified ? 'text-emerald-600 font-extrabold' : 'text-amber-500 font-extrabold';
        statusBg = isVerified 
          ? 'bg-emerald-50 text-emerald-800 border-emerald-205'
          : 'bg-amber-50 text-amber-850 border-amber-205';
        feeLabel = `${currencySymbol} ${pRecord.amount.toFixed(2)}`;
        paymentRef = pRecord.id.substring(0, 8).toUpperCase();
        collector = pRecord.collectedBy;
      } else if (isTermPayer) {
        statusLabel = 'Present (Term Paid)';
        statusColor = 'text-emerald-600 font-extrabold';
        statusBg = 'bg-emerald-50 text-emerald-800 border-emerald-205';
        feeLabel = 'Covered (Term)';
        paymentRef = 'TERM-SCHEME';
        collector = 'System';
      } else {
        const isDayUnpaid = studentDebtMap.get(historyStudent.id)?.pastUnpaidDays.includes(dayStr);
        if (!isDayUnpaid) {
          // Pre-paid or covered by surplus
          statusLabel = 'Present (Pre-paid)';
          statusColor = 'text-emerald-600 font-extrabold';
          statusBg = 'bg-emerald-50 text-emerald-805 border-emerald-205';
          feeLabel = 'Covered (Prepaid)';
          paymentRef = 'PREPAID';
          collector = 'System';
        }
      }
      
      return {
        date: dayStr,
        statusLabel,
        statusColor,
        statusBg,
        feeLabel,
        paymentRef,
        collector,
        isHoliday,
        isAbsent,
        pRecord
      };
    }).sort((a, b) => b.date.localeCompare(a.date)); // descending
  }, [historyStudent, activeTerm, payments, currentDate, studentDebtMap]);

  const getPaidCountForDate = (dayStr: string) => {
    return payments.filter(p => p.class === selectedClass && p.date === dayStr).length;
  };

  const handleCreateTermSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTermName.trim()) return;
    
    if (editingTermId) {
      editTerm(editingTermId, newTermName.trim(), newTermStartDate, newTermDays, newTermIsActive);
      showToast(`School term "${newTermName.trim()}" updated successfully.`);
    } else {
      addTerm(newTermName.trim(), newTermStartDate, newTermDays, newTermIsActive);
      showToast(`School term "${newTermName.trim()}" generated successfully.`);
    }
    
    setNewTermName('');
    setNewTermIsActive(true);
    setNewTermStartDate('2026-06-01');
    setNewTermDays(20);
    setEditingTermId(null);
    setShowTermCreator(false);
  };

  const handleRecordAdvanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!advanceStudent || advanceAmount < 5) return;
    
    recordAdvancePayment(advanceStudent.id, advanceAmount, true);
    setAdvanceSuccess(true);
    showToast(`Successfully registered GHC ${advanceAmount.toFixed(2)} advance payment for ${advanceStudent.name}!`);
    setLastLoggedStudent(advanceStudent);
    setTimeout(() => {
      setAdvanceStudent(null);
      setAdvanceSuccess(false);
    }, 1500);
  };

  const handleRecordDebtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtStudent || debtAmount < baseDailyFee) return;
    
    const isTodayUnpaid = !paidStudentMap.has(debtStudent.id);
    const shouldRecordToday = includeTodayInDebtSettle && isTodayUnpaid;
    const discountAmount = debtStudent.discount || 0;
    const todayFee = Math.max(0, baseDailyFee - discountAmount);

    // Calculate total physical cash collected in a single integrated payment operation
    const totalAmountToRecord = debtAmount + (shouldRecordToday ? todayFee : 0);
    
    // Single consolidated payment call prevents asynchronous React state update race conditions
    recordPayment(debtStudent.id, true, totalAmountToRecord);

    setDebtSuccess(true);
    
    if (shouldRecordToday) {
      showToast(`Settled ${currencySymbol} ${debtAmount.toFixed(2)} arrears and logged ${currencySymbol} ${todayFee.toFixed(2)} today's fee for ${debtStudent.name} (Total ${currencySymbol} ${totalAmountToRecord.toFixed(2)})!`);
    } else {
      showToast(`Successfully registered ${currencySymbol} ${debtAmount.toFixed(2)} arrears clearance payment for ${debtStudent.name}!`);
    }
    setLastLoggedStudent(debtStudent);

    setTimeout(() => {
      setDebtStudent(null);
      setDebtSuccess(false);
    }, 1500);
  };

  const handleTogglePayment = (studentId: string) => {
    if (isHoliday) {
      showToast("Class registry is locked. Date selected is a public holiday.");
      return;
    }
    const student = students.find(s => s.id === studentId);
    const studentName = student ? student.name : "Student";
    const paidInfo = paidStudentMap.get(studentId);
    if (paidInfo && !paidInfo.isAbsent) {
      // Check if it's prepaid
      const isPrepaid = paidInfo.amount === 0 && (paidInfo.notes?.toLowerCase().includes('covered') || paidInfo.notes?.toLowerCase().includes('prepaid') || paidInfo.notes?.toLowerCase().includes('advance'));
      if (isPrepaid) {
        if (!window.confirm(`Warning: ${studentName}'s attendance today is covered by an ADVANCE PAYMENT (${currencySymbol} 0.00 cash today). Deactivating this will remove their prepaid clearance for today and place them in DEBT. Are you sure you want to deactivate today's prepaid status?`)) {
          return;
        }
      }
      // Already paid: toggle it off (remove payment record)
      deletePayment(paidInfo.paymentId);
      showToast(`Removed today's payment record for ${studentName}.`);
    } else {
      // Unmarked, or marked as absent: record standard payment
      recordPayment(studentId, true);
      const discountAmount = student?.discount || 0;
      const actualAmount = Math.max(0, baseDailyFee - discountAmount);
      showToast(`Successfully logged ${currencySymbol} ${actualAmount.toFixed(2)} payment for ${studentName}!`);
      if (student) setLastLoggedStudent(student);
      scrollToNextUnpaid(studentId);
    }
  };

  const handleToggleAbsent = (studentId: string) => {
    if (isHoliday) {
      showToast("Class registry is locked. Date selected is a public holiday.");
      return;
    }
    const student = students.find(s => s.id === studentId);
    const studentName = student ? student.name : "Student";
    const paidInfo = paidStudentMap.get(studentId);
    if (paidInfo && paidInfo.isAbsent) {
      // Already absent: toggle it off
      deletePayment(paidInfo.paymentId);
      showToast(`Cleared absent status for ${studentName}.`);
    } else {
      // Unmarked, or marked as paid: mark as absent
      recordAbsent(studentId);
      showToast(`Marked ${studentName} as absent today (excused from fee).`);
      scrollToNextUnpaid(studentId);
    }
  };

  const handleTogglePresentZeroPay = (studentId: string) => {
    if (isHoliday) {
      showToast("Class registry is locked. Date selected is a public holiday.");
      return;
    }
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    const studentName = student.name;
    const paidInfo = paidStudentMap.get(studentId);
    const isConfirmedPresent = !!paidInfo && !paidInfo.isAbsent && 
      (paidInfo.notes?.toLowerCase().includes('present') || paidInfo.notes?.toLowerCase().includes('¢0'));

    if (isConfirmedPresent) {
      if (paidInfo.amount > 0) {
        const currentRecord = payments.find(p => p.id === paidInfo.paymentId);
        if (currentRecord) {
          const updatedNotes = currentRecord.notes
            ? currentRecord.notes.replace(' | Present or ¢0', '').replace('Present or ¢0', '').trim()
            : '';
          adjustPayment(paidInfo.paymentId, currentRecord.amount, false, updatedNotes, 'Toggle off present indication');
          showToast(`Cleared present indication for ${studentName}.`);
        }
      } else {
        const wasPrepaid = paidInfo.notes?.toLowerCase().includes('covered') || paidInfo.notes?.toLowerCase().includes('prepaid') || paidInfo.notes?.toLowerCase().includes('advance');
        if (wasPrepaid) {
          const currentRecord = payments.find(p => p.id === paidInfo.paymentId);
          if (currentRecord) {
            const updatedNotes = currentRecord.notes
              ? currentRecord.notes.replace(' | Present or ¢0', '').replace('Present or ¢0', '').trim()
              : '';
            adjustPayment(paidInfo.paymentId, 0, false, updatedNotes, 'Toggle off present indication');
            showToast(`Cleared present indication for ${studentName}.`);
          }
        } else {
          deletePayment(paidInfo.paymentId);
          showToast(`Cleared check-in status for ${studentName}.`);
        }
      }
    } else {
      recordPresentZeroPay(studentId);
      showToast(`Marked ${studentName} as Present or ¢0 today.`);
      scrollToNextUnpaid(studentId);
    }
  };

  const handleOpenNoteField = (studentId: string, currentNotes: string) => {
    if (isHoliday) {
      showToast("Class registry is locked. Date selected is a public holiday.");
      return;
    }
    const paidInfo = paidStudentMap.get(studentId);
    if (!paidInfo) {
      recordPresentZeroPay(studentId);
      setEditingNoteStudentId(studentId);
      setNoteInputValue('');
      showToast("Marked pupil present (GHC 0) to attach attendance note.");
    } else {
      setEditingNoteStudentId(studentId);
      setNoteInputValue(currentNotes || '');
    }
  };

  const handleSaveDailyNote = (studentId: string) => {
    if (isHoliday) {
      showToast("Class registry is locked. Date selected is a public holiday.");
      return;
    }
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    const paidInfo = paidStudentMap.get(studentId);
    if (!paidInfo) {
      showToast("Please check in pupil first.");
      return;
    }
    adjustPayment(paidInfo.paymentId, paidInfo.amount || 0, !!paidInfo.isAbsent, noteInputValue.trim(), 'Saved pupil daily note');
    setEditingNoteStudentId(null);
    setNoteInputValue('');
    showToast(`Saved daily attendance note for ${student.name}.`);
  };

  const handleMarkAllPaid = () => {
    if (isHoliday) {
      showToast("Class registry is locked. Date selected is a public holiday.");
      return;
    }
    const unpaidIds = classStudents
      .filter(s => !paidStudentMap.has(s.id))
      .map(s => s.id);
    if (unpaidIds.length > 0) {
      bulkRecordPayments(unpaidIds, true);
      showToast(`Successfully logged daily payments for ${unpaidIds.length} pupils!`);
    }
  };

  const handleMarkAllPresentGHC5 = () => {
    if (isHoliday) {
      showToast("Class registry is locked. Date selected is a public holiday.");
      return;
    }
    const targetIds = classStudents.map(s => s.id);
    if (targetIds.length > 0) {
      bulkRecordPayments(targetIds, true, 5.00);
      showToast(`Successfully marked all ${targetIds.length} pupils present & paid GHC 5.00!`);
      playFeedbackSound?.('success');
    } else {
      showToast("No active students in this class to record.");
    }
  };

  const handleResetDailyConfirmed = () => {
    clearDailyPaymentsForClass(selectedClass, currentDate);
    setSelectedStudentIds([]);
    setShowResetDailyConfirm(false);
    showToast(`Successfully reset all today's records for class ${selectedClass}.`);
    playFeedbackSound?.('success');
  };

  const handleDownloadCSV = () => {
    if (classStudents.length === 0) {
      showToast("No pupils to export in the current class roster.");
      return;
    }

    // Prepare CSV headers
    const headers = [
      "Pupil ID",
      "Full Name",
      "Class",
      "Registration Number",
      "Term Subscription",
      "Ledger Date",
      "Attendance Status",
      "Payment Status",
      "Amount Paid (GHC)",
      "Collected By / System Notes"
    ];

    // Build rows
    const rows = classStudents.map(student => {
      const debtInfo = studentDebtMap.get(student.id);
      const paidInfo = paidStudentMap.get(student.id);
      const isAbsent = !!paidInfo && !!paidInfo.isAbsent;
      const isPaid = isAbsent ? false : (debtInfo?.isPaidToday || false);
      const isPrepaid = isPaid && (
        (!paidInfo && student.paymentType !== 'Term') ||
        (!!paidInfo && paidInfo.amount === 0 && (paidInfo.notes?.toLowerCase().includes('covered') || paidInfo.notes?.toLowerCase().includes('prepaid') || paidInfo.notes?.toLowerCase().includes('advance')))
      );
      const isArrearsCleared = isPaid && !!paidInfo && paidInfo.amount === 0 && (paidInfo.notes?.toLowerCase().includes('arrears') || paidInfo.notes?.toLowerCase().includes('settled') || paidInfo.notes?.toLowerCase().includes('clear'));
      const isScholarship = isPaid && (
        student.discount === 5 ||
        (!!paidInfo && paidInfo.amount === 0 && !isPrepaid && !isArrearsCleared)
      );
      const isConfirmedPresent = !!paidInfo && !paidInfo.isAbsent && 
        (paidInfo.notes?.toLowerCase().includes('present') || paidInfo.notes?.toLowerCase().includes('¢0'));
      const isPresentOrZeroPay = isConfirmedPresent && !isPaid;

      // Determine Attendance status text
      let attendanceStatus = "Unmarked";
      if (isAbsent) {
        attendanceStatus = "Absent";
      } else if (isPaid || isConfirmedPresent) {
        attendanceStatus = "Present";
      }

      // Determine Payment status text and Amount
      let paymentStatusStr = "Unpaid";
      let amountPaidStr = "0.00";
      let collectorNotes = "No Payment Registered";

      if (isAbsent) {
        paymentStatusStr = "Absent (Excused)";
        amountPaidStr = "0.00";
        collectorNotes = paidInfo?.notes || "Marked Absent";
      } else if (isPaid) {
        if (isPrepaid) {
          paymentStatusStr = "Prepaid (Covered)";
          amountPaidStr = "0.00";
        } else if (isScholarship) {
          paymentStatusStr = "Scholarship/Free";
          amountPaidStr = "0.00";
        } else if (isArrearsCleared) {
          paymentStatusStr = "Arrears Cleared / Debt Clearance";
          amountPaidStr = (paidInfo ? paidInfo.amount : 0.00).toFixed(2);
        } else {
          paymentStatusStr = "Paid";
          amountPaidStr = (paidInfo ? paidInfo.amount : 5.00).toFixed(2);
        }
        collectorNotes = paidInfo 
          ? `Collected by: ${paidInfo.collectedBy}${paidInfo.notes ? ` (${paidInfo.notes})` : ''}` 
          : "System Running Balance";
      } else if (isPresentOrZeroPay) {
        paymentStatusStr = "Present (GHC 0.00)";
        amountPaidStr = "0.00";
        collectorNotes = paidInfo 
          ? `Collected by: ${paidInfo.collectedBy}${paidInfo.notes ? ` (${paidInfo.notes})` : ''}` 
          : "System Running Balance";
      }

      // Format fields to handle quotes/commas
      const escapeCsv = (val: string) => {
        const cleaned = String(val).replace(/"/g, '""');
        return `"${cleaned}"`;
      };

      return [
        escapeCsv(student.id),
        escapeCsv(student.name),
        escapeCsv(student.class),
        escapeCsv(student.rollNo || "N/A"),
        escapeCsv(student.paymentType),
        escapeCsv(currentDate),
        escapeCsv(attendanceStatus),
        escapeCsv(paymentStatusStr),
        escapeCsv(amountPaidStr),
        escapeCsv(collectorNotes)
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
    link.setAttribute("download", `Class_${selectedClass}_Register_${currentDate}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Successfully downloaded daily CSV sheet for Class ${selectedClass}!`);
  };

  const triggerSmsAlert = (student: Student) => {
    setGuardianSmsStudent(student);
    setSuccessSms(false);
  };

  const sendSimulatedSms = () => {
    setSuccessSms(true);
    setTimeout(() => {
      setGuardianSmsStudent(null);
    }, 2000);
  };

  const downloadReceipt = (
    student: Student,
    date: string,
    paymentId: string,
    amount: number,
    collectedBy: string,
    isAbsent: boolean,
    notes?: string
  ) => {
    const txId = `SHC-TX-${date.replace(/-/g, '')}-${paymentId.substring(0, 8).toUpperCase()}`;
    const rollRef = student.rollNumber || 'SHC-' + student.id.substring(0, 5).toUpperCase();
    const amountStr = `GHC ${amount.toFixed(2)}`;
    const statusLabel = isAbsent ? "ABSENT (NO FEE)" : "PRESENT & CHECKED-IN";
    const auditor = collectedBy || 'Certified Gateway Auditor';

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt - ${student.name} - ${date}</title>
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
      font-size: 60px;
      font-weight: 900;
      color: rgba(16, 185, 129, 0.05);
      letter-spacing: 6px;
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
      font-size: 20px;
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
    }
    .tx-id {
      font-family: monospace;
      font-size: 10px;
      color: #9ca3af;
      margin-top: 8px;
    }
    .grid-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
    }
    .info-block {
      background-color: #0b0f19;
      border: 1px solid #1f2937;
      padding: 16px;
      border-radius: 6px;
    }
    .info-label {
      font-size: 9px;
      font-weight: 700;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .info-value {
      font-size: 13px;
      font-weight: 700;
      color: #ffffff;
    }
    .summary-box {
      border: 1px solid #1f2937;
      border-radius: 6px;
      padding: 20px;
      background-color: rgba(11, 15, 25, 0.6);
      margin-bottom: 30px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #1f2937;
    }
    .summary-row:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .amount-value {
      font-size: 22px;
      font-weight: 900;
      color: #34d399;
    }
    .audit-msg {
      font-size: 11px;
      color: #9ca3af;
      background-color: rgba(59, 130, 246, 0.05);
      padding: 14px;
      border-radius: 6px;
      border-left: 4px solid #3b82f6;
      margin-bottom: 30px;
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
      font-size: 12px;
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
      margin-top: 30px;
      border-top: 1px solid #1f2937;
      padding-top: 20px;
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
    <div class="watermark">PAID & SECURE</div>
    
    <div class="header">
      <div>
        <h1 class="school-title">SAAKO HOLY CHILD ACADEMY</h1>
        <p class="school-subtitle">Gate Checkpoint Ingress System</p>
      </div>
      <div>
        <span class="receipt-type">Official Receipt</span>
        <div class="tx-id">Ref: ${txId}</div>
      </div>
    </div>

    <div class="grid-container">
      <div class="info-block">
        <div class="info-label">Student Name</div>
        <div class="info-value" style="text-transform: uppercase;">${student.name}</div>
      </div>
      <div class="info-block">
        <div class="info-label">Class Name</div>
        <div class="info-value">${student.class}</div>
      </div>
      <div class="info-block">
        <div class="info-label">Admission Roll ID</div>
        <div class="info-value">${rollRef}</div>
      </div>
      <div class="info-block">
        <div class="info-label">Payment Date</div>
        <div class="info-value">${date}</div>
      </div>
    </div>

    <div class="summary-box">
      <div class="summary-row">
        <span style="font-weight: 600;">Standard Daily School Fee</span>
        <span style="font-family: monospace;">GHC ${(amount || 5.0).toFixed(2)}</span>
      </div>
      <div class="summary-row">
        <span style="font-weight: 600;">Status</span>
        <span style="color: #34d399; font-weight: 850; font-size: 11px;">✔️ ${statusLabel}</span>
      </div>
      <div class="summary-row" style="border-top: 2px solid #374151; padding-top: 12px; margin-top: 12px;">
        <span style="font-weight: 900; text-transform: uppercase; font-size: 13px;">Total Amount Settled</span>
        <span class="amount-value">${amountStr}</span>
      </div>
    </div>

    <div class="audit-msg">
      This acts as secure verification of school clearance. Collected and stamped by Gateway Auditor: <strong>${auditor}</strong>.
      ${notes ? `<br><strong style="font-size: 9px; color: #fbbf24;">NOTE:</strong> ${notes}` : ''}
    </div>

    <div class="btn-container">
      <button class="btn btn-primary" onclick="window.print()">Print Receipt</button>
      <button class="btn btn-secondary" onclick="window.close()">Close</button>
    </div>

    <div class="footer">
      SAAKO HOLY CHILD ACADEMY • Official Digital Transaction Secure Seal • Ref: ${student.id}
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RECEIPT_${student.name.replace(/\\s+/g, '_')}_${date}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Standalone receipt downloaded for ${student.name}!`);
  };

  const handleShareWhatsApp = async (
    type: 'profile' | 'invoice' | 'receipt' | 'arrears_warning' | 'check_in',
    student: Student,
    payment?: PaymentRecord,
    customOptions?: {
      unpaidDaysCount?: number;
      totalPaid?: number;
      totalArrears?: number;
      schoolOwes?: number;
      attendancePct?: number;
    }
  ) => {
    let messageText = '';
    const phone = student.guardianPhone || '';
    const studentName = student.name;
    const studentId = student.id;
    const rollNumber = student.rollNumber || 'SHC-' + student.id.substring(0, 5).toUpperCase();
    const classGroup = `${student.class} (${student.category})`;
    
    if (type === 'profile') {
      const status = student.active ? 'Active (Registered)' : 'Deactivated';
      const pct = customOptions?.attendancePct !== undefined ? customOptions.attendancePct : 100;
      
      let financeSummary = '';
      if (student.paymentType === 'Term') {
        const arrears = customOptions?.totalArrears !== undefined ? customOptions.totalArrears : 0;
        const totalPaid = customOptions?.totalPaid !== undefined ? customOptions.totalPaid : 0;
        const termF = student.termFee || 350;
        const legacyD = student.legacyDebt || 0;
        financeSummary = `Scheme: Term Payer\n* Fixed Term Fee: GHC ${termF.toFixed(2)}${legacyD > 0 ? ` (+ GHC ${legacyD.toFixed(2)} legacy)` : ''}\n* Paid to Date: GHC ${totalPaid.toFixed(2)}\n* Outstanding Dues: GHC ${arrears.toFixed(2)}`;
      } else {
        const totalPaid = customOptions?.totalPaid !== undefined ? customOptions.totalPaid : 0;
        const totalArrears = customOptions?.totalArrears !== undefined ? customOptions.totalArrears : 0;
        const schoolOwes = customOptions?.schoolOwes !== undefined ? customOptions.schoolOwes : 0;
        const daysCount = customOptions?.unpaidDaysCount !== undefined ? customOptions.unpaidDaysCount : 0;
        financeSummary = `Scheme: Daily Scheme\n* Total Deposited: GHC ${totalPaid.toFixed(2)}\n* Arrears (Debt): GHC ${totalArrears.toFixed(2)} (${daysCount} unpaid days)\n* Prepaid Pool Bal: GHC ${schoolOwes.toFixed(2)}`;
      }

      messageText = `*SAAKO HOLY CHILD ACADEMY*\n*PUPIL OVERVIEW PROFILE*\n\n` +
        `*Name:* ${studentName}\n` +
        `*ID Number:* ${rollNumber}\n` +
        `*Class:* ${classGroup}\n` +
        `*Status:* ${status}\n` +
        `*Attendance clear rate:* ${pct}%\n\n` +
        `_Financial Summary:_\n${financeSummary}\n\n` +
        `_Generated via Gate Checkpoint Ingress System on ${currentDate}._`;

    } else if (type === 'invoice') {
      const isTerm = student.paymentType === 'Term';
      const totalArrears = customOptions?.totalArrears !== undefined ? customOptions.totalArrears : 0;
      const totalPaid = customOptions?.totalPaid !== undefined ? customOptions.totalPaid : 0;
      const schoolOwes = customOptions?.schoolOwes !== undefined ? customOptions.schoolOwes : 0;
      const daysCount = customOptions?.unpaidDaysCount !== undefined ? customOptions.unpaidDaysCount : 0;

      let invoiceDetails = '';
      if (isTerm) {
        const termF = student.termFee || 350;
        const legacyD = student.legacyDebt || 0;
        invoiceDetails = `* FIXED TERM FEE: GHC ${termF.toFixed(2)}\n` +
                        (legacyD > 0 ? `* PREVIOUS LEGACY DEBT: GHC ${legacyD.toFixed(2)}\n` : '') +
                        `* TOTAL EXPECTED: GHC ${(termF + legacyD).toFixed(2)}\n` +
                        `* AMOUNT PAID: GHC ${totalPaid.toFixed(2)}\n` +
                        `* OUTSTANDING DUES: GHC ${totalArrears.toFixed(2)}`;
      } else {
        invoiceDetails = `* TOTAL DEPOSITED: GHC ${totalPaid.toFixed(2)}\n` +
                        `* TOTAL ARREARS: GHC ${totalArrears.toFixed(2)} (${daysCount} unpaid register days)\n` +
                        `* PREPAID POOL BALANCE: GHC ${schoolOwes.toFixed(2)}`;
      }

      messageText = `*SAAKO HOLY CHILD ACADEMY*\n*FEE & ATTENDANCE INVOICE STATEMENT*\n\n` +
        `*Reference:* SHC-ST-${currentDate.replace(/-/g, '')}-${student.id.substring(0,6).toUpperCase()}\n` +
        `*Pupil Beneficiary:* ${studentName}\n` +
        `*Roll Number:* ${rollNumber}\n` +
        `*Class Group:* ${classGroup}\n` +
        `*Statement Date:* ${currentDate}\n\n` +
        `*Financial Statement:*\n${invoiceDetails}\n\n` +
        `${totalArrears > 0 ? `_Polite Notice: An outstanding balance of *GHC ${totalArrears.toFixed(2)}* is pending. Please reconcile at the checkpoint desk immediately._` : `_Account is in good standing. Thank you for your support!_`}\n\n` +
        `_Issued by: ${currentUser ? currentUser.name : 'Authorized Registrar Registration'}_`;

    } else if (type === 'arrears_warning') {
      const totalArrears = customOptions?.totalArrears !== undefined ? customOptions.totalArrears : 0;
      const daysCount = customOptions?.unpaidDaysCount !== undefined ? customOptions.unpaidDaysCount : 0;
      const isTerm = student.paymentType === 'Term';

      let detailsText = '';
      if (isTerm) {
        detailsText = `Your child, ${studentName}, is registered on the Term Fee Payment scheme. Currently, there is an accumulated outstanding balance of *GHC ${totalArrears.toFixed(2)}* for school fees and ancillary levies.`;
      } else {
        detailsText = `Your child, ${studentName}, currently has *GHC ${totalArrears.toFixed(2)}* in accumulated Daily Ingress arrears (equivalent to *${daysCount} unpaid school days*).`;
      }

      messageText = `*SAAKO HOLY CHILD ACADEMY*\n` +
        `⚠️ *IMMEDIATE ATTENTION: OUTSTANDING FEES NOTICE* ⚠️\n\n` +
        `Dear Guardian,\n\n` +
        `This is an official administrative notice regarding the financial account of your ward:\n` +
        `*Student Name:* ${studentName}\n` +
        `*Roll ID:* ${rollNumber}\n` +
        `*Class/Grade:* ${classGroup}\n\n` +
        `${detailsText}\n\n` +
        `Kindly make arrangements to settle this outstanding balance of *GHC ${totalArrears.toFixed(2)}* at the school gate check-in desk or make a direct transfer to avoid any interruption to your ward's daily registration and classroom entry.\n\n` +
        `If you have recently made this payment, please present your printed receipt at the main desk to update our ledger records.\n\n` +
        `Thank you for your prompt cooperation.\n` +
        `_Office of the Headmaster & Registrar Hub_`;

    } else if (type === 'receipt' && payment) {
      const refId = payment.id;
      
      messageText = `*SAAKO HOLY CHILD ACADEMY*\n*OFFICIAL GATE CHECKPOINT RECEIPT*\n\n` +
        `*Ref ID:* SHC-TX-${refId.substring(0,10).toUpperCase()}\n` +
        `*Student:* ${studentName}\n` +
        `*Roll Number:* ${rollNumber}\n` +
        `*Class:* ${classGroup}\n` +
        `*Payment Date:* ${payment.date}\n` +
        `*Amount Paid:* GHC ${payment.amount.toFixed(2)}\n` +
        `*Scheme:* ${payment.isAbsent ? 'Absent (No Fee Due)' : (student.paymentType || 'Daily Gate Coin')}\n` +
        `${payment.notes ? `*Notes:* ${payment.notes}\n` : ''}` +
        `*Status:* VERIFIED SECURE\n\n` +
        `_Thank you for your payment. Verified via Gate Ingress registrar._`;
    } else if (type === 'check_in') {
      messageText = `*${systemSettings?.schoolName || 'SAAKO HOLY CHILD ACADEMY'}*\n` +
        `🔔 *GATE CHECK-IN CONFIRMATION* 🔔\n\n` +
        `Dear Guardian,\n\n` +
        `This is to inform you that your ward, *${studentName}* (ID: ${rollNumber}), has successfully checked in at the school gate today at *${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}*.\n\n` +
        `*Status:* Present & Registered\n` +
        `*Class Group:* ${classGroup}\n` +
        `*Academic Date:* ${currentDate}\n\n` +
        `Thank you for choosing ${systemSettings?.schoolName || 'Saako Holy Child Academy'}!`;
    }

    if (!messageText) return;

    setWhatsAppShareModal({
      type,
      student,
      payment,
      messageText,
      defaultPhone: phone
    });
  };

  const statContainerVariants = {
    hidden: { opacity: 0, y: 15 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1,
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  const statItemVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
  };

  return (
    <div id="register-main-container" className="space-y-6 font-sans relative">
      {/* Toast Alert floating notification */}
      {successMsg && (
        <motion.div 
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed top-6 right-6 z-50 bg-amber-400 text-black border-4 border-neutral-850 p-4 text-xs font-black flex items-center justify-between shadow-[8px_8px_0px_0px_rgba(0,0,0,0.55)] font-mono uppercase tracking-widest max-w-sm"
          style={{ zIndex: 9999 }}
        >
          <div className="flex items-center gap-2">
            <Check size={16} className="bg-black/10 p-0.5 rounded-sm shrink-0" />
            <span>{successMsg}</span>
          </div>
        </motion.div>
      )}

      {/* Overview stats header */}
      <div className="bg-neutral-900 border-4 border-neutral-800 p-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 no-print">
        <div className="space-y-2">
          <p className="text-xs font-black text-amber-400 uppercase tracking-[0.2em] font-mono">
            Date Location Tracker: {currentDate}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tight leading-none">
              Daily Check-In GHC 5.00 Register
            </h2>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handlePrevDate}
                className="bg-neutral-950 hover:bg-neutral-850 text-neutral-305 hover:text-white border-2 border-neutral-800 hover:border-neutral-700 px-3 py-1.5 flex items-center gap-1.5 text-[10px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer rounded"
                title="Go to Previous Date"
              >
                <ChevronLeft size={14} className="stroke-[3.5] text-amber-400" />
                <span className="hidden sm:inline">Prev Date</span>
              </button>

              <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1.5 border-2 border-neutral-800 rounded">
                <CalendarDays size={14} className="text-amber-400 shrink-0" />
                {currentUser?.role === 'Administrator' || currentUser?.role === 'Accountant' || currentUser?.role === 'Headmaster' ? (
                  <input
                    type="date"
                    value={currentDate}
                    onChange={(e) => {
                      if (e.target.value) {
                        setCurrentDate(e.target.value);
                        showToast(`Ledger date updated to ${e.target.value}.`);
                      }
                    }}
                    className="bg-transparent text-white focus:outline-none font-mono text-xs uppercase cursor-pointer border-none p-0 tracking-wider [color-scheme:dark]"
                    title="Switch Active Ledger Date"
                  />
                ) : (
                  <div className="flex items-center gap-1.5 text-neutral-350 font-mono text-xs uppercase tracking-wider select-none">
                    <span>{currentDate}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleNextDate}
                className="bg-neutral-950 hover:bg-neutral-850 text-neutral-305 hover:text-white border-2 border-neutral-800 hover:border-neutral-700 px-3 py-1.5 flex items-center gap-1.5 text-[10px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer rounded"
                title="Go to Next Date"
              >
                <span className="hidden sm:inline">Next Date</span>
                <ChevronRight size={14} className="stroke-[3.5] text-amber-400" />
              </button>
            </div>
          </div>
          <p className="text-xs text-neutral-400 font-bold">
            All pupils must present clearance prior to classroom ingress. Authorization: <span className="font-extrabold text-amber-400 font-mono tracking-wider">{currentUser?.role}</span>
          </p>
        </div>

        {/* Quick totals of active class */}
        <div className="flex flex-col sm:flex-row gap-4 p-2 bg-neutral-950 border-2 border-neutral-850 w-full lg:w-auto">
          <div className="px-5 py-2.5 text-left">
            <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest font-mono">Paid Today</p>
            <p className="text-[22px] font-black text-white tracking-tight font-mono">{paidCount} / {classStudents.length}</p>
          </div>
          <div className="hidden sm:block border-r border-neutral-800" />
          <div className="px-5 py-2.5 text-left">
            <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest font-mono">Absent</p>
            <p className="text-[22px] font-black text-red-400 tracking-tight font-mono">{absentCount}</p>
          </div>
          <div className="hidden sm:block border-r border-neutral-800" />
          <div className="px-5 py-2.5 text-left">
            <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest font-mono">Outstanding</p>
            <p className="text-[22px] font-black text-amber-500 tracking-tight font-mono">{outstandingCount}</p>
          </div>
          <div className="hidden sm:block border-r border-neutral-800" />
          <div className="px-5 py-2.5 text-left">
            <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest font-mono">Total Collected</p>
            <p className="text-[22px] font-black text-emerald-400 tracking-tight font-mono">GHC {collectionTotal.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* REAL-TIME ATTENDANCE METRICS SUMMARY WIDGET */}
      <motion.div 
        key={`stats-${currentDate}-${selectedClass}`}
        variants={statContainerVariants}
        initial="hidden"
        animate="show"
        className="no-print grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {/* Card 1: Selected Class Stats */}
        <motion.div 
          variants={statItemVariants}
          className="bg-neutral-900 border-4 border-neutral-800 border-l-amber-400 p-6 flex flex-col justify-between hover:border-r-neutral-700 transition-all"
        >
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest font-mono">Real-Time Class Registry</p>
                <h3 className="text-lg font-black text-white uppercase italic tracking-tight font-sans">
                  Active Class: <span className="text-amber-400">{selectedClass}</span>
                </h3>
              </div>
              <div className="bg-neutral-950 border border-neutral-800 px-2.5 py-1 text-[10px] font-mono font-bold text-neutral-400 uppercase">
                {classAttendanceStats.totalActive} Pupils
              </div>
            </div>

            {/* Progress Percentage Display */}
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Registry Completion Progress</span>
                <span className="text-sm font-black font-mono text-amber-450">{classAttendanceStats.percentage}%</span>
              </div>
              <div className="relative w-full bg-neutral-950 h-3 border border-neutral-850 rounded-none overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${classAttendanceStats.percentage}%` }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 h-full"
                />
              </div>
            </div>

            {/* Grid of details */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="bg-neutral-950/65 border border-neutral-850 p-2.5 text-center">
                <p className="text-[9px] font-mono font-black text-neutral-550 uppercase tracking-wider">Checked In</p>
                <div className="flex items-center justify-center gap-1.5 mt-1 font-mono">
                  <CheckSquare size={12} className="text-emerald-450" />
                  <span className="text-sm font-extrabold text-emerald-400">{classAttendanceStats.checkedIn}</span>
                </div>
              </div>
              
              <div className="bg-neutral-950/65 border border-neutral-850 p-2.5 text-center">
                <p className="text-[9px] font-mono font-black text-neutral-550 uppercase tracking-wider">Absent</p>
                <div className="flex items-center justify-center gap-1.5 mt-1 font-mono">
                  <X size={12} className="text-red-450" />
                  <span className="text-sm font-extrabold text-red-400">{classAttendanceStats.absent}</span>
                </div>
              </div>

              <div className="bg-neutral-950/65 border border-neutral-850 p-2.5 text-center">
                <p className="text-[9px] font-mono font-black text-neutral-550 uppercase tracking-wider">Pending</p>
                <div className="flex items-center justify-center gap-1.5 mt-1 font-mono">
                  <span className="h-1.5 w-1.5 rounded-full bg-neutral-500" />
                  <span className="text-sm font-extrabold text-neutral-400">{classAttendanceStats.unmarked}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Card 2: Entire School Stats */}
        <motion.div 
          variants={statItemVariants}
          className="bg-neutral-900 border-4 border-neutral-800 border-l-emerald-400 p-6 flex flex-col justify-between hover:border-r-neutral-700 transition-all"
        >
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest font-mono">Global Roster Metrics</p>
                <h3 className="text-lg font-black text-white uppercase italic tracking-tight font-sans">
                  Academy School-Wide
                </h3>
              </div>
              <div className="bg-neutral-950 border border-neutral-800 px-2.5 py-1 text-[10px] font-mono font-bold text-neutral-400 uppercase">
                {schoolAttendanceStats.totalActive} Active Pupils
              </div>
            </div>

            {/* Progress Percentage Display */}
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Academy Check-In Coverage</span>
                <span className="text-sm font-black font-mono text-emerald-450">{schoolAttendanceStats.percentage}%</span>
              </div>
              <div className="relative w-full bg-neutral-950 h-3 border border-neutral-850 rounded-none overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${schoolAttendanceStats.percentage}%` }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className="bg-gradient-to-r from-teal-600 via-emerald-500 to-emerald-400 h-full"
                />
              </div>
            </div>

            {/* Grid of details */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="bg-neutral-950/65 border border-neutral-850 p-2.5 text-center">
                <p className="text-[9px] font-mono font-black text-neutral-550 uppercase tracking-wider">Checked In</p>
                <div className="flex items-center justify-center gap-1.5 mt-1 font-mono">
                  <CheckSquare size={12} className="text-emerald-450" />
                  <span className="text-sm font-extrabold text-emerald-400">{schoolAttendanceStats.checkedIn}</span>
                </div>
              </div>
              
              <div className="bg-neutral-950/65 border border-neutral-850 p-2.5 text-center">
                <p className="text-[9px] font-mono font-black text-neutral-550 uppercase tracking-wider">Absent</p>
                <div className="flex items-center justify-center gap-1.5 mt-1 font-mono">
                  <X size={12} className="text-red-450" />
                  <span className="text-sm font-extrabold text-red-400">{schoolAttendanceStats.absent}</span>
                </div>
              </div>

              <div className="bg-neutral-950/65 border border-neutral-850 p-2.5 text-center">
                <p className="text-[9px] font-mono font-black text-neutral-550 uppercase tracking-wider">Pending</p>
                <div className="flex items-center justify-center gap-1.5 mt-1 font-mono">
                  <span className="h-1.5 w-1.5 rounded-full bg-neutral-500" />
                  <span className="text-sm font-extrabold text-neutral-400">{schoolAttendanceStats.unmarked}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* TERM SELECTION & DAILY TRACKING CALENDAR */}
      <div className="bg-neutral-900 border-4 border-neutral-800 p-8 space-y-6 no-print">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-neutral-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CalendarDays className="text-amber-400" size={18} />
              <h3 className="text-xs font-black text-neutral-400 uppercase tracking-widest font-mono">
                School Term & Day Tracking Hub
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsTermDropdownOpen(!isTermDropdownOpen)}
                  className="flex items-center gap-2 bg-neutral-950 border-2 border-neutral-800 px-4 py-2 hover:border-neutral-600 transition-colors text-sm font-black tracking-tight"
                >
                  <span className="uppercase text-amber-400 font-mono text-xs">{activeTerm ? activeTerm.name : 'No Term Selected'}</span>
                  <ChevronDown size={14} className="text-neutral-500" />
                </button>
                
                {isTermDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-72 bg-neutral-950 border-2 border-neutral-850 shadow-2xl z-40 divide-y divide-neutral-800">
                    <div className="p-2 bg-neutral-900/80 text-[8px] font-mono font-black text-amber-500 uppercase tracking-wider text-center">
                      CLICK TO SET ACTIVE TEACHER WORKING TERM
                    </div>
                    {terms.map(t => (
                      <div key={t.id} className={`flex justify-between items-center p-2.5 hover:bg-neutral-900 ${t.active ? 'bg-amber-400/5' : ''}`}>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTerm(t.id);
                            setIsTermDropdownOpen(false);
                          }}
                          className="flex-1 text-left text-xs font-bold uppercase tracking-wide text-white block py-1.5"
                        >
                          <div className="flex items-center gap-2">
                            <span>{t.name}</span>
                            {t.active ? (
                              <span className="px-1 text-[8px] leading-none py-0.5 font-mono font-black text-emerald-400 bg-emerald-500/10 border border-emerald-400/25 rounded">
                                ACTIVE
                              </span>
                            ) : (
                              <span className="px-1 text-[8px] leading-none py-0.5 font-mono font-normal text-neutral-500 bg-neutral-900 border border-neutral-800 rounded">
                                INACTIVE
                              </span>
                            )}
                          </div>
                          <span className="block text-[9px] font-mono font-normal text-neutral-500 mt-1">
                            {t.daysCount} DAYS • START {t.startDate}
                          </span>
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTermId(t.id);
                              setNewTermName(t.name);
                              setNewTermStartDate(t.startDate);
                              setNewTermDays(t.daysCount);
                              setNewTermIsActive(t.active);
                              setShowTermCreator(true);
                              setIsTermDropdownOpen(false);
                            }}
                            className="p-1.5 text-neutral-650 hover:text-amber-400 hover:bg-amber-400/10 transition-colors cursor-pointer"
                            title="Edit Term"
                          >
                            <Pencil size={13} />
                          </button>
                          {terms.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteConf({
                                  isOpen: true,
                                  type: 'term_delete',
                                  targetId: t.id,
                                  targetName: t.name,
                                  userInput: '',
                                  onConfirm: () => {
                                    deleteTerm(t.id);
                                    showToast(`School term "${t.name}" was deactivated/purged.`);
                                  }
                                });
                              }}
                              className="p-1.5 text-neutral-650 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                              title="Delete Term"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-neutral-700 text-xs font-bold">|</span>
              <span className="text-[10px] text-neutral-400 font-black tracking-widest font-mono uppercase">
                {activeTerm ? `${activeTerm.daysCount} WEEKS SCHEDULE` : 'NONE'}
              </span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (showTermCreator) {
                  setEditingTermId(null);
                  setNewTermName('');
                  setNewTermStartDate('2026-06-01');
                  setNewTermDays(20);
                  setNewTermIsActive(true);
                }
                setShowTermCreator(!showTermCreator);
                setShowHolidayManager(false);
              }}
              className="bg-neutral-950 hover:bg-neutral-850 border-2 border-neutral-800 hover:border-amber-400 text-neutral-300 hover:text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all inline-flex items-center gap-2 focus:outline-none"
            >
              <CalendarPlus size={14} className="text-amber-400" />
              {showTermCreator ? (editingTermId ? 'EXIT EDIT MODE' : 'HIDE CREATOR') : 'CREATE NEW SCHOOL TERM'}
            </button>

            {(currentUser?.role === 'Administrator' || currentUser?.role === 'Headmaster') && (
              <button
                type="button"
                onClick={() => {
                  setShowHolidayManager(!showHolidayManager);
                  setShowTermCreator(false);
                }}
                className="bg-neutral-950 hover:bg-neutral-850 border-2 border-neutral-800 hover:border-red-500 text-neutral-300 hover:text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all inline-flex items-center gap-2 focus:outline-none"
              >
                <CalendarX size={14} className="text-red-500" />
                {showHolidayManager ? 'HIDE HOLIDAYS' : 'MANAGE PUBLIC HOLIDAYS'}
              </button>
            )}
          </div>
        </div>

        {/* Active Expandable New Term Form */}
        {showTermCreator && (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleCreateTermSubmit}
            className="bg-neutral-950 border-2 border-amber-400 p-6 space-y-4"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-neutral-800">
              {editingTermId ? (
                <Pencil size={14} className="text-amber-400" />
              ) : (
                <Plus size={16} className="text-amber-400" />
              )}
              <span className="text-xs font-mono font-black uppercase tracking-wider text-white">
                {editingTermId ? 'Edit Existing school term' : 'Create New Schooling Term Schedule'}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono font-black text-neutral-500">Term Name / Title</label>
                <input
                  type="text"
                  required
                  value={newTermName}
                  onChange={(e) => setNewTermName(e.target.value)}
                  placeholder="e.g. Term 2 - Winter 2026"
                  className="w-full bg-neutral-900 border border-neutral-800 text-xs py-2.5 px-3 focus:outline-none focus:border-amber-400 font-mono font-bold uppercase text-white"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono font-black text-neutral-500">Start Date (School Year Begins)</label>
                <input
                  type="date"
                  required
                  value={newTermStartDate}
                  onChange={(e) => setNewTermStartDate(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 text-xs py-2.5 px-3 focus:outline-none focus:border-amber-400 font-mono font-bold text-white"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono font-black text-neutral-500">Schooling Days length</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="120"
                  value={newTermDays}
                  onChange={(e) => setNewTermDays(parseInt(e.target.value, 10))}
                  className="w-full bg-neutral-900 border border-neutral-800 text-xs py-2.5 px-3 focus:outline-none focus:border-amber-400 font-mono font-bold text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono font-black text-neutral-500">Active Status</label>
                <select
                  value={newTermIsActive ? 'active' : 'inactive'}
                  onChange={(e) => setNewTermIsActive(e.target.value === 'active')}
                  className="w-full bg-neutral-900 border border-neutral-800 text-xs py-2.5 px-3 focus:outline-none focus:border-amber-400 font-mono font-bold text-white uppercase cursor-pointer"
                >
                  <option value="active" className="bg-neutral-950 text-white font-mono uppercase font-bold text-xs py-1">Active (Working Term)</option>
                  <option value="inactive" className="bg-neutral-950 text-white font-mono uppercase font-bold text-xs py-1">Inactive (Hidden/Standby)</option>
                </select>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
              <span className="text-[9px] text-neutral-500 font-semibold uppercase leading-relaxed max-w-lg">
                * SYSTEM SCHEDULER: Only school weekdays (Monday - Friday) will be indexed for the daily pay register. Weekend Saturdays and Sundays are ignored.
              </span>
              <button
                type="submit"
                className="bg-amber-400 hover:bg-amber-300 text-black px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-colors cursor-pointer"
              >
                {editingTermId ? 'UPDATE TERM DETAILS' : 'GENERATE SCHEDULE'}
              </button>
            </div>
          </motion.form>
        )}

        {/* Dynamic Expandable Public Holiday Scheduler */}
        {showHolidayManager && activeTerm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-neutral-950 border-2 border-red-500/40 p-6 space-y-4"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-neutral-800">
              <Landmark size={16} className="text-red-500" />
              <span className="text-xs font-mono font-black uppercase tracking-wider text-white">Dynamic Public Holiday Scheduler</span>
            </div>

            {/* Form to declare holiday */}
            <div className="flex flex-col sm:flex-row items-end gap-4">
              <div className="flex-grow space-y-1.5 w-full">
                <label className="text-[10px] uppercase font-mono font-black text-neutral-500">Pick School weekday to declare as Holiday (Active Term)</label>
                <select
                  id="holiday-date-selector"
                  className="w-full bg-neutral-900 border border-neutral-800 text-xs py-2.5 px-3 focus:outline-none focus:border-red-500 font-mono font-bold text-white uppercase cursor-pointer"
                >
                  <option value="">-- SELECT DATE FROM CURRENT TERM --</option>
                  {activeTerm.schoolDays.map(d => {
                    const isAlreadyHoliday = (activeTerm.publicHolidays || []).includes(d);
                    if (isAlreadyHoliday) return null;
                    return <option key={d} value={d}>{d}</option>;
                  })}
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  const selectEl = document.getElementById('holiday-date-selector') as HTMLSelectElement | null;
                  if (selectEl && selectEl.value) {
                    addPublicHoliday(activeTerm.id, selectEl.value);
                    const selectedVal = selectEl.value;
                    selectEl.value = "";
                    showToast(`Successfully declared holiday for date: ${selectedVal}!`);
                  } else {
                    showToast("Please choose a valid day to declare as public holiday.");
                  }
                }}
                className="bg-red-500 hover:bg-red-400 text-white px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-colors cursor-pointer shrink-0 w-full sm:w-auto"
              >
                DECLARE AS HOLIDAY
              </button>
            </div>

            {/* List of holidays */}
            <div className="space-y-2 pt-2 border-t border-neutral-850">
              <h4 className="text-[9px] uppercase font-mono font-black text-neutral-400">DESIGNATED PUBLIC HOLIDAYS FOR THIS ACTIVE TERM:</h4>
              {(!activeTerm.publicHolidays || activeTerm.publicHolidays.length === 0) ? (
                <p className="text-[10px] text-neutral-600 uppercase font-mono italic">No holidays defined for this term yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {activeTerm.publicHolidays.map(dateStr => (
                    <div key={dateStr} className="flex items-center bg-red-950/60 border border-red-500/30 text-red-400 px-2.5 py-1 text-[10px] font-mono font-bold gap-2">
                      <span>{dateStr}</span>
                      <button
                        type="button"
                        onClick={() => {
                          removePublicHoliday(activeTerm.id, dateStr);
                          showToast(`Public holiday on date: ${dateStr} is cancelled/removed.`);
                        }}
                        className="text-red-450 hover:text-red-300 transition-colors cursor-pointer focus:outline-none"
                      >
                        <X size={12} className="stroke-[3]" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* School Days Calendar Carousel/Grid split by Weeks */}
        {weeksOfTerm.length === 0 ? (
          <div className="py-6 text-center text-neutral-500 bg-neutral-950/40 border border-neutral-800">
            <p className="text-xs font-bold uppercase tracking-widest">No schooling days defined for active term.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono">
              Active Term Schedule: Select Schooling Day to view / mark daily records separately (Monday - Friday and current checks stats visible)
            </p>
            
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {weeksOfTerm.map((week) => (
                <div key={week.weekNumber} className="flex flex-col md:flex-row items-stretch md:items-center bg-neutral-950 p-3 border border-neutral-850 gap-4">
                  <span className="text-[10px] font-mono font-black text-amber-400 tracking-wider w-20 uppercase shrink-0">
                    WEEK {String(week.weekNumber).padStart(2, '0')}
                  </span>
                  
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {week.days.map((dayStr) => {
                      const isActive = currentDate === dayStr;
                      const isDayHoliday = activeTerm?.publicHolidays?.includes(dayStr);
                      const paidCount = getPaidCountForDate(dayStr);
                      const classTotal = classStudents.length;
                      
                      // Decide color palette based on completion
                      let cardStyle = "bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-neutral-400";
                      let dotStyle = "bg-neutral-600";
                      
                      if (isDayHoliday) {
                        cardStyle = isActive
                          ? "bg-red-500 text-white border-red-500 scale-[1.01] shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)] font-bold"
                          : "bg-red-950/20 border-red-900/40 text-red-400 hover:bg-red-950/30";
                        dotStyle = "bg-red-500";
                      } else if (isActive) {
                        cardStyle = "bg-amber-400 text-black border-amber-400 scale-[1.01] shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)]";
                        dotStyle = "bg-black animate-pulse";
                      } else if (paidCount > 0) {
                        if (paidCount >= classTotal) {
                          cardStyle = "bg-emerald-950/30 border-emerald-800 text-emerald-400 hover:bg-emerald-900/10";
                          dotStyle = "bg-emerald-400";
                        } else {
                          cardStyle = "bg-amber-950/20 border-amber-900/60 text-amber-300 hover:bg-amber-900/10";
                          dotStyle = "bg-amber-400";
                        }
                      }
                      
                      // Format day label
                      const parts = dayStr.split('-');
                      const weekdayName = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase();
                      const formattedDate = `${parts[2]}/${parts[1]}`;
                      
                      return (
                        <button
                          key={dayStr}
                          type="button"
                          onClick={() => setCurrentDate(dayStr)}
                          className={`p-2 border transition-all text-left flex flex-col justify-between h-14 select-none relative cursor-pointer ${cardStyle}`}
                        >
                          <div className="flex justify-between items-start w-full">
                            <span className="text-[9px] font-black uppercase tracking-wider">{weekdayName}</span>
                            <span className={`w-1.5 h-1.5 rounded-full ${dotStyle}`} />
                          </div>
                          <div className="flex justify-between items-end w-full leading-none mt-1">
                            <span className="text-[11px] font-mono leading-none tracking-tight">{formattedDate}</span>
                            <span className="text-[10px] font-black font-mono leading-none flex items-center">
                              {isDayHoliday ? (
                                <span className="text-[7.5px] px-1 py-0.2 bg-red-500/20 text-red-300 border border-red-500/30 rounded font-sans tracking-wide uppercase">HOLIDAY</span>
                              ) : (
                                `${paidCount}/${classTotal}`
                              )}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Class Selector Grid */}
      <div className="bg-neutral-900 border-4 border-neutral-800 p-8 space-y-5 no-print">
        <div>
          <h3 className="text-xs font-black text-neutral-400 uppercase tracking-[0.25em] font-mono mb-4">
            Grouped Class Directory
          </h3>
          <div className="space-y-4">
            {/* Pre-School classes */}
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest font-mono w-28">Pre-school</span>
              <div className="flex flex-wrap gap-2">
                {preSchoolClasses.map(cls => (
                  <button
                    key={cls}
                    onClick={() => setSelectedClass(cls)}
                    className={`px-3.5 py-2 font-black text-[11px] tracking-widest uppercase transition-all border-2 flex items-center gap-2 ${
                      selectedClass === cls
                        ? 'bg-amber-400 text-black border-amber-400'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white hover:bg-neutral-850'
                    }`}
                  >
                    <span>{cls}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 font-mono font-bold rounded-xs border ${
                      selectedClass === cls
                        ? 'bg-black/10 text-black border-black/20'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                    }`} title="Total Active Enrolment">
                      Roll: {classEnrolments[cls] || 0}
                    </span>
                    <span className={`text-[9px] px-1 font-mono font-black border ${
                      selectedClass === cls
                        ? 'bg-black/10 text-black border-black/20'
                        : 'bg-neutral-900 border-neutral-830 text-amber-500'
                    }`}>
                      GHC {classDailyTotals[cls] || 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Primary Classes */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 border-t border-neutral-800 pt-4">
              <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest font-mono w-28">Primary</span>
              <div className="flex flex-wrap gap-2">
                {primaryClasses.map(cls => (
                  <button
                    key={cls}
                    onClick={() => setSelectedClass(cls)}
                    className={`px-3.5 py-2 font-black text-[11px] tracking-widest uppercase transition-all border-2 flex items-center gap-2 ${
                      selectedClass === cls
                        ? 'bg-amber-400 text-black border-amber-400'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white hover:bg-neutral-850'
                    }`}
                  >
                    <span>{cls}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 font-mono font-bold rounded-xs border ${
                      selectedClass === cls
                        ? 'bg-black/10 text-black border-black/20'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                    }`} title="Total Active Enrolment">
                      Roll: {classEnrolments[cls] || 0}
                    </span>
                    <span className={`text-[9px] px-1 font-mono font-black border ${
                      selectedClass === cls
                        ? 'bg-black/10 text-black border-black/20'
                        : 'bg-neutral-900 border-neutral-830 text-amber-500'
                    }`}>
                      GHC {classDailyTotals[cls] || 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* JHS Classes */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 border-t border-neutral-800 pt-4">
              <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest font-mono w-28">JHS</span>
              <div className="flex flex-wrap gap-2">
                {jhsClasses.map(cls => (
                  <button
                    key={cls}
                    onClick={() => setSelectedClass(cls)}
                    className={`px-3.5 py-2 font-black text-[11px] tracking-widest uppercase transition-all border-2 flex items-center gap-2 ${
                      selectedClass === cls
                        ? 'bg-amber-400 text-black border-amber-400'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white hover:bg-neutral-850'
                    }`}
                  >
                    <span>{cls}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 font-mono font-bold rounded-xs border ${
                      selectedClass === cls
                        ? 'bg-black/10 text-black border-black/20'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                    }`} title="Total Active Enrolment">
                      Roll: {classEnrolments[cls] || 0}
                    </span>
                    <span className={`text-[9px] px-1 font-mono font-black border ${
                      selectedClass === cls
                        ? 'bg-black/10 text-black border-black/20'
                        : 'bg-neutral-900 border-neutral-830 text-amber-500'
                    }`}>
                      GHC {classDailyTotals[cls] || 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Student Check-In Section */}
      <div className="bg-neutral-900 border-4 border-neutral-800 overflow-hidden no-print">
        {/* LEDGER DATE NAVIGATION BAR FOR QUICK ROUTING */}
        <div className="bg-neutral-950/80 px-6 py-4 border-b-2 border-neutral-800 flex flex-col sm:flex-row justify-between items-center gap-4 select-none">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping"></span>
            <span className="text-[10px] font-mono font-black text-neutral-400 uppercase tracking-widest">
              ACTIVE LEDGER DATE:
            </span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-405 border border-amber-400/25 rounded">
              <CalendarDays size={13} className="text-amber-450" />
              <span className="text-xs font-mono font-black text-amber-400">{currentDate}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handlePrevDate}
              className="flex-1 sm:flex-initial bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border-2 border-neutral-800 hover:border-neutral-750 px-3.5 py-2 flex items-center justify-center gap-1.5 text-[10px] font-mono font-black uppercase tracking-widest transition-all cursor-pointer"
              title="Navigate to Previous Ledger Date"
            >
              <ChevronLeft size={14} className="stroke-[3.5] text-amber-400" />
              <span>Prior Day</span>
            </button>
            <button
              type="button"
              onClick={handleNextDate}
              className="flex-1 sm:flex-initial bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border-2 border-neutral-800 hover:border-neutral-750 px-3.5 py-2 flex items-center justify-center gap-1.5 text-[10px] font-mono font-black uppercase tracking-widest transition-all cursor-pointer"
              title="Navigate to Next Ledger Date"
            >
              <span>Next Day</span>
              <ChevronRight size={14} className="stroke-[3.5] text-amber-400" />
            </button>
          </div>
        </div>

        {/* Table Header Filter tools */}
        <div className="p-6 bg-neutral-950 border-b-2 border-neutral-800 flex flex-col gap-5">
          {/* Row 1: COHORT & STUDENT IDENTIFICATION */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            
            {/* Left: Class Dropdown and Student Search */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-grow max-w-full lg:max-w-4xl">
              
              {/* CLASS SELECTOR QUICK-SWITCHER DROPDOWN */}
              <div className="relative w-full md:w-56 shrink-0">
                <span className="absolute left-3.5 top-3.5 text-amber-400 z-10 pointer-events-none">
                  <Users size={14} className="stroke-[2.5]" />
                </span>
                <select
                  id="class-quick-dropdown"
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value as StudentClass);
                    showToast(`Switched active register roster to: ${e.target.value}`);
                  }}
                  className="w-full bg-neutral-900 border-2 border-neutral-800 py-3 pl-9 pr-8 text-[11px] font-mono font-black text-amber-400 focus:outline-none focus:border-amber-400 uppercase cursor-pointer appearance-none tracking-wider rounded-none"
                  title="Rapid Switch Active Class Group"
                >
                  <optgroup label="PRE-SCHOOL DIVISION" className="bg-neutral-950 text-neutral-450 font-mono font-black text-[10px] uppercase">
                    {preSchoolClasses.map(cls => (
                      <option key={cls} value={cls} className="bg-neutral-900 text-white font-mono font-bold text-xs uppercase">
                        {cls} (Roll: {classEnrolments[cls] || 0} | GHC {classDailyTotals[cls] || 0})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="PRIMARY DIVISION" className="bg-neutral-950 text-neutral-450 font-mono font-black text-[10px] uppercase">
                    {primaryClasses.map(cls => (
                      <option key={cls} value={cls} className="bg-neutral-900 text-white font-mono font-bold text-xs uppercase">
                        {cls} (Roll: {classEnrolments[cls] || 0} | GHC {classDailyTotals[cls] || 0})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="JUNIOR HIGH DIVISION (JHS)" className="bg-neutral-950 text-neutral-450 font-mono font-black text-[10px] uppercase">
                    {jhsClasses.map(cls => (
                      <option key={cls} value={cls} className="bg-neutral-900 text-white font-mono font-bold text-xs uppercase">
                        {cls} (Roll: {classEnrolments[cls] || 0} | GHC {classDailyTotals[cls] || 0})
                      </option>
                    ))}
                  </optgroup>
                </select>
                <div className="absolute right-3.5 top-4 pointer-events-none text-neutral-550 z-10">
                  <ChevronDown size={14} className="stroke-[3]" />
                </div>
              </div>

              {/* SEARCH INPUT */}
              <div className="relative flex-grow">
                <Search className="absolute left-4 top-3.5 text-neutral-500" size={16} />
                <input
                  id="class-register-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (nextUnmarkedStudent) {
                        handleTogglePayment(nextUnmarkedStudent.id);
                        setSearchQuery(''); // Clear search after checking in to auto-advance and reset the roster list to show the next student clearly
                      } else {
                        showToast("All pupils in this class roster have been cleared for today!");
                      }
                    }
                  }}
                  placeholder="SEARCH NAME/ROLL (ENTER TO AUTO-PAY NEXT UP)..."
                  className="w-full bg-neutral-900 border-2 border-neutral-800 py-3 pl-11 pr-24 text-[11px] font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-600 tracking-wide"
                  title="Type to search, or simply press Enter to record check-in for the active next student and shift forward"
                />
                <div className="absolute right-3 top-2.5 flex items-center gap-1.5">
                  <VoiceSearchButton
                    inputId="class-register-search"
                    onTranscript={(text) => setSearchQuery(text)}
                    className="mr-0.5"
                  />
                  <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 border border-neutral-800 bg-neutral-950 font-mono text-[9px] text-neutral-550 rounded-xs leading-none pointer-events-none uppercase font-bold tracking-wider select-none">
                    Ctrl+K
                  </kbd>
                  <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 border border-neutral-800 bg-neutral-950 font-mono text-[9px] text-amber-500/80 rounded-xs leading-none pointer-events-none uppercase font-bold tracking-wider select-none" title="Press Enter to toggle payment for the next student up">
                    ↵ Enter
                  </kbd>
                </div>

                {/* FLOATING QUICK-SEARCH SUGGESTIONS GRID */}
                {quickSearchMatches.length > 0 && (
                  <div className="absolute left-0 top-full w-full bg-neutral-950 border-2 border-neutral-800 shadow-2xl z-50 mt-1 max-h-72 overflow-y-auto divide-y-2 divide-neutral-900 rounded-none">
                    <div className="bg-neutral-900/90 backdrop-blur-md px-4 py-2 text-[8px] font-mono text-neutral-550 uppercase font-black tracking-widest flex justify-between items-center select-none border-b border-neutral-850">
                      <span>Quick Search Suggestions ({quickSearchMatches.length})</span>
                      <span>Click to Scroll & Highlight</span>
                    </div>
                    {quickSearchMatches.map(student => {
                      const debtInfo = studentDebtMap.get(student.id);
                      const paidInfo = paidStudentMap.get(student.id);
                      const isAbsent = !!paidInfo && !!paidInfo.isAbsent;
                      const isPaid = isAbsent ? false : (debtInfo?.isPaidToday || false);
                      const isPrepaid = isPaid && (
                        (!paidInfo && student.paymentType !== 'Term') ||
                        (!!paidInfo && paidInfo.amount === 0 && (paidInfo.notes?.toLowerCase().includes('covered') || paidInfo.notes?.toLowerCase().includes('prepaid') || paidInfo.notes?.toLowerCase().includes('advance')))
                      );
                      const isScholarship = isPaid && (
                        student.discount === 5 ||
                        (!!paidInfo && paidInfo.amount === 0 && !isPrepaid)
                      );

                      let statusTextLabel = 'UNMARKED';
                      let statusLabelColor = 'text-neutral-450';
                      if (isAbsent) {
                        statusTextLabel = 'ABSENT';
                        statusLabelColor = 'text-red-400';
                      } else if (isPrepaid) {
                        statusTextLabel = 'PREPAID';
                        statusLabelColor = 'text-indigo-400';
                      } else if (isScholarship) {
                        statusTextLabel = 'SCHOLARSHIP';
                        statusLabelColor = 'text-teal-400';
                      } else if (isPaid) {
                        statusTextLabel = 'PAID';
                        statusLabelColor = 'text-emerald-400';
                      }

                      return (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => handleSelectQuickSearchStudent(student)}
                          className="w-full text-left px-4 py-3 pb-2.5 flex items-center justify-between hover:bg-neutral-900/90 focus:bg-neutral-900 focus:outline-none transition-colors group cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-2 h-2 rounded-full bg-neutral-800 group-hover:bg-amber-400 transition-colors shrink-0" />
                            <div className="min-w-0">
                              <span className="block text-[11px] font-mono font-black text-white group-hover:text-amber-400 uppercase tracking-tight truncate">
                                {student.name}
                              </span>
                              <span className="block text-[8px] font-mono text-neutral-500 uppercase tracking-wider font-bold">
                                Roll: {student.rollNumber} • {student.paymentType === 'Term' ? 'Term Subscription' : 'Daily Scheme'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`text-[9px] font-mono font-black uppercase tracking-widest ${statusLabelColor}`}>
                              {statusTextLabel}
                            </span>
                            <span className="text-[8px] font-mono text-neutral-600 group-hover:text-amber-400 uppercase tracking-tight transition-colors border border-dashed border-neutral-800 group-hover:border-amber-400/30 px-2 py-0.5 font-bold">
                              locate ↵
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Keyboard shortcut info indicator reminder */}
              <div 
                className="hidden md:flex items-center justify-center text-neutral-550 hover:text-amber-400 border border-neutral-800 bg-neutral-900 hover:border-amber-400 transition-all cursor-help h-[42px] w-10 shrink-0 select-none"
                title="Keyboard Shortcut Reminder: Press 'Ctrl+K' (or 'Cmd+K' on macOS) from anywhere at any time to focus the search box instantly"
              >
                <Info size={14} className="stroke-[2.5]" />
              </div>
            </div>

            {/* Right: Camera Scan Trigger */}
            <button
              id="qr-scanner-trigger"
              onClick={() => setIsQrModalOpen(true)}
              className="bg-amber-400 hover:bg-amber-300 text-black py-3 px-5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border-2 border-amber-400 transition-colors cursor-pointer shrink-0 w-full lg:w-48 animate-pulse hover:animate-none"
              title="Open QR scanner camera station"
            >
              <QrCode size={14} className="stroke-[3]" />
              <span>Camera Scan</span>
            </button>
          </div>

          {/* Row 2: REGISTRY STATS & BULK OPERATIONS (Cleanly separated to prevent squeezing, wrapping gracefully) */}
          <div className="border-t border-neutral-800/60 pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Progress Bar (Left side) */}
            <div className="w-full md:max-w-xs shrink-0">
              {classStudents.length > 0 && (
                <div className="flex flex-col gap-1.5 w-full bg-neutral-900/60 border border-neutral-800/80 p-2">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider font-mono text-neutral-450">
                    <span>Roster Paid: {paidCount}/{classStudents.length}</span>
                    <span className="text-amber-400">{Math.round((paidCount / classStudents.length) * 100)}%</span>
                  </div>
                  <div className="w-full bg-neutral-950 h-2 overflow-hidden border border-neutral-900">
                    <div 
                      className="bg-amber-400 h-full transition-all duration-300"
                      style={{ width: `${(paidCount / classStudents.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bulk Trigger Action Buttons (Right side: wraps beautifully using flex-wrap gap-2) */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
              <button
                type="button"
                onClick={handleMarkAllPaid}
                disabled={outstandingCount === 0 || isHoliday}
                className="flex-grow sm:flex-grow-0 text-[10px] font-mono font-black bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:text-white text-neutral-300 py-2.5 px-4 transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer font-bold"
                title="Only record payments for pupils who are currently Unmarked today"
              >
                <CheckSquare size={13} className="stroke-[2.5]" />
                <span>Bulk Unmarked Paid</span>
              </button>

              <button
                type="button"
                onClick={handleMarkAllPresentGHC5}
                disabled={classStudents.length === 0 || isHoliday}
                className="flex-grow sm:flex-grow-0 text-[10px] font-mono font-black bg-amber-400 hover:bg-amber-300 text-black py-2.5 px-4.5 transition-all flex items-center justify-center gap-1.5 uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-md font-bold"
                title="Mark absolutely all active pupils as present and paid with default GHC 5.00 with a single click"
              >
                <Users size={13} className="stroke-[2.5]" />
                <span>Mark All Present</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isHoliday) {
                    showToast("Class registry is locked. Date selected is a public holiday.");
                    return;
                  }
                  setShowResetDailyConfirm(true);
                }}
                className="flex-grow sm:flex-grow-0 text-[10px] font-mono font-black bg-neutral-900 border border-neutral-800 hover:border-red-650 hover:text-red-400 text-neutral-450 py-2.5 px-3.5 transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer font-bold"
                title="Reset all payment and attendance status records for this class today"
              >
                <RefreshCw size={13} className="stroke-[2.5]" />
                <span>Reset Daily</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadCSV}
                className="flex-grow sm:flex-grow-0 text-[10px] font-mono font-black bg-neutral-900 border border-neutral-800 hover:border-amber-400 hover:text-amber-400 text-neutral-300 py-2.5 px-3.5 transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer font-bold"
                title="Download Today's Sheet"
              >
                <Download size={13} className="stroke-[2.5]" />
                <span>Download Sheet</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPrintHardcopyModal(true)}
                className="flex-grow sm:flex-grow-0 text-[10px] font-mono font-black bg-neutral-900 border border-neutral-800 hover:border-emerald-400 hover:text-emerald-400 text-neutral-300 py-2.5 px-3.5 transition-all flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer font-bold"
                title="Generate physical printed sheet block for gate collections"
              >
                <Printer size={13} className="stroke-[2.5]" />
                <span>Hardcopy Checklist</span>
              </button>
            </div>
          </div>
        </div>

        {/* Beautiful secondary interactive filter pills and registration progress HUD */}
        <div className="px-6 py-4 bg-neutral-900/60 border-b-2 border-neutral-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 select-none">
          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto scroller-hidden">
            <span className="text-[10px] font-mono font-black text-neutral-400 uppercase tracking-widest mr-1.5 shrink-0">FILTER COHORT:</span>
            
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-[10px] font-mono font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border cursor-pointer ${
                statusFilter === 'all' 
                  ? 'bg-amber-400 text-black border-amber-400 font-black shadow-sm' 
                  : 'bg-neutral-950 text-neutral-400 border-neutral-800/80 hover:text-white hover:border-neutral-700'
              }`}
            >
              All ({classStudents.length})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('unmarked')}
              className={`px-3 py-1.5 text-[10px] font-mono font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border cursor-pointer ${
                statusFilter === 'unmarked' 
                  ? 'bg-rose-600 text-white border-rose-600 font-black shadow-sm' 
                  : 'bg-neutral-950 text-neutral-400 border-neutral-800/80 hover:text-rose-400 hover:border-rose-900/40'
              }`}
              title="Show only pupils with unresolved attendance or payment status for today"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse shrink-0" />
              Unmarked ({classStudents.filter(s => !paidStudentMap.has(s.id)).length})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('present')}
              className={`px-3 py-1.5 text-[10px] font-mono font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border cursor-pointer ${
                statusFilter === 'present' 
                  ? 'bg-emerald-500 text-white border-emerald-500 font-black shadow-sm' 
                  : 'bg-neutral-950 text-neutral-400 border-neutral-800/80 hover:text-emerald-400 hover:border-emerald-900/30'
              }`}
            >
              <Check size={11} className="stroke-[3.5]" />
              Present ({classStudents.filter(s => {
                const p = paidStudentMap.get(s.id);
                return !!p && !p.isAbsent;
              }).length})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('absent')}
              className={`px-3 py-1.5 text-[10px] font-mono font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border cursor-pointer ${
                statusFilter === 'absent' 
                  ? 'bg-neutral-400 text-black border-neutral-400 font-black shadow-sm' 
                  : 'bg-neutral-950 text-neutral-400 border-neutral-800/80 hover:text-white hover:border-neutral-700'
              }`}
            >
              <X size={11} className="stroke-[3.5]" />
              Absent ({classStudents.filter(s => {
                const p = paidStudentMap.get(s.id);
                return !!p && !!p.isAbsent;
              }).length})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('arrears')}
              className={`px-3 py-1.5 text-[10px] font-mono font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border cursor-pointer ${
                statusFilter === 'arrears' 
                  ? 'bg-amber-550 border-amber-550 text-black font-black shadow-sm' 
                  : 'bg-neutral-950 text-neutral-400 border-neutral-800/80 hover:text-amber-300 hover:border-amber-900/30'
              }`}
              title="Show students with historical outstanding debts"
            >
              <Landmark size={11} />
              Debt ({classStudents.filter(s => {
                const debt = studentDebtMap.get(s.id);
                const outstanding = (debt?.outstandingBalance || 0);
                return outstanding > 0;
              }).length})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('term_payers')}
              className={`px-3 py-1.5 text-[10px] font-mono font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border cursor-pointer ${
                statusFilter === 'term_payers' 
                  ? 'bg-sky-600 text-white border-sky-600 font-black shadow-sm' 
                  : 'bg-neutral-950 text-neutral-400 border-neutral-800/80 hover:text-sky-400 hover:border-sky-900/30'
              }`}
            >
              Term ({classStudents.filter(s => s.paymentType === 'Term').length})
            </button>
          </div>

          {/* Quick HUD Progress & Accessibility Tip */}
          <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono text-neutral-400">
            {classStudents.length > 0 && (
              <div className="flex items-center gap-2.5 bg-neutral-950 px-3 py-1.5 border border-neutral-800/50">
                <span className="text-neutral-500 uppercase tracking-wider font-bold">DAILY COVERAGE:</span>
                <span className="text-emerald-400 font-black">
                  {classStudents.filter(s => paidStudentMap.has(s.id)).length}/{classStudents.length} AUDITED
                </span>
                <span className="text-neutral-700">|</span>
                <span className="text-amber-400 font-black animate-pulse">
                  {Math.round((classStudents.filter(s => paidStudentMap.has(s.id)).length / classStudents.length) * 100)}% COMPLETE
                </span>
              </div>
            )}
            
            <label className="inline-flex items-center gap-2 bg-neutral-950 px-2.5 py-1 text-[9px] font-mono font-bold text-neutral-300 border border-neutral-800/80 hover:border-neutral-700 hover:text-white cursor-pointer select-none transition-all uppercase">
              <input
                type="checkbox"
                checked={autoSendCheckInAlert}
                onChange={(e) => {
                  setAutoSendCheckInAlert(e.target.checked);
                  showToast(
                    e.target.checked 
                      ? "Enabled automatic parents WhatsApp alert on safe check-in!" 
                      : "Disabled automatic parent alerts."
                  );
                }}
                className="w-3.5 h-3.5 accent-amber-400 cursor-pointer text-amber-400 border border-neutral-800 bg-neutral-900 focus:ring-0 focus:outline-none"
              />
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${autoSendCheckInAlert ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'} shrink-0`}></span>
                <span>Auto-alert parent on Check-In</span>
              </span>
            </label>

            <label className="inline-flex items-center gap-2 bg-neutral-950 px-2.5 py-1 text-[9px] font-mono font-bold text-neutral-300 border border-neutral-800/80 hover:border-neutral-700 hover:text-white cursor-pointer select-none transition-all uppercase">
              <input
                type="checkbox"
                checked={autoSendArrearsAlert}
                onChange={(e) => {
                  setAutoSendArrearsAlert(e.target.checked);
                  showToast(
                    e.target.checked 
                      ? "Enabled automatic parents WhatsApp arrears notification!" 
                      : "Disabled automatic parents WhatsApp arrears notification."
                  );
                }}
                className="w-3.5 h-3.5 accent-amber-400 cursor-pointer text-amber-400 border border-neutral-800 bg-neutral-900 focus:ring-0 focus:outline-none"
              />
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${autoSendArrearsAlert ? 'bg-rose-400 animate-pulse' : 'bg-neutral-600'} shrink-0`}></span>
                <span>Auto-alert parent on Arrears</span>
              </span>
            </label>

            <div className="hidden md:inline-flex items-center gap-1 bg-neutral-950/40 px-2 py-1 text-[9px] text-neutral-500 border border-neutral-800/50 uppercase" title="Press '/' key on your keyboard to instantly focus search field from anywhere">
              <span className="text-amber-400 font-bold mr-0.5">/ KEY</span> FOCUS SEARCH
            </div>
          </div>
        </div>

        {/* Entries */}
        {filteredStudents.length === 0 ? (
          <div className="py-16 text-center text-neutral-500 space-y-3">
            <Users size={36} className="mx-auto text-neutral-600" />
            <p className="text-sm font-black uppercase tracking-wider">No Student Found in Register</p>
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Enroll additional pupils from the enrollment directory.</p>
          </div>
        ) : (
          <div className="divide-y-2 divide-neutral-800/80">
            {/* SELECTION AND BULK ACTIONS CONTROL ROW */}
            <div className="bg-neutral-950 px-6 py-4 border-b border-neutral-800 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <label className="flex items-center gap-2.5 cursor-pointer select-none font-mono text-xs font-black uppercase text-neutral-300 hover:text-white">
                  <input
                    type="checkbox"
                    className="w-4 h-4 bg-neutral-900 border-2 border-neutral-700 checked:bg-amber-400 checked:border-amber-400 rounded-none focus:ring-0 text-amber-400 cursor-pointer accent-amber-400"
                    checked={filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.includes(s.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const allIds = filteredStudents.map(s => s.id);
                        setSelectedStudentIds(prev => {
                          const otherIds = prev.filter(id => !allIds.includes(id));
                          return [...otherIds, ...allIds];
                        });
                      } else {
                        const allIds = filteredStudents.map(s => s.id);
                        setSelectedStudentIds(prev => prev.filter(id => !allIds.includes(id)));
                      }
                    }}
                  />
                  <span>Select All ({filteredStudents.length})</span>
                </label>
                {selectedStudentIds.length > 0 && (
                  <span className="text-[10px] font-mono font-black bg-amber-400/10 border border-amber-400/20 text-amber-300 px-2.5 py-1">
                    {selectedStudentIds.length} SELECTED
                  </span>
                )}
              </div>

              {selectedStudentIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      bulkRecordPayments(selectedStudentIds, true);
                      showToast(`Successfully logged daily payments for ${selectedStudentIds.length} selected pupils!`);
                      setSelectedStudentIds([]);
                    }}
                    disabled={isHoliday}
                    className="w-full sm:w-auto text-[10px] font-mono font-black bg-amber-400 hover:bg-amber-300 text-black py-2.5 px-4 transition-colors flex items-center justify-center gap-1.5 uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <CheckSquare size={13} className="stroke-[2.5]" />
                    <span>Mark Selected Paid</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm(`Are you sure you want to unmark/clear the daily records for the ${selectedStudentIds.length} selected pupils?`)) {
                        return;
                      }
                      let count = 0;
                      selectedStudentIds.forEach(studentId => {
                        const paidInfo = paidStudentMap.get(studentId);
                        if (paidInfo) {
                          deletePayment(paidInfo.paymentId);
                          count++;
                        }
                      });
                      if (count > 0) {
                        showToast(`Successfully unmarked records for ${count} selected pupils.`);
                      } else {
                        showToast(`None of the selected pupils had active records today.`);
                      }
                      setSelectedStudentIds([]);
                    }}
                    disabled={isHoliday}
                    className="w-full sm:w-auto text-[10px] font-mono font-black bg-neutral-950 border border-neutral-800 hover:border-red-500 hover:text-red-400 text-neutral-400 py-2.5 px-4 transition-colors flex items-center justify-center gap-1.5 uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <X size={13} className="stroke-[2.5]" />
                    <span>Unmark Selected</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStudentIds([])}
                    className="text-[10px] font-mono font-bold hover:text-white text-neutral-400 uppercase tracking-widest cursor-pointer whitespace-nowrap"
                  >
                    Clear Selection
                  </button>
                </div>
              )}
            </div>

            {/* INFORMATIVE INTERACTIVE PATHWAY BANNER */}
            <div className="bg-neutral-950/40 p-4 border-b border-neutral-800/60 text-[10px] font-mono font-black text-amber-400 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 select-none">
              <span className="flex items-center gap-2 uppercase tracking-wide">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0"></span>
                <span>💡 INFORMATION DESK: CLICK ANY PUPIL'S NAME TO RECONCILE PAST ENTRIES, VIEW TRANSACTION HISTORY & GENERATE OFFICIAL INVOICES.</span>
              </span>
              <span className="text-[9px] bg-amber-400/10 border border-amber-400/25 px-2 py-0.5 text-amber-300 font-mono tracking-widest font-black uppercase shrink-0">INTELLIGENT GATEWAY</span>
            </div>

            {isHoliday && activeTerm && (
              <div className="bg-red-950/20 border-b border-red-500/30 p-6 text-center text-red-400 space-y-3 select-none font-mono">
                <div className="flex items-center justify-center gap-2 text-red-500">
                  <Landmark size={20} className="stroke-[2.5]" />
                  <span className="text-sm font-black uppercase tracking-wider">OFFICIAL PUBLIC HOLIDAY DETECTED</span>
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-200">
                  School is closed today for academic work & dynamic gateway controls are locked.
                </p>
                <p className="text-[10px] uppercase text-neutral-400 tracking-wide leading-relaxed">
                  * GATE SYSTEM OVERRIDE: Payment check-ins and absence logs are halted for this calendar block. No pupils are marked owing.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      removePublicHoliday(activeTerm.id, currentDate);
                      showToast(`Removed holiday status: marked ${currentDate} as a fee collection day.`);
                    }}
                    className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-black text-[10px] font-mono font-black uppercase tracking-widest transition-colors cursor-pointer inline-flex items-center gap-2"
                  >
                    <span>CONVERT TO FEE COLLECTION DAY</span>
                  </button>
                </div>
              </div>
            )}
            {filteredStudents.map(student => {
              const debtInfo = studentDebtMap.get(student.id);
              const paidInfo = paidStudentMap.get(student.id);
              const isAbsent = !!paidInfo && !!paidInfo.isAbsent;
              const isPaid = isAbsent ? false : (debtInfo?.isPaidToday || false);
              const hasArrearsAtRisk = debtInfo && debtInfo.pastUnpaidDays && debtInfo.pastUnpaidDays.length > 5;
              const isPrepaid = isPaid && (
                (!paidInfo && student.paymentType !== 'Term') ||
                (!!paidInfo && paidInfo.amount === 0 && (paidInfo.notes?.toLowerCase().includes('covered') || paidInfo.notes?.toLowerCase().includes('prepaid') || paidInfo.notes?.toLowerCase().includes('advance')))
              );
              const isArrearsCleared = isPaid && !!paidInfo && paidInfo.amount === 0 && (paidInfo.notes?.toLowerCase().includes('arrears') || paidInfo.notes?.toLowerCase().includes('settled') || paidInfo.notes?.toLowerCase().includes('clear'));
              const isScholarship = isPaid && (
                student.discount === 5 ||
                (!!paidInfo && paidInfo.amount === 0 && !isPrepaid && !isArrearsCleared)
              );
              const isConfirmedPresent = !!paidInfo && !paidInfo.isAbsent && 
                (paidInfo.notes?.toLowerCase().includes('present') || paidInfo.notes?.toLowerCase().includes('¢0'));
              const isPresentOrZeroPay = isConfirmedPresent && !isPaid;

              const isNextToPay = nextUnmarkedStudent && nextUnmarkedStudent.id === student.id;

              return (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className="bg-neutral-900/10"
                >
                  <div 
                    id={`student-row-${student.id}`}
                    className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 transition-all gap-4 scroll-mt-24 ${
                    highlightedStudentId === student.id
                      ? 'border-l-4 border-l-amber-400 bg-amber-400/[0.12] ring-4 ring-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.5)] scale-[1.01] z-30 font-semibold'
                      : isNextToPay 
                        ? 'border-l-4 border-l-amber-400 bg-amber-400/[0.04] ring-2 ring-amber-450/25 shadow-[0_0_15px_rgba(251,191,36,0.08)] scale-[1.002] z-10' 
                        : hasArrearsAtRisk 
                          ? 'border-l-4 border-l-red-500 bg-red-950/[0.015] opacity-80 hover:opacity-100' 
                          : isPaid 
                            ? 'bg-amber-400/[0.02]' 
                            : isAbsent 
                              ? 'bg-red-500/[0.02]' 
                              : isConfirmedPresent
                                ? 'bg-amber-500/[0.03] border-l-4 border-l-amber-500/60'
                                : 'hover:bg-neutral-800/10'
                  }`}
                >
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    {/* Checkbox for selection */}
                    <input
                      type="checkbox"
                      className="w-4 h-4 bg-neutral-900 border-2 border-neutral-800 checked:bg-amber-400 checked:border-amber-400 rounded-none focus:ring-0 text-amber-400 cursor-pointer accent-amber-400 shrink-0"
                      checked={selectedStudentIds.includes(student.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStudentIds(prev => [...prev, student.id]);
                        } else {
                          setSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                        }
                      }}
                    />
                    
                    {/* Student Avatar Widget */}
                    <div className="relative group/avatar shrink-0 w-12 h-12">
                      {student.photoUrl ? (
                        <img 
                          src={student.photoUrl} 
                          alt={student.name} 
                          className="w-12 h-12 rounded-full object-cover border-2 border-neutral-800 group-hover/avatar:border-amber-400 transition-colors"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-neutral-950 border-2 border-neutral-800 flex items-center justify-center text-sm font-black text-amber-400 font-mono tracking-tighter group-hover/avatar:border-amber-400 transition-colors uppercase">
                          {student.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      
                      {/* Hover overlay button to trigger profile photo actions */}
                      <button
                        type="button"
                        onClick={() => setSelectedPhotoStudent(student)}
                        className="absolute inset-0 bg-neutral-950/80 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 text-amber-400 cursor-pointer"
                        title="Upload or Take Profile Photo"
                      >
                        <Camera size={14} className="stroke-[2.5]" />
                      </button>
                    </div>

                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          id={`student-name-link-${student.id}`}
                          onClick={() => setHistoryStudent(student)}
                          className="text-base font-black text-white hover:text-amber-400 hover:underline cursor-pointer uppercase tracking-tight text-left transition-all bg-transparent border-none p-0 flex items-center flex-wrap gap-1.5 focus:outline-none"
                          title="Click to view full payment history and statements"
                        >
                          <span>{student.name}</span>
                          <span className="text-[10px] text-neutral-500 hover:text-amber-400 font-normal hover:underline flex items-center gap-1 font-mono normal-case tracking-normal">
                            (click for history log)
                          </span>
                        </button>
                      <span className="text-[10px] font-black px-2.5 py-0.5 bg-neutral-950 border border-neutral-800 text-amber-400 font-mono tracking-wider">
                        {student.rollNumber}
                      </span>
                      {isNextToPay && (
                        <span className="text-[9px] font-black px-2.5 py-0.5 bg-amber-450 border border-amber-500 text-neutral-950 font-mono tracking-widest uppercase animate-pulse shrink-0 flex items-center gap-1.5 shadow-[0_0_8px_rgba(251,191,36,0.25)] rounded-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
                          ★ NEXT UP
                        </span>
                      )}
                      {student.discount !== undefined && student.discount > 0 && (
                        <span className="text-[9px] font-black px-2.5 py-0.5 font-mono tracking-widest uppercase bg-amber-955 border border-amber-600 text-amber-400">
                          {student.discount === 5 ? '100% SCHOLARSHIP' : `DISCOUNT: GHC ${student.discount.toFixed(2)}/DAY`}
                        </span>
                      )}
                      {debtInfo && debtInfo.totalDebt > 0 && (
                        <span 
                          title={hasArrearsAtRisk 
                            ? `CRITICAL ARREARS: Student has ${debtInfo.pastUnpaidDays.length} unpaid school days (exceeds 5 days limit). Standing access at risk.`
                            : `PAST DUE DEBT: Student owes GHC ${debtInfo.totalDebt.toFixed(2)} for ${debtInfo.pastUnpaidDays.length} past days. Any incoming payment automatically settles these arrears first.`
                          }
                          className={`text-[9px] font-black px-2.5 py-0.5 font-mono tracking-widest uppercase cursor-help rounded-xs flex items-center gap-1 ${
                            hasArrearsAtRisk 
                              ? 'bg-red-500 text-white animate-pulse border border-red-400' 
                              : 'bg-red-950/80 border border-red-800 text-red-500 animate-pulse'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${hasArrearsAtRisk ? 'bg-white' : 'bg-red-500'}`} />
                          {hasArrearsAtRisk ? 'AT-RISK / INACTIVE - ' : ''}OWES GHC {debtInfo.totalDebt.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-neutral-400">
                      <span>GUARDIAN: <strong className="text-neutral-300 font-mono">{student.guardianPhone}</strong></span>
                      <span className="hidden sm:inline w-1 h-1 bg-neutral-700" />
                      <span>CATEGORY: <strong className="text-neutral-300 uppercase tracking-wider">{student.category}</strong></span>
                      
                      {(() => {
                        const classTeacher = users?.find(u => u.role === 'Teacher' && (u.assignedClass === student.class || u.assignedClasses?.includes(student.class)));
                        if (!classTeacher) return null;
                        const teacherGates = classTeacher.assignedClasses && classTeacher.assignedClasses.length > 0 
                          ? classTeacher.assignedClasses.join(', ') 
                          : classTeacher.assignedClass;
                        return (
                          <>
                            <span className="hidden sm:inline w-1 h-1 bg-neutral-700" />
                            <span className="flex items-center gap-1.5">
                              TEACHER: <strong className="text-neutral-300 uppercase">{classTeacher.name}</strong>
                              <span className="text-[9px] font-black font-mono bg-neutral-900 border border-neutral-800 text-amber-400 px-1.5 py-0.5 tracking-wider uppercase rounded-xs">
                                {teacherGates} ACCESS
                              </span>
                            </span>
                          </>
                        );
                      })()}

                      {isPaid && (() => {
                        const collector = paidInfo ? users?.find(u => u.name === paidInfo.collectedBy) : undefined;
                        const displayStatus = isPrepaid 
                          ? isConfirmedPresent ? 'PREPAID [PRESENT]' : 'PREPAID COVERED' 
                          : isScholarship 
                            ? isConfirmedPresent ? 'SCHOLARSHIP [PRESENT]' : 'SCHOLARSHIP' 
                            : isConfirmedPresent ? 'PAID [PRESENT]' : 'PAID';
                        const displayAmount = isPrepaid ? '0 CASH (PREPAID)' : isScholarship ? 'FREE' : `GHC ${(paidInfo ? paidInfo.amount : 5).toFixed(2)}`;
                        const collectedByText = paidInfo ? paidInfo.collectedBy : 'SYSTEM RUNNING BAL';
                        return (
                          <>
                            <span className="hidden sm:inline w-1 h-1 bg-neutral-700" />
                            <span className="flex items-center gap-1.5 text-emerald-400">
                              STATUS: <strong className="text-emerald-300 uppercase">{displayStatus}</strong>
                              <span className="text-[9px] font-black font-mono bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 px-1.5 py-0.5 tracking-wider uppercase rounded-xs">
                                {displayAmount}
                              </span>
                            </span>
                            <span className="hidden sm:inline w-1 h-1 bg-neutral-700" />
                            <span className="flex items-center gap-1.5 text-neutral-400">
                              BY: <strong className="text-neutral-300 uppercase">{collectedByText}</strong>
                            </span>
                          </>
                        );
                      })()}

                      {isPresentOrZeroPay && (() => {
                        const collectedByText = paidInfo ? paidInfo.collectedBy : 'SYSTEM';
                        return (
                          <>
                            <span className="hidden sm:inline w-1 h-1 bg-neutral-700" />
                            <span className="flex items-center gap-1.5 text-amber-400">
                              STATUS: <strong className="text-amber-300 uppercase">PRESENT (¢0)</strong>
                              <span className="text-[9px] font-black font-mono bg-amber-955 border border-amber-900/50 text-amber-400 px-1.5 py-0.5 tracking-wider uppercase rounded-xs">
                                0 CASH Today
                              </span>
                            </span>
                            <span className="hidden sm:inline w-1 h-1 bg-neutral-700" />
                            <span className="flex items-center gap-1.5 text-neutral-400">
                              BY: <strong className="text-neutral-300 uppercase">{collectedByText}</strong>
                            </span>
                          </>
                        );
                      })()}

                      {isAbsent && (() => {
                        const collector = users?.find(u => u.name === paidInfo.collectedBy);
                        const accessLevel = (collector?.assignedClasses && collector.assignedClasses.length > 0) 
                          ? collector.assignedClasses.join(', ') 
                          : (collector?.assignedClass || ((collector?.role === 'Administrator' || collector?.role === 'Headmaster') ? 'ALL CORE' : collector?.role === 'Accountant' ? 'ACCOUNT DECK' : 'OFFICE'));
                        return (
                          <>
                            <span className="hidden sm:inline w-1 h-1 bg-neutral-700" />
                            <span className="flex items-center gap-1.5 text-red-400">
                              MARKED ABSENT BY: <strong className="text-red-300 uppercase">{paidInfo.collectedBy}</strong>
                              <span className="text-[9px] font-black font-mono bg-red-955 border border-red-900/50 text-red-400 px-1.5 py-0.5 tracking-wider uppercase rounded-xs">
                                {accessLevel}
                              </span>
                            </span>
                          </>
                        );
                      })()}

                      {studentDebtMap.get(student.id) && studentDebtMap.get(student.id)!.totalDebt > 0 && (
                        <>
                          <span className="hidden sm:inline w-1 h-1 bg-neutral-700" />
                          <span className="text-red-400 font-black font-mono">
                            DEBT Arrears: GHC {studentDebtMap.get(student.id)!.totalDebt.toFixed(2)} ({studentDebtMap.get(student.id)!.pastUnpaidDays.length} days)
                          </span>
                        </>
                      )}
                    </div>
                    {/* Render existing note if there is one today */}
                    {paidInfo && paidInfo.notes && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-amber-300 font-mono bg-amber-955/40 border border-amber-900/60 px-3 py-1.5 rounded-sm w-fit max-w-full">
                        <MessageSquare size={13} className="text-amber-400 shrink-0" />
                        <span className="uppercase font-black tracking-wider text-[9px] text-amber-400">NOTE:</span>
                        <span className="text-neutral-200 font-medium select-all break-words">"{paidInfo.notes}"</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative flex items-center w-full sm:w-auto mt-4 sm:mt-0">
                  {/* Left Scroll Button Indicator for Action Drawer Buttons on Mobile */}
                  <button
                    type="button"
                    onClick={() => {
                      const container = document.getElementById(`action-scroll-${student.id}`);
                      if (container) {
                        container.scrollBy({ left: -140, behavior: 'smooth' });
                      }
                    }}
                    className="flex sm:hidden shrink-0 items-center justify-center w-8 h-[42px] bg-neutral-950 hover:bg-neutral-900 border-2 border-neutral-800 text-amber-400 active:scale-95 cursor-pointer z-10 mr-1.5"
                    title="Scroll Buttons Left"
                  >
                    <ChevronLeft size={16} className="stroke-[3]" />
                  </button>

                  {/* Scrollable Container with buttons */}
                  <div 
                    id={`action-scroll-${student.id}`}
                    className="flex-grow flex items-center gap-2 justify-start sm:justify-end overflow-x-auto whitespace-nowrap sm:flex-wrap sm:whitespace-normal sm:overflow-visible max-w-full pb-1 scroll-smooth scrollbar-thin scrollbar-thumb-amber-400/20"
                    style={{ scrollbarWidth: 'thin' }}
                  >
                    {/* Transaction History Button */}
                    <button
                      onClick={() => setHistoryStudent(student)}
                      title="View Student Transaction Ledger"
                      className="p-2.5 text-neutral-400 hover:text-amber-450 border-2 border-neutral-800 hover:border-amber-450 bg-neutral-950 transition-colors cursor-pointer flex items-center justify-center font-bold"
                    >
                      <History size={16} />
                    </button>

                    {/* SMS Alert */}
                    <button
                      onClick={() => triggerSmsAlert(student)}
                      title="Send Guardian Receipt"
                      className="p-2.5 text-neutral-400 hover:text-amber-400 border-2 border-neutral-800 hover:border-amber-400 bg-neutral-950 transition-colors cursor-pointer"
                    >
                      <BellRing size={16} />
                    </button>

                    {/* Generate Student QR Button */}
                    <button
                      onClick={() => setQrStudent(student)}
                      title="Generate Student QR Code"
                      className="p-2.5 text-neutral-400 hover:text-amber-450 border-2 border-neutral-800 hover:border-amber-450 bg-neutral-950 transition-colors cursor-pointer flex items-center justify-center"
                      id={`btn-generate-qr-${student.id}`}
                    >
                      <QrCode size={16} />
                    </button>

                    {/* Export Receipt Button */}
                    <button
                      onClick={() => setReceiptStudent(student)}
                      title={isPaid ? "Export Daily Payment PDF Invoice" : "Export Receipt (No active payment record found)"}
                      id={`btn-export-receipt-${student.id}`}
                      className={`p-2.5 px-4 font-mono text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 border-2 ${
                        isPaid 
                          ? 'text-amber-400 border-amber-400/50 hover:border-amber-400 hover:bg-amber-400/10 bg-amber-400/5' 
                          : 'text-neutral-500 border-neutral-800 hover:border-neutral-700 hover:text-neutral-300 bg-neutral-950'
                      }`}
                    >
                      <Printer size={14} className="stroke-[2.5]" />
                      <span>Export Receipt</span>
                    </button>

                    {/* Advance Custom Pay trigger */}
                    <button
                      onClick={() => {
                        setAdvanceStudent(student);
                        setAdvanceAmount(25); // default GHC 25 covers 5 days
                        setAdvanceSuccess(false);
                      }}
                      title="Pay Advance / Custom Multi-Days"
                      className="p-2.5 text-neutral-400 hover:text-emerald-450 border-2 border-neutral-800 hover:border-emerald-450 bg-neutral-950 transition-colors cursor-pointer flex items-center gap-1.5 px-4"
                    >
                      <Coins size={14} className="text-emerald-450" />
                      <span className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-300">ADVANCE</span>
                    </button>

                    {/* Pupil Bulk Dates Check-in Trigger */}
                    <button
                      onClick={() => {
                        setBulkPupil(student);
                        setSelectedBulkDates([]);
                        setBulkActionType('paid');
                        setBulkCustomAmount('');
                      }}
                      title="Bulk record check-in and fees over selected dates for this pupil"
                      className="p-2.5 text-neutral-400 hover:text-amber-450 border-2 border-neutral-800 hover:border-amber-450 bg-neutral-950 transition-colors cursor-pointer flex items-center gap-1.5 px-4"
                    >
                      <Layers size={14} className="text-amber-450" />
                      <span className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-300">BULK DATES</span>
                    </button>

                    {/* Daily Attendance Note Trigger */}
                    <button
                      onClick={() => handleOpenNoteField(student.id, paidInfo?.notes || '')}
                      title="Add or update short text note to pupil's daily attendance"
                      className={`p-2.5 transition-colors cursor-pointer flex items-center gap-1.5 px-4 border-2 ${
                        paidInfo?.notes 
                          ? 'text-amber-400 border-amber-400 bg-amber-400/10' 
                          : 'text-neutral-400 hover:text-amber-450 border-neutral-800 hover:border-amber-450 bg-neutral-950'
                      }`}
                    >
                      <MessageSquare size={14} className={paidInfo?.notes ? 'text-amber-400' : 'text-neutral-400'} />
                      <span className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-300">
                        {paidInfo?.notes ? 'EDIT NOTE' : 'DAILY NOTE'}
                      </span>
                    </button>

                    {/* Notify Guardian Button */}
                    <button
                      onClick={async () => {
                        const isCheckedIn = (!!paidInfo && !paidInfo.isAbsent) || isPaid;
                        if (!isCheckedIn) {
                          showToast("Please mark the pupil as Present / Paid first before sending a check-in notification.");
                          return;
                        }
                        try {
                          await handleShareWhatsApp('check_in', student);
                        } catch (err) {
                          showToast("Failed to dispatch check-in notification.");
                        }
                      }}
                      title="Send instant Gate Check-In notification to guardian"
                      className={`p-2.5 transition-all cursor-pointer flex items-center gap-1.5 px-4 border-2 ${
                        ((!!paidInfo && !paidInfo.isAbsent) || isPaid)
                          ? 'text-amber-400 border-amber-900/60 hover:border-amber-450 bg-amber-950/20 hover:bg-amber-900/30'
                          : 'text-neutral-650 border-neutral-800 bg-neutral-950/40 opacity-40 hover:opacity-100 hover:border-amber-400/20'
                      }`}
                    >
                      <BellRing size={14} className={((!!paidInfo && !paidInfo.isAbsent) || isPaid) ? 'text-amber-400 animate-pulse' : 'text-neutral-500'} />
                      <span className="text-[10px] font-mono font-black uppercase tracking-widest">NOTIFY GUARDIAN</span>
                    </button>

                    {/* Arrears WhatsApp Notification Button */}
                    {debtInfo && debtInfo.totalDebt > 0 && (
                      <button
                        onClick={() => {
                          handleShareWhatsApp('arrears_warning', student, undefined, {
                            unpaidDaysCount: debtInfo.pastUnpaidDays?.length || 0,
                            totalPaid: debtInfo.totalPaid || 0,
                            totalArrears: debtInfo.totalDebt || 0,
                            schoolOwes: debtInfo.paymentType === 'Daily' ? (debtInfo.runningBalance > 0 ? debtInfo.runningBalance : 0) : 0,
                            attendancePct: 100
                          });
                        }}
                        title={`Send quick accumulated arrears WhatsApp alert to parent. Outstanding Debt: GHC ${debtInfo.totalDebt.toFixed(2)}`}
                        className="p-2.5 text-emerald-400 hover:text-white border-2 border-emerald-900/60 hover:border-emerald-450 bg-emerald-950/20 hover:bg-emerald-900/30 transition-all cursor-pointer flex items-center gap-1.5 px-4"
                      >
                        <MessageSquare size={14} className="text-emerald-450 stroke-[2.5]" />
                        <span className="text-[10px] font-mono font-black uppercase tracking-widest text-emerald-300">ARREARS MSG</span>
                      </button>
                    )}

                    {/* Pay trigger */}
                    {manualAmountStudentId === student.id ? (
                      <div className="flex items-center gap-2 w-full sm:w-auto animate-fade-in bg-neutral-900 border-2 border-amber-500/50 p-1.5 rounded-sm">
                        <span className="text-[10px] font-mono font-black text-amber-500 uppercase tracking-widest pl-1">GHC</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={manualAmountValue}
                          onChange={(e) => setManualAmountValue(e.target.value)}
                          className="bg-neutral-950 border border-neutral-800 text-white font-mono text-center text-xs px-2 py-1 w-24 focus:outline-none focus:border-amber-400 h-[32px] font-black"
                          placeholder="0.00"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const amt = parseFloat(manualAmountValue);
                              if (isNaN(amt) || amt < 0) {
                                showToast("Please enter a valid non-negative amount.");
                                return;
                              }
                              if (isPaid) {
                                if (!window.confirm(`Warning: ${student.name} already has a payment registered today.\nAre you sure you want to log this duplicate manual payment of GHC ${amt.toFixed(2)}?`)) {
                                  return;
                                }
                              }
                              recordPayment(student.id, true, amt, undefined, isPaid);
                              showToast(`Successfully logged custom GHC ${amt.toFixed(2)} payment for ${student.name}!`);
                              scrollToNextUnpaid(student.id);
                              setManualAmountStudentId(null);
                              setManualAmountValue('');
                            } else if (e.key === 'Escape') {
                              setManualAmountStudentId(null);
                              setManualAmountValue('');
                            }
                          }}
                        />

                        {/* Real-time Debounced Auto-Save Status Badge */}
                        {saveStatus === 'saving' && (
                          <span className="text-[9px] font-mono font-black text-amber-400 uppercase tracking-widest px-1 animate-pulse shrink-0">
                            Saving...
                          </span>
                        )}
                        {saveStatus === 'saved' && (
                          <span className="text-[9px] font-mono font-black text-emerald-400 uppercase tracking-widest px-1 shrink-0 animate-bounce">
                            Saved ✔️
                          </span>
                        )}
                        {saveStatus === 'dirty' && (
                          <span className="text-[9px] font-mono font-black text-neutral-400 uppercase tracking-widest px-1 shrink-0">
                            Typing...
                          </span>
                        )}
                        {saveStatus === 'failed' && (
                          <span className="text-[9px] font-mono font-black text-red-500 uppercase tracking-widest px-1 shrink-0">
                            Err ⚠️
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            const amt = parseFloat(manualAmountValue);
                            if (isNaN(amt) || amt < 0) {
                              showToast("Please enter a valid non-negative amount.");
                              return;
                            }
                            if (isPaid) {
                              if (!window.confirm(`Warning: ${student.name} already has a payment registered today.\nAre you sure you want to log this duplicate manual payment of GHC ${amt.toFixed(2)}?`)) {
                                return;
                              }
                            }
                            recordPayment(student.id, true, amt, undefined, isPaid);
                            showToast(`Successfully logged custom GHC ${amt.toFixed(2)} payment for ${student.name}!`);
                            scrollToNextUnpaid(student.id);
                            setManualAmountStudentId(null);
                            setManualAmountValue('');
                          }}
                          className="bg-emerald-500 hover:bg-emerald-400 text-black p-1 h-[32px] flex items-center justify-center font-black rounded-xs aspect-square cursor-pointer transition-colors"
                          title="Save manual amount"
                        >
                          <Check size={14} className="stroke-[3]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setManualAmountStudentId(null);
                            setManualAmountValue('');
                          }}
                          className="bg-neutral-950 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-white p-1 h-[32px] flex items-center justify-center font-black rounded-xs aspect-square cursor-pointer transition-colors"
                          title="Cancel"
                        >
                          <X size={14} className="stroke-[3]" />
                        </button>
                      </div>
                    ) : isHoliday ? (
                      <div className="flex items-center gap-2 px-6 py-2.5 bg-red-950/20 text-red-400 font-mono text-[10px] uppercase font-black tracking-widest border border-red-500/20 h-[42px] shrink-0 select-none">
                        <Landmark size={14} className="text-red-500" />
                        <span>CLOSED: HOLIDAY DETECTED</span>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleTogglePayment(student.id)}
                          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all w-full sm:w-40 justify-center border-2 cursor-pointer ${
                            isPaid 
                              ? student.paymentType === 'Term'
                                ? 'bg-sky-500/10 text-sky-400 border-sky-500 hover:border-sky-400 hover:bg-sky-500/20 shadow-none'
                                : isPrepaid
                                  ? 'bg-sky-500/10 text-sky-400 border-sky-500 hover:border-sky-400 hover:bg-sky-500/20 shadow-none'
                                  : isScholarship
                                    ? 'bg-purple-500/10 text-purple-400 border-purple-500 hover:border-purple-400 hover:bg-purple-500/20 shadow-none'
                                    : isArrearsCleared
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500 hover:border-emerald-400 hover:bg-emerald-500/20 shadow-none'
                                      : 'bg-amber-400 text-black border-amber-400 shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)]'
                              : student.paymentType === 'Term'
                                ? 'bg-sky-950/10 text-sky-400 border-sky-900 hover:border-sky-400 hover:text-white bg-sky-950/20'
                                : 'bg-neutral-950 text-neutral-455 border-neutral-800 hover:border-neutral-600 hover:text-white'
                          }`}
                        >
                          {isPaid ? (
                            <>
                              <Check size={14} className="stroke-[3]" />
                              {student.paymentType === 'Term' ? (
                                <span>TERM PASS (GHC 0)</span>
                              ) : isPrepaid ? (
                                <span>PREPAID (GHC 0)</span>
                              ) : isScholarship ? (
                                <span>SCHOLARSHIP (GHC 0)</span>
                              ) : isArrearsCleared ? (
                                <span>DEBT CLEARED</span>
                              ) : (
                                <span>PAID GHC {((paidInfo?.amount !== undefined) ? paidInfo.amount : (5.00 - (student.discount || 0))).toFixed(2)}</span>
                              )}
                            </>
                          ) : (
                            <>
                              {student.paymentType === 'Term' ? (
                                <>
                                  <span className="text-sky-400 font-black">★</span> TERM PASS check-in
                                </>
                              ) : (
                                <>
                                  <span className="text-amber-400 font-black">•</span> COLLECT GHC {(5.00 - (student.discount || 0)).toFixed(2)}
                                </>
                              )}
                            </>
                          )}
                        </button>

                        {/* Dynamic Fee Select Dropdown */}
                        <div className="relative">
                          <select
                            value=""
                            onChange={(e) => {
                              const action = e.target.value;
                              if (!action) return;

                              const handleDropdownRecord = (amount?: number, label?: string) => {
                                const finalAmt = amount !== undefined ? amount : Math.max(0, 5.00 - (student.discount || 0));
                                if (isPaid) {
                                  if (window.confirm(`Warning: ${student.name} already has a payment registered today.\nAre you sure you want to log a duplicate payment of GHC ${finalAmt.toFixed(2)}?`)) {
                                    recordPayment(student.id, true, amount, undefined, true);
                                    showToast(`Successfully logged duplicate payment of GHC ${finalAmt.toFixed(2)} for ${student.name}!`);
                                    scrollToNextUnpaid(student.id);
                                  }
                                } else {
                                  recordPayment(student.id, true, amount);
                                  showToast(label || `Logged GHC ${finalAmt.toFixed(2)} payment for ${student.name}.`);
                                  scrollToNextUnpaid(student.id);
                                }
                              };

                              if (action === 'discounted') {
                                const discountAmount = student.discount || 0;
                                const actualAmount = Math.max(0, 5.00 - discountAmount);
                                handleDropdownRecord(undefined, `Logged GHC ${actualAmount.toFixed(2)} payment for ${student.name}.`);
                              } else if (action === 'ghc5') {
                                handleDropdownRecord(5.00, `Logged full GHC 5.00 payment for ${student.name} (discount ignored).`);
                              } else if (action === 'ghc4') {
                                handleDropdownRecord(4.00, `Logged custom GHC 4.00 payment for ${student.name}.`);
                              } else if (action === 'ghc3') {
                                handleDropdownRecord(3.00, `Logged custom GHC 3.00 payment for ${student.name}.`);
                              } else if (action === 'ghc2') {
                                handleDropdownRecord(2.00, `Logged custom GHC 2.00 payment for ${student.name}.`);
                              } else if (action === 'free') {
                                handleDropdownRecord(0.00, `Logged GHC 0.00 Scholarship for ${student.name}.`);
                              } else if (action === 'manual') {
                                if (isPaid && !window.confirm(`Warning: ${student.name} already has a payment registered today.\nAre you sure you want to save a duplicate custom payment?`)) {
                                  return;
                                }
                                setManualAmountStudentId(student.id);
                                const currentAmt = isPaid && paidInfo ? (payments.find(p => p.id === paidInfo.paymentId)?.amount ?? 5) : Math.max(0, 5 - (student.discount ?? 0));
                                const amtStr = currentAmt.toString();
                                setManualAmountValue(amtStr);
                                lastSavedValueRef.current = amtStr;
                                setSaveStatus('idle');
                              } else if (action === 'absent') {
                                recordAbsent(student.id);
                                showToast(`Marked ${student.name} as absent today (excused from fee).`);
                                scrollToNextUnpaid(student.id);
                              } else if (action === 'unpaid') {
                                if (paidInfo) {
                                  deletePayment(paidInfo.paymentId);
                                  showToast(`Cleared payment status for ${student.name}.`);
                                }
                              } else if (action === 'deactivate') {
                                setDeleteConf({
                                  isOpen: true,
                                  type: 'student_deactivate',
                                  targetId: student.id,
                                  targetName: student.name,
                                  userInput: '',
                                  onConfirm: () => {
                                    updateStudent({
                                      ...student,
                                      active: false
                                    });
                                    showToast(`${student.name} is now deactivated and will not be recorded in school registers.`);
                                  }
                                });
                              } else if (action === 'delete') {
                                if (currentUser?.role !== 'Administrator') {
                                  showToast('Access Denied: Only Administrators are permitted to delete student profiles completely from the system.');
                                } else {
                                  setDeleteConf({
                                    isOpen: true,
                                    type: 'student_delete',
                                    targetId: student.id,
                                    targetName: student.name,
                                    userInput: '',
                                    onConfirm: () => {
                                      deleteStudent(student.id);
                                      showToast(`Student ${student.name} was permanently purged.`);
                                    }
                                  });
                                }
                              }
                              e.target.value = "";
                            }}
                            className="bg-neutral-950 hover:bg-neutral-850 hover:text-white text-neutral-400 border-2 border-neutral-800 hover:border-neutral-600 px-3.5 py-2.5 text-xs font-mono font-black uppercase tracking-widest cursor-pointer focus:outline-none focus:border-amber-400 h-[42px] flex items-center justify-center text-center justify-items-center"
                            defaultValue=""
                          >
                            <option value="" disabled>FEES ▾</option>
                            {!isPaid && !isAbsent && (
                              <>
                                <option value="discounted" className="bg-neutral-950 text-white font-mono text-xs">Collect GHC {(5.00 - (student.discount || 0)).toFixed(2)} (Standard)</option>
                                {(student.discount !== undefined && student.discount > 0) && (
                                  <option value="ghc5" className="bg-neutral-950 text-white font-mono text-xs">Collect Full GHC 5.00</option>
                                )}
                                <option value="ghc4" className="bg-neutral-950 text-white font-mono text-xs">Collect GHC 4.00</option>
                                <option value="ghc3" className="bg-neutral-950 text-white font-mono text-xs">Collect GHC 3.00</option>
                                <option value="ghc2" className="bg-neutral-950 text-white font-mono text-xs">Collect GHC 2.00</option>
                                <option value="free" className="bg-neutral-950 text-white font-mono text-xs">100% Scholarship (GHC 0.00)</option>
                                <option value="manual" className="bg-neutral-950 text-amber-400 font-mono text-xs font-black">⌨ Enter Manual Amount...</option>
                              </>
                            )}
                            {isPaid && (
                              <>
                                <option value="unpaid" className="bg-neutral-950 text-white font-mono text-xs">Clear Payment (Unpaid)</option>
                                <option value="discounted" className="bg-neutral-950 text-white font-mono text-xs">Switch to GHC {(5.00 - (student.discount || 0)).toFixed(2)}</option>
                                {(student.discount !== undefined && student.discount > 0) && (
                                  <option value="ghc5" className="bg-neutral-950 text-white font-mono text-xs">Switch to Full GHC 5.00</option>
                                )}
                                <option value="ghc4" className="bg-neutral-950 text-white font-mono text-xs">Switch to GHC 4.00</option>
                                <option value="ghc3" className="bg-neutral-950 text-white font-mono text-xs">Switch to GHC 3.00</option>
                                <option value="ghc2" className="bg-neutral-950 text-white font-mono text-xs">Switch to GHC 2.00</option>
                                <option value="free" className="bg-neutral-950 text-white font-mono text-xs">Switch to Free (GHC 0.00)</option>
                                <option value="manual" className="bg-neutral-950 text-amber-400 font-mono text-xs font-black">⌨ Enter Manual Amount...</option>
                              </>
                            )}
                            {isAbsent && (
                              <>
                                <option value="discounted" className="bg-neutral-950 text-white font-mono text-xs">Pay GHC {(5.00 - (student.discount || 0)).toFixed(2)}</option>
                                <option value="ghc5" className="bg-neutral-950 text-white font-mono text-xs">Pay Full GHC 5.00</option>
                                <option value="ghc4" className="bg-neutral-950 text-white font-mono text-xs">Pay GHC 4.00</option>
                                <option value="ghc3" className="bg-neutral-950 text-white font-mono text-xs">Pay GHC 3.00</option>
                                <option value="ghc2" className="bg-neutral-950 text-white font-mono text-xs">Pay GHC 2.00</option>
                                <option value="free" className="bg-neutral-950 text-white font-mono text-xs">Pay Free (GHC 0.00)</option>
                                <option value="unpaid" className="bg-neutral-950 text-white font-mono text-xs">Clear (Unpaid)</option>
                                <option value="manual" className="bg-neutral-950 text-amber-400 font-mono text-xs font-black">⌨ Enter Manual Amount...</option>
                              </>
                            )}
                            <optgroup label="STUDENT REGISTER" className="bg-neutral-900 text-neutral-450 font-sans text-[10px] tracking-wider uppercase font-black">
                              <option value="deactivate" className="bg-neutral-950 text-red-400 font-mono text-xs">⚠️ Deactivate / Left School</option>
                              <option 
                                value="delete" 
                                className="bg-neutral-950 text-red-500 font-mono text-[11px] font-bold"
                              >
                                🗑️ Delete Student / Purge {currentUser?.role !== 'Administrator' ? '(Admin Only)' : ''}
                              </option>
                            </optgroup>
                          </select>
                        </div>

                        {/* Present or ¢0 trigger */}
                        <button
                          onClick={() => handleTogglePresentZeroPay(student.id)}
                          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all w-full sm:w-44 justify-center border-2 cursor-pointer shrink-0 ${
                            isConfirmedPresent 
                              ? 'bg-amber-450 border-amber-450 text-neutral-950 shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)]'
                              : 'bg-neutral-950 text-neutral-455 border-neutral-800 hover:border-neutral-600 hover:text-white'
                          }`}
                        >
                          {isConfirmedPresent ? (
                            <>
                              <Check size={14} className="stroke-[3]" /> PRESENT or ¢0
                            </>
                          ) : (
                            <>
                              <span className="text-amber-400 font-black">•</span> PRESENT or ¢0
                            </>
                          )}
                        </button>

                        {/* Absent trigger */}
                        <button
                          onClick={() => handleToggleAbsent(student.id)}
                          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all w-full sm:w-40 justify-center border-2 cursor-pointer ${
                            isAbsent 
                              ? 'bg-red-500 text-white border-red-500 shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)]'
                              : 'bg-neutral-950 text-neutral-455 border-neutral-800 hover:border-neutral-600 hover:text-white'
                          }`}
                        >
                          {isAbsent ? (
                            <>
                              <X size={14} className="stroke-[3]" /> ABSENT (DEBT)
                            </>
                          ) : (
                            <>
                              <span className="text-red-500 font-black">•</span> MARK ABSENT
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>

                  {/* Right Scroll Button Indicator for Action Drawer Buttons on Mobile */}
                  <button
                    type="button"
                    onClick={() => {
                      const container = document.getElementById(`action-scroll-${student.id}`);
                      if (container) {
                        container.scrollBy({ left: 140, behavior: 'smooth' });
                      }
                    }}
                    className="flex sm:hidden shrink-0 items-center justify-center w-8 h-[42px] bg-neutral-950 hover:bg-neutral-900 border-2 border-neutral-800 text-amber-400 active:scale-95 cursor-pointer z-10 ml-1.5"
                    title="Scroll Buttons Right"
                  >
                    <ChevronRight size={16} className="stroke-[3]" />
                  </button>
                </div>
              </div>

              {/* Inline Attendance Record Note Editor Panel */}
              {editingNoteStudentId === student.id && (
                <div className="px-6 pb-6 pt-3 bg-neutral-900 border-t border-neutral-800 animate-fade-in no-print space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-neutral-950 p-3">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <MessageSquare size={14} className="text-amber-400" />
                      <span className="text-amber-400 font-black uppercase tracking-wider text-[10px]">Daily Notes desk:</span>
                      <span className="text-neutral-450 font-bold">Write custom attendance/payment memo for {student.name} today.</span>
                    </div>
                    <span className="text-[9px] font-mono uppercase bg-neutral-900 text-neutral-500 px-2 py-0.5 border border-neutral-800">
                      📅 DATE: {currentDate}
                    </span>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={noteInputValue}
                      onChange={(e) => setNoteInputValue(e.target.value)}
                      placeholder="e.g. absent due to illness, forgot fees, traveling with parents, to pay balance on Monday..."
                      maxLength={120}
                      className="flex-grow bg-neutral-950 border-2 border-neutral-800 focus:border-amber-400 focus:outline-none text-white text-xs px-3.5 py-2.5 font-mono"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveDailyNote(student.id);
                        } else if (e.key === 'Escape') {
                          setEditingNoteStudentId(null);
                          setNoteInputValue('');
                        }
                      }}
                    />
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSaveDailyNote(student.id)}
                        className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-mono font-black uppercase tracking-widest cursor-pointer transition-all"
                      >
                        Save Note
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNoteStudentId(null);
                          setNoteInputValue('');
                        }}
                        className="px-4 py-2.5 bg-neutral-950 border border-neutral-800 hover:bg-neutral-850 text-neutral-400 hover:text-white text-xs font-mono font-black uppercase tracking-widest cursor-pointer transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>

                  {/* Quick Tags Templates */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[9.5px] font-mono text-neutral-500 uppercase font-black mr-1">Quick Templates:</span>
                    {[
                      'Absent due to illness',
                      'Forgot fees',
                      'Traveling / Out of town',
                      'Part payment of fees',
                      'Parent promised tomorrow',
                      'Late arrival (checked-in late)',
                      'Brought food but no fees'
                    ].map(tmpl => (
                      <button
                        key={tmpl}
                        type="button"
                        onClick={() => setNoteInputValue(tmpl)}
                        className="px-2.5 py-1 bg-neutral-950 hover:bg-neutral-850 border border-neutral-850 hover:border-amber-400/40 text-[10px] text-neutral-400 hover:text-white font-mono cursor-pointer uppercase transition-all"
                      >
                        + {tmpl}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
              );
            })}

            {/* ACCOUNTANT RECONCILIATION SUMMARY DECK */}
            <div className="bg-neutral-950 p-6 sm:p-8 border-t-2 border-neutral-800 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 text-amber-400 font-mono text-[10px] uppercase font-black tracking-widest">
                    <Coins size={14} className="stroke-[2.5]" />
                    <span>DAILY COHORT COLLECTED VALUE</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-mono font-black text-white uppercase tracking-tight">
                    CLASS {selectedClass}: <span className="text-emerald-400">GHC {collectionTotal.toFixed(2)}</span>
                  </h3>
                  <p className="text-[11px] font-mono font-bold text-neutral-450 uppercase leading-none">
                    Checked In: <strong className="text-white">{paidCount}</strong> paid, <strong className="text-red-400">{absentCount}</strong> absent of <strong className="text-white">{classStudents.length}</strong> total active
                  </p>
                </div>

                <div className="hidden lg:block h-12 w-px bg-neutral-800" />

                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 text-amber-400 font-mono text-[10px] uppercase font-black tracking-widest">
                    <Landmark size={14} className="stroke-[2.5]" />
                    <span>GLOBAL SCHOOL-WIDE CASH DECK</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-mono font-black text-white tracking-tight">
                    TOTAL SCHOOL: <span className="text-amber-400">GHC {globalCollectionTotal.toFixed(2)}</span>
                  </h3>
                  <p className="text-[11px] font-mono font-bold text-neutral-450 uppercase leading-none">
                    Verified collections globally today: <strong className="text-white">{globalPaidCount}</strong> payments
                  </p>
                </div>

                <div className="hidden lg:block h-12 w-px bg-neutral-800" />

                <div className="bg-neutral-900 border border-neutral-850 p-4 shrink-0 flex-1 lg:max-w-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xs bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold shrink-0 font-mono text-[10px]">
                      GHC
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-mono font-black text-emerald-400 uppercase tracking-widest">CASH STATUS</p>
                      <p className="text-[10px] font-mono font-bold text-neutral-400 uppercase leading-snug">
                        Match <span className="text-white">GHC {globalCollectionTotal.toFixed(2)}</span> cash-in-hand under date <span className="text-amber-400 font-black">{currentDate}</span>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Daily Class Summary Statistics Footer Row */}
              <div className="border-t border-neutral-800 pt-5 grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                {/* 1. Paid Students Counter */}
                <div className="bg-neutral-900 border border-neutral-800 p-3.5 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-black block">PAID COHORT HEADCOUNT</span>
                    <strong className="text-sm font-black text-white">{paidCount} <span className="text-neutral-500 font-normal">/ {classStudents.length} Students</span></strong>
                  </div>
                  <div className="text-amber-400 bg-amber-400/5 border border-amber-400/15 p-2 rounded-xs">
                    <Users size={16} className="stroke-[2.5]" />
                  </div>
                </div>

                {/* 2. Total Expected Fees */}
                <div className="bg-neutral-900 border border-neutral-800 p-3.5 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[9px] text-neutral-510 uppercase tracking-widest font-black block">TOTAL EXPECTED FEES</span>
                    <strong className="text-sm font-black text-amber-400">GHC {classExpectedFees.toFixed(2)}</strong>
                  </div>
                  <div className="text-emerald-400 bg-emerald-500/5 border border-emerald-500/15 p-2 rounded-xs">
                    <Coins size={16} className="stroke-[2.5]" />
                  </div>
                </div>

                {/* 3. Collection Percentage */}
                <div className="bg-neutral-900 border border-neutral-800 p-3.5 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[9px] text-neutral-510 uppercase tracking-widest font-black block">COLLECTION PERCENTAGE</span>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm font-black text-white">{classCollectionPercentage.toFixed(1)}%</strong>
                      <span className="text-[10px] text-neutral-450">({paidCount} of {classStudents.length})</span>
                    </div>
                  </div>
                  <div className={`p-2 rounded-xs font-black text-[9px] ${
                    classCollectionPercentage >= 90 ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/40' :
                    classCollectionPercentage >= 50 ? 'bg-amber-951 text-amber-300 border-amber-900/30' :
                    'bg-red-955 text-red-500 border border-red-900/30'
                  }`}>
                    {classCollectionPercentage >= 90 ? 'EXCELLENT' : classCollectionPercentage >= 50 ? 'STABLE' : 'CRITICAL'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pupil QR Scanner Station Modal Overlay */}
      {isQrModalOpen && (
        <div id="qr-scanner-modal-overlay" className="fixed inset-0 bg-neutral-950/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border-4 border-neutral-800 max-w-4xl w-full p-6 md:p-8 shadow-[8px_8px_0px_0px_#fbbf24] flex flex-col lg:flex-row gap-6 overflow-y-auto max-h-[90vh]">
            
            {/* Left side: Camera View & controls */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b-2 border-neutral-850">
                <QrCode size={22} className="text-amber-500 stroke-[2.5]" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Pupil QR Scanner Station</h3>
                  <p className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider font-bold">SAAKO HOLY CHILD ACADEMY Gate Entry</p>
                </div>
              </div>

              {/* Viewport wrapper with relative scanner overlay */}
              <div className="relative aspect-square md:aspect-video w-full max-w-md mx-auto bg-neutral-950 border-4 border-neutral-800 overflow-hidden flex flex-col items-center justify-center">
                <div id="qr-scanner-viewport" className="w-full h-full object-cover"></div>
                
                {/* Scanner visual guide lines */}
                <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-amber-500/20 flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-amber-400 absolute opacity-70 animate-pulse rounded-md flex items-center justify-center">
                    {/* Retro corner bracket styles */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-amber-400 -mt-1 -ml-1"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-amber-400 -mt-1 -mr-1"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-amber-400 -mb-1 -ml-1"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-amber-400 -mb-1 -mr-1"></div>
                    {/* Animated horizontal scanning laser beam */}
                    <div className="w-full h-1 bg-amber-400 absolute shadow-[0_0_8px_2px_rgba(251,191,36,0.5)] animate-bounce"></div>
                  </div>
                </div>

                {scannerError && (
                  <div className="absolute inset-0 bg-neutral-950/90 flex flex-col items-center justify-center p-6 text-center space-y-4">
                    <AlertCircle size={32} className="text-red-500 animate-bounce" />
                    <p className="text-[10px] font-mono font-black text-red-500 uppercase tracking-widest">
                      ⚠️ Camera Access Blocked!
                    </p>
                    <p className="text-[9.5px] font-mono font-semibold text-neutral-400 uppercase leading-relaxed max-w-xs">
                      {scannerError}
                    </p>
                  </div>
                )}

                {/* Custom Amount Prompt Modal style Overlay */}
                {qrActivePromptStudent && (
                  <div className="absolute inset-0 bg-neutral-950/95 backdrop-blur-sm p-5 flex flex-col justify-between z-30 select-none">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 pb-1 border-b border-amber-500/25 text-amber-450">
                        <DollarSign size={16} />
                        <span className="text-[10px] font-mono font-black uppercase tracking-widest">ENTER CUSTOM CHECK-IN PAYMENT</span>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-[12px] font-sans font-black text-white uppercase leading-none">
                          {qrActivePromptStudent.name}
                        </p>
                        <p className="text-[8.5px] font-mono text-neutral-500 uppercase font-black font-semibold">
                          Roll: {qrActivePromptStudent.rollNumber || "N/A"} • Class: {qrActivePromptStudent.class}
                        </p>
                      </div>

                      {/* Manual text input */}
                      <div className="space-y-1.5 pt-1">
                        <label className="block text-[8px] font-mono text-neutral-500 uppercase font-black">
                          Custom Amount to Record ({currencySymbol})
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2.5 text-[10px] font-mono font-black text-neutral-500">{currencySymbol}</span>
                          <input
                            id="qr-custom-amount-input"
                            type="text"
                            value={qrCustomAmountInput}
                            onChange={(e) => setQrCustomAmountInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleQrCustomAmountSubmit();
                              }
                            }}
                            placeholder={`e.g. 10.00, 20.00`}
                            className="w-full bg-neutral-900 border border-neutral-800 focus:border-amber-400 text-white font-mono text-xs font-black py-2 pl-10 pr-4 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Quick Choice buttons */}
                      <div className="space-y-1 pt-1">
                        <span className="block text-[8px] font-mono text-neutral-500 uppercase font-bold">Quick select presets:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {[baseDailyFee, baseDailyFee * 2, baseDailyFee * 5, 20.00, 50.00].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setQrCustomAmountInput(preset.toFixed(2))}
                              className="px-2 py-1 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 text-[9px] font-mono font-black text-neutral-300 hover:text-white transition-all cursor-pointer"
                            >
                              {currencySymbol} {preset === 0 ? "0 (Free)" : preset.toFixed(2)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-neutral-900">
                      <button
                        type="button"
                        onClick={() => {
                          setQrActivePromptStudent(null);
                          addQrFeedback("🚫 Custom payment entry cancelled.", "warning");
                        }}
                        className="w-1/3 bg-neutral-900 hover:bg-neutral-855 border border-neutral-800 text-neutral-400 text-[9px] font-mono font-black uppercase py-2 tracking-wider transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleQrCustomAmountSubmit}
                        className="w-2/3 bg-amber-400 hover:bg-amber-300 text-black text-[9px] font-mono font-black uppercase py-2 tracking-widest transition-all cursor-pointer shadow-md"
                      >
                        Confirm payment
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Toggle configuration panel - updated with 3 scan modes */}
              <div className="bg-neutral-950 p-4 border border-neutral-850 space-y-3">
                <div className="flex justify-between items-center border-b border-neutral-900 pb-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase font-black text-white tracking-widest block">QR SCAN OPERATIONAL MODE</span>
                    <span className="text-[9px] font-mono uppercase font-bold text-neutral-500 block">Configure actions upon successful pupil QR scan detection</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setQrScanMode('auto');
                      setQrActivePromptStudent(null);
                    }}
                    className={`px-2 py-2.5 font-mono text-[9px] font-black uppercase tracking-wider border transition-all text-center flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      qrScanMode === 'auto'
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500 shadow-sm' 
                        : 'bg-neutral-950 text-neutral-550 border-neutral-900 hover:text-neutral-300'
                    }`}
                  >
                    <span>⚡ AUTO GHC 5</span>
                    <span className="text-[7.5px] font-semibold text-neutral-500">Record Instantly</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setQrScanMode('custom_prompt');
                    }}
                    className={`px-2 py-2.5 font-mono text-[9px] font-black uppercase tracking-wider border transition-all text-center flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      qrScanMode === 'custom_prompt'
                        ? 'bg-amber-950/40 text-amber-400 border-amber-500 shadow-sm' 
                        : 'bg-neutral-950 text-neutral-550 border-neutral-900 hover:text-neutral-300'
                    }`}
                  >
                    <span>✏️ ENTER CUSTOM</span>
                    <span className="text-[7.5px] font-semibold text-neutral-500">Prompt Amount</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setQrScanMode('view_only');
                      setQrActivePromptStudent(null);
                    }}
                    className={`px-2 py-2.5 font-mono text-[9px] font-black uppercase tracking-wider border transition-all text-center flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      qrScanMode === 'view_only'
                        ? 'bg-neutral-850/40 text-white border-neutral-650 shadow-sm' 
                        : 'bg-neutral-950 text-neutral-550 border-neutral-900 hover:text-neutral-300'
                    }`}
                  >
                    <span>🔍 IDENTIFY ONLY</span>
                    <span className="text-[7.5px] font-semibold text-neutral-500">No Action Recorded</span>
                  </button>
                </div>
              </div>

              {/* QR Scan Simulation Tool (Perfect for iframe or testing environments) */}
              <div className="bg-neutral-950 p-4 border border-neutral-850 space-y-3">
                <div className="flex justify-between items-center border-b border-neutral-900 pb-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase font-black text-amber-400 tracking-widest block">⚡ CAMERA SCANNER SIMULATOR</span>
                    <span className="text-[9px] font-mono uppercase font-bold text-neutral-500 block">Emulate real QR badge check-in instantly</span>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={testScanStudentId}
                    onChange={(e) => setTestScanStudentId(e.target.value)}
                    className="flex-grow bg-neutral-900 border-2 border-neutral-800 p-2.5 text-[10px] font-mono font-bold text-white focus:outline-none focus:border-amber-400 uppercase rounded-none cursor-pointer"
                  >
                    <option value="">-- Choose Pupil to Simulate Scan --</option>
                    {students.filter(s => s.active && s.class === selectedClass).map(student => (
                      <option key={student.id} value={student.id}>
                        {student.name} (ID: {student.id.substring(0,6).toUpperCase()})
                      </option>
                    ))}
                    <optgroup label="OTHER CLASSES" className="bg-neutral-950 text-neutral-500 font-mono font-black text-[9px]">
                      {students.filter(s => s.active && s.class !== selectedClass).map(student => (
                        <option key={student.id} value={student.id}>
                          {student.name} ({student.class})
                        </option>
                      ))}
                    </optgroup>
                  </select>

                  <button
                    type="button"
                    disabled={!testScanStudentId}
                    onClick={() => {
                      if (testScanStudentId) {
                        handleQrCodeScanned(`SAAKOCHECK:STUDENT:${testScanStudentId}`);
                      }
                    }}
                    className="bg-amber-400 hover:bg-amber-300 disabled:bg-neutral-900 disabled:text-neutral-600 disabled:border-neutral-850 disabled:cursor-not-allowed text-black font-mono text-[9px] font-black uppercase px-4 py-2.5 border-2 border-amber-400 disabled:border-neutral-800 transition-all cursor-pointer shrink-0"
                    title="Emulate scanning this pupil's ID"
                  >
                    TRIGGER SCAN
                  </button>
                </div>
              </div>

              {/* Feedbacks Panel */}
              <div className="space-y-2">
                <h4 className="text-[9px] font-mono uppercase font-black text-neutral-500 tracking-wider">Live Log Output</h4>
                <div className="bg-neutral-950 p-3.5 border border-neutral-850 h-28 overflow-y-auto font-mono text-[9px] space-y-1.5 divide-y divide-neutral-900/60 animate-none">
                  {qrFeedbacks.length === 0 ? (
                    <div className="text-neutral-600 flex items-center justify-center h-full gap-1.5 uppercase font-black tracking-widest">
                      <span>Waiting for scanning input...</span>
                    </div>
                  ) : (
                    qrFeedbacks.map(f => (
                      <div 
                        key={f.id} 
                        className={`pt-1.5 first:pt-0 leading-relaxed font-bold uppercase tracking-wide ${
                          f.type === 'success' ? 'text-emerald-400' : f.type === 'warning' ? 'text-amber-400' : 'text-red-500'
                        }`}
                      >
                        {f.text}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right side: Session statistics & Checked-in pupil ledger */}
            <div className="w-full lg:w-80 flex flex-col border-t-2 lg:border-t-0 lg:border-l-2 border-neutral-800 lg:pl-6 pt-6 lg:pt-0 justify-between">
              <div className="space-y-4 flex-1">
                <div className="space-y-1">
                  <h4 className="text-[10px] font-mono uppercase font-black text-amber-400 tracking-widest">Session Ledger</h4>
                  <p className="text-[9px] text-neutral-400 uppercase font-bold font-mono">Students scanned in this scan cycle</p>
                </div>

                <div className="bg-neutral-950 border border-neutral-850 h-64 lg:h-96 overflow-y-auto divide-y divide-neutral-900">
                  {scanHistoryList.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 text-neutral-600 uppercase font-mono text-[9px] font-black tracking-widest">
                      <span>No pupils scanned yet</span>
                    </div>
                  ) : (
                    scanHistoryList.map(item => (
                      <div 
                        key={item.id} 
                        className="p-3 hover:bg-neutral-850/60 cursor-pointer transition-all space-y-1 font-mono border-l-2 border-transparent hover:border-amber-400 group"
                        title="Click to view pupil daily logs & history"
                        onClick={() => {
                          const targetStudent = students.find(s => s.id === item.studentId);
                          if (targetStudent) {
                            setIsQrModalOpen(false);
                            setHistoryStudent(targetStudent);
                            showToast(`Displaying transaction ledger logs for ${targetStudent.name}`);
                          } else {
                            showToast("Student profile could not be loaded.");
                          }
                        }}
                      >
                        <div className="flex justify-between items-start text-[9.5px]">
                          <span className="font-mono font-black uppercase text-white truncate max-w-[130px] group-hover:text-amber-400 transition-colors" title={item.studentName}>{item.studentName}</span>
                          <span className="text-[8.5px] font-mono text-neutral-500 font-bold bg-neutral-900 px-1 py-0.5 rounded-xs">{item.timestamp}</span>
                        </div>
                        <div className="flex justify-between items-center text-[8.5px] font-mono">
                          <span className="text-neutral-500">Roll: {item.rollNumber} • {item.class}</span>
                          <span className={`font-black uppercase tracking-wider ${item.success ? 'text-emerald-400' : 'text-amber-500'}`}>
                            {item.statusText}
                          </span>
                        </div>
                        <div className="text-[7.5px] text-amber-500/55 uppercase font-bold tracking-widest pt-0.5 text-right font-sans opacity-0 group-hover:opacity-100 transition-opacity">
                          View Student History Ledger ↗
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-850 mt-4">
                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(false)}
                  className="w-full bg-neutral-950 hover:bg-neutral-850 border-2 border-neutral-800 text-neutral-400 hover:text-white py-3.5 px-4 font-mono font-black text-[10px] uppercase tracking-widest transition-all hover:border-amber-400 hover:text-amber-400 cursor-pointer text-center"
                >
                  Shutdown Scanner Terminal
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SMS Guardian Notification Modal Overlay */}
      {guardianSmsStudent && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border-4 border-neutral-800 max-w-md w-full p-8 shadow-[8px_8px_0px_0px_#fbbf24] space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-neutral-800">
              <MessageSquareCode size={20} className="text-amber-400" />
              <h3 className="text-sm font-black uppercase tracking-widest text-white">Guardian SMS Ingress Receipt</h3>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-neutral-400 font-bold leading-relaxed">
                Send/copy school check-in receipt for pupil: <span className="font-extrabold text-white">{guardianSmsStudent.name}</span>
              </p>
              
              <div className="relative group">
                <div className="bg-neutral-950 text-emerald-400 font-mono text-[11px] p-5 border-2 border-neutral-850 leading-relaxed shadow-inner space-y-2 select-text">
                  <p className="text-neutral-500 font-bold uppercase tracking-wider">Sender Mask: SaakoHoly</p>
                  <div className="flex items-center justify-between gap-2 border-b border-neutral-850 pb-2">
                    <p className="text-neutral-500 font-bold">Guardian: <span className="text-neutral-350 select-all">{guardianSmsStudent.guardianPhone}</span></p>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(guardianSmsStudent.guardianPhone || '');
                        showToast(`Copied Contact: ${guardianSmsStudent.guardianPhone}`);
                      }}
                      className="text-[9px] hover:text-white text-amber-400 px-2 py-0.5 border border-amber-500/30 hover:border-amber-400 bg-neutral-900 font-mono uppercase tracking-wider font-extrabold flex items-center gap-1 transition"
                      title="Copy phone to clipboard"
                    >
                      <Copy size={9} />
                      <span>Copy Core Number</span>
                    </button>
                  </div>
                  <p className="pt-1">
                    Hello! Daily school check-in fee of GHC 5.00 for {guardianSmsStudent.name} is processed on {currentDate}. Verified check gate auditor: {currentUser?.name || "School Office"}. Clearance code: SEC-APPROVED. Thank you!
                  </p>
                </div>

                <div className="absolute right-2.5 bottom-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      const msg = `Hello! Daily school check-in fee of GHC 5.00 for ${guardianSmsStudent.name} is processed on ${currentDate}. Verified check gate auditor: ${currentUser?.name || "School Office"}. Clearance code: SEC-APPROVED. Thank you!`;
                      navigator.clipboard.writeText(msg);
                      showToast(`Copied text for ${guardianSmsStudent.name}'s guardian!`);
                    }}
                    className="text-[9px] text-amber-450 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded px-2.5 py-1 font-mono font-bold tracking-wider flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                    title="Copy full SMS content"
                  >
                    <Copy size={10} />
                    <span>Copy Full Message</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const msg = `Hello! Daily school check-in fee of GHC 5.00 for ${guardianSmsStudent.name} is processed on ${currentDate}. Verified check gate auditor: ${currentUser?.name || "School Office"}. Clearance code: SEC-APPROVED. Thank you!`;
                    navigator.clipboard.writeText(msg);
                    showToast("Copied SMS text to clipboard!");
                  }}
                  className="flex-1 text-xs bg-neutral-950 border-2 border-amber-500 hover:bg-neutral-800 text-amber-400 py-3 font-mono font-black flex items-center justify-center gap-2 uppercase tracking-widest transition-all cursor-pointer rounded-none hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Copy size={13} />
                  <span>Copy Text (Local API)</span>
                </button>
                <button
                  type="button"
                  onClick={sendSimulatedSms}
                  className="flex-1 text-xs bg-white hover:bg-amber-400 text-black py-3 font-mono font-black flex items-center justify-center gap-2 uppercase tracking-widest transition-all cursor-pointer rounded-none hover:-translate-y-0.5 active:translate-y-0"
                >
                  {successSms ? (
                    <>
                      <Check size={14} className="text-emerald-500 stroke-[3]" /> LEDGER DISPATCHED
                    </>
                  ) : (
                    <span>DISPATCH SIMULATED SMS</span>
                  )}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setGuardianSmsStudent(null)}
                className="w-full text-[10px] bg-neutral-950 border border-neutral-850 hover:border-neutral-750 text-neutral-500 hover:text-neutral-300 py-2 font-black transition-colors uppercase tracking-widest cursor-pointer"
              >
                Close Gateway Overlay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADVANCE SCHOOLING FEES PAYMENT MODAL OVERLAY */}
      {advanceStudent && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border-4 border-neutral-800 max-w-lg w-full p-8 shadow-[8px_8px_0px_0px_#10b981] space-y-6">
            <div className="flex items-center justify-between pb-3 border-b-2 border-neutral-800">
              <div className="flex items-center gap-3">
                <Coins size={20} className="text-emerald-400" />
                <h3 className="text-sm font-black uppercase tracking-widest text-white">Record Advance Schooling Fees</h3>
              </div>
              <button
                onClick={() => setAdvanceStudent(null)}
                className="text-neutral-500 hover:text-white transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordAdvanceSubmit} className="space-y-5">
              <div className="bg-neutral-950 p-4 border border-neutral-850 space-y-1">
                <p className="text-[10px] uppercase font-mono font-black text-neutral-500">Student Pupil</p>
                <div className="flex justify-between items-center text-sm font-bold text-white uppercase">
                  <span>{advanceStudent.name}</span>
                  <span className="font-mono text-xs text-amber-400">{advanceStudent.rollNumber} • {advanceStudent.class}</span>
                </div>
              </div>

              {/* Standard presets blocks */}
              {(() => {
                const dailyRate = Math.max(0.01, 5.00 - (advanceStudent.discount || 0));
                return (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-mono font-black text-neutral-500">Quick Standard Presets (GHC {dailyRate.toFixed(2)}/day)</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { label: '1 Week (5 Days)', val: dailyRate * 5 },
                          { label: '2 Weeks (10 Days)', val: dailyRate * 10 },
                          { label: '3 Weeks (15 Days)', val: dailyRate * 15 },
                          { label: '4 Weeks (20 Days)', val: dailyRate * 20 }
                        ].map(preset => (
                          <button
                            key={preset.val}
                            type="button"
                            onClick={() => setAdvanceAmount(preset.val)}
                            className={`py-2 px-1 text-center font-mono font-black text-[10px] transition-all border-2 ${
                              Math.abs(advanceAmount - preset.val) < 0.01
                                ? 'bg-emerald-500 border-emerald-500 text-black'
                                : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                            }`}
                          >
                            {preset.label}
                            <span className="block text-[11px] mt-0.5 text-inherit">GHC {preset.val.toFixed(2)}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom amount input field */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] uppercase font-mono font-black text-neutral-500">Custom Amount (GHC Cedis)</label>
                        <span className="text-[10px] uppercase font-mono font-black text-emerald-400 font-mono">
                          COVERS {Math.floor(advanceAmount / dailyRate)} DAYS
                        </span>
                      </div>
                      
                      <div className="relative">
                        <span className="absolute left-4 top-2.5 text-xs font-mono font-black text-neutral-500">GHC</span>
                        <input
                          type="number"
                          required
                          min={dailyRate}
                          max="1000"
                          step={dailyRate}
                          value={advanceAmount}
                          onChange={(e) => setAdvanceAmount(parseFloat(e.target.value) || dailyRate)}
                          className="w-full bg-neutral-950 border-2 border-neutral-800 py-2.5 pl-14 pr-4 text-xs font-mono font-black text-white focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                      {Math.abs(advanceAmount % dailyRate) > 0.01 && (
                        <p className="text-[9px] font-mono text-amber-500 uppercase font-bold">
                          * NOTICE: Amount is rounded down to standard GHC {dailyRate.toFixed(2)} daily chunks. Change of GHC {(advanceAmount % dailyRate).toFixed(2)} will be refunded or must be re-entered.
                        </p>
                      )}
                    </div>
                  </>
                );
              })()}

              {/* Anticipated coverage dates schedule list */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] uppercase font-mono font-black text-neutral-500">
                  <span>Anticipated Attendance Service Schedule</span>
                  <span className="text-neutral-400">STARTING FROM {currentDate}</span>
                </div>

                {advanceCalculatedDays.length === 0 ? (
                  <div className="p-4 text-center border border-dashed border-neutral-800 bg-neutral-950/40">
                    <p className="text-[10px] font-mono font-black uppercase text-amber-500">
                      ⚠️ No Future Term School Days Configured to allocate! Register a school term schedule first.
                    </p>
                  </div>
                ) : (
                  <div className="bg-neutral-950 p-2 border border-neutral-800 max-h-32 overflow-y-auto space-y-1 divide-y divide-neutral-900 pr-1">
                    {advanceCalculatedDays.map((dayStr, itemIdx) => {
                      const parts = dayStr.split('-');
                      const weekday = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
                        .toLocaleDateString('en-GB', { weekday: 'short' })
                        .toUpperCase();
                      const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
                      const isToday = dayStr === currentDate;

                      return (
                        <div key={dayStr} className="flex justify-between items-center py-1.5 text-[10px] font-mono font-bold text-neutral-400">
                          <span className="flex items-center gap-1.5">
                            <span className="text-neutral-600 font-normal">#{itemIdx + 1}</span>
                            <span className={isToday ? "text-amber-400 font-black" : "text-white"}>{weekday} • {formattedDate}</span>
                            {isToday && <span className="text-[9px] bg-amber-400/10 text-amber-400 px-1 font-sans">TODAY</span>}
                          </span>
                          <span className="text-emerald-400 font-mono font-bold">GHC 5.00 COVERED</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action submission buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAdvanceStudent(null)}
                  className="w-1/3 text-xs bg-neutral-950 border-2 border-neutral-800 hover:border-neutral-600 text-neutral-400 py-3.5 font-black uppercase tracking-widest transition-colors cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={advanceCalculatedDays.length === 0 || advanceSuccess}
                  className="w-2/3 text-xs bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-800 disabled:text-neutral-500 text-black py-3.5 font-black flex items-center justify-center gap-2 uppercase tracking-widest transition-colors cursor-pointer"
                >
                  {advanceSuccess ? (
                    <>
                      <Check size={14} className="stroke-[3]" /> ADVANCE PROCESSING SUCCESSFULLY!
                    </>
                  ) : (
                    `CONFIRM GHC ${advanceAmount}.00 PAYMENT`
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEBT BACKWARD FEE PAYMENT MODAL OVERLAY */}
      {debtStudent && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border-4 border-neutral-800 max-w-lg w-full p-8 shadow-[8px_8px_0px_0px_#ef4444] space-y-6">
            <div className="flex items-center justify-between pb-3 border-b-2 border-neutral-800">
              <div className="flex items-center gap-3">
                <Coins size={20} className="text-red-400" />
                <h3 className="text-sm font-black uppercase tracking-widest text-white">Settle Past Debt / Arrears</h3>
              </div>
              <button
                type="button"
                onClick={() => setDebtStudent(null)}
                className="text-neutral-500 hover:text-white transition-colors animate-none"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordDebtSubmit} className="space-y-5">
              <div className="bg-neutral-950 p-4 border border-neutral-850 space-y-1">
                <p className="text-[10px] uppercase font-mono font-black text-neutral-500">Student Pupil</p>
                <div className="flex justify-between items-center text-sm font-bold text-white uppercase">
                  <span>{debtStudent.name}</span>
                  <span className="font-mono text-xs text-amber-400">{debtStudent.rollNumber} • {debtStudent.class}</span>
                </div>
              </div>

              {/* Total Debt statistics summary */}
              <div className="bg-neutral-950 p-4 border border-red-900/40 text-[11px] font-mono font-bold text-red-500 flex justify-between items-center">
                <span>TOTAL ARREARS OUTSTANDING:</span>
                <span className="text-sm font-black font-mono">GHC {studentDebtMap.get(debtStudent.id)?.totalDebt.toFixed(2)}</span>
              </div>

              {/* Quick debt presets */}
              {(() => {
                const dailyRate = Math.max(0.01, 5.00 - (debtStudent.discount || 0));
                const totalArr = studentDebtMap.get(debtStudent.id)?.totalDebt || dailyRate;
                return (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-mono font-black text-neutral-500">Amount To Pay (GHC {dailyRate.toFixed(2)} per past day)</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { label: `GHC ${dailyRate.toFixed(2)} (1 Day)`, val: dailyRate },
                          { label: `GHC ${(dailyRate * 2).toFixed(2)} (2 Days)`, val: dailyRate * 2 },
                          { label: `GHC ${(dailyRate * 5).toFixed(2)} (5 Days)`, val: dailyRate * 5 },
                          { label: 'Clear All Arrears', val: totalArr }
                        ].map((preset, idx) => {
                          // Clamp preset value if it's larger than remaining arrears
                          if (preset.val > totalArr && idx < 3) return null;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setDebtAmount(preset.val)}
                              className={`py-2 px-1 text-center font-mono font-black text-[10px] transition-all border-2 ${
                                Math.abs(debtAmount - preset.val) < 0.01
                                  ? 'bg-red-500 border-red-500 text-black'
                                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                              }`}
                            >
                              {preset.label}
                              <span className="block text-[11px] mt-0.5 text-inherit">GHC {preset.val.toFixed(2)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom amount field */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] uppercase font-mono font-black text-neutral-500">Custom Amount (GHC Cedis)</label>
                        <span className="text-[10px] uppercase font-mono font-black text-red-400 font-mono">
                          COVERS {Math.floor(debtAmount / dailyRate)} ARREARS DAYS
                        </span>
                      </div>
                      
                      <div className="relative">
                        <span className="absolute left-4 top-2.5 text-xs font-mono font-black text-neutral-500">GHC</span>
                        <input
                          type="number"
                          required
                          min={dailyRate}
                          max={totalArr}
                          step={dailyRate}
                          value={debtAmount}
                          onChange={(e) => setDebtAmount(Math.min(parseFloat(e.target.value) || dailyRate, totalArr))}
                          className="w-full bg-neutral-950 border-2 border-neutral-800 py-2.5 pl-14 pr-4 text-xs font-mono font-black text-white focus:outline-none focus:border-red-400"
                        />
                      </div>
                      {Math.abs(debtAmount % dailyRate) > 0.01 && (
                        <p className="text-[9px] font-mono text-amber-500 uppercase font-bold">
                          * NOTICE: Amount is rounded down to standard GHC {dailyRate.toFixed(2)} daily chunks.
                        </p>
                      )}
                    </div>
                  </>
                );
              })()}

              {/* Anticipated coverage dates schedule list */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] uppercase font-mono font-black text-neutral-500">
                  <span>Selected Unpaid Days being Settled (Oldest First)</span>
                </div>

                {debtCalculatedDays.length === 0 ? (
                  <div className="p-4 text-center border border-dashed border-neutral-800 bg-neutral-950/40">
                    <p className="text-[10px] font-mono font-black uppercase text-amber-500">
                      ⚠️ No outstanding past unpaid days remaining to settle!
                    </p>
                  </div>
                ) : (
                  <div className="bg-neutral-950 p-2 border border-neutral-800 max-h-32 overflow-y-auto space-y-1 divide-y divide-neutral-900 pr-1">
                    {debtCalculatedDays.map((dayStr, itemIdx) => {
                      const parts = dayStr.split('-');
                      const weekday = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
                        .toLocaleDateString('en-GB', { weekday: 'short' })
                        .toUpperCase();
                      const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;

                      return (
                        <div key={dayStr} className="flex justify-between items-center py-1.5 text-[10px] font-mono font-bold text-neutral-400">
                          <span className="flex items-center gap-1.5">
                            <span className="text-neutral-600 font-normal">#{itemIdx + 1}</span>
                            <span className="text-white">{weekday} • {formattedDate}</span>
                          </span>
                          <span className="text-red-400 font-mono font-bold">GHC 5.00 SETTLED</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Option to also pay today's regular attendance fee */}
              {!paidStudentMap.has(debtStudent.id) && (
                <div className="bg-neutral-950 p-4 border border-indigo-900/40 space-y-2">
                  <div className="flex items-center gap-3">
                    <input
                      id="include-today-fee"
                      type="checkbox"
                      checked={includeTodayInDebtSettle}
                      onChange={(e) => setIncludeTodayInDebtSettle(e.target.checked)}
                      className="w-4 h-4 text-indigo-500 bg-neutral-900 border-neutral-800 rounded focus:ring-0 focus:ring-offset-0 cursor-pointer accent-indigo-500 animate-none"
                    />
                    <label htmlFor="include-today-fee" className="text-[10px] font-mono font-black text-neutral-300 uppercase select-none cursor-pointer">
                      ALSO PAY TODAY'S GATE ATTENDANCE (+ GHC {(5.00 - (debtStudent.discount || 0)).toFixed(2)})
                    </label>
                  </div>
                  <p className="text-[9px] font-mono font-bold text-neutral-550 uppercase pl-7 leading-normal">
                    Registers today's daily gate attendance payment so that it is captured as cash today.
                  </p>
                </div>
              )}

              {/* Total cash collected summary */}
              <div className="bg-neutral-950 p-4 border border-dashed border-emerald-900/40 flex justify-between items-center text-[11px] font-mono font-bold">
                <span className="text-neutral-400">TOTAL MONEY TO SUBMIT TO ACCOUNTANT:</span>
                <span className="text-emerald-450 font-black text-sm">
                  GHC {(debtAmount + (includeTodayInDebtSettle && !paidStudentMap.has(debtStudent.id) ? (5.00 - (debtStudent.discount || 0)) : 0)).toFixed(2)}
                </span>
              </div>

              {/* Action submission buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDebtStudent(null)}
                  className="w-1/3 text-xs bg-neutral-950 border-2 border-neutral-800 hover:border-neutral-600 text-neutral-400 py-3.5 font-black uppercase tracking-widest transition-colors cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={(debtCalculatedDays.length === 0 && (paidStudentMap.has(debtStudent.id) || !includeTodayInDebtSettle)) || debtSuccess}
                  className="w-2/3 text-xs bg-red-600 hover:bg-red-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white py-3.5 font-black flex items-center justify-center gap-2 uppercase tracking-widest transition-colors cursor-pointer animate-none"
                >
                  {debtSuccess ? (
                    <>
                      <Check size={14} className="stroke-[3]" /> ARREARS PROCESSING SUCCESS!
                    </>
                  ) : (
                    `SUBMIT GHC ${(debtAmount + (includeTodayInDebtSettle && !paidStudentMap.has(debtStudent.id) ? (5.00 - (debtStudent.discount || 0)) : 0)).toFixed(2)}`
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

        {/* TRANSACTION HISTORY MODAL OVERLAY */}
      {historyStudent && (() => {
        const arrearsInfo = studentDebtMap.get(historyStudent.id);
        const unpaidDaysList = arrearsInfo?.pastUnpaidDays || [];
        const totalPaidAccumulated = payments
          .filter(p => p.studentId === historyStudent.id && p.verified)
          .reduce((sum, p) => sum + p.amount, 0);

        const termFee = historyStudent.termFee || 350;
        const legacyDebt = historyStudent.legacyDebt || 0;
        const termTotalRequired = termFee + legacyDebt;

        const discountValue = historyStudent.discount || 0;
        const finalDailyFee = Math.max(0, 5.00 - discountValue);
        const totalArrearsGhc = histArrears;

        // Calculate core attendance percentage
        const elapsedDaysStr = activeTerm ? activeTerm.schoolDays.filter(d => d <= currentDate && !(activeTerm.publicHolidays || []).includes(d)) : [];
        const elapsedDays = elapsedDaysStr.length;
        const clearedDays = payments.filter(p => p.studentId === historyStudent.id && p.date <= currentDate && !p.id.endsWith('_debt')).length;
        const attendancePct = elapsedDays > 0 ? Math.min(100, Math.round((clearedDays / elapsedDays) * 100)) : 100;

        // Times present over total number of school days for that term
        const termSchoolDaysList = activeTerm ? activeTerm.schoolDays : [];
        const holidaysList = activeTerm?.publicHolidays || [];
        const schoolDaysNoHolidays = termSchoolDaysList.filter(d => !holidaysList.includes(d));
        const schoolDaysNoHolidaysCount = schoolDaysNoHolidays.length;

        const presentDaysTerm = activeTerm ? activeTerm.schoolDays.filter(d => {
          if (d > currentDate) return false;
          if (holidaysList.includes(d)) return false;
          const record = payments.find(p => p.studentId === historyStudent.id && p.date === d);
          return !(record?.isAbsent);
        }).length : 0;

        return (
          <>
            {/* INTERACTIVE SCREEN MODAL (HIDDEN ON PRINT) */}
            <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 no-print">
              <div className="bg-neutral-900 border-4 border-neutral-800 max-w-3xl w-full p-6 md:p-8 shadow-[8px_8px_0px_0px_#f59e0b] space-y-6 max-h-[92vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b-2 border-neutral-800">
                  <div className="flex items-center gap-3">
                    <History size={20} className="text-amber-400" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Pupil Profile & Financial Folder</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHistoryStudent(null)}
                    className="text-neutral-500 hover:text-white transition-colors cursor-pointer p-1"
                    title="Close"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Interactive Tab Selector Bar */}
                <div className="flex border-b border-neutral-800 font-mono text-[9px] sm:text-xs">
                  <button
                    type="button"
                    onClick={() => setHistoryModalTab('profile')}
                    className={`flex-1 py-3 px-1 text-center uppercase tracking-wider font-extrabold border-b-2 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      historyModalTab === 'profile'
                        ? 'border-amber-400 text-amber-400 bg-neutral-950/50'
                        : 'border-transparent text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    <User size={14} className="shrink-0" />
                    <span>Pupil Overview</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryModalTab('ledger')}
                    className={`flex-1 py-3 px-1 text-center uppercase tracking-wider font-extrabold border-b-2 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      historyModalTab === 'ledger'
                        ? 'border-amber-400 text-amber-400 bg-neutral-950/50'
                        : 'border-transparent text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    <Coins size={14} className="shrink-0" />
                    <span>Payment History logs</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryModalTab('print')}
                    className={`flex-1 py-3 px-1 text-center uppercase tracking-wider font-extrabold border-b-2 flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      historyModalTab === 'print'
                        ? 'border-amber-400 text-amber-400 bg-neutral-950/50'
                        : 'border-transparent text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    <Printer size={14} className="shrink-0" />
                    <span>Invoice View</span>
                  </button>
                </div>

                {/* Tab Panels */}
                {historyModalTab === 'profile' && (
                  <div className="space-y-6 no-print">
                      {/* Flex grid containing profile badge & core facts */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                        {/* Column 1: Pupil Smartcard Card (4/12 width) */}
                        <div className="md:col-span-4 flex flex-col items-center bg-neutral-950 p-6 border-2 border-neutral-800 rounded-sm space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] relative overflow-hidden">
                          {/* Holographic school emblem decorative element */}
                          <div className="absolute right-0 top-0 w-24 h-24 bg-amber-400/5 rotate-45 transform translate-x-12 -translate-y-12 border-l border-b border-amber-400/20 pointer-events-none rounded-full" />
                          
                          {/* Profile Avatar Frame with Active Ring */}
                          <div className="relative group/avatar">
                            {historyStudent.photoUrl ? (
                              <img
                                src={historyStudent.photoUrl}
                                alt={historyStudent.name}
                                className="w-24 h-24 rounded-full object-cover border-4 border-neutral-800 group-hover/avatar:border-amber-400 transition-colors"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-24 h-24 rounded-full bg-neutral-900 border-4 border-neutral-800 flex items-center justify-center text-3xl font-black text-amber-400 tracking-tighter uppercase font-mono">
                                {historyStudent.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            
                            {/* Ingress Active Indicator Badge */}
                            <span className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-4 border-neutral-950 flex items-center justify-center ${
                              historyStudent.active ? 'bg-emerald-500' : 'bg-red-500'
                            }`} title={historyStudent.active ? "Registered Active Ingress Student" : "Deactivated Student Account"} />
                          </div>

                          <div className="text-center space-y-1">
                            <span className="text-[9px] font-mono font-black uppercase tracking-widest text-amber-500 py-0.5 px-2 bg-amber-955 border border-amber-800 inline-block rounded-xs">
                              {historyStudent.rollNumber}
                            </span>
                            <h4 className="text-base font-black text-white uppercase tracking-tight truncate max-w-xs">{historyStudent.name}</h4>
                            <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest font-bold">
                              {historyStudent.class} • {historyStudent.category}
                            </p>
                          </div>

                          {/* Low Balance Warning Badge (Configurable Threshold) */}
                          {historyStudent.paymentType === 'Term' && (
                            <div className="w-full p-3 bg-neutral-900 border-2 border-neutral-800 space-y-2 rounded-xs select-none">
                              <div className="flex justify-between items-center">
                                <span className="text-[8px] font-mono font-black uppercase tracking-widest text-neutral-500">Term Balance Alert</span>
                                {totalPaidAccumulated < lowBalanceThreshold ? (
                                  <span className="animate-pulse text-[8px] font-mono font-black uppercase px-2 py-0.5 bg-red-955 text-red-500 border border-red-800 rounded-xs flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 block shrink-0" />
                                    Low Balance
                                  </span>
                                ) : (
                                  <span className="text-[8px] font-mono font-black uppercase px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-xs">
                                    Active / Good
                                  </span>
                                )}
                              </div>

                              <div className="flex justify-between items-center text-[10px] font-mono flex-wrap gap-1">
                                <span className="text-neutral-450 uppercase font-bold">Paid Term Balance:</span>
                                <span className={totalPaidAccumulated < lowBalanceThreshold ? "text-red-450 font-black" : "text-emerald-450 font-extrabold"}>
                                  GHC {totalPaidAccumulated.toFixed(2)} / {termTotalRequired.toFixed(2)}
                                </span>
                              </div>

                              <div className="pt-2 border-t border-neutral-850 flex flex-col gap-1 text-[9px] font-mono">
                                <div className="flex justify-between items-center gap-1">
                                  <span className="text-neutral-500 uppercase font-black">Warning Threshold:</span>
                                  <div className="flex items-center gap-1">
                                    <span className="text-white font-extrabold">GHC</span>
                                    <input
                                      type="number"
                                      min="0"
                                      max="1000"
                                      value={lowBalanceThreshold}
                                      onChange={(e) => {
                                        const val = Math.max(0, Number(e.target.value));
                                        setLowBalanceThreshold(val);
                                        try {
                                          localStorage.setItem('low_balance_threshold', String(val));
                                        } catch (_) {}
                                      }}
                                      className="w-14 bg-neutral-950 border border-neutral-800 text-center text-white py-0.5 font-bold focus:outline-none focus:border-amber-400 rounded-xs"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Action links */}
                          <div className="w-full pt-4 border-t border-neutral-900 flex flex-col gap-2">
                            {historyStudent.guardianPhone ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (typeof navigator !== 'undefined' && navigator.clipboard) {
                                      navigator.clipboard.writeText(historyStudent.guardianPhone || '');
                                      showToast(`Copied Guardian Phone: ${historyStudent.guardianPhone}`);
                                    }
                                  }}
                                  className="w-full bg-neutral-900 hover:bg-neutral-850 text-neutral-300 py-2.5 px-3 text-[9px] font-mono font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border border-neutral-800 transition-colors cursor-pointer"
                                  title="Copy Guardian Contact"
                                >
                                  <Copy size={12} />
                                  <span>Copy Guard: {historyStudent.guardianPhone}</span>
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => {
                                    setGuardianSmsStudent(historyStudent);
                                  }}
                                  className="w-full bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 py-2.5 px-3 text-[9px] font-mono font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border border-amber-400/20 hover:border-amber-400/40 transition-all cursor-pointer"
                                  title="Open SMS Desk helper"
                                >
                                  <BellRing size={12} />
                                  <span>Guardian SMS Alert</span>
                                </button>
                              </>
                            ) : (
                              <div className="text-center p-2 border border-dashed border-neutral-800 bg-neutral-950 text-[9px] font-mono text-neutral-600 uppercase font-black tracking-wider">
                                No verified guardian contact
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                handleShareWhatsApp('profile', historyStudent, undefined, {
                                  unpaidDaysCount: unpaidDaysList.length,
                                  totalPaid: totalPaidAccumulated,
                                  totalArrears: totalArrearsGhc,
                                  schoolOwes: histSchoolOwes,
                                  attendancePct: attendancePct
                                });
                              }}
                              className="w-full bg-emerald-500 hover:bg-emerald-400 hover:text-white text-black py-2.5 px-3 text-[9px] font-mono font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border border-emerald-600 transition-all cursor-pointer"
                              title="Share profile overview status via WhatsApp"
                            >
                              <MessageSquare size={12} />
                              <span>Share via WhatsApp</span>
                            </button>
                          </div>
                        </div>

                        {/* Column 2: Detailed Personal Records (8/12 width) */}
                        <div className="md:col-span-8 space-y-5">
                          <div>
                            <h4 className="text-[10px] font-mono uppercase font-black tracking-widest text-neutral-500 mb-2">Student Credentials & Registration File</h4>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="bg-neutral-950 p-3 border border-neutral-850">
                                <span className="text-[9px] font-mono uppercase text-neutral-550 block font-bold">Cohorted Segment Grade</span>
                                <span className="text-sm font-black text-white">{historyStudent.class} ({historyStudent.category})</span>
                              </div>
                              <div className="bg-neutral-950 p-3 border border-neutral-850">
                                <span className="text-[9px] font-mono uppercase text-neutral-550 block font-bold">System ID / Roll Number</span>
                                <span className="text-sm font-bold text-amber-400 font-mono tracking-wide">{historyStudent.rollNumber}</span>
                              </div>
                              <div className="bg-neutral-950 p-3 border border-neutral-850">
                                <span className="text-[9px] font-mono uppercase text-neutral-550 block font-bold">Standard Single-Day Attendance Fee</span>
                                <span className="text-sm font-black text-neutral-300">GHC 5.00</span>
                              </div>
                              <div className="bg-neutral-950 p-3 border border-neutral-850">
                                <span className="text-[9px] font-mono uppercase text-neutral-550 block font-bold">Daily Discount / Scholarship</span>
                                {discountValue > 0 ? (
                                  <span className="text-sm font-black text-emerald-400 flex items-center gap-1 font-mono">
                                    <Award size={14} className="stroke-[2.5]" />
                                    GHC {discountValue.toFixed(2)} ({discountValue === 5 ? '100% Scholarship' : 'Special rate'})
                                  </span>
                                ) : (
                                  <span className="text-sm font-bold text-neutral-500 uppercase tracking-wide">None (Standard rate)</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Attendance summary statistics */}
                          <div className="bg-neutral-950 p-4 border border-neutral-850 space-y-3">
                            <div className="flex justify-between items-center text-[10px] uppercase font-mono font-black">
                              <span className="text-neutral-500">Attendance Clear Rate</span>
                              <span className="text-white font-mono">{attendancePct}%</span>
                            </div>
                            
                            {/* Graphic high-contrast loading bar */}
                            <div className="w-full bg-neutral-900 border border-neutral-800 h-3 p-0.5 rounded-none overflow-hidden flex items-stretch">
                              <div 
                                className={`h-full transition-all duration-500 rounded-none ${
                                  attendancePct >= 85 ? 'bg-emerald-500' : attendancePct >= 65 ? 'bg-amber-400' : 'bg-red-500'
                                }`}
                                style={{ width: `${attendancePct}%` }}
                              />
                            </div>

                            <div className="flex justify-between items-center text-[8.5px] text-neutral-500 uppercase font-mono leading-tight font-bold">
                              <span>Term days elapsed: {elapsedDays} days</span>
                              <span>Cleared & Cleansed Days: {clearedDays} days</span>
                            </div>

                            {/* Precise Term-wide Presence Attendance Counter */}
                            <div className="pt-2 border-t border-neutral-850 flex justify-between items-center text-[10px] uppercase font-mono font-black">
                              <span className="text-neutral-400">Term Attendance (Present/Total)</span>
                              <span className="text-amber-400 font-black font-mono">
                                {presentDaysTerm} / {schoolDaysNoHolidaysCount} DAYS
                              </span>
                            </div>
                          </div>

                          {/* Active Balance/Arrears Alert Notification Banner */}
                          {unpaidDaysList.length > 0 ? (
                            <div className="bg-red-950/40 border-2 border-red-900/60 p-4 space-y-2 relative overflow-hidden">
                              <div className="absolute top-2 right-2 text-red-500/25 pointer-events-none">
                                <ShieldAlert size={44} />
                              </div>
                              <h5 className="text-[11px] font-mono uppercase font-black text-red-400 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                                Financial Deficit Detected
                              </h5>
                              <p className="text-[10px] text-neutral-400 font-bold uppercase leading-relaxed max-w-md">
                                Student has {unpaidDaysList.length} unpaid register days. Total arrears of <strong className="text-red-400">GHC {totalArrearsGhc.toFixed(2)}</strong> must be settled immediately at the Gate Desk to ensure access standing.
                              </p>
                              <div className="pt-1 select-none">
                                <button
                                  type="button"
                                  onClick={() => setHistoryModalTab('ledger')}
                                  className="text-[9px] font-mono font-black uppercase text-amber-400 hover:text-amber-300 hover:underline inline-flex items-center gap-1 cursor-pointer"
                                >
                                  Go to Ledger Action Desk <ChevronRight size={10} className="stroke-[3]" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-emerald-950/40 border border-emerald-900 p-4 flex items-start gap-3">
                              <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                              <div className="space-y-0.5">
                                <h5 className="text-[11px] font-mono uppercase font-black text-emerald-450">Good Standing Account Profile</h5>
                                <p className="text-[9.5px] text-neutral-550 uppercase font-bold leading-normal">
                                  All attendance checking periods for this student are fully settled. Student profile is fully verified and cleared.
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="bg-neutral-950 p-3.5 border border-neutral-900">
                            <p className="text-[8.5px] text-neutral-650 uppercase font-bold text-center leading-relaxed font-mono">
                              * Core credential modifications like student deletion, active/inactive toggles, photo replacements should be completed in pupils panel list.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {historyModalTab === 'ledger' && (
                    <div className="space-y-5 no-print">
                      {/* Numeric Stats Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-neutral-950 p-4 border border-neutral-850">
                          <p className="text-[9px] font-black uppercase font-mono text-neutral-500">Total Paid Contribution</p>
                          <p className="text-lg font-black font-mono text-emerald-400 mt-1">
                            GHC {payments.filter(p => p.studentId === historyStudent.id).reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
                          </p>
                        </div>
                        <div className="bg-neutral-950 p-4 border border-neutral-850">
                          <p className="text-[9px] font-black uppercase font-mono text-neutral-500">Active Days Cleared</p>
                          <p className="text-lg font-black font-mono text-white mt-1">
                            {payments.filter(p => p.studentId === historyStudent.id).length} Days
                          </p>
                        </div>
                        <div className="bg-neutral-950 p-4 border border-neutral-850">
                          <p className="text-[9px] font-black uppercase font-mono text-neutral-500">Total Arrears Owed</p>
                          <p className="text-lg font-black font-mono text-red-500 mt-1">
                            GHC {totalArrearsGhc.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Verification and double payment prevention desk banner */}
                      <div className="bg-neutral-950 p-4 border border-neutral-800 space-y-3">
                        <div className="flex justify-between items-center text-[10px] uppercase font-mono font-black text-neutral-500">
                          <span>GATE DESK CHECK: {currentDate}</span>
                          <span className="text-neutral-400 font-mono">STATUS: {paidStudentMap.has(historyStudent.id) ? "PAID" : "OUTSTANDING"}</span>
                        </div>

                        {paidStudentMap.has(historyStudent.id) ? (
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-amber-400/10 border-2 border-amber-400/30 p-3.5">
                            <div className="flex items-start gap-3 flex-1">
                              <Check className="text-amber-400 stroke-[3] mt-0.5 shrink-0" size={18} />
                              <div>
                                <p className="text-xs font-black text-amber-400 uppercase tracking-wide">STUDENT CLEARANCE RECOGNIZED</p>
                                <p className="text-[10px] text-neutral-400 font-bold uppercase mt-0.5">
                                  Clearance for {currentDate} has already been registered in the system ledger. You may delete the existing entry or record an additional payment if required.
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 w-full sm:w-auto shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  const paidInfo = paidStudentMap.get(historyStudent.id);
                                  if (paidInfo) {
                                    setPaymentToDelete({
                                      id: paidInfo.paymentId,
                                      label: currentDate,
                                      studentName: historyStudent.name
                                    });
                                  }
                                }}
                                className="w-full bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-300 hover:text-white px-3 py-2 text-[10px] font-black font-mono uppercase tracking-wider transition-colors cursor-pointer text-center"
                              >
                                DELETE ENTRY
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`DUPLICATE ENTRY ALERT:\nA check-in record for ${historyStudent.name} on ${currentDate} already exists.\n\nDo you want to record an additional/duplicate GHC ${finalDailyFee.toFixed(2)} payment entry for today?`)) {
                                    recordPayment(historyStudent.id, true, undefined, undefined, true);
                                    showToast(`Successfully logged duplicate GHC ${finalDailyFee.toFixed(2)} payment for ${historyStudent.name}!`);
                                  }
                                }}
                                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer text-center"
                              >
                                RECORD DUPLICATE
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-red-400/5 border-2 border-red-500/10 p-3.5">
                            <div className="flex items-start gap-3 flex-1">
                              <X className="text-red-500 stroke-[3] mt-0.5 shrink-0" size={18} />
                              <div>
                                <p className="text-xs font-black text-red-500 uppercase tracking-wide">CLEARANCE OUTSTANDING</p>
                                <p className="text-[10px] text-neutral-400 font-bold uppercase mt-0.5">
                                  No check-in record has been registered for {currentDate}. A secure Gate Ingress Receipt can be generated safely here.
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                recordPayment(historyStudent.id, true);
                                showToast(`Successfully logged GHC ${finalDailyFee.toFixed(2)} payment for ${historyStudent.name}!`);
                              }}
                              className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors shrink-0 cursor-pointer text-center"
                            >
                              RECORD GHC {finalDailyFee.toFixed(2)} PAYMENT
                            </button>
                          </div>
                        )}
                      </div>

                      {/* List of recent payments */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center bg-neutral-900/40 p-1 border-b border-neutral-850">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 font-mono">
                            Recent Transaction History Logs
                          </h4>
                          {studentPayments.length > 0 && (currentUser?.role === 'Administrator' || currentUser?.role === 'Headmaster' || currentUser?.role === 'Accountant') && (
                            <button
                              type="button"
                              onClick={() => {
                                setShowDeleteAllPaymentsConfirm(true);
                              }}
                              className="px-2.5 py-1 text-[9px] font-mono font-black uppercase text-red-500 hover:text-red-400 border border-red-500/30 hover:border-red-500/60 bg-red-950/10 hover:bg-red-950/20 transition-all cursor-pointer inline-flex items-center gap-1 shrink-0"
                            >
                              <Trash2 size={11} /> Delete All Logs
                            </button>
                          )}
                        </div>

                        {studentPayments.length === 0 ? (
                          <div className="text-center py-8 bg-neutral-950 border border-neutral-850 text-neutral-500 uppercase tracking-wider text-[11px] font-bold">
                            No previous records registered in standard checkout ledger.
                          </div>
                        ) : (
                          <div className="border border-neutral-850 divide-y divide-neutral-900 bg-neutral-950 max-h-48 overflow-y-auto pr-1">
                            {studentPayments.map((p) => {
                              // format date nicely
                              const dateParts = p.date.split('-');
                              const dayLabel = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : p.date;
                              
                              return (
                                <div key={p.id} className="flex justify-between items-center p-3 text-xs font-mono">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-white font-bold">{dayLabel}</span>
                                      <span className="text-[9px] px-1.5 py-0.5 bg-neutral-900 border border-neutral-800 text-emerald-400 font-black">
                                        GHC {p.amount.toFixed(2)}
                                      </span>
                                    </div>
                                    <p className="text-[9px] text-neutral-500 font-bold">Ref: {p.id} • Auditor: {p.collectedBy} {p.notes ? `• ${p.notes}` : ''}</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-emerald-950/50 text-emerald-400 border border-emerald-900/40 font-sans tracking-widest">
                                      VERIFIED
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedRecordForReceipt({
                                          student: historyStudent,
                                          payment: p
                                        });
                                      }}
                                      className="p-1.5 text-neutral-400 hover:text-amber-400 hover:bg-amber-400/10 rounded transition-colors"
                                      title="Generate receipt for this specific transaction"
                                    >
                                      <Printer size={13} />
                                    </button>
                                    {(currentUser?.role === 'Administrator' || currentUser?.role === 'Headmaster' || currentUser?.role === 'Accountant') && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setPaymentToDelete({
                                            id: p.id,
                                            label: dayLabel,
                                            studentName: historyStudent.name
                                          });
                                        }}
                                        className="p-1.5 text-neutral-600 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                        title="Delete transaction record"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                    {historyModalTab === 'print' && (
                    <div className="space-y-4 font-sans text-neutral-900 no-print">
                      <div className="bg-neutral-950 p-3 border border-neutral-800 text-center rounded-sm">
                        <span className="text-[10px] font-mono text-amber-400 uppercase font-black tracking-widest block mb-1">DOCKET DIGITAL DESKTOP PREVIEW</span>
                        <p className="text-[9px] text-neutral-450 font-bold uppercase font-mono">Below is a rendering of the physical statement docket printable via export</p>
                      </div>

                      {/* Screen rendering replica of printer area */}
                      <div className="bg-white text-black p-6 md:p-8 border-2 border-neutral-350 shadow-inner font-sans text-xs max-h-[50vh] overflow-y-auto relative rounded-sm">
                        
                        {/* Decorative watermark school seal */}
                        <div className="absolute inset-x-0 top-1/4 bottom-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                          <svg width="220" height="220" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="48" fill="none" stroke="#16a34a" strokeWidth="2.5" />
                            <circle cx="50" cy="50" r="44.5" fill="none" stroke="#16a34a" strokeWidth="0.8" strokeDasharray="3 2" />
                            <circle cx="50" cy="50" r="39" fill="none" stroke="#16a34a" strokeWidth="1.5" />
                            <path d="M50 0 C72 5, 90 15, 90 45 C90 80, 50 100, 50 100 C50 100, 10 80, 10 45 C10 15, 28 5, 50 0 Z" fill="none" stroke="#16a34a" strokeWidth="5.5" />
                          </svg>
                        </div>

                        <div className="space-y-6 animate-none relative z-10">
                          
                          {/* School Letterhead */}
                          <div className="border-b-4 border-black pb-4 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4 text-left">
                              <SchoolLogo size={38} className="shrink-0" lightBackground={true} />
                              <div className="space-y-0.5 text-left">
                                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider text-white bg-green-700 px-2 py-0.5 font-mono inline-block">
                                  SAAKO HOLY CHILD ACADEMY
                                </span>
                                <h2 className="text-sm md:text-base font-black uppercase tracking-tight leading-none mt-1.5 font-serif text-green-950 border-none">Pupil Fee & Attendance Transcript</h2>
                                <p className="text-[7.5px] text-neutral-600 font-extrabold uppercase tracking-widest font-mono">
                                  OFFICIAL CUMULATIVE TERM LEDGER • EMERALD LEAF SEAL DOCUMENT
                                </p>
                              </div>
                            </div>
                            
                            <div className="text-right space-y-1 font-mono md:self-start">
                              <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 inline-block ${
                                historyStudent.paymentType === 'Term'
                                  ? 'bg-green-50 text-green-950 border border-green-500 font-extrabold'
                                  : 'bg-black text-white'
                              }`}>
                                {historyStudent.paymentType === 'Term' ? '🟢 TERM PAYER SCHEME' : 'DAILY SCHEME DOCKET'}
                              </span>
                              <div className="text-[7.5px] text-neutral-505 uppercase font-black mt-1">
                                REF: SHC-ST-{currentDate.replace(/-/g, '')}-{historyStudent.id.substring(0,6).toUpperCase()}
                              </div>
                            </div>
                          </div>

                          {/* Profile details grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[10px] leading-relaxed border-b border-neutral-300 pb-4 text-left">
                            <div>
                              <span className="text-[8px] font-black uppercase text-neutral-500 block">STUDENT BENEFICIARY</span>
                              <div className="text-[11px] font-black text-black uppercase">{historyStudent.name}</div>
                              <div className="font-mono mt-0.5 text-neutral-700">Roll / ID: <strong className="text-black">{historyStudent.rollNumber || 'SHC-' + historyStudent.id.substring(0, 5).toUpperCase()}</strong></div>
                              <div className="font-bold text-neutral-800">Cohort Group: {historyStudent.class} ({historyStudent.category})</div>
                            </div>

                            <div className="border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-4 border-neutral-200 font-mono text-[9px] space-y-0.5">
                              <span className="text-[8px] font-black uppercase text-neutral-500 block font-sans">FINANCIAL STATUS DOCKET</span>
                              {historyStudent.paymentType === 'Term' ? (
                                <>
                                  <div className="flex justify-between font-bold text-neutral-800">
                                    <span>Fixed Term Fee:</span>
                                    <span className="text-black font-black">GHC {termFee.toFixed(2)}</span>
                                  </div>
                                  {legacyDebt > 0 && (
                                    <div className="flex justify-between font-bold text-red-700">
                                      <span>Legacy Debt:</span>
                                      <span className="font-black">GHC {legacyDebt.toFixed(2)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between font-bold text-neutral-800">
                                    <span>Total Paid To Date:</span>
                                    <span className="text-emerald-700 font-black">GHC {totalPaidAccumulated.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between font-bold border-t border-dashed border-neutral-300 pt-1 mt-1">
                                    <span>Outstanding Dues:</span>
                                    <span className={`${termTotalRequired - totalPaidAccumulated > 0 ? 'text-red-700 font-black' : 'text-emerald-700 font-extrabold'}`}>
                                      GHC {Math.max(0, termTotalRequired - totalPaidAccumulated).toFixed(2)}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="flex justify-between font-bold text-neutral-800">
                                    <span>Total Deposited:</span>
                                    <span className="text-emerald-700 font-black font-mono">GHC {totalPaidAccumulated.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between font-bold text-neutral-800">
                                    <span>Total Arrears (Debt):</span>
                                    <span className="text-red-700 font-black font-mono">GHC {totalArrearsGhc.toFixed(2)} ({unpaidDaysList.length} days)</span>
                                  </div>
                                  <div className="flex justify-between font-bold text-neutral-800">
                                    <span>Prepaid Pool Bal:</span>
                                    <span className="text-blue-700 font-black font-mono">GHC {histSchoolOwes.toFixed(2)}</span>
                                  </div>
                                </>
                              )}
                            </div>

                            <div className="text-right border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-4 border-neutral-200">
                              <span className="text-[8px] font-black uppercase text-neutral-505 block">STATEMENT ISSUANCE INFO</span>
                              <div className="font-bold text-neutral-800">Date Audited: {currentDate}</div>
                              <div className="font-mono text-neutral-600 text-[9px]">Guardian Contact: {historyStudent.guardianPhone || 'No SMS Verified Contact'}</div>
                              <div className="mt-0.5 text-neutral-600 uppercase font-bold text-right text-[9px]">
                                Audit Officer: {currentUser ? currentUser.name : 'Authorized Gate Officer'}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3 pt-2">
                            {completeHistoryList.length === 0 ? (
                              <p className="text-neutral-555 italic text-center py-6 font-mono">No active school session entries recorded for this term yet.</p>
                            ) : (
                              <div className="overflow-x-auto max-h-[300px] border border-neutral-800 p-1 bg-neutral-900/50">
                                <table className="w-full text-[9px] border-collapse leading-tight scrollbar-thin">
                                  <thead>
                                    <tr className="border-b border-neutral-700 text-left uppercase text-neutral-400 font-bold font-mono bg-neutral-950">
                                      <th className="py-2 px-2 text-left">SCHOOL DATE</th>
                                      <th className="py-2 px-2 text-left">REF CODE</th>
                                      <th className="py-2 px-2 text-center font-bold">ATT STATUS</th>
                                      <th className="py-2 px-2 text-right">FEES</th>
                                      <th className="py-2 px-2 text-right">AUDITOR</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-neutral-800/60 font-mono text-neutral-300">
                                    {completeHistoryList.map((row) => (
                                      <tr key={row.date} className="hover:bg-neutral-800/40 transition-colors">
                                        <td className="py-1.5 px-2 font-bold text-white text-left whitespace-nowrap">{row.date}</td>
                                        <td className="py-1.5 px-2 text-left text-neutral-405 text-[8px] uppercase max-w-[65px] truncate" title={row.paymentRef}>{row.paymentRef}</td>
                                        <td className="py-1.5 px-2 text-center font-sans">
                                          <span className={`inline-block text-[7px] font-black px-1.5 py-0.5 border rounded-xs uppercase tracking-wider ${row.statusBg}`}>
                                            {row.statusLabel}
                                          </span>
                                        </td>
                                        <td className="py-1.5 px-2 text-right font-bold text-white whitespace-nowrap">{row.feeLabel}</td>
                                        <td className="py-1.5 px-2 text-right text-neutral-405 text-[8px] max-w-[80px] truncate" title={row.collector}>{row.collector}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                          {/* Bottom Signature Area */}
                          <div className="mt-8 pt-4 border-t border-neutral-800">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                              <div className="space-y-1 p-3 bg-neutral-950 border border-neutral-850 text-neutral-450 leading-relaxed rounded-none text-[7.5px] uppercase font-semibold font-mono text-left">
                                <span className="text-amber-400 font-bold">Verification certification</span>
                                <p className="leading-normal font-sans text-neutral-400">Certified invoice receipts generated via decentralized registrar nodes. Retain physical copy for admission validation.</p>
                              </div>

                              {/* Well organized green seal with beautiful python */}
                              <div className="flex flex-col items-center justify-center py-2 shrink-0">
                                <svg width="68" height="68" viewBox="0 0 100 100" className="opacity-100 select-none">
                                  {/* Nice forest green outer boundary ring */}
                                  <circle cx="50" cy="50" r="48" fill="#14532d" stroke="#166534" strokeWidth="4" />
                                  <circle cx="50" cy="50" r="42" fill="#22c55e" stroke="#14532d" strokeWidth="1.5" />
                                  {/* Green inside filled details */}
                                  <circle cx="50" cy="50" r="39" fill="#dcfce7" />
                                  <circle cx="50" cy="50" r="36" fill="none" stroke="#16a34a" strokeWidth="1" strokeDasharray="2 1.5" />
                                  <defs>
                                    <path id="sealInnerArcTop" d="M 22 50 A 28 28 0 0 1 78 50" fill="none" />
                                    <path id="sealInnerArcBottom" d="M 78 50 A 28 28 0 0 1 22 50" fill="none" />
                                  </defs>
                                  <text className="font-sans font-black text-[5.8px] fill-[#14532d] tracking-[0.02em]">
                                    <textPath href="#sealInnerArcTop" startOffset="50%" textAnchor="middle">
                                      SAAKO TRUST
                                    </textPath>
                                  </text>
                                  <text className="font-sans font-black text-[5px] fill-emerald-950 tracking-[0.05em]">
                                    <textPath href="#sealInnerArcBottom" startOffset="50%" textAnchor="middle">
                                      * EXCELLENCE *
                                    </textPath>
                                  </text>
                                  {/* Beautiful Coiled Python */}
                                  <g transform="translate(42, 42) scale(0.16)" stroke="#14532d" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                    {/* Main deep forest green coiled body */}
                                    <path d="M 12 70 C 12 40, 24 15, 50 15 C 76 15, 88 35, 88 55 C 88 75, 70 85, 50 85 C 30 85, 20 70, 25 55 C 30 40, 45 40, 50 45 C 55 50, 52 65, 45 65 C 38 65, 38 52, 44 48" strokeWidth="6.5" stroke="#14532d" />
                                    
                                    {/* Elegant light emerald-green dorsal spot patterns */}
                                    <path d="M 12 70 C 12 40, 24 15, 50 15 C 76 15, 88 35, 88 55 C 88 75, 70 85, 50 85 C 30 85, 20 70, 25 55 C 30 40, 45 40, 50 45 C 55 50, 52 65, 45 65 C 38 65, 38 52, 44 48" stroke="#86efac" strokeWidth="1.5" strokeDasharray="3 5" />

                                    {/* Accent highlight outline for 3D depth */}
                                    <path d="M 12 70 C 12 40, 24 15, 50 15 C 76 15, 88 35, 88 55" stroke="#f0fdf4" strokeWidth="1.2" opacity="0.65" />

                                    {/* Adorable little golden crown for the champion python */}
                                    <path d="M 40 41.5 L 38.5 38 L 42 39.5 L 44 36 L 46 39.5 L 49.5 38 L 48 41.5 Z" fill="#fbbf24" stroke="#14532d" strokeWidth="0.8" strokeLinejoin="miter" />

                                    {/* Cute chibified head */}
                                    <circle cx="44" cy="47" r="6" fill="#14532d" stroke="none" />
                                    
                                    {/* Generous sweet rosy blush cheeks */}
                                    <circle cx="38" cy="48.5" r="1.3" fill="#f43f5e" opacity="0.8" stroke="none" />
                                    <circle cx="50" cy="48.5" r="1.3" fill="#f43f5e" opacity="0.8" stroke="none" />

                                    {/* Happy sparkling big anime eyes */}
                                    <circle cx="41.5" cy="45.5" r="1.8" fill="white" stroke="none" />
                                    <circle cx="46.5" cy="45.5" r="1.8" fill="white" stroke="none" />
                                    <circle cx="41.5" cy="45.5" r="1" fill="#14532d" stroke="none" />
                                    <circle cx="46.5" cy="45.5" r="1" fill="#14532d" stroke="none" />
                                    <circle cx="41" cy="44.8" r="0.45" fill="white" stroke="none" />
                                    <circle cx="46" cy="44.8" r="0.45" fill="white" stroke="none" />

                                    {/* Sweet cheerful smile */}
                                    <path d="M 41.5 49 Q 44 51.5, 46.5 49" stroke="#f0fdf4" strokeWidth="0.8" strokeLinecap="round" fill="none" />

                                    {/* Delightful small pink tongue */}
                                    <path d="M 43.5 50.2 Q 43.5 52.5, 44.2 52.5" stroke="#f43f5e" strokeWidth="0.8" strokeLinecap="round" fill="none" />

                                    {/* Floating romantic pink heart */}
                                    <path d="M 55 36 C 54 34, 52 34, 52 36 C 52 38, 55 40, 55 40 C 55 40, 58 38, 58 36 C 58 34, 56 34, 55 36 Z" fill="#ec4899" opacity="0.95" stroke="none" />
                                  </g>
                                </svg>
                                <span className="text-[6.5px] font-mono text-emerald-400 font-black uppercase tracking-widest mt-1 block">OFFICIAL IMPRESS</span>
                              </div>

                              <div className="text-right space-y-2">
                                <div className="inline-block border-b border-neutral-600 w-32 h-6" />
                                <div className="text-[7.5px] font-black uppercase text-neutral-455 tracking-wider font-sans">
                                  Yakubu Hakeem (Headmaster)
                                  <span className="text-[7px] text-neutral-500 block mt-0.5">SAAKO HOLY CHILD ACADEMY CHECKPOINT</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Foot Action Buttons (Moved inside the screen container context) */}
                  <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-4 border-t border-neutral-800 no-print">
                    <div className="flex flex-wrap gap-3 flex-1 sm:flex-initial">
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            window.print();
                          }
                        }}
                        className="flex items-center justify-center gap-2 px-5 py-3 bg-amber-400 hover:bg-amber-300 hover:scale-[1.01] active:scale-[0.99] transition-all text-black font-mono text-xs font-black uppercase tracking-widest cursor-pointer focus:outline-none"
                      >
                        <Printer size={15} className="stroke-[2.5]" />
                        <span>PRINT & EXPORT STATEMENT (PDF)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleShareWhatsApp('invoice', historyStudent, undefined, {
                            unpaidDaysCount: unpaidDaysList.length,
                            totalPaid: totalPaidAccumulated,
                            totalArrears: totalArrearsGhc,
                            schoolOwes: histSchoolOwes,
                            attendancePct: attendancePct
                          });
                        }}
                        className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 hover:scale-[1.01] active:scale-[0.99] transition-all text-black font-mono text-xs font-black uppercase tracking-widest cursor-pointer focus:outline-none"
                      >
                        <MessageSquare size={15} className="stroke-[2.5]" />
                        <span>SHARE VIA WHATSAPP</span>
                      </button>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setHistoryStudent(null)}
                      className="px-6 py-3 bg-neutral-950 border-2 border-neutral-800 hover:border-neutral-600 font-mono text-xs font-black uppercase tracking-widest text-neutral-450 hover:text-white transition-all cursor-pointer focus:outline-none"
                    >
                      CLOSE LEDGER
                    </button>
                  </div>

                </div>
              </div>

              {/* Absolute Printable Layout (Visible only in physical media print engine, placed completely outside scrolling limits) */}
              <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                  @page {
                    size: portrait;
                    margin: 10mm 15mm 15mm 15mm !important;
                    @bottom-right {
                      content: "Page " counter(page) " of " counter(pages);
                      font-family: 'Space Mono', monospace !important;
                      font-size: 8px !important;
                      font-weight: bold !important;
                      color: #333333 !important;
                    }
                  }
                  
                  /* Clean standard document body layout during print */
                  body, html, #root, main {
                    background: white !important;
                    color: black !important;
                    overflow: visible !important;
                    height: auto !important;
                    min-height: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                  }
                  
                  /* Force high-fidelity printing layout styles */
                  #print-single-invoice-area-upgrade {
                    display: block !important;
                    visibility: visible !important;
                    position: static !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    height: auto !important;
                    overflow: visible !important;
                    background: white !important;
                    border: none !important;
                    box-shadow: none !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    float: none !important;
                  }
                  #print-single-invoice-area-upgrade * {
                    visibility: visible !important;
                  }
                  
                  /* Prevent tables and layout structures from breaking across pages */
                  tr {
                    page-break-inside: avoid !important;
                  }
                }
              `}} />

              {/* PRINTER FRIENDLY PORTRAIT SINGLE INVOICE SHEET (HIDDEN ON SCREEN, VISIBLE ON PRINT) */}
              <div id="print-single-invoice-area-upgrade" className="hidden print:block bg-white text-black p-12 max-w-[210mm] mx-auto text-sans leading-relaxed">
                    <div className="space-y-6">
                      
                      {/* School Letterhead */}
                      <div className="border-b-4 border-black pb-4 flex justify-between items-center bg-white text-black">
                        <div className="flex items-center gap-4 text-left bg-white text-black">
                          <SchoolLogo size={44} className="shrink-0" lightBackground={true} />
                          <div className="space-y-0.5 text-left bg-white text-black">
                            <span className="text-[11px] font-black uppercase tracking-wider text-black bg-neutral-200 px-2.5 py-1 font-mono">
                              SAAKO HOLY CHILD ACADEMY
                            </span>
                            <h2 className="text-xl font-serif font-bold uppercase tracking-tight leading-none mt-2 text-green-955">OFFICIAL STUDENT FEE STATEMENT</h2>
                            <p className="text-[9px] text-neutral-600 font-black uppercase tracking-widest font-mono">
                              GATE INGRESS COLLECTION LEDGER • DIGITAL SECURITY DELEGATE
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right space-y-1 font-mono bg-white text-black">
                          <span className={`text-[11px] font-black uppercase px-3 py-1 inline-block ${
                            historyStudent.paymentType === 'Term'
                              ? 'bg-green-50 text-green-950 border border-green-600 font-extrabold'
                              : 'bg-black text-white'
                          }`}>
                            {historyStudent.paymentType === 'Term' ? '👑 GREEN TERM SCHEME' : 'DAILY SCHEME LEDGER'}
                          </span>
                          <div className="text-[8.5px] text-neutral-605 uppercase font-black mt-2">
                            STATEMENT REF: SHC-ST-{currentDate.replace(/-/g, '')}-{historyStudent.id.substring(0,6).toUpperCase()}
                          </div>
                        </div>
                      </div>

                      {/* Profile Grid */}
                      {(() => {
                        const histPaidInfo = paidStudentMap.get(historyStudent.id);
                        const histIsAbsent = !!histPaidInfo && !!histPaidInfo.isAbsent;
                        const histIsPaid = histIsAbsent ? false : (studentDebtMap.get(historyStudent.id)?.isPaidToday || false);

                        const histAttendanceStatus = histIsAbsent 
                          ? "🔴 ABSENT (Checked-in but Absent)" 
                          : histIsPaid 
                            ? "🟢 PRESENT & CHECKED-IN" 
                            : (historyStudent.paymentType === 'Term' 
                                ? "🟢 PRESENT (Term scheme pass)" 
                                : "🔴 OUTSTANDING / UNMARKED");

                        const histAuditor = (histPaidInfo?.collectedBy) || (currentUser?.name) || 'Certified Gate Operator';

                        return (
                          <div className="grid grid-cols-3 gap-6 text-[11px] leading-relaxed border-b border-neutral-300 pb-5">
                            <div className="font-sans">
                              <span className="text-[8.5px] font-black uppercase text-neutral-500 block">STUDENT BENEFICIARY</span>
                              <div className="text-xs font-black text-black uppercase">{historyStudent.name}</div>
                              <div className="font-mono mt-0.5 text-neutral-750 font-bold">Roll / ID: {historyStudent.rollNumber || 'SHC-' + historyStudent.id.substring(0, 5).toUpperCase()}</div>
                              <div className="font-bold mt-0.5">Cohort Group: {historyStudent.class} ({historyStudent.category}) {historyStudent.paymentType === 'Term' && <span className="text-[8px] font-black text-green-700 bg-green-50 border border-green-300 px-1 py-0.5 font-sans uppercase shrink-0 rounded-sm ml-1">Term Scheme</span>}</div>
                            </div>

                            <div className="border-l pl-6 border-neutral-200 font-mono">
                              <span className="text-[8.5px] font-black uppercase text-neutral-505 block font-sans">FINANCIAL BALANCES</span>
                              {historyStudent.paymentType === 'Term' ? (
                                <>
                                  <div className="flex justify-between mt-1 font-bold">
                                    <span className="text-neutral-550 uppercase text-[9px] font-sans">Fixed Term Charge:</span>
                                    <span className="text-black font-black">GHC {termFee.toFixed(2)}</span>
                                  </div>
                                  {legacyDebt > 0 && (
                                    <div className="flex justify-between mt-0.5 font-bold text-red-700">
                                      <span className="text-neutral-550 uppercase text-[9px] font-sans">Legacy Debt:</span>
                                      <span className="font-black">GHC {legacyDebt.toFixed(2)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between mt-0.5 font-bold">
                                    <span className="text-neutral-550 uppercase text-[9px] font-sans">Total Amount Paid:</span>
                                    <span className="text-emerald-700 font-black">GHC {totalPaidAccumulated.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between mt-0.5 font-bold border-t border-dashed border-neutral-300 pt-1">
                                    <span className="text-neutral-550 uppercase text-[9px] font-sans">Term Balance Due:</span>
                                    <span className={`${termTotalRequired - totalPaidAccumulated > 0 ? 'text-red-700 font-black' : 'text-emerald-700 font-extrabold'}`}>
                                      GHC {Math.max(0, termTotalRequired - totalPaidAccumulated).toFixed(2)}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="flex justify-between mt-1 font-bold">
                                    <span className="text-neutral-500 uppercase text-[9px] font-sans">Total Deposited:</span>
                                    <span className="text-emerald-700 font-black">GHC {totalPaidAccumulated.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between mt-0.5 font-bold">
                                    <span className="text-neutral-500 uppercase text-[9px] font-sans">Total Arrears (Debt):</span>
                                    <span className={`${totalArrearsGhc > 0 ? "text-red-750 font-extrabold" : "text-neutral-800"}`}>GHC {totalArrearsGhc.toFixed(2)} {unpaidDaysList.length > 0 ? `(${unpaidDaysList.length} days)` : ''}</span>
                                  </div>
                                  <div className="flex justify-between mt-0.5 font-bold">
                                    <span className="text-neutral-500 uppercase text-[9px] font-sans">Prepaid Balance:</span>
                                    <span className="text-blue-700 font-black">GHC {histSchoolOwes.toFixed(2)}</span>
                                  </div>
                                </>
                              )}
                            </div>

                            <div className="text-right border-l pl-6 border-neutral-200 font-sans">
                              <span className="text-[8.5px] font-black uppercase text-neutral-500 block">STATEMENT ISSUANCE INFO</span>
                              <div className="font-bold">Date Audited: {currentDate}</div>
                              <div className="font-mono text-neutral-700 text-[10px]">Guardian Contact: {historyStudent.guardianPhone || 'No SMS Verified Contact'}</div>
                              <div className="mt-0.5 text-neutral-600 text-[9.5px] uppercase font-bold text-right font-sans">
                                Audit Officer: {currentUser ? currentUser.name : 'Authorized Gate Officer'}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Main section: Two columns check */}
                      <div className="grid grid-cols-12 gap-8 pt-2">
                        {/* Chronological Everyday Fees & Attendance Ledger */}
                        <div className="space-y-3 font-sans col-span-8">
                          <span className="text-[9px] font-black uppercase tracking-wider text-black font-mono border-b border-black pb-1.5 block">
                            📋 CHRONOLOGICAL FEES & ATTENDANCE LEDGER ({completeHistoryList.length} DAYS)
                          </span>
                          {completeHistoryList.length === 0 ? (
                            <p className="text-[10px] text-neutral-500 font-medium italic">No attendance or fee logs found on standard checkout ledger.</p>
                          ) : (
                            <table className="w-full text-[8.5px] table-auto">
                              <thead>
                                <tr className="border-b border-neutral-300 text-left uppercase text-neutral-500 font-bold font-mono text-[7.5px] tracking-wider">
                                  <th className="py-1 print-col-date">DATE</th>
                                  <th className="py-1 font-mono print-col-ref">REF CODE</th>
                                  <th className="py-1 text-center font-sans print-col-status">ATT STATUS</th>
                                  <th className="py-1 text-right print-col-fee">FEES</th>
                                  <th className="py-1 text-right print-col-auditor">AUDITOR</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-neutral-100">
                                {completeHistoryList.map(record => {
                                  const isHoliday = record.isHoliday;
                                  const isAbsent = record.isAbsent;
                                  const attStatusLabel = isHoliday ? 'HOLIDAY' : isAbsent ? 'ABSENT' : 'PRESENT';
                                  
                                  const statusBadgeColor = isHoliday 
                                    ? 'bg-neutral-100 text-neutral-600 border-neutral-300' 
                                    : isAbsent 
                                      ? 'bg-red-50 text-red-700 font-extrabold border-red-200' 
                                      : 'bg-emerald-50 text-emerald-800 font-extrabold border-emerald-250';

                                  return (
                                    <tr key={record.date} className="text-neutral-800 font-medium">
                                      <td className="py-1.5 font-mono text-black font-semibold whitespace-nowrap print-col-date">{record.date}</td>
                                      <td className="py-1.5 font-mono text-[7.5px] text-neutral-605 uppercase max-w-[100px] truncate print-col-ref" title={record.paymentRef}>
                                        {record.paymentRef}
                                      </td>
                                      <td className="py-1.5 text-center print-col-status">
                                        <span className={`inline-block text-[7px] font-bold px-1 py-0.2 rounded-xs border ${statusBadgeColor}`}>
                                          {attStatusLabel}
                                        </span>
                                      </td>
                                      <td className="py-1.5 text-right font-mono font-bold text-black whitespace-nowrap print-col-fee">{record.feeLabel}</td>
                                      <td className="py-1.5 text-right font-mono text-[8px] text-neutral-605 truncate max-w-[120px] print-col-auditor" title={record.collector}>
                                        {record.collector}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                        </div>

                        {/* Arrears / Missing Fees Days List */}
                        <div className="space-y-3 border-l pl-8 border-neutral-200 col-span-4">
                          {historyStudent.paymentType === 'Term' ? (
                            <div className="p-4 border-2 border-amber-300 bg-amber-50/50 text-neutral-900 rounded-sm space-y-2 font-sans">
                              <span className="text-[10px] font-black uppercase text-amber-800 block font-mono">👑 OFFICIAL SCHOLASTIC TERM PASSPORT</span>
                              <p className="text-[9px] leading-relaxed font-bold uppercase font-sans text-neutral-800">
                                Pupil is fully registered under the custom Term Payer Scheme. 
                                He holds an all-access gate clearance pass. 
                                Subject to the flat GHC {termFee.toFixed(2)} rate {legacyDebt > 0 ? `with a pre-adoption legacy debt of GHC ${legacyDebt.toFixed(2)}` : ''}, unaffected by absences, school holidays, or missing sessions.
                              </p>
                              {totalPaidAccumulated >= termTotalRequired ? (
                                <div className="text-[9px] font-black text-emerald-800 flex items-center gap-1 font-mono">
                                  <span>★ ACADEMIC TERM DOCKET FULLY CLEARED AND SETTLED</span>
                                </div>
                              ) : (
                                <div className="text-[9px] font-black text-amber-700 font-mono">
                                  ★ GHC {Math.max(0, termTotalRequired - totalPaidAccumulated).toFixed(2)} outstanding term balance being cleared incrementally.
                                </div>
                              )}
                            </div>
                          ) : (
                            <>
                              <span className="text-[9px] font-black uppercase tracking-wider text-red-700 font-mono border-b border-red-200 pb-1.5 block">
                                ❌ OUTSTANDING ARREARS DAYS ({unpaidDaysList.length} d)
                              </span>
                              {unpaidDaysList.length === 0 ? (
                                <div className="p-4 border border-emerald-200 bg-emerald-50/50 text-emerald-800 text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 rounded-xs font-sans">
                                  <Check size={12} className="text-emerald-600 animate-none shrink-0" />
                                  <span>Student is fully cleared. Zero debt!</span>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <p className="text-[9px] text-neutral-500 font-medium leading-relaxed font-sans">
                                    The following scheduled school days have missing fee check-ins. Daily rate of <strong>GHC {finalDailyFee.toFixed(2)}</strong> applies per school day.
                                  </p>
                                  <table className="w-full text-[9.5px]">
                                    <thead>
                                      <tr className="border-b border-neutral-300 text-left uppercase text-neutral-505 font-bold font-mono">
                                        <th className="py-1">ARREARS DATE</th>
                                        <th className="py-1">DAILY FEE</th>
                                        <th className="py-1 text-right font-normal">BALANCE DUE</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100 font-mono text-red-700">
                                      {unpaidDaysList.map((day, idx) => {
                                        const cumulativeDues = (idx + 1) * finalDailyFee;
                                        return (
                                          <tr key={day} className="font-semibold">
                                            <td className="py-1.5 font-mono">{day}</td>
                                            <td className="py-1.5 font-mono">GHC {finalDailyFee.toFixed(2)}</td>
                                            <td className="py-1.5 text-right font-bold font-mono">GHC {cumulativeDues.toFixed(2)}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Bottom Signature Section */}
                      <div className="mt-14 pt-4 border-t border-neutral-300 space-y-6 bg-white text-black">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center font-sans font-bold bg-white text-black">
                          <div className="space-y-2 bg-neutral-50 p-3.5 border border-neutral-200 rounded-xs font-sans font-medium text-left">
                            <span className="text-[8px] font-black uppercase text-neutral-605 font-mono block">VERIFICATION STATEMENT</span>
                            <p className="text-[8px] text-neutral-550 leading-normal font-sans">
                              Official statement of Saako Holy Child Academy daily gate receipt collections. Verified against local database nodes under the Saako Holy Child Educational Trust. Please retain this physical docket for credentials validation.
                            </p>
                          </div>

                          {/* Well organized green seal with beautiful python */}
                          <div className="flex flex-col items-center justify-center py-2 shrink-0 bg-white text-black">
                            <svg width="68" height="68" viewBox="0 0 100 100" className="opacity-100 select-none bg-white">
                              {/* Nice green outer boundary ring */}
                              <circle cx="50" cy="50" r="48" fill="#14532d" stroke="#166534" strokeWidth="4" />
                              <circle cx="50" cy="50" r="42" fill="#22c55e" stroke="#14532d" strokeWidth="1.5" />
                              {/* Green inside filled details */}
                              <circle cx="50" cy="50" r="39" fill="#dcfce7" />
                              <circle cx="50" cy="50" r="36" fill="none" stroke="#16a34a" strokeWidth="1" strokeDasharray="2 1.5" />
                              <defs>
                                <path id="printSealInnerArcTop" d="M 22 50 A 28 28 0 0 1 78 50" fill="none" />
                                <path id="printSealInnerArcBottom" d="M 78 50 A 28 28 0 0 1 22 50" fill="none" />
                              </defs>
                              <text className="font-sans font-black text-[5.8px] fill-[#14532d] tracking-[0.02em]">
                                <textPath href="#printSealInnerArcTop" startOffset="50%" textAnchor="middle">
                                  SAAKO TRUST
                                </textPath>
                              </text>
                              <text className="font-sans font-black text-[5px] fill-emerald-950 tracking-[0.05em]">
                                <textPath href="#printSealInnerArcBottom" startOffset="50%" textAnchor="middle">
                                  * EXCELLENCE *
                                </textPath>
                              </text>
                              {/* Beautiful Coiled Python */}
                              <g transform="translate(42, 42) scale(0.16)" stroke="#14532d" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                {/* Main deep forest green coiled body */}
                                <path d="M 12 70 C 12 40, 24 15, 50 15 C 76 15, 88 35, 88 55 C 88 75, 70 85, 50 85 C 30 85, 20 70, 25 55 C 30 40, 45 40, 50 45 C 55 50, 52 65, 45 65 C 38 65, 38 52, 44 48" strokeWidth="6.5" stroke="#14532d" />
                                
                                {/* Elegant light emerald-green dorsal spot patterns */}
                                <path d="M 12 70 C 12 40, 24 15, 50 15 C 76 15, 88 35, 88 55 C 88 75, 70 85, 50 85 C 30 85, 20 70, 25 55 C 30 40, 45 40, 50 45 C 55 50, 52 65, 45 65 C 38 65, 38 52, 44 48" stroke="#86efac" strokeWidth="1.5" strokeDasharray="3 5" />

                                {/* Accent highlight outline for 3D depth */}
                                <path d="M 12 70 C 12 40, 24 15, 50 15 C 76 15, 88 35, 88 55" stroke="#f0fdf4" strokeWidth="1.2" opacity="0.65" />

                                {/* Adorable little golden crown for the champion python */}
                                <path d="M 40 41.5 L 38.5 38 L 42 39.5 L 44 36 L 46 39.5 L 49.5 38 L 48 41.5 Z" fill="#fbbf24" stroke="#14532d" strokeWidth="0.8" strokeLinejoin="miter" />

                                {/* Cute chibified head */}
                                <circle cx="44" cy="47" r="6" fill="#14532d" stroke="none" />
                                
                                {/* Generous sweet rosy blush cheeks */}
                                <circle cx="38" cy="48.5" r="1.3" fill="#f43f5e" opacity="0.8" stroke="none" />
                                <circle cx="50" cy="48.5" r="1.3" fill="#f43f5e" opacity="0.8" stroke="none" />

                                {/* Happy sparkling big anime eyes */}
                                <circle cx="41.5" cy="45.5" r="1.8" fill="white" stroke="none" />
                                <circle cx="46.5" cy="45.5" r="1.8" fill="white" stroke="none" />
                                <circle cx="41.5" cy="45.5" r="1" fill="#14532d" stroke="none" />
                                <circle cx="46.5" cy="45.5" r="1" fill="#14532d" stroke="none" />
                                <circle cx="41" cy="44.8" r="0.45" fill="white" stroke="none" />
                                <circle cx="46" cy="44.8" r="0.45" fill="white" stroke="none" />

                                {/* Sweet cheerful smile */}
                                <path d="M 41.5 49 Q 44 51.5, 46.5 49" stroke="#f0fdf4" strokeWidth="0.8" strokeLinecap="round" fill="none" />

                                {/* Delightful small pink tongue */}
                                <path d="M 43.5 50.2 Q 43.5 52.5, 44.2 52.5" stroke="#f43f5e" strokeWidth="0.8" strokeLinecap="round" fill="none" />

                                {/* Floating romantic pink heart */}
                                <path d="M 55 36 C 54 34, 52 34, 52 36 C 52 38, 55 40, 55 40 C 55 40, 58 38, 58 36 C 58 34, 56 34, 55 36 Z" fill="#ec4899" opacity="0.95" stroke="none" />
                              </g>
                            </svg>
                            <span className="text-[6.5px] font-mono text-emerald-800 font-extrabold uppercase tracking-widest mt-1 block">OFFICIAL IMPRESS</span>
                          </div>

                          <div className="text-right space-y-4 font-sans font-bold bg-white text-black">
                            <div className="inline-block border-b-2 border-black w-48 h-10" />
                            <div className="text-[8.5px] font-black uppercase text-neutral-700 tracking-wider">
                              Yakubu Hakeem (Headmaster)
                              <span className="text-[8px] text-neutral-500 font-mono font-bold block mt-0.5 font-sans font-bold">SAAKO HOLY CHILD ACADEMY CHECKPOINT</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-center text-[8px] font-mono text-neutral-400 font-bold uppercase tracking-widest pt-4 border-t border-neutral-100 animate-none">
                          Saako Holy Child Trust • Audited Statement System Upgrade Release V1.5
                        </div>
                      </div>

                    </div>
                  </div>

          </>
        );
      })()}

      {/* DAILY RECORDS RESET CONFIRMATION MODAL OVERLAY */}
      {showResetDailyConfirm && (
        <div className="fixed inset-0 bg-neutral-950/90 backdrop-blur-md flex items-center justify-center p-4 z-55" style={{ zIndex: 100 }}>
          <div className="bg-neutral-900 border-4 border-red-650 max-w-md w-full p-8 shadow-[8px_8px_0px_0px_#dc2626] space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-neutral-850 text-red-500">
              <RefreshCw size={22} className="stroke-[2.5]" />
              <h3 className="text-sm font-black uppercase tracking-widest text-white">Reset Class Registry Daily Logs</h3>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-neutral-300 leading-relaxed font-bold">
                Are you absolutely sure you want to reset all payment and attendance register logs for Class <span className="text-amber-400">{selectedClass}</span> on <span className="text-amber-400 font-mono">{currentDate}</span>?
              </p>
              
              <p className="text-xs text-neutral-400 leading-relaxed font-semibold">
                This will delete and void all check-ins, absences, and scholarships registered for this class today. Any custom daily amounts recorded today will be completely wiped. This action is <span className="text-red-500 underline decoration-2 font-bold">irreversible</span>.
              </p>

              <div className="bg-neutral-950 p-4 border border-neutral-800 space-y-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-500 uppercase font-black">Target Class:</span>
                  <span className="text-white font-black uppercase">Class {selectedClass}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 uppercase font-black">Ledger Date:</span>
                  <span className="text-amber-400 font-bold">{currentDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 uppercase font-black">Active Pupils affected:</span>
                  <span className="text-amber-400 font-bold">{classStudents.length} Students</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetDailyConfirm(false)}
                className="w-1/2 text-xs bg-neutral-950 border-2 border-neutral-800 hover:border-neutral-600 text-neutral-400 py-3 font-black uppercase tracking-widest transition-colors cursor-pointer"
              >
                No, Go Back
              </button>
              <button
                type="button"
                onClick={handleResetDailyConfirmed}
                className="w-1/2 text-xs bg-red-650 hover:bg-red-650/80 border-2 border-red-700 text-white py-3 font-black uppercase tracking-widest transition-colors cursor-pointer"
              >
                Yes, Reset Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTION PAYMENT DELETION CONFIRMATION MODAL OVERLAY */}
      {paymentToDelete && (
        <div className="fixed inset-0 bg-neutral-950/90 backdrop-blur-md flex items-center justify-center p-4 z-55" style={{ zIndex: 100 }}>
          <div className="bg-neutral-900 border-4 border-red-650 max-w-md w-full p-8 shadow-[8px_8px_0px_0px_#dc2626] space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-neutral-850 text-red-500">
              <Trash2 size={22} className="stroke-[2.5]" />
              <h3 className="text-sm font-black uppercase tracking-widest text-white">Confirm Payment Deletion</h3>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-neutral-300 leading-relaxed font-bold">
                Are you absolutely sure you want to delete this payment record? This action is <span className="text-red-500 underline decoration-2">irreversible</span> and will erase the clearance logs for the student from the auditing ledger.
              </p>
              
              <div className="bg-neutral-950 p-4 border border-neutral-800 space-y-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-500 uppercase font-black">Student:</span>
                  <span className="text-white font-black uppercase">{paymentToDelete.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 uppercase font-black">Record Date:</span>
                  <span className="text-amber-400 font-bold">{paymentToDelete.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 uppercase font-black">Record ID:</span>
                  <span className="text-neutral-400 text-[10px] uppercase font-bold">{paymentToDelete.id}</span>
                </div>
              </div>

              <p className="text-[10px] text-neutral-500 font-bold uppercase leading-normal">
                By confirming, you authorize the erasure of this transaction. This could result in arrears being recalculated for {paymentToDelete.studentName}.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPaymentToDelete(null)}
                className="w-1/2 text-xs bg-neutral-950 border-2 border-neutral-800 hover:border-neutral-600 text-neutral-400 py-3 font-black uppercase tracking-widest transition-colors cursor-pointer"
              >
                No, Keep Record
              </button>
              <button
                type="button"
                onClick={() => {
                  deletePayment(paymentToDelete.id);
                  showToast(`Payment record for ${paymentToDelete.studentName} deleted successfully.`);
                  setPaymentToDelete(null);
                }}
                className="w-1/2 text-xs bg-red-650 hover:bg-red-650/80 border-2 border-red-700 text-white py-3 font-black uppercase tracking-widest transition-colors cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTION BULK DELETION CONFIRMATION MODAL OVERLAY */}
      {showDeleteAllPaymentsConfirm && historyStudent && (
        <div className="fixed inset-0 bg-neutral-950/90 backdrop-blur-md flex items-center justify-center p-4 z-55" style={{ zIndex: 101 }}>
          <div className="bg-neutral-900 border-4 border-red-650 max-w-sm w-full p-8 shadow-[8px_8px_0px_0px_#dc2626] space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-neutral-850 text-red-500">
              <Trash2 size={22} className="stroke-[2.5]" />
              <h3 className="text-sm font-black uppercase tracking-widest text-white">Purge All Logs</h3>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-neutral-300 leading-relaxed font-bold font-sans">
                Are you absolutely sure you want to delete <span className="text-red-500 underline decoration-2">all payment and attendance logs</span> for this student? This will completely clear their transaction record history.
              </p>
              
              <div className="bg-neutral-950 p-4 border border-neutral-800 space-y-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-500 uppercase font-black">Student Name:</span>
                  <span className="text-white font-black uppercase text-right truncate pl-2">{historyStudent.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 uppercase font-black">Roll / ID:</span>
                  <span className="text-amber-400 font-bold">{historyStudent.rollNumber || 'SHC-' + historyStudent.id.substring(0, 5).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 uppercase font-black">Total Logs:</span>
                  <span className="text-white font-bold">{payments.filter(p => p.studentId === historyStudent.id).length} Entries</span>
                </div>
              </div>

              <p className="text-[10px] text-neutral-500 font-bold uppercase leading-normal font-sans">
                This action is irreversible and can result in significant changes to their outstanding financial balance status.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteAllPaymentsConfirm(false)}
                className="w-1/2 text-xs bg-neutral-950 border-2 border-neutral-800 hover:border-neutral-600 text-neutral-400 py-3 font-black uppercase tracking-widest transition-colors cursor-pointer font-mono"
              >
                No, Keep
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteStudentPayments(historyStudent.id);
                  showToast(`All payment records for ${historyStudent.name} deleted successfully.`);
                  setShowDeleteAllPaymentsConfirm(false);
                }}
                className="w-1/2 text-xs bg-red-650 hover:bg-red-650/80 border-2 border-red-700 text-white py-3 font-black uppercase tracking-widest transition-colors cursor-pointer font-mono"
              >
                Yes, Purge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT PROFILE PHOTO MODAL OVERLAY */}
      {selectedPhotoStudent && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border-4 border-amber-400 max-w-md w-full p-8 shadow-[8px_8px_0px_0px_rgba(251,191,36,0.25)] space-y-6">
            <div className="flex items-center justify-between pb-3 border-b-2 border-neutral-800">
              <div className="flex items-center gap-3">
                <Camera size={20} className="text-amber-400" />
                <h3 className="text-sm font-black uppercase tracking-widest text-white">Student Profile Photo</h3>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  stopCamera();
                  setSelectedPhotoStudent(null);
                }} 
                className="text-neutral-500 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-center">
                <p className="text-xs text-neutral-450 uppercase font-mono font-bold tracking-wider">
                  Managing photo record for primary pupil:
                </p>
                <h4 className="text-base font-black text-amber-400 uppercase tracking-tight mt-1">
                  {selectedPhotoStudent.name}
                </h4>
                <p className="text-[10px] font-mono font-bold text-neutral-550 uppercase mt-0.5">
                  Roll Ref: {selectedPhotoStudent.rollNumber} • Class: {selectedPhotoStudent.class}
                </p>
              </div>

              {/* Live stream or current image / placeholder indicator */}
              <div className="relative aspect-square w-64 h-64 mx-auto bg-neutral-950 border-4 border-neutral-800 overflow-hidden flex items-center justify-center rounded-xs">
                {cameraActive ? (
                  <>
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className={`w-full h-full object-cover ${cameraFacingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                    />
                    <div className="absolute top-2 left-2 bg-red-650 text-white font-mono text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-xs animate-pulse">
                      ● Camera Active
                    </div>
                    
                    {/* Quick Flip/Toggle Camera facing mode overlay */}
                    <button
                      type="button"
                      onClick={toggleCameraFacingMode}
                      className="absolute bottom-2 right-2 bg-neutral-900/90 hover:bg-neutral-850 border-2 border-amber-400 text-white hover:text-amber-400 py-1.5 px-2.5 transition-all rounded-none flex items-center gap-1.5 cursor-pointer font-mono text-[9px] font-black uppercase tracking-wider select-none z-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                      title="Flip/Toggle camera (Front vs. Back camera mode)"
                    >
                      <RefreshCw size={11} className="stroke-[3]" />
                      <span>{cameraFacingMode === 'user' ? 'Back Camera' : 'Front Camera'}</span>
                    </button>
                  </>
                ) : selectedPhotoStudent.photoUrl ? (
                  <img 
                    src={selectedPhotoStudent.photoUrl} 
                    alt={selectedPhotoStudent.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="text-center space-y-2 p-4">
                    <Users size={48} className="mx-auto text-neutral-800" />
                    <span className="block text-[10px] text-neutral-600 font-mono font-black uppercase tracking-widest">No Profile Picture Registered</span>
                  </div>
                )}
              </div>

              {cameraError && (
                <p className="text-[9.5px] text-center font-mono font-black text-red-500 uppercase bg-red-950/20 border border-red-900/40 p-2.5 rounded-xs">
                  ⚠️ {cameraError}
                </p>
              )}

              {/* Action Deck */}
              <div className="space-y-3 pt-2">
                {cameraActive ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="text-xs bg-amber-400 hover:bg-amber-300 text-black py-3 font-semibold font-mono tracking-widest uppercase transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-amber-500"
                    >
                      <Camera size={14} className="stroke-[2.5]" />
                      <span>Take Snapshot</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="text-xs bg-neutral-950 hover:bg-neutral-900 border-2 border-neutral-800 text-neutral-400 hover:text-white py-3 font-semibold font-mono tracking-widest uppercase transition-colors cursor-pointer"
                    >
                      Stop Camera
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Upload File Input */}
                      <label className="flex items-center justify-center gap-2 text-xs bg-neutral-850 hover:bg-neutral-800 border-2 border-neutral-800 hover:border-neutral-700 text-neutral-200 py-3 font-bold font-mono tracking-wider uppercase cursor-pointer transition-all">
                        <Upload size={14} className="stroke-[2.5]" />
                        <span>Upload Photo</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleFileUpload} 
                          className="hidden" 
                        />
                      </label>

                      {/* Launch Camera */}
                      <button
                        type="button"
                        onClick={startCamera}
                        className="flex items-center justify-center gap-2 text-xs bg-amber-400 hover:bg-amber-300 text-black py-3 font-mono font-black tracking-wider uppercase transition-colors cursor-pointer border border-amber-500"
                      >
                        <Camera size={14} className="stroke-[2.5]" />
                        <span>Use Camera</span>
                      </button>
                    </div>

                    {selectedPhotoStudent.photoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          updateStudent({
                            ...selectedPhotoStudent,
                            photoUrl: undefined
                          });
                          setSelectedPhotoStudent(null);
                        }}
                        className="w-full text-xs bg-red-950/20 hover:bg-red-950/40 border border-red-900/50 text-red-400 py-2.5 font-mono font-bold tracking-widest uppercase transition-colors cursor-pointer rounded-xs"
                      >
                        🗑️ Delete Registration Image
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setSelectedPhotoStudent(null);
                }}
                className="w-full text-xs bg-neutral-950 hover:bg-neutral-900 border-2 border-neutral-800 text-neutral-400 py-3 font-mono font-black tracking-widest uppercase transition-colors cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT QR CODE GENERATOR MODAL */}
      {qrStudent && (
        <div id="student-qr-generator-modal" className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="relative w-full max-w-md bg-neutral-900 border-4 border-amber-450 p-6 md:p-8 space-y-6 shadow-[10px_10px_0px_0px_rgba(251,191,36,0.25)] text-white">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-neutral-850 pb-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-amber-400/10 border border-amber-400 text-amber-300 shrink-0">
                  <QrCode size={22} className="text-amber-400" />
                </div>
                <div>
                  <span className="text-[9px] text-amber-400 font-mono tracking-widest font-black uppercase block">REGISTRY BADGES</span>
                  <h3 className="text-base font-black uppercase tracking-tight">Student Digital QR Code</h3>
                  <p className="text-[10px] text-neutral-400 mt-0.5 font-mono">
                    SAAKO ID Code: {qrStudent.id.substring(0, 12).toUpperCase()}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setQrStudent(null)} 
                className="p-1 cursor-pointer text-neutral-400 hover:text-white hover:bg-neutral-800 border border-transparent hover:border-neutral-800 transition-all font-bold"
                title="Exit/Close Portal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-col items-center justify-center p-4 bg-neutral-950/80 border border-neutral-800 rounded-none text-center space-y-5">
              
              {/* QR Image Frame */}
              <div className="bg-white p-4 border-4 border-amber-400 inline-block relative shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                {generatedQrUrl ? (
                  <img 
                    src={generatedQrUrl} 
                    alt={`${qrStudent.name} QR Code`} 
                    className="w-48 h-48 image-rendering-pixelated select-none"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center bg-neutral-100 text-neutral-400 text-xs font-mono font-bold animate-pulse">
                    GENERATING QR...
                  </div>
                )}
                {/* Visual crop marks */}
                <span className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 border-t-2 border-l-2 border-neutral-900" />
                <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 border-t-2 border-r-2 border-neutral-900" />
                <span className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 border-b-2 border-l-2 border-neutral-900" />
                <span className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 border-b-2 border-r-2 border-neutral-900" />
              </div>

              {/* Student Metadata Card inside QR view */}
              <div className="space-y-1 w-full text-center">
                <h4 className="text-sm font-black text-white uppercase tracking-wide">{qrStudent.name}</h4>
                <p className="text-[10px] font-mono tracking-widest text-amber-400 font-bold uppercase">
                  Class: {qrStudent.class} • Roll Number: {qrStudent.rollNumber}
                </p>
                <div className="mt-2.5 mx-auto max-w-[280px] bg-neutral-900 border border-neutral-800/80 p-2.5 text-left rounded-none space-y-1 select-all hover:bg-neutral-850 transition-colors">
                  <span className="text-[8px] text-amber-400 font-mono tracking-widest block font-bold uppercase leading-none">Internal Payload Address:</span>
                  <code className="text-[9px] text-neutral-300 font-mono break-all font-bold block bg-black/40 px-1.5 py-1 mt-1 font-mono">
                    SAAKOCHECK:STUDENT:{qrStudent.id}
                  </code>
                </div>
              </div>
            </div>

            {/* Instruction Footer */}
            <p className="text-[10px] text-neutral-400 text-center leading-relaxed font-mono">
              Scan this QR code with the **School Check-In Scanner** device or tablet camera at the main gate to instantly register daily attendance and check payment statuses.
            </p>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3.5 pt-2">
              <a
                href={generatedQrUrl}
                download={`${qrStudent.name.toUpperCase().replaceAll(' ', '_')}_QR_CODE.png`}
                className="py-3 bg-amber-450 hover:bg-amber-400 text-black text-center font-mono font-black uppercase text-xs tracking-wider transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none flex items-center justify-center gap-2 rounded-none"
              >
                <Download size={13} className="stroke-[3]" />
                <span>Save Code</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Print QR Badge - ${qrStudent.name}</title>
                          <style>
                            @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&family=JetBrains+Mono:wght@700&display=swap');
                            body {
                              background: white;
                              color: black;
                              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                              display: flex;
                              flex-direction: column;
                              align-items: center;
                              justify-content: center;
                              min-height: 100vh;
                              margin: 0;
                              padding: 20px;
                            }
                            .badge-card {
                              border: 6px solid #fbbf24;
                              padding: 30px;
                              display: flex;
                              flex-direction: column;
                              align-items: center;
                              text-align: center;
                              max-width: 320px;
                              box-shadow: 10px 10px 0px rgba(0,0,0,0.1);
                            }
                            .logo-text {
                              font-family: "Space Grotesk", sans-serif;
                              font-size: 14px;
                              text-transform: uppercase;
                              letter-spacing: 2px;
                              font-weight: bold;
                              margin-bottom: 5px;
                              color: #d97706;
                            }
                            .school-title {
                              font-size: 18px;
                              font-weight: 900;
                              text-transform: uppercase;
                              margin-bottom: 25px;
                              letter-spacing: -0.5px;
                            }
                            .qr-img {
                              width: 220px;
                              height: 220px;
                              border: 4px solid black;
                              margin-bottom: 25px;
                            }
                            .student-name {
                              font-size: 16px;
                              font-weight: 900;
                              text-transform: uppercase;
                              margin-bottom: 5px;
                            }
                            .student-details {
                              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                              font-size: 11px;
                              font-weight: bold;
                              text-transform: uppercase;
                              color: #4b5563;
                              margin-bottom: 20px;
                            }
                            .payload-ref {
                              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                              font-size: 8px;
                              color: #9ca3af;
                              border-top: 1px dashed #e5e7eb;
                              padding-top: 10px;
                              width: 100%;
                            }
                          </style>
                        </head>
                        <body>
                          <div class="badge-card">
                            <div class="logo-text">★ SAAKO GATEWAY ★</div>
                            <div class="school-title">HOLY CHILD ACADEMY</div>
                            <img class="qr-img" src="${generatedQrUrl}" />
                            <div class="student-name">${qrStudent.name}</div>
                            <div class="student-details">Class Group: ${qrStudent.class} <br/>Roll Ref: ${qrStudent.rollNumber}</div>
                            <div class="payload-ref">SAAKOCHECK:STUDENT:${qrStudent.id}</div>
                          </div>
                          <script>
                            window.onload = function() {
                              window.print();
                            }
                          </script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }
                }}
                className="py-3 bg-neutral-950 hover:bg-neutral-850 text-white font-mono font-black uppercase text-xs tracking-wider transition-all border border-neutral-800 cursor-pointer flex items-center justify-center gap-2"
              >
                <Printer size={13} />
                <span>Print Card</span>
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setQrStudent(null)}
                className="text-[11px] font-mono font-black text-neutral-450 hover:text-white uppercase tracking-widest cursor-pointer select-none transition-colors"
              >
                Close / Back to Registry
              </button>
            </div>

          </div>
        </div>
      )}

      {/* PUPIL-SPECIFIC BULK DATES CHECK-IN MODAL */}
      {bulkPupil && activeTerm && (
        <div id="pupil-bulk-dates-modal" className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="relative w-full max-w-2xl bg-neutral-900 border-4 border-amber-450 p-6 md:p-8 space-y-6 shadow-[10px_10px_0px_0px_rgba(251,191,36,0.25)] text-white">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-neutral-850 pb-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-amber-400/10 border border-amber-400 text-amber-300 shrink-0">
                  <Layers size={22} className="text-amber-400" />
                </div>
                <div>
                  <span className="text-[9px] text-amber-400 font-mono tracking-widest font-black uppercase block">MULTIPASS CHECK-IN</span>
                  <h3 className="text-base font-black uppercase tracking-tight">Pupil Bulk Checked-in: {bulkPupil.name}</h3>
                  <p className="text-[10px] text-neutral-400 mt-0.5 font-mono">
                    CLASS: {bulkPupil.class} | ROLL NUMBER: {bulkPupil.rollNumber}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setBulkPupil(null)} 
                className="p-1 cursor-pointer text-neutral-400 hover:text-white hover:bg-neutral-800 border border-transparent hover:border-neutral-800 transition-all font-bold"
                title="Exit Portal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4">
              <div className="bg-neutral-950/80 p-4 border border-neutral-800 flex justify-between items-center text-xs font-mono">
                <div>
                  <span className="text-neutral-500 block uppercase tracking-wider text-[10px]">CURRENT OUTSTANDING DEBT</span>
                  <span className="text-red-400 font-black text-sm">
                    GHC {(studentDebtMap.get(bulkPupil.id)?.totalDebt ?? 0).toFixed(2)} ({studentDebtMap.get(bulkPupil.id)?.pastUnpaidDays.length ?? 0} Unpaid Days)
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block uppercase tracking-wider text-[10px]">DAILY FEE RATIO</span>
                  <span className="text-white font-black">
                    GHC {(5.00 - (bulkPupil.discount || 0)).toFixed(2)}/DAY
                  </span>
                </div>
              </div>

              {/* Quick Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const unmarked = (activeTerm?.schoolDays ?? [])
                      .filter(d => d <= currentDate)
                      .filter(d => !payments.some(p => p.studentId === bulkPupil.id && p.date === d && !p.id.endsWith('_debt')));
                    setSelectedBulkDates(unmarked);
                  }}
                  className="px-3 py-1.5 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 text-[10px] font-mono hover:text-white text-neutral-400 tracking-wider uppercase cursor-pointer"
                >
                  ☑ Select All Unmarked
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // last 5 school days
                    const past5 = (activeTerm?.schoolDays ?? [])
                      .filter(d => d <= currentDate)
                      .slice(-5);
                    setSelectedBulkDates(past5);
                  }}
                  className="px-3 py-1.5 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 text-[10px] font-mono hover:text-white text-neutral-400 tracking-wider uppercase cursor-pointer"
                >
                  🕒 Past 5 School Days
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBulkDates([])}
                  className="px-3 py-1.5 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 text-[10px] font-mono hover:text-white text-neutral-400 tracking-wider uppercase cursor-pointer"
                >
                  ☒ Clear Selection
                </button>
              </div>

              {/* Grid representation of dates */}
              <div className="border border-neutral-800 bg-neutral-950/60 p-3 h-56 overflow-y-auto space-y-2 font-mono text-xs">
                {(() => {
                  // Get school days of term up to today, sorted descending (most recent first)
                  const termDays = [...(activeTerm.schoolDays || [])]
                    .filter(d => d <= currentDate)
                    .sort((a, b) => b.localeCompare(a));

                  if (termDays.length === 0) {
                    return <div className="text-neutral-500 text-center py-8 school-title">No school days recorded in current term yet.</div>;
                  }

                  return termDays.map(dayStr => {
                    const record = payments.find(p => p.studentId === bulkPupil.id && p.date === dayStr && !p.id.endsWith('_debt'));
                    
                    let statusLabel = 'UNMARKED';
                    let statusColor = 'text-neutral-500 border-neutral-900 bg-neutral-900/30';

                    if (record) {
                      if (record.isAbsent) {
                        statusLabel = 'ABSENT';
                        statusColor = 'text-red-400 border-red-950 bg-red-950/30';
                      } else if (record.notes?.toLowerCase().includes('present') || record.notes?.toLowerCase().includes('¢0')) {
                        statusLabel = 'PRESENT (¢0)';
                        statusColor = 'text-amber-400 border-amber-950 bg-amber-955';
                      } else if (record.amount === 0 && (record.notes?.toLowerCase().includes('covered') || record.notes?.toLowerCase().includes('prepaid') || record.notes?.toLowerCase().includes('advance'))) {
                        statusLabel = 'PREPAID COVERED';
                        statusColor = 'text-sky-450 border-sky-950 bg-sky-955';
                      } else {
                        statusLabel = `PAID: GHC ${record.amount.toFixed(2)}`;
                        statusColor = 'text-emerald-400 border-emerald-950 bg-emerald-955';
                      }
                    }

                    const isChecked = selectedBulkDates.includes(dayStr);

                    return (
                      <label 
                        key={dayStr}
                        className={`flex items-center justify-between p-2.5 border transition-all cursor-pointer ${
                          isChecked 
                            ? 'bg-amber-450/10 border-amber-400 text-white font-bold' 
                            : 'bg-neutral-900/40 border-neutral-850 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded-none border border-neutral-850 checked:bg-amber-400 checked:border-amber-400"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBulkDates(prev => [...prev, dayStr]);
                              } else {
                                setSelectedBulkDates(prev => prev.filter(d => d !== dayStr));
                              }
                            }}
                          />
                          <span>
                            {new Date(dayStr).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        <span className={`text-[10px] font-black tracking-wider uppercase font-mono px-2 py-0.5 border ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </label>
                    );
                  });
                })()}
              </div>

              {/* Action and Config parameters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-neutral-850 bg-neutral-900/40 p-4">
                <div className="space-y-1.5">
                  <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-mono font-black block">SELECT ACTION TO APPLY</span>
                  <select
                    value={bulkActionType}
                    onChange={(e) => setBulkActionType(e.target.value as any)}
                    className="w-full bg-neutral-950 text-white font-mono text-xs border-2 border-neutral-800 focus:outline-none focus:border-amber-400 p-2.5 uppercase font-black"
                  >
                    <option value="paid">✓ Record Payment (Present & Paid)</option>
                    <option value="present_zero">⚪ Record Present Check (¢0 Cash)</option>
                    <option value="absent">✗ Record Absent (Debt excused)</option>
                    <option value="clear">🗑️ Clear / Reset selected dates</option>
                  </select>
                </div>

                <div className="space-y-1.5 flex flex-col justify-end">
                  {bulkActionType === 'paid' ? (
                    <>
                      <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-mono font-black block">PAYMENT VALUE (OPTIONAL CUSTOM VALUE)</span>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={bulkCustomAmount}
                          onChange={(e) => setBulkCustomAmount(e.target.value)}
                          placeholder={`Student Default: GHC ${(5.00 - (bulkPupil.discount || 0)).toFixed(2)}`}
                          className="bg-neutral-950 border-2 border-neutral-800 text-white text-xs font-mono p-2.5 w-full focus:outline-none focus:border-amber-400 font-bold"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="text-[10px] font-mono text-neutral-500 italic py-2">
                      {bulkActionType === 'present_zero' && "* Marked pupil present in class with GHC 0.00 cash today. Past debt remains unsettled."}
                      {bulkActionType === 'absent' && "* Excused from school activity fees on selected school days. Absent record submitted."}
                      {bulkActionType === 'clear' && "* Removes existing transactions or metadata for selected dates from the database completely."}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex justify-between items-center border-t border-neutral-850 pt-5">
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest font-bold">
                {selectedBulkDates.length} Dates SELECTED
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setBulkPupil(null)}
                  className="px-5 py-2.5 bg-neutral-950 hover:bg-neutral-850 text-neutral-400 hover:text-white text-xs font-mono font-black uppercase tracking-widest border border-neutral-850 cursor-pointer transition-colors"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  disabled={selectedBulkDates.length === 0}
                  onClick={() => {
                    const customAmt = bulkCustomAmount ? parseFloat(bulkCustomAmount) : undefined;
                    if (bulkActionType === 'paid' && customAmt !== undefined && (isNaN(customAmt) || customAmt < 0)) {
                      showToast("Please enter a valid non-negative custom amount.");
                      return;
                    }
                    recordPupilBulkDates(bulkPupil.id, selectedBulkDates, bulkActionType, customAmt);
                    playFeedbackSound();
                    showToast(`Successfully applied bulk entries to ${selectedBulkDates.length} school days for ${bulkPupil.name}!`);
                    setBulkPupil(null);
                  }}
                  className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-black text-xs font-mono font-black uppercase tracking-widest cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed transition-all"
                >
                  APPLY BULK ENTRIES
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* STUDENT DAILY PAYMENT RECEIPT MODAL */}
      {receiptStudent && (() => {
        const paidInfo = paidStudentMap.get(receiptStudent.id);
        const isPaidToday = !!paidInfo && !paidInfo.isAbsent;
        
        return (
          <>
            {/* Screen UI Modal (Hidden when printing via no-print custom class) */}
            <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto no-print">
              <div className="relative w-full max-w-lg bg-neutral-900 border-4 border-amber-450 p-6 md:p-8 space-y-6 shadow-[8px_8px_0px_0px_rgba(251,191,36,0.15)] text-white">
                
                {/* Header section */}
                <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-amber-400/10 border border-amber-400 text-amber-300 shrink-0 animate-none">
                      <Printer size={20} />
                    </div>
                    <div>
                      <span className="text-[9px] text-amber-400 font-mono tracking-widest font-black uppercase block">Daily Transaction Record</span>
                      <h3 className="text-base font-black uppercase tracking-tight">Fee Payment Docket</h3>
                    </div>
                  </div>
                  <button 
                    onClick={() => setReceiptStudent(null)} 
                    className="p-1 cursor-pointer text-neutral-400 hover:text-white transition-colors"
                    title="Close Receipt Overlay"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Status Alert or Receipt Details */}
                {!isPaidToday ? (
                  <div className="bg-neutral-950 p-6 border-2 border-dashed border-neutral-800 text-center space-y-3.5 rounded-sm">
                    <div className="w-10 h-10 rounded-full bg-red-950/40 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
                      <X size={18} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold uppercase tracking-wide text-neutral-300">No Payment Recorded Today</h4>
                      <p className="text-xs text-neutral-450 leading-relaxed max-w-sm mx-auto font-mono">
                        There is no active check-in or daily gate deposit registered for <span className="text-white font-bold">{receiptStudent.name}</span> on <span className="text-amber-500 font-bold">{currentDate}</span>.
                      </p>
                    </div>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          recordPayment(receiptStudent.id, true);
                          showToast(`Successfully logged daily fee for ${receiptStudent.name}.`);
                        }}
                        className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-black text-[10.5px] font-mono font-black uppercase tracking-widest transition-colors cursor-pointer"
                      >
                        Collect Daily Fee & Clear
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xs space-y-4 font-mono text-xs">
                      
                      {/* Header receipt info */}
                      <div className="flex justify-between items-start border-b border-neutral-900 pb-3">
                        <div>
                          <span className="text-[9px] text-neutral-500 block uppercase font-bold">Pupil Name</span>
                          <strong className="text-sm font-black text-white uppercase">{receiptStudent.name}</strong>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-neutral-500 block uppercase font-bold">Grade / Class</span>
                          <strong className="text-amber-400 uppercase">{receiptStudent.class} ({receiptStudent.category})</strong>
                        </div>
                      </div>

                      {/* Meta info columns */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-1 text-[11px]">
                        <div>
                          <span className="text-[9px] text-neutral-505 block uppercase">Admission ID</span>
                          <strong className="text-neutral-300 font-bold">{receiptStudent.rollNumber || 'SHC-'+receiptStudent.id.substring(0,5).toUpperCase()}</strong>
                        </div>
                        
                        <div>
                          <span className="text-[9px] text-neutral-505 block uppercase">Receipt Reference</span>
                          <strong className="text-neutral-300 truncate block select-all font-bold" title={paidInfo.paymentId}>
                            {paidInfo.paymentId.substring(0, 10).toUpperCase()}...
                          </strong>
                        </div>

                        <div>
                          <span className="text-[9px] text-neutral-505 block uppercase">Payment Date</span>
                          <strong className="text-neutral-300 font-bold">{currentDate}</strong>
                        </div>

                        <div>
                          <span className="text-[9px] text-neutral-505 block uppercase">System Officer</span>
                          <strong className="text-neutral-300 font-bold uppercase truncate block">{paidInfo.collectedBy || 'Staff Registrar'}</strong>
                        </div>
                      </div>

                      {/* Amount Block */}
                      <div className="pt-3 border-t border-neutral-900 flex justify-between items-center">
                        <div>
                          <span className="text-[9px] text-neutral-500 block uppercase font-bold">Transaction Type</span>
                          <span className="text-[9.5px] bg-neutral-900 text-amber-500 border border-neutral-850 px-2 py-0.5 font-bold uppercase rounded-sm inline-block mt-0.5">
                            {receiptStudent.paymentType || 'Daily Gate Coin'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-neutral-505 block uppercase font-bold">Gate Amount Paid</span>
                          <strong className="text-lg font-black text-emerald-400">
                            GHC {paidInfo.amount.toFixed(2)}
                          </strong>
                        </div>
                      </div>

                      {/* Details note */}
                      {paidInfo.notes && (
                        <div className="p-2.5 bg-neutral-900 border border-neutral-850 rounded-xs text-[10px] text-neutral-400">
                          <span className="text-[8px] uppercase text-neutral-500 block font-bold leading-none mb-1">DOCKET RECONCILIATION NOTES</span>
                          {paidInfo.notes}
                        </div>
                      )}
                    </div>

                    {/* Aesthetic Verification Seal */}
                    <div className="flex items-center justify-between px-4 py-3 bg-neutral-950 border border-neutral-850 text-xs font-mono rounded-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-neutral-450 text-[10.5px]">Status: <strong className="text-emerald-400 font-black uppercase">VERIFIED SECURE</strong></span>
                      </div>
                      <span className="text-[9px] text-neutral-550 uppercase">Gate ID Code: SHC-{receiptStudent.id.substring(0,6).toUpperCase()}</span>
                    </div>

                    {/* Printing action and close btn */}
                    <div className="flex flex-col sm:flex-row gap-3 font-mono text-center">
                      <button
                        type="button"
                        onClick={() => {
                          window.print();
                        }}
                        className="flex-1 py-3 px-4 bg-amber-400 hover:bg-amber-300 text-black font-black uppercase text-xs tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 border border-amber-500 shadow-md"
                        title="Export this receipt cleanly as a printable PDF invoice via browser print setup"
                        id="btn-print-daily-pdf"
                      >
                        <Printer size={15} className="stroke-[2.5]" />
                        <span>Export PDF Invoice</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadReceipt(
                          receiptStudent,
                          currentDate,
                          paidInfo.paymentId,
                          paidInfo.amount || 5,
                          paidInfo.collectedBy,
                          !!paidInfo.isAbsent,
                          paidInfo.notes
                        )}
                        className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-xs tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 border border-emerald-600 font-bold"
                        title="Save receipt record as an offline HTML file"
                        id="btn-download-daily-docket"
                      >
                        <Download size={15} className="stroke-[2.5]" />
                        <span>Download Docket</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setReceiptStudent(null)}
                        className="py-3 px-4 bg-neutral-950 hover:bg-neutral-850 text-neutral-400 hover:text-white font-medium uppercase text-xs tracking-wider transition-colors border border-neutral-850 cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* PRINTER FRIENDLY PORTRAIT DAILY RECEIPT SLIP (HIDDEN ON SCREEN, VISIBLE ON PRINT ONLY) */}
            {paidInfo && (
              <div id="print-daily-receipt" className="hidden print:block bg-white text-black p-12 max-w-[210mm] mx-auto font-sans leading-relaxed">
                <div className="space-y-6">
                  
                  {/* Letterhead */}
                  <div className="border-b-4 border-black pb-4 flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <SchoolLogo size={42} className="shrink-0" lightBackground={true} />
                      <div className="space-y-1">
                        <span className="text-[11px] font-black uppercase tracking-wider text-black bg-neutral-200 px-2.5 py-1 font-mono">
                          SAAKO HOLY CHILD ACADEMY
                        </span>
                        <h2 className="text-xl font-black uppercase tracking-tight leading-none mt-2 font-sans font-bold">OFFICIAL DAILY PAYMENT RECEIPT</h2>
                        <p className="text-[9px] text-neutral-600 font-black uppercase tracking-widest font-mono">
                          GATE CHECKPOINT INGRESS SYSTEM • TRANSACTION CONFIRMATION SLIP
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right space-y-1 font-mono">
                      <span className="text-[11px] font-black uppercase px-3 py-1 bg-black text-white inline-block">
                        DAILY FEE RECEIPT
                      </span>
                      <div className="text-[8.5px] text-neutral-600 uppercase font-black mt-2">
                        TRANSACTION ID: SHC-TX-{currentDate.replace(/-/g, '')}-{paidInfo.paymentId ? paidInfo.paymentId.substring(0,8).toUpperCase() : 'DIRECT'}
                      </div>
                    </div>
                  </div>

                  {/* Profile and Transaction breakdown */}
                  <div className="grid grid-cols-2 gap-8 text-[11px] leading-relaxed border-b border-neutral-300 pb-5">
                    <div className="font-sans space-y-1.5">
                      <span className="text-[8.5px] font-black uppercase text-neutral-500 block text-neutral-510 font-bold">STUDENT BENEFICIARY</span>
                      <div className="text-sm font-black text-black uppercase font-bold">{receiptStudent.name}</div>
                      <div className="font-mono text-neutral-755 font-bold">Roll Ref: {receiptStudent.rollNumber || 'SHC-' + receiptStudent.id.substring(0, 5).toUpperCase()}</div>
                      <div className="font-bold">Cohort Grade: {receiptStudent.class} ({receiptStudent.category})</div>
                    </div>

                    <div className="border-l pl-8 border-neutral-200 font-mono space-y-1.5">
                      <span className="text-[8.5px] font-black uppercase text-neutral-500 block font-sans font-bold">TRANSACTION METRICS</span>
                      <div><strong>Date Cleared:</strong> {currentDate}</div>
                      <div><strong>Gate Fee Logged:</strong> GHC {(paidInfo.amount || 0).toFixed(2)}</div>
                      <div><strong>Attendance Today:</strong> <span className={`font-sans font-bold ${paidInfo.isAbsent ? "text-red-700" : "text-emerald-700"}`}>{paidInfo.isAbsent ? "🔴 ABSENT" : "🟢 PRESENT & CHECKED-IN"}</span></div>
                      <div><strong>Gate Auditor:</strong> {paidInfo.collectedBy || currentUser?.name || 'Certified Gateway Auditor'}</div>
                      <div><strong>Verification Code:</strong> SUCCESSFUL DEPOSIT SECURITIES ✔️</div>
                    </div>
                  </div>

                  {/* Receipt message */}
                  <div className="p-4 border border-neutral-300 bg-neutral-50 rounded-sm text-xs space-y-2">
                    <span className="text-[10px] font-black text-black block font-mono uppercase font-bold">SECURITY TRANSACTION CONFIRMATION SUMMARY</span>
                    <p className="text-[10px] leading-relaxed font-sans text-neutral-700">
                      This receipt confirms a monetary transaction of <strong className="text-black font-bold">GHC {paidInfo.amount.toFixed(2)}</strong> paid on <strong className="text-black font-bold">{currentDate}</strong> in favor of the pupil <strong className="text-black font-bold">{receiptStudent.name}</strong>.
                      The fee allows daily gate pass entry, attendance logs validation, and educational resources allocation under the active term register.
                    </p>
                  </div>

                  {/* Signature deck */}
                  <div className="pt-12 flex justify-between items-end font-sans">
                    <div className="space-y-1 text-left font-mono">
                      <div className="text-[8px] text-neutral-500 uppercase">OFFICIAL QR GATE REFERENCE</div>
                      <div className="text-[10px] font-bold tracking-widest text-neutral-800 uppercase bg-neutral-100 p-1.5 inline-block font-mono">
                        *SHCR-{receiptStudent.id.substring(0,8).toUpperCase()}*
                      </div>
                    </div>

                    <div className="text-right space-y-2">
                      <div className="inline-block border-b border-black w-32 h-6" />
                      <div className="text-[7.5px] font-black uppercase text-neutral-700 tracking-wider font-sans font-bold animate-none">
                        Audit Desk Signature
                        <span className="text-[7px] text-neutral-400 block mt-0.5 font-normal">SAAKO HOLY CHILD ACADEMY CHECKPOINT</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* INDIVIDUAL RECORD RECEIPT MODAL */}
      {selectedRecordForReceipt && (() => {
        const { student, payment } = selectedRecordForReceipt;
        const refId = payment.id;
        
        return (
          <>
            {/* Screen UI Modal (Hidden when printing via no-print class) */}
            <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto no-print animate-fade-in animate-duration-200">
              <div className="relative w-full max-w-lg bg-neutral-900 border-4 border-amber-450 p-6 md:p-8 space-y-6 shadow-[8px_8px_0px_0px_rgba(251,191,36,0.15)] text-white">
                
                {/* Header section */}
                <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-amber-400/10 border border-amber-400 text-amber-300 shrink-0">
                      <Printer size={20} />
                    </div>
                    <div>
                      <span className="text-[9px] text-amber-400 font-mono tracking-widest font-black uppercase block">Ledger Transaction Receipt</span>
                      <h3 className="text-base font-black uppercase tracking-tight">Fee Payment Docket</h3>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedRecordForReceipt(null)} 
                    className="p-1 cursor-pointer text-neutral-400 hover:text-white transition-colors"
                    title="Close Receipt Overlay"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Receipt Details */}
                <div className="space-y-5">
                  <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xs space-y-4 font-mono text-xs">
                    
                    {/* Header receipt info */}
                    <div className="flex justify-between items-start border-b border-neutral-900 pb-3">
                      <div>
                        <span className="text-[9px] text-neutral-500 block uppercase font-bold">Pupil Name</span>
                        <strong className="text-sm font-black text-white uppercase">{student.name}</strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-neutral-500 block uppercase font-bold">Grade / Class</span>
                        <strong className="text-amber-400 uppercase">{student.class} ({student.category})</strong>
                      </div>
                    </div>

                    {/* Meta info columns */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-1 text-[11px]">
                      <div>
                        <span className="text-[9px] text-neutral-505 block uppercase">Admission ID</span>
                        <strong className="text-neutral-300 font-bold">{student.rollNumber || 'SHC-'+student.id.substring(0,5).toUpperCase()}</strong>
                      </div>
                      
                      <div>
                        <span className="text-[9px] text-neutral-505 block uppercase">Receipt Reference</span>
                        <strong className="text-neutral-300 truncate block select-all font-bold" title={refId}>
                          {refId.substring(0, 10).toUpperCase()}...
                        </strong>
                      </div>

                      <div>
                        <span className="text-[9px] text-neutral-505 block uppercase">Payment Date</span>
                        <strong className="text-neutral-300 font-bold">{payment.date}</strong>
                      </div>

                      <div>
                        <span className="text-[9px] text-neutral-505 block uppercase">System Officer</span>
                        <strong className="text-neutral-300 font-bold uppercase truncate block">{payment.collectedBy || 'Staff Registrar'}</strong>
                      </div>
                    </div>

                    {/* Amount Block */}
                    <div className="pt-3 border-t border-neutral-900 flex justify-between items-center">
                      <div>
                        <span className="text-[9px] text-neutral-500 block uppercase font-bold">Transaction Type</span>
                        <span className="text-[9.5px] bg-neutral-900 text-amber-500 border border-neutral-850 px-2 py-0.5 font-bold uppercase rounded-sm inline-block mt-0.5">
                          {payment.isAbsent ? 'Absent (No Fee Due)' : (student.paymentType || 'Daily Gate Coin')}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-neutral-505 block uppercase font-bold">Amount Paid</span>
                        <strong className="text-lg font-black text-emerald-400">
                          GHC {payment.amount.toFixed(2)}
                        </strong>
                      </div>
                    </div>

                    {/* Details note */}
                    {payment.notes && (
                      <div className="p-2.5 bg-neutral-900 border border-neutral-850 rounded-xs text-[10px] text-neutral-400">
                        <span className="text-[8px] uppercase text-neutral-500 block font-bold leading-none mb-1">DOCKET RECONCILIATION NOTES</span>
                        {payment.notes}
                      </div>
                    )}
                  </div>

                  {/* Aesthetic Verification Seal */}
                  <div className="flex items-center justify-between px-4 py-3 bg-neutral-950 border border-neutral-850 text-xs font-mono rounded-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-neutral-455 text-[10.5px]">Status: <strong className="text-emerald-400 font-black uppercase">VERIFIED SECURE</strong></span>
                    </div>
                    <span className="text-[9px] text-neutral-550 uppercase">Gate ID Code: SHC-{student.id.substring(0,6).toUpperCase()}</span>
                  </div>

                  {/* Printing action and close btn */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-center">
                    <button
                      type="button"
                      onClick={() => {
                        window.print();
                      }}
                      className="py-3 px-4 bg-amber-400 hover:bg-amber-300 text-black font-black uppercase text-xs tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 border border-amber-500"
                      title="Export this receipt cleanly as a printable PDF invoice via browser print setup"
                      id="btn-export-record-pdf"
                    >
                      <Printer size={15} className="stroke-[2.5]" />
                      <span>Export PDF Invoice</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => downloadReceipt(
                        student,
                        payment.date,
                        refId,
                        payment.amount,
                        payment.collectedBy,
                        !!payment.isAbsent,
                        payment.notes
                      )}
                      className="py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-xs tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 border border-emerald-600 font-bold"
                      title="Save receipt record as an offline HTML file"
                      id="btn-download-record-docket"
                    >
                      <Download size={15} className="stroke-[2.5]" />
                      <span>Download Docket</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleShareWhatsApp('receipt', student, payment);
                      }}
                      className="py-3 px-4 bg-emerald-650 hover:bg-emerald-550 text-white font-black uppercase text-xs tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 border border-emerald-800"
                    >
                      <MessageSquare size={15} />
                      <span>Share Receipt</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedRecordForReceipt(null)}
                      className="py-3 px-4 bg-neutral-950 hover:bg-neutral-850 text-neutral-400 hover:text-white font-medium uppercase text-xs tracking-wider transition-colors border border-neutral-850 cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* PRINTER FRIENDLY PORTRAIT DAILY RECEIPT SLIP (HIDDEN ON SCREEN, VISIBLE ON PRINT ONLY) */}
            <div id="print-record-receipt" className="hidden print:block bg-white text-black p-12 max-w-[210mm] mx-auto font-sans leading-relaxed">
              <div className="space-y-6">
                
                {/* Letterhead */}
                <div className="border-b-4 border-black pb-4 flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <SchoolLogo size={42} className="shrink-0" lightBackground={true} />
                    <div className="space-y-1">
                      <span className="text-[11px] font-black uppercase tracking-wider text-black bg-neutral-200 px-2.5 py-1 font-mono">
                        SAAKO HOLY CHILD ACADEMY
                      </span>
                      <h2 className="text-xl font-black uppercase tracking-tight leading-none mt-2 font-sans font-bold">OFFICIAL PAYMENT RECEIPT</h2>
                      <p className="text-[9px] text-neutral-600 font-black uppercase tracking-widest font-mono">
                        GATE CHECKPOINT INGRESS SYSTEM • TRANSACTION CONFIRMATION SLIP
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right space-y-1 font-mono">
                    <span className="text-[11px] font-black uppercase px-3 py-1 bg-black text-white inline-block text-center font-bold">
                      FEE TRANSACTION RECEIPT
                    </span>
                    <div className="text-[8.5px] text-neutral-600 uppercase font-black mt-2">
                      TRANSACTION ID: SHC-TX-{payment.date.replace(/-/g, '')}-{refId.substring(0,8).toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Profile and Transaction breakdown */}
                <div className="grid grid-cols-2 gap-8 text-[11px] leading-relaxed border-b border-neutral-300 pb-5">
                  <div className="font-sans space-y-1.5">
                    <span className="text-[8.5px] font-black uppercase text-neutral-500 block text-neutral-510 font-bold">STUDENT BENEFICIARY</span>
                    <div className="text-sm font-black text-black uppercase font-bold">{student.name}</div>
                    <div className="font-mono text-neutral-755 font-bold">Roll Ref: {student.rollNumber || 'SHC-' + student.id.substring(0, 5).toUpperCase()}</div>
                    <div className="font-bold">Cohort Grade: {student.class} ({student.category})</div>
                  </div>

                  <div className="border-l pl-8 border-neutral-200 font-mono space-y-1.5">
                    <span className="text-[8.5px] font-black uppercase text-neutral-500 block font-sans font-bold">TRANSACTION METRICS</span>
                    <div><strong>Date Cleared:</strong> {payment.date}</div>
                    <div><strong>Fee Logged:</strong> GHC {payment.amount.toFixed(2)}</div>
                    <div><strong>Attendance Status:</strong> <span className={`font-sans font-bold ${payment.isAbsent ? "text-red-700" : "text-emerald-700"}`}>{payment.isAbsent ? "🔴 ABSENT" : "🟢 PRESENT & CHECKED-IN"}</span></div>
                    <div><strong>Gate Auditor:</strong> {payment.collectedBy || currentUser?.name || 'Certified Gateway Auditor'}</div>
                    <div><strong>Verification Code:</strong> SUCCESSFUL DEPOSIT SECURITIES ✔️</div>
                  </div>
                </div>

                {/* Receipt message */}
                <div className="p-4 border border-neutral-300 bg-neutral-50 rounded-sm text-xs space-y-2">
                  <span className="text-[10px] font-black text-black block font-mono uppercase font-bold">SECURITY TRANSACTION CONFIRMATION SUMMARY</span>
                  <p className="text-[10px] leading-relaxed font-sans text-neutral-700">
                    This receipt confirms a monetary transaction of <strong className="text-black font-bold">GHC {payment.amount.toFixed(2)}</strong> paid on <strong className="text-black font-bold">{payment.date}</strong> in favor of the pupil <strong className="text-black font-bold">{student.name}</strong>.
                    The fee allows daily gate pass entry, attendance logs validation, and educational resources allocation under the active term register.
                  </p>
                </div>

                {/* Signature deck */}
                <div className="pt-12 flex justify-between items-end font-sans">
                  <div className="space-y-1 text-left font-mono">
                    <div className="text-[8px] text-neutral-500 uppercase">OFFICIAL QR GATE REFERENCE</div>
                    <div className="text-[10px] font-bold tracking-widest text-neutral-800 uppercase bg-neutral-100 p-1.5 inline-block font-mono">
                      *SHCR-{student.id.substring(0,8).toUpperCase()}*
                    </div>
                  </div>

                  <div className="text-right space-y-2">
                    <div className="inline-block border-b border-black w-32 h-6" />
                    <div className="text-[7.5px] font-black uppercase text-neutral-700 tracking-wider font-sans font-bold">
                      Audit Desk Signature
                      <span className="text-[7px] text-neutral-400 block mt-0.5 font-normal">SAAKO HOLY CHILD ACADEMY CHECKPOINT</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </>
        );
      })()}

      {/* Dynamic Action/Delete Confirmation Modal Safeguard */}
      {deleteConf.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in animate-duration-200">
          <div className="bg-neutral-950 border-4 border-red-600 max-w-md w-full p-6 space-y-6 shadow-[10px_10px_0px_0px_rgba(220,38,38,0.25)] relative">
            <div className="flex items-center gap-3 border-b-2 border-neutral-850 pb-4">
              <Trash2 className="text-red-500 animate-pulse" size={28} />
              <div>
                <span className="text-[10px] font-mono tracking-widest text-red-500 uppercase font-black font-bold">CRITICAL DELETION GUARD</span>
                <h3 className="text-base font-black uppercase tracking-tight text-white font-mono">Confirm Radical Purge Action</h3>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-neutral-300 leading-relaxed font-semibold">
                You are about to permanently purge or deactivate this item. Once confirmed, this action <strong className="text-red-500">CANNOT BE UNDONE</strong> and will sever all database linkages:
              </p>
              
              <div className="p-3 bg-red-950/20 border-2 border-red-900/60 rounded text-center">
                <p className="text-[10px] font-mono uppercase text-neutral-400">Target Item Name</p>
                <p className="text-sm font-black font-mono text-white mt-1 uppercase tracking-wider">
                  {deleteConf.targetName}
                </p>
                <p className="text-[9px] font-mono text-red-400 mt-1 uppercase tracking-widest font-bold">
                  {deleteConf.type === 'student_delete' 
                    ? 'Student Profile Purge' 
                    : deleteConf.type === 'student_deactivate' 
                      ? 'Deactivate Student Account' 
                      : 'School Term Schedule'}
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
                  onChange={(e) => setDeleteConf(prev => ({ ...prev, userInput: e.target.value.toUpperCase().trim() }))}
                  className="w-full bg-neutral-950 border-2 border-neutral-800 focus:border-red-600 py-2.5 px-3.5 text-xs text-white font-mono font-bold focus:outline-none uppercase tracking-widest"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && deleteConf.userInput.trim().toUpperCase() === 'DELETE') {
                      deleteConf.onConfirm();
                      setDeleteConf({ isOpen: false, type: 'student_delete', targetId: '', targetName: '', userInput: '', onConfirm: () => {} });
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConf({ isOpen: false, type: 'student_delete', targetId: '', targetName: '', userInput: '', onConfirm: () => {} })}
                className="w-1/3 py-3 px-4 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 hover:text-white font-bold uppercase text-xs tracking-wider transition-colors cursor-pointer font-mono"
              >
                Cancel
              </button>
              
              <button
                type="button"
                disabled={deleteConf.userInput.trim().toUpperCase() !== 'DELETE'}
                onClick={() => {
                  deleteConf.onConfirm();
                  setDeleteConf({ isOpen: false, type: 'student_delete', targetId: '', targetName: '', userInput: '', onConfirm: () => {} });
                }}
                className={`w-2/3 py-3 px-4 font-black uppercase text-xs tracking-wider font-mono transition-all cursor-pointer ${
                  deleteConf.userInput.trim().toUpperCase() === 'DELETE'
                    ? 'bg-red-600 hover:bg-red-500 text-white hover:scale-[1.02] active:scale-[0.98]'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-650 cursor-not-allowed opacity-50'
                }`}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hardcopy Daily Register Print Modal */}
      {showPrintHardcopyModal && (
        <div className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-md flex flex-col p-4 md:p-6 overflow-y-auto no-print">
          {/* Inner controller panel */}
          <div className="w-full max-w-5xl mx-auto bg-neutral-900 border-2 border-neutral-800 p-4 mb-4 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <Printer className="text-emerald-400 shrink-0" size={20} />
              <div className="text-left font-mono">
                <span className="text-[9px] text-amber-400 font-bold block uppercase tracking-widest">Administrative Hardcopy Module</span>
                <h4 className="text-sm font-black text-white uppercase tracking-wider">Gate Check-In Checklist Print Hub</h4>
              </div>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('show-print-iframe-warning'));
                  window.print();
                }}
                className="flex-grow sm:flex-initial px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-[10.5px] font-mono font-black uppercase tracking-widest transition-colors cursor-pointer flex items-center justify-center gap-2 font-bold"
              >
                <Printer size={14} className="stroke-[2.5]" />
                <span>Print Gate Sheet</span>
              </button>
              
              <button
                type="button"
                onClick={() => setShowPrintHardcopyModal(false)}
                className="flex-grow sm:flex-initial px-4 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-400 hover:text-white text-[10.5px] font-mono font-bold uppercase transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>

          {/* Interactive Screen Preview Container */}
          <div className="w-full max-w-5xl mx-auto flex-1 bg-neutral-950 border border-neutral-850 p-4 md:p-10 flex min-h-[500px] justify-center items-start overflow-x-auto">
            {/* The actual printable area */}
            <div 
              id="print-hardcopy-area"
              className="bg-white text-black p-8 md:p-12 w-[100%] max-w-[210mm] min-h-[297mm] shadow-2xl border border-neutral-300 font-sans flex flex-col justify-between"
            >
              {/* Dynamic local CSS style block to completely isolate this page during printing */}
              <style>{`
                @media print {
                  body * {
                    visibility: hidden !important;
                    background: none !important;
                    color: black !important;
                  }
                  #print-hardcopy-area, #print-hardcopy-area * {
                    visibility: visible !important;
                  }
                  #print-hardcopy-area {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    margin: 0 !important;
                    padding: 10mm !important;
                    background: white !important;
                    color: black !important;
                    font-family: inherit !important;
                    box-shadow: none !important;
                    border: none !important;
                  }
                  .no-print {
                    display: none !important;
                    visibility: hidden !important;
                  }
                  table {
                    width: 100% !important;
                    border-collapse: collapse !important;
                    margin-top: 10px !important;
                  }
                  th, td {
                    border: 1px solid #000000 !important;
                    padding: 5px 6px !important;
                    font-size: 10px !important;
                    color: #000000 !important;
                    line-height: 1.2 !important;
                  }
                  th {
                    background-color: #f3f4f6 !important;
                    font-weight: bold !important;
                  }
                }
              `}</style>

              <div className="space-y-4">
                {/* Header Title Section */}
                <div className="border-b-4 border-black pb-3 flex justify-between items-start text-left">
                  <div className="space-y-1">
                    <span className="text-[8px] font-bold text-neutral-600 font-mono tracking-widest uppercase block">
                      OFFICIAL SAKO GATEWAY LOGISTIC UTILITY
                    </span>
                    <h2 className="text-xl font-extrabold uppercase tracking-tight text-black">
                      SAAKO HOLY CHILD ACADEMY
                    </h2>
                    <p className="text-[9px] text-neutral-600 uppercase font-mono tracking-wide">
                      Sawla-Savannah Region • Holiness is our Key • Tel: +233545029200
                    </p>
                  </div>

                  <div className="text-right space-y-1">
                    <span className="inline-block bg-black px-2.5 py-1 text-[9px] font-mono font-bold uppercase text-white tracking-widest">
                      GATE REGISTER
                    </span>
                    <div className="text-[8px] text-neutral-500 font-mono font-bold">
                      GEN: {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                {/* Subtitle / Description */}
                <div className="text-center bg-neutral-100 border border-neutral-300 p-2 text-left">
                  <h3 className="text-center text-xs font-black uppercase text-black font-sans tracking-wider">
                    DAILY GATE CHECK-IN & REVENUE SHEET (HARDCOPY LEDGER)
                  </h3>
                  <p className="text-center text-[9px] text-neutral-500 font-mono uppercase tracking-wider mt-0.5">
                    Gatekeepers: Record daily presence & collect arrears. Settle checklist sums with accounts desk daily.
                  </p>
                </div>

                {/* Ledger Metadata Write-in Slots */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 border border-black/80 text-left font-mono text-[9px]">
                  <div className="space-y-1">
                    <span className="text-neutral-500 font-extrabold uppercase block font-bold">TARGET CLASS:</span>
                    <span className="text-xs font-black text-black">CLASS {selectedClass === 'B7' ? 'JHS1' : selectedClass === 'B8' ? 'JHS2' : selectedClass === 'B9' ? 'JHS3' : selectedClass}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-neutral-500 font-extrabold uppercase block font-bold">ACADEMIC TERM:</span>
                    <span className="text-xs font-extrabold text-black uppercase">{activeTerm?.name || 'ACTIVE SCHED'}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-neutral-550 font-extrabold uppercase block font-black">SCHEDULED DATE:</span>
                    <span className="text-xs font-black text-black">{currentDate}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-neutral-500 font-extrabold block font-bold">ROSTER TOTAL:</span>
                    <span className="text-xs font-black text-black">{classStudents.length} PUPILS</span>
                  </div>
                </div>

                {/* Checklist fields to fill in manually at the gate */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-r border-l border-b border-neutral-200 bg-neutral-50/50 p-2 text-left font-mono text-[9px]">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-neutral-500">GATEKEEPER name:</span>
                    <span className="flex-1 border-b border-black/60 h-4" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-neutral-500">SIGN-OFF TIME:</span>
                    <span className="flex-1 border-b border-black/60 h-4" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-neutral-500">HANDOVER SIGN:</span>
                    <span className="flex-1 border-b border-black/60 h-4" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-neutral-500 font-black text-neutral-700">ACCOUNTS AUDITOR:</span>
                    <span className="flex-1 border-b border-black/60 h-4" />
                  </div>
                </div>

                {/* Student Check-In Checklist Table Header */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans text-xs border-collapse">
                    <thead>
                      <tr className="bg-neutral-100 text-black border-t-2 border-b-2 border-black">
                        <th className="py-2.5 px-1.5 text-center text-[10px] uppercase font-black w-[5%] border border-black">No.</th>
                        <th className="py-2.5 px-3 uppercase font-black w-[35%] border border-black">Student Profile & Phone</th>
                        <th className="py-2.5 px-2 text-center uppercase font-black w-[13%] border border-black">Billing Scheme</th>
                        <th className="py-2.5 px-2 text-center uppercase font-black w-[17%] border border-black text-red-650">Arrears Pending</th>
                        <th className="py-2.5 px-2 text-center uppercase font-black w-[15%] border border-black">Check-In Status</th>
                        <th className="py-2.5 px-2 text-center uppercase font-black w-[15%] border border-black">Daily Cash Received</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classStudents.map((student, idx) => {
                        const debtInfo = studentDebtMap.get(student.id);
                        const arrearsVal = debtInfo?.totalDebt || 0;
                        const pastDays = debtInfo?.pastUnpaidDays?.length || 0;
                        
                        return (
                          <tr key={student.id} className="border-b border-neutral-300">
                            <td className="py-2 px-1 text-center font-mono text-[9px] border border-black font-extrabold">{idx + 1}</td>
                            <td className="py-2 px-2.5 text-left border border-black">
                              <div className="font-black text-[10px] text-black uppercase">{student.name}</div>
                              <div className="text-[8px] text-neutral-500 font-mono tracking-wider flex items-center gap-1 mt-0.5">
                                <span>Roll ID: {student.rollNumber || 'N/A'}</span> • <span>Ph: {student.guardianPhone || 'No Contact'}</span>
                              </div>
                            </td>
                            <td className="py-2 px-1.5 text-center font-mono text-[9px] uppercase border border-black font-semibold">
                              {student.paymentType === 'Term' ? (
                                <span className="text-black font-bold">Term Scheme</span>
                              ) : student.paymentType === 'Scholar' ? (
                                <span className="text-slate-500 font-normal">Scholar</span>
                              ) : (
                                <span className="text-black font-black">Daily (GHC 5-fee)</span>
                              )}
                            </td>
                            <td className="py-1 px-1.5 text-center font-mono text-[9.5px] border border-black">
                              {arrearsVal > 0 ? (
                                <div className="text-red-750 font-black uppercase text-[9px]">
                                  GHC {arrearsVal.toFixed(2)}
                                  <span className="block text-[7.5px] text-neutral-550 lowercase font-bold font-sans">({pastDays}d unpaid)</span>
                                </div>
                              ) : (
                                <span className="text-neutral-400 text-[8.5px] uppercase font-bold font-sans">No Debt</span>
                              )}
                            </td>
                            <td className="py-2 px-1 text-center border border-black select-none">
                              <div className="flex justify-center items-center gap-2 text-[9px] font-mono leading-none">
                                <label className="flex items-center gap-1 font-bold cursor-pointer">
                                  <span className="inline-block w-4 h-4 border border-black/80 bg-white" />
                                  <span>PRES</span>
                                </label>
                                <label className="flex items-center gap-1 font-bold cursor-pointer">
                                  <span className="inline-block w-4 h-4 border border-black/80 bg-white" />
                                  <span>ABS</span>
                                </label>
                              </div>
                            </td>
                            <td className="py-1 px-1.5 text-center font-mono text-[8.5px] border border-black">
                              {student.paymentType === 'Daily' ? (
                                <div className="flex items-center gap-1 justify-center">
                                  <span className="font-bold border border-black/80 w-3 h-3 block inline-block" />
                                  <span className="font-extrabold text-[8.5px]">GHC 5</span>
                                  <span className="text-neutral-350 mx-0.5">/</span>
                                  <span className="border-b border-black w-8 block h-2" />
                                </div>
                              ) : student.paymentType === 'Scholar' ? (
                                <span className="text-neutral-400 uppercase text-[7px] tracking-widest font-black">EXEMPT</span>
                              ) : (
                                <div className="flex items-center gap-1 w-full justify-center">
                                  <span className="font-bold text-neutral-500 text-[6.5px] uppercase">GHC</span>
                                  <span className="border-b border-black w-12 block h-2" />
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {classStudents.length === 0 && (
                  <div className="py-12 border-2 border-dashed border-neutral-300 text-center text-neutral-400 uppercase font-mono text-xs">
                    No active students enrolled in Class {selectedClass}
                  </div>
                )}
              </div>

              {/* Auditor Signoff on paper footer */}
              <div className="border-t-2 border-black pt-3 mt-4 z-10 font-mono text-[8.5px]">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-2 text-left w-1/2">
                    <span className="text-neutral-500 font-extrabold uppercase block leading-none">TOTAL GATE SUMMARY (TO BE TALLIED):</span>
                    <div className="space-y-1.5 text-[8px] leading-relaxed">
                      <div>1. CASH COLLECTED FOR TODAY'S REGISTRARS: <span className="font-black text-black text-[9px]">GHC ________________</span></div>
                      <div>2. CASH COLLECTED FOR PENDING DEBT ARREARS: <span className="font-black text-black text-[9px]">GHC ________________</span></div>
                      <div className="font-black uppercase text-[8.5px] text-black pt-1 bg-neutral-50 border-t border-neutral-200">
                        TOTAL REVENUE HANDED BACK: GHC ____________________
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 text-right w-1/3">
                    <div className="space-y-1 text-right">
                      <div className="inline-block border-b border-black w-36 h-5" />
                      <div className="text-[7px] font-black uppercase text-neutral-700 tracking-wider">
                        Gate Teacher Sign-off
                      </div>
                    </div>

                    <div className="space-y-1 text-right">
                      <div className="inline-block border-b border-black w-36 h-5" />
                      <div className="text-[7px] font-black uppercase text-neutral-700 tracking-wider">
                        Accounts Desk Verification
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center text-[7px] text-neutral-400 uppercase tracking-widest pt-3 font-normal font-sans">
                  Sako Holy Child Academy Cloud Ledger System • Hardcopy Gate Register Form v2.1
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Class Quick-Switch Carousel ("Bottom Scroll Wheel") */}
      <div className="fixed bottom-12 left-0 right-0 z-40 bg-neutral-900/95 backdrop-blur-md border-t-4 border-amber-400 p-2.5 flex items-center justify-between gap-3 shadow-[0_-8px_24px_rgba(0,0,0,0.6)] md:hidden">
        {/* Left Scroll Click Action */}
        <button
          type="button"
          onClick={() => {
            const carousel = document.getElementById('bottom-class-carousel');
            if (carousel) {
              carousel.scrollBy({ left: -140, behavior: 'smooth' });
            }
          }}
          className="bg-neutral-950 border-2 border-neutral-800 p-2 text-amber-400 hover:text-white transition-colors cursor-pointer shrink-0 flex items-center justify-center rounded-xs active:scale-95"
          title="Scroll Left"
        >
          <ChevronLeft size={16} className="stroke-[3]" />
        </button>

        {/* Scrollable Container of Buttons */}
        <div 
          id="bottom-class-carousel"
          className="flex-1 flex gap-2 overflow-x-auto whitespace-nowrap py-1 scroll-smooth scrollbar-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {['N1', 'N2', 'KG1', 'KG2', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9'].map((cls) => {
            const isSelected = selectedClass === cls;
            const count = classEnrolments[cls as StudentClass] || 0;
            return (
              <button
                key={cls}
                type="button"
                onClick={() => {
                  setSelectedClass(cls as StudentClass);
                  // Scroll register list into view smoothly
                  const listEl = document.getElementById('register-main-container');
                  if (listEl) {
                    listEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 font-bold font-mono text-[10.5px] uppercase border transition-all shrink-0 rounded-xs ${
                  isSelected
                    ? 'bg-amber-400 text-black border-amber-400 font-black scale-102 shadow-sm animate-pulse'
                    : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <span>{cls === 'B7' ? 'JHS1' : cls === 'B8' ? 'JHS2' : cls === 'B9' ? 'JHS3' : cls}</span>
                <span className={`text-[8.5px] px-1 py-0.5 border font-semibold tracking-tighter ${
                  isSelected ? 'bg-black/15 border-black/20 text-black' : 'bg-neutral-900 border-neutral-800 text-amber-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Scroll Click Action */}
        <button
          type="button"
          onClick={() => {
            const carousel = document.getElementById('bottom-class-carousel');
            if (carousel) {
              carousel.scrollBy({ left: 140, behavior: 'smooth' });
            }
          }}
          className="bg-neutral-950 border-2 border-neutral-800 p-2 text-amber-400 hover:text-white transition-colors cursor-pointer shrink-0 flex items-center justify-center rounded-xs active:scale-95"
          title="Scroll Right"
        >
          <ChevronRight size={16} className="stroke-[3]" />
        </button>
      </div>
      {/* Floating Quick Receipt Notification Card disabled to stop popup after daily check in */}

      {whatsAppShareModal && (
        <div id="whats-app-share-modal" className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-neutral-900 border-4 border-amber-400 p-6 max-w-lg w-full rounded-none space-y-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.55)] relative text-white">
            <button
              onClick={() => {
                setWhatsAppShareModal(null);
                setCustomWAContact('');
                setSelectedStaffPhone('');
                playFeedbackSound('click');
              }}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white font-mono text-xs p-1 cursor-pointer font-black border border-neutral-800 hover:border-red-500 hover:text-red-500 px-1.5 py-0.5 transition-all"
            >
              ✕ CLOSE
            </button>

            <div className="space-y-1">
              <span className="text-[9px] font-mono font-black uppercase tracking-widest text-amber-400">WhatsApp Delivery Center</span>
              <h3 className="text-base font-black uppercase tracking-tight font-mono text-white">
                Share: {whatsAppShareModal.student.name}'s {whatsAppShareModal.type.replace('_', ' ')}
              </h3>
            </div>

            {/* Message Preview */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-black uppercase tracking-wider text-neutral-400 block">Message Preview (Auto-generated)</label>
              <textarea
                readOnly
                value={whatsAppShareModal.messageText}
                className="w-full h-28 bg-neutral-950 border border-neutral-800 p-3 text-[10.5px] font-mono rounded-none text-neutral-350 resize-none select-all focus:outline-none"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(whatsAppShareModal.messageText);
                  showToast("Message text copied to clipboard!");
                  playFeedbackSound('success');
                }}
                className="w-full bg-neutral-950 hover:bg-neutral-850 text-neutral-400 hover:text-amber-400 border border-neutral-800 py-1.5 text-[9px] font-mono font-black uppercase tracking-wider transition-all rounded-xs cursor-pointer"
              >
                📋 Copy Text to Clipboard
              </button>
            </div>

            <div className="border-t border-neutral-850 my-2 pt-2 space-y-3">
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-amber-400 block">Choose WhatsApp Contact Option:</span>

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
                    const urlText = encodeURIComponent(whatsAppShareModal.messageText);
                    const waUrl = `https://api.whatsapp.com/send?text=${urlText}`;
                    if (typeof window !== 'undefined') {
                      window.open(waUrl, '_blank', 'noopener,noreferrer');
                      showToast("WhatsApp Contact Picker opened!");
                    }
                    // Trigger background logging
                    try {
                      await sendautomatedWhatsApp(
                        'Universal Share Picker',
                        whatsAppShareModal.messageText,
                        whatsAppShareModal.student.id,
                        whatsAppShareModal.student.name,
                        whatsAppShareModal.type
                      );
                    } catch (e) {}
                    setWhatsAppShareModal(null);
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
              {whatsAppShareModal.defaultPhone && (
                <div className="bg-neutral-950/40 p-3 border border-neutral-850 hover:border-amber-400/40 transition-all rounded-xs space-y-2">
                  <div>
                    <h4 className="text-xs font-black uppercase font-mono text-white">2. Registered Parent/Guardian</h4>
                    <p className="text-[9.5px] text-neutral-400 font-bold leading-tight">
                      Registered Number: <span className="text-amber-400 font-black">{whatsAppShareModal.defaultPhone}</span>
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      let targetPhone = whatsAppShareModal.defaultPhone.replace(/\D/g, "");
                      if (targetPhone.startsWith("0") && targetPhone.length === 10) {
                        targetPhone = "233" + targetPhone.substring(1);
                      }
                      const urlText = encodeURIComponent(whatsAppShareModal.messageText);
                      const waUrl = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${urlText}`;
                      if (typeof window !== 'undefined') {
                        window.open(waUrl, '_blank', 'noopener,noreferrer');
                        showToast(`WhatsApp opened with Guardian (${whatsAppShareModal.defaultPhone})!`);
                      }
                      // Trigger background logging
                      try {
                        await sendautomatedWhatsApp(
                          whatsAppShareModal.defaultPhone,
                          whatsAppShareModal.messageText,
                          whatsAppShareModal.student.id,
                          whatsAppShareModal.student.name,
                          whatsAppShareModal.type
                        );
                      } catch (e) {}
                      setWhatsAppShareModal(null);
                      setCustomWAContact('');
                      setSelectedStaffPhone('');
                    }}
                    className="w-full bg-neutral-950 hover:bg-neutral-850 text-white hover:text-amber-400 border border-neutral-800 py-2 text-[10px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer rounded-xs"
                  >
                    💬 Send directly to Guardian ({whatsAppShareModal.defaultPhone})
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
                        const urlText = encodeURIComponent(whatsAppShareModal.messageText);
                        const waUrl = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${urlText}`;
                        if (typeof window !== 'undefined') {
                          window.open(waUrl, '_blank', 'noopener,noreferrer');
                          showToast(`WhatsApp opened with Staff member!`);
                        }
                        // Trigger background logging
                        try {
                          await sendautomatedWhatsApp(
                            selectedStaffPhone,
                            whatsAppShareModal.messageText,
                            whatsAppShareModal.student.id,
                            whatsAppShareModal.student.name,
                            whatsAppShareModal.type
                          );
                        } catch (e) {}
                        setWhatsAppShareModal(null);
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
                      const urlText = encodeURIComponent(whatsAppShareModal.messageText);
                      const waUrl = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${urlText}`;
                      if (typeof window !== 'undefined') {
                        window.open(waUrl, '_blank', 'noopener,noreferrer');
                        showToast(`WhatsApp opened with custom recipient!`);
                      }
                      // Trigger background logging
                      try {
                        await sendautomatedWhatsApp(
                          customWAContact,
                          whatsAppShareModal.messageText,
                          whatsAppShareModal.student.id,
                          whatsAppShareModal.student.name,
                          whatsAppShareModal.type
                        );
                      } catch (e) {}
                      setWhatsAppShareModal(null);
                      setCustomWAContact('');
                      setSelectedStaffPhone('');
                    }}
                    className="bg-amber-400 hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-400 text-black px-4 py-1.5 text-[10px] font-mono font-black uppercase rounded-xs cursor-pointer"
                  >
                    Send
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
});
