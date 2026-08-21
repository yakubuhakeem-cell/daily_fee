/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { DuplicatePaymentAuditGroup, DuplicatePaymentAuditItem, StudentClass } from '../types';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Printer,
  RefreshCw,
  Search,
  Filter,
  X,
  FileText,
  DollarSign,
  UserCheck,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';

interface DuplicateReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DuplicateReconciliationModal: React.FC<DuplicateReconciliationModalProps> = ({
  isOpen,
  onClose
}) => {
  const {
    getDuplicatePaymentAudit,
    purgeDuplicatePayments,
    deletePaymentRecord,
    students,
    terms,
    activeTerm,
    playFeedbackSound,
    systemSettings
  } = useApp();

  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<'ALL' | 'GHOSTS' | 'LEGITIMATE' | 'ZEROS'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const currencyCode = systemSettings?.currencyCode || 'GHC';

  // Fetch live audit groups
  const auditGroups = useMemo(() => {
    if (!isOpen) return [];
    return getDuplicatePaymentAudit();
  }, [isOpen, getDuplicatePaymentAudit]);

  // Overall metrics
  const stats = useMemo(() => {
    let totalGhostRecords = 0;
    let totalRedundantZeros = 0;
    let totalLegitimateInstallments = 0;
    let totalAffectedPupils = new Set<string>();

    auditGroups.forEach(group => {
      totalAffectedPupils.add(group.studentId);
      group.records.forEach(rec => {
        if (rec.duplicateType === 'exact_ghost') totalGhostRecords++;
        else if (rec.duplicateType === 'redundant_zero') totalRedundantZeros++;
        else if (rec.duplicateType === 'legitimate_installment') totalLegitimateInstallments++;
      });
    });

    return {
      groupCount: auditGroups.length,
      pupilCount: totalAffectedPupils.size,
      ghostCount: totalGhostRecords,
      zeroCount: totalRedundantZeros,
      legitimateCount: totalLegitimateInstallments
    };
  }, [auditGroups]);

  // Filtered groups
  const filteredGroups = useMemo(() => {
    return auditGroups.filter(group => {
      if (filterClass !== 'ALL' && group.studentClass !== filterClass) return false;

      if (filterType === 'GHOSTS' && !group.hasExactGhost) return false;
      if (filterType === 'ZEROS' && !group.hasRedundantZero) return false;
      if (filterType === 'LEGITIMATE' && !group.hasLegitimateInstallment) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = group.studentName.toLowerCase().includes(q);
        const matchesDate = group.date.includes(q);
        const matchesClass = group.studentClass.toLowerCase().includes(q);
        const matchesNotes = group.records.some(r => (r.notes || '').toLowerCase().includes(q));
        if (!matchesName && !matchesDate && !matchesClass && !matchesNotes) return false;
      }

      return true;
    });
  }, [auditGroups, filterClass, filterType, searchQuery]);

  if (!isOpen) return null;

  const handleSmartPurge = () => {
    setIsProcessing(true);
    try {
      const res = purgeDuplicatePayments({
        onlyExactGhosts: true,
        deleteRedundantZero: true,
        preserveLegitimateInstallments: true
      });
      setResultMessage(res.message);
      playFeedbackSound?.(res.count > 0 ? 'success' : 'warning');
    } catch (e: any) {
      setResultMessage(`Failed to purge duplicates: ${e.message || e}`);
      playFeedbackSound?.('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSingleRecord = (recId: string, pupilName: string, amt: number) => {
    const res = deletePaymentRecord(recId);
    if (res.success) {
      setResultMessage(`Deleted duplicate entry of ${currencyCode} ${amt.toFixed(2)} for ${pupilName}.`);
      playFeedbackSound?.('success');
    } else {
      setResultMessage(res.message);
      playFeedbackSound?.('error');
    }
  };

  const handlePrintReconciliation = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-neutral-900 border-4 border-amber-400 max-w-5xl w-full max-h-[92vh] flex flex-col shadow-[8px_8px_0px_0px_#f59e0b]">
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-6 border-b-2 border-neutral-800 flex items-start justify-between gap-4 bg-neutral-950 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-black uppercase tracking-widest">
              <ShieldAlert size={16} />
              Financial Integrity & Payment Audit
            </div>
            <h2 className="text-lg sm:text-xl font-black uppercase text-white font-mono tracking-tight flex items-center gap-2">
              Payment Reconciliation vs Hard Copies
            </h2>
            <p className="text-xs text-neutral-400 font-medium max-w-3xl">
              Inspect multi-payment dates, remove true network/sync ghost duplicates, and preserve legitimate separate receipts (such as debt clearance or morning/afternoon cash installments) so your digital totals match teachers' physical receipt books.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* METRICS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-4 bg-neutral-950/60 border-b border-neutral-800 font-mono text-xs shrink-0">
          <div className="p-3 bg-neutral-900 border border-neutral-800">
            <span className="text-[10px] text-neutral-500 uppercase block font-bold">Multi-Payment Days</span>
            <strong className="text-base sm:text-lg text-white font-black">{stats.groupCount} Days</strong>
            <span className="text-[10px] text-neutral-400 block font-medium">Across {stats.pupilCount} pupils</span>
          </div>

          <div className="p-3 bg-red-950/30 border border-red-900/60">
            <span className="text-[10px] text-red-400 uppercase block font-bold flex items-center gap-1">
              <AlertTriangle size={11} /> Ghost Duplicates
            </span>
            <strong className="text-base sm:text-lg text-red-400 font-black">{stats.ghostCount} Records</strong>
            <span className="text-[10px] text-red-300/80 block font-medium">Repeated sync collisions</span>
          </div>

          <div className="p-3 bg-amber-950/30 border border-amber-900/60">
            <span className="text-[10px] text-amber-400 uppercase block font-bold">Redundant 0-Markers</span>
            <strong className="text-base sm:text-lg text-amber-400 font-black">{stats.zeroCount} Records</strong>
            <span className="text-[10px] text-amber-300/80 block font-medium">Overlaps with paid records</span>
          </div>

          <div className="p-3 bg-emerald-950/30 border border-emerald-900/60">
            <span className="text-[10px] text-emerald-400 uppercase block font-bold flex items-center gap-1">
              <CheckCircle2 size={11} /> Hard-Copy Receipts
            </span>
            <strong className="text-base sm:text-lg text-emerald-400 font-black">{stats.legitimateCount} Records</strong>
            <span className="text-[10px] text-emerald-300/80 block font-medium">Legitimate installments</span>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {resultMessage && (
          <div className="p-3 bg-amber-500/10 border-b border-amber-500/30 text-xs font-mono text-amber-300 flex items-center justify-between px-4">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 size={15} className="text-amber-400 shrink-0" />
              <span>{resultMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setResultMessage(null)}
              className="text-neutral-400 hover:text-white text-[11px] uppercase underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* CONTROLS BAR */}
        <div className="p-3 sm:p-4 bg-neutral-900 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative min-w-[180px] flex-1 sm:flex-initial">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search pupil, date, note..."
                className="w-full pl-8 pr-3 py-1.5 bg-neutral-950 border border-neutral-700 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <select
              value={filterClass}
              onChange={e => setFilterClass(e.target.value)}
              className="py-1.5 px-2.5 bg-neutral-950 border border-neutral-700 text-xs font-mono text-neutral-200 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="ALL">All Classes</option>
              {['Nursery', 'KG1', 'KG2', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as any)}
              className="py-1.5 px-2.5 bg-neutral-950 border border-neutral-700 text-xs font-mono text-neutral-200 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="ALL">All Multi-Payment Days ({auditGroups.length})</option>
              <option value="GHOSTS">Ghost Duplicates Only</option>
              <option value="ZEROS">Redundant 0-Markers Only</option>
              <option value="LEGITIMATE">Legitimate Multi-Receipts Only</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintReconciliation}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
            >
              <Printer size={13} /> Print
            </button>

            <button
              type="button"
              onClick={handleSmartPurge}
              disabled={isProcessing || (stats.ghostCount === 0 && stats.zeroCount === 0)}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-350 disabled:bg-neutral-800 disabled:text-neutral-500 text-black font-black uppercase text-xs tracking-wider font-mono transition-all cursor-pointer flex items-center gap-2 border-2 border-amber-500 disabled:border-neutral-700"
            >
              <RefreshCw size={14} className={isProcessing ? 'animate-spin' : ''} />
              <span>⚡ 1-Click Smart Clean ({stats.ghostCount + stats.zeroCount})</span>
            </button>
          </div>
        </div>

        {/* AUDIT GROUP LIST */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
          {filteredGroups.length === 0 ? (
            <div className="p-12 text-center bg-neutral-950 border-2 border-neutral-800 text-neutral-400 space-y-3">
              <CheckCircle2 size={36} className="mx-auto text-emerald-400 stroke-[2]" />
              <h4 className="text-base font-black text-white uppercase">All Payment Records Reconciled</h4>
              <p className="text-xs max-w-md mx-auto text-neutral-400 font-medium">
                {searchQuery || filterClass !== 'ALL' || filterType !== 'ALL'
                  ? 'No records match your active search filters.'
                  : 'No phantom duplicates found! All pupil payment records are clean and synchronized.'}
              </p>
            </div>
          ) : (
            filteredGroups.map(group => (
              <div
                key={group.groupKey}
                className={`p-4 bg-neutral-950 border-2 transition-all ${
                  group.hasExactGhost
                    ? 'border-red-600/80 bg-red-950/10'
                    : group.hasRedundantZero
                    ? 'border-amber-600/80 bg-amber-950/10'
                    : 'border-emerald-700/60 bg-emerald-950/10'
                }`}
              >
                {/* GROUP HEADER */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b border-neutral-800 gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-700 text-amber-400 font-bold uppercase text-[10px]">
                      {group.studentClass}
                    </span>
                    <strong className="text-sm font-black text-white">{group.studentName}</strong>
                    <span className="text-neutral-500 font-normal">|</span>
                    <span className="text-neutral-400 font-bold flex items-center gap-1">
                      <Calendar size={12} className="text-amber-400" />
                      {group.date}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-neutral-400 text-[11px]">
                      Date Total: <strong className="text-white text-xs">{currencyCode} {group.totalAmount.toFixed(2)}</strong>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      group.hasExactGhost
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                        : group.hasRedundantZero
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    }`}>
                      {group.hasExactGhost
                        ? '⚠️ Contains Ghost Duplicates'
                        : group.hasRedundantZero
                        ? '⚠️ Redundant Zero Marker'
                        : '✓ Legitimate Multi-Receipt'}
                    </span>
                  </div>
                </div>

                {/* INDIVIDUAL RECORD ITEMS */}
                <div className="pt-3 space-y-2">
                  {group.records.map((rec, idx) => (
                    <div
                      key={rec.id}
                      className={`p-3 border flex flex-col md:flex-row justify-between items-start md:items-center gap-3 ${
                        rec.duplicateType === 'exact_ghost'
                          ? 'bg-red-950/20 border-red-800/60'
                          : rec.duplicateType === 'redundant_zero'
                          ? 'bg-amber-950/20 border-amber-800/60'
                          : 'bg-neutral-900/90 border-neutral-800'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3 flex-1">
                        <div className="w-6 h-6 rounded bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[10px] font-bold text-neutral-400 shrink-0">
                          #{idx + 1}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-black ${rec.amount > 0 ? 'text-emerald-400' : 'text-neutral-500'}`}>
                              {currencyCode} {rec.amount.toFixed(2)}
                            </span>
                            <span className="px-1.5 py-0.5 bg-neutral-800 text-[10px] text-neutral-300 uppercase font-bold">
                              {rec.paymentMethod || 'Cash'}
                            </span>
                            <span className="text-[10px] text-neutral-500">
                              Logged by {rec.collectedBy} @ {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {rec.notes ? (
                            <p className="text-[11px] text-neutral-300 font-medium">
                              📝 Notes: <span className="italic text-amber-200/90">"{rec.notes}"</span>
                            </p>
                          ) : (
                            <p className="text-[10px] text-neutral-500 italic">No notes provided</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                        <span className={`text-[10px] px-2 py-0.5 font-bold uppercase rounded ${
                          rec.duplicateType === 'exact_ghost'
                            ? 'bg-red-900/60 text-red-200'
                            : rec.duplicateType === 'redundant_zero'
                            ? 'bg-amber-900/60 text-amber-200'
                            : 'bg-emerald-900/60 text-emerald-200'
                        }`}>
                          {rec.duplicateType === 'exact_ghost'
                            ? 'Ghost Copy (Safe to Delete)'
                            : rec.duplicateType === 'redundant_zero'
                            ? '0-Attendance Marker'
                            : 'Physical Receipt'}
                        </span>

                        <button
                          type="button"
                          title="Delete this individual payment line"
                          onClick={() => handleDeleteSingleRecord(rec.id, group.studentName, rec.amount)}
                          className="p-1.5 bg-neutral-800 hover:bg-red-900/80 text-neutral-400 hover:text-red-200 border border-neutral-700 hover:border-red-700 transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-neutral-950 border-t-2 border-neutral-800 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0 font-mono text-xs">
          <div className="text-neutral-400 text-[11px]">
            Showing <strong className="text-amber-400">{filteredGroups.length}</strong> multi-payment dates. Smart Purge cleans phantom duplicates while preserving legitimate multi-receipts.
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-white font-bold uppercase tracking-wider cursor-pointer"
          >
            Close Audit Center
          </button>
        </div>
      </div>
    </div>
  );
};
