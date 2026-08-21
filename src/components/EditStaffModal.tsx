/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Check, 
  UserCheck, 
  ShieldCheck, 
  KeyRound, 
  DollarSign, 
  Calendar, 
  Smartphone, 
  RefreshCw, 
  Lock, 
  Sliders,
  Layers,
  MapPin
} from 'lucide-react';
import { UserAccount, UserRole, StudentClass, ALL_CLASSES } from '../types';
import { generateRandomPassword } from '../initialData';
import { useApp } from '../context/AppContext';

interface EditStaffModalProps {
  staff: UserAccount | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (updatedUser: UserAccount) => void;
}

export const EditStaffModal: React.FC<EditStaffModalProps> = ({
  staff,
  isOpen,
  onClose,
  onSaved
}) => {
  const { updateStaff, showToast } = useApp();

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('Teacher');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [employmentType, setEmploymentType] = useState<'Full-Time' | 'Part-Time' | 'Contract' | 'Volunteer'>('Full-Time');
  const [assignedClasses, setAssignedClasses] = useState<StudentClass[]>(['B1']);
  const [stipendSalary, setStipendSalary] = useState<string>('');
  const [momoNumber, setMomoNumber] = useState<string>('');
  const [momoName, setMomoName] = useState<string>('');
  const [personalAddress, setPersonalAddress] = useState<string>('');
  
  // Contracts & Dates
  const [appointmentDate, setAppointmentDate] = useState<string>('');
  const [contractEndDate, setContractEndDate] = useState<string>('');
  const [renewalOption, setRenewalOption] = useState<string>('Automatic');
  const [renewalPeriod, setRenewalPeriod] = useState<string>('1 Year');

  // Security & Permissions
  const [passwordEnabled, setPasswordEnabled] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [mfaEnabled, setMfaEnabled] = useState<boolean>(false);
  const [idCardDeactivated, setIdCardDeactivated] = useState<boolean>(false);
  const [permissions, setPermissions] = useState({
    canRecordPayments: true,
    canEditPayments: false,
    canDeletePayments: false,
    canManageStudents: false,
    canManageExams: true,
    canViewReports: false,
    canManageSettings: false
  });

  const [activeTab, setActiveTab] = useState<'info' | 'classes' | 'payroll' | 'security'>('info');

  useEffect(() => {
    if (staff) {
      setName(staff.name || '');
      setEmail(staff.email || '');
      setRole(staff.role || 'Teacher');
      setGender(staff.gender || 'Male');
      setEmploymentType(staff.employmentType || 'Full-Time');
      
      const userClasses = staff.assignedClasses && staff.assignedClasses.length > 0 
        ? staff.assignedClasses 
        : (staff.assignedClass ? [staff.assignedClass] : ['B1']);
      setAssignedClasses(userClasses);

      setStipendSalary(staff.stipendSalary !== undefined ? staff.stipendSalary.toString() : '');
      setMomoNumber(staff.momoNumber || '');
      setMomoName(staff.momoName || '');
      setPersonalAddress(staff.personalAddress || '');
      
      setAppointmentDate(staff.appointmentDate || '');
      setContractEndDate(staff.contractEndDate || '');
      setRenewalOption(staff.renewalOption || 'Automatic');
      setRenewalPeriod(staff.renewalPeriod || '1 Year');

      setPasswordEnabled(!!staff.passwordEnabled);
      setPassword(staff.password || '');
      setMfaEnabled(!!staff.mfaEnabled);
      setIdCardDeactivated(!!staff.idCardDeactivated);
      
      setPermissions(staff.permissions || {
        canRecordPayments: true,
        canEditPayments: false,
        canDeletePayments: false,
        canManageStudents: false,
        canManageExams: true,
        canViewReports: false,
        canManageSettings: false
      });
      setActiveTab('info');
    }
  }, [staff, isOpen]);

  if (!isOpen || !staff) return null;

  const handleToggleClass = (cls: StudentClass) => {
    if (assignedClasses.includes(cls)) {
      if (assignedClasses.length === 1) {
        showToast("At least one gate checkpoint classroom must remain selected.");
        return;
      }
      setAssignedClasses(assignedClasses.filter(c => c !== cls));
    } else {
      setAssignedClasses([...assignedClasses, cls]);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      showToast('Error: Full name and email are required.');
      return;
    }

    const primaryClass = role === 'Teacher' ? (assignedClasses[0] || 'B1') : undefined;
    const teacherClasses = role === 'Teacher' ? assignedClasses : undefined;

    const result = updateStaff(
      staff.id,
      name.trim(),
      email.trim(),
      role,
      primaryClass,
      mfaEnabled,
      passwordEnabled,
      password.trim(),
      teacherClasses,
      stipendSalary ? parseFloat(stipendSalary) : undefined,
      momoNumber.trim() || undefined,
      momoName.trim() || undefined,
      undefined, // photoUrl
      undefined, // employeeId
      undefined, // department
      gender,
      employmentType,
      idCardDeactivated,
      appointmentDate || undefined,
      contractEndDate || undefined,
      renewalOption || undefined,
      renewalPeriod || undefined,
      undefined, // signatureUrl
      undefined, // managementSignatureUrl
      personalAddress.trim() || undefined,
      undefined, // ethicsEvaluation
      permissions
    );

    if (result.success) {
      showToast(`Staff profile for ${name.trim()} updated successfully!`);
      if (onSaved) {
        onSaved({
          ...staff,
          name: name.trim(),
          email: email.trim(),
          role,
          assignedClass: primaryClass,
          assignedClasses: teacherClasses,
          gender,
          employmentType,
          stipendSalary: stipendSalary ? parseFloat(stipendSalary) : undefined,
          momoNumber: momoNumber.trim() || undefined,
          momoName: momoName.trim() || undefined,
          personalAddress: personalAddress.trim() || undefined,
          appointmentDate: appointmentDate || undefined,
          contractEndDate: contractEndDate || undefined,
          renewalOption: renewalOption || undefined,
          renewalPeriod: renewalPeriod || undefined,
          passwordEnabled,
          password: password.trim(),
          mfaEnabled,
          idCardDeactivated,
          permissions
        });
      }
      onClose();
    } else {
      showToast(result.error || 'Failed to update staff record.');
    }
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

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative w-full max-w-2xl bg-neutral-900 border-4 border-amber-500 shadow-2xl z-10 flex flex-col max-h-[92vh] overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="bg-neutral-950 border-b-2 border-neutral-800 p-4 sm:p-5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 bg-amber-400 text-black font-black font-mono text-sm flex items-center justify-center rounded-xs shrink-0 uppercase">
                {name ? name.slice(0, 2) : staff.name.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] font-mono font-black uppercase px-1.5 py-0.5 bg-amber-400/10 border border-amber-400/30 text-amber-400">
                    Edit Teacher / Staff Member
                  </span>
                  <span className="text-[9px] font-mono font-bold text-neutral-400">
                    {role} • {staff.email}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight truncate mt-0.5">
                  {name || staff.name}
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
              onClick={() => setActiveTab('info')}
              className={`pb-2.5 px-3 text-[11px] font-mono font-black uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'info'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              <UserCheck size={14} />
              <span>Personal & Role</span>
            </button>

            {role === 'Teacher' && (
              <button
                type="button"
                onClick={() => setActiveTab('classes')}
                className={`pb-2.5 px-3 text-[11px] font-mono font-black uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'classes'
                    ? 'border-amber-400 text-amber-400'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <Layers size={14} />
                <span>Assigned Classes</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('payroll')}
              className={`pb-2.5 px-3 text-[11px] font-mono font-black uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'payroll'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              <DollarSign size={14} />
              <span>Payroll & Momo</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`pb-2.5 px-3 text-[11px] font-mono font-black uppercase tracking-wider border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'security'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              <Lock size={14} />
              <span>Security & Access</span>
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* TAB 1: PERSONAL & ROLE */}
            {activeTab === 'info' && (
              <div className="space-y-4">
                {/* Full Name & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-300 font-mono">
                      Full Legal Name <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Master Peter Mensah"
                      className="w-full bg-neutral-950 border-2 border-neutral-800 focus:border-amber-400 py-2.5 px-3.5 text-xs font-mono font-bold text-white uppercase outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-300 font-mono">
                      Email Address <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="teacher@school.edu"
                      className="w-full bg-neutral-950 border-2 border-neutral-800 focus:border-amber-400 py-2.5 px-3.5 text-xs font-mono font-bold text-white outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Role and Gender */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-300 font-mono">
                      Staff Role / Title
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="w-full bg-neutral-950 border-2 border-neutral-800 focus:border-amber-400 py-2.5 px-3.5 text-xs font-mono font-bold text-amber-400 outline-none cursor-pointer"
                    >
                      <option value="Teacher" className="bg-neutral-900 text-white font-mono">Class Teacher</option>
                      <option value="Administrator" className="bg-neutral-900 text-white font-mono">Administrator</option>
                      <option value="Accountant" className="bg-neutral-900 text-white font-mono">Accountant</option>
                      <option value="Headmaster" className="bg-neutral-900 text-white font-mono">Headmaster</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-300 font-mono">
                      Gender
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setGender('Male')}
                        className={`py-2 px-3 text-xs font-mono font-bold border transition-colors cursor-pointer ${
                          gender === 'Male'
                            ? 'bg-sky-950/40 text-sky-300 border-sky-400 font-black'
                            : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                        }`}
                      >
                        👦 Male
                      </button>
                      <button
                        type="button"
                        onClick={() => setGender('Female')}
                        className={`py-2 px-3 text-xs font-mono font-bold border transition-colors cursor-pointer ${
                          gender === 'Female'
                            ? 'bg-pink-950/40 text-pink-300 border-pink-400 font-black'
                            : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                        }`}
                      >
                        👧 Female
                      </button>
                    </div>
                  </div>
                </div>

                {/* Employment Type & Personal Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-300 font-mono">
                      Employment Type
                    </label>
                    <select
                      value={employmentType}
                      onChange={(e) => setEmploymentType(e.target.value as any)}
                      className="w-full bg-neutral-950 border-2 border-neutral-800 focus:border-amber-400 py-2.5 px-3.5 text-xs font-mono font-bold text-white outline-none cursor-pointer"
                    >
                      <option value="Full-Time" className="bg-neutral-900 text-white font-mono">Full-Time Staff</option>
                      <option value="Part-Time" className="bg-neutral-900 text-white font-mono">Part-Time / Subject Teacher</option>
                      <option value="Contract" className="bg-neutral-900 text-white font-mono">Contract Basis</option>
                      <option value="Volunteer" className="bg-neutral-900 text-white font-mono">National Service / Volunteer</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-300 font-mono">
                      Residential / Postal Address
                    </label>
                    <div className="relative">
                      <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        type="text"
                        value={personalAddress}
                        onChange={(e) => setPersonalAddress(e.target.value)}
                        placeholder="e.g. Plot 14, Block C, Kumasi"
                        className="w-full bg-neutral-950 border-2 border-neutral-800 focus:border-amber-400 py-2.5 pl-9 pr-3.5 text-xs font-mono font-bold text-white outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Contract Dates */}
                <div className="bg-neutral-950 border-2 border-neutral-800 p-4 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-white font-mono flex items-center gap-1.5">
                    <Calendar size={14} className="text-amber-400" />
                    <span>Contract & Appointment Dates</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-mono text-neutral-400 uppercase">Appointment Date</label>
                      <input
                        type="date"
                        value={appointmentDate}
                        onChange={(e) => setAppointmentDate(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 py-2 px-3 text-xs font-mono font-bold text-white outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[9px] font-mono text-neutral-400 uppercase">Contract Expiry Date</label>
                      <input
                        type="date"
                        value={contractEndDate}
                        onChange={(e) => setContractEndDate(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 py-2 px-3 text-xs font-mono font-bold text-white outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ASSIGNED CLASSES (FOR TEACHERS) */}
            {activeTab === 'classes' && role === 'Teacher' && (
              <div className="space-y-4">
                <div className="bg-neutral-950 border-2 border-neutral-800 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 font-mono">
                        Class Gate Checkpoint Clearances
                      </h4>
                      <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                        Select all class grades this teacher is authorized to mark check-ins and collect daily fees for.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono font-black text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-1">
                      {assignedClasses.length} Selected
                    </span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
                    {ALL_CLASSES.map((cls) => {
                      const isSelected = assignedClasses.includes(cls);
                      return (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => handleToggleClass(cls)}
                          className={`py-2.5 px-3 text-xs font-mono font-black border-2 transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.2)]'
                              : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                          }`}
                        >
                          <span>{cls}</span>
                          {isSelected && <Check size={14} className="stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: PAYROLL & MOBILE MONEY */}
            {activeTab === 'payroll' && (
              <div className="space-y-4">
                <div className="bg-neutral-950 border-2 border-neutral-800 p-4 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 font-mono flex items-center gap-1.5">
                    <DollarSign size={14} className="text-amber-400" />
                    <span>Monthly Salary & Momo Payout</span>
                  </h4>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-300 font-mono">
                      Monthly Base Stipend / Salary (GHC)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-black text-neutral-500">
                        GHC
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={stipendSalary}
                        onChange={(e) => setStipendSalary(e.target.value)}
                        placeholder="e.g. 1200.00"
                        className="w-full bg-neutral-900 border-2 border-neutral-800 focus:border-amber-400 py-2.5 pl-12 pr-4 text-xs font-mono font-bold text-amber-400 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-300 font-mono">
                        Mobile Money Number
                      </label>
                      <div className="relative">
                        <Smartphone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                        <input
                          type="text"
                          value={momoNumber}
                          onChange={(e) => setMomoNumber(e.target.value.replace(/\D/g, ''))}
                          placeholder="e.g. 0244123456"
                          className="w-full bg-neutral-900 border-2 border-neutral-800 focus:border-amber-400 py-2.5 pl-9 pr-3 text-xs font-mono font-bold text-white outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-300 font-mono">
                        Momo Registered Account Name
                      </label>
                      <input
                        type="text"
                        value={momoName}
                        onChange={(e) => setMomoName(e.target.value)}
                        placeholder="e.g. Peter Mensah"
                        className="w-full bg-neutral-900 border-2 border-neutral-800 focus:border-amber-400 py-2.5 px-3.5 text-xs font-mono font-bold text-white uppercase outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: SECURITY & PERMISSIONS */}
            {activeTab === 'security' && (
              <div className="space-y-4">
                {/* Password Configuration */}
                <div className="bg-neutral-950 border-2 border-neutral-800 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className="text-xs font-mono font-black text-white uppercase block">
                        Require Login Password
                      </strong>
                      <p className="text-[10px] text-neutral-500 font-mono">
                        Staff member must enter this password when logging into their gate register.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPasswordEnabled(!passwordEnabled)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        passwordEnabled ? 'bg-amber-400' : 'bg-neutral-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                          passwordEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {passwordEnabled && (
                    <div className="pt-2 space-y-2">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                          <input
                            type="text"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password..."
                            className="w-full bg-neutral-900 border-2 border-neutral-800 focus:border-amber-400 py-2 pl-9 pr-3 text-xs font-mono font-bold text-amber-400 outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setPassword(generateRandomPassword(8))}
                          className="py-2 px-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-mono font-black text-amber-400 uppercase flex items-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw size={13} />
                          <span>Generate</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Granular Permissions */}
                <div className="bg-neutral-950 border-2 border-neutral-800 p-4 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-white font-mono flex items-center gap-1.5">
                    <Sliders size={14} className="text-amber-400" />
                    <span>Granular Feature Permissions</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {[
                      { key: 'canRecordPayments', label: 'Record Daily Payments' },
                      { key: 'canEditPayments', label: 'Edit Existing Payments' },
                      { key: 'canDeletePayments', label: 'Delete Payment Records' },
                      { key: 'canManageStudents', label: 'Add / Edit Pupils' },
                      { key: 'canManageExams', label: 'Manage Exams & Scores' },
                      { key: 'canViewReports', label: 'View Financial Reports' },
                      { key: 'canManageSettings', label: 'Manage System Settings' },
                    ].map((perm) => {
                      const isAllowed = !!(permissions as any)[perm.key];
                      return (
                        <button
                          key={perm.key}
                          type="button"
                          onClick={() => setPermissions(prev => ({ ...prev, [perm.key]: !isAllowed }))}
                          className={`p-2.5 text-left border text-xs font-mono font-bold transition-all flex items-center justify-between cursor-pointer ${
                            isAllowed
                              ? 'bg-neutral-900 border-amber-400 text-amber-400'
                              : 'bg-neutral-950 border-neutral-850 text-neutral-500 hover:text-neutral-400'
                          }`}
                        >
                          <span>{perm.label}</span>
                          <span className={`text-[10px] font-black px-1.5 py-0.5 ${isAllowed ? 'bg-amber-400 text-black' : 'bg-neutral-800 text-neutral-400'}`}>
                            {isAllowed ? 'YES' : 'NO'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center gap-3 pt-4 border-t-2 border-neutral-800">
              <button
                type="submit"
                className="flex-1 py-3 px-4 bg-amber-400 hover:bg-amber-300 text-black text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
              >
                <Check size={16} className="stroke-[3]" />
                <span>Save Staff Profile</span>
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
