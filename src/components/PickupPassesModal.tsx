/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Student, StudentClass } from '../types';
import { getRosterWithPickupCodes, getSchoolWeekInfo } from '../utils/pickupCode';
import { SchoolLogo } from './SchoolLogo';
import { ShieldCheck, Printer, Search, X, Check, Lock, Calendar, MessageSquare, Users, Table, LayoutGrid, Scissors } from 'lucide-react';

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
  const [viewMode, setViewMode] = useState<'table' | 'slips' | 'grid'>('table');

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

  if (!isOpen) return null;

  const schoolName = systemSettings?.schoolName || 'St. Theresa Basic School';

  const handleCopyWhatsAppList = () => {
    const classLabel = selectedClass === 'ALL' ? 'All Classes' : `Class ${selectedClass}`;
    let text = `🏫 *${schoolName.toUpperCase()}*\n`;
    text += `🔒 *WEEKLY PUPIL PICKUP CODES*\n`;
    text += `📅 *Active Week:* ${weekInfo.formattedRange}\n`;
    text += `👥 *Cohort:* ${classLabel}\n`;
    text += `⚠️ *Note:* Codes expire on Friday and regenerate on Monday.\n`;
    text += `─────────────\n`;

    filteredRoster.forEach((s, idx) => {
      text += `${idx + 1}. *${s.name}* (${s.class} - ${s.rollNumber || 'N/A'})\n`;
      text += `   🔑 Pickup Code: *${s.pickupCode}*\n`;
      if (s.guardianPhone) text += `   📞 Guardian: ${s.guardianPhone}\n`;
      text += `\n`;
    });

    text += `─────────────\n`;
    text += `_Guardians must present or speak this code to the class teacher/security guard at dismissal._`;

    navigator.clipboard.writeText(text);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const handleTriggerPrint = () => {
    window.print();
  };

  const classesList: StudentClass[] = ['Nursery', 'KG1', 'KG2', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9'];

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Strict Print CSS preventing top offset and row/card splits across pages */}
      <style>{`
        @media print {
          @page {
            size: portrait;
            margin: 10mm;
          }

          /* Hide default body elements except printable content */
          body * {
            visibility: hidden !important;
          }

          /* Reset fixed modal overlays and wrappers so they don't offset or constrain printing */
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

          /* Hide no-print controls completely from DOM flow so they take 0 height */
          .no-print,
          .no-print * {
            display: none !important;
            height: 0 !important;
            width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
          }

          /* Printable container starts at top of page document flow */
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

          /* Prevent Table Rows, Badge Cards, or Cut Slips from breaking mid-item across pages */
          .print-avoid-break,
          tr,
          .pass-card,
          .pass-slip {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          /* Force Repeat Table Header on every printed page */
          thead {
            display: table-header-group !important;
          }

          /* High contrast clean printing */
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            margin-top: 2mm !important;
          }

          th, td {
            border: 1px solid #000000 !important;
            color: #000000 !important;
            padding: 5px 8px !important;
          }
        }
      `}</style>

      <div className="bg-neutral-900 border-4 border-amber-400 w-full max-w-5xl max-h-[92vh] flex flex-col shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative my-auto animate-in fade-in duration-150">
        
        {/* Header bar (no-print) */}
        <div className="no-print p-4 sm:p-5 border-b-2 border-neutral-800 bg-neutral-950 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-400 text-neutral-950 font-black shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase italic text-white tracking-tight flex items-center gap-2">
                Pupil Pickup Security Passes
                <span className="bg-amber-400/20 text-amber-400 text-[10px] font-mono px-2 py-0.5 border border-amber-400/40 not-italic uppercase font-bold">
                  Weekly Auto-Rotate
                </span>
              </h2>
              <p className="text-xs text-neutral-400 font-bold flex items-center gap-2 mt-0.5">
                <Calendar size={13} className="text-amber-400" />
                <span>Active Week: <strong className="text-white">{weekInfo.formattedRange}</strong></span>
                {weekInfo.isExpired && (
                  <span className="text-red-400 font-mono text-[10px] bg-red-950 px-1.5 py-0.5 border border-red-800 font-black">
                    Weekend Expired
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyWhatsAppList}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 text-xs font-mono font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              title="Copy WhatsApp formatted list to send to class teachers or parents"
            >
              {copiedShare ? <Check size={14} /> : <MessageSquare size={14} />}
              <span>{copiedShare ? 'Copied WhatsApp List!' : 'Share WhatsApp'}</span>
            </button>

            <button
              onClick={handleTriggerPrint}
              className="bg-amber-400 hover:bg-amber-300 text-neutral-950 px-3.5 py-2 text-xs font-mono font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              title="Print Sheet"
            >
              <Printer size={14} />
              <span>Print Sheet</span>
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
            <strong className="text-amber-400 uppercase tracking-wide block font-black">Security Policy & Expiration Rules:</strong>
            Each registered pupil receives a unique 4-digit pickup pass code (<code className="bg-black/60 px-1 text-amber-300">PK-XXXX</code>). This code regenerates every Monday and expires on Friday evening. Guardians picking up pupils at dismissal must speak or present this code to class teachers or gate security.
          </div>
        </div>

        {/* Controls: Class Filters & Layout View Selector (no-print) */}
        <div className="no-print p-4 bg-neutral-900 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3">
          {/* Class Filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 scrollbar-thin">
            <button
              onClick={() => setSelectedClass('ALL')}
              className={`px-3 py-1.5 text-xs font-mono font-black uppercase tracking-wider border transition-colors cursor-pointer shrink-0 ${
                selectedClass === 'ALL'
                  ? 'bg-amber-400 text-neutral-950 border-amber-400'
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
                  onClick={() => setSelectedClass(cls)}
                  className={`px-3 py-1.5 text-xs font-mono font-black uppercase tracking-wider border transition-colors cursor-pointer shrink-0 ${
                    selectedClass === cls
                      ? 'bg-amber-400 text-neutral-950 border-amber-400'
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
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1.5 flex items-center gap-1 uppercase tracking-wider transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-amber-400 text-neutral-950 font-black' : 'text-neutral-400 hover:text-white'
                }`}
                title="Tabular Roster Sheet (Best for Official Printing without page breaks)"
              >
                <Table size={13} />
                <span>Class Table</span>
              </button>

              <button
                onClick={() => setViewMode('slips')}
                className={`px-2.5 py-1.5 flex items-center gap-1 uppercase tracking-wider transition-colors cursor-pointer ${
                  viewMode === 'slips' ? 'bg-amber-400 text-neutral-950 font-black' : 'text-neutral-400 hover:text-white'
                }`}
                title="Cut-out Parent Slips (6 per page with cut lines)"
              >
                <Scissors size={13} />
                <span>Parent Slips</span>
              </button>

              <button
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1.5 flex items-center gap-1 uppercase tracking-wider transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-amber-400 text-neutral-950 font-black' : 'text-neutral-400 hover:text-white'
                }`}
                title="Badge Cards Grid"
              >
                <LayoutGrid size={13} />
                <span>Cards Grid</span>
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
              <SchoolLogo logoUrl={systemSettings?.schoolLogoUrl} size={48} className="border border-black" />
              <div className="text-left">
                <h1 className="text-xl font-extrabold uppercase tracking-tight text-black">{schoolName}</h1>
                <p className="text-xs font-bold text-gray-800 uppercase">OFFICIAL PUPIL DISMISSAL & PICKUP SECURITY PASS ROSTER</p>
              </div>
            </div>
            <div className="flex justify-between items-center text-xs font-mono font-bold pt-2 border-t border-gray-400">
              <span><strong>CLASS COHORT:</strong> {selectedClass === 'ALL' ? 'All Classes' : `Class ${selectedClass}`}</span>
              <span><strong>VALID WEEK:</strong> {weekInfo.formattedRange}</span>
              <span><strong>SECURITY STATUS:</strong> Expires Friday Evening</span>
            </div>
          </div>

          {filteredRoster.length === 0 ? (
            <div className="py-12 text-center space-y-3 bg-neutral-950 border-2 border-dashed border-neutral-800 p-6 no-print">
              <Users size={32} className="mx-auto text-neutral-600" />
              <p className="text-xs font-mono text-neutral-400 font-bold uppercase tracking-wider">
                No pupil records found matching the current class filter or search query.
              </p>
            </div>
          ) : viewMode === 'table' ? (
            /* TABULAR ROSTER LAYOUT (Clean, Professional Print with repeating header and non-breaking rows) */
            <div className="overflow-x-auto border-2 border-neutral-800 print:border-black">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-neutral-950 text-amber-400 border-b-2 border-neutral-800 print:bg-gray-200 print:text-black print:border-black">
                  <tr>
                    <th className="p-2.5 font-black uppercase w-10 text-center">#</th>
                    <th className="p-2.5 font-black uppercase">Pupil Name</th>
                    <th className="p-2.5 font-black uppercase w-20">Class</th>
                    <th className="p-2.5 font-black uppercase w-28">Reg / Roll ID</th>
                    <th className="p-2.5 font-black uppercase text-center bg-amber-400/10 print:bg-gray-300 w-36">
                      🔒 Weekly Pickup Code
                    </th>
                    <th className="p-2.5 font-black uppercase">Guardian Contact</th>
                    <th className="p-2.5 font-black uppercase print:table-cell hidden sm:table-cell">Verification / Note</th>
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
                      <td className="p-2.5 text-center font-black text-amber-400 text-sm tracking-wider bg-amber-400/5 print:bg-gray-100 print:text-black">
                        {s.pickupCode}
                      </td>
                      <td className="p-2.5 text-neutral-300 print:text-black">
                        {s.guardianPhone || <span className="text-neutral-600 print:text-gray-400 italic">Unrecorded</span>}
                      </td>
                      <td className="p-2.5 text-neutral-500 border-l print:border-black border-dashed border-neutral-800 print:table-cell hidden sm:table-cell">
                        <span className="print:hidden text-[10px]">Valid thru Fri</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : viewMode === 'slips' ? (
            /* CUT-OUT PARENT SECURITY SLIPS (6 per page with clear dashed cut boundaries) */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-2 print:gap-4">
              {filteredRoster.map((s) => (
                <div
                  key={s.id}
                  className="pass-slip bg-neutral-950 border-2 border-dashed border-amber-400 p-4 relative space-y-3 print:bg-white print:text-black print:border-black print-avoid-break"
                >
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2 print:border-black">
                    <div className="flex items-center gap-2">
                      <SchoolLogo logoUrl={systemSettings?.schoolLogoUrl} size={24} className="border border-neutral-700 print:border-black" />
                      <div>
                        <span className="text-[9px] font-mono font-black uppercase text-amber-400 tracking-wider block print:text-black">
                          {schoolName}
                        </span>
                        <span className="text-[8px] font-mono text-neutral-400 block print:text-gray-600">
                          PUPIL SECURITY PICKUP PASS
                        </span>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono font-bold bg-amber-400/20 text-amber-300 px-1.5 py-0.5 border border-amber-400/40 print:bg-gray-200 print:text-black print:border-black">
                      {s.class}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] font-mono font-bold text-neutral-400 block print:text-gray-600">PUPIL NAME:</span>
                    <h4 className="text-base font-black text-white uppercase tracking-tight truncate print:text-black">
                      {s.name}
                    </h4>
                    <p className="text-[10px] font-mono text-neutral-400 print:text-gray-700">
                      Roll ID: <strong>{s.rollNumber || 'N/A'}</strong>
                    </p>
                  </div>

                  {/* High Visibility Pickup Code Token */}
                  <div className="bg-amber-400 text-neutral-950 p-2.5 text-center font-mono font-black border-2 border-amber-300 print:bg-black print:text-white print:border-black">
                    <span className="text-[8px] uppercase tracking-widest block text-neutral-900 print:text-gray-300">
                      WEEKLY PASS CODE
                    </span>
                    <div className="text-2xl font-black tracking-widest my-0.5">
                      {s.pickupCode}
                    </div>
                    <span className="text-[8px] block opacity-80">
                      Valid: {weekInfo.formattedRange}
                    </span>
                  </div>

                  <div className="text-[9px] font-mono text-neutral-400 flex justify-between items-center pt-1 print:text-black">
                    <span>Guardian: {s.guardianPhone || 'N/A'}</span>
                    <span className="text-[8px] text-amber-400/80 italic print:text-black">✂ Cut & Hand to Parent</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* VISUAL BADGE CARDS GRID */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 print:grid-cols-2 print:gap-3">
              {filteredRoster.map((s) => (
                <div
                  key={s.id}
                  className="pass-card bg-neutral-950 border-2 border-neutral-800 p-3.5 space-y-3 relative group hover:border-amber-400/80 transition-all print:border-black print:bg-white print:text-black print-avoid-break"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-neutral-800 pb-2.5 print:border-gray-300">
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest block print:text-gray-800">
                        {s.class} • Roll: {s.rollNumber || 'N/A'}
                      </span>
                      <h3 className="text-sm font-black text-white uppercase tracking-tight truncate print:text-black">
                        {s.name}
                      </h3>
                    </div>
                    <span className="shrink-0 bg-neutral-900 border border-neutral-800 px-2 py-0.5 text-[9px] font-mono font-bold text-neutral-400 uppercase print:bg-gray-100 print:text-black print:border-gray-400">
                      {s.gender || 'Pupil'}
                    </span>
                  </div>

                  {/* High Visibility Pickup Security Pass Badge */}
                  <div className="bg-amber-400/10 border-2 border-amber-400 p-2.5 text-center space-y-1 print:bg-gray-100 print:border-black">
                    <span className="text-[9px] font-mono font-black text-amber-300 uppercase tracking-widest block print:text-black">
                      🔒 WEEKLY PICKUP PASS CODE
                    </span>
                    <div className="text-2xl sm:text-3xl font-black font-mono tracking-widest text-amber-400 print:text-black">
                      {s.pickupCode}
                    </div>
                    <span className="text-[8px] font-mono text-neutral-400 block print:text-gray-700">
                      Valid for week of {weekInfo.formattedRange}
                    </span>
                  </div>

                  <div className="text-[10px] font-mono text-neutral-400 space-y-0.5 print:text-gray-800">
                    <div>
                      <strong className="text-neutral-300 print:text-black">Guardian Contact:</strong>{' '}
                      {s.guardianPhone ? (
                        <a href={`tel:${s.guardianPhone}`} className="text-amber-400 font-bold underline print:text-black print:no-underline">
                          {s.guardianPhone}
                        </a>
                      ) : (
                        <span className="italic text-neutral-600 print:text-gray-500">Not recorded</span>
                      )}
                    </div>
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
          <button
            onClick={onClose}
            className="bg-neutral-800 hover:bg-neutral-700 text-white px-5 py-2 text-xs font-mono font-black uppercase tracking-wider cursor-pointer border border-neutral-700"
          >
            Close Window
          </button>
        </div>

      </div>
    </div>
  );
};
