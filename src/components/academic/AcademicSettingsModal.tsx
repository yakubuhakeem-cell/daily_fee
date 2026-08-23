/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AcademicSettings } from '../../types';
import { 
  Sliders, Save, RefreshCw, CheckCircle2, Shield, Sparkles, 
  HelpCircle, Calendar, User, Award, Trash2, RotateCcw
} from 'lucide-react';
import { generateSeedAcademicRecords } from '../../utils/ghanaCurriculum';

interface AcademicSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AcademicSettingsModal: React.FC<AcademicSettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const { 
    academicSettings, 
    updateAcademicSettings, 
    students = [],
    activeTerm,
    batchSaveAcademicAssessments,
    clearAllAcademicAssessments,
    theme,
    playFeedbackSound 
  } = useApp();

  const [sbaWeight, setSbaWeight] = useState<number>(academicSettings?.sbaWeight ?? 50);
  const [examWeight, setExamWeight] = useState<number>(academicSettings?.examWeight ?? 50);
  const [academicYear, setAcademicYear] = useState<string>(academicSettings?.academicYear || '2025/2026');
  const [nextTermReopeningDate, setNextTermReopeningDate] = useState<string>(academicSettings?.nextTermReopeningDate || '2026-09-08');
  const [vacationDate, setVacationDate] = useState<string>(academicSettings?.vacationDate || '2026-07-24');
  const [headName, setHeadName] = useState<string>(academicSettings?.headteacherName || 'Yakubu Hakeem');
  const [headTitle, setHeadTitle] = useState<string>(academicSettings?.headteacherTitle || 'Headmaster');
  const [schoolMotto, setSchoolMotto] = useState<string>(academicSettings?.schoolMotto || 'Holiness is our Key');
  const [schoolAddress, setSchoolAddress] = useState<string>(academicSettings?.schoolAddress || 'P. O. Box LS 15, Sawla-Savannah Region, Ghana.');
  const [schoolPhone, setSchoolPhone] = useState<string>(academicSettings?.schoolPhone || '0545029200 / 0507274133');
  const [showPos, setShowPos] = useState<boolean>(academicSettings?.showPositionOnReport ?? true);
  const [showAtt, setShowAtt] = useState<boolean>(academicSettings?.showAttendanceOnReport ?? true);
  const [showCond, setShowCond] = useState<boolean>(academicSettings?.showConductOnReport ?? true);
  const [showFeeStatus, setShowFeeStatus] = useState<boolean>(academicSettings?.showFeeStatusOnReport ?? true);
  const [showMedals, setShowMedals] = useState<boolean>(academicSettings?.showMedalsOnReport ?? true);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedSuccessMsg, setSeedSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSbaWeightChange = (val: number) => {
    const safeSba = Math.max(0, Math.min(100, val));
    setSbaWeight(safeSba);
    setExamWeight(100 - safeSba);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated: AcademicSettings = {
        sbaWeight,
        examWeight,
        academicYear,
        activeTermNumber: 1,
        nextTermReopeningDate,
        vacationDate,
        headteacherName: headName,
        headteacherTitle: headTitle,
        schoolMotto,
        schoolAddress,
        schoolPhone,
        showPositionOnReport: showPos,
        showAttendanceOnReport: showAtt,
        showConductOnReport: showCond,
        showFeeStatusOnReport: showFeeStatus,
        showMedalsOnReport: showMedals,
        showTeacherRemarks: true,
        showHeadteacherRemarks: true,
        gradingScale: 'GES_9_POINT'
      };

      await updateAcademicSettings(updated);
      if (playFeedbackSound) playFeedbackSound('success');
      onClose();
    } catch (err: any) {
      console.error("Failed to update academic settings:", err);
      alert("Error saving settings: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Seed / Regenerate realistic test assessment data
  const handleSeedDemoMarks = async () => {
    if (!confirm("This will generate sample continuous assessment (SBA) and exam mark entries for all enrolled pupils based on NaCCA & GES standards. Proceed?")) {
      return;
    }
    setIsSeeding(true);
    try {
      const seedMarks = generateSeedAcademicRecords(
        students, 
        activeTerm?.id || 'term_1_2026', 
        academicYear
      );
      await batchSaveAcademicAssessments(seedMarks);
      if (playFeedbackSound) playFeedbackSound('success');
      setSeedSuccessMsg(`Successfully generated ${seedMarks.length} sample mark records across all grades!`);
      setTimeout(() => setSeedSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error("Failed to seed marks:", err);
      alert("Seeding error: " + err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  // Unpopulate / Clear all marks across the whole school
  const [isClearingAll, setIsClearingAll] = useState(false);
  const handleUnpopulateMarks = async () => {
    if (!confirm("⚠️ CAUTION: This will delete ALL academic assessment and exam marks across the entire school. Are you sure you want to unpopulate all marks?")) {
      return;
    }
    setIsClearingAll(true);
    try {
      await clearAllAcademicAssessments();
      if (playFeedbackSound) playFeedbackSound('success');
      setSeedSuccessMsg(`Successfully unpopulated all academic marks across the entire school!`);
      setTimeout(() => setSeedSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error("Failed to clear marks:", err);
      alert("Error unpopulating marks: " + err.message);
    } finally {
      setIsClearingAll(false);
    }
  };

  const isLight = theme === 'daylight';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className={`${isLight ? 'bg-white border-neutral-300' : 'bg-neutral-900 border-neutral-700'} border p-6 max-w-xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div>
            <h3 className="text-base font-black font-mono uppercase text-amber-400 flex items-center gap-2">
              <Sliders size={18} /> Curriculum & Academic System Settings
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Ghana Standard-Based Assessment (SBA), Term Dates & Report Card Config
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white text-lg">✕</button>
        </div>

        {seedSuccessMsg && (
          <div className="bg-emerald-950/60 border border-emerald-500 text-emerald-300 p-3 text-xs font-mono font-bold flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{seedSuccessMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-4 text-xs font-mono">
          {/* Assessment Weighting Model */}
          <div className="p-4 bg-neutral-950 border border-neutral-800 space-y-3">
            <label className="font-bold text-amber-400 block uppercase">
              Continuous Assessment (SBA) vs End-of-Term Exam Weighting:
            </label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-neutral-300 text-[11px] mb-1">
                  <span>SBA: <strong>{sbaWeight}%</strong></span>
                  <span>Exam: <strong>{examWeight}%</strong></span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  step="5"
                  value={sbaWeight}
                  onChange={e => handleSbaWeightChange(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleSbaWeightChange(50)}
                className={`px-2.5 py-1 text-[11px] border font-bold ${
                  sbaWeight === 50 ? 'bg-amber-400 text-black border-amber-400' : 'bg-neutral-900 text-neutral-400 border-neutral-700'
                }`}
              >
                Standard (50:50)
              </button>
              <button
                type="button"
                onClick={() => handleSbaWeightChange(30)}
                className={`px-2.5 py-1 text-[11px] border font-bold ${
                  sbaWeight === 30 ? 'bg-amber-400 text-black border-amber-400' : 'bg-neutral-900 text-neutral-400 border-neutral-700'
                }`}
              >
                NaCCA / JHS (30:70)
              </button>
              <button
                type="button"
                onClick={() => handleSbaWeightChange(40)}
                className={`px-2.5 py-1 text-[11px] border font-bold ${
                  sbaWeight === 40 ? 'bg-amber-400 text-black border-amber-400' : 'bg-neutral-900 text-neutral-400 border-neutral-700'
                }`}
              >
                Primary (40:60)
              </button>
              <button
                type="button"
                onClick={() => handleSbaWeightChange(20)}
                className={`px-2.5 py-1 text-[11px] border font-bold ${
                  sbaWeight === 20 ? 'bg-amber-400 text-black border-amber-400' : 'bg-neutral-900 text-neutral-400 border-neutral-700'
                }`}
              >
                Exam-Heavy (20:80)
              </button>
            </div>
          </div>

          {/* School Contact & Branding */}
          <div className="p-4 bg-neutral-950 border border-neutral-800 space-y-3">
            <label className="font-bold text-amber-400 block uppercase">
              School Details & Report Branding:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-neutral-400 block mb-1">School Motto:</label>
                <input
                  type="text"
                  value={schoolMotto}
                  onChange={e => setSchoolMotto(e.target.value)}
                  placeholder="Holiness is our Key"
                  className="w-full bg-neutral-900 border border-neutral-700 text-white px-3 py-2 font-bold"
                />
              </div>
              <div>
                <label className="text-neutral-400 block mb-1">School Phone / Tel:</label>
                <input
                  type="text"
                  value={schoolPhone}
                  onChange={e => setSchoolPhone(e.target.value)}
                  placeholder="0545029200 / 0507274133"
                  className="w-full bg-neutral-900 border border-neutral-700 text-white px-3 py-2 font-bold"
                />
              </div>
            </div>
            <div>
              <label className="text-neutral-400 block mb-1">School Address & Postal Info:</label>
              <input
                type="text"
                value={schoolAddress}
                onChange={e => setSchoolAddress(e.target.value)}
                placeholder="P. O. Box LS 15, Sawla-Savannah Region, Ghana."
                className="w-full bg-neutral-900 border border-neutral-700 text-white px-3 py-2 font-bold"
              />
            </div>
          </div>

          {/* Academic Term Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-neutral-400 block mb-1">Academic Year:</label>
              <input
                type="text"
                value={academicYear}
                onChange={e => setAcademicYear(e.target.value)}
                placeholder="2025/2026"
                className="w-full bg-neutral-950 border border-neutral-700 text-white px-3 py-2 font-bold"
              />
            </div>
            <div>
              <label className="text-neutral-400 block mb-1">Vacation Date:</label>
              <input
                type="date"
                value={vacationDate}
                onChange={e => setVacationDate(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 text-white px-3 py-2 font-bold"
              />
            </div>
            <div>
              <label className="text-neutral-400 block mb-1">Reopening Date:</label>
              <input
                type="date"
                value={nextTermReopeningDate}
                onChange={e => setNextTermReopeningDate(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 text-white px-3 py-2 font-bold"
              />
            </div>
          </div>

          {/* Headteacher Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-neutral-400 block mb-1">Headteacher / Principal Name:</label>
              <input
                type="text"
                value={headName}
                onChange={e => setHeadName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 text-white px-3 py-2 font-bold"
              />
            </div>
            <div>
              <label className="text-neutral-400 block mb-1">Official Designation Title:</label>
              <select
                value={headTitle}
                onChange={e => setHeadTitle(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 text-white px-3 py-2 font-bold"
              >
                <option value="Headmaster">Headmaster</option>
                <option value="Headmistress">Headmistress</option>
                <option value="Principal">Principal</option>
                <option value="Proprietor">Proprietor</option>
              </select>
            </div>
          </div>

          {/* Report Display Toggles */}
          <div className="p-3 bg-neutral-950 border border-neutral-800 space-y-2">
            <span className="font-bold text-neutral-300 block uppercase text-[11px]">Report Card Display Elements:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPos}
                  onChange={e => setShowPos(e.target.checked)}
                  className="accent-amber-400"
                />
                <span className="text-neutral-300">Class Positions</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showMedals}
                  onChange={e => setShowMedals(e.target.checked)}
                  className="accent-amber-400"
                />
                <span className="text-amber-400 font-bold">🥇 Top 3 Medals</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showFeeStatus}
                  onChange={e => setShowFeeStatus(e.target.checked)}
                  className="accent-amber-400"
                />
                <span className="text-emerald-400 font-bold">💳 Fee Status Balance</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAtt}
                  onChange={e => setShowAtt(e.target.checked)}
                  className="accent-amber-400"
                />
                <span className="text-neutral-300">Attendance Ratio</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCond}
                  onChange={e => setShowCond(e.target.checked)}
                  className="accent-amber-400"
                />
                <span className="text-neutral-300">Conduct / Attitude</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleSeedDemoMarks}
                disabled={isSeeding}
                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 px-3 py-2 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Populate test SBA marks for demo purposes"
              >
                <Sparkles size={14} className="text-amber-400" />
                <span>{isSeeding ? 'Generating Marks...' : 'Populate Sample Marks'}</span>
              </button>

              <button
                type="button"
                onClick={handleUnpopulateMarks}
                disabled={isClearingAll}
                className="bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/80 px-3 py-2 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Unpopulate / Clear all assessment marks across the entire school"
              >
                <RotateCcw size={14} className="text-rose-400" />
                <span>{isClearingAll ? 'Unpopulating...' : 'Unpopulate Sample Marks'}</span>
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="bg-neutral-800 text-neutral-300 px-4 py-2 text-xs font-mono"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="bg-amber-400 hover:bg-amber-300 text-black font-black uppercase tracking-wider px-5 py-2 text-xs font-mono flex items-center gap-1.5"
              >
                <Save size={14} />
                <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
