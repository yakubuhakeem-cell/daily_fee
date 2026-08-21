/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Check, 
  Camera, 
  Trash2, 
  Award, 
  CreditCard, 
  UserCheck, 
  GraduationCap, 
  Calendar, 
  Phone, 
  Layers, 
  DollarSign,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  IdCard,
  Wand2
} from 'lucide-react';
import { Student, StudentClass, ALL_CLASSES } from '../types';
import { getClassCategory } from '../initialData';
import { useApp } from '../context/AppContext';
import { formatPupilId } from '../utils/pupilIdUtils';

interface EditStudentModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (updatedStudent: Student) => void;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
  student,
  isOpen,
  onClose,
  onSaved
}) => {
  const { updateStudent, showToast, systemSettings } = useApp();

  // Form states
  const [name, setName] = useState('');
  const [studentClass, setStudentClass] = useState<StudentClass>('B1');
  const [rollNumber, setRollNumber] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [paymentType, setPaymentType] = useState<'Daily' | 'Term'>('Daily');
  const [termFee, setTermFee] = useState<number>(350);
  const [discount, setDiscount] = useState<number>(0);
  const [legacyDebt, setLegacyDebt] = useState<number>(0);
  const [enrollmentDate, setEnrollmentDate] = useState<string>('');
  const [active, setActive] = useState<boolean>(true);
  const [idCardDeactivated, setIdCardDeactivated] = useState<boolean>(false);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  
  const [activeTab, setActiveTab] = useState<'details' | 'financial' | 'access'>('details');

  // Populate on open
  useEffect(() => {
    if (student) {
      setName(student.name || '');
      setStudentClass(student.class || 'B1');
      setRollNumber(student.rollNumber || '');
      setGender(student.gender || 'Male');
      setGuardianPhone(student.guardianPhone || '');
      setPaymentType(student.paymentType || 'Daily');
      setTermFee(student.termFee !== undefined ? student.termFee : (systemSettings?.baselineTermFee || 350));
      setDiscount(student.discount !== undefined ? student.discount : 0);
      setLegacyDebt(student.legacyDebt !== undefined ? student.legacyDebt : 0);
      setEnrollmentDate(student.enrollmentDate || '');
      setActive(student.active !== false);
      setIdCardDeactivated(!!student.idCardDeactivated);
      setPhotoUrl(student.photoUrl);
      setActiveTab('details');
    }
  }, [student, isOpen, systemSettings]);

  if (!isOpen || !student) return null;

  const currentCategory = getClassCategory(studentClass);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const size = Math.min(img.width, img.height);
          canvas.width = 240;
          canvas.height = 240;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const xOffset = (img.width - size) / 2;
            const yOffset = (img.height - size) / 2;
            ctx.drawImage(img, xOffset, yOffset, size, size, 0, 0, 240, 240);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            setPhotoUrl(dataUrl);
          } else {
            setPhotoUrl(event.target?.result as string);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Error: Pupil full name is required.');
      return;
    }

    const updatedStudent: Student = {
      ...student,
      name: name.trim(),
      class: studentClass,
      category: currentCategory,
      rollNumber: rollNumber.trim() || student.rollNumber || formatPupilId(student, systemSettings),
      gender,
      guardianPhone: guardianPhone.trim() || undefined,
      paymentType,
      termFee: paymentType === 'Term' ? Math.max(0, Number(termFee) || 0) : undefined,
      discount: paymentType === 'Daily' ? Math.max(0, Math.min(5, Number(discount) || 0)) : undefined,
      legacyDebt: Math.max(0, Number(legacyDebt) || 0),
      enrollmentDate: enrollmentDate.trim() || undefined,
      active,
      idCardDeactivated,
      photoUrl: photoUrl || undefined,
      updatedAt: new Date().toISOString()
    };

    updateStudent(updatedStudent);
    if (onSaved) {
      onSaved(updatedStudent);
    }
    showToast(`Pupil profile and financial settings saved for ${updatedStudent.name}!`);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-neutral-950/85 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative w-full max-w-2xl bg-neutral-900 border-4 border-amber-500 shadow-2xl z-10 flex flex-col max-h-[92vh] overflow-hidden my-auto"
        >
          {/* Top Header */}
          <div className="bg-neutral-950 border-b-2 border-neutral-800 p-4 sm:p-5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3.5 min-w-0">
              {photoUrl ? (
                <div className="w-12 h-12 rounded-xs border-2 border-amber-400 overflow-hidden shrink-0 bg-neutral-900">
                  <img src={photoUrl} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              ) : (
                <div className={`w-12 h-12 rounded-xs border-2 flex items-center justify-center font-mono font-black text-sm uppercase shrink-0 ${
                  gender === 'Female' 
                    ? 'border-pink-500 bg-pink-950/30 text-pink-400' 
                    : 'border-sky-500 bg-sky-950/30 text-sky-400'
                }`}>
                  {name ? name.slice(0, 2).toUpperCase() : student.name.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] font-mono font-black uppercase px-1.5 py-0.5 bg-amber-400/10 border border-amber-400/30 text-amber-400">
                    Quick Edit Pupil Profile
                  </span>
                  <span className="text-[9px] font-mono font-black text-neutral-400">
                    ID: {rollNumber || student.rollNumber || student.id}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight truncate mt-0.5">
                  {name || student.name}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition-colors cursor-pointer shrink-0"
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-neutral-800 bg-neutral-950/70 shrink-0 px-4 pt-2 gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`pb-2.5 px-3 text-[11px] font-mono font-black uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'details'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              <UserCheck size={14} />
              <span>Identity & Academic</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('financial')}
              className={`pb-2.5 px-3 text-[11px] font-mono font-black uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'financial'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              <CreditCard size={14} />
              <span>Payment Status & Scheme</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('access')}
              className={`pb-2.5 px-3 text-[11px] font-mono font-black uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'access'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              <ShieldCheck size={14} />
              <span>Photo & Clearance</span>
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* TAB 1: IDENTITY & ACADEMIC */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-300 font-mono">
                    Pupil Full Name <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Kwame Mensah"
                    className="w-full bg-neutral-950 border-2 border-neutral-800 focus:border-amber-400 py-2.5 px-3.5 text-xs font-mono font-bold text-white uppercase outline-none transition-colors"
                  />
                </div>

                {/* Gender Selection */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-300 font-mono">
                    Pupil Gender <span className="text-amber-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setGender('Male')}
                      className={`py-2.5 px-4 text-xs font-mono font-black uppercase tracking-wider border-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        gender === 'Male'
                          ? 'border-sky-400 bg-sky-950/40 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.15)]'
                          : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <span className="text-sm">👦</span>
                      <span>Male (Boy)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender('Female')}
                      className={`py-2.5 px-4 text-xs font-mono font-black uppercase tracking-wider border-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        gender === 'Female'
                          ? 'border-pink-400 bg-pink-950/40 text-pink-300 shadow-[0_0_12px_rgba(244,114,182,0.15)]'
                          : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <span className="text-sm">👧</span>
                      <span>Female (Girl)</span>
                    </button>
                  </div>
                </div>

                {/* Class and Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-300 font-mono">
                      Class Level Grade <span className="text-amber-400">*</span>
                    </label>
                    <select
                      value={studentClass}
                      onChange={(e) => setStudentClass(e.target.value as StudentClass)}
                      className="w-full bg-neutral-950 border-2 border-neutral-800 focus:border-amber-400 py-2.5 px-3.5 text-xs font-mono font-bold text-white outline-none cursor-pointer"
                    >
                      {ALL_CLASSES.map((cls) => (
                        <option key={cls} value={cls} className="bg-neutral-900 text-white font-mono">
                          Class {cls} ({getClassCategory(cls)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-300 font-mono">
                      School Category (Auto)
                    </label>
                    <div className="w-full bg-neutral-950 border-2 border-neutral-800 py-2.5 px-3.5 text-xs font-mono font-bold text-amber-400 flex items-center justify-between">
                      <span>{currentCategory}</span>
                      <span className="text-[9px] text-neutral-500 font-normal">Department</span>
                    </div>
                  </div>
                </div>

                {/* Roll Number & Guardian Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-300 font-mono">
                        Student Roll / ID Code
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const standardized = formatPupilId({ ...student, class: studentClass }, systemSettings);
                          setRollNumber(standardized);
                        }}
                        title="Auto-format using system pupil ID standard"
                        className="text-[9px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Wand2 size={10} />
                        <span>Standardize</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      placeholder="e.g. SHC-B5-001"
                      className="w-full bg-neutral-950 border-2 border-neutral-800 focus:border-amber-400 py-2.5 px-3.5 text-xs font-mono font-bold text-amber-400 outline-none uppercase"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-300 font-mono">
                      Guardian Phone (SMS & Alert)
                    </label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        type="text"
                        value={guardianPhone}
                        onChange={(e) => setGuardianPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 0244123456"
                        className="w-full bg-neutral-950 border-2 border-neutral-800 focus:border-amber-400 py-2.5 pl-9 pr-3.5 text-xs font-mono font-bold text-white outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Enrollment / Start Date */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-300 font-mono">
                    Admission / Enrollment Date (Ignore Debt Prior to this Day)
                  </label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                      type="date"
                      value={enrollmentDate}
                      onChange={(e) => setEnrollmentDate(e.target.value)}
                      className="w-full bg-neutral-950 border-2 border-neutral-800 focus:border-amber-400 py-2.5 pl-9 pr-3.5 text-xs font-mono font-bold text-white outline-none"
                    />
                  </div>
                  <p className="text-[9px] text-neutral-500 font-mono">
                    If specified, system debt calculation will only count school days from this date onward.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: FINANCIAL SCHEME & PAYMENT STATUS */}
            {activeTab === 'financial' && (
              <div className="space-y-5">
                {/* Payment Status / Model Selector */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-300 font-mono">
                    Student Payment Status / Billing Model <span className="text-amber-400">*</span>
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentType('Daily')}
                      className={`p-3.5 border-2 text-left transition-all cursor-pointer rounded-xs ${
                        paymentType === 'Daily'
                          ? 'border-amber-400 bg-amber-950/20 text-white shadow-[0_0_12px_rgba(251,191,36,0.15)]'
                          : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-black uppercase text-amber-400 flex items-center gap-1.5">
                          <span>☀️</span> Daily Check-In Payer
                        </span>
                        {paymentType === 'Daily' && <Check size={14} className="text-amber-400" />}
                      </div>
                      <p className="text-[10px] text-neutral-400 font-mono mt-1 leading-relaxed">
                        Standard pay-as-you-go. Billed GHC 5.00 (or custom discount) for each school day attended.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentType('Term')}
                      className={`p-3.5 border-2 text-left transition-all cursor-pointer rounded-xs ${
                        paymentType === 'Term'
                          ? 'border-emerald-400 bg-emerald-950/20 text-white shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                          : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-black uppercase text-emerald-400 flex items-center gap-1.5">
                          <span>🎓</span> Fixed Term Payer
                        </span>
                        {paymentType === 'Term' && <Check size={14} className="text-emerald-400" />}
                      </div>
                      <p className="text-[10px] text-neutral-400 font-mono mt-1 leading-relaxed">
                        Fixed lump-sum subscription for entire term. Exempt from single-day debt tracking.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Conditional Fields based on Payment Type */}
                {paymentType === 'Term' ? (
                  <div className="bg-neutral-950 border-2 border-emerald-900/60 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap size={16} className="text-emerald-400" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 font-mono">
                        Fixed Term Fee Setup (GHC)
                      </h4>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 font-mono">
                        Total Term Quota Amount (GHC)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-black text-neutral-500">
                          GHC
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={termFee}
                          onChange={(e) => setTermFee(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full bg-neutral-900 border-2 border-neutral-800 focus:border-emerald-400 py-2.5 pl-12 pr-4 text-xs font-mono font-bold text-emerald-400 outline-none"
                        />
                      </div>
                    </div>

                    {/* Quick presets */}
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <span className="text-[9px] font-mono text-neutral-500 uppercase">Presets:</span>
                      {[250, 300, 350, 400, 450, 500].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setTermFee(amt)}
                          className={`px-2 py-1 text-[10px] font-mono font-black border transition-colors cursor-pointer ${
                            termFee === amt 
                              ? 'bg-emerald-500 text-black border-emerald-400' 
                              : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                          }`}
                        >
                          {amt} GHC
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-neutral-950 border-2 border-amber-900/60 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Award size={16} className="text-amber-400" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 font-mono">
                        Daily Attendance Discount / Scholarship
                      </h4>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 font-mono">
                        Daily Discount / Scholarship Amount (GHC 0.00 to 5.00)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-black text-neutral-500">
                          GHC
                        </span>
                        <input
                          type="number"
                          step="0.50"
                          min="0"
                          max="5"
                          value={discount}
                          onChange={(e) => setDiscount(Math.max(0, Math.min(5, parseFloat(e.target.value) || 0)))}
                          className="w-full bg-neutral-900 border-2 border-neutral-800 focus:border-amber-400 py-2.5 pl-12 pr-4 text-xs font-mono font-bold text-amber-400 outline-none"
                        />
                      </div>
                    </div>

                    {/* Quick discount chips */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {[
                        { label: 'Standard (0.00)', val: 0 },
                        { label: 'GHC 1.00 Off', val: 1 },
                        { label: 'GHC 2.50 Off', val: 2.5 },
                        { label: '100% Free (5.00)', val: 5 }
                      ].map(item => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setDiscount(item.val)}
                          className={`py-1.5 px-2 text-[10px] font-mono font-black border text-center transition-colors cursor-pointer ${
                            discount === item.val
                              ? 'bg-amber-400 text-black border-amber-300'
                              : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    <div className="text-[11px] font-mono text-neutral-400 pt-1 border-t border-neutral-900 flex justify-between items-center">
                      <span>Effective Daily Fee:</span>
                      <strong className="text-amber-400 text-xs">
                        GHC {(5.00 - discount).toFixed(2)} / day
                      </strong>
                    </div>
                  </div>
                )}

                {/* Legacy / Carried Forward Debt */}
                <div className="bg-neutral-950 border-2 border-neutral-800 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <DollarSign size={16} className="text-red-400" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-white font-mono">
                      Pre-Adoption / Legacy Arrears Debt
                    </h4>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-black text-neutral-500">
                      GHC
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={legacyDebt}
                      onChange={(e) => setLegacyDebt(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="0.00"
                      className="w-full bg-neutral-900 border-2 border-neutral-800 focus:border-red-400 py-2.5 pl-12 pr-4 text-xs font-mono font-bold text-red-400 outline-none"
                    />
                  </div>
                  <p className="text-[9px] text-neutral-500 font-mono">
                    Any prior debt brought forward from previous terms. Automatically incorporated into the student's statement.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: PHOTO & ACCESS CLEARANCE */}
            {activeTab === 'access' && (
              <div className="space-y-5">
                {/* Photo Upload Section */}
                <div className="bg-neutral-950 border-2 border-neutral-800 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-neutral-300 font-mono">
                      Pupil Profile Picture
                    </span>
                    {photoUrl && (
                      <button
                        type="button"
                        onClick={() => setPhotoUrl(undefined)}
                        className="text-[9px] font-mono font-black text-red-400 hover:text-red-300 uppercase flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={11} />
                        Remove Picture
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="relative w-20 h-20 bg-neutral-900 border-2 border-neutral-750 overflow-hidden shrink-0 flex items-center justify-center">
                      {photoUrl ? (
                        <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="text-center font-mono text-neutral-500 font-black text-[10px] uppercase">
                          No Photo
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 flex-1 min-w-0">
                      <label className="inline-flex items-center gap-2 py-2 px-4 bg-neutral-900 hover:bg-neutral-850 text-xs text-amber-400 font-mono font-black uppercase tracking-wider border border-neutral-800 hover:border-amber-400 transition-colors cursor-pointer">
                        <Camera size={14} />
                        <span>Upload Pupil Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={handlePhotoUpload}
                        />
                      </label>
                      <p className="text-[9px] font-mono text-neutral-500 font-bold uppercase leading-relaxed">
                        JPG, PNG or GIF. Automatically centered and optimized for ID card printing.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Enrollment & ID Card Status Switches */}
                <div className="bg-neutral-950 border-2 border-neutral-800 p-4 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-white font-mono border-b border-neutral-900 pb-2">
                    Access Clearance & ID Status
                  </h4>

                  {/* Active Enrollment Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className={`text-xs font-mono font-black uppercase block ${active ? 'text-emerald-400' : 'text-red-400'}`}>
                        {active ? '● Active Enrolled Pupil' : '○ Withdrawn / Inactive'}
                      </strong>
                      <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                        {active 
                          ? 'Included in active class registers, gate check-in, and billing.' 
                          : 'Excluded from attendance logs and active billing. Records are safely preserved.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActive(!active)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        active ? 'bg-emerald-500' : 'bg-neutral-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          active ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* ID Card Deactivation Toggle */}
                  <div className="flex items-center justify-between border-t border-neutral-900 pt-3">
                    <div>
                      <strong className={`text-xs font-mono font-black uppercase block ${!idCardDeactivated ? 'text-emerald-400' : 'text-red-400'}`}>
                        {!idCardDeactivated ? '● ID Card Active' : '○ ID Card Deactivated'}
                      </strong>
                      <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                        {!idCardDeactivated
                          ? 'Student ID badge and QR code scans are valid at checkpoints.'
                          : 'Badge is flagged invalid or deactivated for gate access.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIdCardDeactivated(!idCardDeactivated)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        !idCardDeactivated ? 'bg-emerald-500' : 'bg-neutral-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          !idCardDeactivated ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Form Actions */}
            <div className="flex items-center gap-3 pt-4 border-t-2 border-neutral-800">
              <button
                type="submit"
                className="flex-1 py-3 px-4 bg-amber-400 hover:bg-amber-300 text-black text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
              >
                <Check size={16} className="stroke-[3]" />
                <span>Save Pupil Changes</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="py-3 px-5 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-mono font-black uppercase tracking-wider border border-neutral-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
