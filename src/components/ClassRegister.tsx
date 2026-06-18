/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useApp, PendingAlert, calculateStudentFinancialState } from '../context/AppContext';
import { StudentClass, Student, SchoolCategory, PaymentRecord } from '../types';
import { Check, X, Search, Landmark, BellRing, ChevronRight, ChevronLeft, CheckSquare, Users, MessageSquareCode, CalendarDays, CalendarPlus, CalendarX, Plus, ChevronDown, Trash2, Coins, History, Printer, Camera, Upload, Copy, Pencil, QrCode, AlertCircle, User, Phone, Award, ShieldAlert, CheckCircle2, TrendingUp, Info, Download, MessageSquare, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { Html5Qrcode } from 'html5-qrcode';
import { SchoolLogo } from './SchoolLogo';
import { VoiceSearchButton } from './VoiceSearchButton';

export const ClassRegister: React.FC = () => {
  const { 
    students, 
    payments, 
    currentDate, 
    setCurrentDate,
    recordPayment, 
    recordAbsent,
    recordAdvancePayment,
    recordBackwardPayment,
    bulkRecordPayments,
    currentUser,
    deletePayment,
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
    sendautomatedWhatsApp
  } = useApp();

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
  const [guardianSmsStudent, setGuardianSmsStudent] = useState<Student | null>(null);
  const [successSms, setSuccessSms] = useState(false);
  const [receiptStudent, setReceiptStudent] = useState<Student | null>(null);
  const [selectedRecordForReceipt, setSelectedRecordForReceipt] = useState<{ student: Student; payment: PaymentRecord } | null>(null);
  const [lastLoggedStudent, setLastLoggedStudent] = useState<Student | null>(null);
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
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [qrFeedbacks, setQrFeedbacks] = useState<{ id: string; text: string; type: 'success' | 'warning' | 'error' }[]>([]);
  const [autoPayScanned, setAutoPayScanned] = useState(true);
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

    const dailyRate = Math.max(0, 5.00 - (student.discount || 0));

    if (autoPayScanned) {
      recordPayment(student.id, true);
      playBeep('success');
      addQrFeedback(`✅ Checked in: "${student.name}" (Class: ${student.class}) • Fee GHC ${dailyRate.toFixed(2)} logged!`, 'success');
      setScanHistoryList(prev => [{
        id: Math.random().toString(),
        studentId: student.id,
        studentName: student.name,
        rollNumber: student.rollNumber,
        class: student.class,
        timestamp: new Date().toLocaleTimeString(),
        statusText: `GHC ${dailyRate.toFixed(2)} logged`,
        success: true
      }, ...prev].slice(0, 8));
    } else {
      playBeep('success');
      addQrFeedback(`🔍 Identified: "${student.name}" (Class: ${student.class}). Ready to record GHC ${dailyRate.toFixed(2)}.`, 'success');
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
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

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

  // Automated debounced save for check-in manual amount fee input
  useEffect(() => {
    if (!manualAmountStudentId) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      return;
    }

    const amt = parseFloat(manualAmountValue);
    if (isNaN(amt) || amt < 0) {
      setSaveStatus('failed');
      return; // Do not auto-save invalid amounts
    }

    // If the input value matches the last saved value, do nothing (keep status as idle / saved)
    if (manualAmountValue === lastSavedValueRef.current) {
      return;
    }

    setSaveStatus('dirty');

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await recordPayment(manualAmountStudentId, true, amt);
        lastSavedValueRef.current = manualAmountValue;
        setSaveStatus('saved');
        const matchingStudent = students.find(s => s.id === manualAmountStudentId);
        const sName = matchingStudent ? matchingStudent.name : 'student';
        showToast(`Auto-saved GHC ${amt.toFixed(2)} payment for ${sName}!`);
        if (matchingStudent) setLastLoggedStudent(matchingStudent);
      } catch (error) {
        console.error('Auto-save payment failed:', error);
        setSaveStatus('failed');
      }
    }, 1000); // 1-second debounce for comfortable user entry speed

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [manualAmountValue, manualAmountStudentId, recordPayment, students]);

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
    students.forEach(student => {
      const state = calculateStudentFinancialState(student, payments, activeTerm, currentDate);
      map.set(student.id, state);
    });
    return map;
  }, [students, payments, activeTerm, currentDate]);

  // Filter students by search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return classStudents;
    return classStudents.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [classStudents, searchQuery]);

  // Find the first unmarked student in the current view to automatically guide high-volume workflow
  const nextUnmarkedStudent = useMemo(() => {
    return filteredStudents.find(s => {
      const pInfo = paidStudentMap.get(s.id);
      const isP = !!pInfo && !pInfo.isAbsent;
      const isA = !!pInfo && !!pInfo.isAbsent;
      return !isP && !isA;
    });
  }, [filteredStudents, paidStudentMap]);

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
      // Standard daily fee is GHC 5 less discount
      const dailyRate = Math.max(0, 5.00 - (s.discount || 0));
      return acc + dailyRate;
    }, 0);
  }, [classStudents]);

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
    
    const dailyRate = Math.max(0.01, 5.00 - (advanceStudent.discount || 0));
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
    
    const dailyRate = Math.max(0.01, 5.00 - (debtStudent.discount || 0));
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
      let feeLabel = 'GHC 5.00';
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
        feeLabel = `GHC ${pRecord.amount.toFixed(2)}`;
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
    if (!debtStudent || debtAmount < 5) return;
    
    const isTodayUnpaid = !paidStudentMap.has(debtStudent.id);
    const shouldRecordToday = includeTodayInDebtSettle && isTodayUnpaid;
    const discountAmount = debtStudent.discount || 0;
    const todayFee = Math.max(0, 5.00 - discountAmount);

    // Calculate total physical cash collected in a single integrated payment operation
    const totalAmountToRecord = debtAmount + (shouldRecordToday ? todayFee : 0);
    
    // Single consolidated payment call prevents asynchronous React state update race conditions
    recordPayment(debtStudent.id, true, totalAmountToRecord);

    setDebtSuccess(true);
    
    if (shouldRecordToday) {
      showToast(`Settled GHC ${debtAmount.toFixed(2)} arrears and logged GHC ${todayFee.toFixed(2)} today's fee for ${debtStudent.name} (Total GHC ${totalAmountToRecord.toFixed(2)})!`);
    } else {
      showToast(`Successfully registered GHC ${debtAmount.toFixed(2)} arrears clearance payment for ${debtStudent.name}!`);
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
        if (!window.confirm(`Warning: ${studentName}'s attendance today is covered by an ADVANCE PAYMENT (GHC 0.00 cash today). Deactivating this will remove their prepaid clearance for today and place them in DEBT. Are you sure you want to deactivate today's prepaid status?`)) {
          return;
        }
      }
      // Already paid: toggle it off (remove payment record)
      deletePayment(paidInfo.paymentId);
      showToast(`Removed today's payment record for ${studentName}.`);
    } else {
      // Unmarked, or marked as absent: record standard GHC 5 payment
      recordPayment(studentId, true);
      const discountAmount = student?.discount || 0;
      const actualAmount = Math.max(0, 5.00 - discountAmount);
      showToast(`Successfully logged GHC ${actualAmount.toFixed(2)} payment for ${studentName}!`);
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
    type: 'profile' | 'invoice' | 'receipt',
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
    }

    if (!messageText) return;

    // Use Web Share API if available (e.g. on mobile browsers, outside sandbox iframes)
    let sharedViaApi = false;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: type === 'profile' ? 'School Pupil Profile' : type === 'invoice' ? 'Fee Invoice Statement' : 'Official Payment Receipt',
          text: messageText
        });
        sharedViaApi = true;
        showToast("Successfully shared details!");
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.log("Web Share API could not complete. Using fallback:", err);
      }
    }

    // Direct Web/App pre-filled URL as fallback
    if (!sharedViaApi) {
      let targetPhone = phone.replace(/\D/g, "");
      if (targetPhone.startsWith("0") && targetPhone.length === 10) {
        targetPhone = "233" + targetPhone.substring(1);
      }
      
      const urlText = encodeURIComponent(messageText);
      const waUrl = targetPhone 
        ? `https://api.whatsapp.com/send?phone=${targetPhone}&text=${urlText}`
        : `https://api.whatsapp.com/send?text=${urlText}`;

      if (typeof window !== 'undefined') {
        window.open(waUrl, '_blank', 'noopener,noreferrer');
        showToast("Pre-filled WhatsApp opened. Please complete the delivery!");
      }
    }

    // Always trigger background logging so that it registers in the system audits
    try {
      if (typeof useApp !== 'undefined') {
        await sendautomatedWhatsApp(
          phone || 'N/A',
          messageText,
          studentId,
          studentName,
          type
        );
      }
    } catch (err) {
      console.error("Failed to automatically log dispatch connection:", err);
    }
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
        <div className="p-6 bg-neutral-950 border-b-2 border-neutral-800 flex flex-col xl:flex-row justify-between items-center gap-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full xl:max-w-4xl">
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
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 border border-neutral-800 bg-neutral-950 font-mono text-[9px] text-neutral-500 rounded-xs leading-none pointer-events-none uppercase font-bold tracking-wider select-none">
                  Ctrl+K
                </kbd>
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 border border-neutral-800 bg-neutral-950 font-mono text-[9px] text-amber-500/80 rounded-xs leading-none pointer-events-none uppercase font-bold tracking-wider select-none" title="Press Enter to toggle payment for the next student up">
                  ↵ Enter
                </kbd>
              </div>
            </div>
            
            {/* Keyboard shortcut info indicator reminder */}
            <div 
              className="hidden md:flex items-center justify-center text-neutral-550 hover:text-amber-400 border border-neutral-800 bg-neutral-900 hover:border-amber-400 transition-all cursor-help h-[42px] w-10 shrink-0 select-none"
              title="Keyboard Shortcut Reminder: Press 'Ctrl+K' (or 'Cmd+K' on macOS) from anywhere at any time to focus the search box instantly"
            >
              <Info size={14} className="stroke-[2.5]" />
            </div>
            <button
              id="qr-scanner-trigger"
              onClick={() => setIsQrModalOpen(true)}
              className="bg-amber-400 hover:bg-amber-300 text-black py-3 px-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border-2 border-amber-400 transition-colors cursor-pointer shrink-0"
              title="Open QR scanner camera station"
            >
              <QrCode size={14} className="stroke-[3]" />
              <span>Camera Scan</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
            {classStudents.length > 0 && (
              <div className="flex flex-col gap-1.5 w-full sm:w-48 bg-neutral-900 border border-neutral-800 p-2">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider font-mono text-neutral-400">
                  <span>Paid: {paidCount}/{classStudents.length}</span>
                  <span className="text-amber-400">{Math.round((paidCount / classStudents.length) * 100)}%</span>
                </div>
                <div className="w-full bg-neutral-950 h-2 overflow-hidden border border-neutral-850">
                  <div 
                    className="bg-amber-400 h-full transition-all duration-300"
                    style={{ width: `${(paidCount / classStudents.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleMarkAllPaid}
              disabled={outstandingCount === 0 || isHoliday}
              className="w-full sm:w-auto text-[10px] font-black bg-white hover:bg-amber-400 text-black py-3 px-5 transition-colors flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <CheckSquare size={14} /> BULK MARK PAID (GHC 5.00)
            </button>
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

              const isNextToPay = nextUnmarkedStudent && nextUnmarkedStudent.id === student.id;

              return (
                <div 
                  key={student.id} 
                  id={`student-row-${student.id}`}
                  className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 transition-all gap-4 scroll-mt-24 ${
                    isNextToPay 
                      ? 'border-l-4 border-l-amber-400 bg-amber-400/[0.04] ring-2 ring-amber-450/25 shadow-[0_0_15px_rgba(251,191,36,0.08)] scale-[1.002] z-10' 
                      : hasArrearsAtRisk 
                        ? 'border-l-4 border-l-red-500 bg-red-950/[0.015] opacity-80 hover:opacity-100' 
                        : isPaid 
                          ? 'bg-amber-400/[0.02]' 
                          : isAbsent 
                            ? 'bg-red-500/[0.02]' 
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
                        const displayStatus = isPrepaid ? 'PREPAID COVERED' : isScholarship ? 'SCHOLARSHIP' : 'PAID';
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

                    {/* Generate Receipt Button */}
                    <button
                      onClick={() => setReceiptStudent(student)}
                      title={isPaid ? "Generate and Print Daily Payment Confirmation Receipt" : "Generate Receipt (No active payment record found)"}
                      className={`p-2.5 transition-all cursor-pointer flex items-center justify-center border-2 ${
                        isPaid 
                          ? 'text-amber-400 border-amber-400/50 hover:border-amber-400 bg-amber-400/10' 
                          : 'text-neutral-500 border-neutral-800 hover:border-neutral-700 hover:text-neutral-300 bg-neutral-950'
                      }`}
                    >
                      <Printer size={16} />
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
                              recordPayment(student.id, true, amt);
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
                            recordPayment(student.id, true, amt);
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
                              ? isPrepaid
                                ? 'bg-sky-500/10 text-sky-400 border-sky-500 hover:border-sky-400 hover:bg-sky-500/20 shadow-none'
                                : isScholarship
                                  ? 'bg-purple-500/10 text-purple-400 border-purple-500 hover:border-purple-400 hover:bg-purple-500/20 shadow-none'
                                  : isArrearsCleared
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500 hover:border-emerald-400 hover:bg-emerald-500/20 shadow-none'
                                    : 'bg-amber-400 text-black border-amber-400 shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)]'
                              : 'bg-neutral-950 text-neutral-455 border-neutral-800 hover:border-neutral-600 hover:text-white'
                          }`}
                        >
                          {isPaid ? (
                            <>
                              <Check size={14} className="stroke-[3]" />
                              {isPrepaid ? (
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
                              <span className="text-amber-400 font-black">•</span> COLLECT GHC {(5.00 - (student.discount || 0)).toFixed(2)}
                            </>
                          )}
                        </button>

                        {/* Dynamic Fee Select Dropdown */}
                        <div className="relative">
                          <select
                            onChange={(e) => {
                              const action = e.target.value;
                              if (!action) return;
                              if (action === 'discounted') {
                                recordPayment(student.id, true);
                                const discountAmount = student.discount || 0;
                                const actualAmount = Math.max(0, 5.00 - discountAmount);
                                showToast(`Logged GHC ${actualAmount.toFixed(2)} payment for ${student.name}.`);
                                scrollToNextUnpaid(student.id);
                              } else if (action === 'ghc5') {
                                recordPayment(student.id, true, 5.00);
                                showToast(`Logged full GHC 5.00 payment for ${student.name} (discount ignored).`);
                                scrollToNextUnpaid(student.id);
                              } else if (action === 'ghc4') {
                                recordPayment(student.id, true, 4.00);
                                showToast(`Logged custom GHC 4.00 payment for ${student.name}.`);
                                scrollToNextUnpaid(student.id);
                              } else if (action === 'ghc3') {
                                recordPayment(student.id, true, 3.00);
                                showToast(`Logged custom GHC 3.00 payment for ${student.name}.`);
                                scrollToNextUnpaid(student.id);
                              } else if (action === 'ghc2') {
                                recordPayment(student.id, true, 2.00);
                                showToast(`Logged custom GHC 2.00 payment for ${student.name}.`);
                                scrollToNextUnpaid(student.id);
                              } else if (action === 'free') {
                                recordPayment(student.id, true, 0.00);
                                showToast(`Logged GHC 0.00 Scholarship for ${student.name}.`);
                                scrollToNextUnpaid(student.id);
                              } else if (action === 'manual') {
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
              </div>

              {/* Toggle configuration panel */}
              <div className="bg-neutral-950 p-4 border border-neutral-850 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase font-black text-white tracking-widest block">Auto-Log Daily Fee</span>
                  <span className="text-[9px] font-mono uppercase font-bold text-neutral-500 block">Record GHC 5.00 dynamically on scan detection</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoPayScanned(!autoPayScanned)}
                  className={`px-3 py-1.5 font-mono text-[9px] font-black uppercase tracking-widest border transition-all ${
                    autoPayScanned 
                      ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500' 
                      : 'bg-neutral-950 text-neutral-500 border-neutral-800 hover:text-white'
                  }`}
                >
                  {autoPayScanned ? "Enabled" : "Disabled (View Only)"}
                </button>
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
                                  Clearance for {currentDate} has already been registered in the system ledger. Gate payment is locked to prevent duplicate entry records.
                                </p>
                              </div>
                            </div>
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
                              className="w-full sm:w-auto bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-300 hover:text-white px-3 py-2 text-[10px] font-black font-mono uppercase tracking-wider transition-colors shrink-0 cursor-pointer"
                            >
                              DELETE ENTRY
                            </button>
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
                                    <path d="M 12 70 C 12 40, 24 15, 50 15 C 76 15, 88 35, 88 55 C 88 75, 70 85, 50 85 C 30 85, 20 70, 25 55 C 30 40, 45 40, 50 45 C 55 50, 52 65, 45 65 C 38 65, 38 52, 44 48" strokeWidth="6" />
                                    <path d="M 12 70 C 12 40, 24 15, 50 15 C 76 15, 88 35, 88 55" stroke="#f0fdf4" strokeWidth="1.5" />
                                    <circle cx="44" cy="48" r="4.5" fill="#14532d" stroke="none" />
                                    <circle cx="43" cy="47" r="1" fill="#f0fdf4" stroke="none" />
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
                                <path d="M 12 70 C 12 40, 24 15, 50 15 C 76 15, 88 35, 88 55 C 88 75, 70 85, 50 85 C 30 85, 20 70, 25 55 C 30 40, 45 40, 50 45 C 55 50, 52 65, 45 65 C 38 65, 38 52, 44 48" strokeWidth="6" />
                                <path d="M 12 70 C 12 40, 24 15, 50 15 C 76 15, 88 35, 88 55" stroke="#f0fdf4" strokeWidth="1.5" />
                                <circle cx="44" cy="48" r="4.5" fill="#14532d" stroke="none" />
                                <circle cx="43" cy="47" r="1" fill="#f0fdf4" stroke="none" />
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
                        className="flex-1 py-3 px-4 bg-amber-400 hover:bg-amber-300 text-black font-black uppercase text-xs tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 border border-amber-500"
                      >
                        <Printer size={15} className="stroke-[2.5]" />
                        <span>Print Hardcopy</span>
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
                    >
                      <Printer size={15} className="stroke-[2.5]" />
                      <span>Print Hardcopy</span>
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
    </div>
  );
};
