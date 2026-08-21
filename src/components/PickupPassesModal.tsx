/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Student, StudentClass } from '../types';
import { getRosterWithPickupCodes, getSchoolWeekInfo } from '../utils/pickupCode';
import { SchoolLogo } from './SchoolLogo';
import { ShieldCheck, Printer, Search, X, Check, Lock, Calendar, MessageSquare, Users, Table, LayoutGrid, Scissors, FileText, CheckCircle2, Award, Phone, UserCheck } from 'lucide-react';

interface PickupPassesModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  initialClass?: StudentClass;
  systemSettings?: any;
}

export const PickupPassesModal: React.FC<PickupPassesModalProps> = ({
  isOpen,
  onClose,
  students,
  initialClass,
  systemSettings
}) => {
  const [selectedClass, setSelectedClass] = useState<StudentClass | 'ALL'>(initialClass || 'ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedShare, setCopiedShare] = useState(false);
  const [viewMode, setViewMode] = useState<'slips' | 'table' | 'grid'>('slips');
  const [printSingleStudentId, setPrintSingleStudentId] = useState<string | null>(null);

  const weekInfo = useMemo(() => getSchoolWeekInfo(), []);

  // Compute roster with deterministic weekly pickup codes
  const rosterWithCodes = useMemo(() => {
    return getRosterWithPickupCodes(students);
  }, [students]);

  // Filter roster by class and search
  const filteredRoster = useMemo(() => {
    let list = rosterWithCodes.filter(s => s.active !== false);

    if (selectedClass !== 'ALL') {
      list = list.filter(s => s.class === selectedClass);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const qNormalized = q.replace(/[-_ ]/g, '');

      list = list.filter(s => {
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesRoll = (s.rollNumber || '').toLowerCase().includes(q);
        const matchesCode = s.pickupCode.toLowerCase().includes(q) || 
                            s.pickupCode.replace(/[-_ ]/g, '').toLowerCase().includes(qNormalized);
        const matchesPhone = (s.guardianPhone || '').includes(q);

        return matchesName || matchesRoll || matchesCode || matchesPhone;
      });
    }

    return list.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [rosterWithCodes, selectedClass, searchQuery]);

  // Roster filtered for printing (single student if clicked, or full list)
  const printRoster = useMemo(() => {
    if (printSingleStudentId) {
      return filteredRoster.filter(s => s.id === printSingleStudentId);
    }
    return filteredRoster;
  }, [filteredRoster, printSingleStudentId]);

  if (!isOpen) return null;

  const schoolName = systemSettings?.schoolName || 'St. Theresa Basic School';

  const handleCopyWhatsAppList = () => {
    const classLabel = selectedClass === 'ALL' ? 'All Classes' : `Class ${selectedClass}`;
    let text = `🏫 *${schoolName.toUpperCase()}*\n`;
    text += `🔒 *OFFICIAL WEEKLY PUPIL PICKUP CODES*\n`;
    text += `📅 *Active Week:* ${weekInfo.formattedRange}\n`;
    text += `👥 *Cohort:* ${classLabel}\n`;
    text += `⚠️ *Notice:* Codes expire on Friday at 5:00 PM and regenerate every Monday.\n`;
    text += `─────────────\n`;

    filteredRoster.forEach((s, idx) => {
      text += `${idx + 1}. *${s.name}* (${s.class} - ${s.rollNumber || 'N/A'})\n`;
      text += `   🔑 Pickup Code: *${s.pickupCode}*\n`;
      if (s.guardianPhone) text += `   📞 Guardian: ${s.guardianPhone}\n`;
      text += `\n`;
    });

    text += `─────────────\n`;
    text += `_Guardians must present or speak this official code to the class teacher/gate security officer at dismissal._`;

    navigator.clipboard.writeText(text);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const handleTriggerPrint = (studentId?: string) => {
    if (studentId) {
      setPrintSingleStudentId(studentId);
    } else {
      setPrintSingleStudentId(null);
    }
    setTimeout(() => {
      window.print();
    }, 50);
  };

  const classesList: StudentClass[] = ['Nursery', 'KG1', 'KG2', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9'];

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Strict High-Contrast Print Styles preventing page break cuts */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }

          /* Hide default body elements except printable content */
          body * {
            visibility: hidden !important;
          }

          body > div,
          .fixed,
          .relative,
          .flex,
          .max-h-\[92vh\],
          div[class*="fixed"],
          div[class*="backdrop-blur"] {
            position: static !important;
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            max-height: none !important;
            height: auto !important;
            min-height: 0 !important;
            width: 100% !important;
            overflow: visible !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            transform: none !important;
          }

          .no-print,
          .no-print * {
            display: none !important;
            height: 0 !important;
            width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
          }

          #printable-pickup-passes,
          #printable-pickup-passes * {
            visibility: visible !important;
          }

          #printable-pickup-passes {
            display: block !important;
            position: relative !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            color: #000000 !important;
            background: #ffffff !important;
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
          }

          .print-avoid-break,
          tr,
          .pass-card,
          .pass-slip {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          thead {
            display: table-header-group !important;
          }

          table {
            border-collapse: collapse !important;
            width: 100% !important;
            margin-top: 2mm !important;
          }

          th, td {
            border: 1.5px solid #000000 !important;
            color: #000000 !important;
            padding: 6px 10px !important;
          }
        }
      `}</style>

      <div className="bg-neutral-900 border-4 border-amber-400 w-full max-w-6xl max-h-[94vh] flex flex-col shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative my-auto animate-in fade-in duration-150">
        
        {/* Header bar (no-print) */}
        <div className="no-print p-4 sm:p-5 border-b-2 border-neutral-800 bg-neutral-950 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400 text-neutral-950 font-black shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <ShieldCheck size={26} />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-black uppercase italic text-white tracking-tight flex flex-wrap items-center gap-2">
                Pupil Weekly Security Passes
                <span className="bg-amber-400/20 text-amber-300 text-[10px] font-mono px-2 py-0.5 border border-amber-400/50 not-italic uppercase font-black tracking-wider">
                  Official Parent Printables
                </span>
              </h2>
              <p className="text-xs text-neutral-400 font-bold flex items-center gap-2 mt-0.5">
                <Calendar size={13} className="text-amber-400 shrink-0" />
                <span>Active School Week: <strong className="text-white">{weekInfo.formattedRange}</strong></span>
                {weekInfo.isExpired && (
                  <span className="text-red-400 font-mono text-[10px] bg-red-950 px-1.5 py-0.5 border border-red-800 font-black">
                    Expired (Weekend)
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {printSingleStudentId && (
              <button
                onClick={() => setPrintSingleStudentId(null)}
                className="bg-neutral-800 hover:bg-neutral-700 text-amber-300 px-3 py-2 text-xs font-mono font-black uppercase tracking-wider flex items-center gap-1.5 border border-neutral-700"
              >
                <span>Reset Single Filter</span>
              </button>
            )}

            <button
              onClick={handleCopyWhatsAppList}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 text-xs font-mono font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              title="Copy WhatsApp formatted list to send to class teachers or parent groups"
            >
              {copiedShare ? <Check size={14} /> : <MessageSquare size={14} />}
              <span>{copiedShare ? 'Copied to Clipboard!' : 'Share WhatsApp'}</span>
            </button>

            <button
              onClick={() => handleTriggerPrint()}
              className="bg-amber-400 hover:bg-amber-300 text-neutral-950 px-4 py-2 text-xs font-mono font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border border-amber-300"
              title="Print All Pass Slips"
            >
              <Printer size={15} />
              <span>Print All Slips ({filteredRoster.length})</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Security Policy Explanation (no-print) */}
        <div className="no-print bg-amber-950/40 border-b-2 border-amber-800/80 p-3 px-4 flex items-start gap-3 text-amber-200 text-xs font-mono leading-relaxed">
          <Lock size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-amber-400 uppercase tracking-wide block font-black">Official Security Mandate & Parent Distribution:</strong>
            Each registered pupil receives a unique 4-digit weekly pickup pass code (<code className="bg-black/60 px-1 text-amber-300">PK-XXXX</code>). These official wide slips feature school authorization seals, class teacher signature fields, and parent security terms. Print and hand them out to parents or send via WhatsApp.
          </div>
        </div>

        {/* Controls: Class Filters & Layout View Selector (no-print) */}
        <div className="no-print p-4 bg-neutral-900 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3">
          {/* Class Filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 scrollbar-thin">
            <button
              onClick={() => { setSelectedClass('ALL'); setPrintSingleStudentId(null); }}
              className={`px-3 py-1.5 text-xs font-mono font-black uppercase tracking-wider border transition-colors cursor-pointer shrink-0 ${
                selectedClass === 'ALL'
                  ? 'bg-amber-400 text-neutral-950 border-amber-400 font-black'
                  : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:text-white'
              }`}
            >
              All Classes ({rosterWithCodes.length})
            </button>
            {classesList.map(cls => {
              const count = rosterWithCodes.filter(s => s.class === cls).length;
              if (count === 0) return null;
              return (
                <button
                  key={cls}
                  onClick={() => { setSelectedClass(cls); setPrintSingleStudentId(null); }}
                  className={`px-3 py-1.5 text-xs font-mono font-black uppercase tracking-wider border transition-colors cursor-pointer shrink-0 ${
                    selectedClass === cls
                      ? 'bg-amber-400 text-neutral-950 border-amber-400 font-black'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:text-white'
                  }`}
                >
                  {cls} ({count})
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-neutral-950 border border-neutral-800 p-0.5 font-mono text-[11px] font-bold">
              <button
                onClick={() => setViewMode('slips')}
                className={`px-3 py-1.5 flex items-center gap-1.5 uppercase tracking-wider transition-colors cursor-pointer ${
                  viewMode === 'slips' ? 'bg-amber-400 text-neutral-950 font-black' : 'text-neutral-400 hover:text-white'
                }`}
                title="Wide Official Parent Pass Slips (Wide 2-up per page with official seals & signatures)"
              >
                <Scissors size={14} />
                <span>Parent Slips (Wide)</span>
              </button>

              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 flex items-center gap-1.5 uppercase tracking-wider transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-amber-400 text-neutral-950 font-black' : 'text-neutral-400 hover:text-white'
                }`}
                title="Tabular Gate Roster (Full Class Roster for Gate Officers)"
              >
                <Table size={14} />
                <span>Gate Roster</span>
              </button>

              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 flex items-center gap-1.5 uppercase tracking-wider transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-amber-400 text-neutral-950 font-black' : 'text-neutral-400 hover:text-white'
                }`}
                title="Security Badges Grid"
              >
                <LayoutGrid size={14} />
                <span>Badges Grid</span>
              </button>
            </div>

            {/* Search Box */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={14} className="absolute left-3 top-3 text-neutral-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search code (PK-XXXX), pupil, roll..."
                className="w-full bg-neutral-950 border border-neutral-800 py-2 pl-9 pr-3 text-xs font-mono font-bold text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-neutral-500 hover:text-white text-xs font-bold"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div id="printable-pickup-passes" className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 bg-neutral-900 print:bg-white print:text-black">
          
          {/* Official Printable Banner Header */}
          <div className="hidden print:block space-y-2 text-center pb-4 border-b-2 border-black">
            <div className="flex items-center justify-center gap-3">
              <SchoolLogo logoUrl={systemSettings?.schoolLogoUrl} size={52} className="border border-black" />
              <div className="text-left">
                <h1 className="text-2xl font-extrabold uppercase tracking-tight text-black">{schoolName}</h1>
                <p className="text-xs font-bold text-gray-900 uppercase tracking-widest">OFFICIAL PUPIL DISMISSAL & WEEKLY PICKUP SECURITY PASSES</p>
              </div>
            </div>
            <div className="flex justify-between items-center text-xs font-mono font-bold pt-2 border-t border-black">
              <span><strong>CLASS COHORT:</strong> {selectedClass === 'ALL' ? 'All Classes' : `Class ${selectedClass}`}</span>
              <span><strong>VALID WEEK:</strong> {weekInfo.formattedRange}</span>
              <span><strong>ISSUED BY:</strong> School Administration</span>
            </div>
          </div>

          {filteredRoster.length === 0 ? (
            <div className="py-12 text-center space-y-3 bg-neutral-950 border-2 border-dashed border-neutral-800 p-6 no-print">
              <Users size={32} className="mx-auto text-neutral-600" />
              <p className="text-xs font-mono text-neutral-400 font-bold uppercase tracking-wider">
                No pupil records found matching the current class filter or search query.
              </p>
            </div>
          ) : viewMode === 'slips' ? (
            /* WIDE OFFICIAL PARENT SECURITY PASS SLIPS (Full-width / 2-up per page with official seals & signature lines) */
            <div className="space-y-6 print:space-y-6">
              {printRoster.map((s, idx) => (
                <div
                  key={s.id}
                  className="pass-slip bg-neutral-950 border-2 border-amber-400 p-5 relative space-y-4 shadow-lg print:bg-white print:text-black print:border-2 print:border-black print-avoid-break"
                >
                  {/* Top Cut Line Indicator */}
                  <div className="no-print flex items-center justify-between text-[10px] font-mono font-bold text-neutral-500 border-b border-neutral-800 pb-2">
                    <span className="flex items-center gap-1">
                      <Scissors size={12} className="text-amber-400" />
                      OFFICIAL PARENT SLIP #{idx + 1}
                    </span>
                    <button
                      onClick={() => handleTriggerPrint(s.id)}
                      className="text-amber-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <Printer size={12} /> Print Only This Slip
                    </button>
                  </div>

                  {/* Official Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-neutral-800 pb-3 print:border-black">
                    <div className="flex items-center gap-3">
                      <SchoolLogo logoUrl={systemSettings?.schoolLogoUrl} size={42} className="border border-neutral-700 print:border-black" />
                      <div>
                        <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-white print:text-black">
                          {schoolName}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono font-black uppercase text-amber-400 tracking-wider bg-amber-400/10 px-1.5 py-0.5 border border-amber-400/30 print:bg-black print:text-white print:border-black">
                            OFFICIAL DISMISSAL SECURITY PASS
                          </span>
                          <span className="text-[10px] font-mono font-bold text-neutral-400 print:text-gray-700">
                            SERIAL: {s.pickupCodeWeekId}-{s.rollNumber || s.id.slice(-4)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Official Stamp emblem */}
                    <div className="border-2 border-dashed border-amber-400/60 print:border-black px-3 py-1.5 text-center bg-amber-400/5 print:bg-gray-100 shrink-0">
                      <div className="text-[9px] font-mono font-black text-amber-400 uppercase tracking-widest print:text-black flex items-center justify-center gap-1">
                        <Award size={12} /> VERIFIED PASS
                      </div>
                      <div className="text-[8px] font-mono text-neutral-300 print:text-black font-bold">
                        {weekInfo.formattedRange}
                      </div>
                    </div>
                  </div>

                  {/* Main Grid: Pupil Info & Huge Code Token */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    
                    {/* Left: Pupil details */}
                    <div className="md:col-span-7 space-y-2">
                      <div className="bg-neutral-900 print:bg-gray-100 p-3 border border-neutral-800 print:border-black space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold text-neutral-400 print:text-gray-700 uppercase">PUPIL FULL NAME:</span>
                          <span className="text-xs font-mono font-black text-amber-400 print:text-black uppercase">CLASS {s.class}</span>
                        </div>
                        <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight print:text-black">
                          {s.name}
                        </h2>
                        <div className="flex flex-wrap gap-x-4 text-xs font-mono text-neutral-300 print:text-black pt-1 border-t border-neutral-800 print:border-gray-300">
                          <span>REG / ROLL ID: <strong className="text-white print:text-black">{s.rollNumber || 'N/A'}</strong></span>
                          <span>GENDER: <strong className="text-white print:text-black">{s.gender || 'Pupil'}</strong></span>
                        </div>
                      </div>

                      <div className="text-xs font-mono text-neutral-300 print:text-black space-y-0.5 px-1">
                        <div>
                          <strong className="text-neutral-400 print:text-black">GUARDIAN CONTACT:</strong>{' '}
                          {s.guardianPhone ? (
                            <span className="font-bold text-white print:text-black">{s.guardianPhone}</span>
                          ) : (
                            <span className="italic text-neutral-500">Unrecorded</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Prominent Official Security Code Box */}
                    <div className="md:col-span-5 bg-amber-400 text-neutral-950 p-4 text-center font-mono font-black border-4 border-amber-300 print:bg-black print:text-white print:border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <div className="text-[10px] font-black tracking-widest uppercase text-neutral-900 print:text-gray-300 flex items-center justify-center gap-1">
                        <Lock size={13} /> WEEKLY SECURITY CODE
                      </div>
                      <div className="text-3xl sm:text-4xl font-black tracking-widest my-1.5 font-mono drop-shadow-sm">
                        {s.pickupCode}
                      </div>
                      <div className="text-[9px] uppercase tracking-wider font-bold bg-neutral-950 text-amber-300 px-2 py-0.5 mt-1 border border-amber-400/50 print:bg-white print:text-black print:border-black">
                        EXPIRES: FRIDAY 5:00 PM
                      </div>
                    </div>
                  </div>

                  {/* Official Terms & Instructions Box */}
                  <div className="bg-neutral-900/80 print:bg-gray-100 border border-neutral-800 print:border-black p-2.5 text-[10px] font-mono leading-relaxed text-neutral-300 print:text-black space-y-1">
                    <strong className="text-amber-400 print:text-black uppercase font-black block">PARENTS & GUARDIANS DISMISSAL INSTRUCTIONS:</strong>
                    <ul className="list-disc list-inside space-y-0.5 text-neutral-400 print:text-black">
                      <li>Guardians MUST present this printed slip or state the <strong>{s.pickupCode}</strong> code to the Class Teacher or Gate Security before pupil release.</li>
                      <li>This code regenerates automatically every Monday morning. Do not share pass codes with unauthorized third parties.</li>
                    </ul>
                  </div>

                  {/* Signatures & Official Validation Footer */}
                  <div className="pt-2 border-t border-neutral-800 print:border-black grid grid-cols-2 gap-4 text-[10px] font-mono">
                    <div className="space-y-4">
                      <div className="border-b border-neutral-700 print:border-black pb-1">
                        <span className="text-neutral-500 print:text-gray-600 block text-[9px]">CLASS TEACHER SIGNATURE & DATE:</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="border-b border-neutral-700 print:border-black pb-1 text-right">
                        <span className="text-neutral-500 print:text-gray-600 block text-[9px]">HEADMASTER / SECURITY SEAL & SIGN:</span>
                      </div>
                    </div>
                  </div>

                  {/* Cut Boundary Marker */}
                  <div className="pt-2 text-[9px] font-mono text-neutral-600 print:text-black flex justify-between items-center border-t border-dashed border-neutral-800 print:border-black">
                    <span className="flex items-center gap-1">
                      <Scissors size={11} /> ✂ Cut along line & issue official slip to parent
                    </span>
                    <span>Valid Week: {weekInfo.formattedRange}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : viewMode === 'table' ? (
            /* TABULAR ROSTER LAYOUT (Clean, Professional Print for Gate Officers) */
            <div className="overflow-x-auto border-2 border-neutral-800 print:border-black">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-neutral-950 text-amber-400 border-b-2 border-neutral-800 print:bg-gray-200 print:text-black print:border-black">
                  <tr>
                    <th className="p-2.5 font-black uppercase w-10 text-center">#</th>
                    <th className="p-2.5 font-black uppercase">Pupil Name</th>
                    <th className="p-2.5 font-black uppercase w-20">Class</th>
                    <th className="p-2.5 font-black uppercase w-28">Reg / Roll ID</th>
                    <th className="p-2.5 font-black uppercase text-center bg-amber-400/10 print:bg-gray-300 w-36">
                      🔒 Weekly Code
                    </th>
                    <th className="p-2.5 font-black uppercase">Guardian Contact</th>
                    <th className="p-2.5 font-black uppercase text-center w-28 no-print">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 print:divide-black">
                  {filteredRoster.map((s, idx) => (
                    <tr 
                      key={s.id} 
                      className="hover:bg-neutral-800/50 transition-colors print:bg-white print:text-black print-avoid-break"
                    >
                      <td className="p-2.5 text-center font-bold text-neutral-400 print:text-black">{idx + 1}</td>
                      <td className="p-2.5 font-bold text-white print:text-black uppercase">
                        {s.name}
                      </td>
                      <td className="p-2.5 font-bold text-amber-400 print:text-black">{s.class}</td>
                      <td className="p-2.5 text-neutral-300 print:text-black font-bold">{s.rollNumber || 'N/A'}</td>
                      <td className="p-2.5 text-center font-black text-amber-400 text-base tracking-widest bg-amber-400/5 print:bg-gray-100 print:text-black">
                        {s.pickupCode}
                      </td>
                      <td className="p-2.5 text-neutral-300 print:text-black">
                        {s.guardianPhone || <span className="text-neutral-600 print:text-gray-400 italic">Unrecorded</span>}
                      </td>
                      <td className="p-2.5 text-center no-print">
                        <button
                          onClick={() => { setViewMode('slips'); handleTriggerPrint(s.id); }}
                          className="bg-amber-400 hover:bg-amber-300 text-neutral-950 px-2 py-1 text-[10px] font-black uppercase transition-colors cursor-pointer"
                          title="Print individual slip"
                        >
                          Print Slip
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* VISUAL BADGE CARDS GRID */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-2 print:gap-3">
              {filteredRoster.map((s) => (
                <div
                  key={s.id}
                  className="pass-card bg-neutral-950 border-2 border-neutral-800 p-4 space-y-3 relative group hover:border-amber-400 transition-all print:border-black print:bg-white print:text-black print-avoid-break shadow-md"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-neutral-800 pb-2.5 print:border-gray-300">
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block print:text-gray-800">
                        CLASS {s.class} • ROLL: {s.rollNumber || 'N/A'}
                      </span>
                      <h3 className="text-base font-black text-white uppercase tracking-tight truncate print:text-black">
                        {s.name}
                      </h3>
                    </div>
                    <span className="shrink-0 bg-neutral-900 border border-neutral-800 px-2 py-0.5 text-[9px] font-mono font-bold text-neutral-400 uppercase print:bg-gray-100 print:text-black print:border-gray-400">
                      {s.gender || 'Pupil'}
                    </span>
                  </div>

                  {/* High Visibility Pickup Security Pass Badge */}
                  <div className="bg-amber-400/10 border-2 border-amber-400 p-3 text-center space-y-1 print:bg-gray-100 print:border-black">
                    <span className="text-[9px] font-mono font-black text-amber-300 uppercase tracking-widest block print:text-black">
                      🔒 WEEKLY PICKUP PASS CODE
                    </span>
                    <div className="text-3xl font-black font-mono tracking-widest text-amber-400 print:text-black">
                      {s.pickupCode}
                    </div>
                    <span className="text-[8px] font-mono text-neutral-400 block print:text-gray-700">
                      Valid Week of {weekInfo.formattedRange}
                    </span>
                  </div>

                  <div className="text-[10px] font-mono text-neutral-400 space-y-0.5 print:text-gray-800">
                    <div>
                      <strong className="text-neutral-300 print:text-black">Guardian:</strong>{' '}
                      {s.guardianPhone ? (
                        <span className="text-amber-400 font-bold print:text-black">{s.guardianPhone}</span>
                      ) : (
                        <span className="italic text-neutral-600 print:text-gray-500">Not recorded</span>
                      )}
                    </div>
                  </div>

                  <div className="no-print pt-1 flex justify-end">
                    <button
                      onClick={() => { setViewMode('slips'); handleTriggerPrint(s.id); }}
                      className="text-[10px] font-mono font-bold text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Printer size={12} /> Print Official Slip
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Printable Footer Notice */}
          <div className="hidden print:block text-center pt-4 border-t-2 border-black text-[10px] font-mono text-gray-800 space-y-1">
            <p><strong>SECURITY MANDATE:</strong> Gate Officers & Class Teachers MUST verify the guardian's pickup pass code prior to releasing pupils at closing.</p>
            <p>Generated by {schoolName} Automated Security System • Printed on {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Modal Footer Controls (no-print) */}
        <div className="no-print p-4 bg-neutral-950 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-mono text-neutral-400 font-bold">
            Showing <strong className="text-amber-400">{filteredRoster.length}</strong> pupil pickup pass records ({selectedClass === 'ALL' ? 'All Classes' : selectedClass})
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTriggerPrint()}
              className="bg-amber-400 hover:bg-amber-300 text-neutral-950 px-4 py-2 text-xs font-mono font-black uppercase tracking-wider cursor-pointer border border-amber-300 flex items-center gap-1.5"
            >
              <Printer size={14} />
              <span>Print Slips</span>
            </button>
            <button
              onClick={onClose}
              className="bg-neutral-800 hover:bg-neutral-700 text-white px-5 py-2 text-xs font-mono font-black uppercase tracking-wider cursor-pointer border border-neutral-700"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

