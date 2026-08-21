import React, { useState, useMemo } from 'react';
import { Printer, X, CalendarDays, CheckSquare, Utensils, Info, FileText, Sparkles, AlertCircle } from 'lucide-react';
import { Student, StudentClass, Term } from '../types';

interface CanteenBookletModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  activeTerm: Term | null;
  initialClass?: StudentClass | 'All-Preschool';
}

const PRE_SCHOOL_CLASSES: StudentClass[] = ['Nursery', 'KG1', 'KG2'];

export const CanteenBookletModal: React.FC<CanteenBookletModalProps> = ({
  isOpen,
  onClose,
  students,
  activeTerm,
  initialClass = 'All-Preschool'
}) => {
  const [selectedClass, setSelectedClass] = useState<StudentClass | 'All-Preschool'>(initialClass);
  const [weekRange, setWeekRange] = useState<'all' | 'weeks1_4' | 'weeks5_8' | 'weeks9_12'>('all');
  const [dailyRate, setDailyRate] = useState<string>('5.00');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');

  // Filter active pre-school students
  const filteredStudentsByClass = useMemo(() => {
    const activeStudents = students.filter(s => s.active !== false);
    
    const map: Record<StudentClass, Student[]> = {
      Nursery: [],
      KG1: [],
      KG2: [],
      B1: [], B2: [], B3: [], B4: [], B5: [], B6: [], B7: [], B8: [], B9: []
    };

    activeStudents.forEach(s => {
      if (PRE_SCHOOL_CLASSES.includes(s.class)) {
        map[s.class].push(s);
      }
    });

    // Sort students by name alphabetically within each class
    PRE_SCHOOL_CLASSES.forEach(cls => {
      map[cls].sort((a, b) => a.name.localeCompare(b.name));
    });

    return map;
  }, [students]);

  // Group school days of activeTerm into weeks of Mon-Fri
  const allWeeksOfTerm = useMemo(() => {
    if (activeTerm && activeTerm.schoolDays && activeTerm.schoolDays.length > 0) {
      const weeks: { weekNumber: number; days: string[] }[] = [];
      let currentWeek: string[] = [];
      let weekIndex = 1;

      activeTerm.schoolDays.forEach((dayStr) => {
        currentWeek.push(dayStr);
        if (currentWeek.length === 5) {
          weeks.push({ weekNumber: weekIndex++, days: currentWeek });
          currentWeek = [];
        }
      });

      if (currentWeek.length > 0) {
        weeks.push({ weekNumber: weekIndex, days: currentWeek });
      }
      return weeks;
    }

    // Fallback: Generate 12 standard school weeks
    const fallbackWeeks: { weekNumber: number; days: string[] }[] = [];
    for (let w = 1; w <= 12; w++) {
      fallbackWeeks.push({
        weekNumber: w,
        days: [`W${w}-M`, `W${w}-T`, `W${w}-W`, `W${w}-Th`, `W${w}-F`]
      });
    }
    return fallbackWeeks;
  }, [activeTerm]);

  // Filtered weeks based on weekRange selection
  const displayedWeeks = useMemo(() => {
    if (weekRange === 'weeks1_4') return allWeeksOfTerm.slice(0, 4);
    if (weekRange === 'weeks5_8') return allWeeksOfTerm.slice(4, 8);
    if (weekRange === 'weeks9_12') return allWeeksOfTerm.slice(8, 12);
    return allWeeksOfTerm; // 'all'
  }, [allWeeksOfTerm, weekRange]);

  const classesToRender = useMemo(() => {
    if (selectedClass === 'All-Preschool') {
      return PRE_SCHOOL_CLASSES;
    }
    return [selectedClass];
  }, [selectedClass]);

  const totalPupilCount = useMemo(() => {
    return classesToRender.reduce((sum, cls) => sum + (filteredStudentsByClass[cls]?.length || 0), 0);
  }, [classesToRender, filteredStudentsByClass]);

  // Robust printing handler that uses a popup window to prevent iframe sandbox print blocking
  const handlePrintPopup = () => {
    const printElement = document.getElementById('print-canteen-booklet-area');
    if (!printElement) {
      window.print();
      return;
    }

    try {
      const printWin = window.open('', '_blank', 'width=1200,height=900,scrollbars=yes,resizable=yes');
      if (printWin) {
        printWin.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Canteen Booklet - Saako Holy Child Academy</title>
              <meta charset="utf-8" />
              <style>
                @page {
                  size: ${orientation};
                  margin: 6mm;
                }
                body {
                  font-family: Arial, Helvetica, sans-serif;
                  margin: 0;
                  padding: 10px;
                  background: white;
                  color: black;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .class-booklet-page {
                  page-break-after: always;
                  break-after: page;
                  margin-bottom: 25px;
                }
                .class-booklet-page:last-child {
                  page-break-after: avoid;
                  break-after: avoid;
                  margin-bottom: 0;
                }
                table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-top: 6px;
                }
                th, td {
                  border: 1px solid #000000;
                  padding: 2px 3px;
                  font-size: 8.5px;
                  color: #000000;
                  line-height: 1.15;
                }
                th {
                  background-color: #f3f4f6;
                  font-weight: bold;
                }
                .no-print {
                  display: none !important;
                }
                tr {
                  page-break-inside: avoid;
                  break-inside: avoid;
                }
              </style>
              <script src="https://cdn.tailwindcss.com"></script>
            </head>
            <body class="bg-white text-black p-4">
              ${printElement.innerHTML}
              <script>
                window.onload = function() {
                  setTimeout(function() {
                    window.print();
                  }, 500);
                };
              </script>
            </body>
          </html>
        `);
        printWin.document.close();
        printWin.focus();
        return;
      }
    } catch (e) {
      console.warn('Popup print blocked, falling back to direct window.print()', e);
    }

    // Direct browser print fallback
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-md flex flex-col p-3 md:p-6 overflow-y-auto no-print">
      {/* Top Controller Panel */}
      <div className="w-full max-w-6xl mx-auto bg-neutral-900 border-2 border-neutral-800 p-4 mb-4 rounded-lg flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-md">
              <Utensils size={22} className="shrink-0" />
            </div>
            <div className="text-left font-mono">
              <div className="flex items-center gap-2">
                <span className="text-[9.5px] bg-amber-400 text-black font-black px-2 py-0.5 uppercase tracking-wider rounded">
                  Pre-School Hardcopy Booklet
                </span>
                <span className="text-[9.5px] text-neutral-400 font-bold uppercase tracking-widest hidden sm:inline">
                  Canteen Operations
                </span>
              </div>
              <h3 className="text-base font-black text-white uppercase tracking-wider mt-0.5">
                Canteen & Feeding Fee Daily Register Booklet
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={handlePrintPopup}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-mono font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 rounded-md shadow-lg shadow-emerald-500/10"
              title="Open dedicated print window and initiate printing"
            >
              <Printer size={16} className="stroke-[2.5]" />
              <span>Print Canteen Booklet</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-md transition-colors cursor-pointer"
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter & Options Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-neutral-950 p-3 border border-neutral-850 rounded-md text-xs font-mono">
          {/* Class Selector */}
          <div className="space-y-1">
            <label className="text-[10px] text-neutral-400 font-bold uppercase block">
              1. Target Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value as StudentClass | 'All-Preschool')}
              className="w-full bg-neutral-900 border border-neutral-750 text-white py-1.5 px-2.5 rounded font-bold text-xs focus:outline-none focus:border-amber-400"
            >
              <option value="All-Preschool">All Pre-School (Nursery, KG1, KG2)</option>
              <option value="Nursery">Nursery Only ({filteredStudentsByClass.Nursery?.length || 0} pupils)</option>
              <option value="KG1">KG1 Only ({filteredStudentsByClass.KG1?.length || 0} pupils)</option>
              <option value="KG2">KG2 Only ({filteredStudentsByClass.KG2?.length || 0} pupils)</option>
            </select>
          </div>

          {/* Term Week Range */}
          <div className="space-y-1">
            <label className="text-[10px] text-neutral-400 font-bold uppercase block">
              2. Term Booklet Range
            </label>
            <select
              value={weekRange}
              onChange={(e) => setWeekRange(e.target.value as any)}
              className="w-full bg-neutral-900 border border-neutral-750 text-white py-1.5 px-2.5 rounded font-bold text-xs focus:outline-none focus:border-amber-400"
            >
              <option value="all">Full Term Booklet ({allWeeksOfTerm.length} Weeks)</option>
              <option value="weeks1_4">Weeks 1 – 4 (1st Month)</option>
              <option value="weeks5_8">Weeks 5 – 8 (2nd Month)</option>
              <option value="weeks9_12">Weeks 9 – 12+ (3rd Month & Revision)</option>
            </select>
          </div>

          {/* Daily Rate Input */}
          <div className="space-y-1">
            <label className="text-[10px] text-neutral-400 font-bold uppercase block">
              3. Daily Meal Rate (GHC)
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1.5 text-neutral-500 font-bold">GHC</span>
              <input
                type="text"
                value={dailyRate}
                onChange={(e) => setDailyRate(e.target.value)}
                placeholder="5.00"
                className="w-full bg-neutral-900 border border-neutral-750 text-amber-400 pl-11 pr-2.5 py-1.5 rounded font-black text-xs focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Orientation Toggle */}
          <div className="space-y-1">
            <label className="text-[10px] text-neutral-400 font-bold uppercase block">
              4. Print Orientation
            </label>
            <div className="flex items-center bg-neutral-900 border border-neutral-750 rounded p-0.5">
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`flex-1 py-1 text-[10px] font-bold uppercase rounded ${
                  orientation === 'landscape' ? 'bg-amber-400 text-black font-black' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Landscape
              </button>
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`flex-1 py-1 text-[10px] font-bold uppercase rounded ${
                  orientation === 'portrait' ? 'bg-amber-400 text-black font-black' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Portrait
              </button>
            </div>
          </div>
        </div>

        {/* Informational banner */}
        <div className="bg-amber-950/40 border border-amber-500/30 p-2.5 rounded-md flex items-start gap-2.5 text-amber-200 text-xs font-sans">
          <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-tight">
            <strong className="font-bold text-amber-400 uppercase">Offline Canteen Hardcopy Notice:</strong> This booklet generates complete term daily check grids for the canteen representative to physically mark daily meals. Marked records on this sheet operate strictly as an offline register and do not interfere with digital billing system data.
          </p>
        </div>
      </div>

      {/* Interactive Screen Preview Container */}
      <div className="w-full max-w-6xl mx-auto flex-1 bg-neutral-950 border border-neutral-850 p-2 md:p-6 rounded-lg flex justify-center items-start overflow-x-auto">
        <div
          id="print-canteen-booklet-area"
          className={`bg-white text-black p-6 md:p-8 w-full shadow-2xl border border-neutral-300 font-sans flex flex-col justify-between ${
            orientation === 'landscape' ? 'max-w-[297mm] min-h-[210mm]' : 'max-w-[210mm] min-h-[297mm]'
          }`}
        >
          {/* Print CSS isolation */}
          <style>{`
            @media print {
              @page {
                size: ${orientation};
                margin: 6mm;
              }
              body * {
                visibility: hidden !important;
                background: none !important;
                color: black !important;
              }
              #print-canteen-booklet-area, #print-canteen-booklet-area * {
                visibility: visible !important;
              }
              #print-canteen-booklet-area {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 4mm !important;
                background: white !important;
                color: black !important;
                font-family: Arial, sans-serif !important;
                box-shadow: none !important;
                border: none !important;
              }
              .no-print {
                display: none !important;
                visibility: hidden !important;
              }
              .class-booklet-page {
                page-break-after: always !important;
                break-after: page !important;
              }
              .class-booklet-page:last-child {
                page-break-after: avoid !important;
                break-after: avoid !important;
              }
              tr {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
              thead {
                display: table-header-group !important;
              }
              table {
                width: 100% !important;
                border-collapse: collapse !important;
                margin-top: 6px !important;
              }
              th, td {
                border: 1px solid #000000 !important;
                padding: 3px 4px !important;
                font-size: 8.5px !important;
                color: #000000 !important;
                line-height: 1.15 !important;
              }
              th {
                background-color: #f3f4f6 !important;
                font-weight: bold !important;
              }
            }
          `}</style>

          {/* Loop through each class in classesToRender */}
          <div className="space-y-8">
            {classesToRender.map((cls, classIdx) => {
              const classPupils = filteredStudentsByClass[cls] || [];

              return (
                <div
                  key={cls}
                  className={`class-booklet-page ${
                    classIdx < classesToRender.length - 1 ? 'border-b-4 border-dashed border-neutral-300 pb-10 mb-10' : ''
                  }`}
                >
                  {/* Official Institutional Header */}
                  <div className="border-b-4 border-black pb-2.5 flex justify-between items-start text-left">
                    <div className="flex items-center gap-3">
                      <img
                        src="/school_logo.jpg"
                        alt="School Logo"
                        className="w-14 h-14 object-contain border border-neutral-400 p-0.5 rounded"
                        onError={(e) => {
                          // Hide fallback image if missing
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="space-y-0.5">
                        <span className="text-[8px] font-bold text-neutral-600 font-mono tracking-widest uppercase block">
                          SAAKO HOLY CHILD ACADEMY • OFFICIAL CANTEEN DIVISION
                        </span>
                        <h2 className="text-xl font-extrabold uppercase tracking-tight text-black leading-none">
                          SAAKO HOLY CHILD ACADEMY
                        </h2>
                        <p className="text-[8.5px] text-neutral-600 uppercase font-mono tracking-wide">
                          P. O. Box LS 15, Sawla • Jelinkon Street, Savannah Region • Holiness is our Key • Tel: +233545029200
                        </p>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <span className="inline-block bg-black px-2.5 py-1 text-[8.5px] font-mono font-bold uppercase text-white tracking-widest">
                        🍱 PRE-SCHOOL CANTEEN REGISTER
                      </span>
                      <div className="text-[7.5px] text-neutral-500 font-mono font-bold">
                        GEN: {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  {/* Metadata Header Box */}
                  <div className="mt-3 bg-neutral-100 border border-black p-2 flex flex-wrap justify-between items-center text-left font-mono text-[9px] gap-2">
                    <div>
                      <span className="text-neutral-500 font-bold block">CLASS:</span>
                      <span className="text-xs font-black text-black uppercase">{cls} (PRE-SCHOOL)</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 font-bold block">ACADEMIC TERM:</span>
                      <span className="text-xs font-black text-black uppercase">{activeTerm?.name || 'ACTIVE TERM'}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 font-bold block">TERM BOOKLET RANGE:</span>
                      <span className="text-xs font-black text-black uppercase">
                        {weekRange === 'all'
                          ? `FULL TERM (${displayedWeeks.length} WEEKS)`
                          : weekRange === 'weeks1_4'
                          ? 'WEEKS 1 – 4'
                          : weekRange === 'weeks5_8'
                          ? 'WEEKS 5 – 8'
                          : 'WEEKS 9 – 12+'}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 font-bold block">ENROLLED PUPILS:</span>
                      <span className="text-xs font-black text-black">{classPupils.length} PUPILS</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 font-bold block">DAILY MEAL RATE:</span>
                      <span className="text-xs font-black text-emerald-800">GHC {parseFloat(dailyRate || '5').toFixed(2)} / Meal</span>
                    </div>
                  </div>

                  {/* Disclaimer / Operational Instruction Bar */}
                  <div className="mt-1.5 bg-neutral-50 border border-neutral-300 p-1.5 text-left text-[8px] font-mono text-neutral-700">
                    <strong>📌 CANTEEN REP & TEACHER INSTRUCTIONS:</strong> Mark <strong>[✓]</strong> or <strong>[P]</strong> in the box when pupil is fed, and <strong>ALWAYS write the amount paid</strong> (e.g. 5, 10, 15) on the line below the box for that day. If a pupil pays in advance for multiple days, record the total cash collected on the payment date for audit trail.
                  </div>

                  {/* Pupil Feeding Grid Table */}
                  <div className="overflow-x-auto mt-2">
                    <table className="w-full text-left font-sans text-[9px] border-collapse">
                      <thead>
                        {/* Top Week Header Row */}
                        <tr className="bg-neutral-200 text-black border-t-2 border-b border-black">
                          <th className="py-1 px-1 text-center font-black w-[25px] border border-black" rowSpan={2}>#</th>
                          <th className="py-1 px-2 uppercase font-black w-[160px] border border-black" rowSpan={2}>
                            Pupil Full Name & Guardian Contact
                          </th>
                          <th className="py-1 px-1 text-center uppercase font-black w-[55px] border border-black" rowSpan={2}>
                            Scheme
                          </th>

                          {displayedWeeks.map((wk) => (
                            <th
                              key={wk.weekNumber}
                              colSpan={5}
                              className="py-1 px-0.5 text-center font-black uppercase border-t-2 border-b border-black border-l-2 border-r-2 border-l-black border-r-black bg-neutral-300 text-[8.5px] tracking-wider"
                            >
                              WEEK {wk.weekNumber}
                            </th>
                          ))}

                          <th className="py-1 px-1 text-center font-black uppercase w-[75px] border border-black bg-emerald-50 text-[8px]" rowSpan={2}>
                            Term Total Fed / Paid
                          </th>
                          <th className="py-1 px-1 text-center font-black uppercase w-[90px] border border-black bg-neutral-50 text-[8px]" rowSpan={2}>
                            Canteen Rep Remarks
                          </th>
                        </tr>

                        {/* Sub Day Header Row (M, T, W, T, F for each week with deeper week borders) */}
                        <tr className="bg-neutral-100 text-black border-b-2 border-black font-mono text-[7.5px]">
                          {displayedWeeks.map((wk) => (
                            <React.Fragment key={`sub-header-${wk.weekNumber}`}>
                              <th className="py-0.5 px-0.5 text-center border border-black border-l-2 border-l-black w-[20px]">M</th>
                              <th className="py-0.5 px-0.5 text-center border border-black w-[20px]">T</th>
                              <th className="py-0.5 px-0.5 text-center border border-black w-[20px]">W</th>
                              <th className="py-0.5 px-0.5 text-center border border-black w-[20px]">Th</th>
                              <th className="py-0.5 px-0.5 text-center border border-black border-r-2 border-r-black w-[20px]">F</th>
                            </React.Fragment>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {classPupils.length === 0 ? (
                          <tr>
                            <td
                              colSpan={3 + displayedWeeks.length * 5 + 2}
                              className="py-6 text-center text-neutral-500 font-mono text-xs border border-black italic"
                            >
                              No enrolled pupils found for {cls}.
                            </td>
                          </tr>
                        ) : (
                          classPupils.map((pupil, idx) => (
                            <tr key={pupil.id} className="border-b border-neutral-300">
                              {/* S/N */}
                              <td className="py-1 px-1 text-center font-mono text-[8.5px] border border-black font-bold">
                                {idx + 1}
                              </td>

                              {/* Student Name */}
                              <td className="py-1 px-1.5 text-left border border-black">
                                <div className="font-bold text-[9px] text-black uppercase leading-tight">
                                  {pupil.name}
                                </div>
                                <div className="text-[7px] text-neutral-600 font-mono tracking-tight flex items-center gap-1.5 mt-0.5">
                                  <span>Roll: {pupil.rollNumber || 'N/A'}</span>
                                  {pupil.guardianPhone && (
                                    <>
                                      <span>•</span>
                                      <span>Ph: {pupil.guardianPhone}</span>
                                    </>
                                  )}
                                </div>
                              </td>

                              {/* Payment Scheme */}
                              <td className="py-1 px-0.5 text-center font-mono text-[7.5px] uppercase border border-black">
                                {pupil.paymentType === 'Term' ? (
                                  <span className="font-bold text-neutral-800">Term Paid</span>
                                ) : pupil.paymentType === 'Scholar' ? (
                                  <span className="text-neutral-500 font-semibold">Scholar</span>
                                ) : (
                                  <span className="font-bold text-black">Daily</span>
                                )}
                              </td>

                              {/* Weekly 5-Day Cells with Checkbox & Amount Line */}
                              {displayedWeeks.map((wk) => (
                                <React.Fragment key={`cell-${pupil.id}-wk-${wk.weekNumber}`}>
                                  {[0, 1, 2, 3, 4].map((dayIdx) => (
                                    <td
                                      key={`cell-${pupil.id}-wk-${wk.weekNumber}-d-${dayIdx}`}
                                      className={`py-1 px-0.5 text-center border border-black ${
                                        dayIdx === 0 ? 'border-l-2 border-l-black' : ''
                                      } ${
                                        dayIdx === 4 ? 'border-r-2 border-r-black' : ''
                                      }`}
                                    >
                                      <div className="flex flex-col items-center justify-between min-h-[38px] py-0.5 gap-1">
                                        {/* Printable Check Box Square */}
                                        <div className="w-3.5 h-3.5 border border-black mx-auto bg-white flex items-center justify-center shrink-0" />
                                        {/* Clear Hand-writable Amount Line */}
                                        <div className="w-full flex items-end justify-between border-b border-black text-[6px] font-mono leading-none pb-[1px] px-0.5">
                                          <span className="text-[5.5px] font-bold text-neutral-500 select-none shrink-0">¢</span>
                                          <span className="text-[6px] text-transparent select-none">&nbsp;</span>
                                        </div>
                                      </div>
                                    </td>
                                  ))}
                                </React.Fragment>
                              ))}

                              {/* Term Total Tally Cell */}
                              <td className="py-1 px-1 text-center font-mono text-[8px] border border-black bg-emerald-50/20">
                                <div className="space-y-0.5">
                                  <div className="text-[7px] text-neutral-500">Days: ____</div>
                                  <div className="text-[7.5px] font-bold text-black">GHC ______</div>
                                </div>
                              </td>

                              {/* Remarks Cell */}
                              <td className="py-1 px-1 text-left border border-black text-[7.5px] font-mono text-neutral-400">
                                &nbsp;
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Tally & Signature Endorsement Section */}
                  <div className="mt-4 border-t-2 border-black pt-3 font-mono text-[8.5px]">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Summary Tally Box */}
                      <div className="space-y-1 text-left bg-neutral-50 p-2 border border-neutral-300">
                        <span className="text-black font-black uppercase block border-b border-black pb-0.5">
                          {cls} CANTEEN SUMMARY TALLY:
                        </span>
                        <div className="space-y-1 text-[8px] pt-1">
                          <div>Total Enrolled Pupils: <strong className="text-black">{classPupils.length}</strong></div>
                          <div>Total Meals Served This Term: <strong className="text-black">________ Meals</strong></div>
                          <div>Total Canteen Collections: <strong className="text-black">GHC ____________</strong></div>
                        </div>
                      </div>

                      {/* Sign-Off Block 1: Canteen Rep */}
                      <div className="space-y-3 text-left">
                        <span className="text-neutral-600 font-bold uppercase block text-[7.5px]">CANTEEN REPRESENTATIVE:</span>
                        <div className="space-y-1">
                          <div className="border-b border-black w-full h-4" />
                          <div className="text-[7.5px] font-bold text-black uppercase">Signature & Date</div>
                        </div>
                      </div>

                      {/* Sign-Off Block 2: Teacher & Headmaster */}
                      <div className="space-y-3 text-left">
                        <span className="text-neutral-600 font-bold uppercase block text-[7.5px]">TEACHER & BURSAR ENDORSEMENT:</span>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <div className="border-b border-black w-full h-4" />
                            <div className="text-[7px] font-bold text-black uppercase">Class Teacher</div>
                          </div>
                          <div className="space-y-1">
                            <div className="border-b border-black w-full h-4" />
                            <div className="text-[7px] font-bold text-black uppercase">Headmaster Stamp</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
