/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { SchoolCategory, StudentClass } from '../types';
import { 
  TrendingUp, 
  TrendingDown,
  Award, 
  AlertTriangle, 
  Coins, 
  RefreshCw, 
  Calendar, 
  PhoneCall, 
  Check, 
  ExternalLink,
  LayoutGrid,
  ListFilter,
  Users,
  Search,
  Activity,
  ArrowRightLeft,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend 
} from 'recharts';

export const Dashboard: React.FC = () => {
  const { 
    currentDate,
    setCurrentDate,
    payments, 
    getDailyStats, 
    getTeacherMetrics, 
    getCashFlowTrend, 
    getPendingAlerts,
    currentUser,
    terms,
    activeTerm,
    setActiveTerm,
    students,
    clearAllPayments,
    clearSampleStudents,
    pendingLocalEdits,
    seedFirebaseFromLocal,
    storageMode,
    users
  } = useApp();

  const [syncStatus, setSyncStatus] = useState<{ loading: boolean; error: string | null; successMessage: string | null }>({
    loading: false,
    error: null,
    successMessage: null
  });

  const handleSyncNow = async () => {
    setSyncStatus({ loading: true, error: null, successMessage: null });
    try {
      const result = await seedFirebaseFromLocal();
      if (result.success) {
        setSyncStatus({ loading: false, error: null, successMessage: result.message || 'Ledger successfully pushed to cloud database!' });
        setTimeout(() => {
          setSyncStatus(prev => ({ ...prev, successMessage: null }));
        }, 5500);
      } else {
        setSyncStatus({ loading: false, error: result.message || 'Seeding rejected. Target database is unreachable.', successMessage: null });
      }
    } catch (err: any) {
      setSyncStatus({ loading: false, error: err.message || 'Sync network error', successMessage: null });
    }
  };

  // Active Layout perspective state
  const [activeLayout, setActiveLayout] = useState<'bento' | 'class-perf' | 'alerts-desk' | 'weekly-aggregate'>('bento');

  // Confirmation state for resetting revenue or pupils list
  const [resetConfirming, setResetConfirming] = useState<'none' | 'payments' | 'both'>('none');

  // Dynamic daily goal for collections
  const [dailyGoal, setDailyGoal] = useState<number>(() => {
    const saved = localStorage.getItem('daily_collection_goal');
    return saved ? parseInt(saved, 10) : 500;
  });

  // Duty Roster State
  const [dutySearch, setDutySearch] = useState('');
  const [dutyFilter, setDutyFilter] = useState<'all' | 'active' | 'standby'>('all');
  const [dutyCopied, setDutyCopied] = useState(false);

  const handleUpdateDailyGoal = (newGoal: number) => {
    const goal = Math.max(1, newGoal);
    setDailyGoal(goal);
    localStorage.setItem('daily_collection_goal', goal.toString());
  };

  // Target audit date
  const [dateFilter, setDateFilter] = useState<string>(currentDate);

  // Synchronize dynamic dates from the central state
  React.useEffect(() => {
    setDateFilter(currentDate);
  }, [currentDate]);

  // Memoized daily list of duty roster assignments
  const dutyRoster = useMemo(() => {
    const classesList: StudentClass[] = [
      'Nursery', 'KG1', 'KG2',
      'B1', 'B2', 'B3', 'B4', 'B5', 'B6',
      'B7', 'B8', 'B9'
    ];

    return classesList.map((cls) => {
      // Find actual assigned teacher user or default fallback
      const assignedUser = users.find(u => u.role === 'Teacher' && (u.assignedClass === cls || u.assignedClasses?.includes(cls)) && u.active !== false);
      
      let teacherName = '';
      let email = 'N/A';
      if (assignedUser) {
        teacherName = assignedUser.name;
        email = assignedUser.email;
      } else {
        if (cls === 'Nursery') teacherName = 'Mrs. Abigail Mensah';
        else if (cls === 'B1') teacherName = 'Mr. Emmanuel Gyamfi';
        else if (cls === 'KG1') teacherName = 'Mrs. Grace Annan';
        else if (cls === 'KG2') teacherName = 'Mrs. Beatrice Boateng';
        else if (cls === 'B2') teacherName = 'Mr. Samuel Osei';
        else if (cls === 'B3') teacherName = 'Mr. Kofi Boateng';
        else if (cls === 'B4') teacherName = 'Mrs. Rita Owusu';
        else if (cls === 'B5') teacherName = 'Mr. Desmond Taylor';
        else if (cls === 'B6') teacherName = 'Mrs. Joyce Arthur';
        else if (cls === 'B7') teacherName = 'Mr. Richard Boadu';
        else if (cls === 'B8') teacherName = 'Madam Faustina Asare';
        else if (cls === 'B9') teacherName = 'Mr. Philip Ansah';
        else teacherName = 'Madam Mary Appiah';
      }

      // Specific class monitoring responsibility based on class category & grade
      let responsibility = "Gatekeeper & Registration Desk";
      let keyBadge = 'Pre-School';
      if (cls === 'Nursery') {
        responsibility = "Pre-School Gate Reception & Playground Safety Marshal";
        keyBadge = 'Nursery';
      } else if (cls === 'KG1') {
        responsibility = "Pre-School Gate Reception & Guardian Hand-off Organizer";
        keyBadge = 'KG1';
      } else if (cls === 'KG2') {
        responsibility = "KG Compound Monitor, Attendance & Health-status Sentry";
        keyBadge = 'KG2';
      } else if (cls === 'B1') {
        responsibility = "Gate Collector, Ledger Entry Officer & Pocket Receipt Dispatcher";
        keyBadge = 'Primary';
      } else if (cls === 'B2') {
        responsibility = "Class Overseer, Gatekeeper & Daily Token Issuance Officer";
        keyBadge = 'Primary';
      } else if (cls === 'B3') {
        responsibility = "B3 Gateway Marshaller & Classroom Attendance Check Controller";
        keyBadge = 'Primary';
      } else if (cls === 'B4') {
        responsibility = "Checkpoint Sentry, Guardian Liaison & Cash Flow Logger";
        keyBadge = 'Primary';
      } else if (cls === 'B5') {
        responsibility = "Hallway Corridor Patrol Officer & Compliance Gatekeeper";
        keyBadge = 'Primary';
      } else if (cls === 'B6') {
        responsibility = "Class Monitor & Central Academic Ledger Verification Auditor";
        keyBadge = 'Primary';
      } else if (cls === 'B7') {
        responsibility = "JHS Outer Fence Patrol Marshal & Assembly Gatekeeper Officer";
        keyBadge = 'JHS';
      } else if (cls === 'B8') {
        responsibility = "JHS Main Corridor Gate Superintendent & Homework Compliance Checker";
        keyBadge = 'JHS';
      } else if (cls === 'B9') {
        responsibility = "JHS Senior Exit Marshal & Latecomer Disciplinary Point Officer";
        keyBadge = 'JHS';
      }

      // Live Check-in Statistics for current date
      const classPayments = payments.filter(p => p.class === cls && p.date === dateFilter);
      const verifiedPayments = classPayments.filter(p => p.verified && !p.isAbsent);
      const hasCollectedToday = classPayments.some(p => p.collectedBy === teacherName);
      
      return {
        className: cls,
        teacherName,
        email,
        responsibility,
        hasCollectedToday,
        verifiedCount: verifiedPayments.length,
        isCustomUser: !!assignedUser,
        keyBadge,
      };
    });
  }, [users, payments, dateFilter]);

  // Filtered Roster Based on Search query and view filters
  const filteredDutyRoster = useMemo(() => {
    return dutyRoster.filter(item => {
      const matchesSearch = 
        item.teacherName.toLowerCase().includes(dutySearch.toLowerCase()) ||
        item.className.toLowerCase().includes(dutySearch.toLowerCase()) ||
        item.responsibility.toLowerCase().includes(dutySearch.toLowerCase());

      const matchesStatus = 
        dutyFilter === 'all' ? true :
        dutyFilter === 'active' ? item.hasCollectedToday :
        !item.hasCollectedToday;

      return matchesSearch && matchesStatus;
    });
  }, [dutyRoster, dutySearch, dutyFilter]);

  const handleCopyRosterText = () => {
    const header = `SAAKO HOLY CHILD ACADEMY - DUTY ROSTER FOR ${dateFilter}\n=========================================\n`;
    const body = dutyRoster.map((item, idx) => {
      return `${idx + 1}. [Class ${item.className}] Teacher: ${item.teacherName} | Status: ${item.hasCollectedToday ? 'ACTIVE ON DUTY' : 'STANDBY'} | Responsibility: ${item.responsibility}`;
    }).join('\n');
    
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(header + body);
      setDutyCopied(true);
      setTimeout(() => setDutyCopied(false), 2000);
    }
  };

  // Chart toggle metric state
  const [chartMetric, setChartMetric] = useState<'revenue' | 'volume'>('revenue');

  // Chart active view mode switch: 'trends' for manual SVG, 'recharts' for Recharts Line Chart
  const [chartView, setChartView] = useState<'trends' | 'recharts'>('recharts');

  // Helper to shift the selected week by -7 or +7 days
  const handleShiftWeek = (direction: 'prev' | 'next') => {
    const parts = dateFilter.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    
    const d = new Date(year, month, day);
    d.setDate(d.getDate() + (direction === 'prev' ? -7 : 7));
    
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const val = `${yyyy}-${mm}-${dd}`;
    setDateFilter(val);
    setCurrentDate(val);
  };

  // Memoized weekly aggregate collections per class
  const weeklyCollectionsData = useMemo(() => {
    // 1. Get the week's dates
    // Compute Monday of the week containing `dateFilter`
    const parts = dateFilter.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const targetDate = new Date(year, month, day);
    
    const dayOfWeek = targetDate.getDay(); // 0 Sunday, 1 Monday, ...
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(targetDate);
    monday.setDate(targetDate.getDate() + distanceToMonday);

    const weekdays: { dateStr: string; label: string; dateObj: Date }[] = [];
    const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    for (let i = 0; i < 7; i++) {
      const current = new Date(monday);
      current.setDate(monday.getDate() + i);
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      weekdays.push({
        dateStr: `${yyyy}-${mm}-${dd}`,
        label: dayLabels[i],
        dateObj: current,
      });
    }

    const classesList: StudentClass[] = [
      'Nursery', 'KG1', 'KG2',
      'B1', 'B2', 'B3', 'B4', 'B5', 'B6',
      'B7', 'B8', 'B9'
    ];

    // Helper to get monday date string for grouping historical averages
    const getMondayOfDate = (dateStr: string) => {
      const pParts = dateStr.split('-');
      if (pParts.length !== 3) return dateStr;
      const yStr = parseInt(pParts[0], 10);
      const mStr = parseInt(pParts[1], 10) - 1;
      const dStr = parseInt(pParts[2], 10);
      const targetD = new Date(yStr, mStr, dStr);
      if (isNaN(targetD.getTime())) return dateStr;
      const dOfWeek = targetD.getDay();
      const dist = dOfWeek === 0 ? -6 : 1 - dOfWeek;
      const mon = new Date(targetD);
      mon.setDate(targetD.getDate() + dist);
      return `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`;
    };

    // Calculate all weeks represented in verified payments
    const verifiedPayments = payments.filter(p => p.verified && p.isAbsent !== true);
    const uniqueWeeks: string[] = Array.from(new Set(verifiedPayments.map(p => getMondayOfDate(p.date))));
    const historyWeeksCount = uniqueWeeks.length;

    // Build the grid data: rows = classes
    const rows = classesList.map((cls) => {
      const dailyCollected: Record<string, number> = {};
      let classTotal = 0;

      weekdays.forEach((dayObj) => {
        // Collect verified payments for this class on this day
        const dayPayments = payments.filter(
          (p) => p.class === cls && p.date === dayObj.dateStr && p.verified && p.isAbsent !== true
        );
        const daySum = dayPayments.reduce((acc, curr) => acc + curr.amount, 0);
        dailyCollected[dayObj.dateStr] = daySum;
        classTotal += daySum;
      });

      // Calculate historical average
      const weeklyTotals: Record<string, number> = {};
      uniqueWeeks.forEach(w => { weeklyTotals[w] = 0; });

      const classPayments = verifiedPayments.filter(p => p.class === cls);
      classPayments.forEach(p => {
        const wk = getMondayOfDate(p.date);
        weeklyTotals[wk] = (weeklyTotals[wk] || 0) + p.amount;
      });

      const historicalSum = Object.values(weeklyTotals).reduce((sum, val) => sum + val, 0);
      let historicalAvg = historyWeeksCount > 0 ? (historicalSum / historyWeeksCount) : 0;

      // Fallback threshold if only 1 week exists (e.g. initial demo database or fresh term starting)
      const classStudentsCount = students ? students.filter(s => s.class === cls && s.active !== false).length : 6;
      const expectedWeeklyTarget = classStudentsCount * 18.0; // Benchmark target GHC 18 per active student

      if (historyWeeksCount <= 1) {
        historicalAvg = expectedWeeklyTarget || 60.0;
      }

      const isTrendingBelow = classTotal < historicalAvg;
      const percentDifference = historicalAvg > 0 ? ((classTotal - historicalAvg) / historicalAvg) * 100 : 0;

      return {
        className: cls,
        dailyCollected,
        classTotal,
        historicalAvg,
        isTrendingBelow,
        percentDifference,
      };
    });

    // Compute column-totals (totals per day)
    const dayTotals: Record<string, number> = {};
    let grandTotal = 0;
    
    weekdays.forEach((dayObj) => {
      let sumForDay = 0;
      rows.forEach((row) => {
        sumForDay += row.dailyCollected[dayObj.dateStr] || 0;
      });
      dayTotals[dayObj.dateStr] = sumForDay;
      grandTotal += sumForDay;
    });

    return {
      weekdays, // Mon to Sun details
      rows, // class name, daily values, class total
      dayTotals, // daily totals
      grandTotal, // grand total of week
      mondayStr: weekdays[0].dateStr,
      sundayStr: weekdays[6].dateStr,
    };
  }, [payments, dateFilter, students, setCurrentDate]);

  const peakDayInfo = useMemo(() => {
    const weekdays = weeklyCollectionsData.weekdays;
    const dayTotals = weeklyCollectionsData.dayTotals;
    let maxVal = -1;
    let maxDayLabel = 'N/A';
    let maxDateStr = '';
    weekdays.forEach(d => {
      const t = dayTotals[d.dateStr] || 0;
      if (t > maxVal) {
        maxVal = t;
        maxDayLabel = d.label;
        maxDateStr = d.dateStr;
      }
    });
    return {
      label: maxDayLabel,
      dateStr: maxDateStr,
      amount: maxVal,
    };
  }, [weeklyCollectionsData]);

  const topClassInfo = useMemo(() => {
    let maxVal = -1;
    let maxClassName = 'N/A';
    weeklyCollectionsData.rows.forEach(r => {
      if (r.classTotal > maxVal) {
        maxVal = r.classTotal;
        maxClassName = r.className;
      }
    });
    return {
      className: maxClassName,
      amount: maxVal,
    };
  }, [weeklyCollectionsData]);

  const weeklyChartData = useMemo(() => {
    return weeklyCollectionsData.weekdays.map(d => ({
      name: d.label.substring(0, 3).toUpperCase(),
      date: d.dateStr,
      revenue: weeklyCollectionsData.dayTotals[d.dateStr] || 0,
    }));
  }, [weeklyCollectionsData]);

  // Custom Recharts dark-theme tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-neutral-900 border-2 border-neutral-800 p-3 font-mono text-[10px] text-left uppercase space-y-1.5 shadow-2xl">
          <p className="font-extrabold text-amber-400 tracking-wider mb-1.5 border-b border-neutral-800 pb-1">{label}</p>
          {payload.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between gap-6 items-center">
              <span className="text-neutral-500 font-bold">{item.name}:</span>
              <span className="font-black" style={{ color: item.color || item.stroke }}>GHC {Number(item.value).toFixed(2)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Memoized data for last 7 days of the selected term
  const last7DaysData = useMemo(() => {
    if (!activeTerm || !activeTerm.schoolDays) return [];
    
    // Find index of the currently selected date map in the active term
    const selectedIndex = activeTerm.schoolDays.indexOf(dateFilter);
    let daysToUse: string[] = [];
    
    if (selectedIndex !== -1) {
      // Get up to 7 days ending at selectedIndex
      const startIdx = Math.max(0, selectedIndex - 6);
      daysToUse = activeTerm.schoolDays.slice(startIdx, selectedIndex + 1);
    } else {
      // Fallback: take the last 7 days of the entire term
      daysToUse = activeTerm.schoolDays.slice(-7);
    }
    
    // Support ensuring we always have at least 7 days/points if the term has enough
    if (daysToUse.length < 7 && activeTerm.schoolDays.length >= 7) {
      daysToUse = activeTerm.schoolDays.slice(-7);
    }

    return daysToUse.map(dStr => {
      const parts = dStr.split('-');
      const formattedDate = parts[2] && parts[1] ? `${parts[2]}/${parts[1]}` : dStr;
      
      const dayPayments = payments.filter(p => p.date === dStr && p.verified);
      const totalCollected = dayPayments.reduce((sum, p) => sum + p.amount, 0);
      
      // Target Goal: customized daily collection goal configured by teachers
      const targetGoal = dailyGoal;
      
      return {
        date: dStr,
        formattedDate,
        "Total Collected": totalCollected,
        "Target Goal": targetGoal,
      };
    });
  }, [activeTerm, dateFilter, payments, students, dailyGoal]);

  // Search inside filters for sub-views
  const [alertSearch, setAlertSearch] = useState('');
  const [classPerfSearch, setClassPerfSearch] = useState('');

  const stats = useMemo(() => getDailyStats(dateFilter), [getDailyStats, dateFilter]);
  const teacherMetrics = useMemo(() => getTeacherMetrics(dateFilter), [getTeacherMetrics, dateFilter]);
  const trends = useMemo(() => getCashFlowTrend(), [getCashFlowTrend]);
  const pendingAlerts = useMemo(() => getPendingAlerts(dateFilter), [getPendingAlerts, dateFilter]);

  const totalVerifiedAccumulatedRevenue = useMemo(() => {
    return (payments || []).reduce((acc, p) => p.verified ? acc + p.amount : acc, 0);
  }, [payments]);

  const recentPayments = useMemo(() => {
    return [...(payments || [])]
      .sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        if (timeA !== timeB) return timeB - timeA;
        return (b.id || '').localeCompare(a.id || '');
      })
      .slice(0, 10);
  }, [payments]);

  const dailyProgressPercent = useMemo(() => {
    return dailyGoal > 0 ? (stats.totalCollected / dailyGoal) * 100 : 0;
  }, [stats.totalCollected, dailyGoal]);

  const customCollectionRate = dailyProgressPercent;

  // Monthly Fee Collection Analytics Calculations
  const currentMonthYearMonth = useMemo(() => {
    return dateFilter.slice(0, 7); // "YYYY-MM"
  }, [dateFilter]);

  const currentMonthName = useMemo(() => {
    try {
      return new Date(`${dateFilter}T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return 'Current Month';
    }
  }, [dateFilter]);

  const monthSchoolDays = useMemo(() => {
    if (!activeTerm || !activeTerm.schoolDays) return [];
    return activeTerm.schoolDays.filter(d => d.startsWith(currentMonthYearMonth));
  }, [activeTerm, currentMonthYearMonth]);

  const monthlyCollectedVerified = useMemo(() => {
    return (payments || [])
      .filter(p => p.verified && p.date.startsWith(currentMonthYearMonth))
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments, currentMonthYearMonth]);

  const monthlyCollectedPending = useMemo(() => {
    return (payments || [])
      .filter(p => !p.verified && !p.isAbsent && p.date.startsWith(currentMonthYearMonth))
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments, currentMonthYearMonth]);

  const activeStudentsCount = useMemo(() => {
    return (students || []).filter(s => s.active).length;
  }, [students]);

  // Projected enrollment potential is (Active Enrolled Pupils * 5 GHC fee per day * number of school days this month)
  const monthlyProjectedEnrollmentTarget = useMemo(() => {
    return activeStudentsCount * 5 * monthSchoolDays.length;
  }, [activeStudentsCount, monthSchoolDays]);

  // Projected configured collection target is (daily custom collection goal * number of school days this month)
  const monthlyProjectedGoalTarget = useMemo(() => {
    return dailyGoal * monthSchoolDays.length;
  }, [dailyGoal, monthSchoolDays]);

  // Performance progress percentages
  const enrollmentProgressPercent = useMemo(() => {
    return monthlyProjectedEnrollmentTarget > 0 
      ? (monthlyCollectedVerified / monthlyProjectedEnrollmentTarget) * 100 
      : 0;
  }, [monthlyCollectedVerified, monthlyProjectedEnrollmentTarget]);

  const goalProgressPercent = useMemo(() => {
    return monthlyProjectedGoalTarget > 0 
      ? (monthlyCollectedVerified / monthlyProjectedGoalTarget) * 100 
      : 0;
  }, [monthlyCollectedVerified, monthlyProjectedGoalTarget]);

  // Handle manual date changing to explore other days
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      setDateFilter(val);
      setCurrentDate(val);
    }
  };

  // Helper to resolve specific quick dates in YYYY-MM-DD
  const getQuickDateStr = (type: 'today' | 'yesterday' | 'last_friday') => {
    const refDate = new Date();
    const year = refDate.getFullYear();
    const baseDate = (year === 2026) ? refDate : new Date('2026-06-01');

    if (type === 'today') {
      const yyyy = baseDate.getFullYear();
      const mm = String(baseDate.getMonth() + 1).padStart(2, '0');
      const dd = String(baseDate.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } else if (type === 'yesterday') {
      const prev = new Date(baseDate);
      prev.setDate(baseDate.getDate() - 1);
      const yyyy = prev.getFullYear();
      const mm = String(prev.getMonth() + 1).padStart(2, '0');
      const dd = String(prev.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } else if (type === 'last_friday') {
      const prevFriday = new Date(baseDate);
      const currentDay = baseDate.getDay();
      let daysToSub = 0;
      if (currentDay === 5) {
        daysToSub = 7;
      } else {
        daysToSub = (currentDay - 5 + 7) % 7;
        if (daysToSub === 0) daysToSub = 7;
      }
      prevFriday.setDate(baseDate.getDate() - daysToSub);
      const yyyy = prevFriday.getFullYear();
      const mm = String(prevFriday.getMonth() + 1).padStart(2, '0');
      const dd = String(prevFriday.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return currentDate;
  };

  const handleQuickDateSelect = (type: 'today' | 'yesterday' | 'last_friday') => {
    const val = getQuickDateStr(type);
    setDateFilter(val);
    setCurrentDate(val);
  };

  // Find maximum trend amount for scaling SVG chart
  const maxTrendAmount = useMemo(() => {
    const vals = trends.map(t => chartMetric === 'revenue' ? t.amount : t.transactions);
    return Math.max(...vals, 1); // avoid division by zero
  }, [trends, chartMetric]);

  const [notifiedStudents, setNotifiedStudents] = useState<Record<string, boolean>>({});

  const handleDialGuardian = (studentId: string, phone: string) => {
    setNotifiedStudents(prev => ({ ...prev, [studentId]: true }));
    // Simulate dialing visually for 3 seconds
    setTimeout(() => {
      setNotifiedStudents(prev => ({ ...prev, [studentId]: false }));
    }, 3000);
  };

  // Filtered lists for specialized tabs
  const filteredAlerts = useMemo(() => {
    if (!alertSearch.trim()) return pendingAlerts;
    const lower = alertSearch.toLowerCase();
    return pendingAlerts.filter(s => 
      s.studentName.toLowerCase().includes(lower) || 
      s.class.toLowerCase().includes(lower)
    );
  }, [pendingAlerts, alertSearch]);

  const filteredTeacherMetrics = useMemo(() => {
    if (!classPerfSearch.trim()) return teacherMetrics;
    const lower = classPerfSearch.toLowerCase();
    return teacherMetrics.filter(m => 
      m.className.toLowerCase().includes(lower) || 
      m.teacherName.toLowerCase().includes(lower)
    );
  }, [teacherMetrics, classPerfSearch]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 font-sans"
    >
      {/* Date & Layout Control Header */}
      <motion.div variants={itemVariants} className="bg-neutral-900 border-4 border-neutral-800 p-6 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-6">
        
        {/* Date Selector controls */}
        <div className="flex flex-wrap items-center gap-4">
          {activeTerm && (
            <div className="bg-neutral-950 border-2 border-neutral-800 px-4 py-1.5 text-[10px] font-black uppercase font-mono text-amber-400 tracking-wider">
              Active Term Tracker: {activeTerm.name}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 dashboard-header-date-controls">
            <Calendar className="text-amber-400 shrink-0" size={18} />
            <span className="text-[11px] font-black uppercase tracking-wider text-neutral-400">Target Audit Date:</span>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={dateFilter}
                onChange={handleDateChange}
                className="bg-neutral-950 border-2 border-neutral-800 text-[11px] font-black text-white px-3 py-1.5 focus:border-amber-400 outline-none uppercase tracking-wider font-mono cursor-pointer"
              />
              {dateFilter !== getQuickDateStr('today') && (
                <button
                  type="button"
                  onClick={() => handleQuickDateSelect('today')}
                  className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider font-mono border-2 border-amber-400 bg-amber-400 hover:bg-amber-300 text-black hover:scale-105 active:scale-95 transition-all duration-200 transform cursor-pointer flex items-center gap-1.5"
                  title="Reset to current day's analytics"
                >
                  <RefreshCw size={11} className="stroke-[2.5]" />
                  <span>Reset to Today</span>
                </button>
              )}
            </div>
            {/* Quick Date buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleQuickDateSelect('today')}
                className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider font-mono border-2 transition-all duration-200 hover:scale-105 active:scale-95 transform cursor-pointer ${
                  dateFilter === getQuickDateStr('today')
                    ? 'bg-amber-400 border-amber-400 text-black'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600'
                }`}
                title="Filter to Dynamic Today"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleQuickDateSelect('yesterday')}
                className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider font-mono border-2 transition-all duration-200 hover:scale-105 active:scale-95 transform cursor-pointer ${
                  dateFilter === getQuickDateStr('yesterday')
                    ? 'bg-amber-400 border-amber-400 text-black'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600'
                }`}
                title="Filter to Yesterday"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => handleQuickDateSelect('last_friday')}
                className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider font-mono border-2 transition-all duration-200 hover:scale-105 active:scale-95 transform cursor-pointer ${
                  dateFilter === getQuickDateStr('last_friday')
                    ? 'bg-amber-400 border-amber-400 text-black'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600'
                }`}
                title="Filter to Last Friday"
              >
                Last Friday
              </button>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="w-2 h-2 bg-amber-400 rounded-none animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-neutral-400 font-mono">Real-Time Core Analytics Live</span>
          </div>
        </div>

        {/* Layout Switcher tabs */}
        <div className="flex flex-wrap bg-neutral-950 p-1.5 border-2 border-neutral-850 gap-1.5">
          <button
            onClick={() => setActiveLayout('bento')}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 ${
              activeLayout === 'bento' 
                ? 'bg-white text-black font-black' 
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900/40'
            }`}
          >
            <LayoutGrid size={14} /> Sleek Bento Grid
          </button>
          <button
            onClick={() => setActiveLayout('class-perf')}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 ${
              activeLayout === 'class-perf' 
                ? 'bg-white text-black font-black' 
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900/40'
            }`}
          >
            <Activity size={14} /> Classrooms Tracker
          </button>
          <button
            onClick={() => setActiveLayout('weekly-aggregate')}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 ${
              activeLayout === 'weekly-aggregate' 
                ? 'bg-white text-black font-black' 
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900/40'
            }`}
          >
            <Coins size={14} /> Weekly Collections
          </button>
          <button
            onClick={() => setActiveLayout('alerts-desk')}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 ${
              activeLayout === 'alerts-desk' 
                ? 'bg-white text-black font-black' 
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900/40'
            }`}
          >
            <AlertTriangle size={14} className={pendingAlerts.length > 0 ? 'text-amber-450 animate-bounce' : ''} /> Alerts Deck ({pendingAlerts.length})
          </button>
        </div>
      </motion.div>

      {/* 5 Interactive KPI Cards - Heightened Design with Side Accent borders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">

        {/* Metric 1: Total Accumulated Revenue */}
        <motion.div variants={itemVariants} className="bg-neutral-900 border-4 border-neutral-800 border-l-amber-400 p-6 flex flex-col justify-between min-h-[145px] hover:border-r-neutral-700 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest font-mono">Accumulated Revenue</span>
            <Coins size={16} className="text-amber-400" />
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-black font-mono text-white tracking-tight leading-none" id="total-accumulated-revenue">GHC {totalVerifiedAccumulatedRevenue.toFixed(2)}</h3>
            
            {resetConfirming === 'none' ? (
              <div className="flex justify-between items-center mt-2.5">
                <p className="text-[9px] text-amber-500 uppercase font-black tracking-widest flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 bg-amber-400 animate-pulse" /> All verified dates
                </p>
                <button
                  type="button"
                  onClick={() => setResetConfirming('payments')}
                  className="text-[9px] font-mono font-black bg-red-950/40 hover:bg-red-900 border border-red-800/60 text-red-400 hover:text-white px-2 py-0.5 tracking-wider uppercase transition-colors cursor-pointer rounded-sm"
                  title="Reset collected revenue records to starting fresh"
                >
                  Reset To 0 GHC
                </button>
              </div>
            ) : resetConfirming === 'payments' ? (
              <div className="mt-2.5 space-y-1.5 bg-neutral-950 p-2 border border-dashed border-red-800 rounded-sm">
                <p className="text-[8px] font-mono font-bold text-red-400 uppercase tracking-wide leading-none">Confirm Reset?</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      clearAllPayments();
                      setResetConfirming('none');
                    }}
                    className="text-[8px] font-mono font-black bg-red-600 hover:bg-red-500 text-white uppercase px-1.5 py-0.5 rounded-xs cursor-pointer transition-colors"
                  >
                    Set GHC 0
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetConfirming('both')}
                    className="text-[8px] font-mono font-black bg-neutral-800 hover:bg-neutral-700 text-neutral-200 uppercase px-1.5 py-0.5 rounded-xs cursor-pointer transition-colors"
                    title="Also wipe sample student roster to load real students listing"
                  >
                    Wipe Pupils too
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetConfirming('none')}
                    className="text-[8px] font-mono text-neutral-400 hover:text-white uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2.5 space-y-1.5 bg-neutral-950 p-2 border border-dashed border-red-850 rounded-sm">
                <p className="text-[8px] font-mono font-bold text-red-400 uppercase tracking-wide leading-tight">Wipe pupil register & reset payments?</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      clearSampleStudents();
                      setResetConfirming('none');
                    }}
                    className="text-[8px] font-mono font-black bg-red-600 hover:bg-red-500 text-white uppercase px-1.5 py-0.5 rounded-xs cursor-pointer transition-colors"
                  >
                    Wipe Both
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetConfirming('none')}
                    className="text-[8px] font-mono text-neutral-400 hover:text-white uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
        
        {/* Metric 2: Total Collected with Interactive Progress Ring */}
        <motion.div variants={itemVariants} className={`bg-neutral-900 border-4 border-neutral-800 ${dailyProgressPercent >= 100 ? 'border-l-emerald-400 shadow-[inset_y_0_12px_rgba(16,185,129,0.05)]' : 'border-l-amber-400'} p-6 flex flex-col justify-between min-h-[145px] hover:border-r-neutral-700 transition-all`}>
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest font-mono">Collections & progress</span>
            <Coins size={16} className={dailyProgressPercent >= 100 ? 'text-emerald-400 animate-bounce' : 'text-amber-400'} />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-3xl font-black font-mono text-white tracking-tight leading-none">GHC {stats.totalCollected.toFixed(2)}</h3>
              <div className="flex flex-col gap-1.5 mt-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-neutral-400 uppercase font-bold tracking-wider">GOAL GHC:</span>
                  <input
                    type="number"
                    value={dailyGoal}
                    onChange={(e) => handleUpdateDailyGoal(Number(e.target.value) || 0)}
                    className="w-14 bg-neutral-950 border border-neutral-800 text-amber-400 font-mono font-black text-[10px] px-1 py-0.5 text-center focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-sm"
                    min="1"
                    title="Change school daily collection target"
                  />
                </div>
                <div className="flex items-center gap-1 border border-neutral-800 bg-neutral-950 p-0.5 max-w-fit">
                  <button 
                    type="button"
                    onClick={() => handleUpdateDailyGoal(dailyGoal - 50)} 
                    title="Lower Daily Goal (-50 GHC)"
                    className="px-1.5 py-0.5 text-[9px] font-black text-neutral-400 hover:text-white hover:bg-neutral-900 font-mono border-r border-neutral-850 cursor-pointer"
                  >
                    -50
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleUpdateDailyGoal(dailyGoal + 50)} 
                    title="Raise Daily Goal (+50 GHC)"
                    className="px-1.5 py-0.5 text-[9px] font-black text-neutral-400 hover:text-white hover:bg-neutral-900 font-mono cursor-pointer"
                  >
                    +50
                  </button>
                </div>
                {dailyProgressPercent >= 100 && (
                  <span className="text-[8px] font-mono leading-none font-black text-emerald-400 tracking-widest uppercase bg-emerald-950/40 border border-emerald-900/60 px-1.5 py-1 max-w-fit flex items-center gap-1.5 animate-pulse mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Target Met
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className={`relative w-14 h-14 flex items-center justify-center ${dailyProgressPercent >= 100 ? 'animate-pulse' : ''}`}>
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="28"
                    cy="28"
                    r="22"
                    className="stroke-neutral-850 fill-none"
                    strokeWidth="4"
                  />
                  {/* Subtle inner shadow track */}
                  <circle
                    cx="28"
                    cy="28"
                    r="22"
                    className="stroke-neutral-800 fill-none"
                    strokeWidth="4"
                  />
                  <circle
                    cx="28"
                    cy="28"
                    r="22"
                    className={`fill-none transition-all duration-700 ${
                      dailyProgressPercent >= 100 
                        ? 'stroke-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]' 
                        : dailyProgressPercent >= 50 
                        ? 'stroke-amber-400' 
                        : 'stroke-orange-500'
                    }`}
                    strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 22}`}
                    strokeDashoffset={`${(2 * Math.PI * 22) * (1 - Math.min(dailyProgressPercent, 100) / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center font-mono leading-none">
                  <span className={`text-[10px] font-black ${dailyProgressPercent >= 100 ? 'text-emerald-400 drop-shadow-[0_0_2px_rgba(52,211,153,0.6)]' : 'text-neutral-200'}`}>
                    {Math.round(dailyProgressPercent)}%
                  </span>
                </div>
              </div>
              <span className={`text-[8px] font-black font-mono tracking-widest uppercase ${dailyProgressPercent >= 100 ? 'text-emerald-400' : 'text-neutral-500'}`}>Goal %</span>
            </div>
          </div>
        </motion.div>

        {/* Metric 2: Expected vs Actual Collection Rate */}
        <motion.div variants={itemVariants} className="bg-neutral-900 border-4 border-neutral-800 border-l-white p-6 flex flex-col justify-between min-h-[145px] hover:border-r-neutral-700 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest font-mono">Collection Rate</span>
            <TrendingUp size={16} className="text-white" />
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="space-y-1">
              <h3 className="text-3xl font-black font-mono text-white tracking-tight leading-none">{customCollectionRate.toFixed(1)}%</h3>
              <div className="flex flex-col gap-1.5 mt-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-neutral-400 uppercase font-bold tracking-wider">Goal GHC:</span>
                  <input
                    type="number"
                    value={dailyGoal}
                    onChange={(e) => handleUpdateDailyGoal(Number(e.target.value) || 0)}
                    className="w-14 bg-neutral-950 border border-neutral-800 text-amber-400 font-mono font-black text-[10px] px-1 py-0.5 text-center focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-sm"
                    min="1"
                    title="Change school daily collection target"
                  />
                </div>
                <div className="flex items-center gap-1 border border-neutral-800 bg-neutral-950 p-0.5 max-w-fit">
                  <button 
                    type="button"
                    onClick={() => handleUpdateDailyGoal(dailyGoal - 50)} 
                    title="Lower Daily Goal (-50 GHC)"
                    className="px-1.5 py-0.5 text-[9px] font-black text-neutral-400 hover:text-white hover:bg-neutral-900 font-mono border-r border-neutral-850 cursor-pointer"
                  >
                    -50
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleUpdateDailyGoal(dailyGoal + 50)} 
                    title="Raise Daily Goal (+50 GHC)"
                    className="px-1.5 py-0.5 text-[9px] font-black text-neutral-400 hover:text-white hover:bg-neutral-900 font-mono cursor-pointer"
                  >
                    +50
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              {/* D3-style SVG 'Daily Goal Progress' ring chart */}
              <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="24"
                    cy="24"
                    r="19"
                    className="stroke-neutral-850 fill-none"
                    strokeWidth="4"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="19"
                    className="stroke-amber-400 fill-none transition-all duration-700"
                    strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 19}`}
                    strokeDashoffset={`${(2 * Math.PI * 19) * (1 - Math.min(customCollectionRate, 100) / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-mono">
                  <span className="text-[8px] font-black text-neutral-400">
                    {customCollectionRate.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Informational text tooltip next to the ring chart */}
              <div className="relative group/tooltip">
                <button
                  type="button"
                  className="p-1 text-neutral-500 hover:text-amber-400 transition-colors cursor-help"
                  aria-label="Daily Goal Info"
                >
                  <Info size={14} />
                </button>
                <div className="absolute right-0 bottom-full mb-2 w-48 p-3 bg-neutral-950 border border-neutral-850 text-neutral-300 text-[9px] tracking-wide uppercase font-mono leading-relaxed shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-150 z-50 pointer-events-none">
                  <span className="text-amber-400 font-black block mb-1">🎯 Daily Goal Progress</span>
                  The daily target is set to <span className="text-white font-extrabold">{dailyGoal} GHC</span>. You can input any value in the custom field to adjust the goal rate.
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Metric 3: Total Paid Count */}
        <motion.div variants={itemVariants} className="bg-neutral-900 border-4 border-neutral-800 border-l-neutral-400 p-6 flex flex-col justify-between min-h-[145px] hover:border-r-neutral-700 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest font-mono">Paid Cohort</span>
            <Users size={16} className="text-neutral-400" />
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-black font-mono text-white tracking-tight leading-none">{stats.paidCount} PUPILS</h3>
            <p className="text-[9px] text-neutral-400 uppercase font-bold tracking-widest mt-2 block">
              Entered classrooms cleared
            </p>
          </div>
        </motion.div>

        {/* Metric 4: Pending Alerts */}
        <motion.div variants={itemVariants} className="bg-neutral-900 border-4 border-neutral-800 border-l-red-500 p-6 flex flex-col justify-between min-h-[145px] hover:border-r-neutral-700 transition-all">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest font-mono">Pending Gate Checks</span>
            <AlertTriangle size={16} className="text-red-500 animate-pulse" />
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-black font-mono text-red-500 tracking-tight leading-none">{stats.pendingCount} PENDING</h3>
            <p className="text-[9px] text-red-400 uppercase font-black tracking-widest mt-2 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 bg-red-500 animate-ping" /> Alert state active
            </p>
          </div>
        </motion.div>
      </div>

      {/* Enrollment & Today's Attendance & Sync Health Banner Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Total Enrollment Widget */}
        <motion.div variants={itemVariants} className="bg-neutral-900 border-4 border-neutral-800 border-l-amber-400 p-4 flex flex-col justify-between gap-3 hover:border-neutral-700 transition-all duration-300">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-400 rounded-none shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono">Cohort Demographics</span>
            </div>
            <span className="text-[9px] font-mono font-black uppercase text-neutral-400 bg-neutral-950 border border-neutral-850 px-2 py-0.5">
              Pupil Registry
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 mt-1">
            <div className="space-y-0.5 text-left">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Total Enrollment</h4>
              <p className="text-[10px] text-neutral-400 font-mono uppercase tracking-wide">
                Pupils Registered
              </p>
            </div>
            <div className="bg-neutral-950 border-2 border-neutral-850 px-3 py-1 font-mono text-right shrink-0">
              <span className="text-sm font-black text-amber-400" id="total-enrollment-counter">{students?.length || 0}</span>
              <span className="text-[9px] text-neutral-500 font-bold"> Profiles</span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-dashed border-neutral-800">
            <div className="flex justify-between items-center text-[9px] font-mono font-extrabold text-neutral-500 uppercase tracking-wider">
              <span>Active Status Coverage</span>
              <span className="text-neutral-300 font-mono font-black">{activeStudentsCount} / {students?.length || 0} Active</span>
            </div>
            <div className="w-full bg-neutral-950 h-2 border border-neutral-850 overflow-hidden">
              <div 
                className="bg-amber-400 h-full transition-all duration-500"
                style={{ width: `${students?.length > 0 ? (activeStudentsCount / students.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </motion.div>

        {/* Today's Attendance Widget */}
        <motion.div variants={itemVariants} className="bg-neutral-900 border-4 border-neutral-800 border-l-emerald-400 p-4 flex flex-col justify-between gap-3 hover:border-neutral-700 transition-all duration-300">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${dateFilter === currentDate ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'}`} />
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono">Real-Time Ingress</span>
            </div>
            <span className="text-[9px] font-mono font-black uppercase text-emerald-400 bg-emerald-400/10 border border-emerald-450/30 px-2 py-0.5">
              Core Sentry Stream
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 mt-1">
            <div className="space-y-0.5 text-left">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Today's Attendance</h4>
              <p className="text-[10px] text-neutral-400 font-mono uppercase tracking-wide">
                Checked-In Pupils
              </p>
            </div>
            <div className="bg-neutral-950 border-2 border-neutral-850 px-3 py-1 font-mono text-right shrink-0">
              <span className="text-sm font-black text-emerald-400">{stats.paidCount}</span>
              <span className="text-[9px] text-neutral-500 font-bold"> / {activeStudentsCount} Pupils</span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-dashed border-neutral-800">
            <div className="flex justify-between items-center text-[9px] font-mono font-extrabold text-neutral-500 uppercase tracking-wider">
              <span>Attendance Rate</span>
              <span className="text-emerald-400 font-black">
                {(activeStudentsCount > 0 ? (stats.paidCount / activeStudentsCount) * 100 : 0).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-neutral-950 h-2 border border-neutral-850 overflow-hidden">
              <div 
                className="bg-emerald-400 h-full transition-all duration-500"
                style={{ width: `${activeStudentsCount > 0 ? Math.min(100, (stats.paidCount / activeStudentsCount) * 100) : 0}%` }}
              />
            </div>
          </div>
        </motion.div>

        {/* Sync Health Monitor Widget */}
        <motion.div variants={itemVariants} className={`bg-neutral-900 border-4 border-neutral-800 ${pendingLocalEdits.length > 0 ? 'border-l-amber-500' : 'border-l-emerald-400'} p-4 flex flex-col justify-between gap-3 relative select-none hover:border-neutral-700 transition-all duration-300`}>
          <div className="flex justify-between items-center w-full flex-row">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-none ${pendingLocalEdits.length > 0 ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 font-mono">Ledger Node Health</span>
            </div>
            {storageMode === 'local' ? (
              <span className="bg-neutral-950 border border-amber-500/30 text-amber-400 text-[8px] font-mono px-2 py-0.5 uppercase tracking-wider font-extrabold rounded-none">
                Local Ledger Mode
              </span>
            ) : (
              <span className="bg-neutral-950 border border-emerald-500/30 text-emerald-400 text-[8px] font-mono px-2 py-0.5 uppercase tracking-wider font-extrabold rounded-none">
                Cloud Synced (Firestore)
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 mt-1">
            <div className="space-y-0.5 text-left">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">
                {pendingLocalEdits.length > 0 ? 'Pending Local Changes' : 'Ledger In Sync'}
              </h4>
              <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-wide">
                {pendingLocalEdits.length > 0 
                  ? `${pendingLocalEdits.length} edits not pushed to cloud` 
                  : '0 unsaved edits'
                }
              </p>
            </div>

            {pendingLocalEdits.length > 0 ? (
              <button
                type="button"
                disabled={syncStatus.loading}
                onClick={handleSyncNow}
                className="px-3 py-1.5 text-[9px] font-black uppercase tracking-wider font-mono border-2 border-amber-400 bg-amber-400 text-black hover:bg-amber-300 active:scale-95 transform cursor-pointer flex items-center gap-1.5 transition-all duration-200"
              >
                {syncStatus.loading ? (
                  <RefreshCw size={11} className="animate-spin stroke-[2.5]" />
                ) : (
                  <ArrowRightLeft size={11} className="stroke-[2.5]" />
                )}
                <span>{syncStatus.loading ? 'Syncing...' : 'Push & Sync'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-emerald-450 font-mono text-[9px] font-bold uppercase tracking-wider bg-emerald-950/20 border border-emerald-900/45 px-2 py-1">
                <Check size={11} className="stroke-[3] text-emerald-400" />
                <span className="text-emerald-400">Secured</span>
              </div>
            )}
          </div>

          {/* Micro-logs / warnings of pending edits */}
          {pendingLocalEdits.length > 0 && (
            <div className="mt-1 border-t border-dashed border-neutral-800 pt-2 space-y-1">
              <div className="text-[8px] font-mono font-bold text-neutral-500 uppercase flex items-center gap-1">
                <AlertTriangle size={9} className="text-amber-500 shrink-0" />
                <span className="text-left leading-none">Unsynced offline modifications (browser-bound):</span>
              </div>
              <div className="bg-neutral-950 px-2 py-1.5 font-mono text-[9px] text-neutral-400 uppercase tracking-wide flex flex-col gap-1 max-h-[50px] overflow-y-auto rounded-none">
                {pendingLocalEdits.slice(0, 2).map((edit) => (
                  <div key={edit.id} className="flex justify-between items-center gap-2 truncate">
                    <span className="truncate border-l-2 border-amber-500 pl-1.5 text-[8.5px] leading-none text-left">{edit.description}</span>
                    <span className="text-[8px] text-neutral-600 shrink-0 font-medium font-mono">{edit.timestamp}</span>
                  </div>
                ))}
                {pendingLocalEdits.length > 2 && (
                  <span className="text-[8px] text-neutral-600 font-bold tracking-wider leading-none text-left">
                    + {pendingLocalEdits.length - 2} more log operations...
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Sync status toast overlay messages inside the widget */}
          {syncStatus.error && (
            <div className="mt-1.5 bg-red-950/40 border border-red-950 p-1.5 flex items-start gap-1.5 text-red-400 text-[9px] uppercase font-mono tracking-wider">
              <span className="font-extrabold shrink-0">ERR:</span>
              <span className="flex-1 text-left">{syncStatus.error}</span>
            </div>
          )}
          {syncStatus.successMessage && (
            <div className="mt-1.5 bg-emerald-950/40 border border-emerald-950 p-1.5 flex items-start gap-1.5 text-emerald-400 text-[9px] uppercase font-mono tracking-wider">
              <Check size={10} className="text-emerald-400 shrink-0 mt-0.5" />
              <span className="flex-1 text-left text-emerald-400">{syncStatus.successMessage}</span>
            </div>
          )}
        </motion.div>

      </div>

      {/* Main Dynamic Workspace Presentation based on tab selection */}
      <AnimatePresence mode="wait">
        {activeLayout === 'bento' && (
          <motion.div
            key="bento-layout"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Monthly Fee Collection & Projections Bento Banner */}
            <div className="bg-neutral-900 border-4 border-neutral-800 p-8 space-y-6">
              <div className="flex flex-col md:flex-row justify-between md:items-center pb-4 border-b-2 border-neutral-850 gap-4">
                <div>
                  <span className="text-[9px] text-amber-500 font-mono tracking-widest font-black uppercase bg-amber-400/10 border border-amber-400/30 px-2.5 py-1 rounded-xs">
                    Monthly Performance Summary
                  </span>
                  <h3 className="text-xl font-black uppercase italic text-white tracking-tight mt-2 flex items-center gap-2">
                    <Coins size={18} className="text-amber-400" /> {currentMonthName} Cash Flow & Projections
                  </h3>
                  <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest mt-1 font-bold">
                    Comparing actual ledger revenue against forecasted enrolment & collection targets
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-mono font-bold uppercase text-neutral-400">
                  <span className="bg-neutral-950 border border-neutral-805 px-3 py-1.5 flex items-center gap-1.5">
                    <Calendar size={12} className="text-amber-400" /> 
                    <span>{monthSchoolDays.length} Active School Days</span>
                  </span>
                </div>
              </div>

              {/* Sub-grid of Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. ACTUAL MONTHLY REVENUE COLLECTED */}
                <div className="bg-neutral-950 border-2 border-neutral-850 p-5 space-y-2">
                  <span className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest font-extrabold block">Collected Revenue (Verified)</span>
                  <div className="text-2xl font-black text-emerald-400 font-mono">GHC {monthlyCollectedVerified.toFixed(2)}</div>
                  {monthlyCollectedPending > 0 && (
                    <div className="text-[8.5px] text-amber-500 font-mono font-bold uppercase">
                      + GHC {monthlyCollectedPending.toFixed(2)} Pending
                    </div>
                  )}
                  <p className="text-[9.5px] text-neutral-500 leading-tight">
                    All processed gate payments successfully signed by educators this month.
                  </p>
                </div>

                {/* 2. PROJECTED ENROLMENT TARGET POTENTIAL */}
                <div className="bg-neutral-950 border-2 border-neutral-850 p-5 space-y-2">
                  <span className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest font-extrabold block">Full Enrollment Target</span>
                  <div className="text-2xl font-black text-white font-mono">GHC {monthlyProjectedEnrollmentTarget.toFixed(2)}</div>
                  <div className="text-[8.5px] text-neutral-400 font-mono font-extrabold uppercase">
                    {activeStudentsCount} Enrolled • GHC 5/day
                  </div>
                  <p className="text-[9.5px] text-neutral-500 leading-tight">
                    Potential collections if 100% of the active student roll paid every single day.
                  </p>
                </div>

                {/* 3. CONFIGURED COLLECTION GOAL TARGET */}
                <div className="bg-neutral-950 border-2 border-neutral-850 p-5 space-y-2">
                  <span className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest font-extrabold block">Configured Custom Goal</span>
                  <div className="text-2xl font-black text-amber-400 font-mono">GHC {monthlyProjectedGoalTarget.toFixed(2)}</div>
                  <div className="text-[8.5px] text-neutral-400 font-mono font-extrabold uppercase">
                    Daily Goal: GHC {dailyGoal}
                  </div>
                  <p className="text-[9.5px] text-neutral-500 leading-tight">
                    The custom milestone established for collections across critical gate check-ins.
                  </p>
                </div>

                {/* 4. PERFORMANCE RATIOS */}
                <div className="bg-neutral-950 border-2 border-neutral-850 p-5 flex flex-col justify-between space-y-2">
                  <div>
                    <span className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest font-extrabold block">Target Coverage Ratio</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <div className="text-2xl font-black text-white font-mono">{goalProgressPercent.toFixed(1)}%</div>
                      <span className="text-[9px] text-neutral-500 font-mono">of custom goal</span>
                    </div>
                  </div>
                  <div className="text-[9.5px] text-neutral-450 font-mono font-semibold flex items-center justify-between">
                    <span>Enrollment potential cover:</span>
                    <strong className="text-neutral-200">{enrollmentProgressPercent.toFixed(1)}%</strong>
                  </div>
                </div>
              </div>

              {/* Progress Indicator Tracks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* Custom Goal Progress Slider Bar */}
                <div className="bg-neutral-950/45 p-4 border border-neutral-850 space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-mono font-extrabold text-neutral-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-amber-400 rounded-full" /> Goal Target Progress
                    </span>
                    <span className="text-amber-400 font-black">{goalProgressPercent.toFixed(1)}% Completed</span>
                  </div>
                  <div className="w-full bg-neutral-950 h-3 border border-neutral-850 rounded-xs overflow-hidden">
                    <div 
                      className="bg-amber-400 h-full transition-all duration-500"
                      style={{ width: `${Math.min(100, goalProgressPercent)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-neutral-500 font-mono uppercase">
                    <span>GHC 0.00</span>
                    <span>Target: GHC {monthlyProjectedGoalTarget.toFixed(2)}</span>
                  </div>
                </div>

                {/* Full Enrollment potential Slider Bar */}
                <div className="bg-neutral-950/45 p-4 border border-neutral-850 space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-mono font-extrabold text-neutral-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full" /> Max Enrollment Potential
                    </span>
                    <span className="text-emerald-400 font-black">{enrollmentProgressPercent.toFixed(1)}% Covered</span>
                  </div>
                  <div className="w-full bg-neutral-950 h-3 border border-neutral-850 rounded-xs overflow-hidden">
                    <div 
                      className="bg-emerald-400 h-full transition-all duration-500"
                      style={{ width: `${Math.min(100, enrollmentProgressPercent)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-neutral-500 font-mono uppercase">
                    <span>GHC 0.00</span>
                    <span>Potential: GHC {monthlyProjectedEnrollmentTarget.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top row: Trend Graphics & Category split Bento block */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Cash Flow Trends Graph Block */}
              <div className="bg-neutral-900 border-4 border-neutral-800 p-8 col-span-1 lg:col-span-2 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black uppercase italic text-white tracking-tight">Ledger Cash Flow Analytics</h3>
                    <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest mt-1">Weekly financial status logs</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    {/* View Switcher: Recharts vs Custom SVG */}
                    <div className="flex bg-neutral-950 p-1 border border-neutral-800 max-w-fit">
                      <button
                        onClick={() => setChartView('recharts')}
                        className={`px-3 py-1 text-[9px] font-black font-mono uppercase tracking-widest transition-colors cursor-pointer ${
                          chartView === 'recharts' ? 'bg-amber-400 text-black font-extrabold' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        Target Goal (Recharts)
                      </button>
                      <button
                        onClick={() => setChartView('trends')}
                        className={`px-3 py-1 text-[9px] font-black font-mono uppercase tracking-widest transition-colors cursor-pointer ${
                          chartView === 'trends' ? 'bg-amber-400 text-black font-extrabold' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        Trend Curve
                      </button>
                    </div>

                    {/* Interactive toggle between Revenue GHC values and transaction count volumes */}
                    {chartView === 'trends' && (
                      <div className="flex bg-neutral-950 p-1 border border-neutral-800 max-w-fit">
                        <button
                          onClick={() => setChartMetric('revenue')}
                          className={`px-3 py-1 text-[9px] font-black font-mono uppercase tracking-widest transition-colors cursor-pointer ${
                            chartMetric === 'revenue' ? 'bg-amber-400 text-black font-extrabold' : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          Revenue (GHC)
                        </button>
                        <button
                          onClick={() => setChartMetric('volume')}
                          className={`px-3 py-1 text-[9px] font-black font-mono uppercase tracking-widest transition-colors cursor-pointer ${
                            chartMetric === 'volume' ? 'bg-amber-400 text-black font-extrabold' : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          Tx Volume
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Plot Area */}
                <div className="h-68 w-full relative pt-6 bg-neutral-950 border-2 border-neutral-850 p-4">
                  {chartView === 'recharts' ? (
                    last7DaysData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={last7DaysData}
                          margin={{ top: 15, right: 15, left: -20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                          <XAxis 
                            dataKey="formattedDate" 
                            stroke="#737373" 
                            fontSize={9} 
                            fontFamily="JetBrains Mono, monospace"
                            fontWeight="bold"
                            tickLine={false}
                            axisLine={false}
                            dy={8}
                          />
                          <YAxis 
                            stroke="#737373" 
                            fontSize={9} 
                            fontFamily="JetBrains Mono, monospace"
                            fontWeight="bold"
                            tickLine={false}
                            axisLine={false}
                            dx={-5}
                          />
                          <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: '#fbbf24', strokeWidth: 1, strokeDasharray: '3 3' }} />
                          <Legend 
                            verticalAlign="bottom"
                            height={24}
                            iconType="square" 
                            iconSize={8}
                            wrapperStyle={{ 
                              fontSize: '9px', 
                              fontWeight: '900', 
                              textTransform: 'uppercase', 
                              fontFamily: 'JetBrains Mono, monospace', 
                              color: '#a3a3a3', 
                              paddingTop: '15px' 
                            }} 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="Total Collected" 
                            name="Total Collected"
                            stroke="#fbbf24" 
                            strokeWidth={3} 
                            activeDot={{ r: 6, strokeWidth: 1 }}
                            dot={{ r: 3, fill: '#fbbf24', strokeWidth: 1 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="Target Goal" 
                            name="Target Goal"
                            stroke="#ffffff" 
                            strokeWidth={2} 
                            strokeDasharray="4 4"
                            activeDot={{ r: 5, strokeWidth: 1 }}
                            dot={{ r: 2, fill: '#ffffff', strokeWidth: 1 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-neutral-600 text-xs font-bold uppercase tracking-widest font-mono">
                        No term days configured.
                      </div>
                    )
                  ) : trends.length > 0 ? (
                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                      {/* Grid Horizontal Guide Lines */}
                      <line x1="0" y1="180" x2="100%" y2="180" stroke="#1c1c1c" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="0" y1="120" x2="100%" y2="120" stroke="#1c1c1c" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="0" y1="60" x2="100%" y2="60" stroke="#1c1c1c" strokeWidth="1" strokeDasharray="4 4" />
                      <line x1="0" y1="5" x2="100%" y2="5" stroke="#262626" strokeWidth="1.5" />

                      {/* Render line path nodes */}
                      {trends.map((t, idx) => {
                        const xPercent = trends.length > 1 ? (idx / (trends.length - 1)) * 100 : 50;
                        const targetVal = chartMetric === 'revenue' ? t.amount : t.transactions;
                        const normalizedY = 195 - (targetVal / maxTrendAmount) * 165; 

                        return (
                          <g key={t.date} className="group cursor-pointer">
                            {/* Vertical Hover Guides */}
                            <line 
                              x1={`${xPercent}%`} 
                              y1="5" 
                              x2={`${xPercent}%`} 
                              y2="200" 
                              stroke="#1f1f1f" 
                              strokeWidth="1.5" 
                              className="group-hover:stroke-neutral-850 transition-colors"
                            />
                            
                            {/* Visual Highlight column trigger bars */}
                            <rect
                              x={`calc(${xPercent}% - 14px)`}
                              y={normalizedY}
                              width="28"
                              height={200 - normalizedY}
                              fill={chartMetric === 'revenue' ? '#fbbf24' : '#ffffff'}
                              className="opacity-[0.03] hover:opacity-100 group-hover:opacity-[0.15] transition-opacity"
                            />

                            {/* Node points */}
                            <circle 
                              cx={`${xPercent}%`} 
                              cy={normalizedY} 
                              r="7" 
                              fill={chartMetric === 'revenue' ? '#fbbf24' : '#ffffff'} 
                              className="stroke-neutral-900 stroke-2 group-hover:scale-125 transition-transform"
                            />

                            {/* Dynamic Text value tags */}
                            <text
                              x={`${xPercent}%`}
                              y={normalizedY - 14}
                              textAnchor="middle"
                              className="text-[10px] font-black font-semi font-mono fill-white tracking-tighter"
                            >
                              {chartMetric === 'revenue' ? `GHC ${t.amount}` : `${t.transactions} tx`}
                            </text>

                            {/* Horizontal timeline labels */}
                            <text
                              x={`${xPercent}%`}
                              y="218"
                              textAnchor="middle"
                              className="text-[9px] font-black font-mono fill-neutral-500 uppercase tracking-widest"
                            >
                              {t.formattedDate}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  ) : (
                    <div className="h-full flex items-center justify-center text-neutral-600 text-xs font-bold uppercase tracking-widest">
                      Ledger data is empty.
                    </div>
                  )}
                </div>
              </div>

              {/* Category Collections split bento card */}
              <div className="bg-neutral-900 border-4 border-neutral-800 p-8 flex flex-col justify-between space-y-6">
                <div>
                  <h3 className="text-xl font-black uppercase italic text-white tracking-tight">Balanced Cohort Ratios</h3>
                  <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest mt-1 font-bold">Aggregate payment shares</p>
                </div>

                <div className="space-y-4 py-2">
                  {(['Pre-school', 'Primary', 'JHS'] as SchoolCategory[]).map(cat => {
                    const amount = stats.byCategory[cat] || 0;
                    const percent = stats.totalCollected > 0 ? (amount / stats.totalCollected) * 100 : 0;

                    return (
                      <div key={cat} className="space-y-2 bg-neutral-950 border-2 border-neutral-850 p-4">
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 ${cat === 'Pre-school' ? 'bg-amber-400' : cat === 'Primary' ? 'bg-white' : 'bg-neutral-500'}`} /> {cat}
                          </span>
                          <span className="font-mono text-amber-400 font-extrabold text-[12px]">GHC {amount.toFixed(2)}</span>
                        </div>
                        
                        <div className="w-full bg-neutral-900 h-2 border border-neutral-850">
                          <div 
                            className={`h-full ${cat === 'Pre-school' ? 'bg-amber-400' : cat === 'Primary' ? 'bg-white' : 'bg-neutral-500'} transition-all duration-500`} 
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-neutral-500 font-mono uppercase mt-1">
                          <span>Verified weight quota</span>
                          <span className="font-black text-neutral-400">{percent.toFixed(1)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-neutral-950 p-4 border border-neutral-850 text-center">
                  <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest font-mono">
                    Total: GHC {stats.totalCollected.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Row: Checkpoints preview and alert priorities */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Class Performance Tracker table overview */}
              <div className="bg-neutral-900 border-4 border-neutral-800 p-8 col-span-1 lg:col-span-2 space-y-6">
                <div className="flex justify-between items-center pb-2 border-b-2 border-neutral-850">
                  <div>
                    <h3 className="text-xl font-black uppercase italic text-white tracking-tight">Teacher Performance Dockets</h3>
                    <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest mt-1">Active class checking rates</p>
                  </div>
                  <button 
                    onClick={() => setActiveLayout('class-perf')}
                    className="text-[9px] font-black font-mono uppercase tracking-wider text-amber-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    Manage Classrooms <ArrowRightLeft size={10} />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b-2 border-neutral-800 text-[10px] font-black text-neutral-400 uppercase tracking-widest font-mono">
                        <th className="py-2.5">Class level</th>
                        <th className="py-2.5">Staff In-Charge</th>
                        <th className="py-2.5">Cleared Pupils</th>
                        <th className="py-2.5 text-right">Sum (GHC)</th>
                        <th className="py-2.5 text-right">Coverage Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-850">
                      {teacherMetrics.slice(0, 5).map((met) => (
                        <tr key={met.className} className="hover:bg-neutral-950/20">
                          <td className="py-3.5 font-black font-mono text-white text-sm">{met.className}</td>
                          <td className="py-3.5 font-sans font-black text-neutral-300 uppercase tracking-wide text-xs">{met.teacherName}</td>
                          <td className="py-3.5 font-mono text-neutral-400 font-bold">
                            {met.paidCount} / {met.studentsCount}
                          </td>
                          <td className="py-3.5 text-right font-black font-mono text-white">
                            {met.collected.toFixed(2)}
                          </td>
                          <td className="py-3.5 text-right">
                            <span className={`inline-block px-2.5 py-1 text-[10px] font-black font-mono tracking-widest uppercase ${
                              met.rate > 85 ? 'bg-emerald-950 border border-emerald-800 text-emerald-400' :
                              met.rate > 50 ? 'bg-amber-950 border border-amber-800 text-amber-450' : 'bg-red-950 border border-red-800 text-red-450'
                            }`}>
                              {met.rate.toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Alert Center preview list */}
              <div className="bg-neutral-900 border-4 border-neutral-800 p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-1 pb-2 border-b-2 border-neutral-850">
                  <h3 className="text-xl font-black uppercase italic text-white tracking-tight flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-red-500 shrink-0" /> Critical Warnings
                  </h3>
                  <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest font-bold">Pupils lacking daily clear keys</p>
                </div>

                {pendingAlerts.length === 0 ? (
                  <div className="py-12 text-center text-neutral-500 space-y-2 flex-1 flex flex-col justify-center items-center">
                    <Check className="text-amber-400" size={28} />
                    <p className="text-sm font-black uppercase tracking-wider text-white">No active errors</p>
                    <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">100% daily compliance</p>
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[290px] overflow-y-auto flex-1 py-1 pr-1">
                    {pendingAlerts.slice(0, 4).map((st) => (
                      <div key={st.studentId} className="flex justify-between items-center bg-neutral-950 border-2 border-neutral-855 p-3.5">
                        <div className="space-y-1 overflow-hidden">
                          <p className="text-xs font-black text-white uppercase tracking-tight truncate max-w-[140px]">{st.studentName}</p>
                          <div className="flex gap-2 items-center text-[9px] text-neutral-500 font-mono font-black uppercase tracking-wide">
                            <span className="text-amber-400">{st.class}</span>
                            <span>•</span>
                            <span className="truncate">GDN: {st.guardianPhone}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDialGuardian(st.studentId, st.guardianPhone)}
                          disabled={notifiedStudents[st.studentId]}
                          className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest border-2 transition-all cursor-pointer ${
                            notifiedStudents[st.studentId] 
                              ? 'bg-amber-400 border-amber-400 text-black' 
                              : 'bg-neutral-950 border-neutral-800 hover:border-neutral-600 text-neutral-300 animate-pulse'
                          }`}
                        >
                          {notifiedStudents[st.studentId] ? 'DIALING...' : 'DIAL GDN'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setActiveLayout('alerts-desk')}
                  className="w-full text-center bg-neutral-950 border-2 border-neutral-800 text-stone-300 hover:text-white hover:border-neutral-600 text-[10px] py-2.5 uppercase font-black tracking-widest"
                >
                  View All Alerts Desk
                </button>
              </div>
            </div>

            {/* Duty Roster Visual Card */}
            <div className="bg-neutral-900 border-4 border-neutral-800 p-8 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-4 border-b-2 border-neutral-850 gap-4 font-sans">
                <div>
                  <span className="text-[9px] text-amber-500 font-mono tracking-widest font-black uppercase bg-amber-400/10 border border-amber-400/30 px-2.5 py-1 rounded-xs">
                    Staff Schedule & Compliance
                  </span>
                  <h3 className="text-xl font-black uppercase italic text-white tracking-tight mt-2 flex items-center gap-2">
                    <Users size={18} className="text-amber-400" /> Educator Duty Roster
                  </h3>
                  <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest mt-1 font-bold">
                    Class monitoring responsibilities & live check-in statuses for {dateFilter}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleCopyRosterText}
                    className="bg-neutral-950 border border-neutral-800 hover:border-neutral-605 hover:text-white transition-all text-neutral-300 font-mono font-bold text-[9px] uppercase px-3 py-1.5 flex items-center gap-1.5 cursor-pointer"
                  >
                    {dutyCopied ? (
                      <span className="text-emerald-400 font-black">✓ Copied text!</span>
                    ) : (
                      <span>Copy Duty Logs</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Filters & Inputs Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-neutral-950/50 p-4 border border-neutral-850">
                {/* Search Box */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={14} />
                  <input
                    type="text"
                    value={dutySearch}
                    onChange={(e) => setDutySearch(e.target.value)}
                    placeholder="Search roster by staff name, class grade or specific duty..."
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-neutral-604 focus:ring-0 text-white placeholder-neutral-500 text-xs pl-9 pr-4 py-2 uppercase font-mono tracking-wide rounded-none"
                  />
                </div>

                {/* Filter Tabs */}
                <div className="flex bg-neutral-950 p-1 border border-neutral-800 max-w-fit self-start sm:self-auto">
                  <button
                    onClick={() => setDutyFilter('all')}
                    className={`px-3 py-1.5 text-[9px] font-black font-mono uppercase tracking-widest transition-colors cursor-pointer ${
                      dutyFilter === 'all' ? 'bg-amber-400 text-black font-extrabold' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    All ({dutyRoster.length})
                  </button>
                  <button
                    onClick={() => setDutyFilter('active')}
                    className={`px-3 py-1.5 text-[9px] font-black font-mono uppercase tracking-widest transition-colors cursor-pointer ${
                      dutyFilter === 'active' ? 'bg-amber-400 text-black font-extrabold' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Active ({dutyRoster.filter(d => d.hasCollectedToday).length})
                  </button>
                  <button
                    onClick={() => setDutyFilter('standby')}
                    className={`px-3 py-1.5 text-[9px] font-black font-mono uppercase tracking-widest transition-colors cursor-pointer ${
                      dutyFilter === 'standby' ? 'bg-amber-400 text-black font-extrabold' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Standby ({dutyRoster.filter(d => !d.hasCollectedToday).length})
                  </button>
                </div>
              </div>

              {/* Roster Grid list */}
              {filteredDutyRoster.length === 0 ? (
                <div className="py-12 text-center text-neutral-500 border border-neutral-850 bg-neutral-950/25">
                  <span className="font-mono text-xs uppercase font-bold text-neutral-400">No duty assignments match your filter search.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDutyRoster.map((item) => (
                    <div 
                      key={item.className}
                      className={`bg-neutral-950 border-2 transition-all p-5 flex flex-col justify-between space-y-4 ${
                        item.hasCollectedToday 
                          ? 'border-emerald-850 hover:border-emerald-700 bg-neutral-950/70' 
                          : 'border-neutral-850 hover:border-neutral-700 bg-neutral-950/30'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Title and class Level Badges */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-mono font-extrabold tracking-widest text-neutral-500 uppercase">
                              Class Gateway Assignment
                            </span>
                            <div className="text-lg font-black text-white font-mono flex items-center gap-1.5">
                              Class {item.className}
                            </div>
                          </div>
                          
                          <span className={`px-2 py-0.5 text-[9px] font-mono font-black uppercase tracking-wider border ${
                            item.className.startsWith('B') 
                              ? 'bg-neutral-900 border-neutral-850 text-neutral-300' 
                              : 'bg-amber-955/20 border-amber-900 text-amber-500'
                          }`}>
                            {item.keyBadge}
                          </span>
                        </div>

                        {/* Teacher Assignment */}
                        <div className="border-t border-b border-neutral-900 py-3 space-y-1">
                          <span className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest font-extrabold block">Assigned Staff</span>
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-sans font-black text-white uppercase tracking-wider truncate">
                              {item.teacherName}
                            </div>
                            {item.isCustomUser ? (
                              <span className="text-[8px] bg-sky-950 text-sky-400 border border-sky-900 px-1.5 py-0.2 uppercase font-black font-mono tracking-widest rounded-xs scale-90">
                                Staff Account
                              </span>
                            ) : (
                              <span className="text-[8px] bg-neutral-900 text-neutral-500 border border-neutral-850 px-1.5 py-0.2 uppercase font-black font-mono tracking-widest rounded-xs scale-90">
                                Default Fallback
                              </span>
                            )}
                          </div>
                          <span className="text-[9.5px] text-neutral-500 font-mono block truncate lowercase">
                            {item.email !== 'N/A' ? item.email : `${item.teacherName.toLowerCase().replace(/\s+/g, '')}@school.edu`}
                          </span>
                        </div>

                        {/* specific responsibility */}
                        <div className="space-y-1">
                          <span className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest font-extrabold block">Monitoring Responsibility</span>
                          <p className="text-[11px] text-neutral-300 font-medium leading-relaxed uppercase tracking-tight font-sans">
                            {item.responsibility}
                          </p>
                        </div>
                      </div>

                      {/* Live Status and checkout rate */}
                      <div className="pt-3 border-t border-neutral-900 flex justify-between items-center text-[10px] font-mono font-bold">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${item.hasCollectedToday ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'}`} />
                          <span className={`uppercase font-black tracking-wider ${item.hasCollectedToday ? 'text-emerald-400' : 'text-neutral-500'}`}>
                            {item.hasCollectedToday ? 'ACTIVE ON DUTY' : 'STANDBY'}
                          </span>
                        </div>
                        
                        <div className="text-right">
                          <span className="text-neutral-500">Collected today:</span>{' '}
                          <strong className={item.verifiedCount > 0 ? 'text-white' : 'text-neutral-400'}>
                            {item.verifiedCount} Pupils
                          </strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity Feed */}
            <div className="bg-neutral-900 border-4 border-neutral-800 p-8 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-2 border-b-2 border-neutral-850 gap-2">
                <div>
                  <h3 className="text-xl font-black uppercase italic text-white tracking-tight flex items-center gap-2">
                    <Activity size={18} className="text-amber-400" /> Recent Activity Feed
                  </h3>
                  <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest mt-1 font-bold">Real-time gate check-in fee collections (Last 10 entries)</p>
                </div>
                <div className="text-[9px] font-black font-mono uppercase tracking-wider text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 px-2.5 py-1 max-w-fit">
                  Live Feed Status: 🟢 ACTIVE
                </div>
              </div>

              {/* Scrollable list view */}
              <div className="max-h-[350px] overflow-y-auto pr-1 space-y-3 scrollbar-thin scrollbar-thumb-neutral-800">
                {recentPayments.length === 0 ? (
                  <div className="py-16 text-center text-neutral-600 font-black uppercase tracking-widest text-xs font-mono">
                    No recent payment activity recorded today.
                  </div>
                ) : (
                  recentPayments.map((p) => {
                    const paymentTime = p.timestamp ? new Date(p.timestamp).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    }) : '';
                    const paymentDateStr = p.date ? new Date(p.date).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    }) : '';

                    return (
                      <div 
                        key={p.id} 
                        className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-neutral-950 border-2 border-neutral-850 hover:border-neutral-700 p-4 transition-all gap-4 font-mono"
                      >
                        <div className="flex items-start gap-4 flex-1">
                          <div className={`py-2 px-3 shrink-0 text-center font-black text-xs border ${
                            p.verified 
                              ? 'bg-emerald-950/40 border-emerald-900 text-emerald-400' 
                              : 'bg-amber-950/40 border-amber-900 text-amber-450'
                          }`}>
                            {p.class}
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-tight leading-none pt-0.5 font-sans">
                              {p.studentName}
                            </h4>
                            <div className="flex flex-wrap gap-2 items-center text-[9px] text-neutral-500 font-black uppercase tracking-wide">
                              <span className="text-neutral-400">{p.category}</span>
                              <span className="text-neutral-700">•</span>
                              <span>By {p.collectedBy || 'Unknown'}</span>
                              <span className="text-neutral-700">•</span>
                              <span className="text-neutral-450">ID: #{p.studentId.slice(-5)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-baseline sm:items-end justify-between w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-900">
                          <div className="text-left sm:text-right">
                            <span className="text-sm sm:text-base font-black text-white">GHC {p.amount.toFixed(2)}</span>
                            <div className="text-[8px] text-neutral-500 font-semibold uppercase mt-0.5">
                              {paymentDateStr} {paymentTime && `@ ${paymentTime}`}
                            </div>
                          </div>
                          
                          <div className="mt-1">
                            {p.verified ? (
                              <span className="inline-block px-2 py-0.5 bg-emerald-950/40 text-emerald-400 border border-emerald-900 text-[8px] uppercase font-black tracking-widest">
                                Approved
                              </span>
                            ) : (
                              <span className="inline-block px-1.5 py-0.5 bg-amber-950/40 text-amber-500 border border-amber-900 text-[8px] uppercase font-black tracking-widest">
                                Pending
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Perspective Tab 2: Full classroom list performance tracker with customizable search */}
        {activeLayout === 'class-perf' && (
          <motion.div
            key="class-perf-layout"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="bg-neutral-900 border-4 border-neutral-800 p-8 space-y-6"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b-2 border-neutral-800">
              <div>
                <h3 className="text-2xl font-black uppercase italic text-white tracking-tight">Active Classroom Gates Tracker</h3>
                <p className="text-xs text-neutral-400 font-bold mt-1">Search or analyze response rates across schools</p>
              </div>

              {/* Incremental search search input bar */}
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-3.5 text-neutral-500" size={14} />
                <input
                  type="text"
                  placeholder="Query class level or staff name..."
                  value={classPerfSearch}
                  onChange={(e) => setClassPerfSearch(e.target.value)}
                  className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 pl-10 pr-4 text-xs font-mono outline-none text-white focus:border-amber-400 placeholder:text-neutral-700 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredTeacherMetrics.length === 0 ? (
                <div className="col-span-full py-16 text-center text-neutral-600 font-black uppercase tracking-widest text-xs">
                  No classroom records match query.
                </div>
              ) : (
                filteredTeacherMetrics.map((met) => {
                  const rateColor = met.rate > 85 
                    ? 'text-emerald-400 border-emerald-950 bg-emerald-950/25' 
                    : met.rate > 50 
                      ? 'text-amber-400 border-amber-950 bg-amber-950/25' 
                      : 'text-red-500 border-red-950 bg-red-950/25';
                  
                  return (
                    <div key={met.className} className="bg-neutral-950 border-2 border-neutral-850 p-6 flex flex-col justify-between gap-5 hover:border-neutral-700 transition">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest bg-neutral-900 border border-neutral-800 px-2 py-0.5 font-mono">
                            {met.category} LEVEL
                          </span>
                          <h4 className="text-2xl font-black text-white font-mono leading-none pt-2">{met.className} Checkpoint</h4>
                        </div>
                        <span className={`text-lg font-black font-mono border px-3 py-1.5 ${rateColor}`}>
                          {met.rate.toFixed(0)}%
                        </span>
                      </div>

                      <div className="space-y-3.5 py-1 border-t border-b border-neutral-850">
                        <div className="flex justify-between text-xs font-bold font-mono">
                          <span className="text-neutral-500 uppercase tracking-wider">Gate Teacher:</span>
                          <span className="text-white uppercase tracking-wide">{met.teacherName}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold font-mono">
                          <span className="text-neutral-500 uppercase tracking-wider">Payments Cleared:</span>
                          <span className="text-white">{met.paidCount} pupils of {met.studentsCount}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold font-mono">
                          <span className="text-neutral-500 uppercase tracking-wider">Total Fund sum:</span>
                          <span className="text-white font-black">GHC {met.collected.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] text-neutral-500 font-mono uppercase tracking-wider">
                          <span>Progress Gauge</span>
                          <span>{met.rate.toFixed(1)}% Completed</span>
                        </div>
                        <div className="w-full bg-neutral-900 h-2 border border-neutral-850">
                          <div 
                            className={`h-full transition-all duration-500 ${
                              met.rate > 85 ? 'bg-emerald-400' : met.rate > 50 ? 'bg-amber-400' : 'bg-red-500'
                            }`}
                            style={{ width: `${met.rate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}

        {/* Perspective Tab 3: Detailed Alerts desk for high-priority uncollected payments */}
        {activeLayout === 'alerts-desk' && (
          <motion.div
            key="alerts-desk-layout"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="bg-neutral-900 border-4 border-neutral-800 p-8 space-y-6"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b-2 border-neutral-800">
              <div>
                <h3 className="text-2xl font-black uppercase italic text-white tracking-tight flex items-center gap-3">
                  <span className="w-3 h-3 bg-red-500 animate-ping" /> Guardian Alerts Dispatcher Console
                </h3>
                <p className="text-xs text-neutral-400 font-bold mt-1">Manage, notify, or dial parents of unverified pupil entries</p>
              </div>

              {/* Incremental alert list search */}
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-3.5 text-neutral-500" size={14} />
                <input
                  type="text"
                  placeholder="Query pupil name or grade level..."
                  value={alertSearch}
                  onChange={(e) => setAlertSearch(e.target.value)}
                  className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 pl-10 pr-4 text-xs font-mono outline-none text-white focus:border-amber-400 placeholder:text-neutral-700 font-bold"
                />
              </div>
            </div>

            {filteredAlerts.length === 0 ? (
              <div className="py-20 text-center bg-neutral-950 border-2 border-neutral-850 space-y-3">
                <Check className="mx-auto text-amber-400" size={36} />
                <h4 className="text-lg font-black uppercase tracking-wider text-white">Workspace Cleared</h4>
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">No unverified pupils lack ledger keys today.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAlerts.map((st) => (
                  <div key={st.studentId} className="bg-neutral-950 border-2 border-neutral-850 p-6 flex flex-col justify-between gap-5 hover:border-neutral-700 transition">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black bg-red-950 border border-red-800 text-red-400 px-2 py-0.5 uppercase tracking-widest font-mono">
                          {st.class} Checkpoint
                        </span>
                        <h4 className="text-lg font-black text-white uppercase tracking-tight leading-none pt-2">{st.studentName}</h4>
                      </div>
                      <span className="text-[10px] text-neutral-500 font-bold tracking-widest uppercase font-mono">#{st.studentId.substring(4, 9)}</span>
                    </div>

                    <div className="bg-neutral-900 border border-neutral-850 p-3.5 space-y-2 text-xs font-mono">
                      <div className="flex justify-between font-bold">
                        <span className="text-neutral-500 uppercase">Primary Category:</span>
                        <span className="text-white uppercase font-bold">{st.category}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span className="text-neutral-500 uppercase">Registered Contact:</span>
                        <span className="text-amber-400 select-all font-mono font-black">{st.guardianPhone}</span>
                      </div>
                      <div className="flex justify-between font-bold text-red-405">
                        <span className="text-red-500 uppercase">Alert reason:</span>
                        <span className="text-red-450 uppercase font-bold">Unpaid daily lock (GHC 5.00)</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDialGuardian(st.studentId, st.guardianPhone)}
                      disabled={notifiedStudents[st.studentId]}
                      className={`w-full text-center text-xs font-black uppercase tracking-widest py-3.5 border-2 transition-all cursor-pointer ${
                        notifiedStudents[st.studentId]
                          ? 'bg-amber-400 border-amber-400 text-black font-black'
                          : 'bg-neutral-950 border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900/50 text-white'
                      }`}
                    >
                      {notifiedStudents[st.studentId] ? (
                        <span className="flex items-center justify-center gap-1.5">
                          Dialing secure link... Dial OK
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1.5">
                          <PhoneCall size={12} /> Contact Parent Guardian
                        </span>
                      )}
                    </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

        {/* Perspective Tab 4: Weekly Collections Aggregate Matrix */}
        {activeLayout === 'weekly-aggregate' && (
          <motion.div
            key="weekly-layout"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="bg-neutral-900 border-4 border-neutral-800 p-8 space-y-6 text-left"
          >
            {/* Header / Week Navigation Row */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b-2 border-neutral-850">
              <div>
                <span className="text-[9px] text-amber-500 font-mono tracking-widest font-black uppercase bg-amber-400/10 border border-amber-400/30 px-2.5 py-1 rounded-xs">
                  Financial Summaries & Aggregates
                </span>
                <h3 className="text-xl font-black uppercase italic text-white tracking-tight mt-2 flex items-center gap-2">
                  <Coins className="text-amber-400" size={18} /> Weekly Fee Collections Matrix
                </h3>
                <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest mt-1 font-bold">
                  Class-by-Class school fees log for current week calendar
                </p>
              </div>

              {/* Selector / Stepper */}
              <div className="flex items-center gap-2 bg-neutral-950 p-1 border border-neutral-850">
                <button
                  type="button"
                  onClick={() => handleShiftWeek('prev')}
                  className="px-3 py-1.5 text-[10px] font-mono font-black uppercase tracking-wider text-neutral-450 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
                  title="Hop back 1 week"
                >
                  &larr; Prev Week
                </button>
                <span className="px-4 py-1.5 bg-neutral-900 border border-neutral-800/80 text-[10px] font-black font-mono text-white tracking-wider uppercase">
                  {new Date(weeklyCollectionsData.mondayStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - {new Date(weeklyCollectionsData.sundayStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <button
                  type="button"
                  onClick={() => handleShiftWeek('next')}
                  className="px-3 py-1.5 text-[10px] font-mono font-black uppercase tracking-wider text-neutral-450 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
                  title="Hop forward 1 week"
                >
                  Next Week &rarr;
                </button>
              </div>
            </div>

            {/* Quick KPI Cards row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-neutral-950 border-2 border-neutral-850 p-5 space-y-1.5">
                <span className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest font-extrabold block">
                  Weekly Sum Collected
                </span>
                <div className="text-2xl font-black text-amber-400 font-mono">
                  GHC {weeklyCollectionsData.grandTotal.toFixed(2)}
                </div>
                <p className="text-[9.5px] text-neutral-500 leading-tight">
                  Total school fees aggregated across all classes this calendar week.
                </p>
              </div>

              <div className="bg-neutral-950 border-2 border-neutral-850 p-5 space-y-1.5">
                <span className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest font-extrabold block">
                  Peak Collection Day
                </span>
                <div className="text-2xl font-black text-white font-mono uppercase tracking-tight">
                  {peakDayInfo.amount > 0 ? peakDayInfo.label : 'None'}
                </div>
                <p className="text-[9.5px] text-neutral-500 leading-tight">
                  Highest intake was <strong className="text-neutral-350">GHC {peakDayInfo.amount.toFixed(2)}</strong> on {peakDayInfo.amount > 0 ? peakDayInfo.dateStr : 'N/A'}.
                </p>
              </div>

              <div className="bg-neutral-950 border-2 border-neutral-850 p-5 space-y-1.5">
                <span className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest font-extrabold block">
                  Top Performing Cohort
                </span>
                <div className="text-2xl font-black text-emerald-400 font-mono uppercase tracking-tight">
                  {topClassInfo.amount > 0 ? `Class ${topClassInfo.className}` : 'None'}
                </div>
                <p className="text-[9.5px] text-neutral-500 leading-tight">
                  Class collected a supreme total of <strong className="text-emerald-500">GHC {topClassInfo.amount.toFixed(2)}</strong> this week.
                </p>
              </div>
            </div>

            {/* Collections Trend Line / Bar Chart Row */}
            <div className="bg-neutral-950 border-2 border-neutral-850 p-6 space-y-4">
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider font-mono">Daily Inflow Velocity</h4>
                <p className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest mt-0.5">Visualizing fee revenue flow across days</p>
              </div>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1c" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#4b5563" 
                      fontSize={9} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#4b5563" 
                      fontSize={9} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(v) => `GHC ${v}`}
                    />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: '#2e2e2e', strokeWidth: 1 }} />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#fbbf24" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#fbbf24', strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: '#ffffff', strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* The Main Excel-Style Aggregate Grid Table */}
            <div className="bg-neutral-950 border-2 border-neutral-850 p-2 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-neutral-850 text-[10px] font-black text-neutral-400 uppercase tracking-widest font-mono bg-neutral-900/50">
                      <th className="py-3 px-4">Class Level</th>
                      {weeklyCollectionsData.weekdays.map((day) => {
                        const isToday = day.dateStr === dateFilter;
                        return (
                          <th 
                            key={day.dateStr} 
                            className={`py-3 px-3 text-center transition-colors ${
                              isToday ? 'text-amber-400 bg-amber-450/10' : ''
                            }`}
                          >
                            <span className="block text-[9.5px] font-black leading-none">{day.label.substring(0, 3)}</span>
                            <span className="block text-[8px] text-neutral-500 font-mono mt-1 font-bold">{new Date(day.dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                          </th>
                        );
                      })}
                      <th className="py-3 px-4 text-right bg-neutral-900 font-extrabold text-white">Class Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900">
                    {weeklyCollectionsData.rows.map((row) => {
                      return (
                        <tr 
                          key={row.className} 
                          className={`transition-all border-b border-neutral-900 ${
                            row.isTrendingBelow 
                              ? 'bg-rose-950/5 hover:bg-rose-950/10 border-l-4 border-l-rose-500/60' 
                              : 'bg-neutral-950/5 hover:bg-neutral-900/40 border-l-4 border-l-transparent'
                          }`}
                        >
                          <td className="py-3 px-4 font-mono bg-neutral-950/50">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <span className="font-black text-white text-sm">
                                Class {row.className}
                              </span>
                              {row.isTrendingBelow ? (
                                <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest bg-rose-500/10 border border-rose-500/30 text-rose-400 px-1.5 py-0.5 rounded-xs">
                                  <TrendingDown size={10} className="text-rose-400" />
                                  Below Avg ({Math.abs(row.percentDifference).toFixed(0)}%)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-1.5 py-0.5 rounded-xs">
                                  <TrendingUp size={10} className="text-emerald-400" />
                                  Above Avg (+{row.percentDifference.toFixed(0)}%)
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] text-neutral-500 font-mono mt-0.5 uppercase tracking-wider">
                              Weekly Avg: <span className="text-neutral-400 font-bold">GHC {row.historicalAvg.toFixed(2)}</span>
                            </div>
                          </td>
                          {weeklyCollectionsData.weekdays.map((day) => {
                            const value = row.dailyCollected[day.dateStr] || 0;
                            const isToday = day.dateStr === dateFilter;
                            return (
                              <td 
                                key={day.dateStr} 
                                className={`py-3 px-3 text-center font-mono font-bold transition-all ${
                                  isToday ? 'bg-amber-450/5' : ''
                                } ${
                                  value > 0 ? 'text-neutral-200' : 'text-neutral-600'
                                }`}
                              >
                                {value > 0 ? `GHC ${value.toFixed(2)}` : '-'}
                              </td>
                            );
                          })}
                          <td className={`py-3 px-4 text-right font-black font-mono bg-neutral-900/50 ${
                            row.isTrendingBelow ? 'text-rose-450' : 'text-amber-450'
                          }`}>
                            GHC {row.classTotal.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                    {/* The Footer column-totals Row */}
                    <tr className="border-t-2 border-neutral-800 bg-neutral-900 font-mono text-[11px] font-extrabold text-white">
                      <td className="py-4.5 px-4 uppercase font-black tracking-wider">Total collections</td>
                      {weeklyCollectionsData.weekdays.map((day) => {
                        const totalValue = weeklyCollectionsData.dayTotals[day.dateStr] || 0;
                        const isToday = day.dateStr === dateFilter;
                        return (
                          <td 
                            key={day.dateStr} 
                            className={`py-4.5 px-3 text-center font-black ${
                              isToday ? 'text-amber-450 bg-amber-400/10' : ''
                            }`}
                          >
                            GHC {totalValue.toFixed(2)}
                          </td>
                        );
                      })}
                      <td className="py-4.5 px-4 text-right font-black text-amber-450 text-xs bg-amber-400/15 border border-amber-400/30">
                        GHC {weeklyCollectionsData.grandTotal.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Context Notice info */}
            <div className="bg-neutral-950 p-4 border border-neutral-850 flex items-start gap-3">
              <Info className="text-amber-400 shrink-0 mt-0.5" size={14} />
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block font-mono">Ledger Synchronization Tip</span>
                <p className="text-[10px] text-neutral-400 leading-normal font-medium">
                  This weekly matrix sums only processed & approved school fee payments (excluding absent cohorts). Discrepancies may appear if Gatekeepers have pending local check-ins offline. Ensure all ledger changes on the <strong className="text-white">"Sleek Bento Grid"</strong> are pushed before reporting.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
