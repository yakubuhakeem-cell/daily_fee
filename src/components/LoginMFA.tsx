/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Mail, KeyRound, AlertCircle, Sparkles, Fingerprint, UserPlus, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { StudentClass, UserRole } from '../types';
import { SchoolLogo } from './SchoolLogo';

export const LoginMFA: React.FC = () => {
  const { login, users, registerStaff, systemSettings } = useApp();
  const [email, setEmail] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [password, setPassword] = useState('');
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [showPasswordMask, setShowPasswordMask] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Registration states
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('Teacher');
  const [regClass, setRegClass] = useState<StudentClass>('B1');
  const [regMfa, setRegMfa] = useState(false);
  const [regPasswordEnabled, setRegPasswordEnabled] = useState(false);
  const [regPassword, setRegPassword] = useState('');
  const [regSuccessMsg, setRegSuccessMsg] = useState<string | null>(null);

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!regName.trim() || !regEmail.trim()) {
      setError('Please fill in both the name and professional email.');
      return;
    }
    const result = registerStaff(
      regName.trim(),
      regEmail.trim(),
      regRole,
      regRole === 'Teacher' ? regClass : undefined,
      regMfa,
      regPasswordEnabled,
      regPassword.trim()
    );
    if (result.success) {
      setRegSuccessMsg('Success');
    } else {
      setError(result.error || 'Failed to complete registration.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const result = login(
        email, 
        requiresMfa ? mfaCode : undefined,
        requiresPassword ? password : undefined
      );
      setLoading(false);

      if (result.success) {
        if (result.requiresPassword && !requiresPassword) {
          setRequiresPassword(true);
        } else if (result.requiresMfa && !requiresMfa) {
          setRequiresMfa(true);
        } else {
          setError(null);
        }
      } else {
        setError(result.error || 'Authentication failed.');
      }
    }, 600);
  };

  const selectDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setRequiresMfa(false);
    setRequiresPassword(false);
    setMfaCode('');
    setPassword('');
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-950 p-6 font-sans">
      <div className="w-full max-w-lg bg-neutral-900 border-4 border-neutral-800 shadow-[8px_8px_0px_0px_#fbbf24] overflow-hidden relative">
        {/* Card Header design */}
        <div className="border-b-4 border-neutral-800 p-8 text-white relative">
          <div className="absolute top-6 right-6 bg-amber-400/10 text-amber-400 border border-amber-400/30 px-3 py-1 font-mono text-[10px] uppercase tracking-widest font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></span>
            MFA SECURE GATEWAY
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6 mt-4 sm:mt-0">
            <div className="space-y-4">
              <div className="bg-amber-400 text-black font-black p-1 text-2xl px-4 leading-none tracking-tighter w-fit">
                {systemSettings?.systemName || 'FEETRACK'}
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight uppercase italic leading-none max-w-[280px]">
                {systemSettings?.schoolName || 'SAAKO HOLY CHILD ACADEMY'}
              </h2>
              <p className="text-xs text-neutral-400 font-mono uppercase tracking-[0.12em]">
                Daily Fee Ledger Tracker & Auditing
              </p>
            </div>
            
            <div className="flex justify-center sm:block">
              <SchoolLogo size={110} className="border-2 border-neutral-800 bg-neutral-900 shadow-sm" />
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <AnimatePresence mode="wait">
            {isRegistering ? (
              <motion.form
                key="register-step"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleRegisterSubmit}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 pb-2 border-b-2 border-neutral-850">
                  <UserPlus size={18} className="text-amber-400" />
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Register New Staff Member</h3>
                </div>

                {regSuccessMsg ? (
                  <div className="space-y-4 py-2">
                    <div className="p-5 bg-neutral-950 border-2 border-emerald-500 text-emerald-400 text-xs font-sans">
                      <div className="flex items-center gap-2 mb-2 font-black uppercase tracking-wider">
                        <span className="text-emerald-400">✓</span>
                        <span>STAFF ACCOUNT REGISTERED</span>
                      </div>
                      <p className="text-neutral-400 font-semibold leading-relaxed">
                        Account for <strong className="text-white">{regName}</strong> has been registered. You can now use the email <code className="bg-neutral-900 border border-neutral-800 text-amber-400 px-1.5 py-0.5 text-xs font-mono font-bold">{regEmail}</code> to log in.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(regEmail);
                        setIsRegistering(false);
                        setRegSuccessMsg(null);
                        setRegName('');
                        setRegEmail('');
                        setRegMfa(false);
                        setRegPasswordEnabled(false);
                        setRegPassword('');
                      }}
                      className="w-full bg-white text-black font-black text-xs py-3.5 uppercase tracking-widest hover:bg-amber-400 transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      PROCEED TO LOG IN
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                          Staff Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="e.g. Mrs. Rebecca Hanson"
                          className="w-full bg-neutral-950 border-2 border-neutral-800 py-3.5 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-700"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                          Professional Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="e.g. rebecca.hanson@school.edu"
                          className="w-full bg-neutral-950 border-2 border-neutral-800 py-3.5 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-700"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                            Administrative Role
                          </label>
                          <select
                            value={regRole}
                            onChange={(e) => setRegRole(e.target.value as UserRole)}
                            className="w-full bg-neutral-950 border-2 border-neutral-800 py-3.5 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                          >
                            <option value="Teacher">Teacher</option>
                            <option value="Accountant">Accountant</option>
                            <option value="Administrator">Administrator</option>
                            <option value="Headmaster">Headmaster</option>
                          </select>
                        </div>

                        {regRole === 'Teacher' ? (
                          <div>
                            <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                              Assigned Class
                            </label>
                            <select
                              value={regClass}
                              onChange={(e) => setRegClass(e.target.value as StudentClass)}
                              className="w-full bg-neutral-950 border-2 border-neutral-800 py-3.5 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                            >
                              <option value="Nursery">Nursery</option>
                              <option value="KG1">KG1</option>
                              <option value="KG2">KG2</option>
                              <option value="B1">B1</option>
                              <option value="B2">B2</option>
                              <option value="B3">B3</option>
                              <option value="B4">B4</option>
                              <option value="B5">B5</option>
                              <option value="B6">B6</option>
                              <option value="B7">B7</option>
                              <option value="B8">B8</option>
                              <option value="B9">B9</option>
                            </select>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-[10px] font-black text-neutral-555 uppercase tracking-widest mb-1.5 font-mono">
                              Scope Level
                            </label>
                            <div className="bg-neutral-950 border-2 border-neutral-850 py-3.5 px-4 text-xs text-neutral-500 font-extrabold font-mono uppercase tracking-wider">
                              {regRole === 'Administrator' || regRole === 'Headmaster' ? 'All Areas' : 'Accounting Desk'}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-3.5 pt-2 bg-neutral-950/40 p-4 border border-neutral-850 rounded">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="reg-mfa-checkbox"
                            checked={regMfa}
                            onChange={(e) => setRegMfa(e.target.checked)}
                            className="w-4 h-4 accent-amber-400 cursor-pointer"
                          />
                          <label htmlFor="reg-mfa-checkbox" className="text-xs text-neutral-300 font-mono uppercase tracking-wider cursor-pointer select-none">
                            Enforce Secure MFA Keys
                          </label>
                        </div>

                        <div className="flex items-center gap-3 border-t border-neutral-900 pt-2">
                          <input
                            type="checkbox"
                            id="reg-password-checkbox"
                            checked={regPasswordEnabled}
                            onChange={(e) => setRegPasswordEnabled(e.target.checked)}
                            className="w-4 h-4 accent-amber-400 cursor-pointer"
                          />
                          <label htmlFor="reg-password-checkbox" className="text-xs text-neutral-300 font-mono uppercase tracking-wider cursor-pointer select-none">
                            Enforce Password Protection
                          </label>
                        </div>

                        {regPasswordEnabled && (
                          <div className="mt-1.5 pl-7">
                            <label className="block text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                              Create Account Password
                            </label>
                            <input
                              type="text"
                              required={regPasswordEnabled}
                              value={regPassword}
                              onChange={(e) => setRegPassword(e.target.value)}
                              placeholder="Type secret password (e.g. key2026)"
                              className="w-full bg-neutral-950 border-2 border-neutral-800 py-3.5 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-700"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {error && (
                      <div className="flex items-start gap-3 p-4 bg-red-950/40 border-2 border-red-800 text-red-200 text-xs font-bold leading-normal">
                        <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                        <span>{error}</span>
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsRegistering(false);
                          setError(null);
                        }}
                        className="w-1/3 bg-neutral-950 border-2 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 text-xs uppercase tracking-widest py-3.5 font-black transition-colors cursor-pointer"
                      >
                        BACK
                      </button>
                      <button
                        type="submit"
                        className="w-2/3 bg-amber-400 hover:bg-white text-black font-black text-xs py-3.5 uppercase tracking-widest transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        REGISTER MEMBER
                      </button>
                    </div>
                  </>
                )}
              </motion.form>
            ) : !requiresPassword && !requiresMfa ? (
              <motion.form
                key="email-step"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                {/* Staff Access and Onboarding Guide Card */}
                <div className="bg-neutral-950 p-4 border-2 border-dashed border-neutral-800 text-xs text-neutral-300 font-sans space-y-2.5">
                  <p className="font-mono text-amber-400 font-black tracking-wider uppercase flex items-center gap-1.5 text-[10px]">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                    STAFF ONBOARDING & ACCESS GUIDE:
                  </p>
                  <ul className="space-y-1.5 list-disc list-inside font-medium leading-relaxed text-[11px] text-neutral-400">
                    <li>
                      <strong className="text-white">Already on the roster?</strong> Tap your name card in the list at the bottom, click <span className="text-amber-400">Proceed</span>, or enter your registered account credentials.
                    </li>
                    <li>
                      <strong className="text-white">First time here?</strong> Click the <span className="text-amber-400">"+ Create New Account"</span> button below to register your name, email, credentials, password and class permission levels.
                    </li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest">
                    Authorized Professional Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 text-neutral-500" size={18} />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="teacher@school.edu"
                      className="w-full bg-neutral-950 border-2 border-neutral-800 py-3.5 pl-12 pr-4 text-sm font-sans font-bold text-white focus:outline-none focus:border-amber-400/90 focus:ring-0 placeholder:text-neutral-600 transition-all"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-3 p-4 bg-red-950/40 border-2 border-red-800 text-red-200 text-xs font-bold leading-normal">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white text-black font-black text-xs py-3.5 uppercase tracking-widest hover:bg-amber-400 transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-[4px_4px_0px_0px_rgba(255,255,255,0.07)]"
                >
                  {loading ? 'AUTHENTICATING SYSTEM...' : 'PROCEED TO IDENTITY VERIFY →'}
                </button>

                <div className="text-center pt-2 border-t-2 border-neutral-850">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegistering(true);
                      setError(null);
                      setRegSuccessMsg(null);
                    }}
                    className="w-full bg-neutral-950 border-2 border-neutral-800 text-amber-400 hover:text-black hover:bg-amber-400 text-xs font-black uppercase tracking-widest py-3 font-mono transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <UserPlus size={14} />
                    + Create New Staff Account
                  </button>
                </div>
              </motion.form>
            ) : requiresPassword ? (
              <motion.form
                key="password-step"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                <div className="p-4 bg-neutral-950 border-2 border-neutral-850">
                  <h3 className="text-xs font-black text-amber-400 flex items-center gap-2 uppercase tracking-widest">
                    <span>🔑</span> Password Verification Required
                  </h3>
                  <div className="text-[11px] text-neutral-400 mt-2 leading-relaxed font-bold space-y-1">
                    <p>This account is secured with Password protection. Please enter your portal passkey.</p>
                    {email.toLowerCase() === 'yakubuhakeem@gmail.com' && (
                      <p className="text-neutral-500 font-mono mt-2">
                        DEMO PASSWORD: <strong className="text-white bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded">admin2026</strong>
                      </p>
                    )}
                    {email.toLowerCase() === 'accountant@school.edu' && (
                      <p className="text-neutral-500 font-mono mt-2">
                        DEMO PASSWORD: <strong className="text-white bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded">accountant2026</strong>
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest">
                    Enter Portal Password
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-4 text-neutral-500" size={18} />
                    <input
                      type={showPasswordMask ? 'text' : 'password'}
                      required
                      autoFocus
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-neutral-950 border-2 border-neutral-800 py-3.5 pl-12 pr-12 text-sm font-sans font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-705 transition-all font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordMask(!showPasswordMask)}
                      className="absolute right-4 top-4 text-neutral-500 hover:text-neutral-300 cursor-pointer"
                      title={showPasswordMask ? 'Hide password' : 'Show password'}
                    >
                      {showPasswordMask ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-3 p-4 bg-red-950/40 border-2 border-red-800 text-red-200 text-xs font-bold">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setRequiresPassword(false);
                      setPassword('');
                      setError(null);
                    }}
                    className="w-1/3 bg-neutral-950 border-2 border-neutral-800 text-neutral-400 text-xs uppercase tracking-widest hover:text-white hover:border-neutral-600 py-3.5 font-black transition-colors cursor-pointer"
                  >
                    GO BACK
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-2/3 bg-amber-400 text-black font-black text-xs py-3.5 uppercase tracking-widest hover:bg-white transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? 'VERIFYING CREDENTIALS...' : 'VERIFY & INGRESS →'}
                  </button>
                </div>
              </motion.form>
            ) : (
              <motion.form
                key="mfa-step"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                <div className="p-4 bg-neutral-950 border-2 border-neutral-800">
                  <h3 className="text-xs font-black text-amber-400 flex items-center gap-2 uppercase tracking-widest">
                    <span>⚡</span> Multi-Factor Verification Active
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-2 leading-relaxed font-bold">
                    This account requires physical authorization. Enter the 6-digit dynamic authentication token.
                    For evaluation sandbox, enter <code className="font-mono bg-neutral-800 px-1.5 py-0.5 rounded text-white font-black">123456</code>.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest">
                    6-Digit Security Token
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-4.5 text-neutral-500" size={18} />
                    <input
                      type="text"
                      maxLength={6}
                      required
                      autoFocus
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full bg-neutral-950 border-2 border-neutral-800 py-3.5 pl-12 pr-4 text-center font-mono text-xl tracking-[0.55em] text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-700 font-bold transition-all"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-3 p-4 bg-red-950/40 border-2 border-red-800 text-red-200 text-xs font-bold">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setRequiresMfa(false);
                      setMfaCode('');
                      setError(null);
                    }}
                    className="w-1/3 bg-neutral-950 border-2 border-neutral-800 text-neutral-400 text-xs uppercase tracking-widest hover:text-white hover:border-neutral-600 py-3.5 font-black transition-colors cursor-pointer"
                  >
                    GO BACK
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-2/3 bg-amber-400 text-black font-black text-xs py-3.5 uppercase tracking-widest hover:bg-white transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? 'VERIFYING KEY...' : 'VERIFY & INGRESS →'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Quick Access Account Selector */}
          <div className="border-t-2 border-neutral-800 pt-6">
            <p className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] text-center mb-4">
              Authorized Entry Credentials (RBAC Selectors)
            </p>
            <div className="grid grid-cols-2 gap-3">
              {users.map((acc) => {
                const isSelected = email.toLowerCase() === acc.email.toLowerCase();
                return (
                  <button
                    type="button"
                    key={acc.id}
                    onClick={() => selectDemoAccount(acc.email)}
                    className={`p-4 border-2 text-left transition-all relative ${
                      isSelected
                        ? 'border-amber-400 bg-amber-400 text-neutral-950 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)]'
                        : 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-700 text-neutral-300'
                    }`}
                  >
                    <p className={`text-sm font-black leading-tight uppercase ${isSelected ? 'text-black' : 'text-white'}`}>
                      {acc.name}
                    </p>
                    <p className={`text-[10px] font-mono mt-1 font-bold ${
                      isSelected ? 'text-neutral-900' : 'text-neutral-500'
                    }`}>
                      {acc.role} {acc.role === 'Teacher' ? (acc.assignedClasses && acc.assignedClasses.length > 0 ? `• Gates: ${acc.assignedClasses.join(', ')}` : (acc.assignedClass ? `• Gate: ${acc.assignedClass}` : '• No Gates')) : ''}
                    </p>
                    {acc.mfaEnabled && (
                      <span className={`inline-block text-[8px] font-black mt-2 px-1.5 py-0.5 uppercase tracking-widest ${
                        isSelected 
                          ? 'bg-neutral-950 text-amber-400' 
                          : 'bg-neutral-900 text-amber-400 border border-amber-400/40'
                      }`}>
                        MFA REQUIRED
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
