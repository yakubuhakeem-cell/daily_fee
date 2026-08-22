/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { StudentClass } from '../../types';
import { 
  GraduationCap, FileSpreadsheet, BarChart2, FileText, 
  Users, Sliders, Sparkles, BookOpen, ShieldCheck, 
  Award, CheckCircle2, AlertTriangle, ArrowRight, Lock, Shield
} from 'lucide-react';
import { AcademicRosterView } from './AcademicRosterView';
import { MarkEntrySpreadsheet } from './MarkEntrySpreadsheet';
import { AcademicAnalyticsView } from './AcademicAnalyticsView';
import { TerminalReportGenerator } from './TerminalReportGenerator';
import { TeacherAllocationView } from './TeacherAllocationView';
import { AcademicSettingsModal } from './AcademicSettingsModal';
import { isHeadOrAdmin, getTeacherAssignedClasses } from '../../utils/rbacUtils';

type AcademicSubTab = 'roster' | 'spreadsheet' | 'analytics' | 'reports' | 'allocation';

export const AcademicDashboard: React.FC = () => {
  const { 
    currentUser, 
    activeTerm, 
    academicSettings, 
    students = [],
    academicAssessments = [],
    teacherAllocations = [],
    theme 
  } = useApp();

  const userAssignedClasses = useMemo(() => {
    return getTeacherAssignedClasses(currentUser, teacherAllocations);
  }, [currentUser, teacherAllocations]);

  const defaultTeacherClass = useMemo(() => {
    if (userAssignedClasses.length > 0) {
      return userAssignedClasses[0];
    }
    return (currentUser?.assignedClass || 'B1') as StudentClass;
  }, [userAssignedClasses, currentUser]);

  const [activeSubTab, setActiveSubTab] = useState<AcademicSubTab>('roster');
  const [selectedStudentForReport, setSelectedStudentForReport] = useState<string | undefined>(undefined);
  const [targetClassForMarks, setTargetClassForMarks] = useState<StudentClass>(defaultTeacherClass);
  const [targetSubjectForMarks, setTargetSubjectForMarks] = useState<string | undefined>(undefined);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const activeTermId = activeTerm?.id || 'term_1_2026';
  const academicYear = academicSettings?.academicYear || '2025/2026';

  // Navigation handlers
  const handleSelectStudentForReport = (studentId: string) => {
    setSelectedStudentForReport(studentId);
    setActiveSubTab('reports');
  };

  const handleNavigateToMarkEntry = (className: StudentClass, subjectId?: string) => {
    setTargetClassForMarks(className);
    setTargetSubjectForMarks(subjectId);
    setActiveSubTab('spreadsheet');
  };

  const isLight = theme === 'daylight';
  const hasAdminAuthority = isHeadOrAdmin(currentUser) || currentUser?.permissions?.canManageExams;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className={`${isLight ? 'bg-white border-neutral-300' : 'bg-neutral-900 border-neutral-800'} border p-5 sm:p-6 relative overflow-hidden`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="bg-amber-400 text-black text-[10px] font-mono font-black uppercase px-2 py-0.5 tracking-wider">
                Ghana NaCCA / GES Standards
              </span>
              <span className="text-xs font-mono text-neutral-400">
                {academicYear} • {activeTerm?.name || 'Term 1'}
              </span>
              {currentUser && (
                <span className={`text-[11px] font-mono px-2 py-0.5 border flex items-center gap-1 ${
                  hasAdminAuthority
                    ? 'bg-purple-950/80 border-purple-600 text-purple-300 font-bold'
                    : 'bg-blue-950/80 border-blue-600 text-blue-300 font-bold'
                }`}>
                  <Shield size={12} />
                  <span>{currentUser.name} ({currentUser.role})</span>
                  {userAssignedClasses.length > 0 && (
                    <span className="text-amber-400 font-bold">• Assigned: {userAssignedClasses.join(', ')}</span>
                  )}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black font-mono uppercase tracking-tight text-white flex items-center gap-2.5">
              <GraduationCap className="text-amber-400" size={26} />
              <span>Academic Performance & Terminal Report System</span>
            </h1>
            <p className="text-xs text-neutral-400 font-mono mt-1">
              Continuous SBA Assessment, 9-Point Grading, Real-time Analytics & Official Terminal Report Card Generator
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {hasAdminAuthority && (
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 px-3.5 py-2 text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <Sliders size={14} className="text-amber-400" />
                <span>Curriculum Settings</span>
              </button>
            )}

            <button
              onClick={() => setActiveSubTab('reports')}
              className="bg-amber-400 hover:bg-amber-300 text-black px-4 py-2 text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]"
            >
              <FileText size={15} />
              <span>Generate Report Cards</span>
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-neutral-800">
          <button
            onClick={() => setActiveSubTab('roster')}
            className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'roster'
                ? 'bg-amber-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : isLight ? 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            <Users size={14} />
            <span>1. Pupil Rosters</span>
          </button>

          <button
            onClick={() => setActiveSubTab('spreadsheet')}
            className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'spreadsheet'
                ? 'bg-amber-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : isLight ? 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            <FileSpreadsheet size={14} />
            <span>2. Mark Entry Spreadsheet</span>
          </button>

          <button
            onClick={() => setActiveSubTab('analytics')}
            className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'analytics'
                ? 'bg-amber-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : isLight ? 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            <BarChart2 size={14} />
            <span>3. Analytics & At-Risk Radar</span>
          </button>

          <button
            onClick={() => setActiveSubTab('reports')}
            className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'reports'
                ? 'bg-amber-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : isLight ? 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            <FileText size={14} />
            <span>4. Terminal Report Cards</span>
          </button>

          {hasAdminAuthority && (
            <button
              onClick={() => setActiveSubTab('allocation')}
              className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                activeSubTab === 'allocation'
                  ? 'bg-amber-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : isLight ? 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              <BookOpen size={14} />
              <span>5. Teacher Allocations</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Module Content */}
      <div className="transition-all">
        {activeSubTab === 'roster' && (
          <AcademicRosterView
            onSelectStudentForReport={handleSelectStudentForReport}
            onNavigateToMarkEntry={handleNavigateToMarkEntry}
          />
        )}

        {activeSubTab === 'spreadsheet' && (
          <MarkEntrySpreadsheet
            initialClass={targetClassForMarks}
            initialSubjectId={targetSubjectForMarks}
          />
        )}

        {activeSubTab === 'analytics' && (
          <AcademicAnalyticsView
            onSelectStudentForReport={handleSelectStudentForReport}
            onNavigateToMarkEntry={handleNavigateToMarkEntry}
          />
        )}

        {activeSubTab === 'reports' && (
          <TerminalReportGenerator
            initialStudentId={selectedStudentForReport}
          />
        )}

        {activeSubTab === 'allocation' && (
          <TeacherAllocationView />
        )}
      </div>

      {/* Settings Modal */}
      <AcademicSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
};

export default AcademicDashboard;
