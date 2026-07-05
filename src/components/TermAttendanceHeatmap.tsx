import React, { useState, useMemo } from 'react';
import { useApp, getSchoolWeekForDate } from '../context/AppContext';
import { StudentClass, Student } from '../types';
import { 
  Calendar, 
  Search, 
  Info, 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  ChevronRight, 
  Smartphone, 
  Download, 
  Filter, 
  Layers,
  Palette,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type PaletteType = 'emerald' | 'sapphire' | 'orchid' | 'cyberpunk';

export function TermAttendanceHeatmap() {
  const { 
    payments = [], 
    students = [], 
    activeTerm, 
    currentDate,
    sendautomatedWhatsApp,
    currentUser
  } = useApp();

  // Filters & State
  const [selectedClass, setSelectedClass] = useState<StudentClass | 'all'>('all');
  const [selectedGender, setSelectedGender] = useState<'all' | 'Male' | 'Female'>('all');
  const [colorPalette, setColorPalette] = useState<PaletteType>('emerald');
  const [selectedDayStr, setSelectedDayStr] = useState<string | null>(null);
  const [whatsappSendingMap, setWhatsappSendingMap] = useState<Record<string, boolean>>({});
  const [whatsappResult, setWhatsappResult] = useState<{ success?: boolean; error?: string; studentId?: string } | null>(null);

  // Fallback to today if nothing selected yet
  const activeDayStr = selectedDayStr || currentDate;

  // Active student cohort based on classroom & gender filters
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const classMatch = selectedClass === 'all' || s.class === selectedClass;
      const genderMatch = selectedGender === 'all' || s.gender === selectedGender;
      return s.active && classMatch && genderMatch;
    });
  }, [students, selectedClass, selectedGender]);

  // Compute school days of active term
  const termSchoolDays = useMemo(() => {
    if (!activeTerm || !activeTerm.schoolDays) return [];
    return activeTerm.schoolDays;
  }, [activeTerm]);

  // Holidays set for rapid checking
  const holidaySet = useMemo(() => {
    if (!activeTerm || !activeTerm.publicHolidays) return new Set<string>();
    return new Set(activeTerm.publicHolidays);
  }, [activeTerm]);

  // Max week index in the term
  const maxTermWeeks = useMemo(() => {
    if (termSchoolDays.length === 0 || !activeTerm) return 12;
    let maxW = 1;
    termSchoolDays.forEach(day => {
      const w = getSchoolWeekForDate(day, activeTerm.startDate);
      if (w > maxW) maxW = w;
    });
    return maxW;
  }, [termSchoolDays, activeTerm]);

  // Map of dateStr -> payments for quick student lookup
  const paymentMapByDate = useMemo(() => {
    const map: Record<string, Record<string, typeof payments[0]>> = {};
    payments.forEach(p => {
      if (!map[p.date]) {
        map[p.date] = {};
      }
      map[p.date][p.studentId] = p;
    });
    return map;
  }, [payments]);

  // Compute presence & stats for EVERY school day in the term
  const dayStatsMap = useMemo(() => {
    const stats: Record<string, {
      dateStr: string;
      totalActiveCount: number;
      presentCount: number;
      absentCount: number;
      unmarkedCount: number;
      rate: number;
      isHoliday: boolean;
      isFuture: boolean;
      holidayName?: string;
    }> = {};

    termSchoolDays.forEach(dayStr => {
      const isHoliday = holidaySet.has(dayStr);
      const isFuture = dayStr > currentDate;
      
      if (isHoliday) {
        stats[dayStr] = {
          dateStr: dayStr,
          totalActiveCount: 0,
          presentCount: 0,
          absentCount: 0,
          unmarkedCount: 0,
          rate: 0,
          isHoliday: true,
          isFuture,
          holidayName: 'Public Holiday'
        };
        return;
      }

      // Count for filtered cohort on this day
      let present = 0;
      let absent = 0;
      let unmarked = 0;

      const datePayments = paymentMapByDate[dayStr] || {};

      filteredStudents.forEach(student => {
        const pay = datePayments[student.id];
        if (pay) {
          if (pay.isAbsent) {
            absent++;
          } else {
            present++;
          }
        } else {
          unmarked++;
        }
      });

      const totalActiveCohort = filteredStudents.length;
      const markedCount = present + absent;
      // If day is past and unmarked, in actual practice they are unmarked.
      // Presence rate is Present / Total Active Students in the cohort
      const rate = totalActiveCohort > 0 ? (present / totalActiveCohort) * 100 : 100;

      stats[dayStr] = {
        dateStr: dayStr,
        totalActiveCount: totalActiveCohort,
        presentCount: present,
        absentCount: absent,
        unmarkedCount: unmarked,
        rate,
        isHoliday: false,
        isFuture
      };
    });

    return stats;
  }, [termSchoolDays, holidaySet, currentDate, filteredStudents, paymentMapByDate]);

  // Structural Matrix: Week (Row) vs Weekday (Col)
  // Monday = 1, Tuesday = 2, Wednesday = 3, Thursday = 4, Friday = 5
  const matrixData = useMemo(() => {
    const weeks: Record<number, Record<number, { dateStr: string; rate: number; isHoliday: boolean; isFuture: boolean }>> = {};
    
    // Initialize weeks
    for (let w = 1; w <= maxTermWeeks; w++) {
      weeks[w] = {};
    }

    termSchoolDays.forEach(dayStr => {
      if (!activeTerm) return;
      const w = getSchoolWeekForDate(dayStr, activeTerm.startDate);
      const dObj = new Date(dayStr);
      const weekday = dObj.getDay(); // 0-6

      // Only care about standard weekdays Mon-Fri
      if (weekday >= 1 && weekday <= 5 && weeks[w]) {
        const stats = dayStatsMap[dayStr];
        weeks[w][weekday] = {
          dateStr: dayStr,
          rate: stats?.rate ?? 0,
          isHoliday: stats?.isHoliday ?? false,
          isFuture: stats?.isFuture ?? false
        };
      }
    });

    return weeks;
  }, [termSchoolDays, maxTermWeeks, activeTerm, dayStatsMap]);

  // Core stats over the term for the filtered cohort (past and today days)
  const aggregatedTermStats = useMemo(() => {
    let totalPresentSum = 0;
    let totalAbsentSum = 0;
    let pastDaysCount = 0;
    
    const weekdayPresenceSums: Record<number, { present: number; total: number }> = {
      1: { present: 0, total: 0 }, // Mon
      2: { present: 0, total: 0 }, // Tue
      3: { present: 0, total: 0 }, // Wed
      4: { present: 0, total: 0 }, // Thu
      5: { present: 0, total: 0 }  // Fri
    };

    let peakDay = { dateStr: '---', rate: -1 };
    let lowestDay = { dateStr: '---', rate: 101 };

    termSchoolDays.forEach(dayStr => {
      const stats = dayStatsMap[dayStr];
      if (!stats || stats.isHoliday || stats.isFuture) return;

      totalPresentSum += stats.presentCount;
      totalAbsentSum += stats.absentCount;
      pastDaysCount++;

      // Weekday calculations
      const wday = new Date(dayStr).getDay();
      if (wday >= 1 && wday <= 5) {
        weekdayPresenceSums[wday].present += stats.presentCount;
        weekdayPresenceSums[wday].total += stats.totalActiveCount;
      }

      // Peak / lowest
      if (stats.rate > peakDay.rate) {
        peakDay = { dateStr: dayStr, rate: stats.rate };
      }
      if (stats.rate < lowestDay.rate) {
        lowestDay = { dateStr: dayStr, rate: stats.rate };
      }
    });

    const averageRate = (totalPresentSum + totalAbsentSum) > 0 
      ? (totalPresentSum / (totalPresentSum + totalAbsentSum)) * 100 
      : 100;

    // Find easiest/hardest weekday
    let hardestWeekday = 1;
    let hardestRate = 101;
    for (let d = 1; d <= 5; d++) {
      const wStats = weekdayPresenceSums[d];
      const wRate = wStats.total > 0 ? (wStats.present / wStats.total) * 100 : 100;
      if (wRate < hardestRate && wStats.total > 0) {
        hardestRate = wRate;
        hardestWeekday = d;
      }
    }

    const weekdaysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return {
      averageRate,
      totalPresences: totalPresentSum,
      totalAbsences: totalAbsentSum,
      activeDays: pastDaysCount,
      peakDay: peakDay.rate !== -1 ? peakDay : null,
      lowestDay: lowestDay.rate !== 101 ? lowestDay : null,
      hardestWeekdayName: weekdaysMap[hardestWeekday],
      hardestWeekdayRate: hardestRate === 101 ? 0 : hardestRate
    };
  }, [termSchoolDays, dayStatsMap]);

  // Compute stats for selected date
  const selectedDayDetails = useMemo(() => {
    if (!activeDayStr) return null;
    const stats = dayStatsMap[activeDayStr];
    if (!stats) return null;

    // Get list of present, absent, unmarked students
    const presentList: Student[] = [];
    const absentList: Student[] = [];
    const unmarkedList: Student[] = [];

    const datePayments = paymentMapByDate[activeDayStr] || {};

    filteredStudents.forEach(student => {
      const pay = datePayments[student.id];
      if (pay) {
        if (pay.isAbsent) {
          absentList.push(student);
        } else {
          presentList.push(student);
        }
      } else {
        unmarkedList.push(student);
      }
    });

    // Class attendance breakout
    const classBreakout: Record<string, { present: number; total: number; rate: number }> = {};
    filteredStudents.forEach(s => {
      if (!classBreakout[s.class]) {
        classBreakout[s.class] = { present: 0, total: 0, rate: 0 };
      }
      classBreakout[s.class].total++;
      
      const pay = datePayments[s.id];
      if (pay && !pay.isAbsent) {
        classBreakout[s.class].present++;
      }
    });

    Object.keys(classBreakout).forEach(cls => {
      const c = classBreakout[cls];
      c.rate = c.total > 0 ? (c.present / c.total) * 100 : 100;
    });

    return {
      ...stats,
      presentList,
      absentList,
      unmarkedList,
      classBreakout: Object.entries(classBreakout).map(([cls, b]) => ({
        class: cls as StudentClass,
        ...b
      })).sort((a,b) => b.rate - a.rate)
    };
  }, [activeDayStr, dayStatsMap, filteredStudents, paymentMapByDate]);

  // Cell coloring helper
  const getCellClasses = (rate: number, isHoliday: boolean, isFuture: boolean, isSelected: boolean) => {
    let colorClasses = '';
    
    if (isFuture) {
      colorClasses = 'bg-neutral-900/25 border-dashed border-neutral-800 text-neutral-600 hover:border-neutral-500';
    } else if (isHoliday) {
      colorClasses = 'bg-blue-950/40 border-blue-900/60 text-blue-400 hover:bg-blue-900/40 font-bold';
    } else {
      switch (colorPalette) {
        case 'emerald':
          if (rate >= 95) colorClasses = 'bg-emerald-500 text-black border-emerald-400 font-extrabold shadow-sm shadow-emerald-500/20';
          else if (rate >= 85) colorClasses = 'bg-emerald-700 text-emerald-100 border-emerald-600';
          else if (rate >= 70) colorClasses = 'bg-emerald-900/70 text-emerald-300 border-emerald-800';
          else if (rate >= 50) colorClasses = 'bg-amber-950/85 text-amber-300 border-amber-800/80';
          else colorClasses = 'bg-rose-950/90 text-rose-300 border-rose-900';
          break;
        case 'sapphire':
          if (rate >= 95) colorClasses = 'bg-sky-500 text-black border-sky-400 font-extrabold shadow-sm shadow-sky-500/20';
          else if (rate >= 85) colorClasses = 'bg-sky-700 text-sky-100 border-sky-600';
          else if (rate >= 70) colorClasses = 'bg-sky-950 text-sky-300 border-sky-900';
          else if (rate >= 50) colorClasses = 'bg-amber-950/85 text-amber-300 border-amber-850';
          else colorClasses = 'bg-rose-950/90 text-rose-300 border-rose-900';
          break;
        case 'orchid':
          if (rate >= 95) colorClasses = 'bg-fuchsia-500 text-black border-fuchsia-400 font-extrabold shadow-sm shadow-fuchsia-500/20';
          else if (rate >= 85) colorClasses = 'bg-fuchsia-700 text-fuchsia-100 border-fuchsia-600';
          else if (rate >= 70) colorClasses = 'bg-fuchsia-950 text-fuchsia-300 border-fuchsia-900';
          else if (rate >= 50) colorClasses = 'bg-amber-950/85 text-amber-300 border-amber-850';
          else colorClasses = 'bg-rose-950/90 text-rose-300 border-rose-900';
          break;
        case 'cyberpunk':
          if (rate >= 95) colorClasses = 'bg-amber-450 text-black border-amber-400 font-extrabold shadow-sm shadow-amber-500/25';
          else if (rate >= 85) colorClasses = 'bg-amber-600 text-amber-50 border-amber-550';
          else if (rate >= 70) colorClasses = 'bg-neutral-900 text-amber-400 border-amber-950';
          else if (rate >= 50) colorClasses = 'bg-neutral-900/70 text-neutral-400 border-neutral-800';
          else colorClasses = 'bg-rose-950/90 text-rose-300 border-rose-900';
          break;
      }
    }

    return `w-full h-11 flex flex-col justify-center items-center text-center border text-[11px] font-mono transition-all duration-150 cursor-pointer rounded-xs relative ${colorClasses} ${
      isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-900 scale-102 z-10' : ''
    }`;
  };

  // Format date helper
  const formatDateLabel = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  // Send single WhatsApp alert to absent student
  const handleSendWhatsAppAlert = async (student: Student, dateStr: string) => {
    if (!student.guardianPhone) return;
    setWhatsappSendingMap(prev => ({ ...prev, [student.id]: true }));
    setWhatsappResult(null);

    const message = `Saako Academy Alert: Dear Parent, please be informed that your ward ${student.name} was marked ABSENT at the gate today ${formatDateLabel(dateStr)}. If this is an error, contact administration immediately.`;

    try {
      const res = await sendautomatedWhatsApp(
        student.guardianPhone, 
        message, 
        student.id, 
        student.name, 
        'absence_warning'
      );
      if (res.success) {
        setWhatsappResult({ success: true, studentId: student.id });
      } else {
        setWhatsappResult({ success: false, error: res.error || 'Gateway Rejected', studentId: student.id });
      }
    } catch (err: any) {
      setWhatsappResult({ success: false, error: err.message || 'Network Failure', studentId: student.id });
    } finally {
      setWhatsappSendingMap(prev => ({ ...prev, [student.id]: false }));
      setTimeout(() => setWhatsappResult(null), 6000);
    }
  };

  // Print term report helper
  const handleExportTermHeatmapCSV = () => {
    if (!activeTerm) return;
    try {
      const rows = [
        ['Saako Holy Child Academy - Term Presence Heatmap Report'],
        [`Term: ${activeTerm.name}`, `Export Date: ${new Date().toLocaleDateString()}`],
        [`Classroom Filter: ${selectedClass.toUpperCase()}`, `Gender Filter: ${selectedGender.toUpperCase()}`],
        [],
        ['Date', 'Total Cohort', 'Present Count', 'Absent Count', 'Presence Rate (%)', 'Status']
      ];

      termSchoolDays.forEach(dayStr => {
        const stats = dayStatsMap[dayStr];
        if (!stats) return;

        let status = 'Standard';
        if (stats.isHoliday) status = 'Public Holiday';
        if (stats.isFuture) status = 'Upcoming Schedule';

        rows.push([
          dayStr,
          stats.isHoliday ? '0' : stats.totalActiveCount.toString(),
          stats.presentCount.toString(),
          stats.absentCount.toString(),
          stats.isHoliday ? '---' : stats.rate.toFixed(1),
          status
        ]);
      });

      const csvContent = "data:text/csv;charset=utf-8," 
        + rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(",")).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `presence_heatmap_${activeTerm.name.toLowerCase().replace(/ /g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('CSV export failed', e);
    }
  };

  return (
    <div className="space-y-6" id="term-attendance-heatmap-panel">
      {/* Visual Title Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between pb-4 border-b border-neutral-900 gap-4">
        <div>
          <span className="text-[9px] text-emerald-400 font-mono tracking-widest font-black uppercase bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-xs">
            Term Presence Analytics
          </span>
          <h3 className="text-xl font-black uppercase italic text-white tracking-tight mt-2.5 flex items-center gap-2">
            <Calendar className="text-emerald-400" size={18} /> 
            <span>Academic Term Attendance Frequency Heatmap</span>
          </h3>
          <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider mt-1.5 font-bold">
            Monitor complete weekday presence density & classroom attendance patterns over the active term schedule
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Color Palettes Picker */}
          <div className="bg-neutral-950 p-1.5 border border-neutral-850 flex items-center gap-1.5">
            <span className="text-[8px] font-mono uppercase text-neutral-500 px-1.5 font-black flex items-center gap-1">
              <Palette size={10} className="text-neutral-400" /> Theme:
            </span>
            {(['emerald', 'sapphire', 'orchid', 'cyberpunk'] as PaletteType[]).map(pName => (
              <button
                key={pName}
                onClick={() => setColorPalette(pName)}
                className={`px-2 py-0.5 text-[8.5px] font-mono uppercase font-black tracking-tighter border rounded-xs cursor-pointer transition-all ${
                  colorPalette === pName 
                    ? 'bg-neutral-900 text-white border-neutral-700' 
                    : 'text-neutral-500 hover:text-white border-transparent'
                }`}
              >
                {pName}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportTermHeatmapCSV}
            className="py-2.5 px-4 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-white border border-neutral-800 flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
            title="Download full academic term presence ledger as CSV"
          >
            <Download size={11} className="text-emerald-400" />
            <span>Export Term Report</span>
          </button>
        </div>
      </div>

      {/* Dynamic Key Metrics Board */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-neutral-950 border-2 border-neutral-850 p-5 relative overflow-hidden">
          <div className="space-y-1 text-left">
            <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest block font-mono">Term Presence Average</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-mono font-black text-emerald-400">{aggregatedTermStats.averageRate.toFixed(1)}%</span>
            </div>
            <p className="text-[9px] text-neutral-500 leading-tight">Average presence rate across all previous school days of the active term.</p>
          </div>
          <div className="absolute right-3.5 bottom-3.5 opacity-10">
            <TrendingUp size={36} className="text-emerald-400" />
          </div>
        </div>

        <div className="bg-neutral-950 border-2 border-neutral-850 p-5 relative overflow-hidden">
          <div className="space-y-1 text-left">
            <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest block font-mono">Active Term Students</span>
            <span className="text-2xl font-mono font-black text-purple-300 block">{filteredStudents.length} pupils</span>
            <p className="text-[9px] text-neutral-500 leading-tight">Count of active filtered students monitored in current heatmap cohort.</p>
          </div>
          <div className="absolute right-3.5 bottom-3.5 opacity-10">
            <Users size={36} className="text-purple-400" />
          </div>
        </div>

        <div className="bg-neutral-950 border-2 border-neutral-850 p-5 relative overflow-hidden">
          <div className="space-y-1 text-left">
            <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest block font-mono">Lowest Presence Weekday</span>
            <span className="text-2xl font-mono font-black text-amber-300 block">{aggregatedTermStats.hardestWeekdayName || '---'}</span>
            <p className="text-[9px] text-neutral-500 leading-tight">
              Weekday with historically lowest attendance (avg. <strong className="text-amber-400">{aggregatedTermStats.hardestWeekdayRate.toFixed(0)}%</strong>).
            </p>
          </div>
          <div className="absolute right-3.5 bottom-3.5 opacity-10">
            <AlertTriangle size={36} className="text-amber-400" />
          </div>
        </div>

        <div className="bg-neutral-950 border-2 border-neutral-850 p-5 relative overflow-hidden">
          <div className="space-y-1 text-left">
            <span className="text-[9px] font-black text-sky-400 uppercase tracking-widest block font-mono">Term Peak Attendance</span>
            <span className="text-2xl font-mono font-black text-sky-300 block">
              {aggregatedTermStats.peakDay ? `${aggregatedTermStats.peakDay.rate.toFixed(0)}%` : '---'}
            </span>
            <p className="text-[9px] text-neutral-500 leading-tight">
              Highest single-day attendance record reached on <strong className="text-sky-400 font-mono">{formatDateLabel(aggregatedTermStats.peakDay?.dateStr)}</strong>.
            </p>
          </div>
          <div className="absolute right-3.5 bottom-3.5 opacity-10">
            <CheckCircle size={36} className="text-sky-400" />
          </div>
        </div>
      </div>

      {/* Cohort Filtration Toolbar */}
      <div className="bg-neutral-900 border-2 border-neutral-800 p-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex items-center gap-2 text-neutral-400 font-mono text-[10px] uppercase font-black pr-2 border-r border-neutral-800 shrink-0">
          <Filter size={12} className="text-emerald-400" /> Filters:
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {/* Classroom Selection */}
          <div className="flex items-center gap-3 w-full">
            <span className="text-[9px] font-mono font-black text-neutral-500 uppercase whitespace-nowrap">Classroom:</span>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value as StudentClass | 'all')}
              className="w-full bg-neutral-950 border border-neutral-800 py-2 px-3 text-[10px] font-mono text-white focus:outline-none focus:border-emerald-400 rounded-none uppercase cursor-pointer"
            >
              <option value="all">All School Classes ({students.length} pupils)</option>
              {['Nursery', 'KG1', 'KG2', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9'].map(cls => (
                <option key={cls} value={cls}>Class {cls} ({students.filter(s => s.active && s.class === cls).length} pupils)</option>
              ))}
            </select>
          </div>

          {/* Gender Filter Selection */}
          <div className="flex items-center gap-3 w-full">
            <span className="text-[9px] font-mono font-black text-neutral-500 uppercase whitespace-nowrap">Gender:</span>
            <div className="flex bg-neutral-950 p-0.5 border border-neutral-800 w-full items-center gap-1">
              {(['all', 'Male', 'Female'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setSelectedGender(g)}
                  className={`flex-1 py-1 text-[9px] font-mono font-black uppercase tracking-wider text-center cursor-pointer transition-all border ${
                    selectedGender === g 
                      ? 'bg-neutral-900 text-white border-neutral-700' 
                      : 'text-neutral-500 hover:text-white border-transparent'
                  }`}
                >
                  {g === 'all' ? 'All' : g}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Heatmap Visual Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* The Matrix Heatmap Grid - 7 Columns Span */}
        <div className="xl:col-span-8 bg-neutral-950 border-2 border-neutral-850 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-neutral-900">
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Presence Matrix Grid
              </h4>
              <p className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest mt-0.5">
                Select a cell to inspect individual pupil logs and classroom breakdowns for that school day.
              </p>
            </div>

            {/* Colors Legends bar */}
            <div className="flex flex-wrap gap-2.5 text-[8.5px] font-mono font-black uppercase text-neutral-500">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-950 border border-rose-900 block" />
                <span>&lt;50%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-950 border border-amber-800 block" />
                <span>50-70%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-900/70 border border-emerald-850 block" />
                <span>70-85%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-700 border border-emerald-600 block" />
                <span>85-95%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 border border-emerald-400 block" />
                <span>&ge;95%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-950/40 border border-blue-900/60 block text-[7px] text-blue-400 font-black flex items-center justify-center">H</span>
                <span>Holiday</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-neutral-900/25 border-dashed border-neutral-800 block" />
                <span>Upcoming</span>
              </div>
            </div>
          </div>

          {!activeTerm ? (
            <div className="py-24 text-center">
              <AlertTriangle className="mx-auto text-amber-500 mb-2 animate-bounce" size={24} />
              <p className="text-xs font-mono font-bold text-neutral-450 uppercase">No Active Term Found</p>
              <p className="text-[10px] font-mono text-neutral-550 uppercase mt-1">Please configure an active term under system settings first.</p>
            </div>
          ) : (
            <div className="overflow-x-auto select-none border border-neutral-900">
              <table className="w-full table-fixed min-w-[550px] border-collapse text-left">
                <thead>
                  <tr className="bg-neutral-900/50 border-b border-neutral-850 font-mono text-[9px] font-black uppercase text-neutral-400 tracking-wider">
                    <th className="py-2 px-3 w-[80px] sticky left-0 bg-neutral-950 z-10 border-r border-neutral-850 text-center">
                      Week
                    </th>
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((dayName, idx) => (
                      <th key={idx} className="py-2 px-3 text-center font-bold">
                        {dayName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900 text-neutral-300">
                  {Array.from({ length: maxTermWeeks }).map((_, wIdx) => {
                    const weekNum = wIdx + 1;
                    const weekCells = matrixData[weekNum] || {};

                    return (
                      <tr key={weekNum} className="hover:bg-neutral-900/20 transition-colors">
                        {/* Week Column Header */}
                        <td className="py-1 px-2 border-r border-neutral-850 bg-neutral-950 font-mono font-black text-center text-neutral-400 text-[10px] sticky left-0 z-10 flex flex-col justify-center h-13">
                          <span className="text-[8px] text-neutral-500 uppercase font-black leading-none tracking-widest">Wk</span>
                          <span className="text-white text-xs font-bold leading-tight">{weekNum}</span>
                        </td>

                        {/* Monday to Friday Cells */}
                        {[1, 2, 3, 4, 5].map(weekdayNum => {
                          const cell = weekCells[weekdayNum];

                          if (!cell) {
                            // Missing day in this week's records (e.g. term started mid-week)
                            return (
                              <td key={weekdayNum} className="p-1">
                                <div className="w-full h-11 border border-neutral-900 bg-neutral-950/20 flex items-center justify-center text-[10px] text-neutral-600 font-mono italic rounded-xs select-none">
                                  ---
                                </div>
                              </td>
                            );
                          }

                          const stats = dayStatsMap[cell.dateStr];
                          const isSelected = activeDayStr === cell.dateStr;

                          return (
                            <td key={weekdayNum} className="p-1 text-center">
                              <div
                                onClick={() => setSelectedDayStr(cell.dateStr)}
                                className={getCellClasses(cell.rate, cell.isHoliday, cell.isFuture, isSelected)}
                              >
                                {cell.isFuture ? (
                                  <>
                                    <span className="text-[9px] font-semibold text-neutral-500">{formatDateLabel(cell.dateStr)}</span>
                                    <span className="text-[7px] text-neutral-600 tracking-tighter uppercase font-bold">SCHED</span>
                                  </>
                                ) : cell.isHoliday ? (
                                  <>
                                    <span className="text-[9px] font-extrabold text-blue-300">{formatDateLabel(cell.dateStr)}</span>
                                    <span className="text-[8px] text-blue-400 font-black tracking-widest">HOLIDAY</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-[9px] font-semibold leading-tight opacity-75">{formatDateLabel(cell.dateStr)}</span>
                                    <span className="text-[11px] font-mono font-black leading-none mt-0.5">
                                      {cell.rate.toFixed(0)}%
                                    </span>
                                    <span className="text-[7.5px] tracking-tight leading-none opacity-60 font-medium">
                                      ({stats?.presentCount}/{stats?.totalActiveCount})
                                    </span>
                                  </>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Color palette notice / tip info */}
          <div className="bg-neutral-900 p-4 border border-neutral-850 flex items-start gap-3 rounded-xs text-left">
            <Info className="text-emerald-400 shrink-0 mt-0.5" size={14} />
            <div className="space-y-1">
              <span className="text-[9.5px] font-black uppercase text-emerald-400 tracking-wider block font-mono">
                Presence Density Calculations
              </span>
              <p className="text-[10px] text-neutral-400 leading-relaxed font-medium">
                This matrix is styled using a non-linear color grading algorithm designed for the Savannah Region's academic environments. 
                Days with <strong className="text-white">&ge;95% attendance</strong> shine in solid neon, indicating top compliance. 
                Days below <strong className="text-white">70%</strong> indicate higher risks, which can be inspected directly on selection to generate immediate guardian follow-up alerts.
              </p>
            </div>
          </div>
        </div>

        {/* Selected Day Inspector Panel - 4 Columns Span */}
        <div className="xl:col-span-4 space-y-4 text-left">
          <div className="bg-neutral-900 border-2 border-neutral-800 p-5 space-y-5 rounded-xs relative">
            <div className="border-b border-neutral-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[8px] font-mono text-neutral-400 font-black uppercase tracking-widest block">Day Inspector</span>
                <h4 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-1.5 mt-0.5 font-mono">
                  {selectedDayDetails ? (
                    <>
                      <Calendar size={13} className="text-emerald-400" />
                      <span>{new Date(selectedDayDetails.dateStr).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </>
                  ) : (
                    <span>No Day Selected</span>
                  )}
                </h4>
              </div>
              {selectedDayDetails?.isHoliday && (
                <span className="bg-blue-950 border border-blue-800 text-blue-300 text-[8px] font-black px-2 py-0.5 uppercase tracking-widest rounded-xs">
                  Public Holiday
                </span>
              )}
              {selectedDayDetails?.isFuture && (
                <span className="bg-neutral-950 border border-neutral-800 text-neutral-500 text-[8px] font-black px-2 py-0.5 uppercase tracking-widest rounded-xs">
                  Upcoming
                </span>
              )}
              {selectedDayDetails && !selectedDayDetails.isHoliday && !selectedDayDetails.isFuture && (
                <span className={`text-[8.5px] font-black px-2 py-0.5 uppercase tracking-wider rounded-xs border ${
                  selectedDayDetails.rate >= 90 
                    ? 'bg-emerald-950 border-emerald-800 text-emerald-300' 
                    : selectedDayDetails.rate >= 70 
                      ? 'bg-amber-950 border-amber-800 text-amber-300' 
                      : 'bg-rose-950 border-rose-900 text-rose-300'
                }`}>
                  {selectedDayDetails.rate.toFixed(1)}% Present
                </span>
              )}
            </div>

            {selectedDayDetails ? (
              <div className="space-y-5">
                {/* Visual Status Indicator Circular Ring or Progress Gauge */}
                {!selectedDayDetails.isHoliday && !selectedDayDetails.isFuture && (
                  <div className="bg-neutral-950 p-4 border border-neutral-850 space-y-3 rounded-xs">
                    <span className="text-[8.5px] font-mono text-neutral-500 font-extrabold uppercase tracking-widest block">Presence Distribution Check</span>
                    <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
                      <div className="bg-neutral-900/60 p-2.5 border border-neutral-800">
                        <span className="text-[8.5px] text-emerald-400 uppercase tracking-tight block font-bold">Present</span>
                        <span className="text-lg font-black text-white block mt-0.5">{selectedDayDetails.presentCount}</span>
                        <span className="text-[8px] text-neutral-500">pupils</span>
                      </div>
                      <div className="bg-neutral-900/60 p-2.5 border border-neutral-800">
                        <span className="text-[8.5px] text-rose-455 uppercase tracking-tight block font-bold">Absent</span>
                        <span className="text-lg font-black text-rose-500 block mt-0.5">{selectedDayDetails.absentCount}</span>
                        <span className="text-[8px] text-neutral-500">pupils</span>
                      </div>
                      <div className="bg-neutral-900/60 p-2.5 border border-neutral-800">
                        <span className="text-[8.5px] text-neutral-400 uppercase tracking-tight block font-bold">Unmarked</span>
                        <span className="text-lg font-black text-neutral-300 block mt-0.5">{selectedDayDetails.unmarkedCount}</span>
                        <span className="text-[8px] text-neutral-500">pupils</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[8px] text-neutral-500 font-black uppercase font-mono">
                        <span>Cohort Present Rate</span>
                        <span className="text-white">{selectedDayDetails.rate.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-900 border border-neutral-800 rounded-sm overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 transition-all duration-300"
                          style={{ width: `${selectedDayDetails.rate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedDayDetails.isHoliday && (
                  <div className="py-12 text-center bg-blue-950/20 border border-blue-900/40 p-4 rounded-xs">
                    <Info className="mx-auto text-blue-400 mb-2" size={18} />
                    <span className="text-[10px] font-mono font-black text-blue-300 uppercase tracking-widest block">No Attendance Tracked</span>
                    <p className="text-[9px] text-neutral-400 font-mono uppercase tracking-wider mt-1.5">
                      This day was flagged as a public holiday. Fees are non-billable and gate checks are deactivated.
                    </p>
                  </div>
                )}

                {selectedDayDetails.isFuture && (
                  <div className="py-12 text-center bg-neutral-950 border border-neutral-850 p-4 rounded-xs">
                    <Calendar className="mx-auto text-neutral-500 mb-2" size={18} />
                    <span className="text-[10px] font-mono font-black text-neutral-400 uppercase tracking-widest block">Upcoming School Day</span>
                    <p className="text-[9px] text-neutral-500 font-mono uppercase tracking-wider mt-1.5">
                      Scheduled date in the future. Registers will open automatically once the school day reaches local time.
                    </p>
                  </div>
                )}

                {/* Classroom breakups table for marked day */}
                {!selectedDayDetails.isHoliday && !selectedDayDetails.isFuture && (
                  <div className="space-y-2.5">
                    <span className="text-[9px] font-mono text-neutral-500 font-black uppercase tracking-widest block border-b border-neutral-800 pb-1">
                      Classroom Performance Ranking
                    </span>
                    <div className="max-h-[140px] overflow-y-auto border border-neutral-850 rounded-xs font-mono text-[10px] divide-y divide-neutral-850 bg-neutral-950">
                      {selectedDayDetails.classBreakout.map((clsItem, idx) => (
                        <div key={idx} className="p-2 flex items-center justify-between hover:bg-neutral-900/40 transition-colors">
                          <span className="font-extrabold text-neutral-300">Class {clsItem.class}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-neutral-500 text-[9px]">({clsItem.present}/{clsItem.total} present)</span>
                            <span className={`font-black uppercase text-[9px] ${
                              clsItem.rate >= 90 ? 'text-emerald-400' : clsItem.rate >= 70 ? 'text-amber-400' : 'text-rose-400'
                            }`}>
                              {clsItem.rate.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* List of Absentees for Marked Day */}
                {!selectedDayDetails.isHoliday && !selectedDayDetails.isFuture && (
                  <div className="space-y-3 pt-1">
                    <span className="text-[9px] font-mono text-neutral-500 font-black uppercase tracking-widest block border-b border-neutral-800 pb-1">
                      Absentees Flagged ({selectedDayDetails.absentList.length})
                    </span>

                    {selectedDayDetails.absentList.length === 0 ? (
                      <div className="py-6 text-center bg-neutral-950 border border-neutral-850 rounded-xs">
                        <CheckCircle className="mx-auto text-emerald-500 opacity-80 mb-1.5" size={16} />
                        <span className="text-[9px] font-mono text-emerald-400 font-black uppercase tracking-wider">Perfect Attendance!</span>
                        <p className="text-[8.5px] text-neutral-500 font-mono mt-0.5">No pupils registered as absent on this school day.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                        {selectedDayDetails.absentList.map(student => (
                          <div 
                            key={student.id} 
                            className="bg-neutral-950 border border-neutral-850 p-2.5 flex items-center justify-between gap-3 hover:border-neutral-700 transition-all rounded-xs"
                          >
                            <div className="space-y-1 text-left min-w-0">
                              <span className="font-bold text-white block truncate text-[10.5px]">{student.name}</span>
                              <div className="flex items-center gap-2 text-[8px] font-mono font-bold text-neutral-500 uppercase">
                                <span className="bg-neutral-900 border border-neutral-800 px-1 py-0.5 rounded-sm text-purple-400">Class {student.class}</span>
                                <span>{student.rollNumber}</span>
                              </div>
                            </div>

                            {/* Guarding alert sending trigger */}
                            {student.guardianPhone ? (
                              <div className="flex items-center gap-1.5">
                                {whatsappResult?.studentId === student.id && (
                                  <span className={`text-[8px] font-mono font-black uppercase px-1.5 py-0.5 ${
                                    whatsappResult.success ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-rose-950 text-rose-400 border border-rose-900'
                                  }`}>
                                    {whatsappResult.success ? 'Sent' : 'Fail'}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleSendWhatsAppAlert(student, selectedDayDetails.dateStr)}
                                  disabled={whatsappSendingMap[student.id]}
                                  className="py-1 px-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-750 text-neutral-300 font-mono text-[8px] font-black uppercase tracking-wider rounded-xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                                  title={`Push immediate automated absenteeism alert to ${student.parentName || 'guardian'} (${student.guardianPhone})`}
                                >
                                  <Smartphone size={10} className="text-amber-500" />
                                  <span>{whatsappSendingMap[student.id] ? 'Alerting...' : 'Alert'}</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[8px] font-mono text-neutral-600 font-extrabold uppercase">No Contact</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-24 text-center">
                <Calendar className="mx-auto text-neutral-600 mb-2 animate-pulse" size={24} />
                <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest font-black">Select a Day on Grid</p>
                <p className="text-[9px] font-mono text-neutral-600 uppercase tracking-wider mt-1">
                  Inspect stats, class ratios, and push notification triggers for any school date.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
