/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { StudentClass, ALL_CLASSES, Student, AcademicAssessment, TerminalReport } from '../../types';
import { 
  Printer, Download, Edit3, CheckCircle2, ChevronLeft, ChevronRight, 
  Sparkles, Award, User, Calendar, BookOpen, Layers, Users, 
  Search, ShieldCheck, Check, Save, Sliders, DollarSign, CreditCard,
  AlertCircle, Star, BadgeCheck, CheckCircle
} from 'lucide-react';
import { 
  getSubjectsForClass, 
  formatOrdinal, 
  calculateGESGrade,
  generateClassTeacherRemark,
  generateHeadteacherRemark,
  getRankMedal,
  isJhsClass,
  isPreschoolOrPrimary,
  computeJhsBeceAggregate
} from '../../utils/ghanaCurriculum';
import { calculateStudentFeeStatus, isTermPayer } from '../../utils/feeCalculator';
import { SchoolLogo } from '../SchoolLogo';

interface TerminalReportGeneratorProps {
  initialStudentId?: string;
}

export const TerminalReportGenerator: React.FC<TerminalReportGeneratorProps> = ({
  initialStudentId
}) => {
  const { 
    students = [], 
    academicAssessments = [], 
    terminalReports = [],
    saveTerminalReport,
    payments = [],
    activeTerm,
    systemSettings,
    academicSettings,
    theme,
    currentUser,
    playFeedbackSound
  } = useApp();

  const [selectedClass, setSelectedClass] = useState<StudentClass>('B1');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (initialStudentId) return initialStudentId;
    const firstInB1 = students.find(s => s.active && s.class === 'B1');
    return firstInB1 ? firstInB1.id : students[0]?.id || '';
  });

  const [searchFilter, setSearchFilter] = useState('');
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showFeeStatusLocal, setShowFeeStatusLocal] = useState<boolean>(academicSettings?.showFeeStatusOnReport ?? true);

  // Editable report fields state
  const [editConduct, setEditConduct] = useState('');
  const [editAttitude, setEditAttitude] = useState('');
  const [editInterest, setEditInterest] = useState('');
  const [editTeacherRemark, setEditTeacherRemark] = useState('');
  const [editHeadRemark, setEditHeadRemark] = useState('');
  const [editPromotedTo, setEditPromotedTo] = useState('');
  const [editDaysPresent, setEditDaysPresent] = useState<number>(58);
  const [editTotalDays, setEditTotalDays] = useState<number>(60);
  const [isSaving, setIsSaving] = useState(false);

  const activeTermId = activeTerm?.id || 'term_1_2026';
  const academicYear = academicSettings?.academicYear || '2025/2026';
  const sbaWeight = academicSettings?.sbaWeight ?? 50;
  const examWeight = academicSettings?.examWeight ?? 50;

  // Filter students in current class
  const classPupils = useMemo(() => {
    return students
      .filter(s => s.active && s.class === selectedClass)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, selectedClass]);

  // Keep selected student synced when class changes if needed
  const activeStudent = useMemo(() => {
    const found = students.find(s => s.id === selectedStudentId);
    if (found && found.class === selectedClass) return found;
    return classPupils[0] || null;
  }, [students, selectedStudentId, selectedClass, classPupils]);

  // If initialStudentId was given, sync class
  React.useEffect(() => {
    if (initialStudentId) {
      const s = students.find(x => x.id === initialStudentId);
      if (s) {
        setSelectedClass(s.class);
        setSelectedStudentId(s.id);
      }
    }
  }, [initialStudentId, students]);

  // Fast indexed maps for O(1) mark and terminal report lookups
  const assessmentsByStudentMap = useMemo(() => {
    const map = new Map<string, AcademicAssessment[]>();
    for (const a of academicAssessments) {
      if (a.termId === activeTermId || !a.termId) {
        const arr = map.get(a.studentId);
        if (arr) {
          arr.push(a);
        } else {
          map.set(a.studentId, [a]);
        }
      }
    }
    return map;
  }, [academicAssessments, activeTermId]);

  const assessmentByKeyMap = useMemo(() => {
    const map = new Map<string, AcademicAssessment>();
    for (const a of academicAssessments) {
      if (a.termId === activeTermId || !a.termId) {
        map.set(`${a.studentId}_${a.subjectId}`, a);
      }
    }
    return map;
  }, [academicAssessments, activeTermId]);

  const terminalReportsMap = useMemo(() => {
    const map = new Map<string, TerminalReport>();
    for (const r of terminalReports) {
      if (r.termId === activeTermId || !r.termId) {
        map.set(r.studentId, r);
      }
    }
    return map;
  }, [terminalReports, activeTermId]);

  // Fast precalculated fee summary map
  const pupilFeeStatusMap = useMemo(() => {
    const map = new Map<string, {
      termFee: number;
      totalPaid: number;
      balance: number;
      isCleared: boolean;
      status: 'Cleared' | 'Partially Paid' | 'Arrears Outstanding';
      isDailyPayer: boolean;
      chargeableDaysCount: number;
      dailyRate: number;
      advanceCredit: number;
    }>();

    for (const pupil of classPupils) {
      const feeSummary = calculateStudentFeeStatus(pupil, payments, activeTerm, systemSettings);
      const isDaily = !isTermPayer(pupil);
      const termFee = isDaily ? feeSummary.expectedFee : feeSummary.effectiveTermFee;
      const totalPaid = feeSummary.totalPaid;
      const balance = feeSummary.currentArrears;
      const isCleared = balance <= 0;
      let status: 'Cleared' | 'Partially Paid' | 'Arrears Outstanding' = 'Cleared';
      if (!isCleared) {
        status = totalPaid > 0 ? 'Partially Paid' : 'Arrears Outstanding';
      }
      map.set(pupil.id, {
        termFee,
        totalPaid,
        balance,
        isCleared,
        status,
        isDailyPayer: isDaily,
        chargeableDaysCount: feeSummary.chargeableDaysCount,
        dailyRate: feeSummary.dailyRate,
        advanceCredit: feeSummary.advanceCredit
      });
    }
    return map;
  }, [classPupils, payments, activeTerm, systemSettings]);

  // Calculate student ranks and aggregates across class
  const classRankingMap = useMemo(() => {
    const rankings = classPupils.map(pupil => {
      const pMarks = assessmentsByStudentMap.get(pupil.id) || [];

      const totalScore = pMarks.reduce((acc, m) => acc + (m.totalScore || 0), 0);
      const avg = pMarks.length > 0 ? Math.round((totalScore / pMarks.length) * 10) / 10 : 0;
      
      const isJhs = isJhsClass(pupil.class);
      let aggregate: number | null = null;
      let jhsDetails: any = null;

      if (isJhs) {
        const jhsRes = computeJhsBeceAggregate(pMarks, pupil.class);
        aggregate = jhsRes.aggregate;
        jhsDetails = jhsRes;
      }

      return {
        studentId: pupil.id,
        totalScore,
        averageScore: avg,
        aggregate,
        jhsDetails,
        marksCount: pMarks.length
      };
    });

    rankings.sort((a, b) => b.averageScore - a.averageScore);

    const map = new Map<string, { 
      position: number; 
      totalPupils: number; 
      avg: number; 
      total: number; 
      aggregate: number | null;
      jhsDetails?: any;
    }>();

    rankings.forEach((item, idx) => {
      map.set(item.studentId, {
        position: idx + 1,
        totalPupils: rankings.length,
        avg: item.averageScore,
        total: item.totalScore,
        aggregate: item.aggregate,
        jhsDetails: item.jhsDetails
      });
    });

    return map;
  }, [classPupils, assessmentsByStudentMap]);

  // Helper to calculate student fee status (incorporating attendance days for Daily Payers)
  const getPupilFeeStatus = (pupilId: string, pupilClass: StudentClass) => {
    const cached = pupilFeeStatusMap.get(pupilId);
    if (cached) return cached;

    const pupil = students.find(s => s.id === pupilId);
    if (!pupil) {
      return {
        termFee: 350,
        totalPaid: 0,
        balance: 0,
        isCleared: true,
        status: 'Cleared' as const,
        isDailyPayer: false,
        chargeableDaysCount: 0,
        dailyRate: 5.0,
        advanceCredit: 0
      };
    }

    const feeSummary = calculateStudentFeeStatus(pupil, payments, activeTerm, systemSettings);
    const isDaily = !isTermPayer(pupil);
    const termFee = isDaily ? feeSummary.expectedFee : feeSummary.effectiveTermFee;
    const totalPaid = feeSummary.totalPaid;
    const balance = feeSummary.currentArrears;
    const isCleared = balance <= 0;
    
    let status: 'Cleared' | 'Partially Paid' | 'Arrears Outstanding' = 'Cleared';
    if (!isCleared) {
      status = totalPaid > 0 ? 'Partially Paid' : 'Arrears Outstanding';
    }

    return {
      termFee,
      totalPaid,
      balance,
      isCleared,
      status,
      isDailyPayer: isDaily,
      chargeableDaysCount: feeSummary.chargeableDaysCount,
      dailyRate: feeSummary.dailyRate,
      advanceCredit: feeSummary.advanceCredit
    };
  };

  // Get marks for active student
  const studentMarks = useMemo(() => {
    if (!activeStudent) return [];
    const subjects = getSubjectsForClass(
      activeStudent.class, 
      academicSettings?.customSubjects, 
      academicSettings?.disabledSubjectIds
    );
    
    return subjects.map(sub => {
      const mark = assessmentByKeyMap.get(`${activeStudent.id}_${sub.id}`);

      return {
        subject: sub,
        mark: mark || null,
        sbaScore: mark?.sbaScore ?? '-',
        examScore: mark?.examScore ?? '-',
        totalScore: mark?.totalScore ?? '-',
        grade: mark?.grade ?? '-',
        level: mark?.achievementLevel ?? '-',
        position: mark?.subjectPosition ? formatOrdinal(mark.subjectPosition) : '-',
        remark: mark?.teacherRemark ?? '-'
      };
    });
  }, [activeStudent, assessmentByKeyMap, academicSettings?.customSubjects, academicSettings?.disabledSubjectIds]);

  // Existing saved report or defaults
  const currentSavedReport = useMemo(() => {
    if (!activeStudent) return null;
    return terminalReportsMap.get(activeStudent.id) || null;
  }, [terminalReportsMap, activeStudent]);

  const activeStats = useMemo(() => {
    if (!activeStudent) return { position: 1, totalPupils: 1, avg: 0, total: 0, aggregate: 6 };
    return classRankingMap.get(activeStudent.id) || { position: 1, totalPupils: classPupils.length, avg: 0, total: 0, aggregate: 6 };
  }, [activeStudent, classRankingMap, classPupils]);

  // Populate edit modal fields when opened
  const handleOpenEditModal = () => {
    if (!activeStudent) return;
    const defaultDaysTotal = activeTerm?.daysCount || 60;
    const defaultDaysPres = Math.min(defaultDaysTotal, defaultDaysTotal - 2);

    setEditDaysPresent(currentSavedReport?.daysPresent ?? defaultDaysPres);
    setEditTotalDays(currentSavedReport?.totalDays ?? defaultDaysTotal);
    setEditConduct(currentSavedReport?.conduct || 'Respectful, disciplined, obedient and shows high moral integrity.');
    setEditAttitude(currentSavedReport?.attitude || 'Demonstrates keen interest in academic tasks and actively participates.');
    setEditInterest(currentSavedReport?.interest || 'Science experiments, Creative arts, Reading & Sports.');
    setEditTeacherRemark(
      currentSavedReport?.classTeacherRemarks || 
      generateClassTeacherRemark(activeStats.avg, defaultDaysPres, defaultDaysTotal)
    );
    setEditHeadRemark(
      currentSavedReport?.headteacherRemarks || 
      generateHeadteacherRemark(activeStats.position, activeStats.totalPupils, activeStats.avg)
    );
    setEditPromotedTo(currentSavedReport?.promotedTo || '');
    setIsEditModalOpen(true);
  };

  // Save report card metadata
  const handleSaveReportMeta = async () => {
    if (!activeStudent) return;
    setIsSaving(true);
    try {
      const feeInfo = getPupilFeeStatus(activeStudent.id, activeStudent.class);
      const reportData: TerminalReport = {
        id: currentSavedReport?.id || `rep_${activeStudent.id}_${activeTermId}`,
        studentId: activeStudent.id,
        studentName: activeStudent.name,
        rollNumber: activeStudent.rollNumber || '',
        class: activeStudent.class,
        termId: activeTermId,
        academicYear: academicYear,
        termName: activeTerm?.name || 'Term 1',
        daysPresent: editDaysPresent,
        totalDays: editTotalDays,
        conduct: editConduct,
        attitude: editAttitude,
        interest: editInterest,
        classTeacherRemarks: editTeacherRemark,
        headteacherRemarks: editHeadRemark,
        promotedTo: editPromotedTo || undefined,
        positionInClass: activeStats.position,
        totalClassPupils: activeStats.totalPupils,
        totalScore: activeStats.total,
        averageScore: activeStats.avg,
        aggregateGrade: activeStats.aggregate,
        reopeningDate: academicSettings?.nextTermReopeningDate || '2026-09-08',
        vacationDate: academicSettings?.vacationDate || '2026-07-24',
        feeStatus: {
          termFee: feeInfo.termFee,
          amountPaid: feeInfo.totalPaid,
          balance: feeInfo.balance,
          status: feeInfo.status
        },
        verified: true,
        updatedAt: new Date().toISOString()
      };

      await saveTerminalReport(reportData);
      setIsEditModalOpen(false);
      if (playFeedbackSound) playFeedbackSound('success');
    } catch (err: any) {
      console.error("Failed to save terminal report:", err);
      if (playFeedbackSound) playFeedbackSound('error');
      alert("Error saving report: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Print trigger
  const handlePrint = () => {
    window.print();
  };

  // Switch student
  const handleNextStudent = () => {
    const curIdx = classPupils.findIndex(p => p.id === activeStudent?.id);
    if (curIdx < classPupils.length - 1) {
      setSelectedStudentId(classPupils[curIdx + 1].id);
    }
  };

  const handlePrevStudent = () => {
    const curIdx = classPupils.findIndex(p => p.id === activeStudent?.id);
    if (curIdx > 0) {
      setSelectedStudentId(classPupils[curIdx - 1].id);
    }
  };

  const isLight = theme === 'daylight';
  const schoolName = systemSettings?.schoolName || 'SAAKO HOLY CHILD ACADEMY';
  const schoolMotto = academicSettings?.schoolMotto || systemSettings?.customMotto || 'Holiness is our Key';
  const schoolAddress = academicSettings?.schoolAddress || 'P. O. Box LS 15, Sawla-Savannah Region, Ghana.';
  const schoolPhone = academicSettings?.schoolPhone || '0545029200 / 0507274133';
  const headName = academicSettings?.headteacherName || 'Yakubu Hakeem';
  const headTitle = academicSettings?.headteacherTitle || 'Headmaster';
  const showFeeStatus = showFeeStatusLocal;

  return (
    <div className="space-y-6">
      {/* Top Control Bar (Hidden in Print) */}
      <div className={`print:hidden ${isLight ? 'bg-neutral-100 border-neutral-300' : 'bg-neutral-900 border-neutral-800'} border p-4 flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono font-bold uppercase text-amber-400">Class:</span>
          {ALL_CLASSES.map(cls => (
            <button
              key={cls}
              onClick={() => {
                setSelectedClass(cls);
                const first = students.find(s => s.active && s.class === cls);
                if (first) setSelectedStudentId(first.id);
              }}
              className={`px-2.5 py-1 text-xs font-mono font-bold transition-all cursor-pointer ${
                selectedClass === cls
                  ? 'bg-amber-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : isLight ? 'bg-white text-neutral-700 hover:bg-neutral-200' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              {cls}
            </button>
          ))}
        </div>

        {/* Pupil Selector, Fee Toggle & Print Actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end">
          <div className="flex items-center gap-1 bg-neutral-800 border border-neutral-700 p-1">
            <button
              onClick={handlePrevStudent}
              disabled={classPupils.findIndex(p => p.id === activeStudent?.id) <= 0}
              className="p-1 hover:bg-neutral-700 disabled:opacity-30 text-white cursor-pointer"
              title="Previous Pupil"
            >
              <ChevronLeft size={16} />
            </button>

            <select
              value={activeStudent?.id || ''}
              onChange={e => setSelectedStudentId(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-white px-2 py-1 focus:outline-none max-w-[180px]"
            >
              {classPupils.map(p => (
                <option key={p.id} value={p.id} className="bg-neutral-900 text-white">
                  {p.name} ({p.rollNumber || 'No Roll'})
                </option>
              ))}
            </select>

            <button
              onClick={handleNextStudent}
              disabled={classPupils.findIndex(p => p.id === activeStudent?.id) >= classPupils.length - 1}
              className="p-1 hover:bg-neutral-700 disabled:opacity-30 text-white cursor-pointer"
              title="Next Pupil"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Fee Status Toggle */}
          <button
            onClick={() => setShowFeeStatusLocal(!showFeeStatusLocal)}
            className={`px-3 py-2 text-xs font-mono font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
              showFeeStatusLocal
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500'
                : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-neutral-200'
            }`}
            title="Toggle fee balance & payment clearance display on report card"
          >
            <CreditCard size={14} className={showFeeStatusLocal ? 'text-emerald-400' : 'text-neutral-400'} />
            <span>Fees on Report: {showFeeStatusLocal ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={handleOpenEditModal}
            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-3 py-2 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Edit conduct, attitude and remarks for this report"
          >
            <Edit3 size={14} className="text-amber-400" />
            <span>Edit Remarks</span>
          </button>

          <button
            onClick={() => setIsBatchMode(!isBatchMode)}
            className={`px-3 py-2 text-xs font-mono font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
              isBatchMode 
                ? 'bg-blue-600 text-white border-blue-500' 
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
            }`}
            title="Toggle batch view of all pupils in class for bulk printing"
          >
            <Layers size={14} />
            <span>{isBatchMode ? 'Single View' : `Batch Class (${classPupils.length})`}</span>
          </button>

          <button
            onClick={handlePrint}
            className="bg-amber-400 hover:bg-amber-300 text-black px-4 py-2 text-xs font-mono font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
          >
            <Printer size={15} />
            <span>{isBatchMode ? `Print All (${classPupils.length})` : 'Print Report'}</span>
          </button>
        </div>
      </div>

      {/* SINGLE REPORT VIEW / BATCH REPORT CONTAINER */}
      <div className="space-y-8">
        {(isBatchMode ? classPupils : [activeStudent]).map((pupil, pupilIdx) => {
          if (!pupil) return null;

          const savedRep = terminalReportsMap.get(pupil.id);

          const pupilStats = classRankingMap.get(pupil.id) || {
            position: 1,
            totalPupils: classPupils.length,
            avg: 0,
            total: 0,
            aggregate: 6
          };

          const pSubjects = getSubjectsForClass(
            pupil.class, 
            academicSettings?.customSubjects, 
            academicSettings?.disabledSubjectIds
          );
          const pMarks = pSubjects.map(sub => {
            const mark = assessmentByKeyMap.get(`${pupil.id}_${sub.id}`);
            return {
              subject: sub,
              mark,
              sba: mark ? mark.sbaScore : '-',
              exam: mark ? mark.examScore : '-',
              total: mark ? mark.totalScore : '-',
              grade: mark ? mark.grade : '-',
              level: mark ? mark.achievementLevel : '-',
              pos: mark?.subjectPosition ? formatOrdinal(mark.subjectPosition) : '-',
              remark: mark ? (mark.teacherRemark || mark.gradeDescription) : '-'
            };
          });

          const daysPres = savedRep?.daysPresent ?? 58;
          const daysTot = savedRep?.totalDays ?? (activeTerm?.daysCount || 60);
          const conductTxt = savedRep?.conduct || 'Respectful, disciplined, obedient and shows high moral integrity.';
          const attitudeTxt = savedRep?.attitude || 'Demonstrates keen interest in academic tasks and actively participates.';
          const interestTxt = savedRep?.interest || 'Science experiments, Creative arts, Reading & Sports.';
          const teacherRem = savedRep?.classTeacherRemarks || generateClassTeacherRemark(pupilStats.avg, daysPres, daysTot);
          const headRem = savedRep?.headteacherRemarks || generateHeadteacherRemark(pupilStats.position, pupilStats.totalPupils, pupilStats.avg);
          const reopenDate = savedRep?.reopeningDate || academicSettings?.nextTermReopeningDate || '2026-09-08';
          const vacDate = savedRep?.vacationDate || academicSettings?.vacationDate || '2026-07-24';

          const medalInfo = getRankMedal(pupilStats.position);
          const feeStatusInfo = getPupilFeeStatus(pupil.id, pupil.class);

          return (
            <div 
              key={pupil.id}
              className="bg-white text-slate-900 p-7 sm:p-9 border-4 border-slate-900 max-w-4xl mx-auto shadow-2xl print:shadow-none print:border-2 print:border-black print:p-5 print:m-0 print:max-w-none print:w-full break-after-page rounded-sm relative overflow-hidden"
              style={{ minHeight: '1080px' }}
            >
              {/* Top Decorative Gold/Navy Accent Stripe */}
              <div className="h-2.5 bg-gradient-to-r from-slate-900 via-amber-500 to-slate-900 -mx-9 -mt-9 mb-6 print:hidden" />

              {/* Official Ghanaian School Header with Logo */}
              <div className="border-b-2 border-slate-900 pb-4 text-center relative">
                <div className="flex items-center justify-between gap-4">
                  {/* Left School Logo */}
                  <div className="w-24 h-24 sm:w-28 sm:h-28 border-2 border-slate-800 p-1 flex items-center justify-center bg-amber-50/50 shrink-0 shadow-xs rounded-sm overflow-hidden">
                    <SchoolLogo 
                      size={96}
                      lightBackground={true}
                      logoUrl={academicSettings?.schoolLogoUrl || systemSettings?.schoolLogoUrl || '/school_logo.jpg'}
                      className="max-h-full max-w-full"
                    />
                  </div>

                  {/* Center School Identity */}
                  <div className="flex-1 text-center">
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-serif uppercase text-slate-950">
                      {schoolName}
                    </h1>
                    
                    {/* Official Motto */}
                    <div className="inline-flex items-center gap-1.5 my-0.5">
                      <span className="text-xs font-mono font-bold text-amber-800 bg-amber-100/90 px-3 py-0.5 border border-amber-300 rounded-full italic shadow-2xs">
                        Motto: "{schoolMotto}"
                      </span>
                    </div>

                    <p className="text-[11px] font-mono font-semibold text-slate-700 mt-1">
                      {schoolAddress}
                    </p>
                    <p className="text-[11px] font-mono font-bold text-slate-900">
                      Tel: {schoolPhone}
                    </p>

                    <div className="inline-block mt-2 bg-slate-900 text-amber-300 px-5 py-1 text-xs font-mono font-black uppercase tracking-wider border border-amber-400/40 shadow-xs">
                      GHANA BASIC EDUCATION TERMINAL REPORT CARD
                    </div>
                  </div>

                  {/* Right Pupil Photo Box */}
                  <div className="w-22 h-28 border-2 border-slate-800 p-0.5 bg-slate-50 flex flex-col items-center justify-center shrink-0 shadow-xs">
                    {pupil.photoUrl ? (
                      <img 
                        src={pupil.photoUrl} 
                        alt={pupil.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-1">
                        <User size={30} className="mx-auto text-slate-400" />
                        <span className="text-[8px] font-mono uppercase font-bold text-slate-500 block leading-tight mt-1">Pupil Photo</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* MEDAL & RANKING CITATION BANNER (For Top 3 Pupils) */}
              {medalInfo && (
                <div className={`mt-3 p-2 border-2 ${medalInfo.borderColor} ${medalInfo.bgColor} flex items-center justify-between gap-3 text-xs font-mono shadow-xs`}>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{medalInfo.medal}</span>
                    <div>
                      <span className={`font-black uppercase tracking-wider block ${medalInfo.textColor}`}>
                        {medalInfo.title}
                      </span>
                      <span className="text-[10px] text-slate-700 font-semibold block">
                        Ranked {formatOrdinal(pupilStats.position)} of {pupilStats.totalPupils} in {pupil.class} • Terminal Average: {pupilStats.avg}%
                      </span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider border ${medalInfo.borderColor} bg-white shadow-2xs`}>
                    {medalInfo.badgeLabel}
                  </span>
                </div>
              )}

              {/* Pupil Bio Information Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono border-b border-slate-800 py-3 bg-slate-50/60 px-2 mt-2">
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-semibold">Pupil Full Name:</span>
                  <span className="font-black text-slate-950 text-sm uppercase">{pupil.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-semibold">Roll / ID Number:</span>
                  <span className="font-bold text-slate-900">{pupil.rollNumber || 'SHCA-00' + (pupilIdx + 1)}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-semibold">Class / Grade:</span>
                  <span className="font-black text-slate-950">{pupil.class}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-semibold">Academic Term & Year:</span>
                  <span className="font-bold text-slate-900">{activeTerm?.name || 'Term 1'} ({academicYear})</span>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-semibold">Gender:</span>
                  <span className="font-bold text-slate-900">{pupil.gender || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-semibold">Attendance Record:</span>
                  <span className="font-bold text-slate-900">{daysPres} / {daysTot} Days ({Math.round((daysPres/daysTot)*100)}%)</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-semibold">Vacation Date:</span>
                  <span className="font-bold text-slate-900">{vacDate}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-semibold">Next Term Reopening:</span>
                  <span className="font-black text-amber-700">{reopenDate}</span>
                </div>
              </div>

              {/* Main Subjects Assessment Table */}
              <div className="mt-3">
                <table className="w-full text-left border-collapse text-[11px] font-mono border-2 border-slate-900">
                  <thead>
                    <tr className="bg-slate-900 text-amber-300 border-b-2 border-slate-900">
                      <th className="py-2 px-2.5 font-black uppercase border-r border-slate-700">Subject Title</th>
                      <th className="py-2 px-2 text-center font-bold border-r border-slate-700 w-16" title={`Continuous Assessment (${sbaWeight}%)`}>
                        SBA ({sbaWeight}%)
                      </th>
                      <th className="py-2 px-2 text-center font-bold border-r border-slate-700 w-16" title={`Terminal Examination (${examWeight}%)`}>
                        Exam ({examWeight}%)
                      </th>
                      <th className="py-2 px-2 text-center font-black border-r border-slate-700 w-16 bg-slate-800 text-white">
                        Total (100%)
                      </th>
                      <th className="py-2 px-2 text-center font-black border-r border-slate-700 w-12">
                        Grade
                      </th>
                      <th className="py-2 px-2 text-center font-bold border-r border-slate-700 w-14">
                        Rank
                      </th>
                      <th className="py-2 px-2 text-center font-bold border-r border-slate-700 w-24">
                        Level
                      </th>
                      <th className="py-2 px-2.5 font-bold">Subject Teacher's Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {pMarks.map((mItem, sIdx) => {
                      const isEven = sIdx % 2 === 0;
                      const numGrade = typeof mItem.grade === 'number' ? mItem.grade : 9;
                      return (
                        <tr key={mItem.subject.id} className={isEven ? 'bg-white' : 'bg-slate-50/80'}>
                          <td className="py-1.5 px-2.5 font-bold border-r border-slate-800 text-slate-950">
                            {mItem.subject.name}
                          </td>
                          <td className="py-1.5 px-2 text-center border-r border-slate-800 font-semibold text-slate-800">
                            {mItem.sba}
                          </td>
                          <td className="py-1.5 px-2 text-center border-r border-slate-800 font-semibold text-slate-800">
                            {mItem.exam}
                          </td>
                          <td className="py-1.5 px-2 text-center border-r border-slate-800 font-black bg-slate-100/80 text-slate-950">
                            {mItem.total !== '-' ? `${mItem.total}%` : '-'}
                          </td>
                          <td className="py-1.5 px-2 text-center border-r border-slate-800 font-black">
                            {mItem.grade !== '-' ? (
                              <span className={`inline-block px-1.5 py-0.5 text-center font-black text-xs ${
                                numGrade === 1 ? 'bg-emerald-100 text-emerald-800 border border-emerald-400' :
                                numGrade <= 4 ? 'bg-blue-100 text-blue-800 border border-blue-400' :
                                numGrade <= 6 ? 'bg-amber-100 text-amber-800 border border-amber-400' :
                                'bg-rose-100 text-rose-800 border border-rose-400'
                              }`}>
                                {mItem.grade}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="py-1.5 px-2 text-center border-r border-slate-800 font-bold text-slate-800">
                            {mItem.pos}
                          </td>
                          <td className="py-1.5 px-2 text-center border-r border-slate-800 text-[10px] font-bold">
                            <span className={`px-1 py-0.5 rounded-2xs ${
                              mItem.level === 'Advanced' ? 'text-emerald-700 bg-emerald-50' :
                              mItem.level === 'Proficient' ? 'text-blue-700 bg-blue-50' :
                              mItem.level === 'Developing' ? 'text-amber-700 bg-amber-50' : 'text-rose-700 bg-rose-50'
                            }`}>
                              {mItem.level}
                            </span>
                          </td>
                          <td className="py-1.5 px-2.5 text-[10px] text-slate-700 font-medium">
                            {mItem.remark}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Terminal Summary Metrics Bar (Rank, Average, Aggregate for JHS only) */}
              {isJhsClass(pupil.class) ? (
                <div className="mt-3 grid grid-cols-4 border-2 border-slate-900 bg-slate-100 text-center text-xs font-mono divide-x-2 divide-slate-900 py-2.5">
                  <div>
                    <span className="text-[10px] text-slate-600 block uppercase font-bold">Total Score</span>
                    <span className="font-black text-sm text-slate-950">{pupilStats.total} marks</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 block uppercase font-bold">Terminal Average</span>
                    <span className="font-black text-sm text-slate-950">{pupilStats.avg}%</span>
                  </div>
                  <div className="bg-amber-100/50">
                    <span className="text-[10px] text-amber-900 block uppercase font-black">Position in Class</span>
                    <span className="font-black text-sm text-slate-950 flex items-center justify-center gap-1">
                      {medalInfo && <span>{medalInfo.medal}</span>}
                      <span>{formatOrdinal(pupilStats.position)} of {pupilStats.totalPupils}</span>
                    </span>
                  </div>
                  <div className="bg-emerald-50">
                    <span className="text-[10px] text-emerald-900 block uppercase font-black">BECE Aggregate (4 Core + 2 Best Electives)</span>
                    <span className="font-black text-base text-emerald-950">{pupilStats.aggregate ?? '-'}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-3 border-2 border-slate-900 bg-slate-100 text-center text-xs font-mono divide-x-2 divide-slate-900 py-2.5">
                  <div>
                    <span className="text-[10px] text-slate-600 block uppercase font-bold">Total Terminal Score</span>
                    <span className="font-black text-sm text-slate-950">{pupilStats.total} marks</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 block uppercase font-bold">Terminal Overall Average</span>
                    <span className="font-black text-sm text-slate-950">{pupilStats.avg}%</span>
                  </div>
                  <div className="bg-amber-100/50">
                    <span className="text-[10px] text-amber-900 block uppercase font-black">Position in Class</span>
                    <span className="font-black text-sm text-slate-950 flex items-center justify-center gap-1">
                      {medalInfo && <span>{medalInfo.medal}</span>}
                      <span>{formatOrdinal(pupilStats.position)} of {pupilStats.totalPupils}</span>
                    </span>
                  </div>
                </div>
              )}

              {/* FINANCIAL FEE STATUS & CLEARANCE SECTION (When Option is ON) */}
              {showFeeStatus && (
                <div className="mt-3 border-2 border-slate-900 p-3 bg-amber-50/30 text-xs font-mono">
                  <div className="flex items-center justify-between border-b border-slate-300 pb-1.5 mb-2">
                    <span className="font-black uppercase tracking-wider text-[11px] text-slate-900 flex items-center gap-1.5">
                      <CreditCard size={14} className="text-amber-700" />
                      Pupil School Fees & Financial Clearance Status:
                      {feeStatusInfo.isDailyPayer && (
                        <span className="text-[10px] font-normal text-amber-800 bg-amber-100 px-1.5 py-0.2 border border-amber-300 rounded-xs">
                          (Daily Rate: GHC {feeStatusInfo.dailyRate.toFixed(2)}/day • {feeStatusInfo.chargeableDaysCount} Present Days)
                        </span>
                      )}
                    </span>
                    <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
                      feeStatusInfo.isCleared
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-500'
                        : feeStatusInfo.totalPaid > 0
                        ? 'bg-amber-100 text-amber-900 border-amber-500'
                        : 'bg-rose-100 text-rose-900 border-rose-500'
                    }`}>
                      {feeStatusInfo.isCleared ? '✓ FULLY CLEARED' : feeStatusInfo.totalPaid > 0 ? 'PARTIALLY PAID' : '! UNPAID ARREARS'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center divide-y sm:divide-y-0 sm:divide-x divide-slate-300 pt-1">
                    <div>
                      <span className="text-[10px] text-slate-600 block uppercase">
                        {feeStatusInfo.isDailyPayer ? `Expected Attendance Fee (${feeStatusInfo.chargeableDaysCount}d):` : 'Total Term Fee:'}
                      </span>
                      <span className="font-bold text-slate-900">GHC {feeStatusInfo.termFee.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-600 block uppercase">Amount Paid:</span>
                      <span className="font-black text-emerald-800">GHC {feeStatusInfo.totalPaid.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-600 block uppercase">Outstanding Balance:</span>
                      <span className={`font-black ${feeStatusInfo.balance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                        GHC {feeStatusInfo.balance.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-left pl-2">
                      <span className="text-[9px] text-slate-600 italic block leading-tight">
                        {feeStatusInfo.isCleared
                          ? 'All academic & facility fees for this term are fully settled.'
                          : `Please settle balance of GHC ${feeStatusInfo.balance.toFixed(2)} before reopening.`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Character, Attitude & Developmental Ratings */}
              <div className="mt-3 border-2 border-slate-900 p-3 text-xs font-mono space-y-2 bg-white">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <span className="font-bold uppercase text-[10px] text-slate-600 block">Conduct & Discipline:</span>
                    <span className="text-slate-900 font-semibold text-[11px]">{conductTxt}</span>
                  </div>
                  <div>
                    <span className="font-bold uppercase text-[10px] text-slate-600 block">Attitude to Learning:</span>
                    <span className="text-slate-900 font-semibold text-[11px]">{attitudeTxt}</span>
                  </div>
                  <div>
                    <span className="font-bold uppercase text-[10px] text-slate-600 block">Special Interest & Talents:</span>
                    <span className="text-slate-900 font-semibold text-[11px]">{interestTxt}</span>
                  </div>
                </div>

                {/* Teacher and Headmaster Remarks & Endorsements */}
                <div className="pt-2 border-t border-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="font-bold uppercase text-[10px] text-slate-600 block">Class Teacher's General Remarks:</span>
                    <p className="text-slate-950 font-semibold text-[11px] mt-0.5 italic">
                      "{teacherRem}"
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t border-dotted border-slate-900 pt-1">
                      <span className="text-[9px] uppercase text-slate-500 font-bold">Class Teacher Signature</span>
                      <span className="text-[10px] font-bold text-emerald-800">Verified ✓</span>
                    </div>
                  </div>

                  <div>
                    <span className="font-bold uppercase text-[10px] text-slate-600 block">Headteacher's Final Endorsement:</span>
                    <p className="text-slate-950 font-semibold text-[11px] mt-0.5 italic">
                      "{headRem}"
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t border-dotted border-slate-900 pt-1">
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-950 block">{headName}</span>
                        <span className="text-[9px] uppercase text-slate-600 font-bold">{headTitle}</span>
                      </div>
                      <div className="w-16 h-8 border-2 border-dashed border-slate-800 text-[7px] flex items-center justify-center text-slate-500 uppercase font-mono font-bold">
                        OFFICIAL SEAL
                      </div>
                    </div>
                  </div>
                </div>

                {savedRep?.promotedTo && (
                  <div className="pt-2 border-t border-slate-300 text-center font-black text-sm uppercase text-slate-950 bg-amber-100 py-1">
                    Promotion Status: {savedRep.promotedTo}
                  </div>
                )}
              </div>

              {/* GES Grading Standard Key Footer */}
              <div className="mt-3 pt-2 border-t border-slate-400 text-[9px] font-mono text-slate-600 flex flex-wrap items-center justify-between gap-1">
                <span><strong>GES 9-Point Scale:</strong> 1: 80-100% (Advanced) • 2: 75-79% (Proficient) • 3: 70-74% • 4: 65-69% • 5: 60-64% (Developing) • 6: 50-59% • 7: 45-49% • 8: 35-44% (Beginning) • 9: 0-34%</span>
                <span className="text-slate-500 font-bold">NaCCA Curriculum Standard</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Conduct & Remarks Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`${isLight ? 'bg-white border-neutral-300' : 'bg-neutral-900 border-neutral-700'} border p-6 max-w-lg w-full shadow-2xl space-y-4`}>
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-base font-black font-mono uppercase text-amber-400 flex items-center gap-2">
                <Edit3 size={16} /> Edit Report Remarks: {activeStudent?.name}
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-neutral-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs font-mono max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Days Present in Term:</label>
                  <input
                    type="number"
                    value={editDaysPresent}
                    onChange={e => setEditDaysPresent(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-700 text-white px-3 py-1.5 font-bold"
                  />
                </div>
                <div>
                  <label className="text-neutral-400 block mb-1">Total School Days:</label>
                  <input
                    type="number"
                    value={editTotalDays}
                    onChange={e => setEditTotalDays(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-700 text-white px-3 py-1.5 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Conduct & Discipline:</label>
                <textarea
                  rows={2}
                  value={editConduct}
                  onChange={e => setEditConduct(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 text-white p-2 text-xs"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Attitude towards Studies:</label>
                <textarea
                  rows={2}
                  value={editAttitude}
                  onChange={e => setEditAttitude(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 text-white p-2 text-xs"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Special Interests & Talents:</label>
                <input
                  type="text"
                  value={editInterest}
                  onChange={e => setEditInterest(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 text-white px-3 py-1.5 text-xs"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Class Teacher Remarks:</label>
                <textarea
                  rows={2}
                  value={editTeacherRemark}
                  onChange={e => setEditTeacherRemark(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 text-white p-2 text-xs"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Headteacher's Final Remarks:</label>
                <textarea
                  rows={2}
                  value={editHeadRemark}
                  onChange={e => setEditHeadRemark(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 text-white p-2 text-xs"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Promotion Status (Optional / 3rd Term):</label>
                <input
                  type="text"
                  placeholder="e.g. Promoted to Basic 5"
                  value={editPromotedTo}
                  onChange={e => setEditPromotedTo(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 text-white px-3 py-1.5 text-xs"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-800 flex justify-end gap-2">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="bg-neutral-800 text-neutral-300 px-4 py-2 text-xs font-mono"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReportMeta}
                disabled={isSaving}
                className="bg-amber-400 hover:bg-amber-300 text-black font-black px-5 py-2 text-xs font-mono uppercase tracking-wider flex items-center gap-1.5"
              >
                <Save size={14} />
                <span>{isSaving ? 'Saving...' : 'Save Report'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

