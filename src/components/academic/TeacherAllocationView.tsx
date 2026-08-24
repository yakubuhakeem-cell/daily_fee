/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { StudentClass, ALL_CLASSES, TeacherAllocation, UserRole } from '../../types';
import { 
  Users, BookOpen, Plus, Trash2, CheckCircle2, Shield, UserCheck, 
  GraduationCap, Award, Sliders, Save, AlertCircle, UserPlus, Sparkles, X, Check
} from 'lucide-react';
import { getSubjectsForClass, DEFAULT_GHANA_SUBJECTS } from '../../utils/ghanaCurriculum';

export const TeacherAllocationView: React.FC = () => {
  const { 
    teacherAllocations = [], 
    saveTeacherAllocation,
    deleteTeacherAllocation,
    users = [],
    registerStaff,
    academicSettings,
    theme,
    playFeedbackSound 
  } = useApp();

  const [selectedClass, setSelectedClass] = useState<StudentClass>('B1');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [isClassTeacherToggle, setIsClassTeacherToggle] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Quick Teacher Registration Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherRole, setNewTeacherRole] = useState<UserRole>('Teacher');
  const [newTeacherClass, setNewTeacherClass] = useState<StudentClass>(selectedClass);
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [newTeacherPhone, setNewTeacherPhone] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const academicYear = academicSettings?.academicYear || '2025/2026';
  const classSubjects = useMemo(() => getSubjectsForClass(selectedClass), [selectedClass]);

  // Teachers / Staff list - Case-insensitive matching for all staff roles
  const staffMembers = useMemo(() => {
    const list = users.filter(u => {
      const r = (u.role || '').toLowerCase().trim();
      return (
        r === 'teacher' || 
        r === 'administrator' || 
        r === 'admin' || 
        r === 'headmaster' || 
        r === 'headmistress' || 
        r === 'principal' || 
        r === 'accountant' || 
        r === 'cashier' || 
        r === 'staff'
      );
    });
    // Fallback: If no users matched specific roles, return all existing user accounts
    return list.length > 0 ? list : users;
  }, [users]);

  // Filter allocations for selected class
  const classAllocations = useMemo(() => {
    return teacherAllocations.filter(a => a.class === selectedClass);
  }, [teacherAllocations, selectedClass]);

  // Handle Quick Teacher Registration
  const handleQuickRegisterTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);

    const name = newTeacherName.trim();
    if (!name) {
      setRegisterError('Please enter the teacher or staff member full name.');
      return;
    }

    // Auto-generate clean email if empty
    let email = newTeacherEmail.trim().toLowerCase();
    if (!email) {
      const sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.');
      email = `${sanitized}@school.local`;
    }

    setIsRegistering(true);
    try {
      const result = registerStaff(
        name,
        email,
        newTeacherRole,
        newTeacherRole === 'Teacher' ? newTeacherClass : undefined,
        false, // mfa
        true,  // passwordEnabled
        'teacher123', // default password
        newTeacherRole === 'Teacher' ? [newTeacherClass] : undefined,
        undefined, // salary
        newTeacherPhone.trim() || undefined,
        undefined
      );

      if (!result.success) {
        setRegisterError(result.error || 'Failed to register staff member.');
        setIsRegistering(false);
        return;
      }

      // Find the newly registered teacher in next tick or set teacher name
      const matchingUser = users.find(u => u.email.toLowerCase() === email) || {
        id: 'staff_' + Date.now(),
        name,
        email,
        role: newTeacherRole
      };

      setSelectedTeacherId(matchingUser.id);
      setShowRegisterModal(false);
      setNewTeacherName('');
      setNewTeacherEmail('');
      setNewTeacherPhone('');
      setSuccessToast(`Successfully registered ${name} (${newTeacherRole})!`);
      if (playFeedbackSound) playFeedbackSound('success');
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.error('Registration failed:', err);
      setRegisterError(err.message || 'An unexpected error occurred during registration.');
    } finally {
      setIsRegistering(false);
    }
  };

  // Quick Seed standard demo teachers for primary and JHS
  const handleSeedStandardTeachers = () => {
    const standardTeachers = [
      { name: 'Mr. Emmanuel Antwi', role: 'Teacher' as UserRole, cls: 'B1' as StudentClass },
      { name: 'Mrs. Grace Mensah', role: 'Teacher' as UserRole, cls: 'B2' as StudentClass },
      { name: 'Mr. Kwame Osei', role: 'Teacher' as UserRole, cls: 'B3' as StudentClass },
      { name: 'Miss Faustina Donkor', role: 'Teacher' as UserRole, cls: 'B4' as StudentClass },
      { name: 'Mr. Daniel Appiah', role: 'Teacher' as UserRole, cls: 'B5' as StudentClass },
      { name: 'Madam Sarah Quaye', role: 'Teacher' as UserRole, cls: 'B6' as StudentClass },
      { name: 'Mr. Isaac Boateng (Science/Maths)', role: 'Teacher' as UserRole, cls: 'B7' as StudentClass },
      { name: 'Mrs. Cynthia Agyemang (Languages)', role: 'Teacher' as UserRole, cls: 'B8' as StudentClass },
      { name: 'Mr. Francis Kyeremeh (Social/ICT)', role: 'Teacher' as UserRole, cls: 'B9' as StudentClass },
    ];

    let addedCount = 0;
    standardTeachers.forEach(t => {
      const email = t.name.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.') + '@school.local';
      if (!users.some(u => u.email.toLowerCase() === email)) {
        registerStaff(
          t.name,
          email,
          t.role,
          t.cls,
          false,
          true,
          'teacher123',
          [t.cls]
        );
        addedCount++;
      }
    });

    if (addedCount > 0) {
      setSuccessToast(`Added ${addedCount} standard class teachers to the system!`);
      if (playFeedbackSound) playFeedbackSound('success');
      setTimeout(() => setSuccessToast(null), 4000);
    } else {
      alert('Standard teachers are already present in the user roster.');
    }
  };

  const handleAddAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId || !selectedSubjectId) {
      alert("Please select both a Teacher and a Subject.");
      return;
    }

    const teacher = staffMembers.find(s => s.id === selectedTeacherId) || users.find(s => s.id === selectedTeacherId);
    const subject = classSubjects.find(s => s.id === selectedSubjectId);

    if (!teacher || !subject) {
      alert("Please choose a valid teacher and curriculum subject.");
      return;
    }

    setIsSaving(true);
    try {
      const newAlloc: TeacherAllocation = {
        id: `alloc_${selectedClass}_${subject.id}_${teacher.id}`,
        teacherId: teacher.id,
        teacherName: teacher.name,
        subjectId: subject.id,
        subjectName: subject.name,
        class: selectedClass,
        isClassTeacher: isClassTeacherToggle,
        academicYear: academicYear
      };

      await saveTeacherAllocation(newAlloc);
      setSelectedSubjectId('');
      setIsClassTeacherToggle(false);
      setSuccessToast(`Assigned ${teacher.name} to ${subject.name} in ${selectedClass}!`);
      if (playFeedbackSound) playFeedbackSound('success');
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.error("Failed to save teacher allocation:", err);
      if (playFeedbackSound) playFeedbackSound('error');
      alert("Error: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAllocation = async (id: string) => {
    if (confirm("Remove this subject teacher allocation?")) {
      try {
        await deleteTeacherAllocation(id);
        if (playFeedbackSound) playFeedbackSound('success');
      } catch (err: any) {
        console.error("Failed to delete allocation:", err);
      }
    }
  };

  const isLight = theme === 'daylight';

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="bg-emerald-950 border-2 border-emerald-500 text-emerald-200 px-4 py-2.5 rounded-xs flex items-center justify-between text-xs font-mono font-bold shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top Class Tabs */}
      <div className={`${isLight ? 'bg-neutral-100 border-neutral-300' : 'bg-neutral-900 border-neutral-800'} border p-4 flex flex-wrap items-center justify-between gap-3`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono font-bold uppercase text-amber-400 mr-2 flex items-center gap-1.5">
            <Users size={14} /> Class Duty:
          </span>
          {ALL_CLASSES.map(cls => (
            <button
              key={cls}
              onClick={() => {
                setSelectedClass(cls);
                setNewTeacherClass(cls);
              }}
              className={`px-3 py-1 text-xs font-mono font-bold transition-colors cursor-pointer ${
                selectedClass === cls
                  ? 'bg-amber-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : isLight ? 'bg-white text-neutral-700 hover:bg-neutral-200' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              {cls}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => {
              setNewTeacherClass(selectedClass);
              setShowRegisterModal(true);
            }}
            className="bg-amber-400 hover:bg-amber-300 text-black text-xs font-mono font-black uppercase tracking-wider px-3 py-1.5 flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
          >
            <UserPlus size={14} />
            <span>+ Register Teacher</span>
          </button>

          <div className="text-xs font-mono text-neutral-400">
            Academic Year: <span className="font-bold text-white">{academicYear}</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Assign Teacher Form */}
        <div className={`${isLight ? 'bg-white border-neutral-200' : 'bg-neutral-900 border-neutral-800'} border p-5 space-y-4`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black font-mono uppercase text-amber-400 flex items-center gap-2">
                <UserCheck size={16} /> Assign Subject Teacher
              </h3>
              <p className="text-[11px] text-neutral-400 mt-1">
                Pair staff members to curriculum subjects in {selectedClass}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setNewTeacherClass(selectedClass);
                setShowRegisterModal(true);
              }}
              className="text-amber-400 hover:text-amber-300 text-[11px] font-mono font-bold flex items-center gap-1 bg-amber-950/40 border border-amber-500/40 px-2 py-1"
              title="Register a new teacher or staff member"
            >
              <Plus size={12} />
              <span>New Staff</span>
            </button>
          </div>

          <form onSubmit={handleAddAllocation} className="space-y-4 text-xs font-mono">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-neutral-400 block font-bold">Select Staff Member / Teacher:</label>
                <span className="text-[10px] text-neutral-400">
                  {staffMembers.length} available
                </span>
              </div>
              <select
                value={selectedTeacherId}
                onChange={e => setSelectedTeacherId(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 text-white px-3 py-2 font-bold focus:outline-none focus:border-amber-400"
              >
                <option value="">-- Choose Staff / Teacher ({staffMembers.length} Registered) --</option>
                {staffMembers.map(staff => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name} ({staff.role.toUpperCase()}) {staff.assignedClass ? `• Form Master: ${staff.assignedClass}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Helper if drop list is empty or minimal */}
            {staffMembers.length <= 1 && (
              <div className="bg-neutral-950 border border-amber-500/40 p-3 text-[11px] space-y-2">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <Sparkles size={13} />
                  <span>Need teaching staff for {selectedClass}?</span>
                </div>
                <p className="text-neutral-400 leading-tight">
                  You can register a teacher or generate standard teachers across all grades:
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setNewTeacherClass(selectedClass);
                      setShowRegisterModal(true);
                    }}
                    className="bg-amber-400 text-black px-2.5 py-1 text-[10px] font-black uppercase tracking-wider"
                  >
                    + Add Single Teacher
                  </button>
                  <button
                    type="button"
                    onClick={handleSeedStandardTeachers}
                    className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-2.5 py-1 text-[10px] font-bold"
                  >
                    ⚡ Setup Standard Staff
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="text-neutral-400 block mb-1 font-bold">Select Curriculum Subject:</label>
              <select
                value={selectedSubjectId}
                onChange={e => setSelectedSubjectId(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 text-white px-3 py-2 font-bold focus:outline-none focus:border-amber-400"
              >
                <option value="">-- Choose Subject ({classSubjects.length} Available) --</option>
                {classSubjects.map(sub => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.code}) {sub.isCore ? '• CORE' : '• ELECTIVE'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="classTeacherCheck"
                checked={isClassTeacherToggle}
                onChange={e => setIsClassTeacherToggle(e.target.checked)}
                className="accent-amber-400 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="classTeacherCheck" className="text-neutral-300 font-bold cursor-pointer select-none">
                Designate as Primary Class Teacher / Form Master
              </label>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-amber-400 hover:bg-amber-300 text-black font-black uppercase tracking-wider py-2.5 px-4 text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <Plus size={14} />
              <span>{isSaving ? 'Saving...' : 'Save Allocation'}</span>
            </button>
          </form>
        </div>

        {/* Right: Allocation Matrix */}
        <div className={`lg:col-span-2 ${isLight ? 'bg-white border-neutral-200' : 'bg-neutral-900 border-neutral-800'} border p-5`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black font-mono uppercase text-white flex items-center gap-2">
                <BookOpen size={16} className="text-blue-400" /> Current Subject Allocation: {selectedClass}
              </h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {classAllocations.length} of {classSubjects.length} subjects allocated to teachers
              </p>
            </div>

            <div className="text-xs font-mono text-neutral-400">
              Allocated: <strong className="text-amber-400">{Math.round((classAllocations.length / Math.max(1, classSubjects.length)) * 100)}%</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400">
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Assigned Teacher</th>
                  <th className="py-2.5 px-2 text-center">Status</th>
                  <th className="py-2.5 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {classSubjects.map(sub => {
                  const alloc = classAllocations.find(a => a.subjectId === sub.id);

                  return (
                    <tr key={sub.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span>{sub.name}</span>
                          <span className="text-[10px] text-neutral-500 font-normal">({sub.code})</span>
                          {sub.isCore && (
                            <span className="bg-blue-950/60 border border-blue-600/40 text-blue-300 text-[9px] px-1 py-0.2 uppercase font-bold">
                              Core
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        {alloc ? (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-amber-400">{alloc.teacherName}</span>
                            {alloc.isClassTeacher && (
                              <span className="bg-amber-950/60 border border-amber-500/50 text-amber-300 text-[9px] px-1.5 py-0.2 font-bold uppercase">
                                Form Master
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-500 italic">Unassigned (Open)</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {alloc ? (
                          <span className="text-emerald-400 font-bold flex items-center justify-center gap-1">
                            <CheckCircle2 size={13} /> Active
                          </span>
                        ) : (
                          <span className="text-neutral-500 font-normal">Pending</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        {alloc && (
                          <button
                            onClick={() => handleDeleteAllocation(alloc.id)}
                            className="text-neutral-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                            title="Remove allocation"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* QUICK TEACHER REGISTRATION MODAL */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-neutral-900 text-white border-2 border-amber-400 p-6 max-w-md w-full shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <UserPlus size={18} />
                <h3 className="font-bold uppercase tracking-wider text-sm">Register Teaching Staff</h3>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X size={16} />
              </button>
            </div>

            {registerError && (
              <div className="bg-rose-950/80 border border-rose-600 text-rose-200 p-2.5 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0 text-rose-400" />
                <span>{registerError}</span>
              </div>
            )}

            <form onSubmit={handleQuickRegisterTeacher} className="space-y-3.5 text-xs">
              <div>
                <label className="text-neutral-300 block mb-1 font-bold">
                  Teacher Full Name: <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mr. Emmanuel Antwi"
                  value={newTeacherName}
                  onChange={e => setNewTeacherName(e.target.value)}
                  className="w-full p-2 bg-neutral-950 border border-neutral-700 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-300 block mb-1 font-bold">Staff Role:</label>
                  <select
                    value={newTeacherRole}
                    onChange={e => setNewTeacherRole(e.target.value as UserRole)}
                    className="w-full p-2 bg-neutral-950 border border-neutral-700 text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="Teacher">Teacher</option>
                    <option value="Headmaster">Headmaster</option>
                    <option value="Administrator">Administrator</option>
                    <option value="Accountant">Accountant</option>
                  </select>
                </div>

                <div>
                  <label className="text-neutral-300 block mb-1 font-bold">Form Master Class:</label>
                  <select
                    value={newTeacherClass}
                    onChange={e => setNewTeacherClass(e.target.value as StudentClass)}
                    className="w-full p-2 bg-neutral-950 border border-neutral-700 text-white focus:outline-none focus:border-amber-400"
                  >
                    {ALL_CLASSES.map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-neutral-300 block mb-1 font-bold">
                  Email Address <span className="text-neutral-500 font-normal">(Optional - auto-generated if blank)</span>:
                </label>
                <input
                  type="email"
                  placeholder="e.g. e.antwi@school.local"
                  value={newTeacherEmail}
                  onChange={e => setNewTeacherEmail(e.target.value)}
                  className="w-full p-2 bg-neutral-950 border border-neutral-700 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-neutral-300 block mb-1 font-bold">
                  Phone / Mobile Number <span className="text-neutral-500 font-normal">(Optional)</span>:
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 0244123456"
                  value={newTeacherPhone}
                  onChange={e => setNewTeacherPhone(e.target.value)}
                  className="w-full p-2 bg-neutral-950 border border-neutral-700 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="bg-neutral-950 p-2.5 border border-neutral-800 text-[11px] text-neutral-400">
                <span>Default login password: <strong className="text-amber-400 font-mono">teacher123</strong> (can be customized later in Staff Management).</span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 text-xs font-bold border border-neutral-700 hover:bg-neutral-800 text-neutral-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                >
                  {isRegistering ? 'Registering...' : 'Register & Select'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

