/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PaymentRecord, Student, StudentClass, UserRole } from '../types';
import { 
  ShieldAlert, 
  Search, 
  Calendar, 
  Filter, 
  History, 
  Check, 
  X, 
  Edit2, 
  AlertTriangle,
  RefreshCw,
  Coins,
  FileCheck,
  UserCheck
} from 'lucide-react';

export const AdjustmentsTab: React.FC = () => {
  const { 
    currentUser, 
    payments, 
    students,
    activeTerm,
    adjustPayment,
    currentDate
  } = useApp();

  // Security Check: Authorized roles are Administrator, Headmaster, Accountant
  const isAuthorized = useMemo(() => {
    if (!currentUser) return false;
    const authorizedRoles: UserRole[] = ['Administrator', 'Headmaster', 'Accountant'];
    return authorizedRoles.includes(currentUser.role);
  }, [currentUser]);

  // UI state filters
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'absent'>('all');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'modified' | 'original'>('all');

  // Audit Override Modal / Section state
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);
  const [modIsAbsent, setModIsAbsent] = useState<boolean>(false);
  const [modAmount, setModAmount] = useState<number>(5.00);
  const [modReason, setModReason] = useState<string>('Typo during checkpoint entry');
  const [modNotes, setModNotes] = useState<string>('');
  const [isSuccessToast, setIsSuccessToast] = useState<string | null>(null);

  // Form reasons
  const REASONS = [
    'Typo during checkpoint entry',
    'Pupil marked absent by mistake',
    'Pupil marked present by mistake',
    'Incorrect rate assigned / discount issue',
    'System synchronization replication double-entry',
    'Offline queue resolution adjustment',
    'Other (specified in notes)'
  ];

  // Available classes in system
  const classesList: StudentClass[] = [
    'Nursery', 'KG1', 'KG2',
    'B1', 'B2', 'B3', 'B4', 'B5', 'B6',
    'B7', 'B8', 'B9'
  ];

  // Handle open editor
  const handleStartEdit = (record: PaymentRecord) => {
    const student = students.find(s => s.id === record.studentId);
    setEditingPayment(record);
    setModIsAbsent(!!record.isAbsent);
    // If it is absent, amount might default to 0, otherwise actual amount or pupil discount fallback
    setModAmount(record.amount);
    setModReason('Typo during checkpoint entry');
    setModNotes(record.notes || '');
  };

  // Handle Absency state swap inside form
  const handleToggleAbsent = (absentVal: boolean) => {
    setModIsAbsent(absentVal);
    if (absentVal) {
      setModAmount(0);
    } else {
      // Look up student discount if set
      if (editingPayment) {
        const student = students.find(s => s.id === editingPayment.studentId);
        const dailyRate = student ? Math.max(0.01, 5.00 - (student.discount || 0)) : 5.00;
        setModAmount(dailyRate);
      } else {
        setModAmount(5.00);
      }
    }
  };

  // Submit override adjustment
  const handleApplyOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;

    adjustPayment(
      editingPayment.id,
      modAmount,
      modIsAbsent,
      modNotes.trim() ? `${modNotes.trim()} [Audit note: ${modReason}]` : `Audit Correction: ${modReason}`,
      modReason
    );

    // Dynamic success message
    setIsSuccessToast(`Successfully overrides past registration for "${editingPayment.studentName}" on ${editingPayment.date}`);
    setTimeout(() => setIsSuccessToast(null), 4000);
    setEditingPayment(null);
  };

  // Standard payments list with filters
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      // 1. Search Query (pupil name)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        if (!p.studentName.toLowerCase().includes(query) && !p.id.toLowerCase().includes(query)) {
          return false;
        }
      }

      // 2. Class Filter
      if (classFilter !== 'all' && p.class !== classFilter) {
        return false;
      }

      // 3. Date Filter
      if (dateFilter && p.date !== dateFilter) {
        return false;
      }

      // 4. Status Filter
      if (statusFilter === 'paid' && p.isAbsent) return false;
      if (statusFilter === 'absent' && !p.isAbsent) return false;

      // 5. History Filter
      const hasHistory = p.history && p.history.length > 0;
      if (historyFilter === 'modified' && !hasHistory) return false;
      if (historyFilter === 'original' && hasHistory) return false;

      return true;
    }).sort((a, b) => b.date.localeCompare(a.date) || b.timestamp.localeCompare(a.timestamp));
  }, [payments, searchQuery, classFilter, dateFilter, statusFilter, historyFilter]);

  // Historical Overrides Stats Metrics
  const overrideMetrics = useMemo(() => {
    const recordsWithHistory = payments.filter(p => p.history && p.history.length > 0);
    const totalOverrideEvents = recordsWithHistory.reduce((acc, curr) => acc + (curr.history?.length || 0), 0);
    return {
      recordsCount: recordsWithHistory.length,
      totalOverrideOperations: totalOverrideEvents,
      paymentsInFiltered: filteredPayments.length
    };
  }, [payments, filteredPayments]);

  if (!isAuthorized) {
    return (
      <div id="adjustments_unauthorized" className="bg-neutral-900 border-4 border-red-950 p-12 text-center space-y-6 max-w-2xl mx-auto my-12 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <div className="flex justify-center">
          <div className="bg-red-950/40 p-5 border-2 border-red-500 rounded-full animate-pulse">
            <ShieldAlert size={48} className="text-red-500" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-mono font-black uppercase text-white tracking-widest">
            🔒 SECURE LEDGER ACCESS RESTRICTED
          </h3>
          <p className="text-neutral-400 text-xs font-semibold font-sans leading-relaxed tracking-normal">
            You are logged in as <span className="text-amber-400 font-extrabold font-mono">{(currentUser?.name || "Unknown Pupil")} &lt;{currentUser?.email || "No Email"}&gt;</span> with the role of <span className="text-red-400 font-extrabold font-mono uppercase">{(currentUser?.role || "GUEST")}</span>.
          </p>
          <p className="text-neutral-500 text-[11px] leading-relaxed max-w-md mx-auto">
            Audit logs corrections, payment overrides, and checkpoint records modification rights are strictly limited to authorized <span className="text-neutral-300 font-bold">Administrators</span>, <span className="text-neutral-300 font-bold">Headmasters</span>, or <span className="text-neutral-300 font-bold font-mono">Accountants</span> to conform with legal school auditing standards.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="adjustments_panel_secured" className="space-y-6">
      
      {/* Dynamic Action Toast */}
      {isSuccessToast && (
        <div className="bg-emerald-950 border-4 border-emerald-500 p-4 font-mono text-center text-xs font-black text-emerald-400 animate-bounce flex items-center justify-center gap-3">
          <Check size={16} />
          <span>{isSuccessToast}</span>
        </div>
      )}

      {/* Overview Headings */}
      <div className="bg-neutral-900 border-4 border-neutral-800 p-6 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b-2 border-neutral-850 pb-4 gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-3 font-mono">
              <History size={20} className="text-amber-400 animate-spin-slow" /> Past Checkpoint Ledger Adjustments
            </h3>
            <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider pl-0.5 font-mono">
              Correct register entry errors retrospectively with automated secure auditable logs.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="bg-neutral-950 px-4 py-2 border border-neutral-800 text-center">
              <span className="block text-[9px] text-neutral-500 uppercase tracking-widest font-mono">Adjusted Entries</span>
              <span className="text-sm font-black text-neutral-200">{overrideMetrics.recordsCount}</span>
            </div>
            <div className="bg-neutral-950 px-4 py-2 border border-neutral-800 text-center">
              <span className="block text-[9px] text-neutral-500 uppercase tracking-widest font-mono">Auditable Audits</span>
              <span className="text-sm font-black text-amber-400">{overrideMetrics.totalOverrideOperations}</span>
            </div>
          </div>
        </div>

        {/* Informative Security Standard banner */}
        <div className="bg-neutral-950 p-4 border-l-4 border-amber-500 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed text-neutral-400">
            <span className="text-white font-extrabold uppercase">Audit Standard Compliance:</span> Every change overrides the target daily entry state and values inside the class register. The system permanently associates your account signature (<span className="text-amber-400 font-mono font-black">{currentUser?.name}</span>) with the record history alongside the original transaction metrics. This ledger action is strictly tracked.
          </div>
        </div>
      </div>

      {/* Form editor drawer / card when editing */}
      {editingPayment && (
        <div id="ledger_override_drawer" className="bg-neutral-900 border-4 border-amber-500 p-6 space-y-4 animate-fade-in shadow-[0_15px_30px_rgba(245,158,11,0.15)]">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <RefreshCw size={16} className="text-amber-400 animate-spin" />
              <h4 className="text-xs font-mono font-black uppercase text-white">Adjust Payment Override Panel</h4>
            </div>
            <button 
              type="button" 
              onClick={() => setEditingPayment(null)}
              className="p-1 hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleApplyOverride} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9.5px] font-black text-neutral-500 uppercase font-mono mb-1">Pupil Name</label>
                  <div className="bg-neutral-950 px-3 py-2 border border-neutral-850 font-mono text-[11px] text-white font-black">
                    {editingPayment.studentName}
                  </div>
                </div>
                <div>
                  <label className="block text-[9.5px] font-black text-neutral-500 uppercase font-mono mb-1">Register Date</label>
                  <div className="bg-neutral-950 px-3 py-2 border border-neutral-850 font-mono text-[11px] text-amber-400 font-black">
                    {editingPayment.date}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9.5px] font-black text-neutral-500 uppercase font-mono mb-1">Original Collector</label>
                  <div className="bg-neutral-950 px-3 py-2 border border-neutral-850 font-mono text-[11px] text-neutral-400">
                    {editingPayment.collectedBy}
                  </div>
                </div>
                <div>
                  <label className="block text-[9.5px] font-black text-neutral-500 uppercase font-mono mb-1">Grade / Class</label>
                  <div className="bg-neutral-950 px-3 py-2 border border-neutral-850 font-mono text-[11px] text-neutral-400">
                    {editingPayment.class} ({editingPayment.category})
                  </div>
                </div>
              </div>

              {/* Status Selector */}
              <div className="space-y-1.5">
                <label className="block text-[9.5px] font-black text-neutral-500 uppercase font-mono">Correction Status</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleAbsent(false)}
                    className={`py-2 px-3 text-xs font-mono font-black uppercase border-2 flex items-center justify-center gap-2 transition ${
                      !modIsAbsent 
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-400' 
                        : 'bg-neutral-950 border-neutral-850 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Check size={13} />
                    <span>Present & Paid</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleAbsent(true)}
                    className={`py-2 px-3 text-xs font-mono font-black uppercase border-2 flex items-center justify-center gap-2 transition ${
                      modIsAbsent 
                        ? 'bg-red-950 border-red-500 text-red-400' 
                        : 'bg-neutral-950 border-neutral-850 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <X size={13} />
                    <span>Mark Absent (0 GHC)</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Correction Amount */}
              {!modIsAbsent && (
                <div className="space-y-1.5">
                  <label className="block text-[9.5px] font-black text-neutral-500 uppercase font-mono">New Audited Amount (GHC)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-mono font-black text-neutral-600">GHC</span>
                    <input
                      type="number"
                      required
                      min="0.00"
                      max="100.00"
                      step="0.01"
                      value={modAmount}
                      onChange={(e) => setModAmount(parseFloat(e.target.value) || 0)}
                      className="w-full bg-neutral-950 border-2 border-neutral-800 py-2.5 pl-14 pr-4 font-mono text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* Action Reason dropdown */}
              <div className="space-y-1.5">
                <label className="block text-[9.5px] font-black text-neutral-500 uppercase font-mono">Official Adjustment Reason</label>
                <select
                  value={modReason}
                  onChange={(e) => setModReason(e.target.value)}
                  className="w-full bg-neutral-950 border-2 border-neutral-800 py-2.5 px-3 font-mono text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                >
                  {REASONS.map(reason => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>

              {/* Custom descriptive summary details */}
              <div className="space-y-1.5">
                <label className="block text-[9.5px] font-black text-neutral-500 uppercase font-mono">Auditor Explanatory Annotations / Notes</label>
                <input
                  type="text"
                  value={modNotes}
                  onChange={(e) => setModNotes(e.target.value)}
                  placeholder="Enter detailed override footnotes (e.g., Authorized by headmaster, mistake at Gate 1)"
                  className="w-full bg-neutral-950 border-2 border-neutral-800 py-2.5 px-3 font-mono text-xs text-white focus:outline-none focus:border-amber-500 placeholder:text-neutral-700"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-amber-400 text-black hover:bg-amber-300 font-black font-sans uppercase text-xs tracking-wider transition-all shadow-[4px_4px_0px_0px_rgba(251,191,36,0.2)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FileCheck size={14} />
                  <span>Execute Override & Log Trail</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="py-3 px-5 bg-neutral-950 border-2 border-neutral-800 text-neutral-400 hover:text-white font-black uppercase text-xs tracking-wider font-mono transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Structured Search Toolbar grid */}
      <div className="bg-neutral-900 border-4 border-neutral-800 p-6 space-y-4">
        <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400 font-mono border-b border-neutral-850 pb-2 flex items-center gap-2">
          <Filter size={13} className="text-amber-400" /> Filter Past Transaction Records
        </h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          
          {/* Search bar */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-3 text-neutral-500" size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by pupil, payment ID..."
              className="w-full bg-neutral-950 border border-neutral-800 py-2.5 pl-10 pr-4 font-mono text-xs text-white focus:outline-none focus:border-amber-500 placeholder:text-neutral-700 font-bold"
            />
          </div>

          {/* Class selector */}
          <div>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 py-2.5 px-3 font-mono text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
            >
              <option value="all">ALL CLASSES</option>
              {classesList.map(c => (
                <option key={c} value={c}>CLASS {c}</option>
              ))}
            </select>
          </div>

          {/* Date Selector */}
          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 py-2.5 px-3 font-mono text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
            />
          </div>

          {/* Status and History split */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-neutral-950 border border-neutral-800 py-2.5 px-3 font-mono text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
            >
              <option value="all">ALL PAYMENT STATES</option>
              <option value="paid">PAID & COMPLIANT</option>
              <option value="absent">MARKED ABSENT</option>
            </select>
          </div>

        </div>

        {/* History filter option */}
        <div className="flex gap-4 border-t border-neutral-850 pt-3">
          <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest font-mono self-center">Record Version:</span>
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'All Entries' },
              { id: 'modified', label: 'Modified Only (Audits)' },
              { id: 'original', label: 'Untouched Original Entries' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setHistoryFilter(tab.id as any)}
                className={`px-3 py-1 font-mono text-[9.5px] font-black uppercase transition-all border ${
                  historyFilter === tab.id
                    ? 'bg-amber-400 border-amber-400 text-black'
                    : 'bg-neutral-950 border-neutral-850 text-neutral-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main ledger list container */}
      <div className="bg-neutral-900 border-4 border-neutral-800">
        <div className="px-6 py-4 border-b border-neutral-800 flex justify-between items-center flex-wrap gap-2">
          <span className="text-xs font-black uppercase tracking-widest font-mono text-neutral-300">
            Filtered Checkpoint Entries ({filteredPayments.length})
          </span>
          <span className="text-[10px] text-neutral-500 font-mono font-bold">
            Showing transactions in descending chronological date order
          </span>
        </div>

        {filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 uppercase font-mono tracking-widest text-xs font-black">
            No past payments matched search indicators. Try modifying selectors.
          </div>
        ) : (
          <div className="divide-y divide-neutral-850">
            {filteredPayments.map(p => {
              const hasHistory = p.history && p.history.length > 0;
              return (
                <div key={p.id} className="p-5 flex flex-col md:flex-row justify-between md:items-center hover:bg-neutral-950/45 transition-colors gap-4">
                  
                  {/* Student Details and Date */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-white font-extrabold">{p.studentName}</span>
                      <span className="px-2 py-0.5 bg-neutral-950 border border-neutral-800 text-[9px] font-mono text-neutral-450 uppercase font-bold">
                        Class {p.class}
                      </span>
                      {hasHistory && (
                        <span className="px-1.5 py-0.5 bg-amber-950 border border-amber-500/40 text-[9px] font-mono text-amber-500 uppercase font-extrabold animate-pulse">
                          ⚠️ ADJUSTED ({p.history!.length}x)
                        </span>
                      )}
                    </div>
                    
                    <div className="flex gap-2.5 text-[10px] text-neutral-500 font-mono font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} className="text-neutral-600" />
                        Date: <strong className="text-neutral-450">{p.date}</strong>
                      </span>
                      <span>•</span>
                      <span>Recorded by: {p.collectedBy}</span>
                      <span>•</span>
                      <span className="font-bold">ID: {p.id}</span>
                    </div>

                    {/* Expandable detailed history logs */}
                    {hasHistory && (
                      <div className="mt-3 bg-neutral-950 border border-amber-500/20 p-3 space-y-2 max-w-xl">
                        <span className="text-[8.5px] font-black uppercase text-amber-500 font-mono tracking-widest block flex items-center gap-1.5 border-b border-neutral-850 pb-1">
                          <History size={10} /> SECURITY AUDIT OVERRIDE TRAILS:
                        </span>
                        <div className="space-y-2 divide-y divide-neutral-900">
                          {p.history!.map((h, i) => (
                            <div key={i} className="pt-2 text-[10px] font-mono space-y-1">
                              <div className="flex justify-between text-neutral-400 font-medium">
                                <span>Adjuster signature: <strong className="text-amber-400">{h.modifiedBy}</strong></span>
                                <span>{new Date(h.modifiedAt).toLocaleString()}</span>
                              </div>
                              <div className="text-neutral-300">
                                Override: <strong className="text-neutral-400">GHC {h.oldAmount.toFixed(2)}</strong> {h.oldIsAbsent ? '(Absent)' : ''} ➔ <strong className="text-white">GHC {h.newAmount.toFixed(2)}</strong> {h.newIsAbsent ? '(Absent)' : ''}
                              </div>
                              {h.reason && (
                                <div className="text-amber-500/70 text-[9.5px]">
                                  Reason: &quot;{h.reason}&quot;
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Side: Status metric & adjustment actions */}
                  <div className="flex items-center gap-4 justify-between md:justify-end shrink-0">
                    
                    {/* State badge */}
                    <div className="text-right">
                      {p.isAbsent ? (
                        <div className="px-3 py-1 bg-red-950 text-red-500 text-[10px] font-mono border border-red-900 font-black uppercase tracking-wider">
                          ABSENT
                        </div>
                      ) : (
                        <div className="px-3 py-1 bg-emerald-950 text-emerald-400 text-[10px] font-mono border border-emerald-900 font-black uppercase tracking-wider">
                          GHC {p.amount.toFixed(2)}
                        </div>
                      )}
                      
                      <span className="block text-[8px] uppercase tracking-widest font-mono text-neutral-500 text-right mt-1 font-semibold">
                        {p.verified ? 'Verified Ledger' : 'Pending Verification'}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(p)}
                        className="py-2 px-3 bg-neutral-950 hover:bg-amber-400 hover:text-black border border-neutral-850 hover:border-amber-400 text-[10.5px] font-black uppercase tracking-wider text-amber-400 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit2 size={11} />
                        <span>Correct Error</span>
                      </button>
                    </div>

                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
};
