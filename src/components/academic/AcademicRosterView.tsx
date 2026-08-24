/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { StudentClass, SchoolCategory, ALL_CLASSES, AcademicAssessment } from '../../types';
import { 
  Users, Search, Filter, GraduationCap, Trophy, AlertTriangle, 
  ArrowRight, FileText, CheckCircle2, Star, Sparkles, BookOpen,
  Calendar, Phone, User, Award, ChevronRight, BarChart2
} from 'lucide-react';
import { getSubjectsForClass, formatOrdinal } from '../../utils/ghanaCurriculum';

interface AcademicRosterViewProps {
  onSelectStudentForReport: (studentId: string) => void;
  onNavigateToMarkEntry: (className: StudentClass, subjectId?: string) => void;
}

export const AcademicRosterView: React.FC<AcademicRosterViewProps> = ({
  onSelectStudentForReport,
  onNavigateToMarkEntry
}) => {
  const { 
    students = [], 
    academicAssessments = [], 
    activeTerm, 
    systemSettings,
    academicSettings,
    theme 
  } = useApp();

  const [selectedClass, setSelectedClass] = useState<StudentClass | 'ALL'>('B1');
  const [selectedCategory, setSelectedCategory] = useState<SchoolCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'average' | 'rollNumber'>('name');

  const activeTermId = activeTerm?.id || 'term_1_2026';
  const academicYear = academicSettings?.academicYear || '2025/2026';

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (!s.active) return false;
      if (selectedClass !== 'ALL' && s.class !== selectedClass) return false;
      if (selectedCategory !== 'ALL' && s.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesRoll = (s.rollNumber || '').toLowerCase().includes(q);
        const matchesClass = s.class.toLowerCase().includes(q);
        if (!matchesName && !matchesRoll && !matchesClass) return false;
      }
      return true;
    });
  }, [students, selectedClass, selectedCategory, searchQuery]);

  // Fast indexed map for student marks
  const assessmentsByStudentMap = useMemo(() => {
    const map = new Map<string, AcademicAssessment[]>();
    for (const a of academicAssessments) {
      if (a.termId === activeTermId || !a.termId) {
        const arr = map.get(a.studentId);
        if (arr) arr.push(a);
        else map.set(a.studentId, [a]);
      }
    }
    return map;
  }, [academicAssessments, activeTermId]);

  // Compute student academic summaries
  const studentSummaries = useMemo(() => {
    const map = new Map<string, {
      assessmentsCount: number;
      totalSubjectsCount: number;
      averageScore: number;
      bestSubject: string;
      lowestSubject: string;
      gradeCounts: Record<number, number>;
      atRisk: boolean;
    }>();

    students.forEach(student => {
      const classSubjects = getSubjectsForClass(student.class);
      const studentMarks = assessmentsByStudentMap.get(student.id) || [];

      const totalSub = classSubjects.length;
      const count = studentMarks.length;

      if (count === 0) {
        map.set(student.id, {
          assessmentsCount: 0,
          totalSubjectsCount: totalSub,
          averageScore: 0,
          bestSubject: 'No marks',
          lowestSubject: 'No marks',
          gradeCounts: {},
          atRisk: false
        });
        return;
      }

      const total = studentMarks.reduce((acc, m) => acc + (m.totalScore || 0), 0);
      const avg = Math.round((total / count) * 10) / 10;

      // Find highest & lowest
      const sortedMarks = [...studentMarks].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
      const best = sortedMarks[0]?.subjectName || '-';
      const lowest = sortedMarks[sortedMarks.length - 1]?.subjectName || '-';

      const gCounts: Record<number, number> = {};
      let hasWeakGrade = false;
      studentMarks.forEach(m => {
        gCounts[m.grade] = (gCounts[m.grade] || 0) + 1;
        if (m.grade >= 8 || m.totalScore < 45) {
          hasWeakGrade = true;
        }
      });

      map.set(student.id, {
        assessmentsCount: count,
        totalSubjectsCount: totalSub,
        averageScore: avg,
        bestSubject: best,
        lowestSubject: lowest,
        gradeCounts: gCounts,
        atRisk: hasWeakGrade || avg < 50
      });
    });

    return map;
  }, [students, assessmentsByStudentMap]);

  // Sort filtered list
  const sortedStudents = useMemo(() => {
    return [...filteredStudents].sort((a, b) => {
      if (sortBy === 'average') {
        const avgA = studentSummaries.get(a.id)?.averageScore || 0;
        const avgB = studentSummaries.get(b.id)?.averageScore || 0;
        return avgB - avgA;
      }
      if (sortBy === 'rollNumber') {
        return (a.rollNumber || '').localeCompare(b.rollNumber || '');
      }
      return a.name.localeCompare(b.name);
    });
  }, [filteredStudents, sortBy, studentSummaries]);

  // Top stats for selected view
  const stats = useMemo(() => {
    const totalPupils = filteredStudents.length;
    let completedMarksPupils = 0;
    let totalScoreSum = 0;
    let totalAvgCount = 0;
    let atRiskCount = 0;

    filteredStudents.forEach(s => {
      const summary = studentSummaries.get(s.id);
      if (summary) {
        if (summary.assessmentsCount >= summary.totalSubjectsCount && summary.totalSubjectsCount > 0) {
          completedMarksPupils++;
        }
        if (summary.assessmentsCount > 0) {
          totalScoreSum += summary.averageScore;
          totalAvgCount++;
        }
        if (summary.atRisk) {
          atRiskCount++;
        }
      }
    });

    const classAverage = totalAvgCount > 0 ? Math.round((totalScoreSum / totalAvgCount) * 10) / 10 : 0;

    return {
      totalPupils,
      completedMarksPupils,
      classAverage,
      atRiskCount
    };
  }, [filteredStudents, studentSummaries]);

  const isLight = theme === 'daylight';

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Filter Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`${isLight ? 'bg-amber-50 border-amber-200' : 'bg-neutral-900 border-neutral-800'} border p-4`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-500">Enrolled Pupils</span>
            <Users size={16} className="text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono">
            {stats.totalPupils} <span className="text-xs font-normal text-neutral-400">pupils</span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">
            {selectedClass === 'ALL' ? 'Across all grades' : `Active in ${selectedClass}`}
          </p>
        </div>

        <div className={`${isLight ? 'bg-blue-50 border-blue-200' : 'bg-neutral-900 border-neutral-800'} border p-4`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-500">Marks Completion</span>
            <GraduationCap size={16} className="text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono">
            {stats.completedMarksPupils} <span className="text-xs font-normal text-neutral-400">/ {stats.totalPupils} complete</span>
          </div>
          <div className="w-full bg-neutral-800 h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-blue-500 h-full transition-all duration-300"
              style={{ width: `${stats.totalPupils > 0 ? (stats.completedMarksPupils / stats.totalPupils) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className={`${isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-neutral-900 border-neutral-800'} border p-4`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-500">Term Mean Average</span>
            <BarChart2 size={16} className="text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-emerald-400">
            {stats.classAverage}%
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">
            Standard NaCCA weighted score
          </p>
        </div>

        <div className={`${isLight ? 'bg-rose-50 border-rose-200' : 'bg-neutral-900 border-neutral-800'} border p-4`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-500">At-Risk Alerts</span>
            <AlertTriangle size={16} className="text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-rose-400">
            {stats.atRiskCount} <span className="text-xs font-normal text-neutral-400">pupils</span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">
            Scores &lt; 50% or Grade 8/9
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className={`${isLight ? 'bg-neutral-100 border-neutral-300' : 'bg-neutral-900 border-neutral-800'} border p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono font-bold uppercase text-neutral-400 mr-1 flex items-center gap-1">
            <Filter size={14} /> Class:
          </span>
          <button
            onClick={() => setSelectedClass('ALL')}
            className={`px-2.5 py-1 text-xs font-mono font-bold uppercase transition-colors ${
              selectedClass === 'ALL'
                ? 'bg-amber-400 text-black'
                : isLight ? 'bg-white text-neutral-700 hover:bg-neutral-200' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            All Classes
          </button>
          {ALL_CLASSES.map(cls => (
            <button
              key={cls}
              onClick={() => setSelectedClass(cls)}
              className={`px-2.5 py-1 text-xs font-mono font-bold transition-colors ${
                selectedClass === cls
                  ? 'bg-amber-400 text-black'
                  : isLight ? 'bg-white text-neutral-700 hover:bg-neutral-200' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              {cls}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search pupil name, roll number..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-3 py-1.5 text-xs font-mono border focus:outline-none focus:border-amber-400 ${
                isLight ? 'bg-white border-neutral-300 text-black' : 'bg-neutral-950 border-neutral-700 text-white'
              }`}
            />
          </div>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className={`py-1.5 px-3 text-xs font-mono border focus:outline-none focus:border-amber-400 ${
              isLight ? 'bg-white border-neutral-300 text-black' : 'bg-neutral-950 border-neutral-700 text-white'
            }`}
          >
            <option value="name">Sort: Name (A-Z)</option>
            <option value="average">Sort: Average Score</option>
            <option value="rollNumber">Sort: Roll Number</option>
          </select>
        </div>
      </div>

      {/* Pupils Grid List */}
      {sortedStudents.length === 0 ? (
        <div className={`${isLight ? 'bg-white border-neutral-200' : 'bg-neutral-900 border-neutral-800'} border p-12 text-center`}>
          <Users size={36} className="mx-auto text-neutral-500 mb-3" />
          <h3 className="text-base font-bold uppercase font-mono">No Pupils Found</h3>
          <p className="text-xs text-neutral-400 mt-1">Try selecting another class or clearing your search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedStudents.map((student, idx) => {
            const summary = studentSummaries.get(student.id);
            const avg = summary?.averageScore || 0;
            const entered = summary?.assessmentsCount || 0;
            const totalSub = summary?.totalSubjectsCount || 0;
            const isComplete = entered >= totalSub && totalSub > 0;

            return (
              <div
                key={student.id}
                className={`${
                  isLight ? 'bg-white border-neutral-200 hover:border-neutral-400' : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                } border p-5 transition-all flex flex-col justify-between group relative`}
              >
                {summary?.atRisk && (
                  <div className="absolute top-0 right-0 bg-rose-500 text-white text-[9px] font-mono font-bold uppercase px-2 py-0.5 tracking-wider">
                    Remedial Need
                  </div>
                )}

                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {student.photoUrl ? (
                        <img 
                          src={student.photoUrl} 
                          alt={student.name}
                          referrerPolicy="no-referrer"
                          className="w-11 h-11 object-cover border border-neutral-700 shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-sm text-amber-400 shrink-0">
                          {student.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-sm leading-tight text-white group-hover:text-amber-400 transition-colors">
                          {student.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono text-neutral-400 bg-neutral-800 px-1.5 py-0.5">
                            {student.rollNumber || 'No Roll #'}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-900/50 px-1.5 py-0.5">
                            {student.class}
                          </span>
                          {student.gender && (
                            <span className="text-[10px] font-mono text-neutral-400">
                              {student.gender}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`font-mono text-lg font-black ${
                        avg >= 80 ? 'text-emerald-400' :
                        avg >= 65 ? 'text-blue-400' :
                        avg >= 50 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {avg > 0 ? `${avg}%` : '-'}
                      </div>
                      <span className="text-[9px] font-mono text-neutral-500 uppercase block">
                        Term Average
                      </span>
                    </div>
                  </div>

                  {/* Academic Metrics Row */}
                  <div className="mt-4 pt-3 border-t border-neutral-800/80 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-mono text-neutral-500 block uppercase">Marks Recorded</span>
                      <span className={`font-mono font-bold ${isComplete ? 'text-emerald-400' : 'text-neutral-300'}`}>
                        {entered} / {totalSub} Subjects
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-neutral-500 block uppercase">Best Performing</span>
                      <span className="font-mono font-bold text-neutral-300 truncate block" title={summary?.bestSubject}>
                        {summary?.bestSubject || '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Action Footer */}
                <div className="mt-5 pt-3 border-t border-neutral-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onNavigateToMarkEntry(student.class)}
                    className="text-[11px] font-mono font-bold text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
                    title="Enter marks for this class"
                  >
                    <FileText size={13} /> Enter Marks
                  </button>

                  <button
                    onClick={() => onSelectStudentForReport(student.id)}
                    className="bg-amber-400 hover:bg-amber-300 text-black text-xs font-mono font-bold px-3 py-1.5 flex items-center gap-1.5 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]"
                  >
                    <span>Report Card</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
