/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { StudentClass, ALL_CLASSES, TeacherAllocation } from '../../types';
import { 
  Users, BookOpen, Plus, Trash2, CheckCircle2, Shield, UserCheck, 
  GraduationCap, Award, Sliders, Save, AlertCircle
} from 'lucide-react';
import { getSubjectsForClass, DEFAULT_GHANA_SUBJECTS } from '../../utils/ghanaCurriculum';

export const TeacherAllocationView: React.FC = () => {
  const { 
    teacherAllocations = [], 
    saveTeacherAllocation,
    deleteTeacherAllocation,
    users = [],
    academicSettings,
    theme,
    playFeedbackSound 
  } = useApp();

  const [selectedClass, setSelectedClass] = useState<StudentClass>('B1');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [isClassTeacherToggle, setIsClassTeacherToggle] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);

  const academicYear = academicSettings?.academicYear || '2025/2026';
  const classSubjects = useMemo(() => getSubjectsForClass(selectedClass), [selectedClass]);

  // Teachers / Staff list
  const staffMembers = useMemo(() => {
    return users.filter(u => u.role === 'teacher' || u.role === 'admin' || u.role === 'headmaster' || u.role === 'cashier');
  }, [users]);

  // Filter allocations for selected class
  const classAllocations = useMemo(() => {
    return teacherAllocations.filter(a => a.class === selectedClass);
  }, [teacherAllocations, selectedClass]);

  const handleAddAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId || !selectedSubjectId) {
      alert("Please select both a Teacher and a Subject.");
      return;
    }

    const teacher = staffMembers.find(s => s.id === selectedTeacherId);
    const subject = classSubjects.find(s => s.id === selectedSubjectId);

    if (!teacher || !subject) return;

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
      if (playFeedbackSound) playFeedbackSound('success');
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
      {/* Top Class Tabs */}
      <div className={`${isLight ? 'bg-neutral-100 border-neutral-300' : 'bg-neutral-900 border-neutral-800'} border p-4 flex flex-wrap items-center justify-between gap-3`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono font-bold uppercase text-amber-400 mr-2 flex items-center gap-1.5">
            <Users size={14} /> Class Duty:
          </span>
          {ALL_CLASSES.map(cls => (
            <button
              key={cls}
              onClick={() => setSelectedClass(cls)}
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

        <div className="text-xs font-mono text-neutral-400">
          Academic Year: <span className="font-bold text-white">{academicYear}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Assign Teacher Form */}
        <div className={`${isLight ? 'bg-white border-neutral-200' : 'bg-neutral-900 border-neutral-800'} border p-5 space-y-4`}>
          <div>
            <h3 className="text-sm font-black font-mono uppercase text-amber-400 flex items-center gap-2">
              <UserCheck size={16} /> Assign Subject Teacher
            </h3>
            <p className="text-[11px] text-neutral-400 mt-1">
              Pair staff members to curriculum subjects in {selectedClass}
            </p>
          </div>

          <form onSubmit={handleAddAllocation} className="space-y-4 text-xs font-mono">
            <div>
              <label className="text-neutral-400 block mb-1">Select Staff Member / Teacher:</label>
              <select
                value={selectedTeacherId}
                onChange={e => setSelectedTeacherId(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 text-white px-3 py-2 font-bold focus:outline-none focus:border-amber-400"
              >
                <option value="">-- Choose Staff / Teacher --</option>
                {staffMembers.map(staff => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name} ({staff.role.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-neutral-400 block mb-1">Select Curriculum Subject:</label>
              <select
                value={selectedSubjectId}
                onChange={e => setSelectedSubjectId(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 text-white px-3 py-2 font-bold focus:outline-none focus:border-amber-400"
              >
                <option value="">-- Choose Subject --</option>
                {classSubjects.map(sub => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.code})
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
                className="accent-amber-400 w-4 h-4"
              />
              <label htmlFor="classTeacherCheck" className="text-neutral-300 font-bold cursor-pointer">
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
                            className="text-neutral-500 hover:text-rose-400 p-1 transition-colors"
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
    </div>
  );
};
