import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  BookOpen, Sliders, Award, Calendar, CheckCircle2, 
  RotateCcw, Sparkles, Plus, Trash2, Edit2, ShieldAlert,
  GraduationCap, Scale, FileText, School, Percent, Eye, Save, Search, RefreshCw
} from 'lucide-react';
import { 
  DEFAULT_GHANA_SUBJECTS, 
  DEFAULT_ACADEMIC_SETTINGS,
  GES_9_POINT_SCALE,
  CurriculumSubject
} from '../../utils/ghanaCurriculum';

export const CurriculumSettingsView: React.FC = () => {
  const { 
    academicSettings, 
    updateAcademicSettings, 
    students,
    academicAssessments,
    saveAcademicAssessment,
    theme,
    playFeedbackSound
  } = useApp();

  const isLight = theme === 'light';

  // Form states with fallback to DEFAULT_ACADEMIC_SETTINGS
  const [sbaWeight, setSbaWeight] = useState<number>(academicSettings?.sbaWeight ?? 50);
  const [examWeight, setExamWeight] = useState<number>(academicSettings?.examWeight ?? 50);
  const [academicYear, setAcademicYear] = useState<string>(academicSettings?.academicYear || '2025/2026');
  const [nextTermReopeningDate, setNextTermReopeningDate] = useState<string>(academicSettings?.nextTermReopeningDate || '2026-09-08');
  const [vacationDate, setVacationDate] = useState<string>(academicSettings?.vacationDate || '2026-07-24');
  const [headName, setHeadName] = useState<string>(academicSettings?.headteacherName || 'Yakubu Hakeem');
  const [headTitle, setHeadTitle] = useState<string>(academicSettings?.headteacherTitle || 'Headmaster');
  const [headSigUrl, setHeadSigUrl] = useState<string>(academicSettings?.headteacherSignatureUrl || '');
  const [schoolName, setSchoolName] = useState<string>(academicSettings?.schoolName || 'SAAKO HOLY CHILD ACADEMY');
  const [schoolMotto, setSchoolMotto] = useState<string>(academicSettings?.schoolMotto || 'Holiness is our Key');
  const [schoolAddress, setSchoolAddress] = useState<string>(academicSettings?.schoolAddress || 'P. O. Box LS 15, Sawla-Savannah Region, Ghana.');
  const [schoolPhone, setSchoolPhone] = useState<string>(academicSettings?.schoolPhone || '0545029200 / 0507274133');
  const [schoolCrestUrl, setSchoolCrestUrl] = useState<string>(academicSettings?.customSchoolCrestUrl || '/school_logo.jpg');
  
  // Toggles
  const [showPos, setShowPos] = useState<boolean>(academicSettings?.showPositionOnReport ?? true);
  const [showAtt, setShowAtt] = useState<boolean>(academicSettings?.showAttendanceOnReport ?? true);
  const [showCond, setShowCond] = useState<boolean>(academicSettings?.showConductOnReport ?? true);
  const [showFeeStatus, setShowFeeStatus] = useState<boolean>(academicSettings?.showFeeStatusOnReport ?? true);
  const [showMedals, setShowMedals] = useState<boolean>(academicSettings?.showMedalsOnReport ?? true);
  const [showTeacherRemarks, setShowTeacherRemarks] = useState<boolean>(academicSettings?.showTeacherRemarks ?? true);
  const [showHeadteacherRemarks, setShowHeadteacherRemarks] = useState<boolean>(academicSettings?.showHeadteacherRemarks ?? true);
  const [gradingScale, setGradingScale] = useState<'GES_9_POINT' | 'STANDARD_PERCENT'>(academicSettings?.gradingScale || 'GES_9_POINT');

  // SBA breakdown
  const [classExercisesWeight, setClassExercisesWeight] = useState<number>(academicSettings?.sbaClassExercisesWeight ?? 20);
  const [homeworkWeight, setHomeworkWeight] = useState<number>(academicSettings?.sbaHomeworkWeight ?? 15);
  const [projectWeight, setProjectWeight] = useState<number>(academicSettings?.sbaProjectWeight ?? 15);

  // Subject Management States
  const [subjectsList, setSubjectsList] = useState<CurriculumSubject[]>(
    academicSettings?.customSubjects && academicSettings.customSubjects.length > 0 
      ? academicSettings.customSubjects 
      : DEFAULT_GHANA_SUBJECTS
  );
  const [disabledSubjectIds, setDisabledSubjectIds] = useState<string[]>(academicSettings?.disabledSubjectIds || []);
  const [subjectFilterLevel, setSubjectFilterLevel] = useState<'All' | 'KG' | 'Primary' | 'JHS'>('All');
  const [subjectSearch, setSubjectSearch] = useState<string>('');
  
  // Add/Edit Subject Modal
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState<boolean>(false);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState<string>('');
  const [newSubCode, setNewSubCode] = useState<string>('');
  const [newSubLevel, setNewSubLevel] = useState<'KG' | 'Primary' | 'JHS' | 'All'>('Primary');
  const [newSubCategory, setNewSubCategory] = useState<'Core' | 'Elective'>('Core');
  const [newSubDesc, setNewSubDesc] = useState<string>('');

  // UI state
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isPopulatingMarks, setIsPopulatingMarks] = useState<boolean>(false);
  const [populateSuccessMsg, setPopulateSuccessMsg] = useState<string | null>(null);

  // Sync state if academicSettings changes externally
  React.useEffect(() => {
    if (academicSettings) {
      setSbaWeight(academicSettings.sbaWeight ?? 50);
      setExamWeight(academicSettings.examWeight ?? 50);
      setAcademicYear(academicSettings.academicYear || '2025/2026');
      setNextTermReopeningDate(academicSettings.nextTermReopeningDate || '2026-09-08');
      setVacationDate(academicSettings.vacationDate || '2026-07-24');
      setHeadName(academicSettings.headteacherName || 'Yakubu Hakeem');
      setHeadTitle(academicSettings.headteacherTitle || 'Headmaster');
      setHeadSigUrl(academicSettings.headteacherSignatureUrl || '');
      setSchoolName(academicSettings.schoolName || 'SAAKO HOLY CHILD ACADEMY');
      setSchoolMotto(academicSettings.schoolMotto || 'Holiness is our Key');
      setSchoolAddress(academicSettings.schoolAddress || 'P. O. Box LS 15, Sawla-Savannah Region, Ghana.');
      setSchoolPhone(academicSettings.schoolPhone || '0545029200 / 0507274133');
      setSchoolCrestUrl(academicSettings.customSchoolCrestUrl || '/school_logo.jpg');
      setShowPos(academicSettings.showPositionOnReport ?? true);
      setShowAtt(academicSettings.showAttendanceOnReport ?? true);
      setShowCond(academicSettings.showConductOnReport ?? true);
      setShowFeeStatus(academicSettings.showFeeStatusOnReport ?? true);
      setShowMedals(academicSettings.showMedalsOnReport ?? true);
      setShowTeacherRemarks(academicSettings.showTeacherRemarks ?? true);
      setShowHeadteacherRemarks(academicSettings.showHeadteacherRemarks ?? true);
      setGradingScale(academicSettings.gradingScale || 'GES_9_POINT');
      setClassExercisesWeight(academicSettings.sbaClassExercisesWeight ?? 20);
      setHomeworkWeight(academicSettings.sbaHomeworkWeight ?? 15);
      setProjectWeight(academicSettings.sbaProjectWeight ?? 15);
      if (academicSettings.customSubjects && academicSettings.customSubjects.length > 0) {
        setSubjectsList(academicSettings.customSubjects);
      }
      if (academicSettings.disabledSubjectIds) {
        setDisabledSubjectIds(academicSettings.disabledSubjectIds);
      }
    }
  }, [academicSettings]);

  // Handle SBA weight changes with automatic complement
  const handleSbaChange = (newSba: number) => {
    const clampedSba = Math.max(0, Math.min(100, newSba));
    setSbaWeight(clampedSba);
    setExamWeight(100 - clampedSba);
  };

  const handleExamChange = (newExam: number) => {
    const clampedExam = Math.max(0, Math.min(100, newExam));
    setExamWeight(clampedExam);
    setSbaWeight(100 - clampedExam);
  };

  // Toggle subject enabled/disabled
  const handleToggleSubject = (subjectId: string) => {
    setDisabledSubjectIds(prev => {
      if (prev.includes(subjectId)) {
        return prev.filter(id => id !== subjectId);
      } else {
        return [...prev, subjectId];
      }
    });
  };

  // Subject filtering
  const filteredSubjects = useMemo(() => {
    return subjectsList.filter(s => {
      const matchLevel = subjectFilterLevel === 'All' || s.level === subjectFilterLevel || s.level === 'All';
      const q = subjectSearch.toLowerCase().trim();
      const matchSearch = !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q));
      return matchLevel && matchSearch;
    });
  }, [subjectsList, subjectFilterLevel, subjectSearch]);

  // Open add/edit subject
  const handleOpenAddSubject = (subject?: CurriculumSubject) => {
    if (subject) {
      setEditingSubjectId(subject.id);
      setNewSubName(subject.name);
      setNewSubCode(subject.code);
      setNewSubLevel(subject.level);
      setNewSubCategory(subject.category);
      setNewSubDesc(subject.description || '');
    } else {
      setEditingSubjectId(null);
      setNewSubName('');
      setNewSubCode('');
      setNewSubLevel('Primary');
      setNewSubCategory('Core');
      setNewSubDesc('');
    }
    setIsAddSubjectOpen(true);
  };

  const handleSaveSubjectItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim() || !newSubCode.trim()) return;

    if (editingSubjectId) {
      setSubjectsList(prev => prev.map(s => {
        if (s.id === editingSubjectId) {
          return {
            ...s,
            name: newSubName.trim(),
            code: newSubCode.trim().toUpperCase(),
            level: newSubLevel,
            category: newSubCategory,
            isCore: newSubCategory === 'Core',
            description: newSubDesc.trim()
          };
        }
        return s;
      }));
    } else {
      const newId = `sub_${newSubLevel.toLowerCase()}_${newSubCode.trim().toLowerCase()}_${Date.now()}`;
      const newSubject: CurriculumSubject = {
        id: newId,
        name: newSubName.trim(),
        code: newSubCode.trim().toUpperCase(),
        level: newSubLevel,
        category: newSubCategory,
        isCore: newSubCategory === 'Core',
        description: newSubDesc.trim(),
        order: subjectsList.length + 1
      };
      setSubjectsList(prev => [...prev, newSubject]);
    }
    setIsAddSubjectOpen(false);
    if (playFeedbackSound) playFeedbackSound('success');
  };

  const handleDeleteSubject = (subjectId: string) => {
    if (window.confirm('Are you sure you want to remove this subject from the school curriculum?')) {
      setSubjectsList(prev => prev.filter(s => s.id !== subjectId));
      setDisabledSubjectIds(prev => prev.filter(id => id !== subjectId));
      if (playFeedbackSound) playFeedbackSound('delete');
    }
  };

  const handleResetSubjects = () => {
    if (window.confirm('Restore official Ghana NaCCA Standard Subject List for all levels (KG, Primary, JHS)? Any custom subjects will be reset.')) {
      setSubjectsList(DEFAULT_GHANA_SUBJECTS);
      setDisabledSubjectIds([]);
      if (playFeedbackSound) playFeedbackSound('click');
    }
  };

  // Preset ratios
  const applyRatioPreset = (sba: number, exam: number) => {
    setSbaWeight(sba);
    setExamWeight(exam);
    if (playFeedbackSound) playFeedbackSound('click');
  };

  // Save All Settings
  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveSuccessMsg(null);
    try {
      await updateAcademicSettings({
        sbaWeight,
        examWeight,
        academicYear,
        activeTermNumber: academicSettings?.activeTermNumber || 1,
        nextTermReopeningDate,
        vacationDate,
        headteacherName: headName,
        headteacherTitle: headTitle,
        headteacherSignatureUrl: headSigUrl,
        schoolName,
        schoolMotto,
        schoolAddress,
        schoolPhone,
        customSchoolCrestUrl: schoolCrestUrl,
        showPositionOnReport: showPos,
        showAttendanceOnReport: showAtt,
        showConductOnReport: showCond,
        showTeacherRemarks,
        showHeadteacherRemarks,
        showFeeStatusOnReport: showFeeStatus,
        showMedalsOnReport: showMedals,
        gradingScale,
        customSubjects: subjectsList,
        disabledSubjectIds: disabledSubjectIds,
        sbaClassExercisesWeight: classExercisesWeight,
        sbaHomeworkWeight: homeworkWeight,
        sbaProjectWeight: projectWeight
      });

      if (playFeedbackSound) playFeedbackSound('success');
      setSaveSuccessMsg('Curriculum and SBA assessment settings saved successfully!');
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (e) {
      console.error('Failed to save academic settings:', e);
      alert('Error saving settings. Please check database connection.');
    } finally {
      setIsSaving(false);
    }
  };

  // Restore GES Standard Defaults
  const handleRestoreDefaults = async () => {
    if (window.confirm('Restore all official GES NaCCA assessment defaults (50:50 SBA/Exam weighting, standard grading scale, 2025/2026 academic year)?')) {
      setIsSaving(true);
      try {
        await updateAcademicSettings(DEFAULT_ACADEMIC_SETTINGS);
        setSbaWeight(DEFAULT_ACADEMIC_SETTINGS.sbaWeight);
        setExamWeight(DEFAULT_ACADEMIC_SETTINGS.examWeight);
        setAcademicYear(DEFAULT_ACADEMIC_SETTINGS.academicYear);
        setNextTermReopeningDate(DEFAULT_ACADEMIC_SETTINGS.nextTermReopeningDate);
        setVacationDate(DEFAULT_ACADEMIC_SETTINGS.vacationDate);
        setHeadName(DEFAULT_ACADEMIC_SETTINGS.headteacherName);
        setHeadTitle(DEFAULT_ACADEMIC_SETTINGS.headteacherTitle);
        setSchoolName(DEFAULT_ACADEMIC_SETTINGS.schoolName || 'SAAKO HOLY CHILD ACADEMY');
        setSchoolMotto(DEFAULT_ACADEMIC_SETTINGS.schoolMotto);
        setSchoolAddress(DEFAULT_ACADEMIC_SETTINGS.schoolAddress);
        setSchoolPhone(DEFAULT_ACADEMIC_SETTINGS.schoolPhone);
        setShowPos(DEFAULT_ACADEMIC_SETTINGS.showPositionOnReport);
        setShowAtt(DEFAULT_ACADEMIC_SETTINGS.showAttendanceOnReport);
        setShowCond(DEFAULT_ACADEMIC_SETTINGS.showConductOnReport);
        setShowFeeStatus(DEFAULT_ACADEMIC_SETTINGS.showFeeStatusOnReport);
        setShowMedals(DEFAULT_ACADEMIC_SETTINGS.showMedalsOnReport ?? true);
        setSubjectsList(DEFAULT_GHANA_SUBJECTS);
        setDisabledSubjectIds([]);
        if (playFeedbackSound) playFeedbackSound('success');
        setSaveSuccessMsg('Official GES / NaCCA standard settings restored!');
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Populate realistic sample marks across all enrolled pupils
  const handlePopulateSampleMarks = async () => {
    if (!students || students.length === 0) {
      alert('No pupils enrolled in the school yet to populate marks for.');
      return;
    }

    if (!window.confirm(`Populate realistic SBA continuous assessment and exam marks for all ${students.length} enrolled pupils across active curriculum subjects? Existing marks for Term 1 will be safely complemented.`)) {
      return;
    }

    setIsPopulatingMarks(true);
    setPopulateSuccessMsg(null);

    try {
      const activeTerm = academicSettings?.activeTermNumber || 1;
      let count = 0;

      for (const student of students) {
        const studentSubjects = subjectsList.filter(s => {
          let level = 'Primary';
          if (['Nursery', 'KG1', 'KG2'].includes(student.class)) level = 'KG';
          else if (['B7', 'B8', 'B9', 'JHS1', 'JHS2', 'JHS3'].includes(student.class)) level = 'JHS';
          return (s.level === level || s.level === 'All') && !disabledSubjectIds.includes(s.id);
        });

        for (const sub of studentSubjects) {
          const baseScore = Math.floor(55 + Math.random() * 38); // 55 to 93
          const sbaScore = Math.min(100, Math.max(40, Math.round(baseScore + (Math.random() * 10 - 5))));
          const examScore = Math.min(100, Math.max(35, Math.round(baseScore + (Math.random() * 12 - 6))));

          await saveAcademicAssessment({
            id: `asm_${student.id}_${sub.id}_T${activeTerm}_${academicYear.replace('/', '_')}`,
            studentId: student.id,
            studentName: student.name,
            class: student.class,
            academicYear: academicYear,
            term: activeTerm,
            subjectId: sub.id,
            subjectName: sub.name,
            sbaScore: sbaScore,
            examScore: examScore,
            teacherRemarks: sbaScore >= 80 ? 'Demonstrates exceptional mastery of concepts.' : sbaScore >= 65 ? 'Good performance. Keep up the effort.' : 'Satisfactory. Needs more practice.',
            updatedAt: new Date().toISOString()
          });
          count++;
        }
      }

      if (playFeedbackSound) playFeedbackSound('success');
      setPopulateSuccessMsg(`Successfully populated ${count} continuous assessment & examination records across all enrolled pupils!`);
      setTimeout(() => setPopulateSuccessMsg(null), 6000);
    } catch (e) {
      console.error(e);
      alert('Failed to populate sample marks: ' + String(e));
    } finally {
      setIsPopulatingMarks(false);
    }
  };

  return (
    <div id="curriculum-settings-view" className="space-y-6">
      {/* Header Banner */}
      <div className={`p-6 border-2 border-black ${isLight ? 'bg-amber-50' : 'bg-amber-950/30'} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-400 border-2 border-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <BookOpen size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 bg-black text-amber-400">
                  Ghana NaCCA / GES Assessment Standards
                </span>
                <span className="text-xs font-mono px-2 py-0.5 bg-emerald-500 text-white font-bold">
                  Active
                </span>
              </div>
              <h2 className="text-2xl font-black tracking-tight mt-1">
                Curriculum, SBA Weighting & Academic Settings
              </h2>
              <p className={`text-sm mt-0.5 ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
                Configure curriculum subjects (KG, Primary, JHS Common Core), assessment weight ratios, term dates, and report card branding.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRestoreDefaults}
              className={`px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider border-2 border-black flex items-center gap-2 transition-all cursor-pointer ${
                isLight ? 'bg-white hover:bg-neutral-100 text-neutral-800' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
              } shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}
              title="Restore official GES/NaCCA assessment defaults"
            >
              <RotateCcw size={14} />
              <span>Restore Defaults</span>
            </button>

            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-5 py-2 text-xs font-mono font-bold uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 transition-all cursor-pointer"
            >
              <Save size={16} />
              <span>{isSaving ? 'Saving...' : 'Save All Settings'}</span>
            </button>
          </div>
        </div>

        {saveSuccessMsg && (
          <div className="mt-4 p-3 bg-emerald-500 text-black border-2 border-black font-mono font-bold text-xs flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-bounce">
            <CheckCircle2 size={16} />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {populateSuccessMsg && (
          <div className="mt-4 p-3 bg-amber-400 text-black border-2 border-black font-mono font-bold text-xs flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Sparkles size={16} />
            <span>{populateSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Grid Layout for Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: SBA & Assessment Weighting + School Info (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section 1: SBA Assessment Weighting */}
          <div className={`p-5 border-2 border-black ${isLight ? 'bg-white' : 'bg-neutral-900'} shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]`}>
            <div className="flex items-center justify-between pb-3 border-b-2 border-black mb-4">
              <div className="flex items-center gap-2">
                <Sliders className="text-amber-500" size={20} />
                <h3 className="font-mono font-bold text-base uppercase">1. SBA Assessment & Exam Weighting</h3>
              </div>
              <span className="text-xs font-mono font-bold bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 border border-black">
                Total: {sbaWeight + examWeight}%
              </span>
            </div>

            {/* Quick Ratio Presets */}
            <div className="mb-4">
              <label className="block text-xs font-mono font-bold uppercase mb-2">Standard Ghanaian Ratios:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => applyRatioPreset(50, 50)}
                  className={`p-2 border-2 border-black text-xs font-mono font-bold text-center cursor-pointer transition-all ${
                    sbaWeight === 50 && examWeight === 50
                      ? 'bg-amber-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      : isLight ? 'bg-neutral-100 hover:bg-neutral-200' : 'bg-neutral-800 hover:bg-neutral-700'
                  }`}
                >
                  <div className="text-sm">50 : 50</div>
                  <div className="text-[10px] opacity-75 font-normal">Standard Balanced</div>
                </button>

                <button
                  type="button"
                  onClick={() => applyRatioPreset(30, 70)}
                  className={`p-2 border-2 border-black text-xs font-mono font-bold text-center cursor-pointer transition-all ${
                    sbaWeight === 30 && examWeight === 70
                      ? 'bg-amber-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      : isLight ? 'bg-neutral-100 hover:bg-neutral-200' : 'bg-neutral-800 hover:bg-neutral-700'
                  }`}
                >
                  <div className="text-sm">30 : 70</div>
                  <div className="text-[10px] opacity-75 font-normal">NaCCA JHS/BECE</div>
                </button>

                <button
                  type="button"
                  onClick={() => applyRatioPreset(40, 60)}
                  className={`p-2 border-2 border-black text-xs font-mono font-bold text-center cursor-pointer transition-all ${
                    sbaWeight === 40 && examWeight === 60
                      ? 'bg-amber-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      : isLight ? 'bg-neutral-100 hover:bg-neutral-200' : 'bg-neutral-800 hover:bg-neutral-700'
                  }`}
                >
                  <div className="text-sm">40 : 60</div>
                  <div className="text-[10px] opacity-75 font-normal">Primary Standard</div>
                </button>

                <button
                  type="button"
                  onClick={() => applyRatioPreset(20, 80)}
                  className={`p-2 border-2 border-black text-xs font-mono font-bold text-center cursor-pointer transition-all ${
                    sbaWeight === 20 && examWeight === 80
                      ? 'bg-amber-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      : isLight ? 'bg-neutral-100 hover:bg-neutral-200' : 'bg-neutral-800 hover:bg-neutral-700'
                  }`}
                >
                  <div className="text-sm">20 : 80</div>
                  <div className="text-[10px] opacity-75 font-normal">Exam Intensive</div>
                </button>
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-4 pt-2">
              <div>
                <div className="flex justify-between items-center mb-1 text-xs font-mono font-bold">
                  <span>Continuous Assessment (SBA) Weight:</span>
                  <span className="text-base text-amber-600 dark:text-amber-400">{sbaWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={sbaWeight}
                  onChange={(e) => handleSbaChange(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1 text-xs font-mono font-bold">
                  <span>End-of-Term Examination Weight:</span>
                  <span className="text-base text-blue-600 dark:text-blue-400">{examWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={examWeight}
                  onChange={(e) => handleExamChange(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg"
                />
              </div>
            </div>

            {/* SBA Sub-components breakdown */}
            <div className="mt-4 pt-4 border-t border-neutral-300 dark:border-neutral-700">
              <label className="block text-xs font-mono font-bold uppercase mb-2 text-neutral-600 dark:text-neutral-400">
                SBA Components Breakdown (Recommended Reference):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className={`p-2.5 border border-black ${isLight ? 'bg-neutral-50' : 'bg-neutral-800'}`}>
                  <div className="text-[11px] font-mono font-bold text-neutral-500 uppercase">Classwork & Tests</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-mono">Exercises / Quizzes</span>
                    <input
                      type="number"
                      value={classExercisesWeight}
                      onChange={(e) => setClassExercisesWeight(Number(e.target.value))}
                      className="w-14 p-1 text-xs font-mono font-bold text-center border border-black bg-white dark:bg-neutral-900"
                    />
                  </div>
                </div>

                <div className={`p-2.5 border border-black ${isLight ? 'bg-neutral-50' : 'bg-neutral-800'}`}>
                  <div className="text-[11px] font-mono font-bold text-neutral-500 uppercase">Homework & Tasks</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-mono">Assignments</span>
                    <input
                      type="number"
                      value={homeworkWeight}
                      onChange={(e) => setHomeworkWeight(Number(e.target.value))}
                      className="w-14 p-1 text-xs font-mono font-bold text-center border border-black bg-white dark:bg-neutral-900"
                    />
                  </div>
                </div>

                <div className={`p-2.5 border border-black ${isLight ? 'bg-neutral-50' : 'bg-neutral-800'}`}>
                  <div className="text-[11px] font-mono font-bold text-neutral-500 uppercase">Projects & Practical</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-mono">Project Work</span>
                    <input
                      type="number"
                      value={projectWeight}
                      onChange={(e) => setProjectWeight(Number(e.target.value))}
                      className="w-14 p-1 text-xs font-mono font-bold text-center border border-black bg-white dark:bg-neutral-900"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: School Details, Motto & Term Dates */}
          <div className={`p-5 border-2 border-black ${isLight ? 'bg-white' : 'bg-neutral-900'} shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]`}>
            <div className="flex items-center gap-2 pb-3 border-b-2 border-black mb-4">
              <School className="text-emerald-500" size={20} />
              <h3 className="font-mono font-bold text-base uppercase">2. School Branding & Term Dates</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase mb-1">Official School Name</label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className={`w-full p-2 text-xs font-mono border-2 border-black ${isLight ? 'bg-neutral-50' : 'bg-neutral-800'}`}
                  placeholder="e.g. SAAKO HOLY CHILD ACADEMY"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase mb-1">School Motto</label>
                <input
                  type="text"
                  value={schoolMotto}
                  onChange={(e) => setSchoolMotto(e.target.value)}
                  className={`w-full p-2 text-xs font-mono border-2 border-black ${isLight ? 'bg-neutral-50' : 'bg-neutral-800'}`}
                  placeholder="e.g. Holiness is our Key"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase mb-1">Postal Address</label>
                <input
                  type="text"
                  value={schoolAddress}
                  onChange={(e) => setSchoolAddress(e.target.value)}
                  className={`w-full p-2 text-xs font-mono border-2 border-black ${isLight ? 'bg-neutral-50' : 'bg-neutral-800'}`}
                  placeholder="e.g. P. O. Box LS 15, Sawla-Savannah Region, Ghana."
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase mb-1">Official Contact Phones</label>
                <input
                  type="text"
                  value={schoolPhone}
                  onChange={(e) => setSchoolPhone(e.target.value)}
                  className={`w-full p-2 text-xs font-mono border-2 border-black ${isLight ? 'bg-neutral-50' : 'bg-neutral-800'}`}
                  placeholder="e.g. 0545029200 / 0507274133"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase mb-1">Headteacher / Principal Name</label>
                <input
                  type="text"
                  value={headName}
                  onChange={(e) => setHeadName(e.target.value)}
                  className={`w-full p-2 text-xs font-mono border-2 border-black ${isLight ? 'bg-neutral-50' : 'bg-neutral-800'}`}
                  placeholder="e.g. Yakubu Hakeem"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase mb-1">Headteacher Official Title</label>
                <select
                  value={headTitle}
                  onChange={(e) => setHeadTitle(e.target.value)}
                  className={`w-full p-2 text-xs font-mono border-2 border-black ${isLight ? 'bg-neutral-50' : 'bg-neutral-800'}`}
                >
                  <option value="Headmaster">Headmaster</option>
                  <option value="Headmistress">Headmistress</option>
                  <option value="Principal">Principal</option>
                  <option value="Proprietor">Proprietor / Director</option>
                  <option value="Administrator">Academic Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase mb-1">Current Academic Year</label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className={`w-full p-2 text-xs font-mono border-2 border-black ${isLight ? 'bg-neutral-50' : 'bg-neutral-800'}`}
                  placeholder="e.g. 2025/2026"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase mb-1">Term Vacation Date</label>
                <input
                  type="date"
                  value={vacationDate}
                  onChange={(e) => setVacationDate(e.target.value)}
                  className={`w-full p-2 text-xs font-mono border-2 border-black ${isLight ? 'bg-neutral-50' : 'bg-neutral-800'}`}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-mono font-bold uppercase mb-1">Next Term Reopening Date</label>
                <input
                  type="date"
                  value={nextTermReopeningDate}
                  onChange={(e) => setNextTermReopeningDate(e.target.value)}
                  className={`w-full p-2 text-xs font-mono border-2 border-black ${isLight ? 'bg-neutral-50' : 'bg-neutral-800'}`}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Report Card Display Toggles */}
          <div className={`p-5 border-2 border-black ${isLight ? 'bg-white' : 'bg-neutral-900'} shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]`}>
            <div className="flex items-center gap-2 pb-3 border-b-2 border-black mb-4">
              <Eye className="text-purple-500" size={20} />
              <h3 className="font-mono font-bold text-base uppercase">3. Terminal Report Card Display Options</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className={`p-3 border border-black flex items-center gap-3 cursor-pointer ${isLight ? 'bg-neutral-50' : 'bg-neutral-800'}`}>
                <input
                  type="checkbox"
                  checked={showPos}
                  onChange={(e) => setShowPos(e.target.checked)}
                  className="w-4 h-4 accent-amber-500"
                />
                <div>
                  <div className="text-xs font-mono font-bold">Class Positions</div>
                  <div className="text-[10px] text-neutral-500">Show pupil rank (e.g. 1st of 45)</div>
                </div>
              </label>

              <label className={`p-3 border border-black flex items-center gap-3 cursor-pointer ${isLight ? 'bg-neutral-50' : 'bg-neutral-800'}`}>
                <input
                  type="checkbox"
                  checked={showMedals}
                  onChange={(e) => setShowMedals(e.target.checked)}
                  className="w-4 h-4 accent-amber-500"
                />
                <div>
                  <div className="text-xs font-mono font-bold">Top 3 Rank Medals</div>
                  <div className="text-[10px] text-neutral-500">🥇 Gold, 🥈 Silver, 🥉 Bronze Badges</div>
                </div>
              </label>

              <label className={`p-3 border border-black flex items-center gap-3 cursor-pointer ${isLight ? 'bg-neutral-50' : 'bg-neutral-800'}`}>
                <input
                  type="checkbox"
                  checked={showFeeStatus}
                  onChange={(e) => setShowFeeStatus(e.target.checked)}
                  className="w-4 h-4 accent-amber-500"
                />
                <div>
                  <div className="text-xs font-mono font-bold">Fee Arrears Summary</div>
                  <div className="text-[10px] text-neutral-500">Show billings, paid & balance on report</div>
                </div>
              </label>

              <label className={`p-3 border border-black flex items-center gap-3 cursor-pointer ${isLight ? 'bg-neutral-50' : 'bg-neutral-800'}`}>
                <input
                  type="checkbox"
                  checked={showAtt}
                  onChange={(e) => setShowAtt(e.target.checked)}
                  className="w-4 h-4 accent-amber-500"
                />
                <div>
                  <div className="text-xs font-mono font-bold">Pupil Attendance Ratio</div>
                  <div className="text-[10px] text-neutral-500">Show days present out of total sessions</div>
                </div>
              </label>

              <label className={`p-3 border border-black flex items-center gap-3 cursor-pointer ${isLight ? 'bg-neutral-50' : 'bg-neutral-800'}`}>
                <input
                  type="checkbox"
                  checked={showCond}
                  onChange={(e) => setShowCond(e.target.checked)}
                  className="w-4 h-4 accent-amber-500"
                />
                <div>
                  <div className="text-xs font-mono font-bold">Conduct & Attitude</div>
                  <div className="text-[10px] text-neutral-500">Show character remarks & interest fields</div>
                </div>
              </label>

              <label className={`p-3 border border-black flex items-center gap-3 cursor-pointer ${isLight ? 'bg-neutral-50' : 'bg-neutral-800'}`}>
                <input
                  type="checkbox"
                  checked={showTeacherRemarks && showHeadteacherRemarks}
                  onChange={(e) => {
                    setShowTeacherRemarks(e.target.checked);
                    setShowHeadteacherRemarks(e.target.checked);
                  }}
                  className="w-4 h-4 accent-amber-500"
                />
                <div>
                  <div className="text-xs font-mono font-bold">Teacher & Head Remarks</div>
                  <div className="text-[10px] text-neutral-500">Show class teacher & headmaster remarks</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Ghana NaCCA Curriculum Subjects Manager & Grading Scale (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Section 4: Ghana NaCCA Subjects Management */}
          <div className={`p-5 border-2 border-black ${isLight ? 'bg-white' : 'bg-neutral-900'} shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b-2 border-black mb-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="text-blue-500" size={20} />
                <h3 className="font-mono font-bold text-base uppercase">4. Curriculum Subjects</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetSubjects}
                  className="text-[11px] font-mono px-2 py-1 border border-black bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 flex items-center gap-1 cursor-pointer"
                  title="Reset to official Ghana GES subjects"
                >
                  <RefreshCw size={12} />
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAddSubject()}
                  className="text-xs font-mono font-bold px-2.5 py-1 bg-amber-400 text-black border border-black hover:bg-amber-300 flex items-center gap-1 cursor-pointer shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                >
                  <Plus size={14} />
                  <span>Add Subject</span>
                </button>
              </div>
            </div>

            {/* Level Filter and Search */}
            <div className="space-y-2 mb-3">
              <div className="flex flex-wrap gap-1">
                {(['All', 'KG', 'Primary', 'JHS'] as const).map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSubjectFilterLevel(lvl)}
                    className={`px-2.5 py-1 text-xs font-mono font-bold border border-black cursor-pointer transition-all ${
                      subjectFilterLevel === lvl
                        ? 'bg-black text-white dark:bg-amber-400 dark:text-black'
                        : isLight ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                    }`}
                  >
                    {lvl === 'All' ? 'All Levels' : lvl}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 text-neutral-400" size={14} />
                <input
                  type="text"
                  placeholder="Search subjects by name or code..."
                  value={subjectSearch}
                  onChange={(e) => setSubjectSearch(e.target.value)}
                  className={`w-full pl-8 pr-3 py-1.5 text-xs font-mono border border-black ${isLight ? 'bg-neutral-50' : 'bg-neutral-800'}`}
                />
              </div>
            </div>

            {/* Subjects Scrollable List */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {filteredSubjects.map((sub) => {
                const isDisabled = disabledSubjectIds.includes(sub.id);
                return (
                  <div
                    key={sub.id}
                    className={`p-2.5 border-2 border-black transition-all flex items-center justify-between gap-2 ${
                      isDisabled 
                        ? 'opacity-50 bg-neutral-100 dark:bg-neutral-950/60' 
                        : isLight ? 'bg-white hover:bg-amber-50/50' : 'bg-neutral-800/80 hover:bg-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={!isDisabled}
                        onChange={() => handleToggleSubject(sub.id)}
                        className="w-4 h-4 accent-amber-500 cursor-pointer"
                        title={isDisabled ? 'Enable Subject' : 'Disable Subject'}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs truncate">{sub.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-neutral-200 dark:bg-neutral-700 border border-black font-bold">
                            {sub.code}
                          </span>
                        </div>
                        <div className="text-[10px] text-neutral-500 flex items-center gap-2 mt-0.5">
                          <span>Level: {sub.level}</span>
                          <span>•</span>
                          <span className={sub.category === 'Core' ? 'text-blue-600 font-bold' : 'text-purple-600'}>
                            {sub.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenAddSubject(sub)}
                        className="p-1 text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white"
                        title="Edit Subject"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSubject(sub.id)}
                        className="p-1 text-red-500 hover:text-red-700"
                        title="Remove Subject"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredSubjects.length === 0 && (
                <div className="p-6 text-center text-xs font-mono text-neutral-500 border border-dashed border-neutral-400">
                  No subjects match your query.
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Official GES 9-Point Grading Scale */}
          <div className={`p-5 border-2 border-black ${isLight ? 'bg-white' : 'bg-neutral-900'} shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]`}>
            <div className="flex items-center gap-2 pb-3 border-b-2 border-black mb-3">
              <Award className="text-amber-500" size={20} />
              <h3 className="font-mono font-bold text-base uppercase">5. Ghana 9-Point Grading Scale</h3>
            </div>
            
            <p className="text-xs text-neutral-500 mb-3">
              Official Ghana Education Service (GES) achievement levels and grade cutoffs used in terminal reports:
            </p>

            <div className="space-y-1 text-xs font-mono">
              {GES_9_POINT_SCALE.map((scaleItem) => (
                <div 
                  key={scaleItem.grade}
                  className={`p-1.5 px-2 border border-neutral-300 dark:border-neutral-700 flex items-center justify-between ${
                    scaleItem.grade === 1 
                      ? 'bg-amber-100 dark:bg-amber-950/40 font-bold border-amber-400' 
                      : scaleItem.grade <= 3 
                      ? isLight ? 'bg-neutral-50' : 'bg-neutral-800' 
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 flex items-center justify-center bg-black text-white font-bold text-xs rounded-sm">
                      {scaleItem.grade}
                    </span>
                    <span className="font-bold">{scaleItem.minScore} - {scaleItem.maxScore}%</span>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-[11px]">{scaleItem.description}</div>
                    <div className="text-[9px] text-neutral-500">{scaleItem.level}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 6: Mark Simulation & Continuous Assessment Tools */}
          <div className={`p-5 border-2 border-black ${isLight ? 'bg-neutral-50' : 'bg-neutral-800/80'} shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]`}>
            <div className="flex items-center gap-2 pb-3 border-b-2 border-black mb-3">
              <Sparkles className="text-amber-500" size={20} />
              <h3 className="font-mono font-bold text-sm uppercase">Quick Assessment Utilities</h3>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-3">
              Populate realistic Ghanaian SBA & exam marks for all enrolled pupils across classes to test performance analytics and terminal reports.
            </p>

            <button
              type="button"
              onClick={handlePopulateSampleMarks}
              disabled={isPopulatingMarks}
              className="w-full py-2.5 px-4 text-xs font-mono font-bold uppercase tracking-wider bg-amber-400 hover:bg-amber-300 text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles size={16} />
              <span>{isPopulatingMarks ? 'Generating Marks...' : 'Populate Sample SBA & Exam Marks'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* Add / Edit Subject Modal */}
      {isAddSubjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className={`w-full max-w-md p-6 border-4 border-black ${isLight ? 'bg-white' : 'bg-neutral-900'} shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4 animate-in fade-in zoom-in duration-150`}>
            <div className="flex items-center justify-between pb-3 border-b-2 border-black">
              <h3 className="font-mono font-bold text-lg uppercase flex items-center gap-2">
                <BookOpen size={20} className="text-amber-500" />
                <span>{editingSubjectId ? 'Edit Curriculum Subject' : 'Add Custom Subject'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddSubjectOpen(false)}
                className="text-neutral-500 hover:text-black font-mono font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSubjectItem} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase mb-1">Subject Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. French Language / Arabic / Music"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  className={`w-full p-2 text-xs font-mono border-2 border-black ${isLight ? 'bg-neutral-50' : 'bg-neutral-800'}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold uppercase mb-1">Subject Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="e.g. FRE / ARB"
                    value={newSubCode}
                    onChange={(e) => setNewSubCode(e.target.value.toUpperCase())}
                    className={`w-full p-2 text-xs font-mono font-bold border-2 border-black uppercase ${isLight ? 'bg-neutral-50' : 'bg-neutral-800'}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold uppercase mb-1">Class Level</label>
                  <select
                    value={newSubLevel}
                    onChange={(e) => setNewSubLevel(e.target.value as any)}
                    className={`w-full p-2 text-xs font-mono border-2 border-black ${isLight ? 'bg-neutral-50' : 'bg-neutral-800'}`}
                  >
                    <option value="KG">Kindergarten (KG)</option>
                    <option value="Primary">Primary (BS1 - BS6)</option>
                    <option value="JHS">JHS Common Core (B7 - B9)</option>
                    <option value="All">All Class Levels</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase mb-1">Subject Category</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-mono cursor-pointer">
                    <input
                      type="radio"
                      name="subCat"
                      checked={newSubCategory === 'Core'}
                      onChange={() => setNewSubCategory('Core')}
                      className="accent-amber-500"
                    />
                    <span>Core Subject</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-mono cursor-pointer">
                    <input
                      type="radio"
                      name="subCat"
                      checked={newSubCategory === 'Elective'}
                      onChange={() => setNewSubCategory('Elective')}
                      className="accent-amber-500"
                    />
                    <span>Elective Subject</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase mb-1">Description / Syllabus Scope</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Oral conversation, vocabulary, and introductory grammar"
                  value={newSubDesc}
                  onChange={(e) => setNewSubDesc(e.target.value)}
                  className={`w-full p-2 text-xs font-mono border-2 border-black ${isLight ? 'bg-neutral-50' : 'bg-neutral-800'}`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t-2 border-black">
                <button
                  type="button"
                  onClick={() => setIsAddSubjectOpen(false)}
                  className="px-4 py-2 text-xs font-mono font-bold uppercase border-2 border-black bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-mono font-bold uppercase bg-amber-400 hover:bg-amber-300 text-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  {editingSubjectId ? 'Update Subject' : 'Add Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
