/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { KeyRound, Eye, EyeOff, Sparkles, Check, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { generateRandomPassword } from '../initialData';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, changePassword } = useApp();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !currentUser) return null;

  const handleGeneratePassword = () => {
    const gen = generateRandomPassword(8);
    setNewPassword(gen);
    setConfirmPassword(gen);
    setShowPassword(true);
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const pass = newPassword.trim();
    if (!pass) {
      setErrorMsg('Please enter a valid new password.');
      return;
    }

    if (pass.length < 3) {
      setErrorMsg('Password must be at least 3 characters long.');
      return;
    }

    if (pass !== confirmPassword.trim()) {
      setErrorMsg('Passwords do not match. Please verify your typing.');
      return;
    }

    const res = changePassword(currentUser.id, pass);
    if (res.success) {
      setSuccessMsg('Your account password has been updated successfully!');
      setTimeout(() => {
        setSuccessMsg(null);
        setNewPassword('');
        setConfirmPassword('');
        onClose();
      }, 1500);
    } else {
      setErrorMsg(res.error || 'Failed to update account password.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border-4 border-amber-400 w-full max-w-md p-6 space-y-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative animate-in fade-in zoom-in duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 transition-colors cursor-pointer"
          title="Close Modal"
        >
          <X size={20} />
        </button>

        <div className="space-y-1 pb-3 border-b-2 border-neutral-800">
          <h2 className="text-lg font-black uppercase italic text-white tracking-tight flex items-center gap-2.5">
            <KeyRound className="text-amber-400" size={22} />
            Change Account Password
          </h2>
          <p className="text-xs text-neutral-400 font-bold">
            Account: <span className="text-amber-400 font-mono">{currentUser.email}</span> ({currentUser.role})
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/60 border-2 border-red-800 text-red-200 text-xs font-bold flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-950/60 border-2 border-emerald-600 text-emerald-200 text-xs font-bold flex items-center gap-2">
            <Check size={16} className="text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-[10px] font-black text-neutral-300 uppercase tracking-widest font-mono">
                New Password
              </label>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="text-[10px] font-black text-amber-400 hover:text-amber-300 uppercase tracking-wider flex items-center gap-1.5 bg-amber-950/60 border border-amber-800/80 px-2.5 py-1 cursor-pointer transition-colors"
                title="Generate strong random password"
              >
                <Sparkles size={12} />
                <span>Generate Password</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Type new password"
                className="w-full bg-neutral-950 border-2 border-neutral-800 py-2.5 pl-3 pr-10 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-neutral-500 hover:text-neutral-300 cursor-pointer"
                title={showPassword ? "Hide Password" : "Show Password"}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-neutral-300 uppercase tracking-widest font-mono">
              Confirm New Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-type new password to confirm"
              className="w-full bg-neutral-950 border-2 border-neutral-800 py-2.5 px-3 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="p-3 bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-400 font-mono leading-relaxed space-y-1">
            <p className="flex items-center gap-1.5 text-amber-400 font-bold">
              <ShieldCheck size={14} /> Password Persistence
            </p>
            <p>Your password updates immediately on this device and across cloud database sessions. The old password will no longer be required.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 bg-neutral-950 border-2 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 py-2.5 text-xs font-mono font-black uppercase tracking-wider cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-1/2 bg-amber-400 hover:bg-amber-300 text-neutral-950 py-2.5 text-xs font-mono font-black uppercase tracking-wider cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px]"
            >
              Save Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
