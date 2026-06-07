/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { StudentClass, Student, UserRole } from '../types';
import { Plus, UserPlus, Trash2, Edit2, ShieldAlert, Check, X, ToggleLeft, ToggleRight, Database, Server, RefreshCw, Copy, Share2, Users, BellRing, MessageSquareCode, UserCheck, Camera, Upload, Search } from 'lucide-react';
import { getClassCategory } from '../initialData';

export const AdminPanel: React.FC = () => {
  const { 
    students, 
    users, 
    addStudent, 
    updateStudent, 
    deleteStudent, 
    toggleMfaForUser,
    registerStaff,
    updateStaff,
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
    currentDate,
    activeTerm,
    payments,
    resetData,
    purgeDeactivatedStudents,
    backups,
    createBackup,
    restoreBackup,
    deleteBackup,
    clearAllBackups,
    nextBackupTimeLeft
  } = useApp();

  const [activeTab, setActiveTab] = useState<'students' | 'mfa' | 'gates' | 'database'>('students');
  const [studentFilter, setStudentFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLedgerSwitchModal, setShowLedgerSwitchModal] = useState(false);
  const [isSyncingTransition, setIsSyncingTransition] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [backupLabel, setBackupLabel] = useState('');
  const [showRestoreConfirmId, setShowRestoreConfirmId] = useState<string | null>(null);
  const [showBackupPurgeConfirm, setShowBackupPurgeConfirm] = useState(false);

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
      list = list.filter(st => 
        st.name.toLowerCase().includes(query) || 
        st.id.toLowerCase().includes(query)
      );
    }
    return list;
  }, [students, studentFilter, searchQuery]);

  // State for SMS Modal
  const [smsTarget, setSmsTarget] = useState<{
    student: Student;
    consecutiveDays: number;
    unpaidDates: string[];
  } | null>(null);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsSuccess, setSmsSuccess] = useState(false);

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
    return [...activeTerm.schoolDays].filter(d => d <= currentDate).sort();
  }, [activeTerm, currentDate]);

  // Find students who have not paid for 3 or more consecutive school days
  const consecutiveUnpaidAlerts = useMemo(() => {
    if (validSchoolDays.length < 3) return [];
    
    return students.filter(s => s.active).map(student => {
      // Find the consecutive unpaid tracks
      let consecutiveUnpaid: string[] = [];
      let maxConsecutiveUnpaid: string[] = [];
      
      for (const day of validSchoolDays) {
        const hasPaid = (payments || []).some(
          p => p.studentId === student.id && p.date === day && p.verified
        );
        
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

  const [showUnassignedDetails, setShowUnassignedDetails] = useState(false);
  const [showMissingDetails, setShowMissingDetails] = useState(false);

  // Add student form state
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentClass, setNewStudentClass] = useState<StudentClass>('B1');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentPhoto, setNewStudentPhoto] = useState<string | null>(null);
  const [newStudentDiscount, setNewStudentDiscount] = useState<number>(0);
  const [editStudentObj, setEditStudentObj] = useState<Student | null>(null);
  
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
  const [editStaffObj, setEditStaffObj] = useState<any | null>(null);

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
      adminRegRole === 'Teacher' ? adminRegClasses : undefined
    );

    if (result.success) {
      setAdminRegName('');
      setAdminRegEmail('');
      setAdminRegMfa(false);
      setAdminRegPasswordEnabled(false);
      setAdminRegPassword('');
      setAdminRegClasses(['B1']);
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
      editStaffObj.role === 'Teacher' ? (editStaffObj.assignedClasses || (editStaffObj.assignedClass ? [editStaffObj.assignedClass] : [])) : undefined
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
          if (isEdit && editStudentObj) {
            setEditStudentObj({
              ...editStudentObj,
              photoUrl: reader.result
            });
          } else {
            setNewStudentPhoto(reader.result);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    addStudent(
      newStudentName.trim(), 
      newStudentClass, 
      newStudentPhone.trim() || undefined, 
      newStudentPhoto || undefined,
      newStudentDiscount
    );
    setNewStudentName('');
    setNewStudentPhone('');
    setNewStudentPhoto(null);
    setNewStudentDiscount(0);
    showToast('Student successfully registered to the daily ledger catalog.');
  };

  const handleResetAddStudentForm = () => {
    setNewStudentName('');
    setNewStudentClass('B1');
    setNewStudentPhone('');
    setNewStudentPhoto(null);
    setNewStudentDiscount(0);
    showToast('Student registration form cleared.');
  };

  const handleStartEdit = (student: Student) => {
    setEditStudentObj({ ...student });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStudentObj || !editStudentObj.name.trim()) return;

    // Recalculate category based on selected class
    const category = getClassCategory(editStudentObj.class);
    updateStudent({
      ...editStudentObj,
      category
    });
    setEditStudentObj(null);
    showToast('Catalog record updated.');
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
            onClick={() => setActiveTab('database')}
            className={`flex-1 md:flex-none px-5 py-2.5 font-black text-[11px] uppercase tracking-widest transition-all gap-2 flex items-center justify-center ${
              activeTab === 'database'
                ? 'bg-amber-400 text-black'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            <Database size={13} />
            Database Connect
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              {/* Card 2: Unassigned Pupils */}
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
              <div className="flex items-center gap-3 border-b-2 border-neutral-800 pb-3">
                <BellRing className="text-red-500 animate-pulse" size={20} />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-red-500 font-mono">
                    Urgent Attendance & Arrears Alerts
                  </h3>
                  <p className="text-[10px] text-neutral-400 uppercase font-mono font-bold tracking-wider mt-0.5">
                    Critical Warning: Pupils with 3+ consecutive unpaid standard school days detected
                  </p>
                </div>
              </div>
              
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add / Edit student card */}
          <div className="bg-neutral-900 border-4 border-neutral-800 p-8 h-fit space-y-6">
            {!editStudentObj ? (
              <form onSubmit={handleAddStudentSubmit} className="space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b-2 border-neutral-800">
                  <UserPlus size={18} className="text-amber-400" />
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Register New Student</h3>
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
                      <div className="flex-1 flex gap-1">
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
            ) : (
              <form onSubmit={handleSaveEdit} className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b-2 border-neutral-800">
                  <div className="flex items-center gap-3">
                    <Edit2 size={18} className="text-amber-400" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Modify Pupil File</h3>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setEditStudentObj(null)}
                    className="text-xs font-black text-neutral-500 hover:text-white uppercase tracking-widest"
                  >
                    Cancel
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
                      value={editStudentObj.name}
                      onChange={(e) => setEditStudentObj({ ...editStudentObj, name: e.target.value })}
                      className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                        Target Class
                      </label>
                      <select
                        value={editStudentObj.class}
                        onChange={(e) => setEditStudentObj({ ...editStudentObj, class: e.target.value as StudentClass })}
                        className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none"
                      >
                        {classes.map(cls => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                        Roll ID (Constant)
                      </label>
                      <div className="bg-neutral-950 border-2 border-neutral-850 py-3 px-4 text-xs text-neutral-400 font-extrabold font-mono uppercase tracking-wider">
                        {editStudentObj.rollNumber}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                      Guardian Phone Number
                    </label>
                    <input
                      type="text"
                      value={editStudentObj.guardianPhone || ''}
                      onChange={(e) => setEditStudentObj({ ...editStudentObj, guardianPhone: e.target.value.replace(/\D/g, '') })}
                      className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                      Daily Check-In Discount (GHC) - Dynamic Group Rate
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.5"
                        value={editStudentObj.discount || 0}
                        onChange={(e) => setEditStudentObj({ ...editStudentObj, discount: Math.max(0, Math.min(5, parseFloat(e.target.value) || 0)) })}
                        className="w-1/2 bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                      />
                      <div className="flex-1 flex gap-1">
                        {[0, 2.50, 5].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setEditStudentObj({ ...editStudentObj, discount: val })}
                            className={`flex-1 text-[9px] font-mono font-black border transition-all ${
                              (editStudentObj.discount || 0) === val
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
                      Standard fee is GHC 5.00. Effective daily rate: <strong className="text-amber-500">GHC {(5.00 - (editStudentObj.discount || 0)).toFixed(2)}</strong>
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                      Student Passport Photo / Picture
                    </label>
                    {editStudentObj.photoUrl ? (
                      <div className="relative w-full aspect-video sm:aspect-[4/3] bg-neutral-950 border-2 border-dashed border-amber-400 p-4 flex flex-col items-center justify-center gap-3">
                        <img 
                          src={editStudentObj.photoUrl} 
                          alt="Student passport preview" 
                          className="w-16 h-16 rounded-full object-cover border-2 border-amber-400"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => setEditStudentObj({ ...editStudentObj, photoUrl: undefined })}
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
                          onChange={(e) => handlePhotoUpload(e, true)} 
                          className="hidden" 
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditStudentObj(null)}
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
            )}
          </div>

          {/* Directory Listings */}
          <div className="bg-neutral-900 border-4 border-neutral-800 col-span-1 lg:col-span-2 overflow-hidden flex flex-col justify-between">
            <div className="p-6 bg-neutral-950 border-b-2 border-neutral-850 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-neutral-400 font-mono uppercase tracking-widest block">Student Directory Catalog ({filteredStudentsForList.length})</span>
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
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
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
            </div>

            {/* Quick Pupil Lookup Bar */}
            <div className="px-6 py-4 bg-neutral-950/60 border-b-2 border-neutral-850 flex items-center gap-3">
              <Search size={14} className="text-neutral-500 shrink-0" />
              <input
                type="text"
                placeholder="Search student by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-xs text-white placeholder-neutral-650 focus:outline-none focus:ring-0 font-mono font-bold uppercase tracking-wider"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-[10px] font-mono font-black text-neutral-400 hover:text-white uppercase transition-all cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="divide-y-2 divide-neutral-850 overflow-y-auto max-h-[480px]">
              {filteredStudentsForList.length === 0 ? (
                <div className="p-12 text-center text-xs font-mono font-black uppercase text-neutral-500 tracking-wider">
                  📂 No students matching filters found or directory is empty.
                </div>
              ) : (
                filteredStudentsForList.map(st => (
                <div key={st.id} className="p-6 flex justify-between items-center hover:bg-neutral-800/10">
                  <div className="flex items-center gap-4">
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
                    
                    <div className="space-y-1.5">
                      <p className={`text-base font-black text-white uppercase tracking-tight ${!st.active ? 'line-through text-neutral-500' : ''}`}>{st.name}</p>
                      <div className="flex gap-2.5 items-center text-[10px] text-neutral-400 font-mono font-bold uppercase tracking-wider">
                        <span className="bg-neutral-955 border border-neutral-800 px-2.5 py-0.5 text-amber-400 font-black">{st.class}</span>
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
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Active toggle */}
                    <button
                      onClick={() => handleToggleStudentActive(st)}
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
                      onClick={() => handleStartEdit(st)}
                      className="p-2 border-2 border-neutral-800 hover:border-neutral-600 bg-neutral-950 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <Edit2 size={13} />
                    </button>

                    {/* Delete trigger */}
                    <button
                      onClick={() => {
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
              )))}
            </div>
          </div>
        </div>
      </div>
      ) : activeTab === 'mfa' ? (
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

                  <div className="space-y-4">
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
                      <div className="mt-1 pl-7">
                        <label className="block text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1 font-mono">
                          Set Account Password
                        </label>
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
                      <div className="mt-1 pl-7">
                        <label className="block text-[9px] font-black text-neutral-450 uppercase tracking-widest mb-1 font-mono">
                          Set Account Password
                        </label>
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
            <div className="space-y-2 pb-3 border-b-2 border-neutral-800">
              <h3 className="text-xl font-black uppercase italic text-white tracking-tight flex items-center gap-3">
                <ShieldAlert size={20} className="text-amber-400" /> Staff Directory, Accounts & Security
              </h3>
              <p className="text-xs text-neutral-400 font-bold leading-relaxed">
                Configure staff user credentials, activate/deactivate portal access, and enforce multi-factor authentication locks.
              </p>
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

                      {u.passwordEnabled && u.password && (
                        <div className="mt-1.5 flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-300 font-mono tracking-wider w-full sm:w-auto">
                          <span>SECURE PASSWORD KEY: <strong className="font-extrabold text-amber-400 select-all font-mono">{u.password}</strong></span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      {/* Edit */}
                      <button
                        onClick={() => setEditStaffObj({ ...u })}
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
      ) : (
        <div className="space-y-6">
          <div className="bg-neutral-900 border-4 border-neutral-800 p-8 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b-2 border-neutral-800 gap-4">
              <div className="flex items-center gap-3">
                <Database size={24} className="text-amber-400" />
                <h3 className="text-xl font-black uppercase text-white tracking-tight">Firebase Firestore Status</h3>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${firebaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                <span className={`text-xs font-black uppercase tracking-widest font-mono ${firebaseConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {firebaseConnected ? 'FIREBASE CLOUD ACTIVE' : 'LOCAL LEDGER OFFLINE-MODE'}
                </span>
              </div>
            </div>

            {/* Ledger Mode Selection Controller */}
            <div className="p-4 bg-neutral-950 border-2 border-neutral-800 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-black uppercase text-white tracking-wider font-mono">Select Database Ledger Mode</h4>
                <p className="text-[11px] text-neutral-400 leading-normal max-w-2xl font-medium">
                  Choose <span className="text-amber-400 font-extrabold">📁 Local Ledger Only</span> to bypass cloud lookups entirely for instantaneous execution and zero network timeouts. Choose <span className="text-emerald-400 font-extrabold">☁️ Firestore Cloud Sync</span> to link with Google Cloud Firestore database.
                </p>
              </div>
              <div className="flex gap-2.5 w-full xl:w-auto">
                <button
                  type="button"
                  id="btn-ledger-local"
                  onClick={() => {
                    setStorageMode('local');
                    showToast('Switched to Standard Local Ledger mode. Blazing-fast and light!');
                  }}
                  className={`flex-1 xl:flex-initial px-4 py-2.5 text-xs font-black uppercase tracking-wider font-mono transition-all border-2 cursor-pointer ${
                    storageMode === 'local'
                      ? 'bg-amber-500 text-black border-amber-500 font-extrabold'
                      : 'bg-transparent text-neutral-400 border-neutral-700 hover:text-white hover:border-neutral-500'
                  }`}
                >
                  📁 Local Ledger Only
                </button>
                <button
                  type="button"
                  id="btn-ledger-cloud"
                  onClick={() => {
                    if (storageMode === 'local') {
                      setShowLedgerSwitchModal(true);
                    } else {
                      setStorageMode('cloud');
                      showToast('Switched to Cloud Database Sync mode.');
                    }
                  }}
                  className={`flex-1 xl:flex-initial px-4 py-2.5 text-xs font-black uppercase tracking-wider font-mono transition-all border-2 cursor-pointer ${
                    storageMode === 'cloud'
                      ? 'bg-emerald-500 text-black border-emerald-500 font-extrabold'
                      : 'bg-transparent text-neutral-400 border-neutral-700 hover:text-white hover:border-neutral-500'
                  }`}
                >
                  ☁️ Firestore Cloud Sync
                </button>
              </div>
            </div>

            {/* Periodic Background Sync Settings */}
            <div className={`p-4 border-2 transition-all ${
              bgSyncEnabled && storageMode === 'cloud'
                ? 'bg-emerald-950/20 border-emerald-900/60'
                : 'bg-neutral-950/50 border-neutral-850'
            } flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-3">
                  <h4 className="text-sm font-black uppercase text-white tracking-wider font-mono flex items-center gap-2">
                    🔄 Periodic Background Sync
                  </h4>
                  {storageMode === 'cloud' && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono leading-none border uppercase tracking-wider font-bold ${
                      bgSyncEnabled
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-900 animate-pulse'
                        : 'bg-neutral-900 text-neutral-500 border-neutral-800'
                    }`}>
                      {bgSyncEnabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed font-semibold">
                  Refresh pupil rosters, student details, and cash check-ins automatically in the background (every 30 seconds) while online. Ensures multi-device changes persist in near-realtime.
                </p>
                
                {bgSyncEnabled && storageMode === 'cloud' && (
                  <div className="flex items-center gap-3 text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500">
                    <span className="flex items-center gap-1.5">
                      Status: 
                      {bgSyncStatus === 'syncing' ? (
                        <span className="text-amber-400 animate-pulse flex items-center gap-1">
                          <span className="inline-block animate-spin">⌛</span> Syncing...
                        </span>
                      ) : bgSyncStatus === 'success' ? (
                        <span className="text-emerald-400">✓ Sync Active & Clean</span>
                      ) : bgSyncStatus === 'error' ? (
                        <span className="text-red-400">✗ Sync Timeout / Error</span>
                      ) : (
                        <span className="text-neutral-400">Idle</span>
                      )}
                    </span>
                    {lastBgSyncTime && (
                      <span className="border-l border-neutral-800 pl-3">
                        Last Active Handshake: <strong className="text-neutral-300">{lastBgSyncTime}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={bgSyncEnabled}
                    onChange={(e) => {
                      if (storageMode !== 'cloud' && e.target.checked) {
                        showToast('Please enable Firestore Cloud Sync first to trigger background syncing.');
                        return;
                      }
                      setBgSyncEnabled(e.target.checked);
                      showToast(
                        e.target.checked
                          ? 'Background sync enabled. The system will sync with Firebase every 30 seconds.'
                          : 'Background sync disabled. Switched back to manual-only synchronization.'
                      );
                    }}
                    disabled={storageMode !== 'cloud'}
                    className="sr-only peer"
                    id="toggle-background-sync"
                  />
                  <div className={`w-11 h-6 bg-neutral-800 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-neutral-400 after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-white peer-disabled:opacity-50 peer-disabled:cursor-not-allowed ${
                    storageMode !== 'cloud' ? 'opacity-40' : ''
                  }`}></div>
                  <span className={`ml-3 text-xs font-black uppercase tracking-wider font-mono ${
                    storageMode !== 'cloud' ? 'text-neutral-600' : 'text-neutral-300'
                  }`}>
                    {bgSyncEnabled && storageMode === 'cloud' ? 'ON' : 'OFF'}
                  </span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-2">
              <div className="lg:col-span-2 space-y-3">
                <p className="text-xs text-neutral-400 leading-relaxed font-bold">
                  FEETRACK is armed with real-time cloud database syncing powered by Google Cloud Firebase Firestore. By default, records are safely cached in local memory and browser storage. Launching Firebase turns this daily school portal into a durable multi-device cloud system!
                </p>
                {firebaseConnected ? (
                  <div className="p-4 bg-emerald-950/20 border-2 border-emerald-900 text-xs text-neutral-300 leading-relaxed font-medium">
                    <p className="text-emerald-400 font-black mb-1 font-mono">🎉 CLOUD SYNC: VERIFIED ACTIVE</p>
                    Your active student enrollments, staff user credentials, daily check-in payments, and staff roles are communicating live with Firestore. No setup or copy/paste is required.
                  </div>
                ) : (
                  <div className="p-4 bg-amber-950/10 border-2 border-amber-900/60 text-xs text-neutral-300 leading-relaxed font-semibold">
                    <p className="text-amber-400 font-extrabold mb-1">📂 OFFLINE-MODE fallback</p>
                    We detected that your Cloud connection is offline. Connect your browser online or re-initialize to regain real-time Firestore database sync.
                    {firebaseError && (
                      <div className="mt-2.5 p-2 bg-black/40 border border-amber-900/50 rounded text-[10px] text-red-400 font-mono select-text break-words leading-normal">
                        <span className="font-extrabold text-amber-500 mr-1">Error trace:</span>
                        {firebaseError}
                      </div>
                    )}
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={async () => {
                          showToast('Re-testing collection links...');
                          await retryFirebaseConnection();
                          showToast('Real-time sync test finalized.');
                        }}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-450 text-black font-black uppercase text-[10px] tracking-wider transition-colors inline-flex items-center gap-1.5 cursor-pointer font-mono"
                      >
                        <RefreshCw size={10} className="animate-spin" style={{ animationDuration: '3s' }} />
                        Retry Sync Detection
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-neutral-950 border-2 border-neutral-850 p-6 flex flex-col justify-between gap-4">
                <span className="text-[10px] font-black tracking-widest uppercase font-mono text-neutral-500">Cloud Seeding Bridge</span>
                <h4 className="text-sm font-black uppercase text-white leading-tight">Bootstrap Local Seeds to Firestore</h4>
                <p className="text-[11px] text-neutral-400 leading-normal font-medium">
                  Push your offline register records, pupil directories, and recorded payment books immediately into your active Cloud Firebase Firestore database.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      showToast('Triggering Firebase firestore sync sequence...');
                      const response = await seedFirebaseFromLocal();
                      showToast(response.message);
                    } catch (err) {
                      const msg = err instanceof Error ? err.message : String(err);
                      console.error('Firebase seeding failed:', err);
                      try {
                        const parsed = JSON.parse(msg);
                        showToast(`Failed: ${parsed.error || 'Check database permissions / rules.'}`);
                      } catch {
                        showToast(`Failed: ${msg.slice(0, 80)}`);
                      }
                    }
                  }}
                  className="w-full py-2.5 text-xs font-black bg-amber-400 hover:bg-amber-350 text-black uppercase tracking-widest cursor-pointer transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw size={14} />
                  Publish To Firestore
                </button>
              </div>
            </div>

            {/* Local Offline Backups & Recovery Hub */}
            <div className="bg-neutral-950 border-2 border-neutral-800 p-6 space-y-5">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-neutral-850 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black tracking-widest uppercase font-mono text-amber-500 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Recurring 30-Minute Task Active
                  </span>
                  <h4 className="text-base font-black uppercase text-white leading-tight font-mono flex items-center gap-2 block">
                    <Database size={18} className="text-amber-400" />
                    Offline Local Backup & Recovery Hub
                  </h4>
                  <p className="text-xs text-neutral-400 leading-relaxed font-semibold">
                    Automated background task captures state snapshots every 30 minutes. Securely guards directories, terms, and billing logs against data loss in Offline mode.
                  </p>
                </div>

                <div className="flex flex-row md:flex-col items-end gap-1.5 bg-neutral-900 border border-neutral-850 px-4 py-2.5 font-mono select-none shrink-0 w-full md:w-auto text-right">
                  <div className="text-[10px] uppercase text-neutral-500 font-bold tracking-wider">Next Auto Backup In</div>
                  <div className="text-lg font-black text-white leading-none">
                    {Math.floor(nextBackupTimeLeft / 60)}m {(nextBackupTimeLeft % 60).toString().padStart(2, '0')}s
                  </div>
                </div>
              </div>

              {/* Create Manual Backup Trigger bar */}
              <div className="bg-neutral-900 border border-neutral-850 p-4 flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                  <input
                    type="text"
                    placeholder="Enter manual backup label (e.g., Before class merge)..."
                    value={backupLabel}
                    onChange={(e) => setBackupLabel(e.target.value)}
                    maxLength={60}
                    className="w-full bg-neutral-950 border-2 border-neutral-800 px-4 py-2 text-xs font-mono font-bold text-white uppercase placeholder-neutral-600 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    createBackup(backupLabel.trim() || undefined, false);
                    setBackupLabel('');
                    showToast('Captured fresh local database snapshot.');
                  }}
                  className="w-full md:w-auto shrink-0 px-5 py-2.5 bg-neutral-850 hover:bg-neutral-800 text-white font-black text-xs uppercase tracking-widest font-mono transition-colors cursor-pointer border-2 border-neutral-750"
                >
                  Create Snapshot
                </button>
              </div>

              {/* Backups List */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black tracking-widest uppercase font-mono text-neutral-500">
                    Stored Snapshots ({backups.length}/10 slots used)
                  </span>
                  {backups.length > 0 && (
                    <div className="shrink-0">
                      {showBackupPurgeConfirm ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono font-bold uppercase text-red-400 animate-pulse">WIPE ALL?</span>
                          <button
                            type="button"
                            onClick={() => setShowBackupPurgeConfirm(false)}
                            className="text-[9px] font-bold uppercase text-neutral-400 hover:text-white underline font-mono cursor-pointer"
                          >
                            CANCEL
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              clearAllBackups();
                              setShowBackupPurgeConfirm(false);
                              showToast('Cleared all local backups.');
                            }}
                            className="text-[9px] font-bold uppercase text-red-500 hover:text-red-400 underline font-mono cursor-pointer"
                          >
                            CONFIRM
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowBackupPurgeConfirm(true)}
                          className="text-[9px] font-bold uppercase text-neutral-500 hover:text-red-400 underline font-mono transition-colors cursor-pointer"
                        >
                          Purge Backup Cache
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {backups.length === 0 ? (
                  <div className="border border-dashed border-neutral-800 p-8 text-center text-neutral-500 space-y-1.5 font-mono select-none">
                    <Database size={24} className="mx-auto text-neutral-700 stroke-[1.5]" />
                    <p className="text-xs uppercase font-extrabold tracking-wider text-neutral-400">No backup records saved</p>
                    <p className="text-[10px] font-medium leading-relaxed max-w-lg mx-auto uppercase">
                      The automated timer will automatically capture database state. Try creating a manual snapshot above to protect changes dynamically.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto space-y-3.5 pr-2 custom-scrollbar">
                    {backups.map(b => (
                      <div key={b.id} className="bg-neutral-900 border border-neutral-850 p-4.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-neutral-700 transition">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-black uppercase text-white truncate max-w-[280px]">
                              {b.label}
                            </span>
                            <span className={`text-[9px] font-black tracking-widest uppercase font-mono px-2 py-0.5 border leading-none shrink-0 ${
                              b.isAuto 
                                ? 'bg-amber-950/20 border-amber-500/20 text-amber-500' 
                                : 'bg-blue-950/20 border-blue-500/20 text-blue-400'
                            }`}>
                              {b.isAuto ? 'AUTO' : 'MANUAL'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[10px] leading-none text-neutral-400 font-semibold uppercase">
                            <span>Students: <strong className="text-white">{b.counts.students}</strong></span>
                            <span className="border-l border-neutral-800 h-2.5"></span>
                            <span>Payments: <strong className="text-white">{b.counts.payments}</strong></span>
                            <span className="border-l border-neutral-800 h-2.5"></span>
                            <span>Terms: <strong className="text-white">{b.counts.terms}</strong></span>
                            <span className="border-l border-neutral-800 h-2.5"></span>
                            <span className="text-neutral-500 font-bold">{b.timestamp}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                          {showRestoreConfirmId === b.id ? (
                            <div className="flex items-center gap-2 font-mono">
                              <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 animate-pulse">ROLLBACK?</span>
                              <button
                                type="button"
                                onClick={() => setShowRestoreConfirmId(null)}
                                className="px-2.5 py-1.5 border border-neutral-800 hover:border-neutral-750 text-[10px] font-black uppercase tracking-wider text-neutral-400 hover:text-white transition cursor-pointer"
                              >
                                CANCEL
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  restoreBackup(b.id);
                                  setShowRestoreConfirmId(null);
                                  showToast(`Restored base state from snapshot: "${b.label}"`);
                                }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white border-2 border-emerald-500 text-[10px] font-black uppercase tracking-wider transition cursor-pointer"
                              >
                                CONFIRM
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setShowRestoreConfirmId(b.id)}
                                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-black text-[10px] uppercase font-mono tracking-widest border border-neutral-700 transition cursor-pointer"
                              >
                                Restore
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  deleteBackup(b.id);
                                  showToast('Selected backup snapshot deleted.');
                                }}
                                className="p-2 text-neutral-500 hover:text-red-400 hover:bg-neutral-800/40 rounded transition cursor-pointer"
                                title="Delete backup"
                              >
                                <X size={14} className="stroke-[3]" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Clear Sample / Start Live Data System Utility */}
            <div className="bg-neutral-950 border-2 border-red-950/60 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative">
              <div className="space-y-1.5 max-w-2xl">
                <span className="text-[10px] font-black tracking-widest uppercase font-mono text-red-500">System Initialization Ledger Tools</span>
                <h4 className="text-base font-black uppercase text-white leading-tight font-mono flex items-center gap-2">
                  <Trash2 size={16} className="text-red-500" />
                  Wipe Simulation / Demo Student Ledger
                </h4>
                <p className="text-xs text-neutral-400 leading-relaxed font-medium">
                  Ready to enroll real pupils and open active school semesters? Permanently delete all sample school registers, student names, classes, and fake historic payment logs. All system accounts (administrator and teacher credentials) remain untouched for secure login.
                </p>
              </div>
              <div className="w-full md:w-auto shrink-0">
                {students.length === 0 ? (
                  <div className="px-5 py-3 border border-emerald-900 bg-emerald-950/15 text-emerald-400 text-xs font-mono font-black uppercase tracking-wider text-center">
                    🟢 Register Cleared & Ready!
                  </div>
                ) : showClearConfirm ? (
                  <div className="space-y-2.5">
                    <p className="text-[10px] uppercase font-mono font-black text-red-400 text-center animate-pulse">⚠️ ARE YOU ABSOLUTELY SURE?</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowClearConfirm(false)}
                        className="py-2.5 px-4 text-xs font-black uppercase text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-700 bg-neutral-900 cursor-pointer"
                      >
                        CANCEL
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          clearSampleStudents();
                          setShowClearConfirm(false);
                          showToast('Sample students database and past transactions cleared successfully.');
                        }}
                        className="py-2.5 px-5 text-xs font-black uppercase bg-red-600 hover:bg-red-500 text-white cursor-pointer transition-colors"
                      >
                        CONFIRM WIPE
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="w-full md:w-auto py-3 px-6 text-xs font-black bg-neutral-905 hover:bg-red-600 hover:text-white text-red-500 border border-red-950 hover:border-red-600 uppercase tracking-widest cursor-pointer transition-all font-mono"
                  >
                    WIPE ALL SAMPLE DATA
                  </button>
                )}
              </div>
            </div>

            {/* Reset App Ledger / Factory Reset System Utility */}
            <div className="bg-neutral-950 border-2 border-amber-950/60 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative">
              <div className="space-y-1.5 max-w-2xl">
                <span className="text-[10px] font-black tracking-widest uppercase font-mono text-amber-500">System Reset Tools</span>
                <h4 className="text-base font-black uppercase text-white leading-tight font-mono flex items-center gap-2">
                  <RefreshCw size={16} className="text-amber-550" />
                  Factory Reset / Rebuild App Ledger
                </h4>
                <p className="text-xs text-neutral-400 leading-relaxed font-semibold">
                  Rebuild the system to system factory seeds. This option completely purges the cache and resets students, staff logins, and daily payments to default starting presets.
                </p>
              </div>
              <div className="w-full md:w-auto shrink-0">
                {showResetConfirm ? (
                  <div className="space-y-2.5">
                    <p className="text-[10px] uppercase font-mono font-black text-amber-400 text-center animate-pulse">⚠️ PURGE & RESTORE DEFAULTS?</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowResetConfirm(false)}
                        className="py-2.5 px-4 text-xs font-black uppercase text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-700 bg-neutral-900 cursor-pointer"
                      >
                        CANCEL
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          resetData();
                          setShowResetConfirm(false);
                          showToast('System rebuilt to factory seeds. Reloading...');
                          setTimeout(() => {
                            window.location.reload();
                          }, 1000);
                        }}
                        className="py-2.5 px-5 text-xs font-black uppercase bg-amber-550 hover:bg-amber-500 text-black cursor-pointer transition-colors"
                      >
                        CONFIRM RESET
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full md:w-auto py-3 px-6 text-xs font-black bg-neutral-905 hover:bg-amber-500 hover:text-black text-amber-500 border border-amber-950 hover:border-amber-500 uppercase tracking-widest cursor-pointer transition-all font-mono"
                  >
                    RESET APP LEDGER
                  </button>
                )}
              </div>
            </div>

            {/* Staff Setup and Access Instructions */}
            <div className="bg-neutral-950 border-2 border-neutral-800 p-6 space-y-5">
              <div className="flex items-center gap-3 border-b border-neutral-850 pb-3">
                <Share2 className="text-amber-400" size={18} />
                <h4 className="text-xs font-black uppercase text-white tracking-widest font-mono">
                  STAFF ACCOUNTS & MULTI-USER ACCESS INSTANT SETUP
                </h4>
              </div>
              
              <p className="text-xs text-neutral-400 leading-normal font-medium">
                Want to make this application available to other staff members? Follow this simple 3-step checklist to coordinate class fee logs across all devices:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium">
                {/* Step 1 */}
                <div className="bg-neutral-900 border border-neutral-850 p-4 space-y-2 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-amber-500 font-mono block">STEP 01: SHARE PORTAL LINK</span>
                    <p className="text-neutral-400 text-[11px] leading-relaxed">
                      Provide other staff members with the live web address of this school fee tracker. They can open it on any mobile phone, tablet, or classroom computer.
                    </p>
                    <div className="bg-neutral-950 p-2 border border-neutral-800 rounded font-mono text-[9px] text-amber-400 break-all select-all font-bold">
                      {(() => {
                        const raw = window.location.origin;
                        if (raw.includes("localhost") || raw.includes("127.0.0.1")) return raw;
                        let clean = raw.replace(/^(https?:\/\/)\d+-/, "$1");
                        if (clean.includes("-dev-")) clean = clean.replace("-dev-", "-pre-");
                        return clean.replace(/:\d+$/, "");
                      })()}
                    </div>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const rawOrigin = window.location.origin;
                          let cleanOrigin = rawOrigin;
                          if (!rawOrigin.includes("localhost") && !rawOrigin.includes("127.0.0.1")) {
                            cleanOrigin = rawOrigin.replace(/^(https?:\/\/)\d+-/, "$1");
                            if (cleanOrigin.includes("-dev-")) {
                              cleanOrigin = cleanOrigin.replace("-dev-", "-pre-");
                            }
                            cleanOrigin = cleanOrigin.replace(/:\d+$/, "");
                          }
                          navigator.clipboard.writeText(cleanOrigin);
                          setCopiedAddress(true);
                          showToast("Copied portal address to clipboard!");
                          setTimeout(() => setCopiedAddress(false), 2000);
                        } catch (err) {
                          const rawOrigin = window.location.origin;
                          let cleanOrigin = rawOrigin;
                          if (!rawOrigin.includes("localhost") && !rawOrigin.includes("127.0.0.1")) {
                            cleanOrigin = rawOrigin.replace(/^(https?:\/\/)\d+-/, "$1");
                            if (cleanOrigin.includes("-dev-")) {
                              cleanOrigin = cleanOrigin.replace("-dev-", "-pre-");
                            }
                            cleanOrigin = cleanOrigin.replace(/:\d+$/, "");
                          }
                          alert(`Portal Address: ${cleanOrigin}`);
                        }
                      }}
                      className="w-full py-2 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-600 text-[10px] font-black uppercase tracking-widest text-amber-400 transition-all flex items-center justify-center gap-2 cursor-pointer font-mono"
                    >
                      <Copy size={12} />
                      {copiedAddress ? "COPIED DETAILS!" : "COPY SHARABLE URL"}
                    </button>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="bg-neutral-900 border border-neutral-850 p-4 space-y-2 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-amber-500 font-mono block">STEP 02: AUTHORIZE THE EMAIL</span>
                    <p className="text-neutral-400 text-[11px] leading-relaxed">
                      Navigate to the <span className="text-amber-400 font-bold">RBAC & MFA Hub</span> tab above. Register their email, select their class/role, and let them sign in securely.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('mfa')}
                      className="w-full py-2 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-600 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors flex items-center justify-center gap-2 cursor-pointer font-mono"
                    >
                      <Users size={12} />
                      GOTO SECURITY HUB
                    </button>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="bg-neutral-900 border border-neutral-850 p-4 space-y-2 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-amber-500 font-mono block">STEP 03: TURN ON CLOUD SYNC</span>
                    <p className="text-neutral-400 text-[11px] leading-relaxed">
                      Make sure database mode is set to <span className="text-emerald-400 font-bold">Cloud Sync</span> on all devices so updates register instantly for all staff teachers in real-time.
                    </p>
                  </div>
                  <div className="bg-neutral-950 px-2.5 py-1.5 border border-neutral-850 text-center text-[10px] uppercase font-bold text-neutral-500 font-mono">
                    STATUS: {storageMode === 'cloud' ? '🟢 SYNCING LIVE' : '⚠️ ISOLATED LOCAL'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* SMS Urgent notification Modal Overlay */}
      {smsTarget && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border-4 border-red-500 max-w-md w-full p-8 shadow-[8px_8px_0px_0px_rgba(239,68,68,0.25)] space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-neutral-800">
              <ShieldAlert size={20} className="text-red-500 animate-pulse" />
              <h3 className="text-sm font-black uppercase tracking-widest text-white font-mono">Send Urgent Arrears SMS</h3>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-neutral-400 font-bold leading-relaxed">
                Send/copy immediate high-priority check-in arrears notification for pupil: <span className="font-extrabold text-white">{smsTarget.student.name}</span>
              </p>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-[8.5px] font-black text-neutral-400 uppercase tracking-widest font-mono">
                    Receiver Guardian Phone Number
                  </label>
                  {smsTarget.student.guardianPhone && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(smsTarget.student.guardianPhone || '');
                        showToast(`Copied Guardian Phone: ${smsTarget.student.guardianPhone}`);
                      }}
                      className="text-[9px] hover:text-white text-amber-400 px-2 py-0.5 border border-amber-500/30 hover:border-amber-400 bg-neutral-950 font-mono uppercase tracking-wider font-extrabold flex items-center gap-1 transition"
                      title="Copy Guardian Contact"
                    >
                      <Copy size={9} />
                      <span>Copy Number</span>
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
                  className="w-full bg-neutral-950 border border-neutral-800 py-2.5 px-3 font-mono text-xs text-white focus:outline-none focus:border-red-500 placeholder:text-neutral-700 font-bold"
                />
              </div>

              <div className="relative group">
                <div className="bg-neutral-950 text-red-405 font-mono text-[10.5px] p-4 border-2 border-neutral-850 leading-relaxed space-y-2 select-text">
                  <div className="text-emerald-400">
                    <span className="text-neutral-500 font-bold uppercase tracking-wider block">Sender Mask: SAAKOCHECK (URGENT)</span>
                    <p className="border-t border-neutral-800/80 my-2 pt-2" />
                    <p>Hello. URGENT ALERT: Our registers show that {smsTarget.student.name} has missed gate check-in fee collections for {smsTarget.consecutiveDays} consecutive school days (Dates: {smsTarget.unpaidDates.join(', ')}). Outstanding: GHC {(smsTarget.consecutiveDays * 5).toFixed(2)}. Make payments at the gate register to avoid access disruption. - Yakubu Hakeem (Administrator)</p>
                  </div>
                </div>

                <div className="absolute right-2.5 bottom-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      const msg = `Hello. URGENT ALERT: Our registers show that ${smsTarget.student.name} has missed gate check-in fee collections for ${smsTarget.consecutiveDays} consecutive school days (Dates: ${smsTarget.unpaidDates.join(', ')}). Outstanding: GHC ${(smsTarget.consecutiveDays * 5).toFixed(2)}. Make payments at the gate register to avoid access disruption. - Yakubu Hakeem (Administrator)`;
                      navigator.clipboard.writeText(msg);
                      showToast(`Copied urgent arrears SMS log text!`);
                    }}
                    className="text-[9px] text-amber-400 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded px-2.5 py-1 font-mono font-bold tracking-wider flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                    title="Copy full urgent message text"
                  >
                    <Copy size={10} />
                    <span>Copy Full Message</span>
                  </button>
                </div>
              </div>

              {!smsTarget.student.guardianPhone && (
                <p className="text-[10px] text-amber-500 font-bold font-mono uppercase bg-amber-950/20 border border-amber-900/60 p-2 rounded">
                  ⚠️ Alert: No active contact registered. Please enter a verified phone number above.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const msg = `Hello. URGENT ALERT: Our registers show that ${smsTarget.student.name} has missed gate check-in fee collections for ${smsTarget.consecutiveDays} consecutive school days (Dates: ${smsTarget.unpaidDates.join(', ')}). Outstanding: GHC ${(smsTarget.consecutiveDays * 5).toFixed(2)}. Make payments at the gate register to avoid access disruption. - Yakubu Hakeem (Administrator)`;
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
                  className="flex-1 text-xs bg-red-650 hover:bg-red-600 disabled:bg-neutral-800 disabled:border-neutral-850 disabled:text-neutral-500 border-2 border-red-500 text-white py-3 font-mono font-black flex items-center justify-center gap-2 uppercase tracking-widest transition-all cursor-pointer"
                >
                  {isSendingSms ? (
                    <span className="animate-pulse">DISPATCHING...</span>
                  ) : smsSuccess ? (
                    <>
                      <Check size={14} className="text-emerald-300 stroke-[3]" /> DISPATCHED
                    </>
                  ) : (
                    <span>DISPATCH SIMULATED SMS</span>
                  )}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setSmsTarget(null)}
                className="w-full text-[10px] bg-neutral-950 border border-neutral-850 hover:border-neutral-750 text-neutral-500 hover:text-neutral-300 py-2 font-black transition-colors uppercase tracking-widest cursor-pointer"
              >
                Close Gateway Overlay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
