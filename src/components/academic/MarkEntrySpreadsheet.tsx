/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { StudentClass, Student, AcademicAssessment, CurriculumSubject, ALL_CLASSES } from '../../types';
import { 
  FileSpreadsheet, Save, Sparkles, Download, Upload, RefreshCw, 
  CheckCircle2, AlertCircle, ArrowUpDown, ChevronDown, ChevronRight,
  TrendingUp, Award, HelpCircle, Filter, BookOpen, Users, Check,
  Sliders, Medal, X, Lock, Unlock, ShieldCheck, ShieldAlert, KeyRound, Shield,
  Printer, Trash2, RotateCcw, FileText, CheckCircle
} from 'lucide-react';
import { 
  getSubjectsForClass, 
  computeTotalAssessment, 
  calculateGESGrade, 
  formatOrdinal,
  DEFAULT_GHANA_SUBJECTS,
  getRankMedal
} from '../../utils/ghanaCurriculum';
import { canUserEditClassMarks, isHeadOrAdmin, getTeacherAssignedClasses } from '../../utils/rbacUtils';
import { SchoolLogo } from '../SchoolLogo';
import * as XLSX from 'xlsx';

interface MarkEntrySpreadsheetProps {
  initialClass?: StudentClass;
  initialSubjectId?: string;
}

interface LocalRowState {
  studentId: string;
  studentName: string;
  rollNumber: string;
  classExercises: string; // raw string for smooth editing
  homework: string;
  project: string;
  classTest: string;
  sbaRaw: string;
  examRaw: string;
  teacherRemark: string;
  isDirty?: boolean;
}

export const MarkEntrySpreadsheet: React.FC<MarkEntrySpreadsheetProps> = ({
  initialClass = 'B1',
  initialSubjectId
}) => {
  const { 
    students = [], 
    academicAssessments = [], 
    batchSaveAcademicAssessments, 
    clearAcademicAssessments,
    clearAllAcademicAssessments,
    activeTerm,
    currentUser,
    users = [],
    systemSettings,
    academicSettings,
    updateAcademicSettings,
    teacherAllocations = [],
    playFeedbackSound,
    theme
  } = useApp();

  const [selectedClass, setSelectedClass] = useState<StudentClass>(initialClass);
  const classSubjects = useMemo(() => getSubjectsForClass(selectedClass), [selectedClass]);
  
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => {
    if (initialSubjectId && classSubjects.some(s => s.id === initialSubjectId)) {
      return initialSubjectId;
    }
    return classSubjects[0]?.id || 'sub_pri_eng';
  });

  // Role-Based Security evaluation
  const accessCheck = useMemo(() => {
    return canUserEditClassMarks(currentUser, selectedClass, selectedSubjectId, teacherAllocations);
  }, [currentUser, selectedClass, selectedSubjectId, teacherAllocations]);

  // Admin / Headmaster temporary override state
  const [isOverrideActive, setIsOverrideActive] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideAdminEmail, setOverrideAdminEmail] = useState('');
  const [overridePassword, setOverridePassword] = useState('');
  const [overrideError, setOverrideError] = useState<string | null>(null);

  // Reset override when class changes
  useEffect(() => {
    setIsOverrideActive(false);
  }, [selectedClass]);

  const effectiveAllowed = accessCheck.allowed || isOverrideActive;

  // Handle Admin Override verification
  const handleVerifyOverride = (e: React.FormEvent) => {
    e.preventDefault();
    setOverrideError(null);

    const adminUser = users.find(u => 
      u.email.toLowerCase() === overrideAdminEmail.trim().toLowerCase() && 
      (isHeadOrAdmin(u) || u.permissions?.canManageExams)
    );

    if (!adminUser) {
      setOverrideError('No Administrator or Headmaster account found with this email.');
      return;
    }

    if (adminUser.password && adminUser.password !== overridePassword) {
      setOverrideError('Invalid password. Authorization denied.');
      return;
    }

    setIsOverrideActive(true);
    setShowOverrideModal(false);
    setOverrideAdminEmail('');
    setOverridePassword('');
    if (playFeedbackSound) playFeedbackSound('success');
  };

  // Ensure selectedSubjectId is valid when class changes
  useEffect(() => {
    if (!classSubjects.some(s => s.id === selectedSubjectId)) {
      if (classSubjects[0]) {
        setSelectedSubjectId(classSubjects[0].id);
      }
    }
  }, [selectedClass, classSubjects, selectedSubjectId]);

  const selectedSubject = useMemo(() => {
    return classSubjects.find(s => s.id === selectedSubjectId) || classSubjects[0];
  }, [classSubjects, selectedSubjectId]);

  const activeTermId = activeTerm?.id || 'term_1_2026';
  const academicYear = academicSettings?.academicYear || '2025/2026';

  // Flexible weighting state with quick presets
  const [sbaWeight, setSbaWeight] = useState<number>(academicSettings?.sbaWeight ?? 50);
  const [examWeight, setExamWeight] = useState<number>(academicSettings?.examWeight ?? 50);
  const [showCustomWeightModal, setShowCustomWeightModal] = useState(false);
  const [tempSba, setTempSba] = useState<number>(sbaWeight);
  const [tempExam, setTempExam] = useState<number>(examWeight);

  // Sync weights when academicSettings changes externally
  useEffect(() => {
    if (academicSettings?.sbaWeight !== undefined && academicSettings?.examWeight !== undefined) {
      setSbaWeight(academicSettings.sbaWeight);
      setExamWeight(academicSettings.examWeight);
      setTempSba(academicSettings.sbaWeight);
      setTempExam(academicSettings.examWeight);
    }
  }, [academicSettings?.sbaWeight, academicSettings?.examWeight]);

  const handleApplyWeightPreset = async (sba: number, exam: number) => {
    setSbaWeight(sba);
    setExamWeight(exam);
    if (updateAcademicSettings) {
      try {
        await updateAcademicSettings({ sbaWeight: sba, examWeight: exam });
      } catch (err) {
        console.error("Failed to update global academic settings:", err);
      }
    }
  };

  // Filter students in this class
  const classPupils = useMemo(() => {
    return students
      .filter(s => s.active && s.class === selectedClass)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, selectedClass]);

  // Local spreadsheet rows
  const [gridData, setGridData] = useState<Record<string, LocalRowState>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [quickSbaFillValue, setQuickSbaFillValue] = useState<string>('35');
  const [quickExamFillValue, setQuickExamFillValue] = useState<string>('70');
  const [showQuickFillModal, setShowQuickFillModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hardcopy Print Modal state
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printMode, setPrintMode] = useState<'filled' | 'blank'>('filled');

  // Unpopulate / Clear Sample Marks Modal state
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearScope, setClearScope] = useState<'subject' | 'class' | 'all'>('subject');
  const [clearConfirmationText, setClearConfirmationText] = useState('');
  const [isClearing, setIsClearing] = useState(false);

  // Clear marks action handler
  const handleClearMarksConfirm = async () => {
    setIsClearing(true);
    try {
      if (clearScope === 'all') {
        if (clearConfirmationText.trim().toUpperCase() !== 'UNPOPULATE') {
          alert('Please type "UNPOPULATE" in the confirmation box to purge school-wide marks.');
          setIsClearing(false);
          return;
        }
        await clearAllAcademicAssessments();
        setGridData({});
        setSaveSuccessMsg('Successfully unpopulated ALL academic sample marks across the entire school!');
      } else if (clearScope === 'class') {
        await clearAcademicAssessments(selectedClass);
        setGridData({});
        setSaveSuccessMsg(`Successfully cleared all assessment marks for ${selectedClass}!`);
      } else {
        await clearAcademicAssessments(selectedClass, selectedSubject.id);
        setGridData(prev => {
          const reset: Record<string, LocalRowState> = {};
          classPupils.forEach(p => {
            reset[p.id] = {
              studentId: p.id,
              studentName: p.name,
              rollNumber: p.rollNumber || '',
              classExercises: '',
              homework: '',
              project: '',
              classTest: '',
              sbaRaw: '',
              examRaw: '',
              teacherRemark: '',
              isDirty: false
            };
          });
          return reset;
        });
        setSaveSuccessMsg(`Successfully cleared marks for ${selectedSubject.name} (${selectedClass})!`);
      }

      setShowClearModal(false);
      setClearConfirmationText('');
      if (playFeedbackSound) playFeedbackSound('success');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to clear marks:', err);
      if (playFeedbackSound) playFeedbackSound('error');
      alert('Failed to clear marks: ' + (err.message || 'Unknown database error'));
    } finally {
      setIsClearing(false);
    }
  };

  // Initialize or load grid data from store
  useEffect(() => {
    const newGrid: Record<string, LocalRowState> = {};

    classPupils.forEach(pupil => {
      const existing = academicAssessments.find(
        a => a.studentId === pupil.id && 
             a.subjectId === selectedSubjectId && 
             (a.termId === activeTermId || !a.termId)
      );

      if (existing) {
        newGrid[pupil.id] = {
          studentId: pupil.id,
          studentName: pupil.name,
          rollNumber: pupil.rollNumber || '',
          classExercises: existing.classExercisesScore !== undefined ? String(existing.classExercisesScore) : '',
          homework: existing.homeworkScore !== undefined ? String(existing.homeworkScore) : '',
          project: existing.projectScore !== undefined ? String(existing.projectScore) : '',
          classTest: existing.classTestScore !== undefined ? String(existing.classTestScore) : '',
          sbaRaw: existing.sbaRawScore !== undefined ? String(existing.sbaRawScore) : String(existing.sbaScore || ''),
          examRaw: existing.examRawScore !== undefined ? String(existing.examRawScore) : String(existing.examScore || ''),
          teacherRemark: existing.teacherRemark || '',
          isDirty: false
        };
      } else {
        newGrid[pupil.id] = {
          studentId: pupil.id,
          studentName: pupil.name,
          rollNumber: pupil.rollNumber || '',
          classExercises: '',
          homework: '',
          project: '',
          classTest: '',
          sbaRaw: '',
          examRaw: '',
          teacherRemark: '',
          isDirty: false
        };
      }
    });

    setGridData(newGrid);
  }, [classPupils, selectedSubjectId, activeTermId, academicAssessments]);

  // Compute live computed scores and ranks for all pupils
  const computedRows = useMemo(() => {
    const rawScores = classPupils.map(p => {
      const row = gridData[p.id] || {
        studentId: p.id,
        studentName: p.name,
        rollNumber: p.rollNumber || '',
        classExercises: '',
        homework: '',
        project: '',
        classTest: '',
        sbaRaw: '',
        examRaw: '',
        teacherRemark: ''
      };

      // Determine SBA Raw Score (either user entered sbaRaw or sum of exercise components)
      let sbaRawNum = parseFloat(row.sbaRaw);
      if (isNaN(sbaRawNum)) {
        const ex = parseFloat(row.classExercises) || 0;
        const hw = parseFloat(row.homework) || 0;
        const pr = parseFloat(row.project) || 0;
        const ct = parseFloat(row.classTest) || 0;
        if (ex || hw || pr || ct) {
          sbaRawNum = ex + hw + pr + ct;
        } else {
          sbaRawNum = 0;
        }
      }

      const examRawNum = parseFloat(row.examRaw) || 0;
      const hasEntries = row.sbaRaw !== '' || row.examRaw !== '' || row.classExercises !== '';

      const computed = computeTotalAssessment(
        sbaRawNum, 
        50, // max SBA
        examRawNum, 
        100, // max Exam
        sbaWeight, 
        examWeight
      );

      return {
        studentId: p.id,
        student: p,
        row,
        hasEntries,
        sbaRawNum,
        examRawNum,
        weightedSba: computed.weightedSba,
        weightedExam: computed.weightedExam,
        totalScore: hasEntries ? computed.totalScore : 0,
        grade: computed.grade,
        description: computed.description,
        level: computed.level,
        autoRemark: computed.remark,
        teacherRemark: row.teacherRemark || computed.remark
      };
    });

    // Rank pupils by total score descending
    const sorted = [...rawScores].sort((a, b) => b.totalScore - a.totalScore);
    const ranks = new Map<string, number>();
    sorted.forEach((item, index) => {
      if (item.hasEntries) {
        ranks.set(item.studentId, index + 1);
      }
    });

    return rawScores.map(r => ({
      ...r,
      position: ranks.get(r.studentId) || 0
    }));
  }, [classPupils, gridData, sbaWeight, examWeight]);

  // Statistics for active subject
  const subjectStats = useMemo(() => {
    const scored = computedRows.filter(r => r.hasEntries);
    if (scored.length === 0) {
      return {
        totalScored: 0,
        meanAverage: 0,
        highestScore: 0,
        lowestScore: 0,
        passRate: 0,
        grade1Count: 0
      };
    }

    const totalSum = scored.reduce((acc, r) => acc + r.totalScore, 0);
    const mean = Math.round((totalSum / scored.length) * 10) / 10;
    const highest = Math.max(...scored.map(r => r.totalScore));
    const lowest = Math.min(...scored.map(r => r.totalScore));
    const passes = scored.filter(r => r.totalScore >= 45).length;
    const passRate = Math.round((passes / scored.length) * 100);
    const g1Count = scored.filter(r => r.grade === 1).length;

    return {
      totalScored: scored.length,
      meanAverage: mean,
      highestScore: highest,
      lowestScore: lowest,
      passRate,
      grade1Count: g1Count
    };
  }, [computedRows]);

  // Handle cell edits
  const handleCellChange = (studentId: string, field: keyof LocalRowState, value: string) => {
    setGridData(prev => {
      const current = prev[studentId] || {
        studentId,
        studentName: '',
        rollNumber: '',
        classExercises: '',
        homework: '',
        project: '',
        classTest: '',
        sbaRaw: '',
        examRaw: '',
        teacherRemark: ''
      };

      return {
        ...prev,
        [studentId]: {
          ...current,
          [field]: value,
          isDirty: true
        }
      };
    });
  };

  // Quick Auto-Fill remarks for all
  const handleAutoGenerateRemarks = () => {
    setGridData(prev => {
      const updated = { ...prev };
      computedRows.forEach(item => {
        if (updated[item.studentId]) {
          updated[item.studentId] = {
            ...updated[item.studentId],
            teacherRemark: item.autoRemark,
            isDirty: true
          };
        }
      });
      return updated;
    });
    if (playFeedbackSound) playFeedbackSound('success');
    setSaveSuccessMsg('Generated smart remarks for all pupils!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Batch Save all marks to AppContext (Firestore & local cache)
  const handleSaveSpreadsheet = async () => {
    setIsSaving(true);
    try {
      const assessmentsToSave: AcademicAssessment[] = computedRows
        .filter(r => r.hasEntries)
        .map(r => {
          return {
            id: `acad_${r.studentId}_${selectedSubject.id}_${activeTermId}`,
            studentId: r.studentId,
            studentName: r.student.name,
            class: selectedClass,
            termId: activeTermId,
            academicYear: academicYear,
            subjectId: selectedSubject.id,
            subjectName: selectedSubject.name,
            classExercisesScore: parseFloat(r.row.classExercises) || undefined,
            homeworkScore: parseFloat(r.row.homework) || undefined,
            projectScore: parseFloat(r.row.project) || undefined,
            classTestScore: parseFloat(r.row.classTest) || undefined,
            sbaRawScore: r.sbaRawNum,
            sbaMaxScore: 50,
            sbaScore: r.weightedSba,
            examRawScore: r.examRawNum,
            examMaxScore: 100,
            examScore: r.weightedExam,
            totalScore: r.totalScore,
            grade: r.grade,
            gradeDescription: r.description,
            achievementLevel: r.level,
            subjectPosition: r.position,
            teacherRemark: r.row.teacherRemark || r.autoRemark,
            enteredBy: currentUser?.name || 'Staff User',
            enteredAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        });

      await batchSaveAcademicAssessments(assessmentsToSave);
      
      // Mark rows as clean
      setGridData(prev => {
        const clean: Record<string, LocalRowState> = {};
        Object.entries(prev).forEach(([k, v]) => {
          clean[k] = { ...(v as LocalRowState), isDirty: false };
        });
        return clean;
      });

      if (playFeedbackSound) playFeedbackSound('success');
      setSaveSuccessMsg(`Successfully saved ${assessmentsToSave.length} mark records!`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error("Failed to save marks spreadsheet:", err);
      if (playFeedbackSound) playFeedbackSound('error');
      alert("Save failed: " + (err.message || 'Unknown database error'));
    } finally {
      setIsSaving(false);
    }
  };

  // Export spreadsheet to Excel (.xlsx)
  const handleExportToExcel = () => {
    const exportRows = computedRows.map((r, idx) => ({
      "No.": idx + 1,
      "Roll Number": r.student.rollNumber || '-',
      "Pupil Full Name": r.student.name,
      "Class": selectedClass,
      "Subject": selectedSubject.name,
      "SBA Raw (/50)": r.sbaRawNum || 0,
      [`SBA Weighted (${sbaWeight}%)`]: r.weightedSba,
      "Exam Raw (/100)": r.examRawNum || 0,
      [`Exam Weighted (${examWeight}%)`]: r.weightedExam,
      "Total Score (100%)": r.totalScore,
      "GES Grade (1-9)": r.grade,
      "NaCCA Level": r.level,
      "Position": r.position ? formatOrdinal(r.position) : '-',
      "Teacher Remarks": r.teacherRemark
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${selectedClass}_${selectedSubject.code}`);
    XLSX.writeFile(workbook, `SBA_Marks_${selectedClass}_${selectedSubject.code}_${activeTermId}.xlsx`);
  };

  // Import from Excel/CSV
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        if (!data || data.length === 0) {
          alert("Imported file contains no recognizable data rows.");
          return;
        }

        let importedCount = 0;
        setGridData(prev => {
          const updated = { ...prev };
          data.forEach(row => {
            // Match pupil by Roll Number or Name
            const roll = String(row['Roll Number'] || row['rollNumber'] || row['Roll'] || '').trim().toLowerCase();
            const name = String(row['Pupil Full Name'] || row['Name'] || row['studentName'] || '').trim().toLowerCase();

            const targetPupil = classPupils.find(p => 
              (roll && (p.rollNumber || '').toLowerCase() === roll) ||
              (name && p.name.toLowerCase() === name)
            );

            if (targetPupil) {
              const sba = row['SBA Raw (/50)'] ?? row['SBA'] ?? row['sbaRaw'] ?? '';
              const exam = row['Exam Raw (/100)'] ?? row['Exam'] ?? row['examRaw'] ?? '';
              const remark = row['Teacher Remarks'] ?? row['Remarks'] ?? '';

              updated[targetPupil.id] = {
                ...updated[targetPupil.id],
                sbaRaw: String(sba),
                examRaw: String(exam),
                teacherRemark: String(remark),
                isDirty: true
              };
              importedCount++;
            }
          });
          return updated;
        });

        alert(`Successfully mapped and imported marks for ${importedCount} pupils! Remember to click 'Save All Marks'.`);
      } catch (err: any) {
        console.error("Failed to parse import file:", err);
        alert("Error parsing file: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isLight = theme === 'daylight';
  const hasUnsavedChanges = Object.values(gridData).some((r: LocalRowState) => Boolean(r.isDirty));

  return (
    <div className="space-y-6">
      {/* Top Class & Subject Selectors Header */}
      <div className={`${isLight ? 'bg-neutral-100 border-neutral-300' : 'bg-neutral-900 border-neutral-800'} border p-5 flex flex-col lg:flex-row gap-5 justify-between items-start lg:items-center`}>
        <div className="space-y-3 w-full lg:w-auto">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase text-amber-400 mr-2 flex items-center gap-1.5">
              <Users size={14} /> Class Gate:
            </span>
            {ALL_CLASSES.map(cls => {
              const isAssigned = accessCheck.assignedClasses.includes(cls) || isHeadOrAdmin(currentUser);
              const isPrimary = accessCheck.primaryClass === cls;
              const isCurrent = selectedClass === cls;

              return (
                <button
                  key={cls}
                  onClick={() => setSelectedClass(cls)}
                  className={`px-3 py-1 text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isCurrent
                      ? 'bg-amber-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      : isLight 
                        ? 'bg-white text-neutral-700 hover:bg-neutral-200 border border-neutral-300' 
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 border border-neutral-700'
                  }`}
                  title={isAssigned ? `You are authorized for ${cls}` : `Restricted: Read-Only access for ${cls}`}
                >
                  <span>{cls}</span>
                  {!isAssigned && (
                    <Lock size={11} className={isCurrent ? 'text-black' : 'text-neutral-500'} />
                  )}
                  {isPrimary && (
                    <span className={`text-[10px] ${isCurrent ? 'text-black' : 'text-amber-400'}`}>★</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-800">
            <span className="text-xs font-mono font-bold uppercase text-blue-400 mr-2 flex items-center gap-1.5">
              <BookOpen size={14} /> Subject:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {classSubjects.map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSubjectId(sub.id)}
                  className={`px-2.5 py-1 text-xs font-mono transition-all cursor-pointer flex items-center gap-1 ${
                    selectedSubjectId === sub.id
                      ? 'bg-blue-500 text-white font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      : isLight ? 'bg-white text-neutral-700 hover:bg-neutral-200' : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'
                  }`}
                  title={sub.name}
                >
                  <span>{sub.code}</span>
                  <span className="hidden sm:inline text-[10px] opacity-80">({sub.name.split(' ')[0]})</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
          <button
            onClick={() => setShowPrintModal(true)}
            className="bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-200 border border-cyan-700/80 px-3 py-2 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Print Official Master Mark Entry Sheet or Blank Classroom Template"
          >
            <Printer size={14} className="text-cyan-400" />
            <span>Print Hardcopy</span>
          </button>

          <button
            onClick={() => setShowClearModal(true)}
            disabled={!effectiveAllowed}
            className={`border px-3 py-2 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors ${
              !effectiveAllowed 
                ? 'opacity-40 cursor-not-allowed bg-neutral-900 border-neutral-800 text-neutral-500' 
                : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-200 border-rose-800/80 cursor-pointer'
            }`}
            title={!effectiveAllowed ? 'Editing locked: Restricted access' : 'Unpopulate / Clear sample marks from database'}
          >
            <RotateCcw size={14} className="text-rose-400" />
            <span>Unpopulate Marks</span>
          </button>

          <button
            onClick={handleAutoGenerateRemarks}
            disabled={!effectiveAllowed}
            className={`border px-3 py-2 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors ${
              !effectiveAllowed 
                ? 'opacity-40 cursor-not-allowed bg-neutral-900 border-neutral-800 text-neutral-500' 
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700 cursor-pointer'
            }`}
            title={!effectiveAllowed ? 'Editing locked: Restricted access' : 'Auto generate remarks based on standard GES grade scale'}
          >
            <Sparkles size={14} className="text-amber-400" />
            <span>Auto Remarks</span>
          </button>

          <button
            onClick={handleExportToExcel}
            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-3 py-2 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download formatted spreadsheet for this subject"
          >
            <Download size={14} className="text-emerald-400" />
            <span>Excel</span>
          </button>

          <label className={`border px-3 py-2 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors ${
            !effectiveAllowed 
              ? 'opacity-40 cursor-not-allowed bg-neutral-900 border-neutral-800 text-neutral-500' 
              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700 cursor-pointer'
          }`}>
            <Upload size={14} className="text-blue-400" />
            <span>Import</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              disabled={!effectiveAllowed}
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={handleSaveSpreadsheet}
            disabled={isSaving || !effectiveAllowed}
            className={`px-5 py-2 text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
              !effectiveAllowed
                ? 'opacity-40 cursor-not-allowed bg-neutral-800 text-neutral-500 border border-neutral-700'
                : hasUnsavedChanges
                ? 'bg-amber-400 hover:bg-amber-300 text-black animate-pulse cursor-pointer'
                : 'bg-emerald-500 hover:bg-emerald-400 text-black cursor-pointer'
            }`}
            title={!effectiveAllowed ? 'Editing locked: Restricted access' : 'Save all marks to cloud database'}
          >
            <Save size={15} />
            <span>{isSaving ? 'Saving Cloud...' : hasUnsavedChanges ? 'Save Changes *' : 'Save All Marks'}</span>
          </button>
        </div>
      </div>

      {/* Security & Access Authorization Banner */}
      {!effectiveAllowed ? (
        <div className="bg-amber-950/40 border-2 border-amber-500/80 p-4 font-mono text-xs text-amber-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500 text-black font-black mt-0.5 shrink-0 shadow-md">
              <ShieldAlert size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-amber-500 text-black text-[10px] font-black uppercase px-2 py-0.5 tracking-wider">
                  🔒 Read-Only Security Mode
                </span>
                <span className="font-bold text-white uppercase tracking-wide">
                  Class {selectedClass} Marks Editing Restricted
                </span>
              </div>
              <p className="text-xs text-amber-300/90 mt-1">
                {accessCheck.reason}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
            {accessCheck.primaryClass && accessCheck.primaryClass !== selectedClass && (
              <button
                onClick={() => setSelectedClass(accessCheck.primaryClass!)}
                className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
              >
                <span>⚡ Switch to My Class ({accessCheck.primaryClass})</span>
              </button>
            )}
            <button
              onClick={() => setShowOverrideModal(true)}
              className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-600 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <KeyRound size={13} className="text-amber-400" />
              <span>Headmaster Override...</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-950/30 border border-emerald-500/50 p-3 font-mono text-xs text-emerald-300 flex flex-wrap items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
            <span className="font-bold text-emerald-200">{accessCheck.reason}</span>
            {isOverrideActive && (
              <span className="bg-amber-400 text-black font-black text-[10px] px-2 py-0.5 uppercase tracking-wider ml-1">
                Temporary Admin Override Active
              </span>
            )}
          </div>
          <div className="text-[11px] text-neutral-400">
            Marks entry & cloud sync active for <span className="text-white font-bold">{selectedClass}</span>
          </div>
        </div>
      )}

      {/* Flexible SBA : Exam Weighting Ratio Selector */}
      <div className={`${isLight ? 'bg-neutral-100 border-neutral-300' : 'bg-neutral-900 border-neutral-800'} border p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-amber-400 font-bold uppercase flex items-center gap-1.5">
            <Sliders size={14} /> Marks Weighting Ratio:
          </span>
          <span className="text-neutral-400 text-[11px] mr-2">Choose assessment proportion:</span>

          <div className="flex flex-wrap gap-1.5">
            {[
              { sba: 50, exam: 50, label: '50 : 50 (Standard)' },
              { sba: 30, exam: 70, label: '30 : 70 (NaCCA / JHS)' },
              { sba: 40, exam: 60, label: '40 : 60 (Primary)' },
              { sba: 20, exam: 80, label: '20 : 80 (Exam Heavy)' },
              { sba: 60, exam: 40, label: '60 : 40 (Project Heavy)' }
            ].map(preset => {
              const isSelected = sbaWeight === preset.sba && examWeight === preset.exam;
              return (
                <button
                  key={`${preset.sba}-${preset.exam}`}
                  onClick={() => handleApplyWeightPreset(preset.sba, preset.exam)}
                  className={`px-3 py-1 text-xs font-mono font-bold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-amber-400 text-black border-amber-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      : isLight ? 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-200' : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}

            <button
              onClick={() => setShowCustomWeightModal(true)}
              className={`px-3 py-1 text-xs font-mono font-bold transition-all cursor-pointer border ${
                ![50, 30, 40, 20, 60].includes(sbaWeight) || examWeight !== 100 - sbaWeight
                  ? 'bg-amber-400 text-black border-amber-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
              }`}
            >
              Custom ({sbaWeight}:{examWeight})...
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-neutral-950/80 px-3 py-1 border border-neutral-800 text-neutral-300">
          <span>Active:</span>
          <span className="text-blue-400 font-bold">SBA {sbaWeight}%</span>
          <span>+</span>
          <span className="text-amber-400 font-bold">Exam {examWeight}%</span>
          <span>=</span>
          <span className="text-emerald-400 font-black">100% Total</span>
        </div>
      </div>

      {/* Real-time Subject Analytics Pill Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className={`${isLight ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-900/90 border-neutral-800'} border p-3`}>
          <span className="text-[10px] font-mono uppercase text-neutral-400 block">Class / Subject</span>
          <span className="text-sm font-black font-mono text-amber-400 truncate block mt-0.5" title={selectedSubject.name}>
            {selectedClass} • {selectedSubject.name}
          </span>
        </div>

        <div className={`${isLight ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-900/90 border-neutral-800'} border p-3`}>
          <span className="text-[10px] font-mono uppercase text-neutral-400 block">Weighted Model</span>
          <span className="text-sm font-black font-mono text-white mt-0.5 block">
            {sbaWeight}% SBA + {examWeight}% Exam
          </span>
        </div>

        <div className={`${isLight ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-900/90 border-neutral-800'} border p-3`}>
          <span className="text-[10px] font-mono uppercase text-neutral-400 block">Subject Mean Average</span>
          <span className={`text-sm font-black font-mono mt-0.5 block ${
            subjectStats.meanAverage >= 70 ? 'text-emerald-400' :
            subjectStats.meanAverage >= 50 ? 'text-blue-400' : 'text-rose-400'
          }`}>
            {subjectStats.meanAverage}%
          </span>
        </div>

        <div className={`${isLight ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-900/90 border-neutral-800'} border p-3`}>
          <span className="text-[10px] font-mono uppercase text-neutral-400 block">High / Low Score</span>
          <span className="text-sm font-black font-mono text-white mt-0.5 block">
            {subjectStats.highestScore}% / {subjectStats.lowestScore}%
          </span>
        </div>

        <div className={`${isLight ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-900/90 border-neutral-800'} border p-3`}>
          <span className="text-[10px] font-mono uppercase text-neutral-400 block">Pass Rate (≥45%)</span>
          <span className="text-sm font-black font-mono text-emerald-400 mt-0.5 block">
            {subjectStats.passRate}% ({subjectStats.totalScored} graded)
          </span>
        </div>

        <div className={`${isLight ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-900/90 border-neutral-800'} border p-3`}>
          <span className="text-[10px] font-mono uppercase text-neutral-400 block">Grade 1 Achievers</span>
          <span className="text-sm font-black font-mono text-amber-400 mt-0.5 block">
            {subjectStats.grade1Count} pupils (≥80%)
          </span>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="bg-emerald-950/60 border border-emerald-500 text-emerald-300 px-4 py-2.5 text-xs font-mono font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Spreadsheet Main Grid */}
      <div className={`${isLight ? 'bg-white border-neutral-300' : 'bg-neutral-900 border-neutral-800'} border overflow-hidden shadow-sm`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className={`${isLight ? 'bg-neutral-200 text-neutral-800' : 'bg-neutral-950 text-neutral-300'} border-b border-neutral-800`}>
                <th className="py-3 px-3 w-10 text-center font-black">#</th>
                <th className="py-3 px-3 min-w-[180px] font-black uppercase">Pupil Name</th>
                <th className="py-3 px-2 w-24 font-black uppercase">Roll #</th>
                <th className="py-3 px-2 w-20 text-center font-bold bg-blue-950/30 text-blue-300" title="Class Exercises (out of 20)">Ex (/20)</th>
                <th className="py-3 px-2 w-20 text-center font-bold bg-blue-950/30 text-blue-300" title="Homework / Project (out of 15)">Hw (/15)</th>
                <th className="py-3 px-2 w-20 text-center font-bold bg-blue-950/30 text-blue-300" title="Class Test (out of 15)">Test (/15)</th>
                <th className="py-3 px-2 w-24 text-center font-black bg-blue-900/40 text-blue-200" title="Raw SBA continuous score out of 50">SBA (/50)</th>
                <th className="py-3 px-2 w-20 text-center font-bold bg-blue-950/50 text-blue-400" title={`Normalized SBA weighted to ${sbaWeight}%`}>SBA {sbaWeight}%</th>
                <th className="py-3 px-2 w-24 text-center font-black bg-amber-950/40 text-amber-300" title="Raw End of Term Exam score out of 100">Exam (/100)</th>
                <th className="py-3 px-2 w-20 text-center font-bold bg-amber-950/50 text-amber-400" title={`Normalized Exam weighted to ${examWeight}%`}>Exam {examWeight}%</th>
                <th className="py-3 px-2 w-24 text-center font-black bg-emerald-950/40 text-emerald-300">Total (100%)</th>
                <th className="py-3 px-2 w-16 text-center font-black">Grade</th>
                <th className="py-3 px-2 w-20 text-center font-black">Level</th>
                <th className="py-3 px-2 w-16 text-center font-black">Rank</th>
                <th className="py-3 px-3 min-w-[220px] font-black uppercase">Teacher Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {computedRows.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-neutral-500 font-mono">
                    No active pupils enrolled in {selectedClass}. Register pupils in Pupil Enrollment tab.
                  </td>
                </tr>
              ) : (
                computedRows.map((item, idx) => {
                  const isGrade1 = item.grade === 1;
                  const isWeak = item.grade >= 8;

                  return (
                    <tr 
                      key={item.studentId}
                      className={`hover:bg-neutral-800/40 transition-colors ${
                        item.row.isDirty ? 'bg-amber-950/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center text-neutral-500 font-bold">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span>{item.student.name}</span>
                          {isGrade1 && <Award size={13} className="text-amber-400 shrink-0" />}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-neutral-400 whitespace-nowrap">
                        {item.student.rollNumber || '-'}
                      </td>

                      {/* Class Exercise Breakdown Inputs */}
                      <td className="py-1 px-1 bg-blue-950/10">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          placeholder="-"
                          value={item.row.classExercises}
                          disabled={!effectiveAllowed}
                          readOnly={!effectiveAllowed}
                          onChange={e => handleCellChange(item.studentId, 'classExercises', e.target.value)}
                          className={`w-full py-1 px-1.5 text-center text-xs font-mono font-bold border focus:outline-none focus:border-blue-400 ${
                            !effectiveAllowed 
                              ? 'cursor-not-allowed bg-neutral-900/60 text-neutral-500 border-neutral-800 opacity-60'
                              : isLight ? 'bg-white border-neutral-300 text-black' : 'bg-neutral-950 border-neutral-700 text-white'
                          }`}
                          title={!effectiveAllowed ? `Editing locked: ${accessCheck.reason}` : undefined}
                        />
                      </td>

                      <td className="py-1 px-1 bg-blue-950/10">
                        <input
                          type="number"
                          min="0"
                          max="15"
                          step="0.5"
                          placeholder="-"
                          value={item.row.homework}
                          disabled={!effectiveAllowed}
                          readOnly={!effectiveAllowed}
                          onChange={e => handleCellChange(item.studentId, 'homework', e.target.value)}
                          className={`w-full py-1 px-1.5 text-center text-xs font-mono font-bold border focus:outline-none focus:border-blue-400 ${
                            !effectiveAllowed 
                              ? 'cursor-not-allowed bg-neutral-900/60 text-neutral-500 border-neutral-800 opacity-60'
                              : isLight ? 'bg-white border-neutral-300 text-black' : 'bg-neutral-950 border-neutral-700 text-white'
                          }`}
                          title={!effectiveAllowed ? `Editing locked: ${accessCheck.reason}` : undefined}
                        />
                      </td>

                      <td className="py-1 px-1 bg-blue-950/10">
                        <input
                          type="number"
                          min="0"
                          max="15"
                          step="0.5"
                          placeholder="-"
                          value={item.row.classTest}
                          disabled={!effectiveAllowed}
                          readOnly={!effectiveAllowed}
                          onChange={e => handleCellChange(item.studentId, 'classTest', e.target.value)}
                          className={`w-full py-1 px-1.5 text-center text-xs font-mono font-bold border focus:outline-none focus:border-blue-400 ${
                            !effectiveAllowed 
                              ? 'cursor-not-allowed bg-neutral-900/60 text-neutral-500 border-neutral-800 opacity-60'
                              : isLight ? 'bg-white border-neutral-300 text-black' : 'bg-neutral-950 border-neutral-700 text-white'
                          }`}
                          title={!effectiveAllowed ? `Editing locked: ${accessCheck.reason}` : undefined}
                        />
                      </td>

                      {/* Raw SBA Total Input or Calculated */}
                      <td className="py-1 px-1 bg-blue-950/20">
                        <input
                          type="number"
                          min="0"
                          max="50"
                          step="0.5"
                          placeholder="SBA"
                          value={item.row.sbaRaw}
                          disabled={!effectiveAllowed}
                          readOnly={!effectiveAllowed}
                          onChange={e => handleCellChange(item.studentId, 'sbaRaw', e.target.value)}
                          className={`w-full py-1 px-1.5 text-center text-xs font-mono font-black border focus:outline-none focus:border-blue-400 ${
                            !effectiveAllowed 
                              ? 'cursor-not-allowed bg-neutral-900/60 text-neutral-500 border-neutral-800 opacity-60'
                              : isLight ? 'bg-blue-50 border-blue-300 text-blue-900' : 'bg-neutral-950 border-blue-900 text-blue-300'
                          }`}
                          title={!effectiveAllowed ? `Editing locked: ${accessCheck.reason}` : undefined}
                        />
                      </td>

                      {/* Weighted SBA */}
                      <td className="py-2.5 px-2 text-center font-bold text-blue-400 bg-blue-950/10">
                        {item.hasEntries ? `${item.weightedSba}` : '-'}
                      </td>

                      {/* Exam Raw Score */}
                      <td className="py-1 px-1 bg-amber-950/20">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          placeholder="Exam"
                          value={item.row.examRaw}
                          disabled={!effectiveAllowed}
                          readOnly={!effectiveAllowed}
                          onChange={e => handleCellChange(item.studentId, 'examRaw', e.target.value)}
                          className={`w-full py-1 px-1.5 text-center text-xs font-mono font-black border focus:outline-none focus:border-amber-400 ${
                            !effectiveAllowed 
                              ? 'cursor-not-allowed bg-neutral-900/60 text-neutral-500 border-neutral-800 opacity-60'
                              : isLight ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-neutral-950 border-amber-900 text-amber-300'
                          }`}
                          title={!effectiveAllowed ? `Editing locked: ${accessCheck.reason}` : undefined}
                        />
                      </td>

                      {/* Weighted Exam */}
                      <td className="py-2.5 px-2 text-center font-bold text-amber-400 bg-amber-950/10">
                        {item.hasEntries ? `${item.weightedExam}` : '-'}
                      </td>

                      {/* Total Score */}
                      <td className={`py-2.5 px-2 text-center font-mono font-black text-sm bg-emerald-950/20 ${
                        item.totalScore >= 80 ? 'text-emerald-400' :
                        item.totalScore >= 65 ? 'text-teal-400' :
                        item.totalScore >= 50 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {item.hasEntries ? `${item.totalScore}%` : '-'}
                      </td>

                      {/* GES Grade (1-9) Badge */}
                      <td className="py-2.5 px-2 text-center">
                        {item.hasEntries ? (
                          <span className={`inline-block w-6 h-6 leading-6 text-center rounded-none font-black text-xs border ${
                            item.grade === 1 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500' :
                            item.grade <= 4 ? 'bg-blue-500/20 text-blue-400 border-blue-500' :
                            item.grade <= 6 ? 'bg-amber-500/20 text-amber-400 border-amber-500' :
                            'bg-rose-500/20 text-rose-400 border-rose-500'
                          }`}>
                            {item.grade}
                          </span>
                        ) : '-'}
                      </td>

                      {/* NaCCA Level */}
                      <td className="py-2.5 px-2 text-center text-[10px] uppercase font-bold text-neutral-300">
                        {item.hasEntries ? item.level : '-'}
                      </td>

                      {/* Position with Medal Badges */}
                      <td className="py-2.5 px-2 text-center font-mono text-xs">
                        {item.position ? (() => {
                          const medal = getRankMedal(item.position);
                          if (medal) {
                            return (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 font-black text-xs border shadow-sm ${medal.bgColor} ${medal.borderColor} ${medal.textColor}`}>
                                <span>{medal.medal}</span>
                                <span>{formatOrdinal(item.position)}</span>
                              </span>
                            );
                          }
                          return (
                            <span className="font-bold text-neutral-400">
                              {formatOrdinal(item.position)}
                            </span>
                          );
                        })() : '-'}
                      </td>

                      {/* Teacher Remarks Input */}
                      <td className="py-1 px-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            placeholder="Teacher's remark..."
                            value={item.row.teacherRemark}
                            disabled={!effectiveAllowed}
                            readOnly={!effectiveAllowed}
                            onChange={e => handleCellChange(item.studentId, 'teacherRemark', e.target.value)}
                            className={`w-full py-1 px-2 text-xs font-mono border focus:outline-none focus:border-amber-400 ${
                              !effectiveAllowed 
                                ? 'cursor-not-allowed bg-neutral-900/60 text-neutral-500 border-neutral-800 opacity-60'
                                : isLight ? 'bg-white border-neutral-300 text-black' : 'bg-neutral-950 border-neutral-700 text-white'
                            }`}
                            title={!effectiveAllowed ? `Editing locked: ${accessCheck.reason}` : undefined}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Headmaster / Admin Security Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className={`${isLight ? 'bg-white text-neutral-900 border-neutral-300' : 'bg-neutral-900 text-white border-neutral-700'} border p-6 max-w-md w-full shadow-2xl space-y-4 font-mono`}>
            <div className="flex items-center justify-between border-b border-neutral-700 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="text-amber-400" size={18} />
                <h3 className="font-bold uppercase tracking-wider text-sm">Headmaster Authorization Override</h3>
              </div>
              <button
                onClick={() => {
                  setShowOverrideModal(false);
                  setOverrideError(null);
                }}
                className="text-neutral-400 hover:text-white p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-amber-950/30 border border-amber-500/40 p-3 text-xs text-amber-200 space-y-1">
              <p className="font-bold">🔐 Supervisory Permission Required</p>
              <p className="text-[11px] text-amber-300/80">
                You are currently viewing <strong className="text-white">Class {selectedClass}</strong> which is restricted for your user profile. Enter Headmaster or Administrator credentials to temporarily unlock editing for this session.
              </p>
            </div>

            {overrideError && (
              <div className="bg-rose-950/40 border border-rose-500/50 p-2.5 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0 text-rose-400" />
                <span>{overrideError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyOverride} className="space-y-3.5">
              <div>
                <label className="block text-xs uppercase font-bold text-neutral-300 mb-1">
                  Administrator / Headmaster Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. admin@alsiratschool.edu.gh"
                  value={overrideAdminEmail}
                  onChange={e => setOverrideAdminEmail(e.target.value)}
                  className={`w-full p-2 text-xs border font-mono ${isLight ? 'bg-white border-neutral-300 text-black' : 'bg-neutral-950 border-neutral-700 text-white'}`}
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-neutral-300 mb-1">
                  Authorization Password / Key
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={overridePassword}
                  onChange={e => setOverridePassword(e.target.value)}
                  className={`w-full p-2 text-xs border font-mono ${isLight ? 'bg-white border-neutral-300 text-black' : 'bg-neutral-950 border-neutral-700 text-white'}`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowOverrideModal(false);
                    setOverrideError(null);
                  }}
                  className="px-3.5 py-2 text-xs font-bold border border-neutral-700 hover:bg-neutral-800 text-neutral-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-black bg-amber-400 hover:bg-amber-300 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                >
                  <Unlock size={13} />
                  <span>Authorize & Unlock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Weighting Modal */}
      {showCustomWeightModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className={`${isLight ? 'bg-white text-neutral-900 border-neutral-300' : 'bg-neutral-900 text-white border-neutral-700'} border p-6 max-w-md w-full shadow-2xl space-y-5 font-mono`}>
            <div className="flex items-center justify-between border-b border-neutral-700 pb-3">
              <div className="flex items-center gap-2">
                <Sliders size={18} className="text-amber-400" />
                <h3 className="font-bold uppercase tracking-wider text-sm">Configure Assessment Weighting</h3>
              </div>
              <button
                onClick={() => setShowCustomWeightModal(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-neutral-400">
              Set custom percentage split for Continuous Assessment (SBA) and End of Term Examination. Must sum to 100%.
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5 font-bold">
                  <span className="text-blue-400">SBA Weight: {tempSba}%</span>
                  <span className="text-amber-400">Exam Weight: {tempExam}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={tempSba}
                  onChange={(e) => {
                    const s = parseInt(e.target.value, 10);
                    setTempSba(s);
                    setTempExam(100 - s);
                  }}
                  className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase font-bold text-blue-400 mb-1">
                    SBA Weight (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={tempSba}
                    onChange={(e) => {
                      const s = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
                      setTempSba(s);
                      setTempExam(100 - s);
                    }}
                    className={`w-full p-2 text-sm font-bold border ${isLight ? 'bg-white border-neutral-300' : 'bg-neutral-950 border-neutral-700'}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase font-bold text-amber-400 mb-1">
                    Exam Weight (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={tempExam}
                    onChange={(e) => {
                      const ex = Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0));
                      setTempExam(ex);
                      setTempSba(100 - ex);
                    }}
                    className={`w-full p-2 text-sm font-bold border ${isLight ? 'bg-white border-neutral-300' : 'bg-neutral-950 border-neutral-700'}`}
                  />
                </div>
              </div>

              <div className="bg-neutral-950/60 p-3 border border-neutral-800 text-[11px] space-y-1 text-neutral-300">
                <div className="flex justify-between">
                  <span>Class Exercises + HW + Project (SBA):</span>
                  <span className="font-bold text-blue-400">{tempSba}%</span>
                </div>
                <div className="flex justify-between">
                  <span>End of Term Examination:</span>
                  <span className="font-bold text-amber-400">{tempExam}%</span>
                </div>
                <div className="flex justify-between border-t border-neutral-800 pt-1 font-bold">
                  <span>Total Calculated Grade:</span>
                  <span className="text-emerald-400">100%</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setShowCustomWeightModal(false)}
                className="px-4 py-2 text-xs font-bold border border-neutral-700 hover:bg-neutral-800 text-neutral-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleApplyWeightPreset(tempSba, tempExam);
                  setShowCustomWeightModal(false);
                }}
                className="px-4 py-2 text-xs font-black bg-amber-400 hover:bg-amber-300 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase tracking-wider"
              >
                Apply Weighting ({tempSba}:{tempExam})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HARDCOPY PRINT PREVIEW MODAL */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-neutral-900 border-2 border-neutral-700 max-w-5xl w-full shadow-2xl rounded-sm flex flex-col max-h-[96vh] my-auto">
            {/* Modal Header & Print Options Toolbar */}
            <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="text-cyan-400" size={20} />
                <div>
                  <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                    Hardcopy Master Mark Sheet • {selectedClass} - {selectedSubject.name}
                  </h3>
                  <p className="text-[11px] text-neutral-400 font-mono">
                    Ghana National Curriculum Standard Assessment Record
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Print Mode Selector */}
                <div className="flex items-center bg-neutral-800 p-1 border border-neutral-700 rounded-xs text-xs font-mono">
                  <button
                    onClick={() => setPrintMode('filled')}
                    className={`px-3 py-1 font-bold rounded-2xs transition-colors ${
                      printMode === 'filled' ? 'bg-cyan-500 text-black shadow-xs' : 'text-neutral-300 hover:text-white'
                    }`}
                  >
                    Master Sheet (With Marks)
                  </button>
                  <button
                    onClick={() => setPrintMode('blank')}
                    className={`px-3 py-1 font-bold rounded-2xs transition-colors ${
                      printMode === 'blank' ? 'bg-amber-400 text-black shadow-xs' : 'text-neutral-300 hover:text-white'
                    }`}
                  >
                    Blank Classroom Form
                  </button>
                </div>

                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-black font-black text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                >
                  <Printer size={15} />
                  <span>Print / Save PDF</span>
                </button>

                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 text-neutral-400 hover:text-white border border-neutral-700 bg-neutral-800 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Printable Paper Preview Container */}
            <div className="p-4 sm:p-6 overflow-y-auto bg-neutral-800/80 flex justify-center">
              <div 
                id="printable-mark-sheet"
                className="bg-white text-slate-900 p-6 sm:p-8 border border-slate-400 shadow-xl max-w-4xl w-full text-xs font-sans print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:w-full"
              >
                {/* Official School Header */}
                <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between gap-4">
                  <div className="w-18 h-18 border border-slate-800 p-1 flex items-center justify-center bg-amber-50/50 shrink-0">
                    <SchoolLogo 
                      size={64}
                      lightBackground={true}
                      logoUrl={academicSettings?.schoolLogoUrl || systemSettings?.schoolLogoUrl || '/school_logo.jpg'}
                    />
                  </div>

                  <div className="text-center flex-1">
                    <h1 className="text-xl font-black font-serif uppercase tracking-tight text-slate-950">
                      {academicSettings?.schoolName || systemSettings?.schoolName || 'SAAKO HOLY CHILD ACADEMY'}
                    </h1>
                    <p className="text-[11px] font-bold text-amber-900 italic">
                      Motto: "{academicSettings?.schoolMotto || systemSettings?.schoolMotto || 'Knowledge is Light'}"
                    </p>
                    <h2 className="text-xs font-black font-mono uppercase tracking-wider text-slate-800 mt-1">
                      {printMode === 'blank' ? 'OFFICIAL CLASSROOM MANUAL MARK ENTRY FORM' : 'CONTINUOUS ASSESSMENT & TERMINAL EXAMINATION MASTER SHEET'}
                    </h2>
                  </div>

                  <div className="text-right text-[10px] font-mono shrink-0 text-slate-700 border-l border-slate-300 pl-3">
                    <div><strong>Year:</strong> {academicYear}</div>
                    <div><strong>Term:</strong> {activeTerm?.name || 'Term 1'}</div>
                    <div><strong>Date:</strong> {new Date().toLocaleDateString('en-GB')}</div>
                  </div>
                </div>

                {/* Meta Details Bar */}
                <div className="grid grid-cols-4 gap-2 border-b border-slate-800 py-2 my-2 text-[11px] font-mono bg-slate-50 px-2">
                  <div>
                    <span className="text-slate-500 uppercase block text-[9px] font-bold">Class:</span>
                    <strong className="text-slate-950 text-sm">{selectedClass}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase block text-[9px] font-bold">Subject:</span>
                    <strong className="text-slate-950">{selectedSubject.name} ({selectedSubject.code})</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase block text-[9px] font-bold">Weighting Ratio:</span>
                    <strong className="text-slate-950">SBA: {sbaWeight}% | Exam: {examWeight}%</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase block text-[9px] font-bold">Pupils Enrolled:</span>
                    <strong className="text-slate-950">{classPupils.length} Pupils</strong>
                  </div>
                </div>

                {/* Mark Table */}
                <table className="w-full border-collapse border border-slate-800 text-[10.5px] mt-2 font-mono">
                  <thead>
                    <tr className="bg-slate-200 text-slate-950 border-b border-slate-800 divide-x divide-slate-800 text-[10px]">
                      <th className="py-1 px-1 text-center w-8">#</th>
                      <th className="py-1 px-1.5 text-center w-16">Roll No</th>
                      <th className="py-1 px-2 text-left">Pupil Full Name</th>
                      {printMode === 'blank' ? (
                        <>
                          <th className="py-1 px-1 text-center w-14">Exercises (/15)</th>
                          <th className="py-1 px-1 text-center w-14">Homework (/10)</th>
                          <th className="py-1 px-1 text-center w-14">Project (/15)</th>
                          <th className="py-1 px-1 text-center w-14">Test (/10)</th>
                          <th className="py-1 px-1 text-center w-16 bg-blue-100 font-bold">SBA Raw (/50)</th>
                          <th className="py-1 px-1 text-center w-16 bg-amber-100 font-bold">Exam (/100)</th>
                          <th className="py-1 px-2 text-left w-28">Remarks</th>
                        </>
                      ) : (
                        <>
                          <th className="py-1 px-1 text-center w-12">SBA Raw (/50)</th>
                          <th className="py-1 px-1 text-center w-12 bg-blue-50">SBA ({sbaWeight}%)</th>
                          <th className="py-1 px-1 text-center w-12">Exam (/100)</th>
                          <th className="py-1 px-1 text-center w-12 bg-amber-50">Exam ({examWeight}%)</th>
                          <th className="py-1 px-1.5 text-center w-14 font-black bg-slate-300">Total (100%)</th>
                          <th className="py-1 px-1 text-center w-10">Grade</th>
                          <th className="py-1 px-1 text-center w-14">Level</th>
                          <th className="py-1 px-1 text-center w-10">Rank</th>
                          <th className="py-1 px-2 text-left">Remarks</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {classPupils.map((pupil, idx) => {
                      const rowComp = computedRows.find(r => r.studentId === pupil.id);
                      const hasMarks = rowComp && rowComp.hasEntries;

                      return (
                        <tr key={pupil.id} className="border-b border-slate-300 divide-x divide-slate-300 hover:bg-slate-50">
                          <td className="py-1 px-1 text-center text-slate-500 font-bold">{idx + 1}</td>
                          <td className="py-1 px-1.5 text-center font-bold">{pupil.rollNumber || '-'}</td>
                          <td className="py-1 px-2 font-bold text-slate-900">{pupil.name}</td>
                          
                          {printMode === 'blank' ? (
                            <>
                              <td className="py-1 px-1 text-center h-6"></td>
                              <td className="py-1 px-1 text-center h-6"></td>
                              <td className="py-1 px-1 text-center h-6"></td>
                              <td className="py-1 px-1 text-center h-6"></td>
                              <td className="py-1 px-1 text-center bg-blue-50/40"></td>
                              <td className="py-1 px-1 text-center bg-amber-50/40"></td>
                              <td className="py-1 px-2 text-left"></td>
                            </>
                          ) : (
                            <>
                              <td className="py-1 px-1 text-center">{hasMarks ? (rowComp.sbaRawNum || '0') : '-'}</td>
                              <td className="py-1 px-1 text-center font-bold bg-blue-50/40 text-blue-900">{hasMarks ? rowComp.weightedSba : '-'}</td>
                              <td className="py-1 px-1 text-center">{hasMarks ? (rowComp.examRawNum || '0') : '-'}</td>
                              <td className="py-1 px-1 text-center font-bold bg-amber-50/40 text-amber-900">{hasMarks ? rowComp.weightedExam : '-'}</td>
                              <td className="py-1 px-1.5 text-center font-black bg-slate-100 text-slate-950">{hasMarks ? rowComp.totalScore : '-'}</td>
                              <td className="py-1 px-1 text-center font-black text-slate-900">{hasMarks ? rowComp.grade : '-'}</td>
                              <td className="py-1 px-1 text-center text-[9.5px]">{hasMarks ? rowComp.level : '-'}</td>
                              <td className="py-1 px-1 text-center font-bold">{hasMarks && rowComp.position ? formatOrdinal(rowComp.position) : '-'}</td>
                              <td className="py-1 px-2 text-left text-[9.5px] text-slate-700">{hasMarks ? (rowComp.teacherRemark || rowComp.autoRemark) : '-'}</td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Statistics Footer (For filled master sheet) */}
                {printMode === 'filled' && (
                  <div className="mt-3 grid grid-cols-5 border border-slate-800 bg-slate-100 p-2 text-center text-[10px] font-mono divide-x divide-slate-800">
                    <div>
                      <span className="text-slate-600 block">Total Assessed:</span>
                      <strong>{subjectStats.totalScored} / {classPupils.length}</strong>
                    </div>
                    <div>
                      <span className="text-slate-600 block">Class Mean:</span>
                      <strong>{subjectStats.meanAverage}%</strong>
                    </div>
                    <div>
                      <span className="text-slate-600 block">Highest / Lowest:</span>
                      <strong>{subjectStats.highestScore}% / {subjectStats.lowestScore}%</strong>
                    </div>
                    <div>
                      <span className="text-slate-600 block">Pass Rate (≥45%):</span>
                      <strong>{subjectStats.passRate}%</strong>
                    </div>
                    <div>
                      <span className="text-slate-600 block">Distinction (Grade 1):</span>
                      <strong>{subjectStats.grade1Count} Pupils</strong>
                    </div>
                  </div>
                )}

                {/* Signatures & Certification Footer */}
                <div className="mt-6 pt-4 border-t-2 border-slate-800 grid grid-cols-3 gap-4 text-center font-mono text-[10px]">
                  <div>
                    <div className="border-b border-slate-800 pb-1 mb-1 font-bold text-slate-800">
                      {currentUser?.name || '__________________________'}
                    </div>
                    <span className="text-slate-600">Subject Teacher Signature</span>
                  </div>
                  <div>
                    <div className="border-b border-slate-800 pb-1 mb-1 font-bold text-slate-800">
                      __________________________
                    </div>
                    <span className="text-slate-600">Class Teacher Verification</span>
                  </div>
                  <div>
                    <div className="border-b border-slate-800 pb-1 mb-1 font-bold text-slate-800">
                      __________________________
                    </div>
                    <span className="text-slate-600">Headmaster / Academic Officer Seal</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UNPOPULATE / CLEAR MARKS MODAL */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-neutral-900 text-white border-2 border-rose-600/80 p-6 max-w-md w-full shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <RotateCcw size={18} />
                <h3 className="font-bold uppercase tracking-wider text-sm">Unpopulate / Clear Marks</h3>
              </div>
              <button
                onClick={() => setShowClearModal(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Select which assessment marks to clear. This will reset the marks in the local cache and synchronize removal to Cloud Firestore.
            </p>

            <div className="space-y-2.5">
              <label className={`flex items-start gap-3 p-3 border cursor-pointer transition-colors ${
                clearScope === 'subject' ? 'bg-rose-950/40 border-rose-500' : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
              }`}>
                <input
                  type="radio"
                  name="clearScope"
                  checked={clearScope === 'subject'}
                  onChange={() => setClearScope('subject')}
                  className="mt-0.5 accent-rose-500"
                />
                <div>
                  <div className="text-xs font-bold text-white">
                    Clear Active Subject Only ({selectedSubject.name} - {selectedClass})
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Resets SBA and Exam marks entered for this subject in class {selectedClass}.
                  </div>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 border cursor-pointer transition-colors ${
                clearScope === 'class' ? 'bg-rose-950/40 border-rose-500' : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
              }`}>
                <input
                  type="radio"
                  name="clearScope"
                  checked={clearScope === 'class'}
                  onChange={() => setClearScope('class')}
                  className="mt-0.5 accent-rose-500"
                />
                <div>
                  <div className="text-xs font-bold text-white">
                    Clear Entire Class Marks ({selectedClass})
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Clears assessment marks across ALL subjects for students in {selectedClass}.
                  </div>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 border cursor-pointer transition-colors ${
                clearScope === 'all' ? 'bg-rose-950/40 border-rose-500' : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
              }`}>
                <input
                  type="radio"
                  name="clearScope"
                  checked={clearScope === 'all'}
                  onChange={() => setClearScope('all')}
                  className="mt-0.5 accent-rose-500"
                />
                <div>
                  <div className="text-xs font-bold text-rose-300 flex items-center gap-1">
                    <span>⚡ School-Wide Clean Slate (Unpopulate All Sample Marks)</span>
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Purges all demo/sample marks across every class in the school for a clean term start.
                  </div>
                </div>
              </label>
            </div>

            {clearScope === 'all' && (
              <div className="bg-rose-950/30 border border-rose-700/80 p-3 space-y-2 text-xs">
                <span className="text-rose-300 font-bold block">
                  Confirmation Required:
                </span>
                <p className="text-[11px] text-rose-200">
                  Type <strong>UNPOPULATE</strong> below to confirm purge of all marks across the entire school:
                </p>
                <input
                  type="text"
                  placeholder="UNPOPULATE"
                  value={clearConfirmationText}
                  onChange={(e) => setClearConfirmationText(e.target.value)}
                  className="w-full p-2 bg-black border border-rose-500 text-white font-mono font-bold text-xs"
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 text-xs font-bold border border-neutral-700 hover:bg-neutral-800 text-neutral-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearMarksConfirm}
                disabled={isClearing || (clearScope === 'all' && clearConfirmationText.trim().toUpperCase() !== 'UNPOPULATE')}
                className={`px-5 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                  isClearing || (clearScope === 'all' && clearConfirmationText.trim().toUpperCase() !== 'UNPOPULATE')
                    ? 'opacity-40 cursor-not-allowed bg-neutral-800 text-neutral-500'
                    : 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer'
                }`}
              >
                <Trash2 size={14} />
                <span>{isClearing ? 'Clearing Marks...' : 'Confirm Clear'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
