/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { StudentClass, ALL_CLASSES, Student, AcademicAssessment } from '../../types';
import { 
  BarChart2, Trophy, AlertTriangle, TrendingUp, Users, CheckCircle, 
  HelpCircle, Sparkles, Filter, Award, BookOpen, Star, AlertCircle,
  ArrowRight
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  Legend, PieChart, Pie, Cell, CartesianGrid 
} from 'recharts';
import { 
  getSubjectsForClass, 
  formatOrdinal 
} from '../../utils/ghanaCurriculum';

interface AcademicAnalyticsViewProps {
  onSelectStudentForReport: (studentId: string) => void;
  onNavigateToMarkEntry: (className: StudentClass, subjectId?: string) => void;
}

const GRADE_COLORS = {
  1: '#10B981', // Emerald
  2: '#14B8A6', // Teal
  3: '#06B6D4', // Cyan
  4: '#3B82F6', // Blue
  5: '#F59E0B', // Amber
  6: '#D97706', // Deep Amber
  7: '#F97316', // Orange
  8: '#EF4444', // Rose
  9: '#DC2626'  // Red
};

const NACCA_COLORS = {
  Advanced: '#10B981',
  Proficient: '#3B82F6',
  Developing: '#F59E0B',
  Beginning: '#EF4444'
};

export const AcademicAnalyticsView: React.FC<AcademicAnalyticsViewProps> = ({
  onSelectStudentForReport,
  onNavigateToMarkEntry
}) => {
  const { 
    students = [], 
    academicAssessments = [], 
    activeTerm,
    academicSettings,
    theme 
  } = useApp();

  const [selectedClass, setSelectedClass] = useState<StudentClass | 'ALL'>('B1');
  const activeTermId = activeTerm?.id || 'term_1_2026';

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter(s => s.active && (selectedClass === 'ALL' || s.class === selectedClass));
  }, [students, selectedClass]);

  // Filter assessments
  const filteredAssessments = useMemo(() => {
    return academicAssessments.filter(a => {
      if (a.termId && a.termId !== activeTermId) return false;
      if (selectedClass !== 'ALL' && a.class !== selectedClass) return false;
      return true;
    });
  }, [academicAssessments, selectedClass, activeTermId]);

  // Subject Averages Bar Chart Data
  const subjectAveragesData = useMemo(() => {
    const classSubjects = selectedClass === 'ALL' 
      ? getSubjectsForClass('B1') 
      : getSubjectsForClass(selectedClass);

    return classSubjects.map(sub => {
      const subjectMarks = filteredAssessments.filter(a => a.subjectId === sub.id);
      const totalScore = subjectMarks.reduce((acc, m) => acc + (m.totalScore || 0), 0);
      const avg = subjectMarks.length > 0 ? Math.round((totalScore / subjectMarks.length) * 10) / 10 : 0;
      const passCount = subjectMarks.filter(m => (m.totalScore || 0) >= 45).length;
      const passRate = subjectMarks.length > 0 ? Math.round((passCount / subjectMarks.length) * 100) : 0;

      return {
        subject: sub.code,
        name: sub.name,
        average: avg,
        passRate: passRate,
        pupilsCount: subjectMarks.length
      };
    }).filter(s => s.pupilsCount > 0 || selectedClass !== 'ALL');
  }, [filteredAssessments, selectedClass]);

  // Grade Distribution Data (Grades 1 through 9)
  const gradeDistributionData = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
    filteredAssessments.forEach(a => {
      if (a.grade && counts[a.grade] !== undefined) {
        counts[a.grade]++;
      }
    });

    return Object.entries(counts).map(([gradeStr, count]) => ({
      gradeName: `Grade ${gradeStr}`,
      gradeNum: Number(gradeStr),
      count,
      color: GRADE_COLORS[Number(gradeStr) as keyof typeof GRADE_COLORS] || '#9CA3AF'
    }));
  }, [filteredAssessments]);

  // NaCCA Achievement Level Breakdown
  const naccaLevelData = useMemo(() => {
    const counts = { Advanced: 0, Proficient: 0, Developing: 0, Beginning: 0 };
    filteredAssessments.forEach(a => {
      if (a.achievementLevel && counts[a.achievementLevel] !== undefined) {
        counts[a.achievementLevel]++;
      }
    });

    return [
      { name: 'Advanced (80-100%)', level: 'Advanced', value: counts.Advanced, color: NACCA_COLORS.Advanced },
      { name: 'Proficient (65-79%)', level: 'Proficient', value: counts.Proficient, color: NACCA_COLORS.Proficient },
      { name: 'Developing (45-64%)', level: 'Developing', value: counts.Developing, color: NACCA_COLORS.Developing },
      { name: 'Beginning (0-44%)', level: 'Beginning', value: counts.Beginning, color: NACCA_COLORS.Beginning }
    ];
  }, [filteredAssessments]);

  // Top Achievers Leaderboard
  const leaderboard = useMemo(() => {
    return filteredStudents.map(student => {
      const studentMarks = filteredAssessments.filter(a => a.studentId === student.id);
      if (studentMarks.length === 0) return null;

      const totalSum = studentMarks.reduce((acc, m) => acc + (m.totalScore || 0), 0);
      const avg = Math.round((totalSum / studentMarks.length) * 10) / 10;
      const g1s = studentMarks.filter(m => m.grade === 1).length;

      // Best 6 Grade Aggregate (lower is better)
      const sortedGrades = [...studentMarks].map(m => m.grade).sort((a, b) => a - b);
      const best6Grades = sortedGrades.slice(0, 6);
      const aggregate = best6Grades.reduce((a, b) => a + b, 0);

      return {
        student,
        marksCount: studentMarks.length,
        averageScore: avg,
        totalSum,
        aggregate,
        grade1Count: g1s
      };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .sort((a, b) => b.averageScore - a.averageScore)
    .slice(0, 10);
  }, [filteredStudents, filteredAssessments]);

  // At-Risk & Remedial Radar List
  const atRiskList = useMemo(() => {
    const list: Array<{
      student: Student;
      weakSubjects: Array<{ subjectName: string; score: number; grade: number }>;
      overallAverage: number;
      recommendation: string;
    }> = [];

    filteredStudents.forEach(student => {
      const studentMarks = filteredAssessments.filter(a => a.studentId === student.id);
      if (studentMarks.length === 0) return;

      const weak = studentMarks
        .filter(m => (m.totalScore || 0) < 45 || m.grade >= 8)
        .map(m => ({ subjectName: m.subjectName, score: m.totalScore, grade: m.grade }));

      const totalSum = studentMarks.reduce((acc, m) => acc + (m.totalScore || 0), 0);
      const avg = Math.round((totalSum / studentMarks.length) * 10) / 10;

      if (weak.length > 0 || avg < 50) {
        let rec = 'Provide supplementary reading and practical exercise sheets.';
        if (weak.some(w => w.subjectName.toLowerCase().includes('math') || w.subjectName.toLowerCase().includes('num'))) {
          rec = 'Intensive numeracy/math drills and one-on-one problem solving support.';
        } else if (weak.some(w => w.subjectName.toLowerCase().includes('eng') || w.subjectName.toLowerCase().includes('lit'))) {
          rec = 'Remedial phonics, comprehension drills, and daily reading supervision.';
        } else if (weak.length >= 3) {
          rec = 'Urgent parent-teacher conference & daily after-school remedial class required.';
        }

        list.push({
          student,
          weakSubjects: weak,
          overallAverage: avg,
          recommendation: rec
        });
      }
    });

    return list.sort((a, b) => a.overallAverage - b.overallAverage);
  }, [filteredStudents, filteredAssessments]);

  const isLight = theme === 'daylight';

  return (
    <div className="space-y-8">
      {/* Class Filter Bar */}
      <div className={`${isLight ? 'bg-neutral-100 border-neutral-300' : 'bg-neutral-900 border-neutral-800'} border p-4 flex flex-wrap items-center justify-between gap-3`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono font-bold uppercase text-neutral-400 mr-2 flex items-center gap-1">
            <Filter size={14} /> Analytics Scope:
          </span>
          <button
            onClick={() => setSelectedClass('ALL')}
            className={`px-3 py-1 text-xs font-mono font-bold uppercase transition-colors ${
              selectedClass === 'ALL'
                ? 'bg-amber-400 text-black'
                : isLight ? 'bg-white text-neutral-700 hover:bg-neutral-200' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            Whole School
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

        <div className="text-xs font-mono text-neutral-400">
          <span className="font-bold text-white">{filteredAssessments.length}</span> marks analyzed in <span className="font-bold text-amber-400">{selectedClass}</span>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Comparison Bar Chart */}
        <div className={`${isLight ? 'bg-white border-neutral-200' : 'bg-neutral-900 border-neutral-800'} border p-5`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black uppercase font-mono flex items-center gap-2">
                <BarChart2 size={16} className="text-amber-400" /> Subject Average Mastery Comparison
              </h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Mean percentage achieved per subject in {selectedClass}
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectAveragesData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="subject" tick={{ fill: '#A3A3A3', fontSize: 11, fontFamily: 'monospace' }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#A3A3A3', fontSize: 11, fontFamily: 'monospace' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#171717', border: '1px solid #404040', fontFamily: 'monospace', fontSize: '12px' }}
                  formatter={(value: any, name: string) => [
                    `${value}%`, 
                    name === 'average' ? 'Mean Average' : 'Pass Rate'
                  ]}
                />
                <Bar dataKey="average" fill="#F59E0B" name="Average %" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GES 9-Point Grade Distribution */}
        <div className={`${isLight ? 'bg-white border-neutral-200' : 'bg-neutral-900 border-neutral-800'} border p-5`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black uppercase font-mono flex items-center gap-2">
                <Award size={16} className="text-emerald-400" /> GES 9-Point Grade Distribution
              </h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Count of grades from Grade 1 (Highest) to Grade 9 (Lowest)
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradeDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="gradeName" tick={{ fill: '#A3A3A3', fontSize: 10, fontFamily: 'monospace' }} />
                <YAxis tick={{ fill: '#A3A3A3', fontSize: 11, fontFamily: 'monospace' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#171717', border: '1px solid #404040', fontFamily: 'monospace', fontSize: '12px' }}
                  formatter={(value: any) => [`${value} marks`, 'Total Records']}
                />
                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                  {gradeDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Leaderboard & NaCCA Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* NaCCA 4-Tier Breakdown */}
        <div className={`${isLight ? 'bg-white border-neutral-200' : 'bg-neutral-900 border-neutral-800'} border p-5`}>
          <h3 className="text-sm font-black uppercase font-mono mb-1">
            NaCCA Achievement Levels
          </h3>
          <p className="text-[11px] text-neutral-400 mb-4">Competency band distribution</p>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={naccaLevelData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {naccaLevelData.map((entry, index) => (
                    <Cell key={`cell-nacca-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#171717', border: '1px solid #404040', fontFamily: 'monospace', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-neutral-800">
            {naccaLevelData.map(l => (
              <div key={l.level} className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                  <span className="text-neutral-300">{l.level}</span>
                </div>
                <span className="font-bold text-white">{l.value} <span className="text-[10px] text-neutral-500 font-normal">marks</span></span>
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard / High Achievers */}
        <div className={`lg:col-span-2 ${isLight ? 'bg-white border-neutral-200' : 'bg-neutral-900 border-neutral-800'} border p-5`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black uppercase font-mono flex items-center gap-2">
                <Trophy size={16} className="text-amber-400" /> Class Honor Roll & Top Performers
              </h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Top 10 academic achievers based on overall terminal average
              </p>
            </div>
          </div>

          {leaderboard.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 font-mono text-xs">
              No assessment records entered yet for this scope.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400">
                    <th className="py-2.5 px-3 w-12 text-center">Rank</th>
                    <th className="py-2.5 px-3">Pupil Name</th>
                    <th className="py-2.5 px-2">Class</th>
                    <th className="py-2.5 px-2 text-center">Grade 1s</th>
                    <th className="py-2.5 px-2 text-center">Best 6 Agg.</th>
                    <th className="py-2.5 px-3 text-right">Average %</th>
                    <th className="py-2.5 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {leaderboard.map((item, idx) => (
                    <tr key={item.student.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="py-2.5 px-3 text-center font-black">
                        {idx === 0 && <span className="text-amber-400">🥇 1st</span>}
                        {idx === 1 && <span className="text-neutral-300">🥈 2nd</span>}
                        {idx === 2 && <span className="text-amber-600">🥉 3rd</span>}
                        {idx > 2 && <span className="text-neutral-500">{formatOrdinal(idx + 1)}</span>}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white">
                        {item.student.name}
                      </td>
                      <td className="py-2.5 px-2 text-amber-400 font-bold">
                        {item.student.class}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className="bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 px-2 py-0.5 text-[10px] font-bold">
                          {item.grade1Count} × G1
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-neutral-300">
                        {item.aggregate}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-sm text-emerald-400">
                        {item.averageScore}%
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <button
                          onClick={() => onSelectStudentForReport(item.student.id)}
                          className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline"
                        >
                          Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* At-Risk & Remedial Support Radar Table */}
      <div className={`${isLight ? 'bg-rose-50/40 border-rose-200' : 'bg-neutral-900 border-rose-900/60'} border p-5`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-black uppercase font-mono text-rose-400 flex items-center gap-2">
              <AlertTriangle size={16} /> At-Risk Academic Radar & Remedial Action Plans
            </h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Pupils scoring below 45% or receiving Grade 8/9 in continuous assessments or end of term exams
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/50 px-2.5 py-1">
            {atRiskList.length} Pupils Flagged
          </span>
        </div>

        {atRiskList.length === 0 ? (
          <div className="py-8 text-center text-emerald-400 font-mono text-xs flex items-center justify-center gap-2">
            <CheckCircle size={16} />
            <span>Excellent! No pupils are currently flagged as at-risk in this class scope.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400">
                  <th className="py-2.5 px-3">Pupil Name</th>
                  <th className="py-2.5 px-2">Class</th>
                  <th className="py-2.5 px-2 text-center">Term Avg</th>
                  <th className="py-2.5 px-3">Identified Weak Competencies</th>
                  <th className="py-2.5 px-3">Recommended Intervention Strategy</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {atRiskList.map(item => (
                  <tr key={item.student.id} className="hover:bg-rose-950/20 transition-colors">
                    <td className="py-3 px-3 font-bold text-white">
                      {item.student.name}
                    </td>
                    <td className="py-3 px-2 text-amber-400 font-bold">
                      {item.student.class}
                    </td>
                    <td className="py-3 px-2 text-center font-black text-rose-400">
                      {item.overallAverage}%
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {item.weakSubjects.map((w, wIdx) => (
                          <span key={wIdx} className="bg-rose-950 border border-rose-700/60 text-rose-300 text-[10px] px-1.5 py-0.5">
                            {w.subjectName} ({w.score}%)
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-neutral-300 text-[11px]">
                      {item.recommendation}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onNavigateToMarkEntry(item.student.class)}
                        className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline inline-flex items-center gap-1"
                      >
                        <span>Update Mark</span>
                        <ArrowRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
