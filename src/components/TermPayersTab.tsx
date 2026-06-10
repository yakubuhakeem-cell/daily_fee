/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Student, PaymentRecord, StudentClass } from '../types';
import { 
  Users, 
  Receipt, 
  AlertCircle, 
  CheckCircle2, 
  Search, 
  Filter, 
  ChevronRight, 
  Calendar, 
  User, 
  DollarSign, 
  Plus, 
  X, 
  Printer, 
  Volume2, 
  VolumeX,
  CreditCard,
  UserCheck,
  Building,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const TermPayersTab: React.FC = () => {
  const { 
    students, 
    payments, 
    recordPayment, 
    currentUser, 
    currentDate,
    theme
  } = useApp();

  // Search, Class and Payment Status Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OUTSTANDING' | 'PAID'>('ALL');
  
  // Selected student for detail overlay/modal and quick collection
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Quick collection states
  const [collectAmount, setCollectAmount] = useState<string>('');
  const [collectNotes, setCollectNotes] = useState<string>('');
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Active Term Payers list
  const activeTermPayers = useMemo(() => {
    return students.filter(s => s.active !== false && s.paymentType === 'Term');
  }, [students]);

  // Compute stats based on ALL active Term Payers
  const stats = useMemo(() => {
    let totalExpected = 0;
    let totalPaid = 0;
    let fullySettledCount = 0;
    let outstandingCount = 0;

    activeTermPayers.forEach(s => {
      const studentFee = s.termFee || 350;
      totalExpected += studentFee;

      const studentPayments = payments.filter(p => p.studentId === s.id && !p.isAbsent);
      const studentTotalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
      totalPaid += studentTotalPaid;

      if (studentTotalPaid >= studentFee) {
        fullySettledCount++;
      } else {
        outstandingCount++;
      }
    });

    const outstandingBalance = Math.max(0, totalExpected - totalPaid);
    const collectionPercent = totalExpected > 0 ? (totalPaid / totalExpected) * 100 : 0;

    return {
      activeLength: activeTermPayers.length,
      totalExpected,
      totalPaid,
      outstandingBalance,
      collectionPercent,
      fullySettledCount,
      outstandingCount
    };
  }, [activeTermPayers, payments]);

  // Filter Term Payers for display
  const displayedTermPayers = useMemo(() => {
    return activeTermPayers.filter(s => {
      // 1. Name or roll number search
      const matchesSearch = 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase());
      
      // 2. Class filter
      const matchesClass = classFilter === 'ALL' || s.class === classFilter;

      // 3. Status filter
      const studentFee = s.termFee || 350;
      const studentPayments = payments.filter(p => p.studentId === s.id && !p.isAbsent);
      const studentTotalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
      const isPaid = studentTotalPaid >= studentFee;

      const matchesStatus = 
        statusFilter === 'ALL' ||
        (statusFilter === 'PAID' && isPaid) ||
        (statusFilter === 'OUTSTANDING' && !isPaid);

      return matchesSearch && matchesClass && matchesStatus;
    });
  }, [activeTermPayers, searchQuery, classFilter, statusFilter, payments]);

  // Calculate detailed finances for the selected student in detail panel
  const selectedStudentFinances = useMemo(() => {
    if (!selectedStudent) return null;
    const studentFee = selectedStudent.termFee || 350;
    const studentPayments = payments.filter(p => p.studentId === selectedStudent.id);
    const paidPayments = studentPayments.filter(p => !p.isAbsent);
    const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0);
    const balanceDue = Math.max(0, studentFee - totalPaid);
    const prepayValue = Math.max(0, totalPaid - studentFee); // If they paid extra
    const isCompleted = totalPaid >= studentFee;
    const percentDone = Math.min(100, (totalPaid / studentFee) * 100);

    return {
      studentFee,
      studentPayments,
      paidPayments,
      totalPaid,
      balanceDue,
      prepayValue,
      isCompleted,
      percentDone
    };
  }, [selectedStudent, payments]);

  // Handle Incremental Collect Payment
  const handleCollectPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!selectedStudent) return;
    const amt = parseFloat(collectAmount);
    if (isNaN(amt) || amt <= 0) {
      setFormError('Please specify a valid financial amount greater than GHC 0.00');
      return;
    }

    try {
      // Execute the ledger record via context
      recordPayment(selectedStudent.id, true, amt);
      setFormSuccess(`GHC ${amt.toFixed(2)} recorded successfully!`);
      setCollectAmount('');
      setCollectNotes('');
      
      // Keep state in sync or close with delay
      setTimeout(() => {
        setFormSuccess(null);
      }, 3000);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred filing ledger record.');
    }
  };

  // Helper list of potential classes for filtering
  const studentClasses: StudentClass[] = [
    'Nursery', 'KG1', 'KG2',
    'B1', 'B2', 'B3', 'B4', 'B5', 'B6',
    'B7', 'B8', 'B9'
  ];

  return (
    <div className="space-y-6" id="term-payers-registry-workspace">
      {/* Upper header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b-4 border-neutral-800 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-amber-400 font-extrabold text-xs tracking-wider uppercase bg-amber-400/10 border border-amber-400/35 px-2 py-0.5 rounded-xs">
              Scheme Directory
            </span>
            <span className="text-neutral-500 font-mono text-[9px]">LOCKED CHANNELS ACTIVE</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight font-sans">
            Term Payers Ledger Status
          </h2>
          <p className="text-xs text-neutral-400 mt-1 font-bold">
            Administrative overview of pupils bound to fixed-term scholastic schemes. Allows quick state audits, filters, and records collection.
          </p>
        </div>

        {/* Global summary count */}
        <div className="bg-neutral-900 border-2 border-neutral-800 p-3 flex items-center gap-3.5 shrink-0 select-none">
          <div className="bg-amber-400 text-neutral-950 font-black p-2 rounded-xs">
            <Users size={18} />
          </div>
          <div>
            <span className="text-[9px] text-neutral-500 font-black uppercase tracking-widest block font-sans">Term Enrollment</span>
            <div className="text-base font-black text-white font-mono mt-0.5">
              {activeTermPayers.length} Active Pupils
            </div>
          </div>
        </div>
      </div>

      {/* Aggregate Financial Bento Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="term-analytics-grid">
        {/* Expected Term Revenue */}
        <div className="bg-neutral-900 border-2 border-neutral-800 p-4 relative overflow-hidden flex flex-col justify-between">
          <div>
            <span className="text-[9px] text-neutral-500 font-black uppercase tracking-wider block font-mono">
              ★ Total Expected Fees
            </span>
            <h3 className="text-xl md:text-2xl font-black text-white font-mono tracking-tight mt-1">
              GHC {stats.totalExpected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="text-[10px] text-neutral-400 font-bold mt-4 uppercase border-t border-neutral-800 pt-2 flex justify-between">
            <span>Quota Expected</span>
            <span className="text-amber-400">Term Aggregate</span>
          </div>
        </div>

        {/* Aggregate Collections Received */}
        <div className="bg-neutral-900 border-2 border-neutral-800 p-4 relative overflow-hidden flex flex-col justify-between">
          <div>
            <span className="text-[9px] text-emerald-400 font-black uppercase tracking-wider block font-mono">
              ✓ Cleared Collections
            </span>
            <h3 className="text-xl md:text-2xl font-black text-emerald-400 font-mono tracking-tight mt-1">
              GHC {stats.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="mt-4 border-t border-neutral-800 pt-2">
            <div className="flex items-center justify-between text-[10px] text-neutral-400 font-bold uppercase mb-1">
              <span>Collection Progress</span>
              <span className="text-emerald-400 font-mono font-black">{stats.collectionPercent.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-neutral-950 h-1.5 rounded-full overflow-hidden border border-neutral-855">
              <div 
                className="bg-emerald-500 h-full transition-all duration-500" 
                style={{ width: `${Math.min(100, stats.collectionPercent)}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Outstanding Deficit */}
        <div className="bg-neutral-900 border-2 border-neutral-800 p-4 relative overflow-hidden flex flex-col justify-between">
          <div>
            <span className="text-[9px] text-red-400 font-black uppercase tracking-wider block font-mono font-bold">
              ❌ Escrow Outstanding Deficit
            </span>
            <h3 className="text-xl md:text-2xl font-black text-red-500 font-mono tracking-tight mt-1">
              GHC {stats.outstandingBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="text-[10px] text-neutral-400 font-bold mt-4 uppercase border-t border-neutral-800 pt-2 flex justify-between">
            <span>To Be Collected</span>
            <span className="text-red-400 font-black">{stats.outstandingCount} Out of {stats.activeLength} Pupils</span>
          </div>
        </div>

        {/* Completion Statistics */}
        <div className="bg-neutral-900 border-2 border-neutral-800 p-4 relative overflow-hidden flex flex-col justify-between">
          <div>
            <span className="text-[9px] text-amber-400 font-black uppercase tracking-wider block font-mono">
              👑 Completion Quota Ratio
            </span>
            <h3 className="text-xl md:text-2xl font-black text-white font-mono tracking-tight mt-1">
              {stats.fullySettledCount} <span className="text-xs text-neutral-500">of</span> {stats.activeLength}
            </h3>
          </div>
          <div className="text-[10px] text-neutral-400 font-bold mt-4 uppercase border-t border-neutral-800 pt-2 flex justify-between">
            <span>Accounts Cleared</span>
            <span className="text-emerald-400 font-black bg-emerald-950/20 px-1 border border-emerald-990/30">
              {stats.activeLength > 0 ? ((stats.fullySettledCount / stats.activeLength) * 100).toFixed(0) : '0'}% Settled
            </span>
          </div>
        </div>
      </div>

      {/* Advanced Filter, Search, and Status bar */}
      <div className="bg-neutral-900 border-2 border-neutral-800 p-4 flex flex-col md:flex-row items-center gap-4">
        {/* Dynamic Search */}
        <div className="relative w-full md:flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search term payers by pupil name, roll ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-950 border-2 border-neutral-800 pl-10 pr-4 py-2 text-xs text-white font-medium outline-none focus:border-amber-400 focus:ring-0 placeholder:text-neutral-600 transition-colors"
          />
        </div>

        {/* Filter select by Grade Class */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={12} className="text-neutral-500 shrink-0" />
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-full md:w-44 bg-neutral-950 border-2 border-neutral-800 px-3 py-2 text-xs text-white font-bold outline-none focus:border-amber-400 transition-colors"
          >
            <option value="ALL">All Cohort Classes</option>
            {studentClasses.map(cls => (
              <option key={cls} value={cls}>{cls} (Cohort Class)</option>
            ))}
          </select>
        </div>

        {/* Clear Filter selectors */}
        <div className="flex items-center gap-1.5 w-full md:w-auto bg-neutral-950 p-0.5 border-2 border-neutral-850">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`text-[10px] font-black uppercase tracking-wider font-mono px-3 py-1.5 cursor-pointer select-none transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-amber-400 text-neutral-950'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            All Schemes
          </button>
          <button
            onClick={() => setStatusFilter('OUTSTANDING')}
            className={`text-[10px] font-black uppercase tracking-wider font-mono px-3 py-1.5 cursor-pointer select-none transition-colors ${
              statusFilter === 'OUTSTANDING'
                ? 'bg-red-950/20 text-red-400 border border-red-500/30'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            Outstanding Balance
          </button>
          <button
            onClick={() => setStatusFilter('PAID')}
            className={`text-[10px] font-black uppercase tracking-wider font-mono px-3 py-1.5 cursor-pointer select-none transition-colors ${
              statusFilter === 'PAID'
                ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/30'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            Fully Cleared
          </button>
        </div>
      </div>

      {/* Directory Table Display */}
      <div className="bg-neutral-900 border-2 border-neutral-800 overflow-hidden">
        {displayedTermPayers.length === 0 ? (
          <div className="p-12 text-center text-neutral-500">
            <AlertCircle size={32} className="mx-auto text-neutral-600 mb-3" />
            <h4 className="text-sm font-black uppercase tracking-wide text-neutral-400">No Term Payers Found</h4>
            <p className="text-xs text-neutral-505 mt-1">
              No registered pupil matches your search or filter configuration. Check spelling or clear filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-950 text-neutral-400 font-mono text-[10px] font-black uppercase border-b border-neutral-800">
                  <th className="px-6 py-3.5">Pupil Profile</th>
                  <th className="px-6 py-3.5">Class / Cate</th>
                  <th className="px-6 py-3.5">Subscribed Fee</th>
                  <th className="px-6 py-3.5">Total Paid</th>
                  <th className="px-6 py-3.5">Balance Due</th>
                  <th className="px-6 py-3.5 text-center">Collection Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 text-xs text-neutral-250 font-medium">
                {displayedTermPayers.map((student) => {
                  const termFee = student.termFee || 350;
                  const studentPayments = payments.filter(p => p.studentId === student.id && !p.isAbsent);
                  const totalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
                  const balanceDue = Math.max(0, termFee - totalPaid);
                  const isSettled = totalPaid >= termFee;
                  const percentPaid = Math.min(100, (totalPaid / termFee) * 100);
                  const isLowProgress = percentPaid < 25;

                  // Soft red hue highlighting for low progress (<25%)
                  // Adaptive for daylight / dark mode
                  const rowClass = isLowProgress
                    ? theme === 'daylight'
                      ? 'bg-red-50/70 hover:bg-red-100/80 transition-all border-l-4 border-l-red-500 group font-bold'
                      : 'bg-red-950/15 hover:bg-red-900/10 transition-all border-l-4 border-l-red-500/80 group font-bold'
                    : 'hover:bg-neutral-850/60 transition-colors border-l-4 border-l-transparent group';

                  return (
                    <tr 
                      key={student.id} 
                      className={rowClass}
                      id={`row-student-${student.id}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {/* Photo avatar or initials placeholder */}
                          {student.photoUrl ? (
                            <img 
                              src={student.photoUrl} 
                              alt={student.name} 
                              className="w-10 h-10 object-cover border border-neutral-700 bg-neutral-800 text-[10px] flex items-center justify-center shrink-0 rounded-xs"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-neutral-950 text-neutral-400 font-black text-sm uppercase flex items-center justify-center border border-neutral-800 font-mono shrink-0 rounded-xs">
                              {student.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`font-extrabold uppercase tracking-tight transition-colors ${
                                isLowProgress 
                                  ? 'text-red-400 group-hover:text-red-300' 
                                  : 'text-white group-hover:text-amber-400'
                              }`}>
                                {student.name}
                              </span>
                              {isLowProgress && (
                                <span className="text-[8px] font-black tracking-wide text-red-500 bg-red-950/30 border border-red-500/35 px-1.5 py-0.5 uppercase shrink-0 font-sans">
                                  CRITICAL &lt; 25%
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-neutral-500 font-mono mt-0.5 font-bold">
                              ID: {student.rollNumber || 'SHC-' + student.id.substring(0, 5).toUpperCase()}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-bold font-sans">
                        <span className="text-white bg-neutral-950 px-2 py-1 border border-neutral-800">
                          {student.class}
                        </span>
                        <span className="text-neutral-500 block text-[10px] mt-1.5 uppercase font-mono">
                          {student.category}
                        </span>
                      </td>

                      <td className="px-6 py-4 font-mono font-black text-white">
                        GHC {termFee.toFixed(2)}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 max-w-[140px]">
                          <div className="flex items-baseline justify-between gap-2 font-mono">
                            <span className="font-black text-emerald-400">GHC {totalPaid.toFixed(2)}</span>
                            <span className="text-[9px] text-neutral-400 font-extrabold bg-neutral-950 px-1 py-0.5 border border-neutral-800 rounded-2xs">
                              {percentPaid.toFixed(0)}%
                            </span>
                          </div>
                          {/* Aesthetic precise track progress meter */}
                          <div className="w-full bg-neutral-950 h-2 border border-neutral-800 rounded-xs overflow-hidden p-[1px]">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${percentPaid}%` }}
                              transition={{ duration: 0.5, ease: 'easeOut' }}
                              className={`h-full rounded-2xs transition-all duration-300 ${
                                isSettled 
                                  ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]' 
                                  : isLowProgress
                                  ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.4)]'
                                  : 'bg-amber-450 bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.4)]'
                              }`}
                            />
                          </div>
                          <span className="text-[8.5px] text-neutral-500 font-mono block uppercase tracking-tight">
                            {isSettled ? 'Fully Settled' : `GHC ${balanceDue.toFixed(2)} Left`}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono text-xs">
                        {isSettled ? (
                          <span className="text-emerald-500 font-black">-</span>
                        ) : (
                          <span className="text-red-500 font-bold block bg-red-950/20 px-2 py-1 border border-red-500/25">
                            GHC {balanceDue.toFixed(2)}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        {isSettled ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-black uppercase text-emerald-400 bg-emerald-950/30 border border-emerald-500/30 px-2.5 py-1">
                            <CheckCircle2 size={10} className="text-emerald-400" />
                            Cleared
                          </span>
                        ) : isLowProgress ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-black uppercase text-red-500 bg-red-950/20 border border-red-500/30 px-2.5 py-1 animate-pulse" title="High risk deficit: Term payments below 25%">
                            <AlertCircle size={10} className="text-red-400" />
                            &lt; 25% Alert
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-black uppercase text-amber-500 bg-amber-955/20 border border-amber-600/30 px-2.5 py-1 animate-pulse">
                            <AlertCircle size={10} />
                            Outstanding
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedStudent(student)}
                            className="bg-neutral-950 text-white hover:text-amber-400 hover:border-amber-400 border border-neutral-800 px-3 py-1.5 text-xs font-black uppercase tracking-tight transition-all cursor-pointer rounded-xs inline-flex items-center gap-1 hover:-translate-y-0.5 active:translate-y-0"
                            title="Detailed payment ledger and check-in dates log"
                          >
                            <span>Ledger Logs</span>
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide Drawer / Modal Backdrop for detailed Pupil Record */}
      <AnimatePresence>
        {selectedStudent && selectedStudentFinances && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Modal glass backdrop background */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStudent(null)}
              className="absolute inset-0 bg-neutral-950/80 backdrop-blur-xs"
              id="ledger-modal-backdrop"
            />

            {/* Slide up dialog viewport wrapper */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-neutral-900 border-4 border-neutral-800 w-full max-w-4xl p-6 md:p-8 rounded shadow-2xl relative z-10 overflow-y-auto max-h-[90vh] grid grid-cols-1 md:grid-cols-12 gap-6"
              id="term-payer-details-panel"
            >
              {/* Close Button top-right corner */}
              <button
                onClick={() => setSelectedStudent(null)}
                className="absolute top-4 right-4 bg-neutral-950 text-neutral-405 hover:text-white hover:border-amber-400 p-2 border border-neutral-800 transition-colors cursor-pointer"
                id="btn-close-ledger-modal"
              >
                <X size={16} />
              </button>

              {/* Column 1: Pupil card details (Span 4) */}
              <div className="md:col-span-5 space-y-6">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wide text-amber-400 bg-amber-400/5 border border-amber-300/25 px-2 py-0.5 rounded-sm inline-block">
                    ★ REGISTRATION RECORD
                  </span>
                  <div className="flex items-center gap-3.5 mt-3">
                    {selectedStudent.photoUrl ? (
                      <img 
                        src={selectedStudent.photoUrl} 
                        alt={selectedStudent.name} 
                        className="w-14 h-14 object-cover border-2 border-neutral-700 bg-neutral-950 text-xs rounded-xs"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-neutral-950 text-neutral-500 font-extrabold text-lg uppercase flex items-center justify-center border border-neutral-800 font-mono shrink-0 rounded-xs">
                        {selectedStudent.name.slice(0,2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-tight leading-none leading-tight">
                        {selectedStudent.name}
                      </h3>
                      <p className="text-xs text-amber-400 font-mono font-black mt-1">
                        ROLL ID: {selectedStudent.rollNumber || 'SHC-' + selectedStudent.id.substring(0, 5).toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Subsystem meta values */}
                <div className="bg-neutral-950 p-4 border-l-4 border-amber-400 space-y-2 font-sans">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500 uppercase font-black uppercase">Academic Grade:</span>
                    <strong className="text-white font-mono">{selectedStudent.class} ({selectedStudent.category})</strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500 uppercase font-black uppercase">Active Clearance:</span>
                    <strong className="text-emerald-400 font-sans uppercase">ALL-ACCESS PASS</strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500 uppercase font-black uppercase">Guardian SMS Contact:</span>
                    <strong className="text-white font-mono">{selectedStudent.guardianPhone || 'NOT CONFIGURED'}</strong>
                  </div>
                </div>

                {/* Quick Payment Collection Form */}
                <div className="border border-neutral-800/80 p-5 bg-neutral-950/45 space-y-4">
                  <div className="flex items-center gap-2 border-b border-neutral-850 pb-2">
                    <CreditCard size={14} className="text-amber-400" />
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-white font-mono">
                      Log Custom Scheme Payment
                    </h4>
                  </div>

                  <form onSubmit={handleCollectPayment} className="space-y-3 font-sans" id="scheme-collection-form">
                    <div>
                      <label className="block text-[10px] text-neutral-500 uppercase font-black mb-1">
                        Immediate Collection Amount (GHC)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-black text-neutral-500">
                          GHC
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="Amount e.g. 50.00"
                          value={collectAmount}
                          onChange={(e) => setCollectAmount(e.target.value)}
                          className="w-full bg-neutral-950 border-2 border-neutral-800 pl-12 pr-4 py-2.5 text-xs text-white font-mono outline-none focus:border-amber-400 focus:ring-0 transition-colors"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black font-mono tracking-wider uppercase text-[10px] py-3.5 transition-all cursor-pointer flex items-center justify-center gap-1 hover:-translate-y-0.5 active:translate-y-0"
                    >
                      <Plus size={11} className="stroke-[3.5]" />
                      <span>Log Collection Entry</span>
                    </button>

                    {/* Status Feedback alerts inside drawer info */}
                    <AnimatePresence>
                      {formSuccess && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="p-3 border border-emerald-400/30 bg-emerald-950/20 text-emerald-400 text-[10px] font-bold uppercase flex items-center justify-center gap-1.5"
                        >
                          <Check size={11} className="stroke-[3]" />
                          <span>{formSuccess}</span>
                        </motion.div>
                      )}
                      
                      {formError && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="p-3 border border-red-500/30 bg-red-950/20 text-red-400 text-[10px] font-bold uppercase flex items-center justify-center gap-1.5"
                        >
                          <AlertCircle size={11} />
                          <span>{formError}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </form>
                </div>
              </div>

              {/* Column 2: Financial records list & receipt ledger (Span 7) */}
              <div className="md:col-span-7 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wide text-neutral-500 block">
                    ★ TRANSACTION BALANCE SHEET
                  </span>

                  {/* Summary row */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 mt-3 mb-6">
                    <div className="bg-neutral-950 border border-neutral-800 p-3.5">
                      <span className="text-[9px] text-neutral-500 uppercase font-black block">Fixed quota</span>
                      <strong className="text-white text-base font-mono font-black mt-1 block">
                        GHC {selectedStudentFinances.studentFee.toFixed(2)}
                      </strong>
                    </div>
                    <div className="bg-neutral-950 border border-neutral-800 p-3.5">
                      <span className="text-[9px] text-emerald-400 uppercase font-bold block">Amount Cleared</span>
                      <strong className="text-emerald-400 text-base font-mono font-black mt-1 block">
                        GHC {selectedStudentFinances.totalPaid.toFixed(2)}
                      </strong>
                    </div>
                    <div className="bg-neutral-950 border border-neutral-800 p-3.5 col-span-2 md:col-span-1">
                      <span className="text-[9px] text-red-400 uppercase font-black block">Remaining Balance</span>
                      <strong className={`${selectedStudentFinances.isCompleted ? 'text-emerald-500' : 'text-red-550'} text-base font-mono font-black mt-1 block`}>
                        GHC {selectedStudentFinances.balanceDue.toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  {/* Balance progression progress bar */}
                  <div className="mb-6 bg-neutral-950 p-4 border border-neutral-850">
                    <div className="flex items-center justify-between text-[10px] text-neutral-400 font-bold uppercase mb-2 font-mono">
                      <span>Ledger Clearance Rate</span>
                      <span className={selectedStudentFinances.isCompleted ? 'text-emerald-400 font-extrabold' : 'text-amber-400 font-extrabold'}>
                        {selectedStudentFinances.percentDone.toFixed(0)}% SETTLED
                      </span>
                    </div>
                    <div className="w-full bg-neutral-900 h-2.5 rounded-full overflow-hidden border border-neutral-800">
                      <div 
                        className={`h-full ${selectedStudentFinances.isCompleted ? 'bg-emerald-500' : 'bg-amber-400'}`} 
                        style={{ width: `${selectedStudentFinances.percentDone}%` }}
                      />
                    </div>
                  </div>

                  {/* Payment Docket history table */}
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-neutral-400 border-b border-neutral-800 pb-2 mb-3 font-mono">
                    🧾 ITEMISED RECEIPT LOGS ({selectedStudentFinances.paidPayments.length} entries)
                  </h4>

                  {selectedStudentFinances.paidPayments.length === 0 ? (
                    <div className="p-8 text-center text-neutral-500 bg-neutral-950 border border-neutral-850">
                      <AlertCircle size={20} className="mx-auto text-neutral-600 mb-2" />
                      <p className="text-[11px] font-bold uppercase text-neutral-405 leading-normal">
                        No financial transactions on file.
                      </p>
                      <p className="text-[9px] text-neutral-505 mt-0.5 leading-relaxed">
                        Use the left panel to register the student's installments or school payments.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[18rem] overflow-y-auto">
                      {selectedStudentFinances.paidPayments.map((p, idx) => (
                        <div 
                          key={p.id} 
                          className="bg-neutral-950 border border-neutral-850 p-3 flex items-center justify-between font-mono text-[11px]"
                          id={`payment-log-${p.id}`}
                        >
                          <div>
                            <span className="text-[8px] font-bold uppercase tracking-wide bg-neutral-900 text-neutral-400 px-1.5 py-0.5 border border-neutral-800 inline-block mb-1.5">
                              ENTRY {idx + 1}
                            </span>
                            <div className="text-[9px] text-neutral-500 uppercase font-black">
                              LOGGED ON: {p.date} • {new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {p.notes && (
                              <div className="text-[10px] text-neutral-300 font-sans font-bold mt-1 max-w-[17rem] md:max-w-md break-words italic">
                                "{p.notes}"
                              </div>
                            )}
                          </div>
                          
                          <div className="text-right">
                            <div className="text-emerald-400 font-black text-sm">
                              GHC {p.amount.toFixed(2)}
                            </div>
                            <span className="text-[8.5px] text-neutral-500 font-sans block mt-0.5 uppercase">
                              By {p.collectedBy}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-neutral-800 pt-5 mt-6 flex justify-end">
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="bg-neutral-950 hover:bg-neutral-850 text-white hover:text-amber-400 border-2 border-neutral-800 hover:border-amber-400 px-5 py-2.5 text-xs font-black uppercase tracking-tight transition-all cursor-pointer rounded-xs shadow"
                  >
                    Done Viewing
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
