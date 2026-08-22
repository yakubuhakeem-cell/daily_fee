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
  Search, ShieldCheck, Check, Save, Sliders
} from 'lucide-react';
import { 
  getSubjectsForClass, 
  formatOrdinal, 
  calculateGESGrade,
  generateClassTeacherRemark,
  generateHeadteacherRemark 
} from '../../utils/ghanaCurriculum';

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

  // Calculate student ranks and aggregates across class
  const classRankingMap = useMemo(() => {
    const rankings = classPupils.map(pupil => {
      const pMarks = academicAssessments.filter(
        a => a.studentId === pupil.id && (a.termId === activeTermId || !a.termId)
      );

      const totalScore = pMarks.reduce((acc, m) => acc + (m.totalScore || 0), 0);
      const avg = pMarks.length > 0 ? Math.round((totalScore / pMarks.length) * 10) / 10 : 0;
      
      const sortedGrades = [...pMarks].map(m => m.grade).sort((a, b) => a - b);
      const best6 = sortedGrades.slice(0, 6);
      const aggregate = best6.reduce((a, b) => a + b, 0);

      return {
        studentId: pupil.id,
        totalScore,
        averageScore: avg,
        aggregate,
        marksCount: pMarks.length
      };
    });

    rankings.sort((a, b) => b.averageScore - a.averageScore);

    const map = new Map<string, { position: number; totalPupils: number; avg: number; total: number; aggregate: number }>();
    rankings.forEach((item, idx) => {
      map.set(item.studentId, {
        position: idx + 1,
        totalPupils: rankings.length,
        avg: item.averageScore,
        total: item.totalScore,
        aggregate: item.aggregate
      });
    });

    return map;
  }, [classPupils, academicAssessments, activeTermId]);

  // Get marks for active student
  const studentMarks = useMemo(() => {
    if (!activeStudent) return [];
    const subjects = getSubjectsForClass(activeStudent.class);
    
    return subjects.map(sub => {
      const mark = academicAssessments.find(
        a => a.studentId === activeStudent.id && 
             a.subjectId === sub.id && 
             (a.termId === activeTermId || !a.termId)
      );

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
  }, [activeStudent, academicAssessments, activeTermId]);

  // Existing saved report or defaults
  const currentSavedReport = useMemo(() => {
    if (!activeStudent) return null;
    return terminalReports.find(
      r => r.studentId === activeStudent.id && (r.termId === activeTermId || !r.termId)
    ) || null;
  }, [terminalReports, activeStudent, activeTermId]);

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
  const schoolMotto = academicSettings?.schoolMotto || 'Knowledge is Light & Truth';
  const schoolPhone = systemSettings?.contactPhone || '0244123456 / 0209876543';
  const headName = academicSettings?.headteacherName || 'Yakubu Hakeem';
  const headTitle = academicSettings?.headteacherTitle || 'Headmaster';

  return (
    <div className="space-y-6">
      {/* Top Control Bar (Hidden in Print) */}
      <div className={`print:hidden ${isLight ? 'bg-neutral-100 border-neutral-300' : 'bg-neutral-900 border-neutral-800'} border p-4 flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center`}>
        <div className="flex flex-wrap items-center gap-3">
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

        {/* Pupil Selector & Print Actions */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
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
              className="bg-transparent text-xs font-mono font-bold text-white px-2 py-1 focus:outline-none max-w-[200px]"
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

          const savedRep = terminalReports.find(
            r => r.studentId === pupil.id && (r.termId === activeTermId || !r.termId)
          );

          const pupilStats = classRankingMap.get(pupil.id) || {
            position: 1,
            totalPupils: classPupils.length,
            avg: 0,
            total: 0,
            aggregate: 6
          };

          const pSubjects = getSubjectsForClass(pupil.class);
          const pMarks = pSubjects.map(sub => {
            const mark = academicAssessments.find(
              a => a.studentId === pupil.id && 
                   a.subjectId === sub.id && 
                   (a.termId === activeTermId || !a.termId)
            );
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

          return (
            <div 
              key={pupil.id}
              className="bg-white text-black p-8 sm:p-10 border-2 border-black max-w-4xl mx-auto shadow-xl print:shadow-none print:border-black print:p-6 print:m-0 print:max-w-none print:w-full break-after-page"
              style={{ minHeight: '1050px' }}
            >
              {/* Official Ghanaian School Header */}
              <div className="border-b-2 border-black pb-4 text-center relative">
                <div className="flex items-center justify-between gap-4">
                  {/* Left Logo / Crest */}
                  <div className="w-20 h-20 border border-black p-1 flex items-center justify-center bg-neutral-50 shrink-0">
                    <img 
                      src="/fee_tracker_logo.png" 
                      alt="Crest" 
                      referrerPolicy="no-referrer"
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        // fallback to styled crest
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <Award size={36} className="text-black" />
                  </div>

                  {/* Center School Details */}
                  <div className="flex-1">
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-serif uppercase text-black">
                      {schoolName}
                    </h1>
                    <p className="text-xs font-mono italic font-bold text-neutral-800 mt-0.5">
                      "{schoolMotto}"
                    </p>
                    <p className="text-[11px] font-mono text-neutral-700 mt-0.5">
                      P.O. Box 123, Kumasi - Ghana • Tel: {schoolPhone}
                    </p>
                    <div className="inline-block mt-2 bg-black text-white px-4 py-1 text-xs font-mono font-black uppercase tracking-wider">
                      GHANA BASIC EDUCATION TERMINAL REPORT CARD
                    </div>
                  </div>

                  {/* Pupil Photo Box */}
                  <div className="w-20 h-24 border border-black p-0.5 bg-neutral-100 flex flex-col items-center justify-center shrink-0">
                    {pupil.photoUrl ? (
                      <img 
                        src={pupil.photoUrl} 
                        alt={pupil.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-1">
                        <User size={28} className="mx-auto text-neutral-400" />
                        <span className="text-[8px] font-mono uppercase text-neutral-500 block leading-tight mt-1">Pupil Photo</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Pupil Bio Information Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono border-b border-black py-3">
                <div>
                  <span className="text-neutral-500 text-[10px] block uppercase">Pupil Name:</span>
                  <span className="font-black text-black text-sm uppercase">{pupil.name}</span>
                </div>
                <div>
                  <span className="text-neutral-500 text-[10px] block uppercase">Roll / ID Number:</span>
                  <span className="font-bold text-black">{pupil.rollNumber || 'SHCA-00' + (pupilIdx + 1)}</span>
                </div>
                <div>
                  <span className="text-neutral-500 text-[10px] block uppercase">Class / Grade:</span>
                  <span className="font-black text-black">{pupil.class}</span>
                </div>
                <div>
                  <span className="text-neutral-500 text-[10px] block uppercase">Academic Term:</span>
                  <span className="font-bold text-black">{activeTerm?.name || 'Term 1'} ({academicYear})</span>
                </div>

                <div>
                  <span className="text-neutral-500 text-[10px] block uppercase">Gender:</span>
                  <span className="font-bold text-black">{pupil.gender || 'Not specified'}</span>
                </div>
                <div>
                  <span className="text-neutral-500 text-[10px] block uppercase">Attendance Ratio:</span>
                  <span className="font-bold text-black">{daysPres} / {daysTot} Days ({Math.round((daysPres/daysTot)*100)}%)</span>
                </div>
                <div>
                  <span className="text-neutral-500 text-[10px] block uppercase">Vacation Date:</span>
                  <span className="font-bold text-black">{vacDate}</span>
                </div>
                <div>
                  <span className="text-neutral-500 text-[10px] block uppercase">Next Term Reopening:</span>
                  <span className="font-black text-black">{reopenDate}</span>
                </div>
              </div>

              {/* Main Subjects Assessment Table */}
              <div className="mt-4">
                <table className="w-full text-left border-collapse text-[11px] font-mono border border-black">
                  <thead>
                    <tr className="bg-neutral-200 border-b border-black text-black">
                      <th className="py-2 px-2.5 font-black uppercase border-r border-black">Subject Title</th>
                      <th className="py-2 px-2 text-center font-bold border-r border-black w-14" title={`Continuous Assessment (${sbaWeight}%)`}>
                        SBA ({sbaWeight}%)
                      </th>
                      <th className="py-2 px-2 text-center font-bold border-r border-black w-14" title={`Terminal Exam (${examWeight}%)`}>
                        Exam ({examWeight}%)
                      </th>
                      <th className="py-2 px-2 text-center font-black border-r border-black w-16 bg-neutral-300">
                        Total (100%)
                      </th>
                      <th className="py-2 px-2 text-center font-black border-r border-black w-12">
                        Grade
                      </th>
                      <th className="py-2 px-2 text-center font-bold border-r border-black w-14">
                        Rank
                      </th>
                      <th className="py-2 px-2 text-center font-bold border-r border-black w-24">
                        Level
                      </th>
                      <th className="py-2 px-2.5 font-bold">Subject Teacher's Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-300">
                    {pMarks.map((mItem, sIdx) => {
                      const isEven = sIdx % 2 === 0;
                      return (
                        <tr key={mItem.subject.id} className={isEven ? 'bg-white' : 'bg-neutral-50'}>
                          <td className="py-1.5 px-2.5 font-bold border-r border-black text-black">
                            {mItem.subject.name}
                          </td>
                          <td className="py-1.5 px-2 text-center border-r border-black font-semibold">
                            {mItem.sba}
                          </td>
                          <td className="py-1.5 px-2 text-center border-r border-black font-semibold">
                            {mItem.exam}
                          </td>
                          <td className="py-1.5 px-2 text-center border-r border-black font-black bg-neutral-100 text-black">
                            {mItem.total !== '-' ? `${mItem.total}%` : '-'}
                          </td>
                          <td className="py-1.5 px-2 text-center border-r border-black font-black">
                            {mItem.grade}
                          </td>
                          <td className="py-1.5 px-2 text-center border-r border-black font-bold">
                            {mItem.pos}
                          </td>
                          <td className="py-1.5 px-2 text-center border-r border-black text-[10px] font-bold">
                            {mItem.level}
                          </td>
                          <td className="py-1.5 px-2.5 text-[10px] text-neutral-800">
                            {mItem.remark}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Terminal Summary Metrics Bar */}
              <div className="mt-3 grid grid-cols-4 border border-black bg-neutral-100 text-center text-xs font-mono divide-x divide-black py-2">
                <div>
                  <span className="text-[10px] text-neutral-600 block uppercase">Aggregate Total Score</span>
                  <span className="font-black text-sm text-black">{pupilStats.total} marks</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-600 block uppercase">Terminal Overall Average</span>
                  <span className="font-black text-sm text-black">{pupilStats.avg}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-600 block uppercase">Position in Class</span>
                  <span className="font-black text-sm text-black">
                    {formatOrdinal(pupilStats.position)} out of {pupilStats.totalPupils}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-600 block uppercase">Best 6 Grade Aggregate</span>
                  <span className="font-black text-sm text-black">{pupilStats.aggregate}</span>
                </div>
              </div>

              {/* Character, Attitude & Developmental Ratings */}
              <div className="mt-3 border border-black p-3 text-xs font-mono space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <span className="font-bold uppercase text-[10px] text-neutral-600 block">Conduct & Discipline:</span>
                    <span className="text-black font-semibold text-[11px]">{conductTxt}</span>
                  </div>
                  <div>
                    <span className="font-bold uppercase text-[10px] text-neutral-600 block">Attitude to Learning:</span>
                    <span className="text-black font-semibold text-[11px]">{attitudeTxt}</span>
                  </div>
                  <div>
                    <span className="font-bold uppercase text-[10px] text-neutral-600 block">Special Interest & Talents:</span>
                    <span className="text-black font-semibold text-[11px]">{interestTxt}</span>
                  </div>
                </div>

                {/* Teacher and Headmaster Remarks */}
                <div className="pt-2 border-t border-neutral-300 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="font-bold uppercase text-[10px] text-neutral-600 block">Class Teacher's General Remarks:</span>
                    <p className="text-black font-semibold text-[11px] mt-0.5 italic">
                      "{teacherRem}"
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t border-dotted border-black pt-1">
                      <span className="text-[9px] uppercase text-neutral-500">Class Teacher Signature</span>
                      <span className="text-[10px] font-bold">Verified ✓</span>
                    </div>
                  </div>

                  <div>
                    <span className="font-bold uppercase text-[10px] text-neutral-600 block">Headteacher's Overall Remarks:</span>
                    <p className="text-black font-semibold text-[11px] mt-0.5 italic">
                      "{headRem}"
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t border-dotted border-black pt-1">
                      <div>
                        <span className="text-[10px] font-black uppercase text-black block">{headName}</span>
                        <span className="text-[9px] uppercase text-neutral-500">{headTitle}</span>
                      </div>
                      <div className="w-14 h-8 border border-black/50 text-[8px] flex items-center justify-center text-neutral-400 uppercase font-mono">
                        OFFICIAL SEAL
                      </div>
                    </div>
                  </div>
                </div>

                {savedRep?.promotedTo && (
                  <div className="pt-2 border-t border-neutral-300 text-center font-black text-sm uppercase text-black">
                    Promotion Status: {savedRep.promotedTo}
                  </div>
                )}
              </div>

              {/* GES Grading Standard Key Footer */}
              <div className="mt-3 pt-2 border-t border-black/40 text-[9px] font-mono text-neutral-600 flex flex-wrap items-center justify-between gap-1">
                <span><strong>GES 9-Point Scale:</strong> 1: 80-100% (Advanced) • 2: 75-79% (Proficient) • 3: 70-74% • 4: 65-69% • 5: 60-64% (Developing) • 6: 50-59% • 7: 45-49% • 8: 35-44% (Beginning) • 9: 0-34%</span>
                <span className="text-neutral-500">NaCCA Curriculum Standard System</span>
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
