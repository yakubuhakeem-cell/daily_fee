/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp, PendingAlert } from '../context/AppContext';
import { StudentClass, Student, SchoolCategory } from '../types';
import { Check, X, Search, Landmark, BellRing, ChevronRight, CheckSquare, Users, MessageSquareCode, CalendarDays, CalendarPlus, Plus, ChevronDown, Trash2, Coins, History, Printer, Camera, Upload, Copy } from 'lucide-react';
import { motion } from 'motion/react';

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
    terms,
    activeTerm,
    addTerm,
    setActiveTerm,
    deleteTerm,
    users,
    updateStudent,
    deleteStudent
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

  // Photo capturing/uploading states
  const [selectedPhotoStudent, setSelectedPhotoStudent] = useState<Student | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

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

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 320, facingMode: 'user' }
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
  const [debtSuccess, setDebtSuccess] = useState(false);

  // Transaction History modal states
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<{ id: string; label: string; studentName: string } | null>(null);

  // Manual payment state for individual student row inline input
  const [manualAmountStudentId, setManualAmountStudentId] = useState<string | null>(null);
  const [manualAmountValue, setManualAmountValue] = useState<string>('');

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
    return students.filter(s => s.class === selectedClass && s.active);
  }, [students, selectedClass]);

  // Today's paid student ids in this class
  const paidStudentMap = useMemo(() => {
    const paidList = payments.filter(p => p.class === selectedClass && p.date === currentDate);
    const map = new Map<string, { paymentId: string; verified: boolean; collectedBy: string; isAbsent?: boolean }>();
    paidList.forEach(p => {
      map.set(p.studentId, { paymentId: p.id, verified: p.verified, collectedBy: p.collectedBy, isAbsent: p.isAbsent });
    });
    return map;
  }, [payments, selectedClass, currentDate]);

  // Map of student debt: unpaid past school days and total GHC arrears
  const studentDebtMap = useMemo(() => {
    const map = new Map<string, { pastUnpaidDays: string[]; totalDebt: number }>();
    if (!activeTerm || !activeTerm.schoolDays) return map;

    const pastSchoolDays = activeTerm.schoolDays.filter(d => d < currentDate);

    students.forEach(student => {
      const unpaidDays = pastSchoolDays.filter(dStr => {
        return !payments.some(p => p.studentId === student.id && p.date === dStr && !p.isAbsent);
      });
      const totalDebt = unpaidDays.length * 5;
      map.set(student.id, { pastUnpaidDays: unpaidDays, totalDebt });
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

  // Summaries
  const paidCount = useMemo(() => {
    return classStudents.filter(s => paidStudentMap.has(s.id) && !paidStudentMap.get(s.id)!.isAbsent).length;
  }, [classStudents, paidStudentMap]);

  const absentCount = useMemo(() => {
    return classStudents.filter(s => paidStudentMap.has(s.id) && !!paidStudentMap.get(s.id)!.isAbsent).length;
  }, [classStudents, paidStudentMap]);

  const outstandingCount = Math.max(0, classStudents.length - paidCount - absentCount);

  const collectionTotal = useMemo(() => {
    return payments
      .filter(p => p.class === selectedClass && p.date === currentDate && !p.isAbsent)
      .reduce((acc, p) => acc + p.amount, 0);
  }, [payments, selectedClass, currentDate]);

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
    
    const daysToCover = Math.floor(advanceAmount / 5);
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
    
    const daysToCover = Math.floor(debtAmount / 5);
    if (daysToCover <= 0) return [];

    const debtInfo = studentDebtMap.get(debtStudent.id);
    if (!debtInfo) return [];

    return debtInfo.pastUnpaidDays.slice(0, daysToCover);
  }, [debtStudent, debtAmount, studentDebtMap, activeTerm]);

  // Memoized transaction list for history student
  const studentPayments = useMemo(() => {
    if (!historyStudent) return [];
    return payments
      .filter(p => p.studentId === historyStudent.id)
      .sort((a, b) => {
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

  const getPaidCountForDate = (dayStr: string) => {
    return payments.filter(p => p.class === selectedClass && p.date === dayStr).length;
  };

  const handleCreateTermSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTermName.trim()) return;
    addTerm(newTermName.trim(), newTermStartDate, newTermDays, newTermIsActive);
    setNewTermName('');
    setNewTermIsActive(true);
    setShowTermCreator(false);
  };

  const handleRecordAdvanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!advanceStudent || advanceAmount < 5) return;
    
    recordAdvancePayment(advanceStudent.id, advanceAmount, true);
    setAdvanceSuccess(true);
    showToast(`Successfully registered GHC ${advanceAmount.toFixed(2)} advance payment for ${advanceStudent.name}!`);
    setTimeout(() => {
      setAdvanceStudent(null);
      setAdvanceSuccess(false);
    }, 1500);
  };

  const handleRecordDebtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtStudent || debtAmount < 5) return;
    
    recordBackwardPayment(debtStudent.id, debtAmount, true);
    setDebtSuccess(true);
    showToast(`Successfully registered GHC ${debtAmount.toFixed(2)} arrears clearance payment for ${debtStudent.name}!`);
    setTimeout(() => {
      setDebtStudent(null);
      setDebtSuccess(false);
    }, 1500);
  };

  const handleTogglePayment = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    const studentName = student ? student.name : "Student";
    const paidInfo = paidStudentMap.get(studentId);
    if (paidInfo && !paidInfo.isAbsent) {
      // Already paid: toggle it off (remove payment record)
      deletePayment(paidInfo.paymentId);
      showToast(`Removed today's payment record for ${studentName}.`);
    } else {
      // Unmarked, or marked as absent: record standard GHC 5 payment
      recordPayment(studentId, true);
      const discountAmount = student?.discount || 0;
      const actualAmount = Math.max(0, 5.00 - discountAmount);
      showToast(`Successfully logged GHC ${actualAmount.toFixed(2)} payment for ${studentName}!`);
    }
  };

  const handleToggleAbsent = (studentId: string) => {
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
      showToast(`Marked ${studentName} as absent today (treated as debt).`);
    }
  };

  const handleMarkAllPaid = () => {
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

  return (
    <div className="space-y-6 font-sans relative">
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
      <div className="bg-neutral-900 border-4 border-neutral-800 p-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-2">
          <p className="text-xs font-black text-amber-400 uppercase tracking-[0.2em] font-mono">
            Date Location Tracker: {currentDate}
          </p>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tight leading-none">
              Daily Check-In GHC 5.00 Register
            </h2>
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

      {/* TERM SELECTION & DAILY TRACKING CALENDAR */}
      <div className="bg-neutral-900 border-4 border-neutral-800 p-8 space-y-6">
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
          
          <button
            type="button"
            onClick={() => setShowTermCreator(!showTermCreator)}
            className="bg-neutral-950 hover:bg-neutral-850 border-2 border-neutral-800 hover:border-amber-400 text-neutral-300 hover:text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all inline-flex items-center gap-2"
          >
            <CalendarPlus size={14} className="text-amber-400" />
            {showTermCreator ? 'HIDE CREATOR' : 'CREATE NEW SCHOOL TERM'}
          </button>
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
              <Plus size={16} className="text-amber-400" />
              <span className="text-xs font-mono font-black uppercase tracking-wider text-white">Create New Schooling Term Schedule</span>
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
                GENERATE SCHEDULE
              </button>
            </div>
          </motion.form>
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
                      const paidCount = getPaidCountForDate(dayStr);
                      const classTotal = classStudents.length;
                      
                      // Decide color palette based on completion
                      let cardStyle = "bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-neutral-400";
                      let dotStyle = "bg-neutral-600";
                      if (isActive) {
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
                            <span className="text-[10px] font-black font-mono leading-none">
                              {paidCount}/{classTotal}
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
      <div className="bg-neutral-900 border-4 border-neutral-800 p-8 space-y-5">
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
      <div className="bg-neutral-900 border-4 border-neutral-800 overflow-hidden">
        {/* Table Header Filter tools */}
        <div className="p-6 bg-neutral-950 border-b-2 border-neutral-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-4 top-3.5 text-neutral-500" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SEARCH STUDENT NAME OR ROLL..."
              className="w-full bg-neutral-900 border-2 border-neutral-800 py-3 pl-11 pr-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-600 tracking-wide"
            />
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
              disabled={outstandingCount === 0}
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
            {/* INFORMATIVE INTERACTIVE PATHWAY BANNER */}
            <div className="bg-neutral-950/40 p-4 border-b border-neutral-800/60 text-[10px] font-mono font-black text-amber-400 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 select-none">
              <span className="flex items-center gap-2 uppercase tracking-wide">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0"></span>
                <span>💡 INFORMATION DESK: CLICK ANY PUPIL'S NAME TO RECONCILE PAST ENTRIES, VIEW TRANSACTION HISTORY & GENERATE OFFICIAL INVOICES.</span>
              </span>
              <span className="text-[9px] bg-amber-400/10 border border-amber-400/25 px-2 py-0.5 text-amber-300 font-mono tracking-widest font-black uppercase shrink-0">INTELLIGENT GATEWAY</span>
            </div>
            {filteredStudents.map(student => {
              const paidInfo = paidStudentMap.get(student.id);
              const isPaid = !!paidInfo && !paidInfo.isAbsent;
              const isAbsent = !!paidInfo && !!paidInfo.isAbsent;
              const debtInfo = studentDebtMap.get(student.id);
              const hasArrearsAtRisk = debtInfo && debtInfo.pastUnpaidDays.length > 5;

              return (
                <div 
                  key={student.id} 
                  className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 transition-all gap-4 ${
                    isPaid ? 'bg-amber-400/[0.02]' : isAbsent ? 'bg-red-500/[0.02]' : 'hover:bg-neutral-800/10'
                  } ${hasArrearsAtRisk ? 'opacity-60 hover:opacity-100 border-l-4 border-l-red-500 bg-red-950/[0.015]' : ''}`}
                >
                  <div className="flex items-center gap-4 w-full sm:w-auto">
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
                      {student.discount !== undefined && student.discount > 0 && (
                        <span className="text-[9px] font-black px-2.5 py-0.5 font-mono tracking-widest uppercase bg-amber-955 border border-amber-600 text-amber-400">
                          {student.discount === 5 ? '100% SCHOLARSHIP' : `DISCOUNT: GHC ${student.discount.toFixed(2)}/DAY`}
                        </span>
                      )}
                      {debtInfo && debtInfo.totalDebt > 0 && (
                        <span 
                          title={hasArrearsAtRisk 
                            ? `CRITICAL ARREARS: Student has ${debtInfo.pastUnpaidDays.length} unpaid school days (exceeds 5 days limit). Standing access at risk.`
                            : `PAST DUE DEBT: Student owes GHC ${debtInfo.totalDebt.toFixed(2)} for ${debtInfo.pastUnpaidDays.length} past days. Click "SETTLE DEBT" or view transactions to handle.`
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
                        const collector = users?.find(u => u.name === paidInfo.collectedBy);
                        const accessLevel = (collector?.assignedClasses && collector.assignedClasses.length > 0) 
                          ? collector.assignedClasses.join(', ') 
                          : (collector?.assignedClass || ((collector?.role === 'Administrator' || collector?.role === 'Headmaster') ? 'ALL CORE' : collector?.role === 'Accountant' ? 'ACCOUNT DECK' : 'OFFICE'));
                        return (
                          <>
                            <span className="hidden sm:inline w-1 h-1 bg-neutral-700" />
                            <span className="flex items-center gap-1.5 text-emerald-400">
                              COLLECTED BY: <strong className="text-emerald-300 uppercase">{paidInfo.collectedBy}</strong>
                              <span className="text-[9px] font-black font-mono bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 px-1.5 py-0.5 tracking-wider uppercase rounded-xs">
                                {accessLevel}
                              </span>
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

                <div className="flex items-center gap-2 mt-4 sm:mt-0 w-full sm:w-auto justify-end">
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

                    {/* Settle Debt button */}
                    {studentDebtMap.get(student.id) && studentDebtMap.get(student.id)!.totalDebt > 0 && (
                      <button
                        onClick={() => {
                          setDebtStudent(student);
                          setDebtAmount(Math.min(studentDebtMap.get(student.id)!.totalDebt, 25)); // default up to 5 days
                          setDebtSuccess(false);
                        }}
                        title="Settle unpaid days backwards"
                        className="p-2.5 text-red-400 hover:text-red-300 hover:border-red-400 border-2 border-red-950 bg-neutral-950 transition-colors cursor-pointer flex items-center gap-1.5 px-4"
                      >
                        <Coins size={14} className="text-red-400" />
                        <span className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-300">SETTLE DEBT</span>
                      </button>
                    )}

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
                              setManualAmountStudentId(null);
                              setManualAmountValue('');
                            } else if (e.key === 'Escape') {
                              setManualAmountStudentId(null);
                              setManualAmountValue('');
                            }
                          }}
                        />
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
                    ) : (
                      <>
                        <button
                          onClick={() => handleTogglePayment(student.id)}
                          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all w-full sm:w-40 justify-center border-2 cursor-pointer ${
                            isPaid 
                              ? 'bg-amber-400 text-black border-amber-400 shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)]'
                              : 'bg-neutral-950 text-neutral-455 border-neutral-800 hover:border-neutral-600 hover:text-white'
                          }`}
                        >
                          {isPaid ? (
                            <>
                              <Check size={14} className="stroke-[3]" /> PAID GHC {(5.00 - (student.discount || 0)).toFixed(2)}
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
                              } else if (action === 'ghc5') {
                                recordPayment(student.id, true, 5.00);
                                showToast(`Logged full GHC 5.00 payment for ${student.name} (discount ignored).`);
                              } else if (action === 'ghc4') {
                                recordPayment(student.id, true, 4.00);
                                showToast(`Logged custom GHC 4.00 payment for ${student.name}.`);
                              } else if (action === 'ghc3') {
                                recordPayment(student.id, true, 3.00);
                                showToast(`Logged custom GHC 3.00 payment for ${student.name}.`);
                              } else if (action === 'ghc2') {
                                recordPayment(student.id, true, 2.00);
                                showToast(`Logged custom GHC 2.00 payment for ${student.name}.`);
                              } else if (action === 'free') {
                                recordPayment(student.id, true, 0.00);
                                showToast(`Logged GHC 0.00 Scholarship for ${student.name}.`);
                              } else if (action === 'manual') {
                                setManualAmountStudentId(student.id);
                                const currentAmt = isPaid && paidInfo ? (payments.find(p => p.id === paidInfo.paymentId)?.amount ?? 5) : Math.max(0, 5 - (student.discount ?? 0));
                                setManualAmountValue(currentAmt.toString());
                              } else if (action === 'absent') {
                                recordAbsent(student.id);
                                showToast(`Marked ${student.name} as absent today (treated as debt).`);
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
                </div>
              );
            })}
          </div>
        )}
      </div>

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
                  <p className="text-neutral-500 font-bold uppercase tracking-wider">Sender Mask: DailyFeeGhana</p>
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
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono font-black text-neutral-500">Quick Standard Presets (GHC 5/day)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: '1 Week (5 Days)', val: 25 },
                    { label: '2 Weeks (10 Days)', val: 50 },
                    { label: '3 Weeks (15 Days)', val: 75 },
                    { label: '4 Weeks (20 Days)', val: 100 }
                  ].map(preset => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setAdvanceAmount(preset.val)}
                      className={`py-2 px-1 text-center font-mono font-black text-[10px] transition-all border-2 ${
                        advanceAmount === preset.val
                          ? 'bg-emerald-500 border-emerald-500 text-black'
                          : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {preset.label}
                      <span className="block text-[11px] mt-0.5 text-inherit">GHC {preset.val}.00</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom amount input field */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase font-mono font-black text-neutral-500">Custom Amount (GHC Cedis)</label>
                  <span className="text-[10px] uppercase font-mono font-black text-emerald-400 font-mono">
                    COVERS {Math.floor(advanceAmount / 5)} DAYS
                  </span>
                </div>
                
                <div className="relative">
                  <span className="absolute left-4 top-2.5 text-xs font-mono font-black text-neutral-500">GHC</span>
                  <input
                    type="number"
                    required
                    min="5"
                    max="1000"
                    step="5"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(parseInt(e.target.value, 10) || 5)}
                    className="w-full bg-neutral-950 border-2 border-neutral-800 py-2.5 pl-14 pr-4 text-xs font-mono font-black text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
                {advanceAmount % 5 !== 0 && (
                  <p className="text-[9px] font-mono text-amber-500 uppercase font-bold">
                    * NOTICE: Amount is rounded down to standard GHC 5.00 daily chunks. Change of GHC {advanceAmount % 5}.00 will be refunded or must be re-entered.
                  </p>
                )}
              </div>

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
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono font-black text-neutral-500">Amount To Pay (GHC 5 per past day)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: 'GHC 5 (1 Day)', val: 5 },
                    { label: 'GHC 10 (2 Days)', val: 10 },
                    { label: 'GHC 25 (5 Days)', val: 25 },
                    { label: 'Clear All Arrears', val: studentDebtMap.get(debtStudent.id)?.totalDebt || 5 }
                  ].map((preset, idx) => {
                    const totalArr = studentDebtMap.get(debtStudent.id)?.totalDebt || 5;
                    // Clamp preset value if it's larger than remaining arrears
                    if (preset.val > totalArr && idx < 3) return null;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setDebtAmount(preset.val)}
                        className={`py-2 px-1 text-center font-mono font-black text-[10px] transition-all border-2 ${
                          debtAmount === preset.val
                            ? 'bg-red-500 border-red-500 text-black'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {preset.label}
                        <span className="block text-[11px] mt-0.5 text-inherit">GHC {preset.val}.00</span>
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
                    COVERS {Math.floor(debtAmount / 5)} ARREARS DAYS
                  </span>
                </div>
                
                <div className="relative">
                  <span className="absolute left-4 top-2.5 text-xs font-mono font-black text-neutral-500">GHC</span>
                  <input
                    type="number"
                    required
                    min="5"
                    max={studentDebtMap.get(debtStudent.id)?.totalDebt || 5}
                    step="5"
                    value={debtAmount}
                    onChange={(e) => setDebtAmount(Math.min(parseInt(e.target.value, 10) || 5, studentDebtMap.get(debtStudent.id)?.totalDebt || 5))}
                    className="w-full bg-neutral-950 border-2 border-neutral-800 py-2.5 pl-14 pr-4 text-xs font-mono font-black text-white focus:outline-none focus:border-red-400"
                  />
                </div>
                {debtAmount % 5 !== 0 && (
                  <p className="text-[9px] font-mono text-amber-500 uppercase font-bold">
                    * NOTICE: Amount is rounded down to standard GHC 5.00 daily chunks.
                  </p>
                )}
              </div>

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
                  disabled={debtCalculatedDays.length === 0 || debtSuccess}
                  className="w-2/3 text-xs bg-red-600 hover:bg-red-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white py-3.5 font-black flex items-center justify-center gap-2 uppercase tracking-widest transition-colors cursor-pointer"
                >
                  {debtSuccess ? (
                    <>
                      <Check size={14} className="stroke-[3]" /> ARREARS PROCESSING SUCCESS!
                    </>
                  ) : (
                    `SETTLE GHC ${debtAmount}.00 OF CORES`
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRANSACTION HISTORY MODAL OVERLAY */}
      {historyStudent && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border-4 border-neutral-800 max-w-2xl w-full p-8 shadow-[8px_8px_0px_0px_#f59e0b] space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b-2 border-neutral-800">
              <div className="flex items-center gap-3">
                <History size={20} className="text-amber-400 animate-none" />
                <h3 className="text-sm font-black uppercase tracking-widest text-white">Student Transaction Ledger</h3>
              </div>
              <button
                type="button"
                onClick={() => setHistoryStudent(null)}
                className="text-neutral-500 hover:text-white transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Profile Summary Header */}
            <div className="bg-neutral-950 p-4 border border-neutral-850 space-y-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2 flex-grow">
                <p className="text-[10px] uppercase font-mono font-black text-neutral-500">Student Profile</p>
                <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                  <span className="text-base font-black text-white uppercase">{historyStudent.name}</span>
                  <span className="font-mono text-xs text-amber-400 whitespace-nowrap">ROLL: {historyStudent.rollNumber} • {historyStudent.class} • {historyStudent.category}</span>
                </div>
                <p className="text-[10px] text-neutral-400 font-bold">
                  GUARDIAN PHONE: <span className="font-mono text-neutral-300">{historyStudent.guardianPhone}</span>
                </p>
                
                {/* Real-time calculated status badge based on the active term schedule */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {histArrears > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-mono font-black uppercase tracking-widest bg-red-950/80 text-red-400 border border-red-900 rounded-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      ARREARS DETECTED: GHC {histArrears.toFixed(2)}
                    </span>
                  ) : histSchoolOwes > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-mono font-black uppercase tracking-widest bg-blue-950/80 text-blue-400 border border-blue-900 rounded-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      PREPAID BALANCE: GHC {histSchoolOwes.toFixed(2)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-mono font-black uppercase tracking-widest bg-emerald-950/80 text-emerald-400 border border-emerald-900 rounded-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      SETTLED / IN GOOD STANDING
                    </span>
                  )}
                </div>
              </div>
              {!paidStudentMap.has(historyStudent.id) && (() => {
                const discountAmount = historyStudent.discount || 0;
                const payAmount = Math.max(0, 5.00 - discountAmount);
                return (
                  <button
                    type="button"
                    onClick={() => {
                      recordPayment(historyStudent.id, true);
                      showToast(`Successfully logged GHC ${payAmount.toFixed(2)} payment for ${historyStudent.name}!`);
                    }}
                    className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2.5 text-[10px] font-mono font-black uppercase tracking-widest transition-all shrink-0 flex items-center justify-center gap-2 border-2 border-emerald-600 hover:border-emerald-400 hover:scale-[1.02] active:scale-[0.98] shadow-[4px_4px_0px_0px_rgba(16,185,129,0.2)] cursor-pointer"
                    title={`Quick Record Today's GHC ${payAmount.toFixed(2)} Payment`}
                  >
                    <Coins size={14} className="stroke-[2.5]" />
                    <span>PAY TODAY (GHC {payAmount.toFixed(2)})</span>
                  </button>
                );
              })()}
            </div>

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
                  GHC {(studentDebtMap.get(historyStudent.id)?.totalDebt || 0).toFixed(2)}
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
                    className="w-full sm:w-auto bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-300 hover:text-white px-3 py-2 text-[10px] font-black font-mono uppercase tracking-wider transition-colors shrink-0"
                  >
                    DELETE ENTRY
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-red-400/5 border-2 border-red-500/10 p-3.5">
                  <div className="flex items-start gap-3 flex-1">
                    <X className="text-red-500 stroke-[3] mt-0.5 shrink-0" size={18} />
                    <div>
                      <p className="text-xs font-black text-red-400 uppercase tracking-wide">CLEARANCE OUTSTANDING</p>
                      <p className="text-[10px] text-neutral-400 font-bold uppercase mt-0.5">
                        No check-in record has been registered for {currentDate}. A secure Gate Ingress Receipt can be generated safely here.
                      </p>
                    </div>
                  </div>
                  {(() => {
                    const discountAmount = historyStudent.discount || 0;
                    const payAmount = Math.max(0, 5.00 - discountAmount);
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          recordPayment(historyStudent.id, true);
                          showToast(`Successfully logged GHC ${payAmount.toFixed(2)} payment for ${historyStudent.name}!`);
                        }}
                        className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors shrink-0"
                      >
                        RECORD GHC {payAmount.toFixed(2)} PAYMENT
                      </button>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* List of recent payments */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 font-mono">
                Recent Transaction History Logs
              </h4>

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
                          <p className="text-[9px] text-neutral-500 font-bold">Ref: {p.id} • Auditor: {p.collectedBy}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-emerald-950/50 text-emerald-400 border border-emerald-900/40 font-sans tracking-widest">
                            VERIFIED
                          </span>
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

            {/* Footer Buttons */}
            {(() => {
              const arrearsInfo = studentDebtMap.get(historyStudent.id);
              const unpaidDaysList = arrearsInfo?.pastUnpaidDays || [];
              const totalPaidAccumulated = payments
                .filter(p => p.studentId === historyStudent.id && p.verified)
                .reduce((sum, p) => sum + p.amount, 0);
              
              return (
                <>
                  {/* STYLESHEET OVERRIDES FOR INDIVIDUAL PRINTER SYSTEM */}
                  <style dangerouslySetInnerHTML={{ __html: `
                    @media print {
                      /* Hide standard app UI */
                      body * {
                        visibility: hidden !important;
                        background: none !important;
                        color: #000 !important;
                        box-shadow: none !important;
                      }
                      /* Show ONLY the single printable invoice container */
                      #print-single-invoice-area, #print-single-invoice-area * {
                        visibility: visible !important;
                      }
                      #print-single-invoice-area {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 10mm !important;
                        background: white !important;
                        display: block !important;
                      }
                      .no-print {
                        display: none !important;
                      }
                    }
                  `}} />

                  {/* PRINTER FRIENDLY PORTRAIT SINGLE INVOICE SHEET (HIDDEN ON SCREEN, VISIBLE ON PRINT) */}
                  <div id="print-single-invoice-area" className="hidden print:block bg-white text-black p-10 max-w-[210mm] mx-auto text-sans leading-relaxed">
                    <div className="space-y-6">
                      
                      {/* School Letterhead */}
                      <div className="border-b-4 border-black pb-4 flex justify-between items-start">
                        <div className="space-y-1">
                          <span className="text-[11px] font-black uppercase tracking-wider text-black bg-neutral-200 px-2.5 py-1 font-mono">
                            SAAKO HOLY CHILD ACADEMY
                          </span>
                          <h2 className="text-xl font-black uppercase tracking-tight leading-none mt-2 font-sans">OFFICIAL STUDENT FEE STATEMENT</h2>
                          <p className="text-[9px] text-neutral-600 font-black uppercase tracking-widest font-mono">
                            GATE INGRESS COLLECTION LEDGER • DIGITAL SECURITY DELEGATE
                          </p>
                        </div>
                        
                        <div className="text-right space-y-1 font-mono">
                          <span className="text-[11px] font-black uppercase px-3 py-1 bg-black text-white inline-block">
                            FEE RECEIPT DOCKET
                          </span>
                          <div className="text-[8.5px] text-neutral-600 uppercase font-black mt-2">
                            STATEMENT REF: SHC-ST-{currentDate.replace(/-/g, '')}-{historyStudent.id.substring(0,6).toUpperCase()}
                          </div>
                        </div>
                      </div>

                      {/* Profile Grid */}
                      <div className="grid grid-cols-3 gap-6 text-[11px] leading-relaxed border-b border-neutral-300 pb-5">
                        <div className="font-sans">
                          <span className="text-[8.5px] font-black uppercase text-neutral-500 block">STUDENT BENEFICIARY</span>
                          <div className="text-xs font-black text-black uppercase">{historyStudent.name}</div>
                          <div className="font-mono mt-0.5 text-neutral-700 font-bold">Roll / ID: {historyStudent.rollNumber || 'SHC-' + historyStudent.id.substring(0, 5).toUpperCase()}</div>
                          <div className="font-bold mt-0.5">Cohort Group: {historyStudent.class} ({historyStudent.category})</div>
                        </div>

                        <div className="border-l pl-6 border-neutral-200 font-mono">
                          <span className="text-[8.5px] font-black uppercase text-neutral-500 block font-sans">FINANCIAL BALANCES</span>
                          <div className="flex justify-between mt-1 font-bold">
                            <span className="text-neutral-500 uppercase text-[9px] font-sans">Total Deposited:</span>
                            <span className="text-emerald-700 font-black">GHC {totalPaidAccumulated.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between mt-0.5 font-bold">
                            <span className="text-neutral-500 uppercase text-[9px] font-sans">Total Arrears (Debt):</span>
                            <span className="text-red-700 font-black">GHC {histArrears.toFixed(2)} {histArrears > 0 ? `(${unpaidDaysList.length} days)` : ''}</span>
                          </div>
                          <div className="flex justify-between mt-0.5 font-bold">
                            <span className="text-neutral-500 uppercase text-[9px] font-sans">Prepaid Balance:</span>
                            <span className="text-blue-700 font-black">GHC {histSchoolOwes.toFixed(2)}</span>
                          </div>
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

                      {/* Main section: Two columns check */}
                      <div className="grid grid-cols-2 gap-8 pt-2">
                        {/* Verified gate deposits */}
                        <div className="space-y-3 font-sans">
                          <span className="text-[9px] font-black uppercase tracking-wider text-black font-mono border-b border-black pb-1.5 block">
                            ✔️ CHRONOLOGICAL FEES CLEARED ({studentPayments.length} DAYS)
                          </span>
                          {studentPayments.length === 0 ? (
                            <p className="text-[10px] text-neutral-500 font-medium italic">No payment logs found on standard checkout ledger.</p>
                          ) : (
                            <table className="w-full text-[9.5px]">
                              <thead>
                                <tr className="border-b border-neutral-300 text-left uppercase text-neutral-500 font-bold font-mono">
                                  <th className="py-1">DATE</th>
                                  <th className="py-1">REF CODE</th>
                                  <th className="py-1 text-right">FEES</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-neutral-100">
                                {studentPayments.slice(0, 15).map(record => (
                                  <tr key={record.id} className="text-neutral-800">
                                    <td className="py-1.5 font-mono text-black font-semibold">{record.date}</td>
                                    <td className="py-1.5 font-mono text-[8.5px] text-neutral-600 uppercase">{record.id.substring(0, 12)}...</td>
                                    <td className="py-1.5 text-right font-mono font-bold text-black">GHC {record.amount.toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                          {studentPayments.length > 15 && (
                            <p className="text-[8px] font-mono text-neutral-500 text-center italic mt-1 font-sans">
                              * Showing latest 15 transactions. Total {studentPayments.length} payments recorded across active term.
                            </p>
                          )}
                        </div>

                        {/* Arrears / Missing Fees Days List */}
                        <div className="space-y-3 border-l pl-8 border-neutral-200">
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
                                The following scheduled school days have missing fee check-ins. Daily rate of <strong>GHC 5.00</strong> applies per school day.
                              </p>
                              <table className="w-full text-[9.5px]">
                                <thead>
                                  <tr className="border-b border-neutral-300 text-left uppercase text-neutral-505 font-bold font-mono">
                                    <th className="py-1">ARREARS DATE</th>
                                    <th className="py-1">DAILY FEE</th>
                                    <th className="py-1 text-right font-normal">BALANCE DUE</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100 font-mono">
                                  {unpaidDaysList.slice(0, 12).map((day, idx) => {
                                    const cumulativeDues = (idx + 1) * 5;
                                    return (
                                      <tr key={day} className="text-red-700 font-medium">
                                        <td className="py-1.5 font-mono">{day}</td>
                                        <td className="py-1.5 font-mono">GHC 5.00</td>
                                        <td className="py-1.5 text-right font-bold">GHC {cumulativeDues.toFixed(2)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                              {unpaidDaysList.length > 12 && (
                                <p className="text-[8px] font-mono text-red-500 text-center italic mt-1 font-sans">
                                  * Showing first 12 arrears dates. Total {unpaidDaysList.length} outstanding days.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Signature Section */}
                      <div className="mt-14 pt-4 border-t border-neutral-300 space-y-6">
                        <div className="grid grid-cols-2 gap-8 items-end">
                          <div className="space-y-2 bg-neutral-50 p-3.5 border border-neutral-200 rounded-xs font-sans">
                            <span className="text-[8px] font-black uppercase text-neutral-600 font-mono block">VERIFICATION STATEMENT</span>
                            <p className="text-[8px] text-neutral-550 leading-normal font-sans font-medium">
                              Official statement of Saako Holy Child Academy daily gate receipt collections. Verified against local database nodes under the Ghana Education Trust. Please retain this physical docket for credentials validation.
                            </p>
                          </div>

                          <div className="text-right space-y-4 font-sans">
                            <div className="inline-block border-b-2 border-black w-48 h-10"></div>
                            <div className="text-[8.5px] font-black uppercase text-neutral-700 tracking-wider">
                              Mrs. Grace Appiah (Headmistress)
                              <span className="text-[8px] text-neutral-500 font-mono font-bold block mt-0.5 font-sans">SAAKO HOLY CHILD ACADEMY CHECKPOINT</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-center text-[8px] font-mono text-neutral-400 font-bold uppercase tracking-widest pt-4 border-t border-neutral-100">
                          Ghana Education Trust • Audited Statement System Release V1.4
                        </div>
                      </div>

                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          window.print();
                        }
                      }}
                      className="flex items-center justify-center gap-2 px-5 py-3 bg-amber-400 hover:bg-amber-300 hover:scale-[1.01] active:scale-[0.99] transition-all text-black font-mono text-xs font-black uppercase tracking-widest cursor-pointer"
                    >
                      <Printer size={15} className="stroke-[2.5]" />
                      <span>EXPORT STATEMENT (PDF)</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setHistoryStudent(null)}
                      className="px-6 py-3 bg-neutral-950 border-2 border-neutral-800 hover:border-neutral-600 font-mono text-xs font-black uppercase tracking-widest text-neutral-450 hover:text-white transition-all cursor-pointer"
                    >
                      CLOSE LEDGER
                    </button>
                  </div>
                </>
              );
            })()}
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
                      className="w-full h-full object-cover scale-x-[-1]" 
                    />
                    <div className="absolute top-2 left-2 bg-red-650 text-white font-mono text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-xs animate-pulse">
                      ● Camera Active
                    </div>
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
    </div>
  );
};
