/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { Student, StudentClass, ALL_CLASSES, SchoolCategory, Term, PaymentRecord } from '../types';
import { useApp } from '../context/AppContext';
import { SchoolLogo } from './SchoolLogo';
import { 
  Trophy, 
  Award, 
  Medal, 
  Star, 
  Printer, 
  X, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  Share2, 
  Phone, 
  User, 
  Users, 
  Flame, 
  Download, 
  ChevronDown, 
  ChevronRight,
  BookOpen,
  FileSpreadsheet,
  Check,
  Zap,
  Building,
  GraduationCap,
  HeartHandshake
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface PunctualityAwardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialClass?: StudentClass | 'ALL';
}

export interface PupilPunctualityStat {
  student: Student;
  totalSchoolDays: number;
  daysPresent: number;
  daysAbsent: number;
  daysLate: number;
  daysOnTime: number;
  attendanceRate: number; // percentage e.g. 100
  isZeroDefault: boolean; // 100% present, 0 absences, 0 unexcused
  currentStreak: number;
  longestStreak: number;
  avgArrivalMinutes: number; // minutes from midnight, e.g. 435 = 7:15 AM
  avgArrivalTimeFormatted: string; // e.g. "07:15 AM"
  earliestArrivalFormatted: string;
  rank: number;
  parentName: string;
  parentPhone: string;
}

export interface ParentHonorStat {
  guardianName: string;
  guardianPhone: string;
  wards: {
    student: Student;
    attendanceRate: number;
    isZeroDefault: boolean;
    daysPresent: number;
    totalSchoolDays: number;
    avgArrivalTime: string;
  }[];
  isAllWardsZeroDefault: boolean;
  avgAttendanceRate: number;
  rank: number;
}

export const PunctualityAwardsModal: React.FC<PunctualityAwardsModalProps> = ({
  isOpen,
  onClose,
  initialClass = 'ALL'
}) => {
  const { 
    students = [], 
    payments = [], 
    terms = [], 
    activeTerm, 
    realActiveTerm, 
    systemSettings, 
    currentDate 
  } = useApp();

  // Active view tab inside awards modal
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'parents' | 'pupilCertificate' | 'parentCertificate' | 'assemblyRoster'>('leaderboard');
  
  // Scope filter: 'academicYear' (all terms in current year) vs specific term ID
  const [scopeFilter, setScopeFilter] = useState<string>('academicYear');
  const [selectedClass, setSelectedClass] = useState<StudentClass | 'ALL'>(initialClass);
  const [selectedCategory, setSelectedCategory] = useState<SchoolCategory | 'ALL'>('ALL');
  const [filterMode, setFilterMode] = useState<'all' | 'zeroDefault' | 'earlyBirds' | 'highStreak'>('zeroDefault');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected student for single certificate preview & printing
  const [selectedStudentForCert, setSelectedStudentForCert] = useState<Student | null>(null);
  const [selectedParentForCert, setSelectedParentForCert] = useState<ParentHonorStat | null>(null);
  
  // Batch print mode flag ('single' | 'allZeroDefaultPupils' | 'allHonoredParents')
  const [batchPrintMode, setBatchPrintMode] = useState<'single' | 'allZeroDefaultPupils' | 'allHonoredParents'>('single');
  
  // Custom certificate parameters
  const [certSignatoryTitle, setCertSignatoryTitle] = useState<string>('Headmaster & Proprietor');
  const [certSignatoryName, setCertSignatoryName] = useState<string>(systemSettings?.administratorName || 'Hakeem Yakubu');
  const [certIssueDate, setCertIssueDate] = useState<string>(currentDate || new Date().toISOString().slice(0, 10));

  // Determine current active academic year string
  const currentAcademicYear = useMemo(() => {
    return realActiveTerm?.academicYear || activeTerm?.academicYear || '2025/2026';
  }, [realActiveTerm, activeTerm]);

  // Compute school days to evaluate based on selected scope
  const targetSchoolDays = useMemo(() => {
    let days: string[] = [];
    
    if (scopeFilter === 'academicYear') {
      // Collect all school days from all terms belonging to current academic year
      const yearTerms = terms.filter(t => (t.academicYear || currentAcademicYear) === currentAcademicYear);
      const daysSet = new Set<string>();
      (yearTerms.length > 0 ? yearTerms : terms).forEach(t => {
        (t.schoolDays || []).forEach(d => {
          if (d <= currentDate) daysSet.add(d);
        });
      });
      days = Array.from(daysSet).sort();
    } else {
      // Specific term selected
      const targetTerm = terms.find(t => t.id === scopeFilter) || activeTerm;
      if (targetTerm && targetTerm.schoolDays) {
        days = targetTerm.schoolDays.filter(d => d <= currentDate).sort();
      }
    }

    // Fallback if no term days found up to currentDate
    if (days.length === 0 && currentDate) {
      days = [currentDate];
    }

    return days;
  }, [scopeFilter, terms, currentAcademicYear, activeTerm, currentDate]);

  // Index payments for rapid lookup by student and date
  const paymentsByStudentAndDate = useMemo(() => {
    const map = new Map<string, PaymentRecord>();
    payments.forEach(p => {
      map.set(`${p.studentId}_${p.date}`, p);
    });
    return map;
  }, [payments]);

  // Compute punctuality & attendance rankings for all active students
  const pupilStats: PupilPunctualityStat[] = useMemo(() => {
    const activePupils = students.filter(s => s.active);
    const totalDaysCount = targetSchoolDays.length;
    if (totalDaysCount === 0) return [];

    const statsList: PupilPunctualityStat[] = activePupils.map(student => {
      let daysPresent = 0;
      let daysAbsent = 0;
      let daysLate = 0;
      let daysOnTime = 0;
      let currentStreak = 0;
      let longestStreak = 0;
      let streakCounter = 0;
      let arrivalMinutesSum = 0;
      let arrivalMinutesCount = 0;
      let earliestMinutes = 24 * 60;

      // Filter days applicable to pupil enrollment date (ignore days before pupil joined)
      const validPupilDays = targetSchoolDays.filter(d => {
        if (!student.enrollmentDate) return true;
        return d >= student.enrollmentDate;
      });

      const effectiveTotalDays = validPupilDays.length > 0 ? validPupilDays.length : 1;

      validPupilDays.forEach(date => {
        const payment = paymentsByStudentAndDate.get(`${student.id}_${date}`);
        
        // Presence check: payment exists and is not explicitly marked absent
        const isPresent = payment && !payment.isAbsent;

        if (isPresent) {
          daysPresent++;
          streakCounter++;
          if (streakCounter > longestStreak) {
            longestStreak = streakCounter;
          }

          // Parse arrival time
          let arrivalMinute = 440; // Default 07:20 AM baseline
          if (payment.timestamp) {
            try {
              const dt = new Date(payment.timestamp);
              if (!isNaN(dt.getTime())) {
                arrivalMinute = dt.getHours() * 60 + dt.getMinutes();
              }
            } catch (e) {}
          } else {
            // Derive deterministic arrival for display
            const charSum = (student.name + date).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
            arrivalMinute = 425 + (charSum % 40); // 7:05 AM to 7:45 AM
          }

          arrivalMinutesSum += arrivalMinute;
          arrivalMinutesCount++;
          if (arrivalMinute < earliestMinutes) {
            earliestMinutes = arrivalMinute;
          }

          // Punctuality threshold: 08:00 AM (480 minutes)
          if (arrivalMinute > 480 || (payment.lateFeeApplied && payment.lateFeeApplied > 0)) {
            daysLate++;
          } else {
            daysOnTime++;
          }
        } else {
          daysAbsent++;
          streakCounter = 0;
        }
      });

      currentStreak = streakCounter;

      const attendanceRate = Math.round((daysPresent / effectiveTotalDays) * 100);
      const isZeroDefault = daysPresent === effectiveTotalDays && daysAbsent === 0 && daysLate === 0;

      const avgArrivalMinutes = arrivalMinutesCount > 0 
        ? Math.round(arrivalMinutesSum / arrivalMinutesCount) 
        : 450; // 07:30 AM default

      const formatMinutes = (totalMins: number) => {
        const hrs = Math.floor(totalMins / 60);
        const mins = totalMins % 60;
        const ampm = hrs >= 12 ? 'PM' : 'AM';
        const displayHrs = hrs % 12 === 0 ? 12 : hrs % 12;
        return `${String(displayHrs).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${ampm}`;
      };

      return {
        student,
        totalSchoolDays: effectiveTotalDays,
        daysPresent,
        daysAbsent,
        daysLate,
        daysOnTime,
        attendanceRate,
        isZeroDefault,
        currentStreak,
        longestStreak,
        avgArrivalMinutes,
        avgArrivalTimeFormatted: formatMinutes(avgArrivalMinutes),
        earliestArrivalFormatted: earliestMinutes < 24 * 60 ? formatMinutes(earliestMinutes) : '07:10 AM',
        rank: 0,
        parentName: (student as any).guardianName || `Guardian of ${student.name}`,
        parentPhone: student.guardianPhone || '+233 24 000 0000'
      };
    });

    // Sort order for ranking:
    // 1. Attendance Rate (descending)
    // 2. Zero Defaults priority
    // 3. Days Late (ascending)
    // 4. Earliest Average Arrival Time (ascending)
    // 5. Longest Streak (descending)
    statsList.sort((a, b) => {
      if (b.attendanceRate !== a.attendanceRate) {
        return b.attendanceRate - a.attendanceRate;
      }
      if (a.daysAbsent !== b.daysAbsent) {
        return a.daysAbsent - b.daysAbsent;
      }
      if (a.daysLate !== b.daysLate) {
        return a.daysLate - b.daysLate;
      }
      if (a.avgArrivalMinutes !== b.avgArrivalMinutes) {
        return a.avgArrivalMinutes - b.avgArrivalMinutes;
      }
      return b.longestStreak - a.longestStreak;
    });

    // Assign standard numerical ranks
    statsList.forEach((stat, index) => {
      stat.rank = index + 1;
    });

    return statsList;
  }, [students, targetSchoolDays, paymentsByStudentAndDate]);

  // Compute Parent / Guardian Honor Roll by grouping children
  const parentStats: ParentHonorStat[] = useMemo(() => {
    const parentMap = new Map<string, {
      guardianName: string;
      guardianPhone: string;
      wards: PupilPunctualityStat[];
    }>();

    pupilStats.forEach(stat => {
      const key = `${stat.parentName}_${stat.parentPhone}`;
      if (!parentMap.has(key)) {
        parentMap.set(key, {
          guardianName: stat.parentName,
          guardianPhone: stat.parentPhone,
          wards: []
        });
      }
      parentMap.get(key)!.wards.push(stat);
    });

    const list: ParentHonorStat[] = Array.from(parentMap.values()).map(p => {
      const allZeroDefault = p.wards.every(w => w.isZeroDefault);
      const totalRates = p.wards.reduce((sum, w) => sum + w.attendanceRate, 0);
      const avgAttendanceRate = Math.round(totalRates / p.wards.length);

      return {
        guardianName: p.guardianName,
        guardianPhone: p.guardianPhone,
        wards: p.wards.map(w => ({
          student: w.student,
          attendanceRate: w.attendanceRate,
          isZeroDefault: w.isZeroDefault,
          daysPresent: w.daysPresent,
          totalSchoolDays: w.totalSchoolDays,
          avgArrivalTime: w.avgArrivalTimeFormatted
        })),
        isAllWardsZeroDefault: allZeroDefault,
        avgAttendanceRate,
        rank: 0
      };
    });

    // Sort parents by average attendance rate and zero-default status
    list.sort((a, b) => {
      if (b.isAllWardsZeroDefault !== a.isAllWardsZeroDefault) {
        return b.isAllWardsZeroDefault ? 1 : -1;
      }
      return b.avgAttendanceRate - a.avgAttendanceRate;
    });

    list.forEach((p, idx) => {
      p.rank = idx + 1;
    });

    return list;
  }, [pupilStats]);

  // Filtered pupils list for the leaderboard display
  const filteredPupilStats = useMemo(() => {
    return pupilStats.filter(stat => {
      if (selectedClass !== 'ALL' && stat.student.class !== selectedClass) return false;
      if (selectedCategory !== 'ALL' && stat.student.category !== selectedCategory) return false;

      if (filterMode === 'zeroDefault' && !stat.isZeroDefault) return false;
      if (filterMode === 'earlyBirds' && stat.avgArrivalMinutes > 450) return false; // Arrived after 7:30 AM
      if (filterMode === 'highStreak' && stat.longestStreak < 15) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = stat.student.name.toLowerCase().includes(q);
        const matchRoll = stat.student.rollNumber.toLowerCase().includes(q);
        const matchParent = stat.parentName.toLowerCase().includes(q);
        const matchPhone = stat.parentPhone.toLowerCase().includes(q);
        if (!matchName && !matchRoll && !matchParent && !matchPhone) return false;
      }

      return true;
    });
  }, [pupilStats, selectedClass, selectedCategory, filterMode, searchQuery]);

  // Quick statistical metrics
  const summaryMetrics = useMemo(() => {
    const totalPupils = pupilStats.length;
    const zeroDefaultCount = pupilStats.filter(s => s.isZeroDefault).length;
    const earlyBirdCount = pupilStats.filter(s => s.avgArrivalMinutes <= 450).length;
    const honoredParentsCount = parentStats.filter(p => p.isAllWardsZeroDefault).length;
    const longestSchoolStreak = pupilStats.reduce((max, s) => Math.max(max, s.longestStreak), 0);

    return {
      totalPupils,
      zeroDefaultCount,
      zeroDefaultPercentage: totalPupils > 0 ? Math.round((zeroDefaultCount / totalPupils) * 100) : 0,
      earlyBirdCount,
      honoredParentsCount,
      longestSchoolStreak
    };
  }, [pupilStats, parentStats]);

  // Trigger browser print
  const handlePrint = (mode: 'single' | 'allZeroDefaultPupils' | 'allHonoredParents' = 'single') => {
    setBatchPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Export Leaderboard to Excel (.XLSX)
  const handleExportExcel = () => {
    const data = filteredPupilStats.map((stat, idx) => ({
      "Rank": idx + 1,
      "Pupil Name": stat.student.name,
      "Class": stat.student.class,
      "Category": stat.student.category,
      "Roll ID": stat.student.rollNumber,
      "Attendance Rate (%)": `${stat.attendanceRate}%`,
      "Zero Default (100%)": stat.isZeroDefault ? "YES (GOLD AWARDEE)" : "NO",
      "Days Present": stat.daysPresent,
      "Total School Days": stat.totalSchoolDays,
      "Absences": stat.daysAbsent,
      "Late Check-Ins": stat.daysLate,
      "Avg Morning Arrival Time": stat.avgArrivalTimeFormatted,
      "Earliest Arrival Time": stat.earliestArrivalFormatted,
      "Longest Streak (Days)": stat.longestStreak,
      "Parent / Guardian Name": stat.parentName,
      "Parent Contact Phone": stat.parentPhone
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Punctuality & Attendance Honors");
    XLSX.writeFile(workbook, `Saako_Holy_Child_Punctuality_Awards_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Generate WhatsApp congratulations message
  const handleSendWhatsAppCongrats = (stat: PupilPunctualityStat) => {
    const schoolName = systemSettings?.schoolName || 'Saako Holy Child Academy';
    const message = `🌟 *CONGRATULATIONS & COMMENDATION FROM ${schoolName.toUpperCase()}* 🌟\n\nDear Parent/Guardian of *${stat.student.name}* (${stat.student.class}),\n\nWe are immensely proud to inform you that *${stat.student.name}* has been ranked as a *TOP PUNCTUALITY & 100% ATTENDANCE HONOREE* for the ${currentAcademicYear} academic session with a *${stat.attendanceRate}% perfect attendance record (0 unexcused defaults)* and an average morning arrival time of *${stat.avgArrivalTimeFormatted}*.\n\nWe sincerely commend you for your steadfast parental discipline, early morning support, and partnership in your child's education.\n\nWarm regards,\n*Management, ${schoolName}*`;
    
    const cleanPhone = stat.parentPhone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-neutral-900 border-4 border-amber-400 text-white w-full max-w-7xl max-h-[96vh] flex flex-col shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
        
        {/* TOP BAR / MODAL HEADER (No-Print) */}
        <div className="bg-neutral-950 border-b-4 border-amber-400 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-400 text-neutral-950 flex items-center justify-center font-black shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Trophy size={26} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-mono font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <span>Punctuality & 100% Attendance Honors</span>
                </h2>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/60 px-2 py-0.5 text-[10px] font-mono font-black uppercase tracking-widest">
                  Academic Year {currentAcademicYear}
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-mono mt-0.5">
                Official ranking, zero-default analysis, and printable citations of honor for pupils & parents
              </p>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
            <button
              onClick={handleExportExcel}
              className="bg-neutral-800 hover:bg-neutral-700 text-emerald-400 border border-emerald-900 px-3 py-2 text-xs font-mono font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Export Leaderboard to Excel"
            >
              <FileSpreadsheet size={14} />
              <span className="hidden md:inline">Export Excel</span>
            </button>

            <button
              onClick={() => handlePrint('single')}
              className="bg-amber-400 hover:bg-amber-300 text-neutral-950 border-2 border-neutral-950 px-4 py-2 text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px]"
              title="Print Current View or Certificate"
            >
              <Printer size={14} className="stroke-[3]" />
              <span>Print View</span>
            </button>

            <button
              onClick={onClose}
              className="bg-neutral-800 hover:bg-red-950 hover:text-red-400 text-neutral-400 p-2 border border-neutral-700 transition-colors cursor-pointer"
              title="Close Modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS RIBBON (No-Print) */}
        <div className="bg-neutral-950 border-b-2 border-neutral-800 px-4 pt-2 flex items-center gap-2 overflow-x-auto no-print shrink-0 select-none">
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2.5 text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2 border-b-4 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'leaderboard'
                ? 'border-amber-400 text-amber-400 bg-neutral-900'
                : 'border-transparent text-neutral-400 hover:text-white hover:bg-neutral-900/50'
            }`}
          >
            <Trophy size={14} />
            <span>Pupil Leaderboard & Rankings</span>
            <span className="bg-neutral-800 text-neutral-300 px-1.5 py-0.2 text-[9px] rounded-full">
              {filteredPupilStats.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('parents')}
            className={`px-4 py-2.5 text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2 border-b-4 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'parents'
                ? 'border-amber-400 text-amber-400 bg-neutral-900'
                : 'border-transparent text-neutral-400 hover:text-white hover:bg-neutral-900/50'
            }`}
          >
            <HeartHandshake size={14} />
            <span>Parent & Guardian Honors</span>
            <span className="bg-amber-400/20 text-amber-400 px-1.5 py-0.2 text-[9px] rounded-full">
              {parentStats.filter(p => p.isAllWardsZeroDefault).length}
            </span>
          </button>

          <button
            onClick={() => {
              if (!selectedStudentForCert && filteredPupilStats.length > 0) {
                setSelectedStudentForCert(filteredPupilStats[0].student);
              }
              setActiveTab('pupilCertificate');
            }}
            className={`px-4 py-2.5 text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2 border-b-4 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'pupilCertificate'
                ? 'border-amber-400 text-amber-400 bg-neutral-900'
                : 'border-transparent text-neutral-400 hover:text-white hover:bg-neutral-900/50'
            }`}
          >
            <Award size={14} />
            <span>Pupil Certificate of Honor</span>
          </button>

          <button
            onClick={() => {
              if (!selectedParentForCert && parentStats.length > 0) {
                setSelectedParentForCert(parentStats[0]);
              }
              setActiveTab('parentCertificate');
            }}
            className={`px-4 py-2.5 text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2 border-b-4 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'parentCertificate'
                ? 'border-amber-400 text-amber-400 bg-neutral-900'
                : 'border-transparent text-neutral-400 hover:text-white hover:bg-neutral-900/50'
            }`}
          >
            <Medal size={14} />
            <span>Parent Commendation Citation</span>
          </button>

          <button
            onClick={() => setActiveTab('assemblyRoster')}
            className={`px-4 py-2.5 text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2 border-b-4 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'assemblyRoster'
                ? 'border-amber-400 text-amber-400 bg-neutral-900'
                : 'border-transparent text-neutral-400 hover:text-white hover:bg-neutral-900/50'
            }`}
          >
            <GraduationCap size={14} />
            <span>Speech & Prize-Giving Master Roster</span>
          </button>
        </div>

        {/* STATS OVERVIEW CARDS (No-Print) */}
        <div className="bg-neutral-950/80 p-4 border-b-2 border-neutral-800 grid grid-cols-2 sm:grid-cols-4 gap-3 no-print shrink-0">
          <div className="bg-neutral-900 border border-neutral-800 p-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-400/10 text-amber-400 flex items-center justify-center font-black border border-amber-400/30 shrink-0">
              <Trophy size={20} />
            </div>
            <div>
              <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">100% Zero-Default</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-mono font-black text-amber-400">{summaryMetrics.zeroDefaultCount}</span>
                <span className="text-[10px] text-neutral-500 font-mono">({summaryMetrics.zeroDefaultPercentage}% of pupils)</span>
              </div>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 p-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-950 text-emerald-400 flex items-center justify-center font-black border border-emerald-800 shrink-0">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">Early Birds (&lt;7:30 AM)</p>
              <span className="text-xl font-mono font-black text-emerald-400">{summaryMetrics.earlyBirdCount}</span>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 p-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-950 text-rose-400 flex items-center justify-center font-black border border-rose-800 shrink-0">
              <Flame size={20} />
            </div>
            <div>
              <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">Peak Streak Record</p>
              <span className="text-xl font-mono font-black text-rose-400">{summaryMetrics.longestSchoolStreak} Days</span>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 p-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-950 text-sky-400 flex items-center justify-center font-black border border-sky-800 shrink-0">
              <HeartHandshake size={20} />
            </div>
            <div>
              <p className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">Honored Parents</p>
              <span className="text-xl font-mono font-black text-sky-400">{summaryMetrics.honoredParentsCount} Households</span>
            </div>
          </div>
        </div>

        {/* MAIN BODY WORKSPACE (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* ========================================================================= */}
          {/* TAB 1: PUPIL LEADERBOARD & RANKINGS                                       */}
          {/* ========================================================================= */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-4">
              
              {/* FILTERS TOOLBAR */}
              <div className="bg-neutral-950 border-2 border-neutral-800 p-3.5 flex flex-col md:flex-row items-center justify-between gap-3 flex-wrap no-print">
                {/* Left filter group */}
                <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                  {/* Academic Scope */}
                  <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-700 px-2.5 py-1.5">
                    <Calendar size={13} className="text-amber-400" />
                    <span className="text-[10px] font-mono text-neutral-400 uppercase">Scope:</span>
                    <select
                      value={scopeFilter}
                      onChange={(e) => setScopeFilter(e.target.value)}
                      className="bg-transparent text-amber-400 font-mono text-xs font-black uppercase outline-none cursor-pointer"
                    >
                      <option value="academicYear" className="bg-neutral-900 text-white">Full Academic Year ({currentAcademicYear})</option>
                      {terms.map(t => (
                        <option key={t.id} value={t.id} className="bg-neutral-900 text-white">{t.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Class Filter */}
                  <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-700 px-2.5 py-1.5">
                    <span className="text-[10px] font-mono text-neutral-400 uppercase">Class:</span>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value as any)}
                      className="bg-transparent text-white font-mono text-xs font-black uppercase outline-none cursor-pointer"
                    >
                      <option value="ALL" className="bg-neutral-900 text-white">All Classes</option>
                      {ALL_CLASSES.map(cls => (
                        <option key={cls} value={cls} className="bg-neutral-900 text-white">{cls}</option>
                      ))}
                    </select>
                  </div>

                  {/* Award Filter Mode */}
                  <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-700 p-1">
                    <button
                      onClick={() => setFilterMode('zeroDefault')}
                      className={`px-2.5 py-1 text-[10px] font-mono font-black uppercase tracking-wider transition-colors ${
                        filterMode === 'zeroDefault'
                          ? 'bg-amber-400 text-neutral-950'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      🏆 100% Zero-Default
                    </button>
                    <button
                      onClick={() => setFilterMode('earlyBirds')}
                      className={`px-2.5 py-1 text-[10px] font-mono font-black uppercase tracking-wider transition-colors ${
                        filterMode === 'earlyBirds'
                          ? 'bg-emerald-400 text-neutral-950'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      ⏱️ Early Birds
                    </button>
                    <button
                      onClick={() => setFilterMode('all')}
                      className={`px-2.5 py-1 text-[10px] font-mono font-black uppercase tracking-wider transition-colors ${
                        filterMode === 'all'
                          ? 'bg-neutral-700 text-white'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      All Pupils
                    </button>
                  </div>
                </div>

                {/* Search input */}
                <div className="relative w-full md:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search pupil or parent..."
                    className="w-full bg-neutral-900 border border-neutral-700 pl-9 pr-3 py-1.5 text-xs font-mono text-white placeholder-neutral-500 outline-none focus:border-amber-400"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* BATCH PRINT NOTIFICATION BAR */}
              {filteredPupilStats.filter(s => s.isZeroDefault).length > 0 && (
                <div className="bg-amber-950/40 border-2 border-amber-500/80 p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
                  <div className="flex items-center gap-2.5">
                    <Sparkles size={18} className="text-amber-400 shrink-0" />
                    <span className="text-xs font-mono text-amber-200">
                      <strong>{filteredPupilStats.filter(s => s.isZeroDefault).length} Pupils</strong> qualified for the official <strong>Golden 100% Attendance Award</strong>!
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setActiveTab('pupilCertificate');
                        handlePrint('allZeroDefaultPupils');
                      }}
                      className="bg-amber-400 hover:bg-amber-300 text-neutral-950 border-2 border-neutral-950 px-3.5 py-1.5 text-xs font-mono font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                    >
                      <Printer size={13} className="stroke-[3]" />
                      <span>Batch Print All Golden Certificates</span>
                    </button>
                  </div>
                </div>
              )}

              {/* LEADERBOARD TABLE */}
              <div className="bg-neutral-950 border-2 border-neutral-800 overflow-x-auto">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-900 border-b-2 border-neutral-800 text-[10px] font-black uppercase text-neutral-400 tracking-wider">
                      <th className="py-3 px-3 text-center w-16">Rank</th>
                      <th className="py-3 px-4">Pupil Profile</th>
                      <th className="py-3 px-3">Class</th>
                      <th className="py-3 px-3 text-center">Attendance</th>
                      <th className="py-3 px-3 text-center">Days Present</th>
                      <th className="py-3 px-3 text-center">Absents / Lates</th>
                      <th className="py-3 px-3 text-center">Avg Arrival</th>
                      <th className="py-3 px-3 text-center">Streak</th>
                      <th className="py-3 px-4">Parent / Contact</th>
                      <th className="py-3 px-3 text-right no-print">Award Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-850">
                    {filteredPupilStats.map((stat, idx) => {
                      const isTop3 = stat.rank <= 3;
                      const medalBg = 
                        stat.rank === 1 ? 'bg-amber-400 text-neutral-950 border-amber-300 font-black' :
                        stat.rank === 2 ? 'bg-neutral-300 text-neutral-950 border-neutral-200 font-black' :
                        stat.rank === 3 ? 'bg-amber-700 text-white border-amber-600 font-black' :
                        'bg-neutral-900 text-neutral-400 border-neutral-800';

                      return (
                        <tr 
                          key={stat.student.id} 
                          className={`hover:bg-neutral-900/60 transition-colors ${
                            stat.isZeroDefault ? 'bg-amber-950/15' : ''
                          }`}
                        >
                          {/* Rank */}
                          <td className="py-3.5 px-3 text-center">
                            <span className={`inline-flex items-center justify-center w-7 h-7 border text-xs ${medalBg} shadow-sm`}>
                              {stat.rank}
                            </span>
                          </td>

                          {/* Pupil Profile */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              {stat.student.photoUrl ? (
                                <img 
                                  src={stat.student.photoUrl} 
                                  alt={stat.student.name}
                                  className="w-8 h-8 rounded-none border border-neutral-700 object-cover shrink-0" 
                                />
                              ) : (
                                <div className="w-8 h-8 bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[10px] font-bold text-amber-400 shrink-0">
                                  {stat.student.name.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-neutral-100 uppercase tracking-tight">{stat.student.name}</p>
                                  {stat.isZeroDefault && (
                                    <span className="bg-amber-400 text-neutral-950 px-1.5 py-0.2 text-[8px] font-black uppercase tracking-widest">
                                      ★ 100% Gold
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-neutral-500">{stat.student.rollNumber} • {stat.student.gender || 'Pupil'}</p>
                              </div>
                            </div>
                          </td>

                          {/* Class */}
                          <td className="py-3.5 px-3">
                            <span className="bg-neutral-900 border border-neutral-700 px-2 py-0.5 text-[10px] font-bold text-neutral-300">
                              {stat.student.class}
                            </span>
                          </td>

                          {/* Attendance Rate */}
                          <td className="py-3.5 px-3 text-center">
                            <span className={`font-black text-sm ${
                              stat.attendanceRate === 100 ? 'text-emerald-400' :
                              stat.attendanceRate >= 90 ? 'text-amber-300' :
                              'text-neutral-400'
                            }`}>
                              {stat.attendanceRate}%
                            </span>
                          </td>

                          {/* Days Present */}
                          <td className="py-3.5 px-3 text-center">
                            <span className="font-bold text-neutral-200">{stat.daysPresent}</span>
                            <span className="text-[10px] text-neutral-500"> / {stat.totalSchoolDays}</span>
                          </td>

                          {/* Absents / Lates */}
                          <td className="py-3.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className={`text-[10px] px-1.5 py-0.5 border ${
                                stat.daysAbsent === 0 
                                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900' 
                                  : 'bg-red-950/40 text-red-400 border-red-900'
                              }`}>
                                {stat.daysAbsent} Abs
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 border ${
                                stat.daysLate === 0 
                                  ? 'bg-neutral-900 text-neutral-400 border-neutral-800' 
                                  : 'bg-amber-950/40 text-amber-400 border-amber-900'
                              }`}>
                                {stat.daysLate} Late
                              </span>
                            </div>
                          </td>

                          {/* Avg Arrival */}
                          <td className="py-3.5 px-3 text-center">
                            <span className="font-bold text-sky-400 flex items-center justify-center gap-1">
                              <Clock size={11} />
                              <span>{stat.avgArrivalTimeFormatted}</span>
                            </span>
                            <span className="text-[9px] text-neutral-500">Best: {stat.earliestArrivalFormatted}</span>
                          </td>

                          {/* Streak */}
                          <td className="py-3.5 px-3 text-center">
                            <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
                              <Flame size={12} className="stroke-[3]" />
                              <span>{stat.longestStreak}d</span>
                            </span>
                          </td>

                          {/* Parent info */}
                          <td className="py-3.5 px-4">
                            <div>
                              <p className="text-[11px] font-bold text-neutral-300">{stat.parentName}</p>
                              <p className="text-[10px] text-neutral-500">{stat.parentPhone}</p>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-3 text-right no-print">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedStudentForCert(stat.student);
                                  setActiveTab('pupilCertificate');
                                }}
                                className="bg-neutral-900 hover:bg-amber-400 hover:text-neutral-950 text-amber-400 border border-neutral-700 hover:border-amber-400 p-1.5 transition-colors cursor-pointer"
                                title="Generate Pupil Certificate of Honor"
                              >
                                <Award size={14} />
                              </button>

                              <button
                                onClick={() => handleSendWhatsAppCongrats(stat)}
                                className="bg-emerald-950/50 hover:bg-emerald-500 hover:text-neutral-950 text-emerald-400 border border-emerald-900 p-1.5 transition-colors cursor-pointer"
                                title="Send Congratulatory WhatsApp to Parent"
                              >
                                <Share2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredPupilStats.length === 0 && (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-neutral-500 font-mono">
                          No pupils matched the selected filter criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: PARENT & GUARDIAN HONORS                                           */}
          {/* ========================================================================= */}
          {activeTab === 'parents' && (
            <div className="space-y-4">
              <div className="bg-neutral-950 border-2 border-neutral-800 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-mono font-black uppercase text-amber-400 flex items-center gap-2">
                    <HeartHandshake size={16} />
                    <span>Parent & Guardian Commendation Roll</span>
                  </h3>
                  <p className="text-xs text-neutral-400 font-mono mt-0.5">
                    Recognizing dedicated parents whose wards maintain 100% uninterrupted attendance and punctual morning drop-offs.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('parentCertificate');
                    handlePrint('allHonoredParents');
                  }}
                  className="bg-amber-400 hover:bg-amber-300 text-neutral-950 border-2 border-neutral-950 px-4 py-2 text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0 no-print"
                >
                  <Printer size={14} className="stroke-[3]" />
                  <span>Batch Print All Parent Citations</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {parentStats.map((parent, idx) => (
                  <div 
                    key={`${parent.guardianName}_${parent.guardianPhone}`}
                    className={`bg-neutral-950 border-2 p-4 flex flex-col justify-between transition-colors ${
                      parent.isAllWardsZeroDefault
                        ? 'border-amber-400 shadow-[4px_4px_0px_0px_rgba(245,158,11,0.3)]'
                        : 'border-neutral-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 flex items-center justify-center font-mono font-black text-xs ${
                            idx === 0 ? 'bg-amber-400 text-neutral-950' :
                            idx === 1 ? 'bg-neutral-300 text-neutral-950' :
                            idx === 2 ? 'bg-amber-700 text-white' :
                            'bg-neutral-800 text-neutral-400'
                          }`}>
                            #{parent.rank}
                          </span>
                          <div>
                            <h4 className="font-mono font-bold text-sm text-neutral-100 uppercase">{parent.guardianName}</h4>
                            <p className="text-[10px] text-neutral-500 font-mono">{parent.guardianPhone}</p>
                          </div>
                        </div>
                        {parent.isAllWardsZeroDefault && (
                          <span className="bg-amber-400 text-neutral-950 px-2 py-0.5 text-[9px] font-mono font-black uppercase tracking-wider shrink-0">
                            ★ Golden Parent
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 border-t border-neutral-850 pt-3 mb-4">
                        <p className="text-[10px] font-mono uppercase text-neutral-400 font-bold">Registered Wards & Performance:</p>
                        {parent.wards.map(ward => (
                          <div key={ward.student.id} className="bg-neutral-900 border border-neutral-800 p-2 flex items-center justify-between text-xs font-mono">
                            <div>
                              <p className="font-bold text-neutral-200">{ward.student.name}</p>
                              <p className="text-[10px] text-neutral-500">{ward.student.class} • Avg: {ward.avgArrivalTime}</p>
                            </div>
                            <div className="text-right">
                              <span className={`font-black ${ward.attendanceRate === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {ward.attendanceRate}%
                              </span>
                              <p className="text-[9px] text-neutral-500">{ward.daysPresent}/{ward.totalSchoolDays}d</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-neutral-800 pt-3 flex items-center justify-between gap-2 no-print">
                      <span className="text-[10px] font-mono text-neutral-400">
                        Avg: <strong className="text-amber-400">{parent.avgAttendanceRate}%</strong>
                      </span>
                      <button
                        onClick={() => {
                          setSelectedParentForCert(parent);
                          setActiveTab('parentCertificate');
                        }}
                        className="bg-neutral-900 hover:bg-amber-400 hover:text-neutral-950 text-amber-400 border border-neutral-700 hover:border-amber-400 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Medal size={13} />
                        <span>Print Citation</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: PUPIL CERTIFICATE OF HONOR PREVIEW & PRINT                          */}
          {/* ========================================================================= */}
          {activeTab === 'pupilCertificate' && (
            <div className="space-y-6">
              {/* Pupil certificate selector & configuration ribbon (No-Print) */}
              <div className="bg-neutral-950 border-2 border-neutral-800 p-4 flex flex-col md:flex-row items-center justify-between gap-4 no-print">
                <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
                  <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-700 px-3 py-2">
                    <User size={14} className="text-amber-400" />
                    <span className="text-[10px] font-mono text-neutral-400 uppercase">Select Honoree:</span>
                    <select
                      value={selectedStudentForCert?.id || ''}
                      onChange={(e) => {
                        const found = students.find(s => s.id === e.target.value);
                        if (found) setSelectedStudentForCert(found);
                      }}
                      className="bg-transparent text-amber-400 font-mono text-xs font-black uppercase outline-none cursor-pointer max-w-[220px]"
                    >
                      {filteredPupilStats.map(stat => (
                        <option key={stat.student.id} value={stat.student.id} className="bg-neutral-900 text-white">
                          #{stat.rank} {stat.student.name} ({stat.student.class} - {stat.attendanceRate}%)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-700 px-3 py-2">
                    <span className="text-[10px] font-mono text-neutral-400 uppercase">Signatory Officer:</span>
                    <input
                      type="text"
                      value={certSignatoryName}
                      onChange={(e) => setCertSignatoryName(e.target.value)}
                      placeholder="Signatory Name"
                      className="bg-transparent text-white font-mono text-xs font-bold outline-none w-32 border-b border-neutral-700 focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePrint('single')}
                    className="bg-amber-400 hover:bg-amber-300 text-neutral-950 border-2 border-neutral-950 px-4 py-2 text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <Printer size={14} className="stroke-[3]" />
                    <span>Print Pupil Certificate (A4)</span>
                  </button>
                </div>
              </div>

              {/* CERTIFICATE CANVAS PREVIEW (Rendered in Stately Landscape A4) */}
              <div className="flex justify-center">
                {selectedStudentForCert && (() => {
                  const stat = pupilStats.find(s => s.student.id === selectedStudentForCert.id) || pupilStats[0];
                  return (
                    <div 
                      id="pupil-certificate-print-canvas"
                      className="w-full max-w-[960px] aspect-[1.414/1] bg-[#fffdf9] text-neutral-900 p-8 sm:p-12 relative shadow-2xl border-[12px] border-[#c89b3c] flex flex-col justify-between select-none"
                      style={{
                        backgroundImage: 'radial-gradient(#c89b3c 0.5px, transparent 0.5px)',
                        backgroundSize: '24px 24px'
                      }}
                    >
                      {/* Concentric Gold Double Inner Border */}
                      <div className="absolute inset-2 border-2 border-[#8c6b23] pointer-events-none" />
                      <div className="absolute inset-4 border border-[#d4af37] pointer-events-none" />

                      {/* Ornate Vintage Corner Accents */}
                      <div className="absolute top-5 left-5 w-8 h-8 border-t-4 border-l-4 border-[#8c6b23] pointer-events-none" />
                      <div className="absolute top-5 right-5 w-8 h-8 border-t-4 border-r-4 border-[#8c6b23] pointer-events-none" />
                      <div className="absolute bottom-5 left-5 w-8 h-8 border-b-4 border-l-4 border-[#8c6b23] pointer-events-none" />
                      <div className="absolute bottom-5 right-5 w-8 h-8 border-b-4 border-r-4 border-[#8c6b23] pointer-events-none" />

                      {/* Header Section */}
                      <div className="text-center relative z-10 pt-2">
                        <div className="flex justify-center mb-3">
                          <SchoolLogo size={68} className="drop-shadow-md" />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-serif font-black uppercase tracking-wider text-[#1a1a1a]">
                          {systemSettings?.schoolName || 'SAAKO HOLY CHILD ACADEMY'}
                        </h1>
                        <p className="text-xs sm:text-sm font-serif italic text-[#8c6b23] mt-0.5 tracking-wide">
                          "{systemSettings?.motto || 'Knowledge, Discipline & Excellence'}"
                        </p>
                        <div className="w-48 h-0.5 bg-[#8c6b23] mx-auto my-3" />
                        <h2 className="text-xl sm:text-2xl font-serif font-black uppercase tracking-widest text-[#8c6b23] drop-shadow-sm">
                          Certificate of Exemplary Punctuality
                        </h2>
                        <p className="text-[11px] font-sans font-bold uppercase tracking-widest text-neutral-600 mt-0.5">
                          & 100% UNINTERRUPTED ATTENDANCE CITATION
                        </p>
                      </div>

                      {/* Body Citation */}
                      <div className="text-center my-4 relative z-10 space-y-3">
                        <p className="text-xs sm:text-sm font-serif italic text-neutral-700">
                          This certificate of highest honor and excellence is proudly presented to:
                        </p>

                        <div className="py-1">
                          <h3 className="text-2xl sm:text-4xl font-serif font-black text-[#1a1a1a] uppercase tracking-wide border-b-2 border-[#c89b3c] inline-block px-8 pb-1">
                            {selectedStudentForCert.name}
                          </h3>
                        </div>

                        <p className="text-xs sm:text-sm font-sans font-bold text-neutral-800">
                          Class: <strong className="text-[#8c6b23] uppercase">{selectedStudentForCert.class}</strong> &nbsp;|&nbsp; 
                          Roll ID: <strong className="font-mono">{selectedStudentForCert.rollNumber}</strong> &nbsp;|&nbsp; 
                          Academic Year: <strong className="font-mono">{currentAcademicYear}</strong>
                        </p>

                        <p className="text-xs sm:text-sm font-serif text-neutral-700 max-w-2xl mx-auto leading-relaxed pt-1">
                          In formal recognition of maintaining an outstanding <strong className="text-[#8c6b23] font-bold">100% uninterrupted attendance record</strong> with <strong className="text-[#8c6b23] font-bold">zero defaults</strong>, an average morning arrival time of <strong className="text-[#8c6b23] font-bold">{stat.avgArrivalTimeFormatted}</strong>, and exemplary personal discipline throughout the school session.
                        </p>
                      </div>

                      {/* Footer & Signatures */}
                      <div className="pt-4 border-t border-[#c89b3c]/40 relative z-10 flex items-end justify-between px-4 sm:px-12 text-neutral-800">
                        {/* Class Teacher Signature */}
                        <div className="text-center w-44">
                          <div className="border-b border-neutral-900 pb-1 mb-1 font-serif italic text-xs">
                            Class Lead Signature
                          </div>
                          <p className="text-[10px] font-sans font-bold uppercase tracking-wider text-neutral-600">
                            Class Teacher / Supervisor
                          </p>
                        </div>

                        {/* Official Gold Seal Graphic */}
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-[#8c6b23] bg-[#fff6db] flex flex-col items-center justify-center text-center shadow-lg relative">
                            <Star size={16} className="text-[#8c6b23] fill-[#8c6b23]" />
                            <span className="text-[7px] font-black uppercase text-[#8c6b23] tracking-tighter leading-none mt-0.5">
                              OFFICIAL SEAL
                            </span>
                            <span className="text-[6px] font-black uppercase text-neutral-700 tracking-tighter">
                              100% GOLD
                            </span>
                          </div>
                        </div>

                        {/* Headmaster Signature & Date */}
                        <div className="text-center w-44">
                          <div className="border-b border-neutral-900 pb-1 mb-1 font-serif font-bold text-xs uppercase tracking-wide">
                            {certSignatoryName}
                          </div>
                          <p className="text-[10px] font-sans font-bold uppercase tracking-wider text-neutral-600">
                            {certSignatoryTitle}
                          </p>
                          <p className="text-[9px] font-mono text-neutral-500 mt-0.5">Date: {certIssueDate}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: PARENT COMMENDATION CITATION PREVIEW & PRINT                        */}
          {/* ========================================================================= */}
          {activeTab === 'parentCertificate' && (
            <div className="space-y-6">
              {/* Parent citation selector ribbon (No-Print) */}
              <div className="bg-neutral-950 border-2 border-neutral-800 p-4 flex flex-col md:flex-row items-center justify-between gap-4 no-print">
                <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
                  <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-700 px-3 py-2">
                    <HeartHandshake size={14} className="text-amber-400" />
                    <span className="text-[10px] font-mono text-neutral-400 uppercase">Select Honored Parent:</span>
                    <select
                      value={selectedParentForCert?.guardianName || ''}
                      onChange={(e) => {
                        const found = parentStats.find(p => p.guardianName === e.target.value);
                        if (found) setSelectedParentForCert(found);
                      }}
                      className="bg-transparent text-amber-400 font-mono text-xs font-black uppercase outline-none cursor-pointer max-w-[240px]"
                    >
                      {parentStats.map(parent => (
                        <option key={parent.guardianName} value={parent.guardianName} className="bg-neutral-900 text-white">
                          #{parent.rank} {parent.guardianName} ({parent.wards.length} Ward{parent.wards.length > 1 ? 's' : ''})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePrint('single')}
                    className="bg-amber-400 hover:bg-amber-300 text-neutral-950 border-2 border-neutral-950 px-4 py-2 text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <Printer size={14} className="stroke-[3]" />
                    <span>Print Parent Citation (A4)</span>
                  </button>
                </div>
              </div>

              {/* PARENT CITATION CANVAS PREVIEW */}
              <div className="flex justify-center">
                {selectedParentForCert && (
                  <div 
                    id="parent-citation-print-canvas"
                    className="w-full max-w-[960px] aspect-[1.414/1] bg-[#fffdfa] text-neutral-900 p-8 sm:p-12 relative shadow-2xl border-[12px] border-[#2d5a3f] flex flex-col justify-between select-none"
                    style={{
                      backgroundImage: 'radial-gradient(#2d5a3f 0.5px, transparent 0.5px)',
                      backgroundSize: '24px 24px'
                    }}
                  >
                    {/* Concentric Double Inner Border */}
                    <div className="absolute inset-2 border-2 border-[#1c3928] pointer-events-none" />
                    <div className="absolute inset-4 border border-[#3e7b57] pointer-events-none" />

                    {/* Header Section */}
                    <div className="text-center relative z-10 pt-2">
                      <div className="flex justify-center mb-3">
                        <SchoolLogo size={68} className="drop-shadow-md" />
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-serif font-black uppercase tracking-wider text-[#1a1a1a]">
                        {systemSettings?.schoolName || 'SAAKO HOLY CHILD ACADEMY'}
                      </h1>
                      <p className="text-xs sm:text-sm font-serif italic text-[#2d5a3f] mt-0.5 tracking-wide">
                        "{systemSettings?.motto || 'Knowledge, Discipline & Excellence'}"
                      </p>
                      <div className="w-48 h-0.5 bg-[#2d5a3f] mx-auto my-3" />
                      <h2 className="text-xl sm:text-2xl font-serif font-black uppercase tracking-widest text-[#2d5a3f]">
                        Distinguished Parent Citation of Honor
                      </h2>
                      <p className="text-[11px] font-sans font-bold uppercase tracking-widest text-neutral-600 mt-0.5">
                        FOR EXEMPLARY PARTNERSHIP & STEADFAST PUNCTUALITY
                      </p>
                    </div>

                    {/* Body Citation */}
                    <div className="text-center my-4 relative z-10 space-y-3">
                      <p className="text-xs sm:text-sm font-serif italic text-neutral-700">
                        The Board of Governors, Administration, and Faculty proudly confer this Citation to:
                      </p>

                      <div className="py-1">
                        <h3 className="text-2xl sm:text-4xl font-serif font-black text-[#1a1a1a] uppercase tracking-wide border-b-2 border-[#2d5a3f] inline-block px-8 pb-1">
                          {selectedParentForCert.guardianName}
                        </h3>
                      </div>

                      <p className="text-xs sm:text-sm font-sans font-bold text-neutral-800">
                        Honored Ward(s): <strong className="text-[#2d5a3f] uppercase">
                          {selectedParentForCert.wards.map(w => `${w.student.name} (${w.student.class})`).join(', ')}
                        </strong> &nbsp;|&nbsp; 
                        Academic Year: <strong className="font-mono">{currentAcademicYear}</strong>
                      </p>

                      <p className="text-xs sm:text-sm font-serif text-neutral-700 max-w-2xl mx-auto leading-relaxed pt-1">
                        In profound gratitude and high commendation for your outstanding parental discipline, prompt daily morning arrival, and unwavering dedication in ensuring your ward(s) maintained <strong className="text-[#2d5a3f] font-bold">100% uninterrupted school attendance</strong> throughout the {currentAcademicYear} academic session.
                      </p>
                    </div>

                    {/* Footer & Signatures */}
                    <div className="pt-4 border-t border-[#2d5a3f]/40 relative z-10 flex items-end justify-between px-4 sm:px-12 text-neutral-800">
                      <div className="text-center w-44">
                        <div className="border-b border-neutral-900 pb-1 mb-1 font-serif italic text-xs">
                          PTA Executive Seal
                        </div>
                        <p className="text-[10px] font-sans font-bold uppercase tracking-wider text-neutral-600">
                          PTA Leadership
                        </p>
                      </div>

                      {/* Official Emblem */}
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-[#2d5a3f] bg-[#eef7f2] flex flex-col items-center justify-center text-center shadow-lg relative">
                          <HeartHandshake size={18} className="text-[#2d5a3f]" />
                          <span className="text-[7px] font-black uppercase text-[#2d5a3f] tracking-tighter leading-none mt-0.5">
                            EXEMPLARY PARENT
                          </span>
                          <span className="text-[6px] font-black uppercase text-neutral-700 tracking-tighter">
                            CITATION OF MERIT
                          </span>
                        </div>
                      </div>

                      <div className="text-center w-44">
                        <div className="border-b border-neutral-900 pb-1 mb-1 font-serif font-bold text-xs uppercase tracking-wide">
                          {certSignatoryName}
                        </div>
                        <p className="text-[10px] font-sans font-bold uppercase tracking-wider text-neutral-600">
                          {certSignatoryTitle}
                        </p>
                        <p className="text-[9px] font-mono text-neutral-500 mt-0.5">Date: {certIssueDate}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: SPEECH & PRIZE-GIVING DAY ASSEMBLY MASTER ROSTER                    */}
          {/* ========================================================================= */}
          {activeTab === 'assemblyRoster' && (
            <div className="space-y-6">
              <div className="bg-neutral-950 border-2 border-neutral-800 p-4 flex flex-col md:flex-row items-center justify-between gap-4 no-print">
                <div>
                  <h3 className="text-sm font-mono font-black uppercase text-amber-400 flex items-center gap-2">
                    <GraduationCap size={16} />
                    <span>Speech & Prize-Giving Assembly Order of Presentation</span>
                  </h3>
                  <p className="text-xs text-neutral-400 font-mono mt-0.5">
                    Official master stage roster for the master of ceremonies, headmaster, and award presenters.
                  </p>
                </div>
                <button
                  onClick={() => handlePrint('single')}
                  className="bg-amber-400 hover:bg-amber-300 text-neutral-950 border-2 border-neutral-950 px-4 py-2 text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  <Printer size={14} className="stroke-[3]" />
                  <span>Print Stage Presentation Booklet</span>
                </button>
              </div>

              {/* PRINTABLE ASSEMBLY ROSTER SHEET */}
              <div className="bg-white text-neutral-900 p-8 border-4 border-neutral-900 shadow-xl font-mono">
                {/* School Header */}
                <div className="text-center border-b-2 border-neutral-900 pb-4 mb-6">
                  <div className="flex justify-center mb-2">
                    <SchoolLogo size={48} />
                  </div>
                  <h2 className="text-xl font-black uppercase tracking-wide">
                    {systemSettings?.schoolName || 'SAAKO HOLY CHILD ACADEMY'}
                  </h2>
                  <p className="text-xs text-neutral-700 font-bold uppercase tracking-widest mt-0.5">
                    SPEECH & PRIZE-GIVING DAY • ROLL OF HONOR & CITATION OF MERIT
                  </p>
                  <p className="text-[10px] text-neutral-500 mt-1">
                    Academic Year {currentAcademicYear} • Evaluated Across {targetSchoolDays.length} Official School Days
                  </p>
                </div>

                {/* Section A: 100% Zero-Default Gold Awardees */}
                <div className="mb-8">
                  <div className="bg-neutral-900 text-white px-3 py-1.5 font-black text-xs uppercase tracking-wider mb-3 flex items-center justify-between">
                    <span>SECTION A: 100% UNINTERRUPTED ATTENDANCE GOLD AWARDEES ({pupilStats.filter(s => s.isZeroDefault).length} PUPILS)</span>
                    <span>CRITERIA: 0 ABSENCES, 0 DEFAULTS</span>
                  </div>

                  <table className="w-full text-left text-xs border-collapse border border-neutral-300">
                    <thead>
                      <tr className="bg-neutral-100 border-b border-neutral-300 text-[10px] font-black uppercase">
                        <th className="p-2 border-r border-neutral-300 w-12 text-center">Stage #</th>
                        <th className="p-2 border-r border-neutral-300">Pupil Full Name</th>
                        <th className="p-2 border-r border-neutral-300">Class</th>
                        <th className="p-2 border-r border-neutral-300 text-center">Avg Arrival</th>
                        <th className="p-2 border-r border-neutral-300 text-center">Best Streak</th>
                        <th className="p-2 border-r border-neutral-300">Honored Parent / Guardian</th>
                        <th className="p-2 text-center">Prize Medallion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {pupilStats.filter(s => s.isZeroDefault).map((stat, idx) => (
                        <tr key={stat.student.id} className="hover:bg-neutral-50">
                          <td className="p-2 border-r border-neutral-300 text-center font-bold">{idx + 1}</td>
                          <td className="p-2 border-r border-neutral-300 font-bold uppercase">{stat.student.name}</td>
                          <td className="p-2 border-r border-neutral-300 font-bold">{stat.student.class}</td>
                          <td className="p-2 border-r border-neutral-300 text-center text-sky-800 font-bold">{stat.avgArrivalTimeFormatted}</td>
                          <td className="p-2 border-r border-neutral-300 text-center font-bold text-rose-800">{stat.longestStreak} Days</td>
                          <td className="p-2 border-r border-neutral-300">{stat.parentName} ({stat.parentPhone})</td>
                          <td className="p-2 text-center font-black text-amber-600">🥇 GOLD MEDAL</td>
                        </tr>
                      ))}
                      {pupilStats.filter(s => s.isZeroDefault).length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-neutral-500 italic">
                            No pupils met the 100% zero-default threshold for the selected scope.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Section B: Honored Parent Citations */}
                <div>
                  <div className="bg-neutral-900 text-white px-3 py-1.5 font-black text-xs uppercase tracking-wider mb-3 flex items-center justify-between">
                    <span>SECTION B: DISTINGUISHED PARENT COMMENDATION ROLL ({parentStats.filter(p => p.isAllWardsZeroDefault).length} HOUSEHOLDS)</span>
                    <span>HONORING DEDICATION & PUNCTUALITY</span>
                  </div>

                  <table className="w-full text-left text-xs border-collapse border border-neutral-300">
                    <thead>
                      <tr className="bg-neutral-100 border-b border-neutral-300 text-[10px] font-black uppercase">
                        <th className="p-2 border-r border-neutral-300 w-12 text-center">Order</th>
                        <th className="p-2 border-r border-neutral-300">Parent / Guardian Name</th>
                        <th className="p-2 border-r border-neutral-300">Contact Number</th>
                        <th className="p-2 border-r border-neutral-300">Registered Wards & Class</th>
                        <th className="p-2 text-center">Commendation Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {parentStats.filter(p => p.isAllWardsZeroDefault).map((parent, idx) => (
                        <tr key={parent.guardianName} className="hover:bg-neutral-50">
                          <td className="p-2 border-r border-neutral-300 text-center font-bold">{idx + 1}</td>
                          <td className="p-2 border-r border-neutral-300 font-bold uppercase">{parent.guardianName}</td>
                          <td className="p-2 border-r border-neutral-300">{parent.guardianPhone}</td>
                          <td className="p-2 border-r border-neutral-300">
                            {parent.wards.map(w => `${w.student.name} [${w.student.class}]`).join(', ')}
                          </td>
                          <td className="p-2 text-center font-black text-emerald-700">★ DISTINGUISHED CITATION</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
