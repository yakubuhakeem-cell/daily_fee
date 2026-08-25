/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { Student, StudentClass, ALL_CLASSES } from '../types';
import { useApp } from '../context/AppContext';
import { SchoolLogo } from './SchoolLogo';
import { printElementById } from '../utils/printUtils';
import { 
  Printer, 
  X, 
  Search, 
  FileText, 
  UserCheck, 
  Check, 
  Download, 
  ShieldCheck, 
  Calendar, 
  User, 
  Phone, 
  MapPin, 
  HeartPulse, 
  CreditCard, 
  Award, 
  Building, 
  CheckCircle2, 
  Sparkles,
  Layers,
  Copy,
  ChevronDown
} from 'lucide-react';

interface AdmissionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStudent?: Student | null;
  initialClass?: StudentClass;
}

export const AdmissionFormModal: React.FC<AdmissionFormModalProps> = ({
  isOpen,
  onClose,
  initialStudent = null,
  initialClass
}) => {
  const { students = [], systemSettings, realActiveTerm, terms = [], currentDate } = useApp();

  // Mode: 'student' (pre-filled with pupil data) vs 'blank' (for handing out to prospective parents)
  const [formMode, setFormMode] = useState<'student' | 'blank'>(initialStudent ? 'student' : 'student');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudent?.id || (students.length > 0 ? students[0].id : ''));
  const [selectedClass, setSelectedClass] = useState<StudentClass | 'ALL'>(initialClass || (initialStudent?.class || 'ALL'));
  const [blankTargetClass, setBlankTargetClass] = useState<StudentClass | 'GENERAL'>('GENERAL');
  const [searchQuery, setSearchQuery] = useState('');
  const [includeRulesPage, setIncludeRulesPage] = useState(true);
  const [blankCopiesCount, setBlankCopiesCount] = useState<number>(1);
  const [printStatus, setPrintStatus] = useState<string | null>(null);

  // Sync selectedStudentId when initialStudent changes
  React.useEffect(() => {
    if (initialStudent) {
      setFormMode('student');
      setSelectedStudentId(initialStudent.id);
      if (initialStudent.class) {
        setSelectedClass(initialStudent.class);
      }
    }
  }, [initialStudent]);

  // Filter students for picker
  const filteredStudents = useMemo(() => {
    let list = students.filter(s => s.active !== false);
    if (selectedClass !== 'ALL') {
      list = list.filter(s => s.class === selectedClass);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(s => 
        s.name.toLowerCase().includes(q) ||
        (s.rollNumber || '').toLowerCase().includes(q) ||
        (s.guardianPhone || '').includes(q)
      );
    }
    return list;
  }, [students, selectedClass, searchQuery]);

  // Active student being previewed
  const currentStudent = useMemo(() => {
    if (formMode === 'blank') return null;
    return students.find(s => s.id === selectedStudentId) || filteredStudents[0] || students[0] || null;
  }, [students, selectedStudentId, formMode, filteredStudents]);

  if (!isOpen) return null;

  const schoolName = systemSettings?.schoolName || 'SAAKO HOLY CHILD ACADEMY';
  const schoolMotto = systemSettings?.customMotto || 'Excellence in Education, Moral Discipline & Character';
  const schoolLocation = systemSettings?.customLocation || 'Sawla, Savannah Region, Ghana';
  const schoolPhone = systemSettings?.adminWhatsAppPhone || '+233 24 000 0000';
  const activeAcademicYear = realActiveTerm?.academicYear || '2025/2026';
  const activeTermName = realActiveTerm?.name || 'Term 2';
  const admissionFee = systemSettings?.baselineTermFee || 350.00;
  const dailyFee = systemSettings?.baselineDailyFee || 5.00;

  // Print Form Handler
  const handlePrint = (copies = 1) => {
    setPrintStatus('Preparing document for print...');
    const docTitle = formMode === 'blank'
      ? (blankTargetClass !== 'GENERAL' ? `Blank Admission Form - ${blankTargetClass}` : 'Official Blank Admission Form')
      : `Admission Form - ${currentStudent?.name || 'Pupil'}`;

    if (copies > 1) {
      // Create multi-page wrapper content
      const targetElement = document.getElementById('admission-form-printable-content');
      if (targetElement) {
        let multiHtml = '';
        for (let i = 0; i < copies; i++) {
          multiHtml += `<div class="admission-page-wrapper ${i > 0 ? 'break-before-page' : ''}">${targetElement.innerHTML}</div>`;
        }
        const tempContainer = document.createElement('div');
        tempContainer.id = 'temp-multi-admission-container';
        tempContainer.innerHTML = multiHtml;
        document.body.appendChild(tempContainer);
        printElementById('temp-multi-admission-container', {
          title: docTitle,
          orientation: 'portrait',
          pageMargin: '8mm'
        }).finally(() => {
          tempContainer.remove();
          setPrintStatus(null);
        });
        return;
      }
    }

    printElementById('admission-form-printable-content', {
      title: docTitle,
      orientation: 'portrait',
      pageMargin: '8mm'
    }).finally(() => {
      setTimeout(() => setPrintStatus(null), 1000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-neutral-900 border-2 border-neutral-700 w-full max-w-5xl max-h-[96vh] flex flex-col shadow-2xl rounded-none overflow-hidden my-auto text-left font-sans">
        
        {/* Modal Top Action Bar */}
        <div className="no-print bg-neutral-950 px-5 py-3.5 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-400 text-black font-black">
              <FileText size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black uppercase text-white tracking-wide font-mono">
                  Official Pupil Admission & Enrollment Form
                </h2>
                <span className="text-[10px] bg-neutral-800 text-amber-400 font-mono font-bold px-2 py-0.5 border border-neutral-700 uppercase">
                  Print Ready • A4
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Official institutional admission forms for new pupil enrollments & parent registrations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePrint(formMode === 'blank' ? blankCopiesCount : 1)}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black font-mono font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md"
              title="Print official admission form on standard A4 paper"
            >
              <Printer size={15} className="stroke-[2.5]" />
              <span>{formMode === 'blank' && blankCopiesCount > 1 ? `Print ${blankCopiesCount} Blank Forms` : 'Print Admission Form'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Controls Bar */}
        <div className="no-print bg-neutral-950/70 p-4 border-b border-neutral-800/80 flex flex-wrap items-center justify-between gap-4 shrink-0 font-mono text-xs">
          
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-neutral-900 p-1 border border-neutral-800">
            <button
              type="button"
              onClick={() => setFormMode('student')}
              className={`px-3 py-1.5 font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                formMode === 'student'
                  ? 'bg-amber-400 text-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <UserCheck size={13} />
              <span>Pre-filled Pupil Form</span>
            </button>

            <button
              type="button"
              onClick={() => setFormMode('blank')}
              className={`px-3 py-1.5 font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                formMode === 'blank'
                  ? 'bg-amber-400 text-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <FileText size={13} />
              <span>Blank Application Form (For Parents)</span>
            </button>
          </div>

          {/* Dynamic Selection controls depending on Mode */}
          {formMode === 'student' ? (
            <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl">
              {/* Class filter */}
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value as any);
                  const firstInClass = students.find(s => s.active !== false && (e.target.value === 'ALL' || s.class === e.target.value));
                  if (firstInClass) setSelectedStudentId(firstInClass.id);
                }}
                className="bg-neutral-900 border border-neutral-750 text-neutral-200 px-3 py-1.5 text-xs font-mono outline-none focus:border-amber-400"
              >
                <option value="ALL">All Classes ({students.filter(s => s.active !== false).length})</option>
                {ALL_CLASSES.map(cls => (
                  <option key={cls} value={cls}>
                    {cls} ({students.filter(s => s.active !== false && s.class === cls).length})
                  </option>
                ))}
              </select>

              {/* Student Dropdown / Search */}
              <div className="relative flex-1 min-w-[200px]">
                <select
                  value={currentStudent?.id || ''}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-750 text-white px-3 py-1.5 text-xs font-mono font-bold outline-none focus:border-amber-400 truncate"
                >
                  {filteredStudents.map(st => (
                    <option key={st.id} value={st.id}>
                      {st.name} • {st.class} ({st.rollNumber || 'No ID'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Search */}
              <div className="relative w-36">
                <Search size={12} className="absolute left-2.5 top-2.5 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Filter name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-750 py-1.5 pl-7 pr-2 text-xs font-mono text-white outline-none focus:border-amber-400 placeholder:text-neutral-600"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-neutral-400 uppercase font-bold text-[11px]">Target Grade:</span>
                <select
                  value={blankTargetClass}
                  onChange={(e) => setBlankTargetClass(e.target.value as any)}
                  className="bg-neutral-900 border border-neutral-750 text-neutral-200 px-3 py-1.5 text-xs font-mono outline-none focus:border-amber-400"
                >
                  <option value="GENERAL">General Form (All Grades / Open Admission)</option>
                  {ALL_CLASSES.map(cls => (
                    <option key={cls} value={cls}>Grade-Specific: {cls}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-neutral-400 uppercase font-bold text-[11px]">Print Copies:</span>
                <select
                  value={blankCopiesCount}
                  onChange={(e) => setBlankCopiesCount(Number(e.target.value))}
                  className="bg-neutral-900 border border-neutral-750 text-amber-400 font-black px-2 py-1.5 text-xs font-mono outline-none focus:border-amber-400"
                >
                  <option value={1}>1 Copy</option>
                  <option value={5}>5 Copies</option>
                  <option value={10}>10 Copies</option>
                  <option value={20}>20 Copies (Class Batch)</option>
                  <option value={50}>50 Copies (Admissions Pack)</option>
                </select>
              </div>
            </div>
          )}

          {/* Toggle Code of Conduct / Regulations Page */}
          <label className="flex items-center gap-2 text-neutral-300 cursor-pointer select-none text-[11px] ml-auto">
            <input
              type="checkbox"
              checked={includeRulesPage}
              onChange={(e) => setIncludeRulesPage(e.target.checked)}
              className="accent-amber-400 w-3.5 h-3.5 cursor-pointer"
            />
            <span>Include Rules & Regulations Sheet (Page 2)</span>
          </label>
        </div>

        {/* Scrollable Document Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-neutral-950/90 flex justify-center">
          
          {/* Printable Document Container (A4 Proportions) */}
          <div 
            id="admission-form-printable-content"
            className="w-full max-w-[800px] bg-white text-black p-8 sm:p-10 shadow-2xl border border-neutral-300 font-sans relative select-text"
            style={{ minHeight: '1050px' }}
          >
            {/* ================= PAGE 1: ADMISSION APPLICATION & ENROLLMENT FORM ================= */}
            <div className="space-y-4">
              
              {/* Institutional Header with Crest & School Info */}
              <div className="flex items-start justify-between gap-4 pb-3 border-b-2 border-black">
                <div className="shrink-0 flex items-center justify-center pt-1">
                  <SchoolLogo size={70} lightBackground={true} />
                </div>

                <div className="text-center flex-1 space-y-1">
                  <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-black leading-none font-serif">
                    {schoolName}
                  </h1>
                  <p className="text-[11px] font-bold italic text-neutral-700 tracking-wide">
                    "{schoolMotto}"
                  </p>
                  <div className="text-[10px] text-neutral-800 font-medium space-x-2">
                    <span>{schoolLocation}</span>
                    <span>•</span>
                    <span>Tel / WhatsApp: {schoolPhone}</span>
                  </div>
                  <div className="inline-block bg-neutral-100 text-black border border-black px-4 py-1 text-[11px] font-black uppercase tracking-widest mt-1">
                    OFFICIAL PUPIL ADMISSION & ENROLLMENT FORM
                  </div>
                </div>

                {/* Passport Photo Box */}
                <div className="shrink-0 w-24 h-28 border-2 border-dashed border-neutral-400 flex flex-col items-center justify-center p-1 bg-neutral-50 text-center overflow-hidden">
                  {currentStudent?.photoUrl ? (
                    <img 
                      src={currentStudent.photoUrl} 
                      alt={currentStudent.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="space-y-1 text-neutral-400 p-1">
                      <User size={24} className="mx-auto text-neutral-400" />
                      <span className="text-[8px] font-bold uppercase block leading-tight">
                        Affix Recent 2x2 Passport Photo
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Metadata Strip */}
              <div className="grid grid-cols-3 gap-2 bg-neutral-50 border border-neutral-300 p-2 text-[10.5px] font-mono">
                <div>
                  <span className="text-neutral-500 font-bold uppercase text-[9px] block">Academic Year:</span>
                  <span className="font-black text-black">{activeAcademicYear} ({activeTermName})</span>
                </div>
                <div>
                  <span className="text-neutral-500 font-bold uppercase text-[9px] block">Admission / Roll No:</span>
                  <span className="font-black text-black">
                    {formMode === 'student' && currentStudent?.rollNumber 
                      ? currentStudent.rollNumber 
                      : (formMode === 'student' ? `SHC-${currentStudent?.id.substring(0, 5).toUpperCase()}` : '______________________')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-neutral-500 font-bold uppercase text-[9px] block">Admission Date:</span>
                  <span className="font-black text-black">
                    {formMode === 'student' && currentStudent?.enrollmentDate 
                      ? currentStudent.enrollmentDate 
                      : currentDate}
                  </span>
                </div>
              </div>

              {/* SECTION A: PUPIL PARTICULARS (BIODATA) */}
              <div className="space-y-1.5 avoid-break">
                <div className="bg-neutral-200 border-l-4 border-black px-2.5 py-1 flex items-center justify-between">
                  <h2 className="text-[11px] font-black uppercase tracking-wider text-black">
                    SECTION A: PUPIL / APPLICANT PARTICULARS
                  </h2>
                  <span className="text-[9px] font-bold text-neutral-600 uppercase font-mono">Biodata Profile</span>
                </div>

                <div className="grid grid-cols-12 gap-2 text-[11px]">
                  {/* Full Name */}
                  <div className="col-span-12 sm:col-span-8 border border-neutral-300 p-1.5">
                    <span className="text-[9px] font-bold uppercase text-neutral-500 block">1. Full Legal Name (Surname First):</span>
                    <span className="font-black text-black text-xs uppercase">
                      {formMode === 'student' && currentStudent ? currentStudent.name : '____________________________________________________'}
                    </span>
                  </div>

                  {/* Gender */}
                  <div className="col-span-6 sm:col-span-2 border border-neutral-300 p-1.5">
                    <span className="text-[9px] font-bold uppercase text-neutral-500 block">2. Gender:</span>
                    <span className="font-bold text-black uppercase">
                      {formMode === 'student' && currentStudent ? (currentStudent.gender || 'Not Specified') : '[  ] Male   [  ] Female'}
                    </span>
                  </div>

                  {/* Class / Grade */}
                  <div className="col-span-6 sm:col-span-2 border border-neutral-300 p-1.5 bg-neutral-50">
                    <span className="text-[9px] font-bold uppercase text-neutral-500 block">3. Class / Grade:</span>
                    <span className="font-black text-black uppercase text-xs">
                      {formMode === 'student' && currentStudent 
                        ? `${currentStudent.class} (${currentStudent.category})` 
                        : (blankTargetClass !== 'GENERAL' ? blankTargetClass : '____________')}
                    </span>
                  </div>

                  {/* Date of Birth & Age */}
                  <div className="col-span-6 sm:col-span-4 border border-neutral-300 p-1.5">
                    <span className="text-[9px] font-bold uppercase text-neutral-500 block">4. Date of Birth & Age:</span>
                    <span className="font-bold text-black">
                      {formMode === 'student' ? '_____ / _____ / _________  (Age: ____)' : 'DD: _____ MM: _____ YYYY: ________ (Age: ____)'}
                    </span>
                  </div>

                  {/* Nationality & Religion */}
                  <div className="col-span-6 sm:col-span-4 border border-neutral-300 p-1.5">
                    <span className="text-[9px] font-bold uppercase text-neutral-500 block">5. Nationality / Religion:</span>
                    <span className="font-bold text-black">
                      {formMode === 'student' ? 'Ghanaian • ________________' : 'Nationality: ____________ Religion: ____________'}
                    </span>
                  </div>

                  {/* Hometown & Region */}
                  <div className="col-span-12 sm:col-span-4 border border-neutral-300 p-1.5">
                    <span className="text-[9px] font-bold uppercase text-neutral-500 block">6. Hometown & Region:</span>
                    <span className="font-bold text-black">
                      {formMode === 'student' ? 'Sawla / Savannah Region' : 'Hometown: ____________ Region: ____________'}
                    </span>
                  </div>

                  {/* Residential Address / GPS */}
                  <div className="col-span-12 sm:col-span-7 border border-neutral-300 p-1.5">
                    <span className="text-[9px] font-bold uppercase text-neutral-500 block">7. Residential Home Address / Digital Address (GhanaPost GPS):</span>
                    <span className="font-bold text-black">
                      __________________________________________________________________
                    </span>
                  </div>

                  {/* Previous School */}
                  <div className="col-span-12 sm:col-span-5 border border-neutral-300 p-1.5">
                    <span className="text-[9px] font-bold uppercase text-neutral-500 block">8. Previous School & Last Grade:</span>
                    <span className="font-bold text-black">
                      ___________________________________________
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION B: PARENT / GUARDIAN DETAILS */}
              <div className="space-y-1.5 avoid-break">
                <div className="bg-neutral-200 border-l-4 border-black px-2.5 py-1 flex items-center justify-between">
                  <h2 className="text-[11px] font-black uppercase tracking-wider text-black">
                    SECTION B: PARENT / GUARDIAN INFORMATION
                  </h2>
                  <span className="text-[9px] font-bold text-neutral-600 uppercase font-mono">Contact & Custody</span>
                </div>

                <div className="grid grid-cols-12 gap-2 text-[11px]">
                  {/* Father / Guardian 1 */}
                  <div className="col-span-12 sm:col-span-6 border border-neutral-300 p-2 space-y-1">
                    <span className="text-[9px] font-black uppercase text-neutral-700 block border-b border-neutral-200 pb-0.5">
                      Father / Primary Legal Guardian
                    </span>
                    <div className="space-y-1 text-[10.5px]">
                      <div>
                        <span className="text-neutral-500">Full Name: </span>
                        <strong className="text-black">{formMode === 'student' && currentStudent?.guardianPhone ? 'Registered Guardian' : '____________________________________'}</strong>
                      </div>
                      <div>
                        <span className="text-neutral-500">Occupation / Work: </span>
                        <strong className="text-black">________________________________</strong>
                      </div>
                      <div>
                        <span className="text-neutral-500">Phone Contact: </span>
                        <strong className="text-black font-mono">{formMode === 'student' && currentStudent?.guardianPhone ? currentStudent.guardianPhone : '________________________________'}</strong>
                      </div>
                      <div>
                        <span className="text-neutral-500">Workplace / Address: </span>
                        <strong className="text-black">____________________________</strong>
                      </div>
                    </div>
                  </div>

                  {/* Mother / Guardian 2 */}
                  <div className="col-span-12 sm:col-span-6 border border-neutral-300 p-2 space-y-1">
                    <span className="text-[9px] font-black uppercase text-neutral-700 block border-b border-neutral-200 pb-0.5">
                      Mother / Secondary Guardian
                    </span>
                    <div className="space-y-1 text-[10.5px]">
                      <div>
                        <span className="text-neutral-500">Full Name: </span>
                        <strong className="text-black">____________________________________</strong>
                      </div>
                      <div>
                        <span className="text-neutral-500">Occupation / Work: </span>
                        <strong className="text-black">________________________________</strong>
                      </div>
                      <div>
                        <span className="text-neutral-500">Phone Contact: </span>
                        <strong className="text-black font-mono">________________________________</strong>
                      </div>
                      <div>
                        <span className="text-neutral-500">Workplace / Address: </span>
                        <strong className="text-black">____________________________</strong>
                      </div>
                    </div>
                  </div>

                  {/* Emergency & Dismissal Security Contact */}
                  <div className="col-span-12 border border-neutral-300 p-2 bg-neutral-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px]">
                    <div>
                      <span className="font-black uppercase text-neutral-700 block">Emergency & Dismissal Contact:</span>
                      <span>Person(s) authorized to pick child or contact during emergency if parents are unreachable.</span>
                    </div>
                    <div className="font-bold text-neutral-900">
                      Name: ______________________  Phone: ______________________  Relationship: ____________
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION C: MEDICAL, HEALTH & SPECIAL CARE PROFILE */}
              <div className="space-y-1.5 avoid-break">
                <div className="bg-neutral-200 border-l-4 border-black px-2.5 py-1 flex items-center justify-between">
                  <h2 className="text-[11px] font-black uppercase tracking-wider text-black">
                    SECTION C: MEDICAL, HEALTH & SPECIAL CARE PROFILE
                  </h2>
                  <span className="text-[9px] font-bold text-neutral-600 uppercase font-mono">Health & Safety</span>
                </div>

                <div className="grid grid-cols-12 gap-2 text-[10.5px]">
                  <div className="col-span-12 sm:col-span-4 border border-neutral-300 p-1.5">
                    <span className="text-[9px] font-bold uppercase text-neutral-500 block">Known Food / Drug Allergies:</span>
                    <span className="font-bold text-black">[  ] None   [  ] Yes: ___________________</span>
                  </div>

                  <div className="col-span-12 sm:col-span-4 border border-neutral-300 p-1.5">
                    <span className="text-[9px] font-bold uppercase text-neutral-500 block">Chronic Conditions (Asthma/Sickle Cell):</span>
                    <span className="font-bold text-black">[  ] None   [  ] Yes: ___________________</span>
                  </div>

                  <div className="col-span-12 sm:col-span-4 border border-neutral-300 p-1.5">
                    <span className="text-[9px] font-bold uppercase text-neutral-500 block">Blood Group / NHIS Number:</span>
                    <span className="font-bold text-black">Group: _____ NHIS: ________________</span>
                  </div>
                </div>
              </div>

              {/* SECTION D: BILLING & PAYMENT SCHEME SELECTION */}
              <div className="space-y-1.5 avoid-break">
                <div className="bg-neutral-200 border-l-4 border-black px-2.5 py-1 flex items-center justify-between">
                  <h2 className="text-[11px] font-black uppercase tracking-wider text-black">
                    SECTION D: TUITION & FEEDING SCHEME SELECTION
                  </h2>
                  <span className="text-[9px] font-bold text-neutral-600 uppercase font-mono">Financial Ledger</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px]">
                  <div className={`border p-2 space-y-1 ${formMode === 'student' && currentStudent?.paymentType === 'Daily' ? 'border-black bg-neutral-100 font-bold' : 'border-neutral-300'}`}>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={formMode === 'student' && currentStudent?.paymentType === 'Daily'} 
                        readOnly 
                        className="accent-black" 
                      />
                      <span className="font-black uppercase text-black">Option 1: Daily Tuition & Canteen Check-in</span>
                    </div>
                    <p className="text-[10px] text-neutral-600 pl-5">
                      Pay daily standard fee of <strong>GHC {dailyFee.toFixed(2)}</strong> per teaching day at the gate checkpoint upon entry.
                    </p>
                  </div>

                  <div className={`border p-2 space-y-1 ${formMode === 'student' && currentStudent?.paymentType === 'Term' ? 'border-black bg-neutral-100 font-bold' : 'border-neutral-300'}`}>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={formMode === 'student' && currentStudent?.paymentType === 'Term'} 
                        readOnly 
                        className="accent-black" 
                      />
                      <span className="font-black uppercase text-black">Option 2: Comprehensive Term Tuition</span>
                    </div>
                    <p className="text-[10px] text-neutral-600 pl-5">
                      Pay full term tuition subscription of <strong>GHC {(currentStudent?.termFee || admissionFee).toFixed(2)}</strong> at start of term.
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION E: PARENT / GUARDIAN UNDERTAKING & DECLARATION */}
              <div className="border-2 border-black p-3 space-y-2 avoid-break bg-neutral-50/50">
                <div className="flex items-center justify-between border-b border-neutral-300 pb-1">
                  <h3 className="text-[10.5px] font-black uppercase tracking-wider text-black">
                    SECTION E: PARENT / GUARDIAN UNDERTAKING & DECLARATION
                  </h3>
                  <span className="text-[9px] font-bold uppercase text-neutral-600">Legal Agreement</span>
                </div>

                <p className="text-[9.5px] text-neutral-700 leading-relaxed text-justify">
                  I / We, the parent(s) / legal guardian(s) of the pupil named herein, do hereby declare that all particulars, medical history, and contact details provided on this form are true and accurate. I undertake to support the school in upholding high academic standards and moral discipline, ensure punctual attendance, and settle all school fees and charges punctually according to institutional policy.
                </p>

                <div className="grid grid-cols-2 gap-6 pt-2 text-[10.5px]">
                  <div>
                    <span className="text-[9px] font-bold uppercase text-neutral-500 block">Parent / Guardian Signature:</span>
                    <div className="border-b border-black h-7 flex items-end">
                      <span className="text-[10px] text-neutral-400 italic">Sign above line</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase text-neutral-500 block">Date of Declaration:</span>
                    <div className="border-b border-black h-7 flex items-end">
                      <span className="text-[10px] text-neutral-800 font-mono font-bold">{currentDate}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION F: FOR OFFICIAL SCHOOL ADMINISTRATION USE ONLY */}
              <div className="border-2 border-black p-3 bg-neutral-100 space-y-2 avoid-break">
                <div className="flex items-center justify-between border-b border-black pb-1">
                  <h3 className="text-[10.5px] font-black uppercase tracking-wider text-black">
                    SECTION F: FOR OFFICIAL SCHOOL ADMINISTRATION USE ONLY
                  </h3>
                  <span className="text-[9px] font-black uppercase text-black font-mono">REGISTRAR / HEADTEACHER DESK</span>
                </div>

                <div className="grid grid-cols-12 gap-3 text-[10px]">
                  <div className="col-span-8 space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-neutral-600 block uppercase font-bold text-[8.5px]">Admission Status:</span>
                        <div className="font-bold text-black">
                          {formMode === 'student' ? '[ ✔ ] APPROVED & ENROLLED' : '[  ] APPROVED   [  ] CONDITIONAL'}
                        </div>
                      </div>
                      <div>
                        <span className="text-neutral-600 block uppercase font-bold text-[8.5px]">Assigned Class:</span>
                        <strong className="text-black font-mono text-xs">{currentStudent ? currentStudent.class : '_______________'}</strong>
                      </div>
                      <div>
                        <span className="text-neutral-600 block uppercase font-bold text-[8.5px]">Assigned Roll No:</span>
                        <strong className="text-black font-mono text-xs">{currentStudent ? (currentStudent.rollNumber || 'Auto-Allocated') : '_______________'}</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-1">
                      <div>
                        <span className="text-neutral-600 block uppercase font-bold text-[8.5px]">Headteacher / Registrar Name:</span>
                        <div className="border-b border-black h-5 font-bold text-black">
                          Administration Office
                        </div>
                      </div>
                      <div>
                        <span className="text-neutral-600 block uppercase font-bold text-[8.5px]">Signature & Date:</span>
                        <div className="border-b border-black h-5 flex items-end justify-between font-mono text-[9px]">
                          <span>Verified OK</span>
                          <span>{currentDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stamp / Seal Box */}
                  <div className="col-span-4 border-2 border-neutral-400 bg-white flex flex-col items-center justify-center p-2 text-center">
                    <ShieldCheck size={24} className="text-neutral-400 mb-1" />
                    <span className="text-[8.5px] font-black uppercase text-neutral-500 block leading-tight">
                      OFFICIAL SCHOOL SEAL / STAMP
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* ================= PAGE 2: RULES, REGULATIONS & CODE OF CONDUCT (OPTIONAL) ================= */}
            {includeRulesPage && (
              <div className="mt-12 pt-8 border-t-4 border-neutral-300 page-break-before space-y-4">
                <div className="flex items-center justify-between border-b-2 border-black pb-2">
                  <div className="flex items-center gap-3">
                    <SchoolLogo size={45} lightBackground={true} />
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-tight text-black font-serif">
                        {schoolName}
                      </h2>
                      <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-wider">
                        Institutional Code of Conduct & Pupil General Regulations
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono font-bold bg-neutral-100 border border-black px-2 py-1 uppercase">
                    Page 2 of 2
                  </span>
                </div>

                <div className="space-y-3 text-[10.5px] text-neutral-800 leading-relaxed">
                  <div className="bg-neutral-50 border border-neutral-300 p-2.5 space-y-1">
                    <h3 className="font-black uppercase text-black text-[11px] flex items-center gap-1.5">
                      <span>1.</span> SCHOOL ATTENDANCE, PUNCTUALITY & ASSEMBLY
                    </h3>
                    <p className="text-neutral-700">
                      • School gates open at <strong>06:45 AM</strong> and close for morning assembly at <strong>07:30 AM</strong>. Pupils must be on school premises punctually.<br />
                      • Any pupil absent for more than two (2) consecutive days must produce a medical certificate or written explanation signed by a parent/guardian.<br />
                      • Pupils are not allowed to leave the school compound during school hours without an official exit pass from the Headteacher.
                    </p>
                  </div>

                  <div className="bg-neutral-50 border border-neutral-300 p-2.5 space-y-1">
                    <h3 className="font-black uppercase text-black text-[11px] flex items-center gap-1.5">
                      <span>2.</span> UNIFORM, DRESS CODE & PERSONAL HYGIENE
                    </h3>
                    <p className="text-neutral-700">
                      • All pupils must wear the prescribed, clean, well-ironed school uniform with appropriate black shoes and white socks.<br />
                      • Sportswear is strictly permitted only on scheduled physical education (PE) days.<br />
                      • Hair must be kept neat, clean, and in compliance with the school's grooming policy. No unauthorized jewelry or excessive adornment is permitted.
                    </p>
                  </div>

                  <div className="bg-neutral-50 border border-neutral-300 p-2.5 space-y-1">
                    <h3 className="font-black uppercase text-black text-[11px] flex items-center gap-1.5">
                      <span>3.</span> FEE SETTLEMENT POLICY & CHECK-IN CREDENTIALS
                    </h3>
                    <p className="text-neutral-700">
                      • Daily tuition and canteen fees of <strong>GHC {dailyFee.toFixed(2)}</strong> must be settled promptly at the checkpoint upon entry.<br />
                      • Term payers must ensure comprehensive term fee settlements within the designated payment windows to avoid disruption to classroom learning.<br />
                      • Every enrolled student will be issued an accredited Pupil ID Card with a secure QR gate check-in pass.
                    </p>
                  </div>

                  <div className="bg-neutral-50 border border-neutral-300 p-2.5 space-y-1">
                    <h3 className="font-black uppercase text-black text-[11px] flex items-center gap-1.5">
                      <span>4.</span> DISCIPLINE, INTEGRITY & PROPERTY CARE
                    </h3>
                    <p className="text-neutral-700">
                      • Respect towards teachers, administrative staff, fellow pupils, and school visitors is mandatory at all times.<br />
                      • Bullying, fighting, vandalism of school property, and dishonest behavior are strictly prohibited and will attract immediate disciplinary sanctions.<br />
                      • Any willful damage to school textbooks, laboratory apparatus, or furniture will be billed to the parent/guardian.
                    </p>
                  </div>

                  <div className="bg-neutral-50 border border-neutral-300 p-2.5 space-y-1">
                    <h3 className="font-black uppercase text-black text-[11px] flex items-center gap-1.5">
                      <span>5.</span> REQUIRED ENROLLMENT ATTACHMENTS CHECKLIST
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-neutral-800 pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 border border-black inline-block" />
                        <span>Copy of Birth Certificate / Weighing Card</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 border border-black inline-block" />
                        <span>2 Recent Passport-size Photographs</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 border border-black inline-block" />
                        <span>Cumulative Academic Record / Last Report</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 border border-black inline-block" />
                        <span>Child Health / NHIS Card Photocopy</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t-2 border-black pt-4 flex items-center justify-between text-[10px] font-mono">
                  <div>
                    <span>Parent/Guardian Acknowledgment: _______________________</span>
                  </div>
                  <div>
                    <span>Date: _____ / _____ / 2026</span>
                  </div>
                  <div>
                    <span className="font-black">SAAKO HOLY CHILD ACADEMY REGISTRAR</span>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Modal Footer Controls */}
        <div className="bg-neutral-950 px-6 py-3 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3 shrink-0 font-mono text-xs">
          <div className="flex items-center gap-2 text-neutral-400">
            <Sparkles size={14} className="text-amber-400" />
            <span>
              {formMode === 'student' 
                ? `Showing form for: ${currentStudent?.name || 'Selected Pupil'} (${currentStudent?.class || 'N/A'})`
                : `Showing Blank Application Form (${blankTargetClass === 'GENERAL' ? 'All Classes' : blankTargetClass})`}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 uppercase font-black tracking-wider transition-colors cursor-pointer border border-neutral-800"
            >
              Close
            </button>

            <button
              type="button"
              onClick={() => handlePrint(formMode === 'blank' ? blankCopiesCount : 1)}
              className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-black font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <Printer size={15} className="stroke-[2.5]" />
              <span>{formMode === 'blank' && blankCopiesCount > 1 ? `Print ${blankCopiesCount} Copies` : 'Print Admission Form Now'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
