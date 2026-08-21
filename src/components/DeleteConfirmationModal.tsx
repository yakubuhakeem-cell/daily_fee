import React, { useState } from 'react';
import { Trash2, AlertTriangle, CheckCircle2, X, ShieldAlert } from 'lucide-react';

export interface DeleteConfirmDetails {
  title: string;
  subtitle?: string;
  affectedCountMessage?: string;
  whatWillBeDeleted: string[];
  whatWillBePreserved: string[];
  requireTypingVerification?: boolean;
  verificationText?: string;
  confirmButtonText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

interface Props {
  details: DeleteConfirmDetails | null;
}

export const DeleteConfirmationModal: React.FC<Props> = ({ details }) => {
  const [typedInput, setTypedInput] = useState('');

  if (!details) return null;

  const requiredText = details.verificationText || 'DELETE';
  const requiresTyping = details.requireTypingVerification ?? true;
  const isAuthorized = !requiresTyping || typedInput.trim().toUpperCase() === requiredText.toUpperCase();

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in font-mono">
      <div className="bg-neutral-950 border-4 border-red-600 max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-[12px_12px_0px_0px_rgba(220,38,38,0.3)] relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={details.onCancel}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded transition cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Title / Header */}
        <div className="flex items-start gap-3.5 border-b-2 border-red-900/60 pb-4">
          <div className="p-2.5 bg-red-950/80 border border-red-700/80 rounded shrink-0">
            <ShieldAlert className="text-red-500 animate-pulse" size={28} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest bg-red-950/60 px-2 py-0.5 border border-red-800/60 inline-block">
              MANDATORY PURGE SAFEGUARD
            </span>
            <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-white mt-1">
              {details.title}
            </h3>
            {details.subtitle && (
              <p className="text-xs text-neutral-400 mt-0.5 font-sans font-medium">
                {details.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Affected Count Callout */}
        {details.affectedCountMessage && (
          <div className="p-3 bg-red-950/30 border border-red-800/80 rounded flex items-center gap-2.5 text-xs text-red-300 font-bold">
            <AlertTriangle size={16} className="text-red-400 shrink-0" />
            <span>{details.affectedCountMessage}</span>
          </div>
        )}

        {/* Breakdown Sections */}
        <div className="space-y-3 text-xs">
          {/* What Will Be DELETED */}
          <div className="p-3.5 bg-red-950/20 border-2 border-red-900/70 rounded space-y-2">
            <div className="flex items-center gap-2 text-red-400 font-black uppercase tracking-wider text-[11px]">
              <Trash2 size={14} />
              <span>WHAT WILL BE PERMANENTLY DELETED:</span>
            </div>
            <ul className="space-y-1.5 pl-1">
              {details.whatWillBeDeleted.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-red-200 font-medium font-sans text-xs">
                  <span className="text-red-500 font-black select-none">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* What Will Be PRESERVED */}
          <div className="p-3.5 bg-emerald-950/20 border-2 border-emerald-900/70 rounded space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-black uppercase tracking-wider text-[11px]">
              <CheckCircle2 size={14} />
              <span>WHAT WILL REMAIN SAFE & UNTOUCHED:</span>
            </div>
            <ul className="space-y-1.5 pl-1">
              {details.whatWillBePreserved.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-emerald-200 font-medium font-sans text-xs">
                  <span className="text-emerald-500 font-black select-none">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Verification Input */}
        {requiresTyping && (
          <div className="space-y-2 pt-1">
            <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-300">
              Type <span className="text-red-400 font-black bg-red-950 px-1.5 py-0.5 border border-red-800 font-mono">{requiredText}</span> to authorize deletion:
            </label>
            <input
              type="text"
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              placeholder={`Type ${requiredText} here...`}
              className="w-full px-3.5 py-2.5 bg-neutral-900 border-2 border-neutral-700 text-white font-mono text-sm focus:border-red-500 focus:outline-none uppercase"
              autoFocus
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          <button
            type="button"
            disabled={!isAuthorized}
            onClick={() => {
              if (isAuthorized) {
                details.onConfirm();
              }
            }}
            className="flex-1 py-3 px-4 bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 font-mono"
          >
            <Trash2 size={15} />
            <span>{details.confirmButtonText || 'CONFIRM PERMANENT DELETE'}</span>
          </button>
          <button
            type="button"
            onClick={details.onCancel}
            className="py-3 px-5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border border-neutral-700 font-mono"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );
};
