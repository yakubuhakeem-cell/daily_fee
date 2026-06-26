/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { useApp, calculateStudentFinancialState } from "../context/AppContext";
import { SchoolCategory, StudentClass } from "../types";
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
  Info,
  MessageSquare,
  Mail,
  Smartphone,
  Printer,
  FileText,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { VoiceSearchButton } from "./VoiceSearchButton";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";

export const Dashboard: React.FC = React.memo(() => {
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
    users,
    expenses,
    sendautomatedWhatsApp,
    theme,
  } = useApp();

  const isDaylight = theme === "daylight";

  // Dashboard print & PDF export friendly states
  const [showPrintFriendlyModal, setShowPrintFriendlyModal] = useState(false);
  const [printWatermark, setPrintWatermark] = useState<'NONE' | 'DRAFT' | 'CONFIDENTIAL' | 'SAAKO AUDITED'>('SAAKO AUDITED');
  const [printSignatory, setPrintSignatory] = useState('Yakubu Hakeem (Headmaster)');
  const [printMemo, setPrintMemo] = useState('This is an official administrative snapshot of Saako Holy Child Academy cash flow feed & performance metrics. Please verify all records.');
  const [printPreviewZoom, setPrintPreviewZoom] = useState(90);

  const [syncStatus, setSyncStatus] = useState<{
    loading: boolean;
    error: string | null;
    successMessage: string | null;
  }>({
    loading: false,
    error: null,
    successMessage: null,
  });

  const handleSyncNow = async () => {
    setSyncStatus({ loading: true, error: null, successMessage: null });
    try {
      const result = await seedFirebaseFromLocal();
      if (result.success) {
        setSyncStatus({
          loading: false,
          error: null,
          successMessage:
            result.message || "Ledger successfully pushed to cloud database!",
        });
        setTimeout(() => {
          setSyncStatus((prev) => ({ ...prev, successMessage: null }));
        }, 5500);
      } else {
        setSyncStatus({
          loading: false,
          error:
            result.message ||
            "Seeding rejected. Target database is unreachable.",
          successMessage: null,
        });
      }
    } catch (err: any) {
      setSyncStatus({
        loading: false,
        error: err.message || "Sync network error",
        successMessage: null,
      });
    }
  };

  // Active Layout perspective state
  const [activeLayout, setActiveLayout] = useState<
    | "bento"
    | "class-perf"
    | "alerts-desk"
    | "weekly-aggregate"
    | "absence-heatmap"
    | "arrears-performance"
    | "monthly-attendance"
  >("bento");

  // Monthly Attendance trends chart selection
  const [selectedChartMonth, setSelectedChartMonth] = useState<string>("");

  const [arrearsMenuOption, setArrearsMenuOption] = useState<
    "class-debt" | "global-debt" | "teacher-perf" | "grade-teacher-perf"
  >("global-debt");

  // Heatmap state variables for attendance analytics
  const [heatmapClass, setHeatmapClass] = useState<StudentClass | "all">("all");
  const [heatmapDaysRange, setHeatmapDaysRange] = useState<number>(20); // last 20 school days
  const [heatmapSearch, setHeatmapSearch] = useState<string>("");
  const [heatmapSort, setHeatmapSort] = useState<"absent-desc" | "name-asc">(
    "absent-desc",
  );
  const [hoveredCell, setHoveredCell] = useState<{
    studentId: string;
    dateStr: string;
  } | null>(null);

  // Confirmation state for resetting revenue or pupils list
  const [resetConfirming, setResetConfirming] = useState<
    "none" | "payments" | "both"
  >("none");

  // Dynamic daily goal for collections
  const [dailyGoal, setDailyGoal] = useState<number>(() => {
    const saved = localStorage.getItem("daily_collection_goal");
    return saved ? parseInt(saved, 10) : 500;
  });

  // Duty Roster State
  const [dutySearch, setDutySearch] = useState("");
  const [dutyFilter, setDutyFilter] = useState<"all" | "active" | "standby">(
    "all",
  );
  const [dutyCopied, setDutyCopied] = useState(false);

  const handleUpdateDailyGoal = (newGoal: number) => {
    const goal = Math.max(1, newGoal);
    setDailyGoal(goal);
    try {
      localStorage.setItem("daily_collection_goal", goal.toString());
    } catch (e) {
      console.warn("Failed to write daily_collection_goal to localStorage:", e);
    }
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
      "Nursery",
      "KG1",
      "KG2",
      "B1",
      "B2",
      "B3",
      "B4",
      "B5",
      "B6",
      "B7",
      "B8",
      "B9",
    ];

    return classesList.map((cls) => {
      // Find actual assigned teacher user or default fallback
      const assignedUser = users.find(
        (u) =>
          u.role === "Teacher" &&
          (u.assignedClass === cls || u.assignedClasses?.includes(cls)) &&
          u.active !== false,
      );

      let teacherName = "";
      let email = "N/A";
      if (assignedUser) {
        teacherName = assignedUser.name;
        email = assignedUser.email;
      } else {
        if (cls === "Nursery") teacherName = "Mrs. Abigail Mensah";
        else if (cls === "B1") teacherName = "Mr. Emmanuel Gyamfi";
        else if (cls === "KG1") teacherName = "Mrs. Grace Annan";
        else if (cls === "KG2") teacherName = "Mrs. Beatrice Boateng";
        else if (cls === "B2") teacherName = "Mr. Samuel Osei";
        else if (cls === "B3") teacherName = "Mr. Kofi Boateng";
        else if (cls === "B4") teacherName = "Mrs. Rita Owusu";
        else if (cls === "B5") teacherName = "Mr. Desmond Taylor";
        else if (cls === "B6") teacherName = "Mrs. Joyce Arthur";
        else if (cls === "B7") teacherName = "Mr. Richard Boadu";
        else if (cls === "B8") teacherName = "Madam Faustina Asare";
        else if (cls === "B9") teacherName = "Mr. Philip Ansah";
        else teacherName = "Madam Mary Appiah";
      }

      // Specific class monitoring responsibility based on class category & grade
      let responsibility = "Gatekeeper & Registration Desk";
      let keyBadge = "Pre-School";
      if (cls === "Nursery") {
        responsibility =
          "Pre-School Gate Reception & Playground Safety Marshal";
        keyBadge = "Nursery";
      } else if (cls === "KG1") {
        responsibility =
          "Pre-School Gate Reception & Guardian Hand-off Organizer";
        keyBadge = "KG1";
      } else if (cls === "KG2") {
        responsibility =
          "KG Compound Monitor, Attendance & Health-status Sentry";
        keyBadge = "KG2";
      } else if (cls === "B1") {
        responsibility =
          "Gate Collector, Ledger Entry Officer & Pocket Receipt Dispatcher";
        keyBadge = "Primary";
      } else if (cls === "B2") {
        responsibility =
          "Class Overseer, Gatekeeper & Daily Token Issuance Officer";
        keyBadge = "Primary";
      } else if (cls === "B3") {
        responsibility =
          "B3 Gateway Marshaller & Classroom Attendance Check Controller";
        keyBadge = "Primary";
      } else if (cls === "B4") {
        responsibility =
          "Checkpoint Sentry, Guardian Liaison & Cash Flow Logger";
        keyBadge = "Primary";
      } else if (cls === "B5") {
        responsibility =
          "Hallway Corridor Patrol Officer & Compliance Gatekeeper";
        keyBadge = "Primary";
      } else if (cls === "B6") {
        responsibility =
          "Class Monitor & Central Academic Ledger Verification Auditor";
        keyBadge = "Primary";
      } else if (cls === "B7") {
        responsibility =
          "JHS Outer Fence Patrol Marshal & Assembly Gatekeeper Officer";
        keyBadge = "JHS";
      } else if (cls === "B8") {
        responsibility =
          "JHS Main Corridor Gate Superintendent & Homework Compliance Checker";
        keyBadge = "JHS";
      } else if (cls === "B9") {
        responsibility =
          "JHS Senior Exit Marshal & Latecomer Disciplinary Point Officer";
        keyBadge = "JHS";
      }

      // Live Check-in Statistics for current date
      const classPayments = payments.filter(
        (p) => p.class === cls && p.date === dateFilter,
      );
      const verifiedPayments = classPayments.filter(
        (p) => p.verified && !p.isAbsent,
      );
      const hasCollectedToday = classPayments.some(
        (p) => p.collectedBy === teacherName,
      );

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
    return dutyRoster.filter((item) => {
      const matchesSearch =
        item.teacherName.toLowerCase().includes(dutySearch.toLowerCase()) ||
        item.className.toLowerCase().includes(dutySearch.toLowerCase()) ||
        item.responsibility.toLowerCase().includes(dutySearch.toLowerCase());

      const matchesStatus =
        dutyFilter === "all"
          ? true
          : dutyFilter === "active"
            ? item.hasCollectedToday
            : !item.hasCollectedToday;

      return matchesSearch && matchesStatus;
    });
  }, [dutyRoster, dutySearch, dutyFilter]);

  const handleCopyRosterText = () => {
    const header = `SAAKO HOLY CHILD ACADEMY - DUTY ROSTER FOR ${dateFilter}\n=========================================\n`;
    const body = dutyRoster
      .map((item, idx) => {
        return `${idx + 1}. [Class ${item.className}] Teacher: ${item.teacherName} | Status: ${item.hasCollectedToday ? "ACTIVE ON DUTY" : "STANDBY"} | Responsibility: ${item.responsibility}`;
      })
      .join("\n");

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(header + body);
      setDutyCopied(true);
      setTimeout(() => setDutyCopied(false), 2000);
    }
  };

  // Chart toggle metric state
  const [chartMetric, setChartMetric] = useState<"revenue" | "volume">(
    "revenue",
  );

  // Chart active view mode switch: 'trends' for manual SVG, 'recharts' for Recharts Line Chart
  const [chartView, setChartView] = useState<"trends" | "recharts">("recharts");

  // Helper to shift the selected week by -7 or +7 days
  const handleShiftWeek = (direction: "prev" | "next") => {
    const parts = dateFilter.split("-");
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const d = new Date(year, month, day);
    d.setDate(d.getDate() + (direction === "prev" ? -7 : 7));

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const val = `${yyyy}-${mm}-${dd}`;
    setDateFilter(val);
    setCurrentDate(val);
  };

  // Memoized weekly aggregate collections per class
  const weeklyCollectionsData = useMemo(() => {
    // 1. Get the week's dates
    // Compute Monday of the week containing `dateFilter`
    const parts = dateFilter.split("-");
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const targetDate = new Date(year, month, day);

    const dayOfWeek = targetDate.getDay(); // 0 Sunday, 1 Monday, ...
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(targetDate);
    monday.setDate(targetDate.getDate() + distanceToMonday);

    const weekdays: { dateStr: string; label: string; dateObj: Date }[] = [];
    const dayLabels = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    for (let i = 0; i < 7; i++) {
      const current = new Date(monday);
      current.setDate(monday.getDate() + i);
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, "0");
      const dd = String(current.getDate()).padStart(2, "0");
      weekdays.push({
        dateStr: `${yyyy}-${mm}-${dd}`,
        label: dayLabels[i],
        dateObj: current,
      });
    }

    const classesList: StudentClass[] = [
      "Nursery",
      "KG1",
      "KG2",
      "B1",
      "B2",
      "B3",
      "B4",
      "B5",
      "B6",
      "B7",
      "B8",
      "B9",
    ];

    // Helper to get monday date string for grouping historical averages
    const getMondayOfDate = (dateStr: string) => {
      const pParts = dateStr.split("-");
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
      return `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, "0")}-${String(mon.getDate()).padStart(2, "0")}`;
    };

    // Calculate all weeks represented in verified payments
    const verifiedPayments = payments.filter(
      (p) => p.verified && p.isAbsent !== true,
    );
    const uniqueWeeks: string[] = Array.from(
      new Set(verifiedPayments.map((p) => getMondayOfDate(p.date))),
    );
    const historyWeeksCount = uniqueWeeks.length;

    // Build the grid data: rows = classes
    const rows = classesList.map((cls) => {
      const dailyCollected: Record<string, number> = {};
      let classTotal = 0;

      weekdays.forEach((dayObj) => {
        // Collect verified payments for this class on this day
        const dayPayments = payments.filter(
          (p) =>
            p.class === cls &&
            p.date === dayObj.dateStr &&
            p.verified &&
            p.isAbsent !== true,
        );
        const daySum = dayPayments.reduce((acc, curr) => acc + curr.amount, 0);
        dailyCollected[dayObj.dateStr] = daySum;
        classTotal += daySum;
      });

      // Calculate historical average
      const weeklyTotals: Record<string, number> = {};
      uniqueWeeks.forEach((w) => {
        weeklyTotals[w] = 0;
      });

      const classPayments = verifiedPayments.filter((p) => p.class === cls);
      classPayments.forEach((p) => {
        const wk = getMondayOfDate(p.date);
        weeklyTotals[wk] = (weeklyTotals[wk] || 0) + p.amount;
      });

      const historicalSum = Object.values(weeklyTotals).reduce(
        (sum, val) => sum + val,
        0,
      );
      let historicalAvg =
        historyWeeksCount > 0 ? historicalSum / historyWeeksCount : 0;

      // Fallback threshold if only 1 week exists (e.g. initial demo database or fresh term starting)
      const classStudentsCount = students
        ? students.filter((s) => s.class === cls && s.active !== false).length
        : 6;
      const expectedWeeklyTarget = classStudentsCount * 18.0; // Benchmark target GHC 18 per active student

      if (historyWeeksCount <= 1) {
        historicalAvg = expectedWeeklyTarget || 60.0;
      }

      const isTrendingBelow = classTotal < historicalAvg;
      const percentDifference =
        historicalAvg > 0
          ? ((classTotal - historicalAvg) / historicalAvg) * 100
          : 0;

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
    let maxDayLabel = "N/A";
    let maxDateStr = "";
    weekdays.forEach((d) => {
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
    let maxClassName = "N/A";
    weeklyCollectionsData.rows.forEach((r) => {
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
    return weeklyCollectionsData.weekdays.map((d) => ({
      name: d.label.substring(0, 3).toUpperCase(),
      date: d.dateStr,
      revenue: weeklyCollectionsData.dayTotals[d.dateStr] || 0,
    }));
  }, [weeklyCollectionsData]);

  const classGoalsData = useMemo(() => {
    return weeklyCollectionsData.rows.map((row) => ({
      name: row.className,
      "Actual Collected": row.classTotal,
      "Target Goal": parseFloat(row.historicalAvg.toFixed(2)),
    }));
  }, [weeklyCollectionsData]);

  const dailyExpenditureChartData = useMemo(() => {
    const groups: { [date: string]: { [category: string]: number } } = {};

    expenses.forEach((e) => {
      const dateStr = e.date;
      if (!groups[dateStr]) {
        groups[dateStr] = {
          Supplies: 0,
          Maintenance: 0,
          Utility: 0,
          Payroll: 0,
          Food: 0,
          Transport: 0,
          Uniforms: 0,
          Others: 0,
        };
      }

      const category = e.category === "Utilities" ? "Utility" : e.category;
      if (groups[dateStr][category] !== undefined) {
        groups[dateStr][category] += e.amount;
      } else {
        groups[dateStr].Others += e.amount;
      }
    });

    const sortedDates = Object.keys(groups).sort();

    if (sortedDates.length === 0) {
      return weeklyCollectionsData.weekdays.map((d) => ({
        date: d.dateStr,
        name: d.label.substring(0, 3).toUpperCase(),
        Supplies: 0,
        Maintenance: 0,
        Utility: 0,
        Payroll: 0,
        Food: 0,
        Transport: 0,
        Uniforms: 0,
        Others: 0,
        total: 0,
      }));
    }

    // Map sorted dates to Recharts objects (keep latest 10 days to fit nicely)
    const recentDates = sortedDates.slice(-10);
    return recentDates.map((dateStr) => {
      const g = groups[dateStr];
      const dObj = new Date(dateStr);
      const name = dObj.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const total =
        g.Supplies +
        g.Maintenance +
        g.Utility +
        g.Payroll +
        g.Food +
        g.Transport +
        g.Uniforms +
        g.Others;
      return {
        date: dateStr,
        name,
        Supplies: parseFloat(g.Supplies.toFixed(2)),
        Maintenance: parseFloat(g.Maintenance.toFixed(2)),
        Utility: parseFloat(g.Utility.toFixed(2)),
        Payroll: parseFloat(g.Payroll.toFixed(2)),
        Food: parseFloat(g.Food.toFixed(2)),
        Transport: parseFloat(g.Transport.toFixed(2)),
        Uniforms: parseFloat(g.Uniforms.toFixed(2)),
        Others: parseFloat(g.Others.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
      };
    });
  }, [expenses, weeklyCollectionsData]);

  // Custom Recharts theme-aware tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const isDaylight = theme === "daylight";
      return (
        <div className={`${isDaylight ? "bg-white border-neutral-300 text-neutral-900 shadow-md" : "bg-neutral-900 border-neutral-800 text-white shadow-2xl"} border-2 p-3 font-mono text-[10px] text-left uppercase space-y-1.5`}>
          <p className={`font-extrabold ${isDaylight ? "text-amber-600 border-neutral-200" : "text-amber-400 border-neutral-800"} tracking-wider mb-1.5 border-b pb-1`}>
            {label}
          </p>
          {payload.map((item: any, idx: number) => (
            <div key={idx} className="flex justify-between gap-6 items-center">
              <span className={`${isDaylight ? "text-neutral-500" : "text-neutral-400"} font-bold`}>{item.name}:</span>
              <span
                className="font-black"
                style={{ color: item.color || item.stroke }}
              >
                GHC {Number(item.value).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const availableMonths = useMemo(() => {
    if (!activeTerm || !activeTerm.schoolDays) return [];
    const months = new Set<string>();
    activeTerm.schoolDays.forEach(day => {
      months.add(day.substring(0, 7)); // e.g. "2026-06"
    });
    return Array.from(months).sort();
  }, [activeTerm]);

  React.useEffect(() => {
    if (!selectedChartMonth && currentDate) {
      const currentMonth = currentDate.substring(0, 7);
      if (availableMonths.includes(currentMonth)) {
        setSelectedChartMonth(currentMonth);
      } else if (availableMonths.length > 0) {
        setSelectedChartMonth(availableMonths[availableMonths.length - 1]);
      }
    }
  }, [currentDate, availableMonths, selectedChartMonth]);

  const monthlyAttendanceData = useMemo(() => {
    if (!activeTerm || !activeTerm.schoolDays) return [];
    
    // Find school days for the selected month
    const monthToFilter = selectedChartMonth || currentDate.substring(0, 7);
    let schoolDaysInMonth = activeTerm.schoolDays.filter(day => day.startsWith(monthToFilter));
    
    // Fallback: if no school days in the current selected month, find the most common or latest month
    if (schoolDaysInMonth.length === 0 && activeTerm.schoolDays.length > 0) {
      const lastDay = activeTerm.schoolDays[activeTerm.schoolDays.length - 1];
      const fallbackPrefix = lastDay.substring(0, 7);
      schoolDaysInMonth = activeTerm.schoolDays.filter(day => day.startsWith(fallbackPrefix));
    }
    
    const activeStudents = students.filter(s => s.active);
    const totalActiveCount = activeStudents.length;
    
    return schoolDaysInMonth.map(dayStr => {
      const parts = dayStr.split("-");
      const dayLabel = parts[2] ? `${parts[2]}` : dayStr;
      const formattedDate = parts[2] && parts[1] ? `${parts[2]}/${parts[1]}` : dayStr;
      
      const dayPayments = payments.filter(p => p.date === dayStr);
      const presentCount = dayPayments.filter(p => !p.isAbsent).length;
      const absentCount = dayPayments.filter(p => p.isAbsent).length;
      const unmarkedCount = Math.max(0, totalActiveCount - presentCount - absentCount);
      
      const attendanceRate = totalActiveCount > 0 ? (presentCount / totalActiveCount) * 100 : 0;
      
      return {
        date: dayStr,
        dayLabel,
        formattedDate,
        "Present": presentCount,
        "Absent": absentCount,
        "Unmarked": unmarkedCount,
        "Attendance Rate (%)": Math.round(attendanceRate),
        "Total Active": totalActiveCount
      };
    });
  }, [activeTerm, currentDate, selectedChartMonth, payments, students]);

  const monthlyAggregateStats = useMemo(() => {
    if (monthlyAttendanceData.length === 0) {
      return {
        avgRate: 0,
        bestDay: "—",
        bestRate: 0,
        worstDay: "—",
        worstRate: 0,
        totalSchoolDays: 0,
        avgPresent: 0,
        avgAbsent: 0
      };
    }

    let totalRateSum = 0;
    let bestRate = -1;
    let bestDay = "—";
    let worstRate = 101;
    let worstDay = "—";
    let totalPresentSum = 0;
    let totalAbsentSum = 0;

    monthlyAttendanceData.forEach(day => {
      const rate = day["Attendance Rate (%)"];
      totalRateSum += rate;
      totalPresentSum += day["Present"];
      totalAbsentSum += day["Absent"];

      if (rate > bestRate) {
        bestRate = rate;
        bestDay = day.formattedDate;
      }
      if (rate < worstRate) {
        worstRate = rate;
        worstDay = day.formattedDate;
      }
    });

    const avgRate = Math.round(totalRateSum / monthlyAttendanceData.length);
    const avgPresent = Math.round(totalPresentSum / monthlyAttendanceData.length);
    const avgAbsent = Math.round(totalAbsentSum / monthlyAttendanceData.length);

    return {
      avgRate,
      bestDay,
      bestRate,
      worstDay,
      worstRate,
      totalSchoolDays: monthlyAttendanceData.length,
      avgPresent,
      avgAbsent
    };
  }, [monthlyAttendanceData]);

  const monthlyCategoryBreakdown = useMemo(() => {
    const categories: Record<SchoolCategory, { present: number, totalAll: number }> = {
      'Pre-school': { present: 0, totalAll: 0 },
      'Primary': { present: 0, totalAll: 0 },
      'JHS': { present: 0, totalAll: 0 }
    };

    if (monthlyAttendanceData.length === 0) return categories;

    const activeStudents = students.filter(s => s.active);
    const catCounts: Record<SchoolCategory, number> = {
      'Pre-school': activeStudents.filter(s => s.category === 'Pre-school').length,
      'Primary': activeStudents.filter(s => s.category === 'Primary').length,
      'JHS': activeStudents.filter(s => s.category === 'JHS').length
    };

    monthlyAttendanceData.forEach(day => {
      const dayPayments = payments.filter(p => p.date === day.date);
      
      (['Pre-school', 'Primary', 'JHS'] as SchoolCategory[]).forEach(cat => {
        const catPresent = dayPayments.filter(p => p.category === cat && !p.isAbsent).length;
        categories[cat].present += catPresent;
        categories[cat].totalAll += catCounts[cat];
      });
    });

    return categories;
  }, [monthlyAttendanceData, payments, students]);

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

    return daysToUse.map((dStr) => {
      const parts = dStr.split("-");
      const formattedDate =
        parts[2] && parts[1] ? `${parts[2]}/${parts[1]}` : dStr;

      const dayPayments = payments.filter((p) => p.date === dStr && p.verified);
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
  const [alertSearch, setAlertSearch] = useState("");
  const [classPerfSearch, setClassPerfSearch] = useState("");

  // Bulk alert states
  const [selectedAlertIds, setSelectedAlertIds] = useState<string[]>([]);
  const [bulkMessageTemplate, setBulkMessageTemplate] = useState(
    `*SAAKO HOLY CHILD ACADEMY*\n` +
      `⚠️ *OUTSTANDING FEES NOTIFICATION* ⚠️\n\n` +
      `Dear Guardian,\n\n` +
      `This is an administrative reminder regarding the financial ledger of your child, *{studentName}* ({className}).\n\n` +
      `According to our local system checkout logs on {currentDate}, there is an outstanding arrears balance of *GHC {arrearsAmount}* (Billing Type: {paymentType}).\n\n` +
      `Kindly reconcile this balance at the checkpoint counter or through direct transfer to avoid any disruptions at daily check-in.\n\n` +
      `Thank you for your cooperation.\n` +
      `_Office of the Registrar Desk_`,
  );
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [bulkSendResults, setBulkSendResults] = useState<{
    total: number;
    current: number;
    logs: Array<{
      studentName: string;
      status: "sending" | "success" | "error";
      message: string;
    }>;
  } | null>(null);

  const stats = useMemo(
    () => getDailyStats(dateFilter),
    [getDailyStats, dateFilter],
  );
  const teacherMetrics = useMemo(
    () => getTeacherMetrics(dateFilter),
    [getTeacherMetrics, dateFilter],
  );
  const trends = useMemo(() => getCashFlowTrend(), [getCashFlowTrend]);

  const getClassCategory = (cls: StudentClass): SchoolCategory => {
    if (["Nursery", "KG1", "KG2"].includes(cls)) return "Pre-school";
    if (["B1", "B2", "B3", "B4", "B5", "B6"].includes(cls)) return "Primary";
    return "JHS";
  };

  const classArrearsMetrics = useMemo(() => {
    const list = students || [];
    const classMap: Record<string, { totalArrears: number; studentCount: number; indebtedStudents: number }> = {};
    
    const classes: StudentClass[] = [
      'Nursery', 'KG1', 'KG2',
      'B1', 'B2', 'B3', 'B4', 'B5', 'B6',
      'B7', 'B8', 'B9'
    ];
    classes.forEach(c => {
      classMap[c] = { totalArrears: 0, studentCount: 0, indebtedStudents: 0 };
    });

    list.filter(s => s.active).forEach((s) => {
      const state = calculateStudentFinancialState(
        s,
        payments || [],
        activeTerm,
        currentDate,
        5.0
      );
      const debt = state ? state.totalDebt : 0;
      
      if (!classMap[s.class]) {
        classMap[s.class] = { totalArrears: 0, studentCount: 0, indebtedStudents: 0 };
      }
      classMap[s.class].studentCount += 1;
      if (debt > 0) {
        classMap[s.class].totalArrears += debt;
        classMap[s.class].indebtedStudents += 1;
      }
    });

    return Object.entries(classMap).map(([className, m]) => ({
      className,
      category: getClassCategory(className as StudentClass),
      totalArrears: m.totalArrears,
      studentCount: m.studentCount,
      indebtedStudents: m.indebtedStudents,
    }));
  }, [students, payments, activeTerm, currentDate]);

  const globalArrearsSum = useMemo(() => {
    return classArrearsMetrics.reduce((sum, item) => sum + item.totalArrears, 0);
  }, [classArrearsMetrics]);

  const classFeesSummary = useMemo(() => {
    const list = students || [];
    const classes: StudentClass[] = [
      'Nursery', 'KG1', 'KG2',
      'B1', 'B2', 'B3', 'B4', 'B5', 'B6',
      'B7', 'B8', 'B9'
    ];

    return classes.map(cls => {
      const clsStudents = list.filter(s => s.class === cls && s.active);
      let totalCollected = 0;
      let totalMissing = 0;

      clsStudents.forEach(s => {
        const state = calculateStudentFinancialState(
          s,
          payments || [],
          activeTerm,
          currentDate,
          5.0
        );
        if (state) {
          totalCollected += state.totalPaid || 0;
          totalMissing += state.totalDebt || 0;
        }
      });

      const totalTarget = totalCollected + totalMissing;
      const rate = totalTarget > 0 ? (totalCollected / totalTarget) * 100 : 100;

      return {
        className: cls,
        category: getClassCategory(cls),
        collected: totalCollected,
        missing: totalMissing,
        rate,
        studentCount: clsStudents.length
      };
    });
  }, [students, payments, activeTerm, currentDate]);
  const pendingAlerts = useMemo(
    () => getPendingAlerts(dateFilter),
    [getPendingAlerts, dateFilter],
  );

  const totalVerifiedAccumulatedRevenue = useMemo(() => {
    return (payments || []).reduce(
      (acc, p) => (p.verified ? acc + p.amount : acc),
      0,
    );
  }, [payments]);

  const recentPayments = useMemo(() => {
    return [...(payments || [])]
      .sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        if (timeA !== timeB) return timeB - timeA;
        return (b.id || "").localeCompare(a.id || "");
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
      return new Date(`${dateFilter}T00:00:00`).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    } catch {
      return "Current Month";
    }
  }, [dateFilter]);

  const monthSchoolDays = useMemo(() => {
    if (!activeTerm || !activeTerm.schoolDays) return [];
    return activeTerm.schoolDays.filter((d) =>
      d.startsWith(currentMonthYearMonth),
    );
  }, [activeTerm, currentMonthYearMonth]);

  const monthlyCollectedVerified = useMemo(() => {
    return (payments || [])
      .filter((p) => p.verified && p.date.startsWith(currentMonthYearMonth))
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments, currentMonthYearMonth]);

  const monthlyCollectedPending = useMemo(() => {
    return (payments || [])
      .filter(
        (p) =>
          !p.verified &&
          !p.isAbsent &&
          p.date.startsWith(currentMonthYearMonth),
      )
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments, currentMonthYearMonth]);

  const activeStudentsCount = useMemo(() => {
    return (students || []).filter((s) => s.active).length;
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
  const getQuickDateStr = (type: "today" | "yesterday" | "last_friday") => {
    const refDate = new Date();
    const year = refDate.getFullYear();
    const baseDate = year === 2026 ? refDate : new Date("2026-06-01");

    if (type === "today") {
      const yyyy = baseDate.getFullYear();
      const mm = String(baseDate.getMonth() + 1).padStart(2, "0");
      const dd = String(baseDate.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    } else if (type === "yesterday") {
      const prev = new Date(baseDate);
      prev.setDate(baseDate.getDate() - 1);
      const yyyy = prev.getFullYear();
      const mm = String(prev.getMonth() + 1).padStart(2, "0");
      const dd = String(prev.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    } else if (type === "last_friday") {
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
      const mm = String(prevFriday.getMonth() + 1).padStart(2, "0");
      const dd = String(prevFriday.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
    return currentDate;
  };

  const handleQuickDateSelect = (
    type: "today" | "yesterday" | "last_friday",
  ) => {
    const val = getQuickDateStr(type);
    setDateFilter(val);
    setCurrentDate(val);
  };

  // Find maximum trend amount for scaling SVG chart
  const maxTrendAmount = useMemo(() => {
    const vals = trends.map((t) =>
      chartMetric === "revenue" ? t.amount : t.transactions,
    );
    return Math.max(...vals, 1); // avoid division by zero
  }, [trends, chartMetric]);

  const [notifiedStudents, setNotifiedStudents] = useState<
    Record<string, boolean>
  >({});
  const [sendingWhatsApp, setSendingWhatsApp] = useState<
    Record<string, boolean>
  >({});
  const [whatsappSuccess, setWhatsappSuccess] = useState<
    Record<string, boolean>
  >({});
  const [sendingSms, setSendingSms] = useState<
    Record<string, boolean>
  >({});
  const [smsSuccess, setSmsSuccess] = useState<
    Record<string, boolean>
  >({});
  const [activeChannel, setActiveChannel] = useState<"whatsapp" | "sms">(
    "whatsapp"
  );
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const handleDialGuardian = (studentId: string, phone: string) => {
    setNotifiedStudents((prev) => ({ ...prev, [studentId]: true }));
    showToast(
      `Initiating voice communication line with guardian phone: ${phone}...`,
    );
    // Simulate dialing visually for 3 seconds
    setTimeout(() => {
      setNotifiedStudents((prev) => ({ ...prev, [studentId]: false }));
    }, 3000);
  };

  const handleSendWhatsAppAlert = async (st: any) => {
    if (!st.guardianPhone) {
      showToast(
        `Warning: No valid parent/guardian phone number found for ${st.studentName}.`,
      );
      return;
    }
    setSendingWhatsApp((prev) => ({ ...prev, [st.studentId]: true }));
    try {
      if (sendautomatedWhatsApp) {
        const messageText = `Dear Parent/Guardian, this is an automated check-in compliance alert. Pupil ${st.studentName} has an unpaid daily lock exception (GHC 5.00) today. Please visit the gate counter for verification. Thank you.`;
        await sendautomatedWhatsApp(
          st.guardianPhone,
          messageText,
          st.studentId,
          st.studentName,
          "compliance-alert",
        );
      }
      setWhatsappSuccess((prev) => ({ ...prev, [st.studentId]: true }));
      showToast(
        `Simulated WhatsApp alert dispatched successfully to ${st.studentName}'s guardian!`,
      );
      setTimeout(() => {
        setWhatsappSuccess((prev) => ({ ...prev, [st.studentId]: false }));
      }, 3000);
    } catch (e) {
      showToast("Error dispatching simulated WhatsApp request.");
    } finally {
      setSendingWhatsApp((prev) => ({ ...prev, [st.studentId]: false }));
    }
  };

  const handleSelectAllArrears = () => {
    const idsWithArrears = alertsWithArrears
      .filter((alert) => alert.arrears > 0)
      .map((alert) => alert.studentId);
    setSelectedAlertIds(idsWithArrears);
  };

  const handleSelectAll = () => {
    setSelectedAlertIds(alertsWithArrears.map((a) => a.studentId));
  };

  const handleSelectNone = () => {
    setSelectedAlertIds([]);
  };

  const handleToggleSelectAlertObj = (studentId: string) => {
    setSelectedAlertIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  };

  const handleLaunchBulkAlerts = async () => {
    const selectedAlerts = alertsWithArrears.filter((a) =>
      selectedAlertIds.includes(a.studentId),
    );
    if (selectedAlerts.length === 0) {
      showToast(
        "Please select at least one student before dispatching bulk messages.",
      );
      return;
    }

    setIsBulkSending(true);
    const results = {
      total: selectedAlerts.length,
      current: 0,
      logs: selectedAlerts.map((sa) => ({
        studentName: sa.studentName,
        status: "sending" as const,
        message: "Awaiting queue dispatch...",
      })),
    };
    setBulkSendResults(results);

    // Process sequentially for an immersive, visual user experience in the dashboard
    for (let i = 0; i < selectedAlerts.length; i++) {
      const sa = selectedAlerts[i];

      setBulkSendResults((prev) => {
        if (!prev) return null;
        const newLogs = [...prev.logs];
        newLogs[i] = {
          studentName: sa.studentName,
          status: "sending",
          message: `Formatting dynamic placeholders and establishing route to ${sa.guardianPhone}...`,
        };
        return { ...prev, current: i + 1, logs: newLogs };
      });

      // Visual delay to showcase the active ledger processing clearly
      await new Promise((resolve) => setTimeout(resolve, 800));

      if (
        !sa.guardianPhone ||
        sa.guardianPhone === "No Contacts" ||
        sa.guardianPhone.trim() === ""
      ) {
        setBulkSendResults((prev) => {
          if (!prev) return null;
          const newLogs = [...prev.logs];
          newLogs[i] = {
            studentName: sa.studentName,
            status: "error",
            message: `Skipped: No phone number specified in profile.`,
          };
          return { ...prev, logs: newLogs };
        });
        continue;
      }

      // Format custom template message with variables
      const formattedMessage = bulkMessageTemplate
        .replace(/{studentName}/g, sa.studentName)
        .replace(/{className}/g, sa.class)
        .replace(/{currentDate}/g, currentDate)
        .replace(/{arrearsAmount}/g, sa.arrears.toFixed(2))
        .replace(
          /{paymentType}/g,
          sa.paymentType === "Term"
            ? "Term-based"
            : sa.paymentType === "Daily"
              ? "Daily GHC 5"
              : sa.paymentType,
        );

      try {
        if (activeChannel === "whatsapp") {
          if (sendautomatedWhatsApp) {
            await sendautomatedWhatsApp(
              sa.guardianPhone,
              formattedMessage,
              sa.studentId,
              sa.studentName,
              "compliance-alert",
            );
          }

          // Mark individual success locally
          setWhatsappSuccess((prev) => ({ ...prev, [sa.studentId]: true }));
        } else {
          // Simulate SMS dispatch delays
          await new Promise((resolve) => setTimeout(resolve, 300));
          setSmsSuccess((prev) => ({ ...prev, [sa.studentId]: true }));
        }

        setBulkSendResults((prev) => {
          if (!prev) return null;
          const newLogs = [...prev.logs];
          newLogs[i] = {
            studentName: sa.studentName,
            status: "success",
            message: activeChannel === "whatsapp"
              ? `Dispatched compliance log via WhatsApp to ${sa.guardianPhone}`
              : `Dispatched standard compliance text via SMS to ${sa.guardianPhone}`,
          };
          return { ...prev, logs: newLogs };
        });
      } catch (err) {
        setBulkSendResults((prev) => {
          if (!prev) return null;
          const newLogs = [...prev.logs];
          newLogs[i] = {
            studentName: sa.studentName,
            status: "error",
            message: `Failed to invoke mock API webhook.`,
          };
          return { ...prev, logs: newLogs };
        });
      }
    }

    setIsBulkSending(false);
    showToast(
      `Bulk message dispatch completed for ${selectedAlerts.length} guardians!`,
    );
  };

  // Compute school dates for heatmap
  const heatmapDates = useMemo(() => {
    // Collect school days from active term if present
    let dates: string[] = [];
    if (
      activeTerm &&
      activeTerm.schoolDays &&
      activeTerm.schoolDays.length > 0
    ) {
      dates = [...activeTerm.schoolDays];
    } else {
      // Fallback: extract distinct dates from payments, excluding weekends
      const uniqueDates = Array.from(
        new Set(payments.map((p) => p.date as string)),
      ) as string[];
      dates = uniqueDates.filter((dStr: string) => {
        const dObj = new Date(dStr);
        const dayOfWeek = dObj.getDay();
        return dayOfWeek !== 0 && dayOfWeek !== 6; // exclude Sat & Sun
      });
    }
    // Sort dates chronologically: earliest to latest
    dates.sort((a, b) => a.localeCompare(b));

    // Get the last N days based on heatmapDaysRange selector
    if (dates.length > heatmapDaysRange) {
      return dates.slice(-heatmapDaysRange);
    }
    return dates;
  }, [activeTerm, payments, heatmapDaysRange]);

  // Fallback: if no dates exist, generate the last 15 weekdays prior to currentDate
  const computedHeatmapDates = useMemo(() => {
    let result = [...heatmapDates];
    if (result.length === 0) {
      const dates: string[] = [];
      const refDate = new Date(currentDate);
      let count = 0;
      while (dates.length < 15 && count < 40) {
        const dayOfWeek = refDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          const yyyy = refDate.getFullYear();
          const mm = String(refDate.getMonth() + 1).padStart(2, "0");
          const dd = String(refDate.getDate()).padStart(2, "0");
          dates.push(`${yyyy}-${mm}-${dd}`);
        }
        refDate.setDate(refDate.getDate() - 1);
        count++;
      }
      result = dates.reverse(); // oldest to newest
    }
    return result;
  }, [heatmapDates, currentDate]);

  // Filter and compute absenteeism statistics for students in heatmap
  const heatmapStudentsData = useMemo(() => {
    // 1. Filter students by class and search query
    const filtered = students.filter((student) => {
      const matchClass =
        heatmapClass === "all" || student.class === heatmapClass;
      const matchSearch =
        !heatmapSearch.trim() ||
        student.name.toLowerCase().includes(heatmapSearch.toLowerCase()) ||
        student.rollNumber.toLowerCase().includes(heatmapSearch.toLowerCase());
      return student.active && matchClass && matchSearch;
    });

    // 2. Compute attendance and absence counts for each student in the selected dates
    const computed = filtered.map((student) => {
      // Find all payments/absences for this student in our dates set
      let absentCount = 0;
      let presentCount = 0;
      let unmarkedCount = 0;

      // Group records by date for easy lookup
      const studentRecordsByDate: Record<string, (typeof payments)[0]> = {};
      payments.forEach((p) => {
        if (p.studentId === student.id) {
          studentRecordsByDate[p.date] = p;
        }
      });

      computedHeatmapDates.forEach((dateStr) => {
        const rec = studentRecordsByDate[dateStr];
        const isHoliday = activeTerm?.publicHolidays?.includes(dateStr);
        if (isHoliday) {
          // Holiday is neither present nor absent
          return;
        }
        if (rec) {
          if (rec.isAbsent) {
            absentCount++;
          } else {
            presentCount++;
          }
        } else {
          unmarkedCount++;
        }
      });

      const totalActiveDays = absentCount + presentCount;
      const rate =
        totalActiveDays > 0 ? (presentCount / totalActiveDays) * 100 : 100;
      const riskLevel: "low" | "medium" | "high" =
        absentCount >= 4 ? "high" : absentCount >= 2 ? "medium" : "low";

      return {
        student,
        absentCount,
        presentCount,
        unmarkedCount,
        attendanceRate: rate,
        riskLevel,
        records: studentRecordsByDate,
      };
    });

    // 3. Sort students
    if (heatmapSort === "absent-desc") {
      computed.sort(
        (a, b) =>
          b.absentCount - a.absentCount ||
          a.student.name.localeCompare(b.student.name),
      );
    } else {
      computed.sort((a, b) => a.student.name.localeCompare(b.student.name));
    }

    return computed;
  }, [
    students,
    payments,
    computedHeatmapDates,
    heatmapClass,
    heatmapSearch,
    heatmapSort,
    activeTerm,
  ]);

  // Filtered lists for specialized tabs
  const filteredAlerts = useMemo(() => {
    if (!alertSearch.trim()) return pendingAlerts;
    const lower = alertSearch.toLowerCase();
    return pendingAlerts.filter(
      (s) =>
        s.studentName.toLowerCase().includes(lower) ||
        s.class.toLowerCase().includes(lower),
    );
  }, [pendingAlerts, alertSearch]);

  const alertsWithArrears = useMemo(() => {
    return filteredAlerts.map((alert) => {
      const student = (students || []).find((s) => s.id === alert.studentId);
      let arrears = 0;
      let paymentType = "Daily";
      if (student) {
        paymentType = student.paymentType;
        const debtState = calculateStudentFinancialState(
          student,
          payments || [],
          activeTerm,
          currentDate,
          5.0,
        );
        arrears = debtState ? debtState.totalDebt : 0;
      }
      return {
        ...alert,
        arrears,
        paymentType,
        studentObj: student,
      };
    });
  }, [filteredAlerts, students, payments, activeTerm, currentDate]);

  const filteredTeacherMetrics = useMemo(() => {
    if (!classPerfSearch.trim()) return teacherMetrics;
    const lower = classPerfSearch.toLowerCase();
    return teacherMetrics.filter(
      (m) =>
        m.className.toLowerCase().includes(lower) ||
        m.teacherName.toLowerCase().includes(lower),
    );
  }, [teacherMetrics, classPerfSearch]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
      },
    },
  };

  return (
    <>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-6 font-sans no-print"
      >
      {/* Date & Layout Control Header */}
      <motion.div
        variants={itemVariants}
        className="bg-neutral-900 border-4 border-neutral-800 p-6 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-6"
      >
        {/* Date Selector controls */}
        <div className="flex flex-wrap items-center gap-4">
          {activeTerm && (
            <div className="bg-neutral-950 border-2 border-neutral-800 px-4 py-1.5 text-[10px] font-black uppercase font-mono text-amber-400 tracking-wider">
              Active Term Tracker: {activeTerm.name}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 dashboard-header-date-controls">
            <Calendar className="text-amber-400 shrink-0" size={18} />
            <span className="text-[11px] font-black uppercase tracking-wider text-neutral-400">
              Target Audit Date:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={dateFilter}
                onChange={handleDateChange}
                className="bg-neutral-950 border-2 border-neutral-800 text-[11px] font-black text-white px-3 py-1.5 focus:border-amber-400 outline-none uppercase tracking-wider font-mono cursor-pointer"
              />
              {dateFilter !== getQuickDateStr("today") && (
                <button
                  type="button"
                  onClick={() => handleQuickDateSelect("today")}
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
                onClick={() => handleQuickDateSelect("today")}
                className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider font-mono border-2 transition-all duration-200 hover:scale-105 active:scale-95 transform cursor-pointer ${
                  dateFilter === getQuickDateStr("today")
                    ? "bg-amber-400 border-amber-400 text-black"
                    : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600"
                }`}
                title="Filter to Dynamic Today"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleQuickDateSelect("yesterday")}
                className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider font-mono border-2 transition-all duration-200 hover:scale-105 active:scale-95 transform cursor-pointer ${
                  dateFilter === getQuickDateStr("yesterday")
                    ? "bg-amber-400 border-amber-400 text-black"
                    : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600"
                }`}
                title="Filter to Yesterday"
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => handleQuickDateSelect("last_friday")}
                className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider font-mono border-2 transition-all duration-200 hover:scale-105 active:scale-95 transform cursor-pointer ${
                  dateFilter === getQuickDateStr("last_friday")
                    ? "bg-amber-400 border-amber-400 text-black"
                    : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600"
                }`}
                title="Filter to Last Friday"
              >
                Last Friday
              </button>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="w-2 h-2 bg-amber-400 rounded-none animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-neutral-400 font-mono">
              Real-Time Core Analytics Live
            </span>
          </div>
        </div>

        {/* Layout Switcher tabs */}
        <div className="flex flex-wrap bg-neutral-950 p-1.5 border-2 border-neutral-850 gap-1.5">
          <button
            onClick={() => setActiveLayout("bento")}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 ${
              activeLayout === "bento"
                ? "bg-white text-black font-black"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900/40"
            }`}
          >
            <LayoutGrid size={14} /> Sleek Bento Grid
          </button>
          <button
            onClick={() => setActiveLayout("class-perf")}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 ${
              activeLayout === "class-perf"
                ? "bg-white text-black font-black"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900/40"
            }`}
          >
            <Activity size={14} /> Classrooms Tracker
          </button>
          <button
            onClick={() => setActiveLayout("weekly-aggregate")}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 ${
              activeLayout === "weekly-aggregate"
                ? "bg-white text-black font-black"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900/40"
            }`}
          >
            <Coins size={14} /> Weekly Collections
          </button>
          <button
            onClick={() => setActiveLayout("alerts-desk")}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 ${
              activeLayout === "alerts-desk"
                ? "bg-white text-black font-black"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900/40"
            }`}
          >
            <AlertTriangle
              size={14}
              className={
                pendingAlerts.length > 0 ? "text-amber-450 animate-bounce" : ""
              }
            />{" "}
            Alerts Deck ({pendingAlerts.length})
          </button>
          <button
            onClick={() => setActiveLayout("absence-heatmap")}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 ${
              activeLayout === "absence-heatmap"
                ? "bg-white text-black font-black"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900/40"
            }`}
          >
            <Calendar size={14} /> Absentee Heatmap
          </button>
          <button
            onClick={() => setActiveLayout("monthly-attendance")}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 ${
              activeLayout === "monthly-attendance"
                ? "bg-white text-black font-black"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900/40"
            }`}
          >
            <TrendingUp size={14} /> Monthly Attendance Trends
          </button>
          <button
            onClick={() => setActiveLayout("arrears-performance")}
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 ${
              activeLayout === "arrears-performance"
                ? "bg-amber-400 text-black font-black"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900/40"
            }`}
          >
            <Award size={14} /> Management Arrears Console 🏅
          </button>
          
          <button
            type="button"
            onClick={() => setShowPrintFriendlyModal(true)}
            className="px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 text-blue-400 hover:text-white hover:bg-neutral-900/40 border-2 border-dashed border-blue-500/30 hover:border-blue-400"
            title="Export current Dashboard snapshot as a clean, structured PDF"
          >
            <Printer size={14} className="text-blue-400" /> Export PDF
          </button>
        </div>
      </motion.div>

      {/* 7 Interactive KPI Cards - Heightened Design with Side Accent borders */}
      <motion.div
        key={activeLayout}
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-6"
      >
        {/* Metric: Daily Summary for Selected Date */}
        <motion.div
          variants={itemVariants}
          className="bg-neutral-900 border-4 border-neutral-800 border-l-amber-400 p-6 flex flex-col justify-between min-h-[145px] hover:border-r-neutral-700 transition-all"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest font-mono">
              Daily Summary ({dateFilter})
            </span>
            <Calendar size={16} className="text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="text-[10px] text-neutral-500 uppercase font-black tracking-wider leading-none mb-1">
              Collected for {dateFilter}
            </div>
            <h3 className="text-3xl font-black font-mono text-white tracking-tight leading-none">
              GHC {stats.totalCollected.toFixed(2)}
            </h3>

            <div className="mt-3 pt-2.5 border-t border-neutral-800/80 space-y-1.5 text-[9px] font-mono uppercase">
              <div className="flex justify-between text-neutral-400 font-bold">
                <span>Pre-School:</span>
                <span className="text-white font-extrabold">
                  GHC {stats.byCategory["Pre-school"].toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-neutral-400 font-bold">
                <span>Primary:</span>
                <span className="text-white font-extrabold">
                  GHC {stats.byCategory["Primary"].toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-neutral-400 font-bold">
                <span>JHS:</span>
                <span className="text-white font-extrabold">
                  GHC {stats.byCategory["JHS"].toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Metric 1: Total Accumulated Revenue */}
        <motion.div
          variants={itemVariants}
          className="bg-neutral-900 border-4 border-neutral-800 border-l-amber-400 p-6 flex flex-col justify-between min-h-[145px] hover:border-r-neutral-700 transition-all"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest font-mono">
              Accumulated Revenue
            </span>
            <Coins size={16} className="text-amber-400" />
          </div>
          <div className="mt-3">
            <h3
              className="text-3xl font-black font-mono text-white tracking-tight leading-none"
              id="total-accumulated-revenue"
            >
              GHC {totalVerifiedAccumulatedRevenue.toFixed(2)}
            </h3>

            {resetConfirming === "none" ? (
              <div className="flex justify-between items-center mt-2.5">
                <p className="text-[9px] text-amber-500 uppercase font-black tracking-widest flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 bg-amber-400 animate-pulse" />{" "}
                  All verified dates
                </p>
                <button
                  type="button"
                  onClick={() => setResetConfirming("payments")}
                  className="text-[9px] font-mono font-black bg-red-950/40 hover:bg-red-900 border border-red-800/60 text-red-400 hover:text-white px-2 py-0.5 tracking-wider uppercase transition-colors cursor-pointer rounded-sm"
                  title="Reset collected revenue records to starting fresh"
                >
                  Reset To 0 GHC
                </button>
              </div>
            ) : resetConfirming === "payments" ? (
              <div className="mt-2.5 space-y-1.5 bg-neutral-950 p-2 border border-dashed border-red-800 rounded-sm">
                <p className="text-[8px] font-mono font-bold text-red-400 uppercase tracking-wide leading-none">
                  Confirm Reset?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      clearAllPayments();
                      setResetConfirming("none");
                    }}
                    className="text-[8px] font-mono font-black bg-red-600 hover:bg-red-500 text-white uppercase px-1.5 py-0.5 rounded-xs cursor-pointer transition-colors"
                  >
                    Set GHC 0
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetConfirming("both")}
                    className="text-[8px] font-mono font-black bg-neutral-800 hover:bg-neutral-700 text-neutral-200 uppercase px-1.5 py-0.5 rounded-xs cursor-pointer transition-colors"
                    title="Also wipe sample student roster to load real students listing"
                  >
                    Wipe Pupils too
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetConfirming("none")}
                    className="text-[8px] font-mono text-neutral-400 hover:text-white uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2.5 space-y-1.5 bg-neutral-950 p-2 border border-dashed border-red-850 rounded-sm">
                <p className="text-[8px] font-mono font-bold text-red-400 uppercase tracking-wide leading-tight">
                  Wipe pupil register & reset payments?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      clearSampleStudents();
                      setResetConfirming("none");
                    }}
                    className="text-[8px] font-mono font-black bg-red-600 hover:bg-red-500 text-white uppercase px-1.5 py-0.5 rounded-xs cursor-pointer transition-colors"
                  >
                    Wipe Both
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetConfirming("none")}
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
        <motion.div
          variants={itemVariants}
          className={`bg-neutral-900 border-4 border-neutral-800 ${dailyProgressPercent >= 100 ? "border-l-emerald-400 shadow-[inset_y_0_12px_rgba(16,185,129,0.05)]" : "border-l-amber-400"} p-6 flex flex-col justify-between min-h-[145px] hover:border-r-neutral-700 transition-all`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest font-mono">
              Collections & progress
            </span>
            <Coins
              size={16}
              className={
                dailyProgressPercent >= 100
                  ? "text-emerald-400 animate-bounce"
                  : "text-amber-400"
              }
            />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-3xl font-black font-mono text-white tracking-tight leading-none">
                GHC {stats.totalCollected.toFixed(2)}
              </h3>
              <div className="flex flex-col gap-1.5 mt-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-neutral-400 uppercase font-bold tracking-wider">
                    GOAL GHC:
                  </span>
                  <input
                    type="number"
                    value={dailyGoal}
                    onChange={(e) =>
                      handleUpdateDailyGoal(Number(e.target.value) || 0)
                    }
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
              <div
                className={`relative w-14 h-14 flex items-center justify-center ${dailyProgressPercent >= 100 ? "animate-pulse" : ""}`}
              >
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
                        ? "stroke-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                        : dailyProgressPercent >= 50
                          ? "stroke-amber-400"
                          : "stroke-orange-500"
                    }`}
                    strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 22}`}
                    strokeDashoffset={`${2 * Math.PI * 22 * (1 - Math.min(dailyProgressPercent, 100) / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center font-mono leading-none">
                  <span
                    className={`text-[10px] font-black ${dailyProgressPercent >= 100 ? "text-emerald-400 drop-shadow-[0_0_2px_rgba(52,211,153,0.6)]" : "text-neutral-200"}`}
                  >
                    {Math.round(dailyProgressPercent)}%
                  </span>
                </div>
              </div>
              <span
                className={`text-[8px] font-black font-mono tracking-widest uppercase ${dailyProgressPercent >= 100 ? "text-emerald-400" : "text-neutral-500"}`}
              >
                Goal %
              </span>
            </div>
          </div>
        </motion.div>

        {/* Metric 2: Expected vs Actual Collection Rate */}
        <motion.div
          variants={itemVariants}
          className="bg-neutral-900 border-4 border-neutral-800 border-l-white p-6 flex flex-col justify-between min-h-[145px] hover:border-r-neutral-700 transition-all"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest font-mono">
              Collection Rate
            </span>
            <TrendingUp size={16} className="text-white" />
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="space-y-1">
              <h3 className="text-3xl font-black font-mono text-white tracking-tight leading-none">
                {customCollectionRate.toFixed(1)}%
              </h3>
              <div className="flex flex-col gap-1.5 mt-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-neutral-400 uppercase font-bold tracking-wider">
                    Goal GHC:
                  </span>
                  <input
                    type="number"
                    value={dailyGoal}
                    onChange={(e) =>
                      handleUpdateDailyGoal(Number(e.target.value) || 0)
                    }
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
                    strokeDashoffset={`${2 * Math.PI * 19 * (1 - Math.min(customCollectionRate, 100) / 100)}`}
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
                  <span className="text-amber-400 font-black block mb-1">
                    🎯 Daily Goal Progress
                  </span>
                  The daily target is set to{" "}
                  <span className="text-white font-extrabold">
                    {dailyGoal} GHC
                  </span>
                  . You can input any value in the custom field to adjust the
                  goal rate.
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Metric 3: Total Paid Count */}
        <motion.div
          variants={itemVariants}
          className="bg-neutral-900 border-4 border-neutral-800 border-l-neutral-400 p-6 flex flex-col justify-between min-h-[145px] hover:border-r-neutral-700 transition-all"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest font-mono">
              Paid Cohort
            </span>
            <Users size={16} className="text-neutral-400" />
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-black font-mono text-white tracking-tight leading-none">
              {stats.paidCount} PUPILS
            </h3>
            <p className="text-[9px] text-neutral-400 uppercase font-bold tracking-widest mt-2 block">
              Entered classrooms cleared
            </p>
          </div>
        </motion.div>

        {/* Metric 4: Pending Alerts */}
        <motion.div
          variants={itemVariants}
          className="bg-neutral-900 border-4 border-neutral-800 border-l-red-500 p-6 flex flex-col justify-between min-h-[145px] hover:border-r-neutral-700 transition-all"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest font-mono">
              Pending Gate Checks
            </span>
            <AlertTriangle size={16} className="text-red-500 animate-pulse" />
          </div>
          <div className="mt-3">
            <h3 className="text-3xl font-black font-mono text-red-500 tracking-tight leading-none">
              {stats.pendingCount} PENDING
            </h3>
            <p className="text-[9px] text-red-400 uppercase font-black tracking-widest mt-2 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 bg-red-500 animate-ping" />{" "}
              Alert state active
            </p>
          </div>
        </motion.div>

        {/* Metric 5: Global Arrears Summary */}
        <motion.div
          variants={itemVariants}
          className="bg-neutral-900 border-4 border-neutral-800 border-l-red-500 p-6 flex flex-col justify-between min-h-[145px] hover:border-r-neutral-700 transition-all cursor-pointer"
          onClick={() => setActiveLayout("arrears-performance")}
          title="Click to view full Management Arrears Dashboard"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-black text-rose-450 uppercase tracking-widest font-mono">
              Global Arrears
            </span>
            <AlertTriangle size={16} className="text-red-400" />
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black font-mono text-red-400 tracking-tight leading-none">
              GHC {globalArrearsSum.toFixed(2)}
            </h3>
            <p className="text-[9px] text-neutral-400 uppercase font-black tracking-widest mt-2 block">
              Outstanding Debt 🏅
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* Enrollment & Today's Attendance & Sync Health Banner Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Total Enrollment Widget */}
        <motion.div
          variants={itemVariants}
          className="bg-neutral-900 border-4 border-neutral-800 border-l-amber-400 p-4 flex flex-col justify-between gap-3 hover:border-neutral-700 transition-all duration-300"
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-400 rounded-none shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono">
                Cohort Demographics
              </span>
            </div>
            <span className="text-[9px] font-mono font-black uppercase text-neutral-400 bg-neutral-950 border border-neutral-850 px-2 py-0.5">
              Pupil Registry
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 mt-1">
            <div className="space-y-0.5 text-left">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">
                Total Enrollment
              </h4>
              <p className="text-[10px] text-neutral-400 font-mono uppercase tracking-wide">
                Pupils Registered
              </p>
            </div>
            <div className="bg-neutral-950 border-2 border-neutral-850 px-3 py-1 font-mono text-right shrink-0">
              <span
                className="text-sm font-black text-amber-400"
                id="total-enrollment-counter"
              >
                {students?.length || 0}
              </span>
              <span className="text-[9px] text-neutral-500 font-bold">
                {" "}
                Profiles
              </span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-dashed border-neutral-800">
            <div className="flex justify-between items-center text-[9px] font-mono font-extrabold text-neutral-500 uppercase tracking-wider">
              <span>Active Status Coverage</span>
              <span className="text-neutral-300 font-mono font-black">
                {activeStudentsCount} / {students?.length || 0} Active
              </span>
            </div>
            <div className="w-full bg-neutral-950 h-2 border border-neutral-850 overflow-hidden">
              <div
                className="bg-amber-400 h-full transition-all duration-500"
                style={{
                  width: `${students?.length > 0 ? (activeStudentsCount / students.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </motion.div>

        {/* Today's Attendance Widget */}
        <motion.div
          variants={itemVariants}
          className="bg-neutral-900 border-4 border-neutral-800 border-l-emerald-400 p-4 flex flex-col justify-between gap-3 hover:border-neutral-700 transition-all duration-300"
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${dateFilter === currentDate ? "bg-emerald-400 animate-pulse" : "bg-neutral-500"}`}
              />
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 font-mono">
                Real-Time Ingress
              </span>
            </div>
            <span className="text-[9px] font-mono font-black uppercase text-emerald-400 bg-emerald-400/10 border border-emerald-450/30 px-2 py-0.5">
              Core Sentry Stream
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 mt-1">
            <div className="space-y-0.5 text-left">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">
                Today's Attendance
              </h4>
              <p className="text-[10px] text-neutral-400 font-mono uppercase tracking-wide">
                Checked-In Pupils
              </p>
            </div>
            <div className="bg-neutral-950 border-2 border-neutral-850 px-3 py-1 font-mono text-right shrink-0">
              <span className="text-sm font-black text-emerald-400">
                {stats.paidCount}
              </span>
              <span className="text-[9px] text-neutral-500 font-bold">
                {" "}
                / {activeStudentsCount} Pupils
              </span>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-dashed border-neutral-800">
            <div className="flex justify-between items-center text-[9px] font-mono font-extrabold text-neutral-500 uppercase tracking-wider">
              <span>Attendance Rate</span>
              <span className="text-emerald-400 font-black">
                {(activeStudentsCount > 0
                  ? (stats.paidCount / activeStudentsCount) * 100
                  : 0
                ).toFixed(1)}
                %
              </span>
            </div>
            <div className="w-full bg-neutral-950 h-2 border border-neutral-850 overflow-hidden">
              <div
                className="bg-emerald-400 h-full transition-all duration-500"
                style={{
                  width: `${activeStudentsCount > 0 ? Math.min(100, (stats.paidCount / activeStudentsCount) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
        </motion.div>

        {/* Sync Health Monitor Widget */}
        <motion.div
          variants={itemVariants}
          className={`bg-neutral-900 border-4 border-neutral-800 ${pendingLocalEdits.length > 0 ? "border-l-amber-500" : "border-l-emerald-400"} p-4 flex flex-col justify-between gap-3 relative select-none hover:border-neutral-700 transition-all duration-300`}
        >
          <div className="flex justify-between items-center w-full flex-row">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-none ${pendingLocalEdits.length > 0 ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`}
              />
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 font-mono">
                Ledger Node Health
              </span>
            </div>
            {storageMode === "local" ? (
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
                {pendingLocalEdits.length > 0
                  ? "Pending Local Changes"
                  : "Ledger In Sync"}
              </h4>
              <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-wide">
                {pendingLocalEdits.length > 0
                  ? `${pendingLocalEdits.length} edits not pushed to cloud`
                  : "0 unsaved edits"}
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
                <span>{syncStatus.loading ? "Syncing..." : "Push & Sync"}</span>
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
                <span className="text-left leading-none">
                  Unsynced offline modifications (browser-bound):
                </span>
              </div>
              <div className="bg-neutral-950 px-2 py-1.5 font-mono text-[9px] text-neutral-400 uppercase tracking-wide flex flex-col gap-1 max-h-[50px] overflow-y-auto rounded-none">
                {pendingLocalEdits.slice(0, 2).map((edit) => (
                  <div
                    key={edit.id}
                    className="flex justify-between items-center gap-2 truncate"
                  >
                    <span className="truncate border-l-2 border-amber-500 pl-1.5 text-[8.5px] leading-none text-left">
                      {edit.description}
                    </span>
                    <span className="text-[8px] text-neutral-600 shrink-0 font-medium font-mono">
                      {edit.timestamp}
                    </span>
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
              <span className="flex-1 text-left text-emerald-400">
                {syncStatus.successMessage}
              </span>
            </div>
          )}
        </motion.div>
      </div>

      {/* Main Dynamic Workspace Presentation based on tab selection */}
      <AnimatePresence mode="wait">
        {activeLayout === "bento" && (
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
                    <Coins size={18} className="text-amber-400" />{" "}
                    {currentMonthName} Cash Flow & Projections
                  </h3>
                  <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest mt-1 font-bold">
                    Comparing actual ledger revenue against forecasted enrolment
                    & collection targets
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
                  <span className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest font-extrabold block">
                    Collected Revenue (Verified)
                  </span>
                  <div className="text-2xl font-black text-emerald-400 font-mono">
                    GHC {monthlyCollectedVerified.toFixed(2)}
                  </div>
                  {monthlyCollectedPending > 0 && (
                    <div className="text-[8.5px] text-amber-500 font-mono font-bold uppercase">
                      + GHC {monthlyCollectedPending.toFixed(2)} Pending
                    </div>
                  )}
                  <p className="text-[9.5px] text-neutral-500 leading-tight">
                    All processed gate payments successfully signed by educators
                    this month.
                  </p>
                </div>

                {/* 2. PROJECTED ENROLMENT TARGET POTENTIAL */}
                <div className="bg-neutral-950 border-2 border-neutral-850 p-5 space-y-2">
                  <span className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest font-extrabold block">
                    Full Enrollment Target
                  </span>
                  <div className="text-2xl font-black text-white font-mono">
                    GHC {monthlyProjectedEnrollmentTarget.toFixed(2)}
                  </div>
                  <div className="text-[8.5px] text-neutral-400 font-mono font-extrabold uppercase">
                    {activeStudentsCount} Enrolled • GHC 5/day
                  </div>
                  <p className="text-[9.5px] text-neutral-500 leading-tight">
                    Potential collections if 100% of the active student roll
                    paid every single day.
                  </p>
                </div>

                {/* 3. CONFIGURED COLLECTION GOAL TARGET */}
                <div className="bg-neutral-950 border-2 border-neutral-850 p-5 space-y-2">
                  <span className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest font-extrabold block">
                    Configured Custom Goal
                  </span>
                  <div className="text-2xl font-black text-amber-400 font-mono">
                    GHC {monthlyProjectedGoalTarget.toFixed(2)}
                  </div>
                  <div className="text-[8.5px] text-neutral-400 font-mono font-extrabold uppercase">
                    Daily Goal: GHC {dailyGoal}
                  </div>
                  <p className="text-[9.5px] text-neutral-500 leading-tight">
                    The custom milestone established for collections across
                    critical gate check-ins.
                  </p>
                </div>

                {/* 4. PERFORMANCE RATIOS */}
                <div className="bg-neutral-950 border-2 border-neutral-850 p-5 flex flex-col justify-between space-y-2">
                  <div>
                    <span className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest font-extrabold block">
                      Target Coverage Ratio
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <div className="text-2xl font-black text-white font-mono">
                        {goalProgressPercent.toFixed(1)}%
                      </div>
                      <span className="text-[9px] text-neutral-500 font-mono">
                        of custom goal
                      </span>
                    </div>
                  </div>
                  <div className="text-[9.5px] text-neutral-450 font-mono font-semibold flex items-center justify-between">
                    <span>Enrollment potential cover:</span>
                    <strong className="text-neutral-200">
                      {enrollmentProgressPercent.toFixed(1)}%
                    </strong>
                  </div>
                </div>
              </div>

              {/* Progress Indicator Tracks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* Custom Goal Progress Slider Bar */}
                <div className="bg-neutral-950/45 p-4 border border-neutral-850 space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-mono font-extrabold text-neutral-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-amber-400 rounded-full" />{" "}
                      Goal Target Progress
                    </span>
                    <span className="text-amber-400 font-black">
                      {goalProgressPercent.toFixed(1)}% Completed
                    </span>
                  </div>
                  <div className="w-full bg-neutral-950 h-3 border border-neutral-850 rounded-xs overflow-hidden">
                    <div
                      className="bg-amber-400 h-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, goalProgressPercent)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-neutral-500 font-mono uppercase">
                    <span>GHC 0.00</span>
                    <span>
                      Target: GHC {monthlyProjectedGoalTarget.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Full Enrollment potential Slider Bar */}
                <div className="bg-neutral-950/45 p-4 border border-neutral-850 space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-mono font-extrabold text-neutral-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full" />{" "}
                      Max Enrollment Potential
                    </span>
                    <span className="text-emerald-400 font-black">
                      {enrollmentProgressPercent.toFixed(1)}% Covered
                    </span>
                  </div>
                  <div className="w-full bg-neutral-950 h-3 border border-neutral-850 rounded-xs overflow-hidden">
                    <div
                      className="bg-emerald-400 h-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, enrollmentProgressPercent)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-neutral-500 font-mono uppercase">
                    <span>GHC 0.00</span>
                    <span>
                      Potential: GHC{" "}
                      {monthlyProjectedEnrollmentTarget.toFixed(2)}
                    </span>
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
                    <h3 className="text-xl font-black uppercase italic text-white tracking-tight">
                      Ledger Cash Flow Analytics
                    </h3>
                    <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest mt-1">
                      Weekly financial status logs
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* View Switcher: Recharts vs Custom SVG */}
                    <div className="flex bg-neutral-950 p-1 border border-neutral-800 max-w-fit">
                      <button
                        onClick={() => setChartView("recharts")}
                        className={`px-3 py-1 text-[9px] font-black font-mono uppercase tracking-widest transition-colors cursor-pointer ${
                          chartView === "recharts"
                            ? "bg-amber-400 text-black font-extrabold"
                            : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        Target Goal (Recharts)
                      </button>
                      <button
                        onClick={() => setChartView("trends")}
                        className={`px-3 py-1 text-[9px] font-black font-mono uppercase tracking-widest transition-colors cursor-pointer ${
                          chartView === "trends"
                            ? "bg-amber-400 text-black font-extrabold"
                            : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        Trend Curve
                      </button>
                    </div>

                    {/* Interactive toggle between Revenue GHC values and transaction count volumes */}
                    {chartView === "trends" && (
                      <div className="flex bg-neutral-950 p-1 border border-neutral-800 max-w-fit">
                        <button
                          onClick={() => setChartMetric("revenue")}
                          className={`px-3 py-1 text-[9px] font-black font-mono uppercase tracking-widest transition-colors cursor-pointer ${
                            chartMetric === "revenue"
                              ? "bg-amber-400 text-black font-extrabold"
                              : "text-neutral-400 hover:text-white"
                          }`}
                        >
                          Revenue (GHC)
                        </button>
                        <button
                          onClick={() => setChartMetric("volume")}
                          className={`px-3 py-1 text-[9px] font-black font-mono uppercase tracking-widest transition-colors cursor-pointer ${
                            chartMetric === "volume"
                              ? "bg-amber-400 text-black font-extrabold"
                              : "text-neutral-400 hover:text-white"
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
                  {chartView === "recharts" ? (
                    last7DaysData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={last7DaysData}
                          margin={{ top: 15, right: 15, left: -20, bottom: 5 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={isDaylight ? "#cbd5e1" : "#262626"}
                            vertical={false}
                          />
                          <XAxis
                            dataKey="formattedDate"
                            stroke={isDaylight ? "#475569" : "#737373"}
                            fontSize={9}
                            fontFamily="JetBrains Mono, monospace"
                            fontWeight="bold"
                            tickLine={false}
                            axisLine={false}
                            dy={8}
                          />
                          <YAxis
                            stroke={isDaylight ? "#475569" : "#737373"}
                            fontSize={9}
                            fontFamily="JetBrains Mono, monospace"
                            fontWeight="bold"
                            tickLine={false}
                            axisLine={false}
                            dx={-5}
                          />
                          <RechartsTooltip
                            content={<CustomTooltip />}
                            cursor={{
                              stroke: "#fbbf24",
                              strokeWidth: 1,
                              strokeDasharray: "3 3",
                            }}
                          />
                          <Legend
                            verticalAlign="bottom"
                            height={24}
                            iconType="square"
                            iconSize={8}
                            wrapperStyle={{
                              fontSize: "9px",
                              fontWeight: "900",
                              textTransform: "uppercase",
                              fontFamily: "JetBrains Mono, monospace",
                              color: isDaylight ? "#475569" : "#a3a3a3",
                              paddingTop: "15px",
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="Total Collected"
                            name="Total Collected"
                            stroke="#fbbf24"
                            strokeWidth={3}
                            activeDot={{ r: 6, strokeWidth: 1 }}
                            dot={{ r: 3, fill: "#fbbf24", strokeWidth: 1 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="Target Goal"
                            name="Target Goal"
                            stroke={isDaylight ? "#1e293b" : "#ffffff"}
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            activeDot={{ r: 5, strokeWidth: 1, fill: isDaylight ? "#1e293b" : "#ffffff" }}
                            dot={{ r: 2, fill: isDaylight ? "#1e293b" : "#ffffff", strokeWidth: 1 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-neutral-600 text-xs font-bold uppercase tracking-widest font-mono">
                        No term days configured.
                      </div>
                    )
                  ) : trends.length > 0 ? (
                    <svg
                      className="w-full h-full overflow-visible"
                      preserveAspectRatio="none"
                    >
                      {/* Grid Horizontal Guide Lines */}
                      <line
                        x1="0"
                        y1="180"
                        x2="100%"
                        y2="180"
                        stroke={isDaylight ? "#cbd5e1" : "#1c1c1c"}
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />
                      <line
                        x1="0"
                        y1="120"
                        x2="100%"
                        y2="120"
                        stroke={isDaylight ? "#cbd5e1" : "#1c1c1c"}
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />
                      <line
                        x1="0"
                        y1="60"
                        x2="100%"
                        y2="60"
                        stroke={isDaylight ? "#cbd5e1" : "#1c1c1c"}
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />
                      <line
                        x1="0"
                        y1="5"
                        x2="100%"
                        y2="5"
                        stroke={isDaylight ? "#cbd5e1" : "#262626"}
                        strokeWidth="1.5"
                      />

                      {/* Render line path nodes */}
                      {trends.map((t, idx) => {
                        const xPercent =
                          trends.length > 1
                            ? (idx / (trends.length - 1)) * 100
                            : 50;
                        const targetVal =
                          chartMetric === "revenue" ? t.amount : t.transactions;
                        const normalizedY =
                          195 - (targetVal / maxTrendAmount) * 165;

                        return (
                          <g key={t.date} className="group cursor-pointer">
                            {/* Vertical Hover Guides */}
                            <line
                              x1={`${xPercent}%`}
                              y1="5"
                              x2={`${xPercent}%`}
                              y2="200"
                              stroke={isDaylight ? "#e2e8f0" : "#1f1f1f"}
                              strokeWidth="1.5"
                              className="group-hover:stroke-neutral-800 transition-colors"
                            />

                            {/* Visual Highlight column trigger bars */}
                            <rect
                              x={`calc(${xPercent}% - 14px)`}
                              y={normalizedY}
                              width="28"
                              height={200 - normalizedY}
                              fill={
                                chartMetric === "revenue"
                                  ? "#fbbf24"
                                  : (isDaylight ? "#0f172a" : "#ffffff")
                              }
                              className="opacity-[0.03] hover:opacity-100 group-hover:opacity-[0.15] transition-opacity"
                            />

                            {/* Node points */}
                            <circle
                              cx={`${xPercent}%`}
                              cy={normalizedY}
                              r="7"
                              fill={
                                chartMetric === "revenue"
                                  ? "#fbbf24"
                                  : (isDaylight ? "#0f172a" : "#ffffff")
                              }
                              className={`${isDaylight ? "stroke-white" : "stroke-neutral-900"} stroke-2 group-hover:scale-125 transition-transform`}
                            />

                            {/* Dynamic Text value tags */}
                            <text
                              x={`${xPercent}%`}
                              y={normalizedY - 14}
                              textAnchor="middle"
                              fill={isDaylight ? "#0f172a" : "#ffffff"}
                              className="text-[10px] font-black font-mono tracking-tighter"
                            >
                              {chartMetric === "revenue"
                                ? `GHC ${t.amount}`
                                : `${t.transactions} tx`}
                            </text>

                            {/* Horizontal timeline labels */}
                            <text
                              x={`${xPercent}%`}
                              y="218"
                              textAnchor="middle"
                              fill={isDaylight ? "#475569" : "#737373"}
                              className="text-[9px] font-black font-mono uppercase tracking-widest"
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
                  <h3 className="text-xl font-black uppercase italic text-white tracking-tight">
                    Balanced Cohort Ratios
                  </h3>
                  <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest mt-1 font-bold">
                    Aggregate payment shares
                  </p>
                </div>

                <div className="space-y-4 py-2">
                  {(["Pre-school", "Primary", "JHS"] as SchoolCategory[]).map(
                    (cat) => {
                      const amount = stats.byCategory[cat] || 0;
                      const percent =
                        stats.totalCollected > 0
                          ? (amount / stats.totalCollected) * 100
                          : 0;

                      return (
                        <div
                          key={cat}
                          className="space-y-2 bg-neutral-950 border-2 border-neutral-850 p-4"
                        >
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span className="font-black text-white uppercase tracking-wider flex items-center gap-2">
                              <span
                                className={`w-2.5 h-2.5 ${cat === "Pre-school" ? "bg-amber-400" : cat === "Primary" ? "bg-white" : "bg-neutral-500"}`}
                              />{" "}
                              {cat}
                            </span>
                            <span className="font-mono text-amber-400 font-extrabold text-[12px]">
                              GHC {amount.toFixed(2)}
                            </span>
                          </div>

                          <div className="w-full bg-neutral-900 h-2 border border-neutral-850">
                            <div
                              className={`h-full ${cat === "Pre-school" ? "bg-amber-400" : cat === "Primary" ? "bg-white" : "bg-neutral-500"} transition-all duration-500`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[9px] text-neutral-500 font-mono uppercase mt-1">
                            <span>Verified weight quota</span>
                            <span className="font-black text-neutral-400">
                              {percent.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      );
                    },
                  )}
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
                    <h3 className="text-xl font-black uppercase italic text-white tracking-tight">
                      Teacher Performance Dockets
                    </h3>
                    <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest mt-1">
                      Active class checking rates
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveLayout("class-perf")}
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
                        <tr
                          key={met.className}
                          className="hover:bg-neutral-950/20"
                        >
                          <td className="py-3.5 font-black font-mono text-white text-sm">
                            {met.className}
                          </td>
                          <td className="py-3.5 font-sans font-black text-neutral-300 uppercase tracking-wide text-xs">
                            {met.teacherName}
                          </td>
                          <td className="py-3.5 font-mono text-neutral-400 font-bold">
                            {met.paidCount} / {met.studentsCount}
                          </td>
                          <td className="py-3.5 text-right font-black font-mono text-white">
                            {met.collected.toFixed(2)}
                          </td>
                          <td className="py-3.5 text-right">
                            <span
                              className={`inline-block px-2.5 py-1 text-[10px] font-black font-mono tracking-widest uppercase ${
                                met.rate > 85
                                  ? "bg-emerald-950 border border-emerald-800 text-emerald-400"
                                  : met.rate > 50
                                    ? "bg-amber-950 border border-amber-800 text-amber-450"
                                    : "bg-red-950 border border-red-800 text-red-450"
                              }`}
                            >
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
                    <span className="w-2.5 h-2.5 bg-red-500 shrink-0" />{" "}
                    Critical Warnings
                  </h3>
                  <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest font-bold">
                    Pupils lacking daily clear keys
                  </p>
                </div>

                {pendingAlerts.length === 0 ? (
                  <div className="py-12 text-center text-neutral-500 space-y-2 flex-1 flex flex-col justify-center items-center">
                    <Check className="text-amber-400" size={28} />
                    <p className="text-sm font-black uppercase tracking-wider text-white">
                      No active errors
                    </p>
                    <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                      100% daily compliance
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[290px] overflow-y-auto flex-1 py-1 pr-1">
                    {pendingAlerts.slice(0, 4).map((st) => (
                      <motion.div
                        key={st.studentId}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.12 }}
                        className="flex justify-between items-center bg-neutral-950 border-2 border-neutral-855 p-3.5"
                      >
                        <div className="space-y-1 overflow-hidden">
                          <p className="text-xs font-black text-white uppercase tracking-tight truncate max-w-[140px]">
                            {st.studentName}
                          </p>
                          <div className="flex gap-2 items-center text-[9px] text-neutral-500 font-mono font-black uppercase tracking-wide">
                            <span className="text-amber-400">{st.class}</span>
                            <span>•</span>
                            <span className="truncate">
                              GDN: {st.guardianPhone}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            handleDialGuardian(st.studentId, st.guardianPhone)
                          }
                          disabled={notifiedStudents[st.studentId]}
                          className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest border-2 transition-all cursor-pointer ${
                            notifiedStudents[st.studentId]
                              ? "bg-amber-400 border-amber-400 text-black"
                              : "bg-neutral-950 border-neutral-800 hover:border-neutral-600 text-neutral-300 animate-pulse"
                          }`}
                        >
                          {notifiedStudents[st.studentId]
                            ? "DIALING..."
                            : "DIAL GDN"}
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setActiveLayout("alerts-desk")}
                  className="w-full text-center bg-neutral-950 border-2 border-neutral-800 text-stone-300 hover:text-white hover:border-neutral-600 text-[10px] py-2.5 uppercase font-black tracking-widest"
                >
                  View All Alerts Desk
                </button>
              </div>
            </div>

            {/* Classroom Registration Fee Summary Overview */}
            <div className="bg-neutral-900 border-4 border-neutral-800 p-8 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-4 border-b-2 border-neutral-850 gap-4">
                <div>
                  <span className="text-[9px] text-emerald-500 font-mono tracking-widest font-black uppercase bg-emerald-400/10 border border-emerald-400/30 px-2.5 py-1 rounded-xs">
                    Registration & Collection Audit
                  </span>
                  <h3 className="text-xl font-black uppercase italic text-white tracking-tight mt-2 flex items-center gap-2">
                    <TrendingUp size={18} className="text-emerald-400" /> Fees Collected vs. Missing Status
                  </h3>
                  <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest mt-1 font-bold font-mono">
                    Classway enrollment health, actual collected fees and remaining missing/outstanding arrears
                  </p>
                </div>
                <div className="text-[9px] font-mono font-black text-neutral-400 uppercase bg-neutral-950 border border-neutral-805 px-3 py-1.5 flex items-center gap-1.5 self-start sm:self-auto">
                  <span>Sync Reference Date: {currentDate}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr className="border-b-2 border-neutral-800 text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                      <th className="py-2.5 px-3">Class level</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-right">Enrolled</th>
                      <th className="py-2.5 px-3 text-right text-emerald-400">Fees Collected (GHC)</th>
                      <th className="py-2.5 px-3 text-right text-red-450">Missing / Outstanding (GHC)</th>
                      <th className="py-2.5 px-4 text-center">Collection Progress</th>
                      <th className="py-2.5 px-3 text-center">Audit Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-850">
                    {classFeesSummary.map((clsItem) => {
                      let statusText = "Excellent";
                      let statusClass = "bg-emerald-950 border-emerald-850 text-emerald-400";
                      
                      if (clsItem.studentCount === 0) {
                        statusText = "No Enrolment";
                        statusClass = "bg-neutral-950 border-neutral-850 text-neutral-500";
                      } else if (clsItem.rate < 70) {
                        statusText = "Lagging File";
                        statusClass = "bg-red-950/40 border-red-900 text-red-400";
                      } else if (clsItem.rate < 90) {
                        statusText = "On Track";
                        statusClass = "bg-amber-955/20 border-amber-900 text-amber-500";
                      }

                      return (
                        <tr
                          key={clsItem.className}
                          className="hover:bg-neutral-950/20 transition-all font-mono"
                        >
                          <td className="py-3.5 px-3 font-black text-white text-sm">
                            Class {clsItem.className}
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="text-[9px] font-black px-2 py-0.5 uppercase tracking-wider bg-neutral-955 border border-neutral-850 text-neutral-400">
                              {clsItem.category}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right text-neutral-305 font-bold">
                            {clsItem.studentCount} Pupils
                          </td>
                          <td className="py-3.5 px-3 text-right font-black text-emerald-400">
                            GHC {clsItem.collected.toFixed(2)}
                          </td>
                          <td className={`py-3.5 px-3 text-right font-black ${clsItem.missing > 0 ? "text-red-400" : "text-neutral-500"}`}>
                            GHC {clsItem.missing.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-[10px] text-neutral-400 font-black min-w-[32px] text-right">{Math.round(clsItem.rate)}%</span>
                              <div className="w-24 bg-neutral-955 h-1.5 border border-neutral-850 overflow-hidden">
                                <div
                                  className={`h-full ${
                                    clsItem.rate > 89
                                      ? "bg-emerald-400"
                                      : clsItem.rate > 69
                                        ? "bg-amber-400"
                                        : "bg-red-500"
                                  }`}
                                  style={{ width: `${Math.min(100, clsItem.rate)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className={`inline-block px-2.5 py-1 text-[9px] font-black tracking-widest uppercase border ${statusClass}`}>
                              {statusText}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
                    <Users size={18} className="text-amber-400" /> Educator Duty
                    Roster
                  </h3>
                  <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest mt-1 font-bold">
                    Class monitoring responsibilities & live check-in statuses
                    for {dateFilter}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleCopyRosterText}
                    className="bg-neutral-950 border border-neutral-800 hover:border-neutral-605 hover:text-white transition-all text-neutral-300 font-mono font-bold text-[9px] uppercase px-3 py-1.5 flex items-center gap-1.5 cursor-pointer"
                  >
                    {dutyCopied ? (
                      <span className="text-emerald-400 font-black">
                        ✓ Copied text!
                      </span>
                    ) : (
                      <span>Copy Duty Logs</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Filters & Inputs Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-neutral-950/50 p-4 border border-neutral-850">
                {/* Search Box */}
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative flex-1">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                      size={14}
                    />
                    <input
                      id="dashboard-roster-search"
                      type="text"
                      value={dutySearch}
                      onChange={(e) => setDutySearch(e.target.value)}
                      placeholder="Search roster by staff name, class grade or specific duty..."
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-neutral-604 focus:ring-0 text-white placeholder-neutral-500 text-xs pl-9 pr-16 py-2 uppercase font-mono tracking-wide rounded-none"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      <VoiceSearchButton
                        inputId="dashboard-roster-search"
                        onTranscript={(text) => setDutySearch(text)}
                      />
                      <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 border border-neutral-800 bg-neutral-950 font-mono text-[8px] text-neutral-500 rounded-xs leading-none pointer-events-none uppercase font-bold tracking-wider select-none">
                        Ctrl+K
                      </kbd>
                    </div>
                  </div>
                  {/* Keyboard shortcut info indicator reminder */}
                  <div
                    className="hidden md:flex items-center justify-center text-neutral-500 hover:text-amber-400 border border-neutral-800 bg-neutral-950 hover:border-amber-400 transition-all cursor-help h-[34px] w-9 shrink-0 select-none"
                    title="Keyboard Shortcut Reminder: Press 'Ctrl+K' (or 'Cmd+K' on macOS) from anywhere at any time to focus the search box instantly"
                  >
                    <Info size={13} className="stroke-[2.5]" />
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex bg-neutral-950 p-1 border border-neutral-800 max-w-fit self-start sm:self-auto">
                  <button
                    onClick={() => setDutyFilter("all")}
                    className={`px-3 py-1.5 text-[9px] font-black font-mono uppercase tracking-widest transition-colors cursor-pointer ${
                      dutyFilter === "all"
                        ? "bg-amber-400 text-black font-extrabold"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    All ({dutyRoster.length})
                  </button>
                  <button
                    onClick={() => setDutyFilter("active")}
                    className={`px-3 py-1.5 text-[9px] font-black font-mono uppercase tracking-widest transition-colors cursor-pointer ${
                      dutyFilter === "active"
                        ? "bg-amber-400 text-black font-extrabold"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    Active (
                    {dutyRoster.filter((d) => d.hasCollectedToday).length})
                  </button>
                  <button
                    onClick={() => setDutyFilter("standby")}
                    className={`px-3 py-1.5 text-[9px] font-black font-mono uppercase tracking-widest transition-colors cursor-pointer ${
                      dutyFilter === "standby"
                        ? "bg-amber-400 text-black font-extrabold"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    Standby (
                    {dutyRoster.filter((d) => !d.hasCollectedToday).length})
                  </button>
                </div>
              </div>

              {/* Roster Grid list */}
              {filteredDutyRoster.length === 0 ? (
                <div className="py-12 text-center text-neutral-500 border border-neutral-850 bg-neutral-950/25">
                  <span className="font-mono text-xs uppercase font-bold text-neutral-400">
                    No duty assignments match your filter search.
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDutyRoster.map((item) => (
                    <div
                      key={item.className}
                      className={`bg-neutral-950 border-2 transition-all p-5 flex flex-col justify-between space-y-4 ${
                        item.hasCollectedToday
                          ? "border-emerald-850 hover:border-emerald-700 bg-neutral-950/70"
                          : "border-neutral-850 hover:border-neutral-700 bg-neutral-950/30"
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

                          <span
                            className={`px-2 py-0.5 text-[9px] font-mono font-black uppercase tracking-wider border ${
                              item.className.startsWith("B")
                                ? "bg-neutral-900 border-neutral-850 text-neutral-300"
                                : "bg-amber-955/20 border-amber-900 text-amber-500"
                            }`}
                          >
                            {item.keyBadge}
                          </span>
                        </div>

                        {/* Teacher Assignment */}
                        <div className="border-t border-b border-neutral-900 py-3 space-y-1">
                          <span className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest font-extrabold block">
                            Assigned Staff
                          </span>
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
                            {item.email !== "N/A"
                              ? item.email
                              : `${item.teacherName.toLowerCase().replace(/\s+/g, "")}@school.edu`}
                          </span>
                        </div>

                        {/* specific responsibility */}
                        <div className="space-y-1">
                          <span className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest font-extrabold block">
                            Monitoring Responsibility
                          </span>
                          <p className="text-[11px] text-neutral-300 font-medium leading-relaxed uppercase tracking-tight font-sans">
                            {item.responsibility}
                          </p>
                        </div>
                      </div>

                      {/* Live Status and checkout rate */}
                      <div className="pt-3 border-t border-neutral-900 flex justify-between items-center text-[10px] font-mono font-bold">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${item.hasCollectedToday ? "bg-emerald-400 animate-pulse" : "bg-neutral-600"}`}
                          />
                          <span
                            className={`uppercase font-black tracking-wider ${item.hasCollectedToday ? "text-emerald-400" : "text-neutral-500"}`}
                          >
                            {item.hasCollectedToday
                              ? "ACTIVE ON DUTY"
                              : "STANDBY"}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-neutral-500">
                            Collected today:
                          </span>{" "}
                          <strong
                            className={
                              item.verifiedCount > 0
                                ? "text-white"
                                : "text-neutral-400"
                            }
                          >
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
                    <Activity size={18} className="text-amber-400" /> Recent
                    Activity Feed
                  </h3>
                  <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest mt-1 font-bold">
                    Real-time gate check-in fee collections (Last 10 entries)
                  </p>
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
                    const paymentTime = p.timestamp
                      ? new Date(p.timestamp).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })
                      : "";
                    const paymentDateStr = p.date
                      ? new Date(p.date).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "";

                    return (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.12 }}
                        className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-neutral-950 border-2 border-neutral-850 hover:border-neutral-700 p-4 transition-all gap-4 font-mono"
                      >
                        <div className="flex items-start gap-4 flex-1">
                          <div
                            className={`py-2 px-3 shrink-0 text-center font-black text-xs border ${
                              p.verified
                                ? "bg-emerald-950/40 border-emerald-900 text-emerald-400"
                                : "bg-amber-950/40 border-amber-900 text-amber-450"
                            }`}
                          >
                            {p.class}
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-tight leading-none pt-0.5 font-sans">
                              {p.studentName}
                            </h4>
                            <div className="flex flex-wrap gap-2 items-center text-[9px] text-neutral-500 font-black uppercase tracking-wide">
                              <span className="text-neutral-400">
                                {p.category}
                              </span>
                              <span className="text-neutral-700">•</span>
                              <span>By {p.collectedBy || "Unknown"}</span>
                              <span className="text-neutral-700">•</span>
                              <span className="text-neutral-450">
                                ID: #{p.studentId.slice(-5)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-baseline sm:items-end justify-between w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-900">
                          <div className="text-left sm:text-right">
                            <span className="text-sm sm:text-base font-black text-white">
                              GHC {p.amount.toFixed(2)}
                            </span>
                            <div className="text-[8px] text-neutral-500 font-semibold uppercase mt-0.5">
                              {paymentDateStr}{" "}
                              {paymentTime && `@ ${paymentTime}`}
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
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Perspective Tab 2: Full classroom list performance tracker with customizable search */}
        {activeLayout === "class-perf" && (
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
                <h3 className="text-2xl font-black uppercase italic text-white tracking-tight">
                  Active Classroom Gates Tracker
                </h3>
                <p className="text-xs text-neutral-400 font-bold mt-1">
                  Search or analyze response rates across schools
                </p>
              </div>

              {/* Incremental search search input bar */}
              <div className="relative w-full md:w-80">
                <Search
                  className="absolute left-3.5 top-3.5 text-neutral-500"
                  size={14}
                />
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
                  const rateColor =
                    met.rate > 85
                      ? "text-emerald-400 border-emerald-950 bg-emerald-950/25"
                      : met.rate > 50
                        ? "text-amber-400 border-amber-950 bg-amber-950/25"
                        : "text-red-500 border-red-950 bg-red-950/25";

                  return (
                    <motion.div
                      key={met.className}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      className="bg-neutral-950 border-2 border-neutral-850 p-6 flex flex-col justify-between gap-5 hover:border-neutral-700 transition"
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest bg-neutral-900 border border-neutral-800 px-2 py-0.5 font-mono">
                            {met.category} LEVEL
                          </span>
                          <h4 className="text-2xl font-black text-white font-mono leading-none pt-2">
                            {met.className} Checkpoint
                          </h4>
                        </div>
                        <span
                          className={`text-lg font-black font-mono border px-3 py-1.5 ${rateColor}`}
                        >
                          {met.rate.toFixed(0)}%
                        </span>
                      </div>

                      <div className="space-y-3.5 py-1 border-t border-b border-neutral-850">
                        <div className="flex justify-between text-xs font-bold font-mono">
                          <span className="text-neutral-500 uppercase tracking-wider">
                            Gate Teacher:
                          </span>
                          <span className="text-white uppercase tracking-wide">
                            {met.teacherName}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs font-bold font-mono">
                          <span className="text-neutral-500 uppercase tracking-wider">
                            Payments Cleared:
                          </span>
                          <span className="text-white">
                            {met.paidCount} pupils of {met.studentsCount}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs font-bold font-mono">
                          <span className="text-neutral-500 uppercase tracking-wider">
                            Total Fund sum:
                          </span>
                          <span className="text-white font-black">
                            GHC {met.collected.toFixed(2)}
                          </span>
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
                              met.rate > 85
                                ? "bg-emerald-400"
                                : met.rate > 50
                                  ? "bg-amber-400"
                                  : "bg-red-500"
                            }`}
                            style={{ width: `${met.rate}%` }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}

        {/* Perspective Tab 3: Detailed Alerts desk for high-priority uncollected payments - TARGETED */}
        {activeLayout === "alerts-desk" && (
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

            {alertsWithArrears.length > 0 && (() => {
              const sampleAlert = alertsWithArrears.find(a => selectedAlertIds.includes(a.studentId)) || alertsWithArrears[0];
              let previewMessage = '';
              if (sampleAlert) {
                previewMessage = bulkMessageTemplate
                  .replace(/{studentName}/g, sampleAlert.studentName)
                  .replace(/{className}/g, sampleAlert.class)
                  .replace(/{currentDate}/g, currentDate)
                  .replace(/{arrearsAmount}/g, sampleAlert.arrears.toFixed(2))
                  .replace(/{paymentType}/g, sampleAlert.paymentType === 'Term' ? 'Term-based' : sampleAlert.paymentType === 'Daily' ? 'Daily GHC 5' : sampleAlert.paymentType);
              }

              return (
                <div className="space-y-6">
                  {/* Bulk Notifications Dispatcher Hub */}
                  <div className="space-y-4 text-left">
                    <div className="border-b-2 border-neutral-800 pb-2">
                      <h4 className="text-sm font-black text-amber-400 font-mono uppercase tracking-widest flex items-center gap-2">
                        <span>■</span> BULK NOTIFICATIONS DISPATCHER HUB
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-neutral-950/60 border-2 border-neutral-850 p-6">
                      {/* Left col: Template customizers */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="text-amber-400" size={16} />
                          <h4 className="text-xs font-black text-neutral-300 font-mono uppercase tracking-widest">Notification content template</h4>
                        </div>
                        
                        <textarea
                          value={bulkMessageTemplate}
                          onChange={(e) => setBulkMessageTemplate(e.target.value)}
                          className="w-full h-44 bg-neutral-950 border border-neutral-800 p-4 font-mono text-[11px] leading-relaxed select-text outline-none text-neutral-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                          placeholder="Type default template message..."
                        />
                        
                        <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-neutral-500 font-bold bg-neutral-900/50 p-3 border border-neutral-850">
                          <div><span className="text-amber-400">{`{studentName}`}</span>: Ward full name</div>
                          <div><span className="text-amber-400">{`{className}`}</span>: Active grade/class</div>
                          <div><span className="text-amber-400">{`{arrearsAmount}`}</span>: Outstanding sum</div>
                          <div><span className="text-amber-400">{`{paymentType}`}</span>: Ledger billing code</div>
                          <div className="col-span-2 pt-1.5 border-t border-neutral-850 text-neutral-505 font-normal">
                            * Placeholders are auto-populated for each recipient dynamically.
                          </div>
                        </div>
                      </div>

                      {/* Right col: Group selections & controls */}
                      <div className="space-y-4 flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-black text-neutral-300 font-mono uppercase tracking-widest">Active Dispatcher Panel</h4>
                            <span className="text-[10px] font-mono font-black text-neutral-450 uppercase tracking-widest bg-neutral-900 border border-neutral-800 px-2.5 py-1">
                              {selectedAlertIds.length} matching selected
                            </span>
                          </div>

                          {/* Dynamic Channel Selector */}
                          <div className="flex justify-between items-center bg-neutral-900/60 p-1 border border-neutral-800 rounded-sm">
                            <span className="text-[10px] uppercase font-bold text-neutral-400 pl-2">Channel:</span>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => setActiveChannel('whatsapp')}
                                className={`text-[9.5px] font-mono font-black uppercase tracking-wider py-1.5 px-3 rounded-none transition-all cursor-pointer ${
                                  activeChannel === 'whatsapp'
                                    ? 'bg-emerald-500 text-black'
                                    : 'bg-transparent text-neutral-450 hover:text-white'
                                }`}
                              >
                                WhatsApp
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveChannel('sms')}
                                className={`text-[9.5px] font-mono font-black uppercase tracking-wider py-1.5 px-3 rounded-none transition-all cursor-pointer ${
                                  activeChannel === 'sms'
                                    ? 'bg-amber-500 text-black'
                                    : 'bg-transparent text-neutral-450 hover:text-white'
                                }`}
                              >
                                SMS Gateway
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={handleSelectAllArrears}
                              className="text-[9px] font-mono font-black uppercase tracking-wider py-2 px-3 bg-red-950/20 border border-red-900/60 hover:border-red-500 text-red-400 transition-all cursor-pointer"
                              title="Select all unverified checking students that have outstanding arrears > 0"
                            >
                              Select All With Arrears
                            </button>
                            <button
                              onClick={handleSelectAll}
                              className="text-[9px] font-mono font-bold uppercase tracking-wider py-2 px-3 bg-neutral-900 border border-neutral-800 hover:border-neutral-600 hover:text-white text-neutral-400 transition-all cursor-pointer"
                            >
                              Select All Candidates
                            </button>
                            <button
                              onClick={handleSelectNone}
                              className="text-[9px] font-mono font-bold uppercase tracking-wider py-2 px-3 bg-neutral-900 border border-neutral-800 hover:border-neutral-750 hover:text-neutral-305 text-neutral-500 transition-all cursor-pointer"
                            >
                              Deselect All
                            </button>
                          </div>

                          {previewMessage && (
                            <div className="bg-neutral-900 p-4 border border-neutral-850 rounded-sm space-y-1.5">
                              <div className="text-[9px] font-mono font-black uppercase text-neutral-550 flex items-center gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${activeChannel === 'whatsapp' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                <span>Simulated {activeChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'} Sample Preview ({sampleAlert?.studentName})</span>
                              </div>
                              <div className="text-[10.5px] leading-relaxed text-neutral-450 font-mono whitespace-pre-wrap select-text max-h-32 overflow-y-auto pr-1">
                                {previewMessage}
                              </div>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={handleLaunchBulkAlerts}
                          disabled={isBulkSending || selectedAlertIds.length === 0}
                          className={`w-full text-center text-xs font-mono font-black uppercase tracking-widest py-3 border-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
                            isBulkSending
                              ? 'bg-neutral-900 border-neutral-800 text-neutral-600 cursor-not-allowed'
                              : selectedAlertIds.length === 0
                                ? 'bg-neutral-950 border-neutral-850 text-neutral-650 cursor-not-allowed'
                                : activeChannel === 'whatsapp'
                                  ? 'bg-emerald-500 hover:bg-emerald-450 border-emerald-500 text-black font-black active:scale-[0.99] shadow-lg shadow-emerald-950/20'
                                  : 'bg-amber-500 hover:bg-amber-450 border-amber-500 text-black font-black active:scale-[0.99] shadow-lg shadow-amber-950/20'
                          }`}
                        >
                          {isBulkSending ? (
                            <span className="animate-pulse">DISPATCHING BULK {activeChannel === 'whatsapp' ? 'WHATSAPP' : 'SMS'} PIPELINE...</span>
                          ) : (
                            <>
                              {activeChannel === 'whatsapp' ? (
                                <MessageSquare size={13} className="shrink-0 stroke-[2.5]" />
                              ) : (
                                <Smartphone size={13} className="shrink-0 stroke-[2.5]" />
                              )}
                              <span>Dispatch Template {activeChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'} ({selectedAlertIds.length} selected)</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Live Broadcast Progress Bar Console */}
                    {bulkSendResults && (
                      <div className="bg-neutral-950 border-2 border-neutral-850 p-5 font-mono space-y-3">
                        <div className="flex justify-between items-center border-b border-neutral-850 pb-2">
                          <div className="text-xs font-black text-amber-400 flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                            <span>LIVE BROADCAST PIPELINE STREAM ({bulkSendResults.current}/{bulkSendResults.total})</span>
                          </div>
                          <span className="text-[10px] text-neutral-400 font-bold">{Math.round((bulkSendResults.current / bulkSendResults.total) * 100)}%</span>
                        </div>

                        {/* Elegant Progress bar container */}
                        <div className="w-full bg-neutral-900 h-2.5 border border-neutral-800 rounded-sm">
                          <div 
                            className="bg-emerald-500 h-full transition-all duration-350"
                            style={{ width: `${(bulkSendResults.current / bulkSendResults.total) * 100}%` }}
                          />
                        </div>

                        {/* Scrollable logger console window */}
                        <div className="bg-neutral-950/80 border border-neutral-850 p-3.5 h-36 overflow-y-auto text-[10.5px] leading-relaxed text-neutral-300 space-y-1 select-text scrollbar-thin text-left font-mono">
                          {bulkSendResults.logs.map((log, index) => (
                            <div key={index} className="flex gap-2">
                              <span className={`font-bold uppercase tracking-wider shrink-0 select-none ${
                                log.status === 'success' ? 'text-emerald-400' : log.status === 'error' ? 'text-red-500 font-black' : 'text-amber-400 animate-pulse'
                              }`}>
                                [{log.status === 'success' ? '✔ DELIVERED' : log.status === 'error' ? '✖ SKIPPED' : '♦ RUNNING'}]
                              </span>
                              <span className="font-bold text-neutral-200">{log.studentName}:</span>
                              <span className="text-neutral-400">{log.message}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setBulkSendResults(null)}
                            disabled={isBulkSending}
                            className="text-[9px] uppercase tracking-wider px-3 py-1.5 bg-neutral-900 border border-neutral-850 hover:bg-neutral-855 text-neutral-450 hover:text-white font-bold transition disabled:opacity-40"
                          >
                            Clear Stream Logs & Close Console
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Candidates Search Result Cards Header */}
                  <div className="border-b border-neutral-800 pb-2">
                    <h4 className="text-xs font-black text-neutral-400 font-mono uppercase tracking-widest text-left">
                      GATE CHECK-IN CANDIDATE PROFILES ({alertsWithArrears.length})
                    </h4>
                  </div>
                </div>
              );
            })()}

            {alertsWithArrears.length === 0 ? (
              <div className="py-20 text-center bg-neutral-950 border-2 border-neutral-850 space-y-3">
                <Check className="mx-auto text-amber-400" size={36} />
                <h4 className="text-lg font-black uppercase tracking-wider text-white">Workspace Cleared</h4>
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">No unverified pupils lack ledger keys today.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {alertsWithArrears.map((st) => {
                  const isSelected = selectedAlertIds.includes(st.studentId);
                  return (
                    <motion.div 
                      key={st.studentId} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      className={`bg-neutral-950 border-2 p-6 flex flex-col justify-between gap-5 transition-all duration-200 ${
                        isSelected
                          ? 'border-emerald-500 bg-neutral-950 shadow-md shadow-emerald-950/20'
                          : 'border-neutral-855 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-1.5 text-left">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-black bg-red-950 border border-red-800 text-red-400 px-2 py-0.5 uppercase tracking-widest font-mono">
                              {st.class} Checkpoint
                            </span>
                            {st.arrears > 0 ? (
                              <span className="text-[9px] font-black bg-red-500/10 border border-red-500/30 text-red-400 px-2 py-0.5 uppercase tracking-widest font-mono">
                                Arrears: GHC {st.arrears.toFixed(2)}
                              </span>
                            ) : (st.paymentType === 'Scholar' ? (
                              <span className="text-[9px] font-black bg-slate-900 border border-slate-850 text-slate-400 px-2 py-0.5 uppercase tracking-widest font-mono">
                                Scholar
                              </span>
                            ) : (
                              <span className="text-[9px] font-black bg-neutral-900 border border-neutral-800 text-neutral-400 px-2 py-0.5 uppercase tracking-widest font-mono">
                                No Debt
                              </span>
                            ))}
                          </div>
                          <h4 className="text-lg font-black text-white uppercase tracking-tight leading-none pt-2">{st.studentName}</h4>
                        </div>
                        
                        {/* Selector check box in top right */}
                        <button
                          type="button"
                          onClick={() => handleToggleSelectAlertObj(st.studentId)}
                          className={`p-1 flex items-center justify-center cursor-pointer border-2 transition-all rounded-sm shrink-0 ${
                            isSelected
                              ? 'bg-emerald-500 border-emerald-500 text-black'
                              : 'bg-neutral-900 hover:bg-neutral-850 border-neutral-800 text-transparent hover:border-neutral-650'
                          }`}
                          title={isSelected ? "Deselect student" : "Select student for draft"}
                        >
                          <Check size={12} className="stroke-[3]" />
                        </button>
                      </div>

                      <div className="bg-neutral-900 border border-neutral-855 p-3.5 space-y-2 text-xs font-mono text-left">
                        <div className="flex justify-between font-bold">
                          <span className="text-neutral-500 uppercase">Primary Category:</span>
                          <span className="text-white uppercase font-bold">{st.category}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span className="text-neutral-500 uppercase">Registered Contact:</span>
                          <span className="text-amber-400 select-all font-mono font-black">{st.guardianPhone}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span className="text-neutral-500 uppercase font-mono">Billing Scheme:</span>
                          <span className="text-white uppercase font-black">
                            {st.paymentType === 'Term' ? 'Term-based Scheme' : st.paymentType === 'Scholar' ? 'Scholar' : 'Daily GHC 5 Fee'}
                          </span>
                        </div>
                        <div className="flex justify-between font-bold text-red-100">
                          <span className="text-red-500 uppercase font-mono">Calculated Debt:</span>
                          <span className={`font-black ${st.arrears > 0 ? 'text-red-400 font-extrabold animate-pulse' : 'text-neutral-400'}`}>
                            GHC {st.arrears.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 mt-auto">
                        <button
                          onClick={() => handleDialGuardian(st.studentId, st.guardianPhone)}
                          disabled={notifiedStudents[st.studentId] || sendingWhatsApp[st.studentId] || sendingSms[st.studentId]}
                          className={`text-center text-[9px] font-black uppercase tracking-wider py-3 px-1 border-2 transition-all cursor-pointer flex items-center justify-center gap-1 ${
                            notifiedStudents[st.studentId]
                              ? 'bg-amber-400 border-amber-400 text-black font-black'
                              : 'bg-neutral-950 border-neutral-800 hover:border-neutral-600 hover:bg-neutral-900/50 text-white'
                          }`}
                        >
                          {notifiedStudents[st.studentId] ? (
                            <span className="animate-pulse">DIALING...</span>
                          ) : (
                            <>
                              <PhoneCall size={10} className="shrink-0" />
                              <span>Dial</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            // Run single alert with the custom template format
                            const formattedMessage = bulkMessageTemplate
                              .replace(/{studentName}/g, st.studentName)
                              .replace(/{className}/g, st.class)
                              .replace(/{currentDate}/g, currentDate)
                              .replace(/{arrearsAmount}/g, st.arrears.toFixed(2))
                              .replace(/{paymentType}/g, st.paymentType === 'Term' ? 'Term-based' : st.paymentType === 'Daily' ? 'Daily GHC 5' : st.paymentType);
                            
                            setSendingWhatsApp(prev => ({ ...prev, [st.studentId]: true }));
                            (async () => {
                              try {
                                if (sendautomatedWhatsApp) {
                                  await sendautomatedWhatsApp(st.guardianPhone, formattedMessage, st.studentId, st.studentName, 'compliance-alert');
                                }
                                setWhatsappSuccess(prev => ({ ...prev, [st.studentId]: true }));
                                showToast(`Simulated WhatsApp alert dispatched successfully to ${st.studentName}'s guardian!`);
                                setTimeout(() => {
                                  setWhatsappSuccess(prev => ({ ...prev, [st.studentId]: false }));
                                }, 3000);
                              } catch (e) {
                                showToast("Error dispatching simulated WhatsApp request.");
                              } finally {
                                setSendingWhatsApp(prev => ({ ...prev, [st.studentId]: false }));
                              }
                            })();
                          }}
                          disabled={notifiedStudents[st.studentId] || sendingWhatsApp[st.studentId] || sendingSms[st.studentId]}
                          className={`text-center text-[9px] font-black uppercase tracking-wider py-3 px-1 border-2 transition-all cursor-pointer flex items-center justify-center gap-1 ${
                            whatsappSuccess[st.studentId]
                              ? 'bg-emerald-500 border-emerald-500 text-black font-extrabold'
                              : 'bg-neutral-950 hover:bg-emerald-950/20 border-emerald-800/80 hover:border-emerald-500 text-emerald-400'
                          }`}
                          title="Simulate WhatsApp delivery message safely to guardian"
                        >
                          {sendingWhatsApp[st.studentId] ? (
                            <span className="animate-pulse">SENDING...</span>
                          ) : whatsappSuccess[st.studentId] ? (
                            <>
                              <Check size={10} className="shrink-0 stroke-[3]" />
                              <span>Sent OK</span>
                            </>
                          ) : (
                            <>
                              <MessageSquare size={10} className="shrink-0" />
                              <span>WhatsApp</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            const formattedMessage = bulkMessageTemplate
                              .replace(/{studentName}/g, st.studentName)
                              .replace(/{className}/g, st.class)
                              .replace(/{currentDate}/g, currentDate)
                              .replace(/{arrearsAmount}/g, st.arrears.toFixed(2))
                              .replace(/{paymentType}/g, st.paymentType === 'Term' ? 'Term-based' : st.paymentType === 'Daily' ? 'Daily GHC 5' : st.paymentType);
                            
                            setSendingSms(prev => ({ ...prev, [st.studentId]: true }));
                            setTimeout(() => {
                              setSmsSuccess(prev => ({ ...prev, [st.studentId]: true }));
                              showToast(`Simulated SMS receipt dispatched successfully to ${st.studentName}'s guardian!`);
                              setSendingSms(prev => ({ ...prev, [st.studentId]: false }));
                              setTimeout(() => {
                                setSmsSuccess(prev => ({ ...prev, [st.studentId]: false }));
                              }, 3000);
                            }, 800);
                          }}
                          disabled={notifiedStudents[st.studentId] || sendingWhatsApp[st.studentId] || sendingSms[st.studentId]}
                          className={`text-center text-[9px] font-black uppercase tracking-wider py-3 px-1 border-2 transition-all cursor-pointer flex items-center justify-center gap-1 ${
                            smsSuccess[st.studentId]
                              ? 'bg-amber-500 border-amber-500 text-black font-extrabold'
                              : 'bg-neutral-950 hover:bg-amber-950/20 border-neutral-855 hover:border-amber-500 text-amber-400'
                          }`}
                          title="Simulate standard mobile network SMS delivery safely to guardian"
                        >
                          {sendingSms[st.studentId] ? (
                            <span className="animate-pulse">SENDING...</span>
                          ) : smsSuccess[st.studentId] ? (
                            <>
                              <Check size={10} className="shrink-0 stroke-[3]" />
                              <span>Sent OK</span>
                            </>
                          ) : (
                            <>
                              <Smartphone size={10} className="shrink-0" />
                              <span>SMS</span>
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Perspective Tab 4: Weekly Collections Aggregate Matrix */}
        {activeLayout === "weekly-aggregate" && (
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
                  <Coins className="text-amber-400" size={18} /> Weekly Fee
                  Collections Matrix
                </h3>
                <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest mt-1 font-bold">
                  Class-by-Class school fees log for current week calendar
                </p>
              </div>

              {/* Selector / Stepper */}
              <div className="flex items-center gap-2 bg-neutral-950 p-1 border border-neutral-850">
                <button
                  type="button"
                  onClick={() => handleShiftWeek("prev")}
                  className="px-3 py-1.5 text-[10px] font-mono font-black uppercase tracking-wider text-neutral-450 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
                  title="Hop back 1 week"
                >
                  &larr; Prev Week
                </button>
                <span className="px-4 py-1.5 bg-neutral-900 border border-neutral-800/80 text-[10px] font-black font-mono text-white tracking-wider uppercase">
                  {new Date(weeklyCollectionsData.mondayStr).toLocaleDateString(
                    "en-GB",
                    { day: "numeric", month: "short" },
                  )}{" "}
                  -{" "}
                  {new Date(weeklyCollectionsData.sundayStr).toLocaleDateString(
                    "en-GB",
                    { day: "numeric", month: "short", year: "numeric" },
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => handleShiftWeek("next")}
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
                  Total school fees aggregated across all classes this calendar
                  week.
                </p>
              </div>

              <div className="bg-neutral-950 border-2 border-neutral-850 p-5 space-y-1.5">
                <span className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest font-extrabold block">
                  Peak Collection Day
                </span>
                <div className="text-2xl font-black text-white font-mono uppercase tracking-tight">
                  {peakDayInfo.amount > 0 ? peakDayInfo.label : "None"}
                </div>
                <p className="text-[9.5px] text-neutral-500 leading-tight">
                  Highest intake was{" "}
                  <strong className="text-neutral-350">
                    GHC {peakDayInfo.amount.toFixed(2)}
                  </strong>{" "}
                  on {peakDayInfo.amount > 0 ? peakDayInfo.dateStr : "N/A"}.
                </p>
              </div>

              <div className="bg-neutral-950 border-2 border-neutral-850 p-5 space-y-1.5">
                <span className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest font-extrabold block">
                  Top Performing Cohort
                </span>
                <div className="text-2xl font-black text-emerald-400 font-mono uppercase tracking-tight">
                  {topClassInfo.amount > 0
                    ? `Class ${topClassInfo.className}`
                    : "None"}
                </div>
                <p className="text-[9.5px] text-neutral-500 leading-tight">
                  Class collected a supreme total of{" "}
                  <strong className="text-emerald-500">
                    GHC {topClassInfo.amount.toFixed(2)}
                  </strong>{" "}
                  this week.
                </p>
              </div>
            </div>

            {/* Collections Trend Line / Bar Chart Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
              {/* Daily Inflow Velocity */}
              <div className="bg-neutral-950 border-2 border-neutral-850 p-6 space-y-4">
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider font-mono">
                    Daily Inflow Velocity
                  </h4>
                  <p className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest mt-0.5">
                    Visualizing fee revenue flow across days
                  </p>
                </div>

                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={weeklyChartData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={isDaylight ? "#cbd5e1" : "#1c1c1c"}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        stroke={isDaylight ? "#475569" : "#4b5563"}
                        fontSize={9}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke={isDaylight ? "#475569" : "#4b5563"}
                        fontSize={9}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `GHC ${v}`}
                      />
                      <RechartsTooltip
                        content={<CustomTooltip />}
                        cursor={{ stroke: isDaylight ? "#cbd5e1" : "#2e2e2e", strokeWidth: 1 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        name="Actual Collected"
                        stroke="#fbbf24"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#fbbf24", strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: isDaylight ? "#0f172a" : "#ffffff", strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Weekly Class Goals comparison bar chart */}
              <div className="bg-neutral-950 border-2 border-neutral-850 p-6 space-y-4">
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider font-mono">
                    Weekly Class Goals Comparison
                  </h4>
                  <p className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest mt-0.5">
                    Comparing actual weekly collections against target goals per
                    class level
                  </p>
                </div>

                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={classGoalsData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={isDaylight ? "#cbd5e1" : "#1c1c1c"}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        stroke={isDaylight ? "#475569" : "#4b5563"}
                        fontSize={9}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke={isDaylight ? "#475569" : "#4b5563"}
                        fontSize={9}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `GHC ${v}`}
                      />
                      <RechartsTooltip
                        content={<CustomTooltip />}
                        cursor={{ fill: isDaylight ? "#cbd5e1" : "#171717", opacity: 0.4 }}
                      />
                      <Legend
                        verticalAlign="top"
                        height={24}
                        iconType="square"
                        iconSize={8}
                        wrapperStyle={{
                          fontSize: "8px",
                          fontWeight: "900",
                          textTransform: "uppercase",
                          fontFamily: "JetBrains Mono, monospace",
                          color: isDaylight ? "#475569" : "#a3a3a3",
                          paddingBottom: "10px",
                        }}
                      />
                      <Bar
                        dataKey="Actual Collected"
                        fill="#fbbf24"
                        name="Actual"
                        maxBarSize={16}
                        radius={[2, 2, 0, 0]}
                      />
                      <Bar
                        dataKey="Target Goal"
                        fill={isDaylight ? "#94a3b8" : "#3f3f46"}
                        name="Target Goal"
                        maxBarSize={16}
                        radius={[2, 2, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Daily Expenditures Breakdown Stacked Bar Chart */}
            <div className="bg-neutral-950 border-2 border-neutral-850 p-6 space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider font-mono">
                    Total Daily Expenditures Breakdown
                  </h4>
                  <p className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest mt-0.5">
                    Chronological summary of overhead expenditures categorized
                    by functional areas
                  </p>
                </div>
                {/* Visual Legend Key highlights */}
                <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[8.5px] font-mono uppercase text-neutral-400 font-black">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#60a5fa] rounded-sm" />
                    <span>Supplies</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#fbbf24] rounded-sm" />
                    <span>Maintenance</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#22d3ee] rounded-sm" />
                    <span>Utility</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#34d399] rounded-sm" />
                    <span>Payroll</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#818cf8] rounded-sm" />
                    <span>Food</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#f472b6] rounded-sm" />
                    <span>Transport</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#a78bfa] rounded-sm" />
                    <span>Uniforms</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#737373] rounded-sm" />
                    <span>Others</span>
                  </div>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dailyExpenditureChartData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDaylight ? "#cbd5e1" : "#1c1c1c"}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      stroke={isDaylight ? "#475569" : "#4b5563"}
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke={isDaylight ? "#475569" : "#4b5563"}
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `GHC ${v}`}
                    />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const rawLabel = payload[0].payload.date;
                          const totalAmt = payload[0].payload.total;
                          const isDaylightMode = theme === "daylight";
                          return (
                            <div className={`${isDaylightMode ? "bg-white border-neutral-300 text-neutral-900 shadow-md" : "bg-neutral-900 border-neutral-800 text-white shadow-2xl"} border-2 p-3.5 font-mono text-[9.5px] uppercase space-y-2.5 min-w-[200px]`}>
                              <div className={`border-b ${isDaylightMode ? "border-neutral-200" : "border-neutral-800"} pb-1.5 flex justify-between items-center`}>
                                <span className={`font-extrabold ${isDaylightMode ? "text-neutral-500" : "text-neutral-400"}`}>
                                  {rawLabel}
                                </span>
                                <span className={`${isDaylightMode ? "text-amber-600" : "text-amber-400"} font-black`}>
                                  GHC {totalAmt.toFixed(2)}
                                </span>
                              </div>
                              <div className="space-y-1">
                                {payload.map((entry: any) => {
                                  if (!entry.value) return null;
                                  return (
                                    <div
                                      key={entry.name}
                                      className="flex justify-between items-center gap-4"
                                    >
                                      <span className={`flex items-center gap-1.5 font-bold ${isDaylightMode ? "text-neutral-600" : "text-neutral-400"}`}>
                                        <span
                                          className="w-2 h-2 rounded-xs"
                                          style={{
                                            backgroundColor: entry.color,
                                          }}
                                        />
                                        {entry.name}
                                      </span>
                                      <span className={`font-extrabold ${isDaylightMode ? "text-neutral-900" : "text-white"}`}>
                                        GHC {entry.value.toFixed(2)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="Supplies"
                      stackId="exp"
                      fill="#60a5fa"
                      maxBarSize={28}
                    />
                    <Bar
                      dataKey="Maintenance"
                      stackId="exp"
                      fill="#fbbf24"
                      maxBarSize={28}
                    />
                    <Bar
                      dataKey="Utility"
                      stackId="exp"
                      fill="#22d3ee"
                      maxBarSize={28}
                    />
                    <Bar
                      dataKey="Payroll"
                      stackId="exp"
                      fill="#34d399"
                      maxBarSize={28}
                    />
                    <Bar
                      dataKey="Food"
                      stackId="exp"
                      fill="#818cf8"
                      maxBarSize={28}
                    />
                    <Bar
                      dataKey="Transport"
                      stackId="exp"
                      fill="#f472b6"
                      maxBarSize={28}
                    />
                    <Bar
                      dataKey="Uniforms"
                      stackId="exp"
                      fill="#a78bfa"
                      maxBarSize={28}
                    />
                    <Bar
                      dataKey="Others"
                      stackId="exp"
                      fill="#737373"
                      maxBarSize={28}
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
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
                              isToday ? "text-amber-400 bg-amber-450/10" : ""
                            }`}
                          >
                            <span className="block text-[9.5px] font-black leading-none">
                              {day.label.substring(0, 3)}
                            </span>
                            <span className="block text-[8px] text-neutral-500 font-mono mt-1 font-bold">
                              {new Date(day.dateStr).toLocaleDateString(
                                "en-GB",
                                { day: "numeric", month: "short" },
                              )}
                            </span>
                          </th>
                        );
                      })}
                      <th className="py-3 px-4 text-right bg-neutral-900 font-extrabold text-white">
                        Class Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900">
                    {weeklyCollectionsData.rows.map((row) => {
                      return (
                        <tr
                          key={row.className}
                          className={`transition-all border-b border-neutral-900 ${
                            row.isTrendingBelow
                              ? "bg-rose-950/5 hover:bg-rose-950/10 border-l-4 border-l-rose-500/60"
                              : "bg-neutral-950/5 hover:bg-neutral-900/40 border-l-4 border-l-transparent"
                          }`}
                        >
                          <td className="py-3 px-4 font-mono bg-neutral-950/50">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <span className="font-black text-white text-sm">
                                Class {row.className}
                              </span>
                              {row.isTrendingBelow ? (
                                <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest bg-rose-500/10 border border-rose-500/30 text-rose-400 px-1.5 py-0.5 rounded-xs">
                                  <TrendingDown
                                    size={10}
                                    className="text-rose-400"
                                  />
                                  Below Avg (
                                  {Math.abs(row.percentDifference).toFixed(0)}%)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-1.5 py-0.5 rounded-xs">
                                  <TrendingUp
                                    size={10}
                                    className="text-emerald-400"
                                  />
                                  Above Avg (+{row.percentDifference.toFixed(0)}
                                  %)
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] text-neutral-500 font-mono mt-0.5 uppercase tracking-wider">
                              Weekly Avg:{" "}
                              <span className="text-neutral-400 font-bold">
                                GHC {row.historicalAvg.toFixed(2)}
                              </span>
                            </div>
                          </td>
                          {weeklyCollectionsData.weekdays.map((day) => {
                            const value = row.dailyCollected[day.dateStr] || 0;
                            const isToday = day.dateStr === dateFilter;
                            return (
                              <td
                                key={day.dateStr}
                                className={`py-3 px-3 text-center font-mono font-bold transition-all ${
                                  isToday ? "bg-amber-450/5" : ""
                                } ${
                                  value > 0
                                    ? "text-neutral-200"
                                    : "text-neutral-600"
                                }`}
                              >
                                {value > 0 ? `GHC ${value.toFixed(2)}` : "-"}
                              </td>
                            );
                          })}
                          <td
                            className={`py-3 px-4 text-right font-black font-mono bg-neutral-900/50 ${
                              row.isTrendingBelow
                                ? "text-rose-450"
                                : "text-amber-450"
                            }`}
                          >
                            GHC {row.classTotal.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                    {/* The Footer column-totals Row */}
                    <tr className="border-t-2 border-neutral-800 bg-neutral-900 font-mono text-[11px] font-extrabold text-white">
                      <td className="py-4.5 px-4 uppercase font-black tracking-wider">
                        Total collections
                      </td>
                      {weeklyCollectionsData.weekdays.map((day) => {
                        const totalValue =
                          weeklyCollectionsData.dayTotals[day.dateStr] || 0;
                        const isToday = day.dateStr === dateFilter;
                        return (
                          <td
                            key={day.dateStr}
                            className={`py-4.5 px-3 text-center font-black ${
                              isToday ? "text-amber-450 bg-amber-400/10" : ""
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
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block font-mono">
                  Ledger Synchronization Tip
                </span>
                <p className="text-[10px] text-neutral-400 leading-normal font-medium">
                  This weekly matrix sums only processed & approved school fee
                  payments (excluding absent cohorts). Discrepancies may appear
                  if Gatekeepers have pending local check-ins offline. Ensure
                  all ledger changes on the{" "}
                  <strong className="text-white">"Sleek Bento Grid"</strong> are
                  pushed before reporting.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Perspective Tab 5: Visual Attendance & Absentees Heatmap */}
        {activeLayout === "absence-heatmap" && (
          <motion.div
            key="absence-heatmap-layout"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="bg-neutral-900 border-4 border-neutral-800 p-8 space-y-6 text-left"
          >
            {/* Header Content */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b-2 border-neutral-850">
              <div>
                <span className="text-[9px] text-amber-500 font-mono tracking-widest font-black uppercase bg-amber-400/10 border border-amber-400/30 px-2.5 py-1 rounded-xs">
                  Aura Absenteeism Risk Index
                </span>
                <h3 className="text-xl font-black uppercase italic text-white tracking-tight mt-2 flex items-center gap-2">
                  <Calendar className="text-amber-400" size={18} /> Student
                  Absence Frequency Heatmap
                </h3>
                <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest mt-1 font-bold">
                  Identify patterns of high absenteeism & track weekly gate
                  attendance trends instantly
                </p>
              </div>

              {/* Grid Control Elements */}
              <div className="flex flex-wrap items-center gap-2 bg-neutral-950 p-1.5 border border-neutral-850">
                <span className="text-[9px] font-mono font-black uppercase text-neutral-400 px-2">
                  Days scope:
                </span>
                {[15, 20, 30].map((daysNum) => (
                  <button
                    key={daysNum}
                    type="button"
                    onClick={() => setHeatmapDaysRange(daysNum)}
                    className={`px-3 py-1 font-mono text-[9px] font-black uppercase border-2 transition-all cursor-pointer ${
                      heatmapDaysRange === daysNum
                        ? "bg-amber-400 border-amber-400 text-black"
                        : "bg-neutral-900 border-neutral-800 hover:border-neutral-600 text-neutral-400 hover:text-white"
                    }`}
                  >
                    Last {daysNum}d
                  </button>
                ))}
              </div>
            </div>

            {/* Live Heatmap Control Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-neutral-950 p-4 border-2 border-neutral-850/80">
              {/* Class selector selector */}
              <div className="space-y-1.5 text-left">
                <label className="text-[9.5px] font-mono uppercase font-black text-neutral-400 block tracking-wide">
                  Filter Classroom
                </label>
                <select
                  value={heatmapClass}
                  onChange={(e) =>
                    setHeatmapClass(e.target.value as StudentClass | "all")
                  }
                  className="w-full bg-neutral-900 border-2 border-neutral-800 p-2.5 text-[10px] font-mono font-bold text-white focus:outline-none focus:border-amber-400 uppercase rounded-none cursor-pointer"
                >
                  <option value="all">
                    ALL CLASSES ({students.length} pupils)
                  </option>
                  {[
                    "Nursery",
                    "KG1",
                    "KG2",
                    "B1",
                    "B2",
                    "B3",
                    "B4",
                    "B5",
                    "B6",
                    "B7",
                    "B8",
                    "B9",
                  ].map((cls) => (
                    <option key={cls} value={cls}>
                      Class {cls} (
                      {
                        students.filter((s) => s.active && s.class === cls)
                          .length
                      }{" "}
                      pupils)
                    </option>
                  ))}
                </select>
              </div>

              {/* Student Search filter */}
              <div className="space-y-1.5 text-left md:col-span-2">
                <label className="text-[9.5px] font-mono uppercase font-black text-neutral-400 block tracking-wide">
                  Search Name / Roll Number
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-500 pointer-events-none">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    value={heatmapSearch}
                    onChange={(e) => setHeatmapSearch(e.target.value)}
                    placeholder="ENTER STUDENT NAME OR ROLL CODE..."
                    className="w-full bg-neutral-900 border-2 border-neutral-800 py-2.5 pl-9 pr-4 text-[10px] font-mono font-bold text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 uppercase rounded-none"
                  />
                  {heatmapSearch && (
                    <button
                      type="button"
                      onClick={() => setHeatmapSearch("")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-white"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Group sorting criteria */}
              <div className="space-y-1.5 text-left">
                <label className="text-[9.5px] font-mono uppercase font-black text-neutral-400 block tracking-wide">
                  Order Sequence
                </label>
                <div className="flex bg-neutral-900 p-1 border border-neutral-800 gap-1 h-[42px] items-center">
                  <button
                    type="button"
                    onClick={() => setHeatmapSort("absent-desc")}
                    className={`flex-1 py-1.5 text-[9px] font-mono font-black uppercase tracking-wider text-center cursor-pointer transition-colors ${
                      heatmapSort === "absent-desc"
                        ? "bg-rose-950/40 text-rose-450 border border-rose-900/60 font-black"
                        : "text-neutral-500 hover:text-white"
                    }`}
                  >
                    High Absence &darr;
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeatmapSort("name-asc")}
                    className={`flex-1 py-1.5 text-[9px] font-mono font-black uppercase tracking-wider text-center cursor-pointer transition-colors ${
                      heatmapSort === "name-asc"
                        ? "bg-neutral-800 text-white font-black"
                        : "text-neutral-500 hover:text-white"
                    }`}
                  >
                    Name (A-Z)
                  </button>
                </div>
              </div>
            </div>

            {/* Statistical KPIs Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-neutral-950 border-2 border-neutral-850 p-5 space-y-1.5 relative overflow-hidden">
                <div className="absolute right-3 top-3 opacity-15 text-rose-500">
                  <AlertTriangle size={32} />
                </div>
                <span className="text-[9.5px] text-neutral-500 font-mono uppercase tracking-widest font-extrabold block">
                  Total Absences Reported
                </span>
                <div className="text-3xl font-black text-rose-500 font-mono">
                  {payments.filter((p) => p.isAbsent).length} Days
                </div>
                <p className="text-[10px] text-neutral-400 leading-tight">
                  Aggregated frequency of confirmed absences school-wide across
                  current active terms.
                </p>
              </div>

              <div className="bg-neutral-950 border-2 border-neutral-850 p-5 space-y-1.5 relative overflow-hidden">
                <div className="absolute right-3 top-3 opacity-15 text-amber-500">
                  <Users size={32} />
                </div>
                <span className="text-[9.5px] text-neutral-500 font-mono uppercase tracking-widest font-extrabold block">
                  Critical Attendance Risk
                </span>
                <div className="text-3xl font-black text-amber-500 font-mono">
                  {heatmapStudentsData.filter((h) => h.absentCount >= 3).length}{" "}
                  pupils
                </div>
                <p className="text-[10px] text-neutral-400 leading-tight">
                  Students in the current view with{" "}
                  <span className="text-amber-400 font-bold font-mono">
                    3+ absences
                  </span>{" "}
                  within the scope.
                </p>
              </div>

              <div className="bg-neutral-950 border-2 border-neutral-850 p-5 space-y-1.5 relative overflow-hidden">
                <div className="absolute right-3 top-3 opacity-15 text-emerald-500">
                  <Activity size={32} />
                </div>
                <span className="text-[9.5px] text-neutral-500 font-mono uppercase tracking-widest font-extrabold block">
                  Average Attendance Rate
                </span>
                <div className="text-3xl font-black text-emerald-400 font-mono font-mono">
                  {(
                    heatmapStudentsData.reduce(
                      (acc, h) => acc + h.attendanceRate,
                      0,
                    ) / (heatmapStudentsData.length || 1)
                  ).toFixed(1)}
                  %
                </div>
                <p className="text-[10px] text-neutral-400 leading-tight">
                  Average presence accuracy rate of currently filtered student
                  segment.
                </p>
              </div>
            </div>

            {/* Main Heatmap Visual Container */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Heatmap Grid on Left (Span 3) */}
              <div className="lg:col-span-3 bg-neutral-950 border-2 border-neutral-850 p-6 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-neutral-900 pb-3">
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                      Daily Check-In Matrix Grid
                    </h4>
                    <p className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest mt-0.5">
                      Cells display presence on standard school days. Left is
                      older • Right is newer
                    </p>
                  </div>

                  {/* Heatmap color guide legends */}
                  <div className="flex flex-wrap gap-3 text-[9px] font-mono font-black uppercase text-neutral-400">
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 block border border-emerald-400" />
                      <span>Present</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 block border border-rose-455" />
                      <span>Absent</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-xs bg-neutral-900 block border border-neutral-800" />
                      <span>Unmarked</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-xs bg-amber-500/10 block border border-amber-500/20 text-amber-500 text-[8px] font-black flex items-center justify-center">
                        H
                      </span>
                      <span>Holiday</span>
                    </div>
                  </div>
                </div>

                {heatmapStudentsData.length === 0 ? (
                  <div className="py-16 text-center border-2 border-dashed border-neutral-850 bg-neutral-900/10">
                    <Calendar
                      className="mx-auto text-neutral-600 mb-2.5 animate-bounce"
                      size={24}
                    />
                    <p className="text-[10px] text-neutral-400 font-mono uppercase tracking-widest font-black">
                      No Active Pupils Identified
                    </p>
                    <p className="text-[9px] text-neutral-500 font-mono uppercase tracking-wider mt-1">
                      Adjust class or rename filters to inspect records
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto select-none border border-neutral-900">
                    <table className="w-full table-fixed min-w-[650px] border-collapse text-left">
                      <thead>
                        <tr className="bg-neutral-900/50 border-b border-neutral-850 font-mono text-[9px] font-black uppercase text-neutral-400 tracking-wider">
                          <th className="py-2.5 px-4 w-[160px] sticky left-0 bg-neutral-950 z-10 border-r border-neutral-850">
                            Student Profile
                          </th>
                          {computedHeatmapDates.map((dayStr) => {
                            const isHoliday =
                              activeTerm?.publicHolidays?.includes(dayStr);
                            const lastTwoDigits = dayStr.substring(8, 10);
                            const monthAbbr = new Date(
                              dayStr,
                            ).toLocaleDateString("en-US", { month: "short" });
                            return (
                              <th
                                key={dayStr}
                                className={`py-2.5 px-1.5 text-center text-[10px] border-r border-neutral-850/40 font-mono ${
                                  dayStr === dateFilter
                                    ? "text-amber-400 bg-amber-400/5"
                                    : ""
                                }`}
                                title={`${dayStr}${isHoliday ? " (Public Holiday)" : ""}`}
                              >
                                <div>{monthAbbr}</div>
                                <div className="text-[10px] text-white font-extrabold">
                                  {lastTwoDigits}
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {heatmapStudentsData.map(
                          ({
                            student,
                            absentCount,
                            presentCount,
                            unmarkedCount,
                            attendanceRate,
                            riskLevel,
                            records,
                          }) => {
                            return (
                              <motion.tr
                                key={student.id}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.1 }}
                                className="border-b border-neutral-900 hover:bg-neutral-900/20 font-mono transition-colors"
                              >
                                {/* Left sticky column: student name */}
                                <td className="py-2 w-[160px] px-3 font-semibold text-[10px] text-white tracking-tight truncate sticky left-0 bg-neutral-950 z-11 border-r border-neutral-850 flex items-center gap-1.5 h-[44px]">
                                  <div className="truncate flex-1">
                                    <div className="font-extrabold text-neutral-250 hover:text-white truncate uppercase flex items-center gap-1 select-text">
                                      {student.name}
                                    </div>
                                    <div className="text-[7.5px] text-neutral-500 font-bold flex items-center gap-1 uppercase select-text">
                                      <span>Cls: {student.class}</span> •{" "}
                                      <span>
                                        Roll: {student.rollNumber || "N/A"}
                                      </span>
                                    </div>
                                  </div>
                                  {absentCount >= 3 && (
                                    <span
                                      className="w-1.5 h-1.5 rounded-full bg-rose-550 shrink-0 select-none animate-ping"
                                      title="Critical absenteeism risk!"
                                    />
                                  )}
                                </td>

                                {/* Heatmap cells */}
                                {computedHeatmapDates.map((dayStr) => {
                                  const rec = records[dayStr];
                                  const isHoliday =
                                    activeTerm?.publicHolidays?.includes(
                                      dayStr,
                                    );

                                  let cellStyle =
                                    "bg-neutral-900 border-neutral-850/80 text-neutral-700 hover:border-neutral-500";
                                  let cellText = "";
                                  let cellTitle = `${student.name}: No recorded roll status on ${dayStr}`;

                                  if (isHoliday) {
                                    cellStyle =
                                      "bg-neutral-950 border-neutral-900 text-amber-500/30 text-[7px] font-black hover:border-amber-500/20";
                                    cellText = "H";
                                    cellTitle = `Official Holiday: School is closed on ${dayStr}`;
                                  } else if (rec) {
                                    if (rec.isAbsent) {
                                      cellStyle =
                                        "bg-rose-550 border-rose-450 hover:scale-110 shadow-[0_0_8px_rgba(239,68,68,0.4)] z-10 cursor-pointer text-white";
                                      cellText = "A";
                                      cellTitle = `${student.name} was Marked ABSENT on ${dayStr}.${rec.notes ? " Notes: " + rec.notes : ""} Verified: ${rec.verified ? "Yes" : "No"}`;
                                    } else {
                                      cellStyle =
                                        "bg-emerald-500 border-emerald-450 hover:scale-110 hover:border-white cursor-pointer z-10 text-black";
                                      cellText = "P";
                                      cellTitle = `${student.name} was Marked PRESENT on ${dayStr}. Payment: GHC ${rec.amount.toFixed(2)}`;
                                    }
                                  }

                                  const isHovered =
                                    hoveredCell?.studentId === student.id &&
                                    hoveredCell?.dateStr === dayStr;

                                  return (
                                    <td
                                      key={dayStr}
                                      className="p-1 text-center font-mono border-r border-neutral-850/30 h-[44px] transition-all relative"
                                      title={cellTitle}
                                      onMouseEnter={() =>
                                        setHoveredCell({
                                          studentId: student.id,
                                          dateStr: dayStr,
                                        })
                                      }
                                      onMouseLeave={() => setHoveredCell(null)}
                                    >
                                      <div
                                        className={`w-full h-full max-h-[30px] rounded-xs flex items-center justify-center font-black text-[9px] border transition-all ${cellStyle}`}
                                      >
                                        {cellText}
                                      </div>

                                      {/* Hover Cell contextual micro Tooltip Panel */}
                                      {isHovered && (
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-neutral-950 border border-neutral-800 text-white font-mono p-3 w-56 text-[10px] space-y-1.5 shadow-2xl rounded-xs pointer-events-none z-50 animate-fade-in text-left">
                                          <div className="pb-1 border-b border-neutral-850 flex justify-between items-center text-[9px]">
                                            <span className="text-amber-500 font-extrabold">
                                              {dayStr}
                                            </span>
                                            <span className="text-neutral-500 font-black uppercase">
                                              CHECK-IN DETAILS
                                            </span>
                                          </div>
                                          <div className="font-extrabold text-[10.5px] uppercase truncate">
                                            {student.name}
                                          </div>
                                          <div className="text-[9.5px]">
                                            Status:{" "}
                                            {isHoliday ? (
                                              <span className="text-amber-400 font-black">
                                                PUBLIC HOLIDAY
                                              </span>
                                            ) : rec ? (
                                              rec.isAbsent ? (
                                                <span className="text-rose-400 font-black animate-pulse">
                                                  MARKED ABSENT
                                                </span>
                                              ) : (
                                                <span className="text-emerald-400 font-black">
                                                  PRESENT & ACTIVE
                                                </span>
                                              )
                                            ) : (
                                              <span className="text-neutral-500 font-black">
                                                UNMARKED / PENDING
                                              </span>
                                            )}
                                          </div>
                                          {rec && (
                                            <div className="text-[9px] text-neutral-400 space-y-0.5 pt-1 border-t border-neutral-900/40">
                                              <div>
                                                Collector:{" "}
                                                <span className="text-neutral-200">
                                                  {rec.collectedBy ||
                                                    "Fallback System"}
                                                </span>
                                              </div>
                                              {rec.notes && (
                                                <div className="italic text-neutral-300">
                                                  "Notes: {rec.notes}"
                                                </div>
                                              )}
                                              {!rec.isAbsent && (
                                                <div>
                                                  Amt Logged:{" "}
                                                  <span className="text-neutral-200">
                                                    GHC {rec.amount.toFixed(2)}
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </motion.tr>
                            );
                          },
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Attendance Insights & Action Hub Column on Right (Span 1) */}
              <div className="space-y-6">
                {/* Ranking Insight List */}
                <div className="bg-neutral-950 border-2 border-neutral-850 p-5 space-y-4">
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider font-mono">
                      Absenteeism Hotspots
                    </h4>
                    <p className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest mt-0.5">
                      Top absentees requiring urgent counter intervention
                    </p>
                  </div>

                  <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
                    {heatmapStudentsData
                      .filter((h) => h.absentCount > 0)
                      .slice(0, 7)
                      .map(
                        ({
                          student,
                          absentCount,
                          presentCount,
                          attendanceRate,
                          riskLevel,
                        }) => (
                          <div
                            key={student.id}
                            className="bg-neutral-900/60 p-3.5 border border-neutral-850 flex flex-col gap-2 transition-all hover:border-neutral-700"
                          >
                            <div className="flex justify-between items-start gap-1">
                              <div className="truncate flex-1">
                                <span className="text-[10px] font-mono font-black text-white hover:text-amber-400 cursor-pointer block truncate uppercase">
                                  {student.name}
                                </span>
                                <span className="text-[8px] font-mono uppercase font-black text-neutral-500 block">
                                  Class: {student.class} • Roll:{" "}
                                  {student.rollNumber || "N/A"}
                                </span>
                              </div>
                              <span
                                className={`text-[8.5px] font-mono uppercase font-black px-1.5 py-0.5 shrink-0 rounded-xs ${
                                  riskLevel === "high"
                                    ? "bg-rose-950/40 text-rose-455 border border-rose-900"
                                    : riskLevel === "medium"
                                      ? "bg-amber-955 text-amber-500 border border-amber-900"
                                      : "bg-neutral-800 text-neutral-400"
                                }`}
                              >
                                {absentCount} Days Lost
                              </span>
                            </div>

                            {/* Attendance percentage indicator micro tracker */}
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-[7.5px] font-mono uppercase text-neutral-400 font-bold">
                                <span>Attendance rate:</span>
                                <span
                                  className={
                                    attendanceRate < 80
                                      ? "text-rose-455 font-black"
                                      : "text-neutral-300"
                                  }
                                >
                                  {attendanceRate.toFixed(0)}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-neutral-950 overflow-hidden rounded-full border border-neutral-900">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    attendanceRate < 70
                                      ? "bg-rose-500"
                                      : attendanceRate < 85
                                        ? "bg-amber-500"
                                        : "bg-emerald-500"
                                  }`}
                                  style={{ width: `${attendanceRate}%` }}
                                />
                              </div>
                            </div>

                            {/* Dialing and SMS hot-triggers for the parent right in place */}
                            <div className="grid grid-cols-2 gap-2 mt-1">
                              <button
                                onClick={() =>
                                  handleDialGuardian(
                                    student.id,
                                    student.guardianPhone || "",
                                  )
                                }
                                disabled={
                                  notifiedStudents[student.id] ||
                                  sendingWhatsApp[student.id]
                                }
                                className={`text-center text-[8.5px] font-mono font-black uppercase tracking-wider py-1.5 border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                  notifiedStudents[student.id]
                                    ? "bg-amber-400 border-amber-400 text-black font-black"
                                    : "bg-neutral-950 border-neutral-800 hover:border-neutral-600 text-neutral-300"
                                }`}
                                title="Dial Secure Parent Hotline"
                              >
                                {notifiedStudents[student.id] ? (
                                  <span className="animate-pulse">
                                    DIALING...
                                  </span>
                                ) : (
                                  <>
                                    <PhoneCall size={9} className="shrink-0" />
                                    <span>Voice Line</span>
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() =>
                                  handleSendWhatsAppAlert({
                                    studentId: student.id,
                                    studentName: student.name,
                                    guardianPhone: student.guardianPhone,
                                  })
                                }
                                disabled={
                                  notifiedStudents[student.id] ||
                                  sendingWhatsApp[student.id]
                                }
                                className={`text-center text-[8.5px] font-mono font-black uppercase tracking-wider py-1.5 border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                  whatsappSuccess[student.id]
                                    ? "bg-emerald-500 border-emerald-500 text-black font-black"
                                    : "bg-neutral-950 border-emerald-905 hover:border-emerald-500 text-emerald-450 hover:bg-emerald-950/20"
                                }`}
                                title="Simulate parental WhatsApp compliance warning notification"
                              >
                                {sendingWhatsApp[student.id] ? (
                                  <span className="animate-pulse">
                                    SENDING...
                                  </span>
                                ) : whatsappSuccess[student.id] ? (
                                  <span>SENT OK</span>
                                ) : (
                                  <>
                                    <MessageSquare
                                      size={9}
                                      className="shrink-0"
                                    />
                                    <span>Alert Parent</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ),
                      )}
                    {heatmapStudentsData.filter((h) => h.absentCount > 0)
                      .length === 0 && (
                      <div className="py-8 text-center bg-neutral-900/20 border border-neutral-850">
                        <Check
                          className="mx-auto text-emerald-500 mb-1 animate-pulse"
                          size={16}
                        />
                        <span className="text-[9px] font-mono text-neutral-400 uppercase font-black tracking-wider block">
                          Zero Absences!
                        </span>
                        <span className="text-[8px] font-mono text-neutral-500 uppercase mt-0.5 block">
                          Perfect record within filtered dates.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Legend Guidelines Box */}
                <div className="bg-neutral-950 border-2 border-neutral-850 p-5 space-y-3">
                  <h4 className="text-[10px] font-mono font-black text-amber-500 uppercase tracking-widest block">
                    Heatmap Action Protocol
                  </h4>
                  <p className="text-[9.5px] text-neutral-400 leading-normal">
                    This heatmap utilizes data from daily registers. High
                    absenteeism of{" "}
                    <strong className="text-white">
                      three (3) or more lost schooling days
                    </strong>{" "}
                    triggers a visual counter-warning and prioritizes the
                    student's profile for emergency checkups.
                  </p>
                  <p className="text-[9px] text-neutral-500 font-mono italic">
                    Note: Cleared holidays are non-penalty days and won't count
                    towards absent metrics or arrears balances.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Perspective Tab 6: Executive Arrears & Performance Console */}
        {activeLayout === "arrears-performance" && (
          <motion.div
            key="arrears-performance-layout"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="bg-neutral-900 border-4 border-neutral-800 p-8 space-y-6 text-left"
          >
            {/* Header Content */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b-2 border-neutral-850">
              <div>
                <span className="text-[9px] text-amber-500 font-mono tracking-widest font-black uppercase bg-amber-400/10 border border-amber-400/30 px-2.5 py-1 rounded-xs">
                  Executive Finance & Operations Deck
                </span>
                <h3 className="text-xl font-black uppercase italic text-white tracking-tight mt-2 flex items-center gap-2">
                  <Award className="text-amber-400" size={18} /> Management Arrears & Performance
                </h3>
                <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest mt-1 font-bold font-mono">
                  Aggregate school debt recovery schedules, monitor collection rates, and evaluate gate check-in accuracy
                </p>
              </div>

              {/* Quick statistics at top */}
              <div className="flex gap-4 font-mono">
                <div className="bg-neutral-950 border border-neutral-850 px-4 py-2 text-right">
                  <span className="text-[8px] text-neutral-500 block uppercase font-black">Global Outstanding</span>
                  <span className="text-sm font-black text-red-500">GHC {globalArrearsSum.toFixed(2)}</span>
                </div>
                <div className="bg-neutral-950 border border-neutral-850 px-4 py-2 text-right">
                  <span className="text-[8px] text-neutral-500 block uppercase font-black font-mono">Classrooms</span>
                  <span className="text-sm font-black text-white">{classArrearsMetrics.length} Levels</span>
                </div>
              </div>
            </div>

            {/* Menu Options Tabs (Requested 1-4) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-neutral-950 p-1.5 border border-neutral-850">
              <button
                type="button"
                onClick={() => setArrearsMenuOption("class-debt")}
                className={`px-4 py-3 font-mono text-[10px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer text-center ${
                  arrearsMenuOption === "class-debt"
                    ? "bg-amber-400 text-black font-black"
                    : "bg-neutral-900 border border-neutral-850 text-neutral-400 hover:text-white hover:bg-neutral-850/40"
                }`}
              >
                1. Debt Summary per Class
              </button>
              <button
                type="button"
                onClick={() => setArrearsMenuOption("global-debt")}
                className={`px-4 py-3 font-mono text-[10px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer text-center ${
                  arrearsMenuOption === "global-debt"
                    ? "bg-amber-400 text-black font-black"
                    : "bg-neutral-900 border border-neutral-850 text-neutral-400 hover:text-white hover:bg-neutral-850/40"
                }`}
              >
                2. Global Debt Summary
              </button>
              <button
                type="button"
                onClick={() => setArrearsMenuOption("teacher-perf")}
                className={`px-4 py-3 font-mono text-[10px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer text-center ${
                  arrearsMenuOption === "teacher-perf"
                    ? "bg-amber-400 text-black font-black"
                    : "bg-neutral-900 border border-neutral-850 text-neutral-400 hover:text-white hover:bg-neutral-850/40"
                }`}
              >
                3. Gate/Class Performance
              </button>
              <button
                type="button"
                onClick={() => setArrearsMenuOption("grade-teacher-perf")}
                className={`px-4 py-3 font-mono text-[10px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                  arrearsMenuOption === "grade-teacher-perf"
                    ? "bg-amber-400 text-black font-black"
                    : "bg-neutral-900 border border-neutral-850 text-neutral-400 hover:text-white hover:bg-neutral-850/40"
                }`}
              >
                4. Grade Rankings 🏅
              </button>
            </div>

            {/* Display Arrears Sub-Option Render Workspace */}
            <div className="bg-neutral-950 border-2 border-neutral-850 p-6">
              {arrearsMenuOption === "class-debt" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-neutral-850">
                    <h4 className="text-xs font-black uppercase text-white font-mono flex items-center gap-2">
                      <span>📊 Classroom Outstanding Debt Breakdown</span>
                    </h4>
                    <span className="text-[10px] font-mono font-black text-rose-450 uppercase bg-rose-950/20 border border-rose-900 px-2.5 py-1">
                      Total Debt Ledger
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-neutral-800 text-[10px] font-black font-mono text-neutral-500 uppercase tracking-widest">
                          <th className="py-2.5 px-3">Class Level</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3 text-right">Active Pupils</th>
                          <th className="py-2.5 px-3 text-right">Indebted Pupils</th>
                          <th className="py-2.5 px-3 text-right">Outstanding Arrears</th>
                          <th className="py-2.5 px-4 text-center">Roster Ratio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-850 font-mono text-xs">
                        {classArrearsMetrics.map((c) => {
                          const hasDebt = c.totalArrears > 0;
                          return (
                            <tr
                              key={c.className}
                              className="hover:bg-neutral-900/60 transition-colors"
                            >
                              <td className="py-3 px-3 font-black text-white">{c.className} Checkpoint</td>
                              <td className="py-3 px-3">
                                <span className="text-[10px] font-black px-2 py-0.5 uppercase tracking-wider bg-neutral-900 border border-neutral-800 text-neutral-400">
                                  {c.category}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right text-neutral-300">{c.studentCount}</td>
                              <td className="py-3 px-3 text-right">
                                <span className={c.indebtedStudents > 0 ? "text-red-400 font-bold" : "text-neutral-500"}>
                                  {c.indebtedStudents} pupils
                                </span>
                              </td>
                              <td className={`py-3 px-3 text-right font-black ${hasDebt ? "text-red-400" : "text-emerald-400"}`}>
                                GHC {c.totalArrears.toFixed(2)}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center justify-center gap-2">
                                  <span className="text-[10px] text-neutral-400">{c.studentCount > 0 ? Math.round((c.indebtedStudents / c.studentCount) * 100) : 0}%</span>
                                  <div className="w-16 bg-neutral-905 h-1.5 border border-neutral-800 overflow-hidden">
                                    <div
                                      className="bg-red-500 h-full"
                                      style={{ width: `${c.studentCount > 0 ? (c.indebtedStudents / c.studentCount) * 100 : 0}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {arrearsMenuOption === "global-debt" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-2 border-b border-neutral-850">
                    <h4 className="text-xs font-black uppercase text-white font-mono">
                      🌍 Global Debt Summary (School Consolidated Ledger)
                    </h4>
                    <span className="text-[10px] font-mono text-neutral-400 bg-neutral-900 px-2.5 py-1 uppercase tracking-widest font-black">
                      All Registered Cohorts
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Big Metric Box */}
                    <div className="bg-neutral-900 border-2 border-red-900/60 p-6 flex flex-col justify-between space-y-4 text-left">
                      <div>
                        <span className="text-[9px] text-red-400 uppercase font-black tracking-widest block font-mono">
                          Cumulative Outstanding Arrears
                        </span>
                        <h3 className="text-4xl font-mono font-black text-rose-500 mt-2">
                          GHC {globalArrearsSum.toFixed(2)}
                        </h3>
                        <p className="text-[10px] text-neutral-400 uppercase mt-2 leading-normal font-black font-mono">
                          Total outstanding feed debt calculated from day-based gate records and term commitments.
                        </p>
                      </div>

                      <div className="pt-3 border-t border-neutral-800 space-y-2">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-neutral-500 uppercase font-bold">Total Enrolled Pupils:</span>
                          <span className="text-white font-extrabold">{students.filter(s => s.active).length} Pupils</span>
                        </div>
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-neutral-500 uppercase font-bold">With Outstanding Debt:</span>
                          <span className="text-red-405 font-black">
                            {students.filter(s => {
                              const state = calculateStudentFinancialState(s, payments || [], activeTerm, currentDate, 5.0);
                              return state && state.totalDebt > 0;
                            }).length} Pupils
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Category Summary Charts */}
                    <div className="bg-neutral-900 border-2 border-neutral-850 p-6 space-y-4 md:col-span-2 text-left">
                      <h5 className="text-xs font-black uppercase text-white font-mono tracking-widest">
                        Outstanding Debt Distribution by School Level
                      </h5>

                      <div className="space-y-4">
                        {['Pre-school', 'Primary', 'JHS'].map((cat) => {
                          const catList = classArrearsMetrics.filter((m) => m.category === cat);
                          const catTotalArrears = catList.reduce((sum, item) => sum + item.totalArrears, 0);
                          const percentage = globalArrearsSum > 0 ? (catTotalArrears / globalArrearsSum) * 100 : 0;
                          
                          return (
                            <div key={cat} className="space-y-1 bg-neutral-950 p-3 border border-neutral-850 rounded-sm">
                              <div className="flex justify-between font-mono text-xs font-bold">
                                <span className="text-white uppercase font-black">{cat} Segment</span>
                                <span className="text-rose-450 font-black">
                                  GHC {catTotalArrears.toFixed(2)} ({percentage.toFixed(0)}%)
                                </span>
                              </div>
                              <div className="w-full bg-neutral-900 h-2.5 border border-neutral-800 rounded-sm overflow-hidden">
                                <div
                                  className="bg-red-500 h-full rounded-sm"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <div className="text-[9px] text-neutral-550 font-mono uppercase tracking-widest font-black pt-1">
                                SEGMENT CONTAINS {catList.length} CLASSES CHECKPOINT COUNTERS.
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Financial Recovery Goals and Projections */}
                  <div className="bg-neutral-900 border border-neutral-850 p-5 space-y-3 text-left">
                    <h5 className="text-xs font-black uppercase text-amber-500 font-mono tracking-widest">
                      School Board Collection & Recovery Projection Targets
                    </h5>
                    <p className="text-[10px] text-neutral-400 leading-normal font-mono uppercase font-black">
                      Management recovery models simulating cash flow injection if parents fulfill a percentage of their outstanding debt milestones:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
                      {[25, 50, 75, 100].map((perc) => {
                        const targetAmt = globalArrearsSum * (perc / 100);
                        return (
                          <div key={perc} className="bg-neutral-950 p-3 border border-neutral-850 flex flex-col justify-between min-h-[90px]">
                            <span className="text-[9px] font-mono uppercase font-black text-neutral-500">{perc}% RECOVERY</span>
                            <span className="text-md font-mono font-black text-emerald-400 mt-1">GHC {targetAmt.toFixed(2)}</span>
                            <span className="text-[8px] font-mono text-neutral-500 mt-1 uppercase">Immediate Cash Infusion</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {arrearsMenuOption === "teacher-perf" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-neutral-850">
                    <h4 className="text-xs font-black uppercase text-white font-mono">
                      🚪 Gatekeeper / Class Teacher Check-In Performance Rates
                    </h4>
                    <span className="text-[10px] font-mono text-emerald-400 bg-neutral-900 border border-neutral-800 px-2.5 py-1 uppercase tracking-widest font-black">
                      Verified Gates
                    </span>
                  </div>

                  <p className="text-[10.5px] text-neutral-450 leading-relaxed font-mono">
                    Below are the active class checkpoints monitored by assigned gatekeepers. Their response rate is determined by the percentage of active pupils checked and cleared on the selected evaluation date ({dateFilter}).
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {teacherMetrics.map((met) => {
                      const rateColor =
                        met.rate > 85
                          ? "border-emerald-950 text-emerald-400 bg-emerald-950/20"
                          : met.rate > 50
                            ? "border-amber-950 text-amber-400 bg-amber-950/20"
                            : "border-red-950 text-red-500 bg-red-950/20";
                      
                      return (
                        <div key={met.className} className="bg-neutral-900 border border-neutral-850 p-5 space-y-3 hover:border-neutral-750 transition-colors">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest block font-black">
                                Class {met.className} Gate
                              </span>
                              <h5 className="text-[14px] font-mono font-black text-white mt-1">
                                {met.teacherName}
                              </h5>
                            </div>
                            <span className={`text-[10px] font-mono font-black border px-2 py-1 ${rateColor}`}>
                              {met.rate.toFixed(0)}% Done
                            </span>
                          </div>

                          <div className="pt-2 border-t border-dashed border-neutral-800 space-y-1.5 text-xs font-mono font-bold">
                            <div className="flex justify-between text-neutral-400">
                              <span>Paid / Total Pupils:</span>
                              <span className="text-white">{met.paidCount} of {met.studentsCount}</span>
                            </div>
                            <div className="flex justify-between text-neutral-400">
                              <span>Cleared Gate Funds:</span>
                              <span className="text-emerald-400 font-black">GHC {met.collected.toFixed(2)}</span>
                            </div>
                          </div>

                          <div className="w-full bg-neutral-950 h-1.5 overflow-hidden border border-neutral-850">
                            <div
                              className={`h-full ${met.rate > 85 ? "bg-emerald-500" : met.rate > 50 ? "bg-amber-400" : "bg-red-500"}`}
                              style={{ width: `${met.rate}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {arrearsMenuOption === "grade-teacher-perf" && (
                <div className="space-y-4 text-left">
                  <div className="flex justify-between items-center pb-2 border-b border-neutral-850">
                    <h4 className="text-xs font-black uppercase text-white font-mono flex items-center gap-1.5">
                      <span>🏅 Grade Teacher Performance Rankings (Colour Coded)</span>
                    </h4>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-950/40 border border-amber-900/60 px-2.5 py-1 uppercase tracking-widest font-black flex items-center gap-1 animate-pulse">
                      <span>Top Educators Leaderboard</span>
                    </span>
                  </div>

                  <p className="text-[10.5px] text-neutral-455 leading-relaxed font-mono">
                    Educator rankings sorted from highest to lowest compliance check-in rates. Highly performing teachers are color-coded in green with an achievement badge 🏅, indicating outstanding administrative compliance!
                  </p>

                  <div className="space-y-2.5">
                    {[...teacherMetrics]
                      .sort((a, b) => b.rate - a.rate)
                      .map((met, idx) => {
                        const rank = idx + 1;
                        let colorClasses = "border-red-950 bg-red-950/10 text-red-400";
                        let statusText = "Needs Support";
                        let progressBg = "bg-red-500";
                        let medal = "";

                        if (met.rate > 85) {
                          colorClasses = "border-emerald-950 bg-emerald-950/30 text-emerald-400";
                          statusText = "Excellent Compliance 🏅";
                          progressBg = "bg-emerald-500";
                          medal = "🏅";
                        } else if (met.rate > 50) {
                          colorClasses = "border-amber-950 bg-amber-950/15 text-amber-400";
                          statusText = "Good Standing";
                          progressBg = "bg-amber-500";
                        }

                        return (
                          <div
                            key={met.className}
                            className={`border-2 p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all hover:scale-[1.005] duration-200 ${colorClasses}`}
                          >
                            {/* Left part: Rank & Teacher details */}
                            <div className="flex items-center gap-4">
                              <div className="bg-neutral-900 border border-neutral-850 w-11 h-11 flex items-center justify-center font-mono font-black text-sm shrink-0 shadow-md text-white">
                                #{rank} {medal}
                              </div>
                              <div className="space-y-0.5 text-left font-mono">
                                <div className="flex items-center gap-2">
                                  <h5 className="text-[14px] font-black uppercase text-white tracking-wider">
                                    {met.teacherName}
                                  </h5>
                                  {met.rate > 85 && <span className="text-[9px] font-black uppercase bg-emerald-500 text-neutral-950 px-1.5 py-0.5 leading-none">ELITE PERFORMER</span>}
                                </div>
                                <p className="text-[9.5px] text-neutral-400 tracking-wider uppercase font-black leading-none">
                                  Classroom Level: Class {met.className} Checkpoint • {met.studentsCount} Students In Assigned Care
                                </p>
                              </div>
                            </div>

                            {/* Middle part: Progress indicator */}
                            <div className="flex-1 max-w-xs space-y-1 font-mono">
                              <div className="flex justify-between text-[9px] uppercase tracking-wider font-extrabold text-neutral-450 leading-none">
                                <span>Check-in Verification Rate</span>
                                <span className="font-black text-white">{met.rate.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-neutral-950 h-2 border border-neutral-800 overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-500 ${progressBg}`}
                                  style={{ width: `${met.rate}%` }}
                                />
                              </div>
                            </div>

                            {/* Right part: Metrics numbers */}
                            <div className="text-right flex items-center sm:flex-col justify-between sm:justify-center gap-2 font-mono shrink-0">
                              <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500 block leading-none">
                                {statusText}
                              </span>
                              <span className="text-sm font-black text-white leading-none pt-1">
                                GHC {met.collected.toFixed(2)} Verified
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Perspective Tab 7: Monthly Attendance Trends */}
        {activeLayout === "monthly-attendance" && (
          <motion.div
            key="monthly-attendance-layout"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="bg-neutral-900 border-4 border-neutral-800 p-8 space-y-6 text-left"
          >
            {/* Header Content */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b-2 border-neutral-850">
              <div>
                <span className="text-[9px] text-amber-500 font-mono tracking-widest font-black uppercase bg-amber-400/10 border border-amber-400/30 px-2.5 py-1 rounded-xs">
                  Pupils Cohort Analytics Desk
                </span>
                <h3 className="text-xl font-black uppercase italic text-white tracking-tight mt-2 flex items-center gap-2">
                  <TrendingUp className="text-amber-400" size={18} /> Monthly Attendance Trends Desk
                </h3>
                <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest mt-1 font-bold">
                  Observe and evaluate daily attendance trends and volume breakdowns over the current school month
                </p>
              </div>

              {/* Month Selection Control */}
              <div className="flex flex-wrap items-center gap-2 bg-neutral-950 p-1.5 border border-neutral-850">
                <span className="text-[9px] font-mono font-black uppercase text-neutral-400 px-2">
                  Select Month:
                </span>
                {availableMonths.length === 0 ? (
                  <span className="text-[9px] font-mono font-black text-neutral-600 uppercase">No months available</span>
                ) : (
                  <select
                    value={selectedChartMonth}
                    onChange={(e) => setSelectedChartMonth(e.target.value)}
                    className="bg-neutral-900 border border-neutral-850 text-white font-mono font-bold text-[10px] py-1 px-2 uppercase focus:outline-none focus:border-amber-400"
                  >
                    {availableMonths.map(m => {
                      const [yr, mo] = m.split("-");
                      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                      const label = `${monthNames[parseInt(mo, 10) - 1] || mo} ${yr}`;
                      return (
                        <option key={m} value={m}>{label}</option>
                      );
                    })}
                  </select>
                )}
              </div>
            </div>

            {/* KPI Block */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Metric 1: Avg Attendance Rate */}
              <div className="bg-neutral-950 border-2 border-neutral-850 p-4 relative flex flex-col justify-between">
                <div>
                  <span className="text-[8px] font-mono font-black text-neutral-500 uppercase tracking-widest block">
                    Avg Monthly Rate
                  </span>
                  <span className="text-2xl font-black font-mono text-emerald-400 block mt-1">
                    {monthlyAggregateStats.avgRate}%
                  </span>
                </div>
                <div className="text-[9px] font-mono text-neutral-400 uppercase mt-2">
                  Daily target compliance school-wide
                </div>
                <div className="absolute top-3 right-3 w-7 h-7 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center rounded-sm">
                  <TrendingUp size={14} />
                </div>
              </div>

              {/* Metric 2: Best Attendance Day */}
              <div className="bg-neutral-950 border-2 border-neutral-850 p-4 relative flex flex-col justify-between">
                <div>
                  <span className="text-[8px] font-mono font-black text-neutral-500 uppercase tracking-widest block">
                    Peak Attendance Day
                  </span>
                  <span className="text-base font-black font-mono text-amber-400 block mt-2">
                    {monthlyAggregateStats.bestDay}
                  </span>
                </div>
                <div className="text-[9px] font-mono text-neutral-400 uppercase mt-2">
                  Highest turnout: <strong className="text-white">{monthlyAggregateStats.bestRate}%</strong>
                </div>
                <div className="absolute top-3 right-3 w-7 h-7 bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center rounded-sm">
                  <Award size={14} />
                </div>
              </div>

              {/* Metric 3: Lowest Attendance Day */}
              <div className="bg-neutral-950 border-2 border-neutral-850 p-4 relative flex flex-col justify-between">
                <div>
                  <span className="text-[8px] font-mono font-black text-neutral-500 uppercase tracking-widest block">
                    Trough Attendance Day
                  </span>
                  <span className="text-base font-black font-mono text-rose-500 block mt-2">
                    {monthlyAggregateStats.worstDay}
                  </span>
                </div>
                <div className="text-[9px] font-mono text-rose-450 uppercase mt-2">
                  Lowest turnout: <strong className="text-white">{monthlyAggregateStats.worstRate}%</strong>
                </div>
                <div className="absolute top-3 right-3 w-7 h-7 bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center rounded-sm">
                  <TrendingDown size={14} />
                </div>
              </div>

              {/* Metric 4: Average Turnover */}
              <div className="bg-neutral-950 border-2 border-neutral-850 p-4 relative flex flex-col justify-between">
                <div>
                  <span className="text-[8px] font-mono font-black text-neutral-500 uppercase tracking-widest block">
                    Monthly Averages
                  </span>
                  <span className="text-lg font-black font-mono text-neutral-200 block mt-1.5 leading-tight">
                    {monthlyAggregateStats.avgPresent} Present / {monthlyAggregateStats.avgAbsent} Absent
                  </span>
                </div>
                <div className="text-[9px] font-mono text-neutral-400 uppercase mt-2">
                  Measured over <strong className="text-amber-400">{monthlyAggregateStats.totalSchoolDays}</strong> academic sessions
                </div>
                <div className="absolute top-3 right-3 w-7 h-7 bg-neutral-900 border border-neutral-800 text-neutral-400 flex items-center justify-center rounded-sm">
                  <Users size={14} />
                </div>
              </div>
            </div>

            {/* Charts Section */}
            {monthlyAttendanceData.length === 0 ? (
              <div className="bg-neutral-950 border-2 border-neutral-850 p-12 text-center text-xs font-mono font-black uppercase text-neutral-500">
                No active registered school sessions or attendances found for this month in the active term.
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                
                {/* Column Left (8 cols): The Main Line area Chart showing trend percentage */}
                <div className="xl:col-span-8 bg-neutral-950 border-2 border-neutral-850 p-6 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-neutral-850">
                    <div>
                      <h4 className="text-xs font-black uppercase text-neutral-300">Daily Attendance Rate Trend (%)</h4>
                      <p className="text-[8.5px] text-neutral-500 uppercase font-mono tracking-widest mt-0.5">
                        School-wide target compliance progression over calendar sessions
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] font-mono text-emerald-400 bg-emerald-500/5 px-2 py-0.5 border border-emerald-500/10 uppercase">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                      School-Wide Goal: &gt;= 85%
                    </div>
                  </div>

                  <div className="h-72 w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={monthlyAttendanceData}
                        margin={{ top: 10, right: 15, left: -20, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={isDaylight ? "#cbd5e1" : "#262626"}
                          vertical={false}
                        />
                        <XAxis
                          dataKey="dayLabel"
                          stroke={isDaylight ? "#475569" : "#737373"}
                          fontSize={9}
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight="bold"
                          tickLine={false}
                        />
                        <YAxis
                          stroke={isDaylight ? "#475569" : "#737373"}
                          fontSize={9}
                          fontFamily="JetBrains Mono, monospace"
                          fontWeight="bold"
                          domain={[0, 100]}
                          tickLine={false}
                          axisLine={false}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: "#0a0a0a",
                            border: "2px solid #fbbf24",
                            borderRadius: "0px",
                            fontFamily: "JetBrains Mono, monospace",
                            fontSize: "10px",
                            color: "#ffffff"
                          }}
                          labelFormatter={(label) => `Day: ${label}`}
                        />
                        <Legend 
                          wrapperStyle={{
                            fontFamily: "JetBrains Mono, monospace",
                            fontSize: "9px",
                            textTransform: "uppercase"
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="Attendance Rate (%)"
                          stroke="#10b981"
                          strokeWidth={3.5}
                          dot={{ r: 4, fill: "#10b981", strokeWidth: 0 }}
                          activeDot={{ r: 6, fill: "#ffffff", strokeWidth: 1, stroke: "#10b981" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Column Right (4 cols): Detailed Attendance volumes (stacked bars or categories) */}
                <div className="xl:col-span-4 flex flex-col gap-6">
                  {/* Part 1: Stacked Bar Volumes */}
                  <div className="bg-neutral-950 border-2 border-neutral-850 p-6 space-y-4 flex-1">
                    <div>
                      <h4 className="text-xs font-black uppercase text-neutral-300">Cohort Breakdown Volumes</h4>
                      <p className="text-[8.5px] text-neutral-500 uppercase font-mono tracking-widest mt-0.5">
                        Headcount comparison (Present vs Absent)
                      </p>
                    </div>

                    <div className="h-44 w-full pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={monthlyAttendanceData}
                          margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={isDaylight ? "#cbd5e1" : "#262626"}
                            vertical={false}
                          />
                          <XAxis
                            dataKey="dayLabel"
                            stroke={isDaylight ? "#475569" : "#737373"}
                            fontSize={8}
                            fontFamily="JetBrains Mono, monospace"
                            fontWeight="bold"
                            tickLine={false}
                          />
                          <YAxis
                            stroke={isDaylight ? "#475569" : "#737373"}
                            fontSize={8}
                            fontFamily="JetBrains Mono, monospace"
                            fontWeight="bold"
                            tickLine={false}
                            axisLine={false}
                          />
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: "#0a0a0a",
                              border: "2px solid #737373",
                              borderRadius: "0px",
                              fontFamily: "JetBrains Mono, monospace",
                              fontSize: "10px",
                              color: "#ffffff"
                            }}
                          />
                          <Legend 
                            wrapperStyle={{
                              fontFamily: "JetBrains Mono, monospace",
                              fontSize: "8.5px",
                              textTransform: "uppercase"
                            }}
                          />
                          <Bar dataKey="Present" stackId="a" fill="#10b981" maxBarSize={15} />
                          <Bar dataKey="Absent" stackId="a" fill="#ef4444" maxBarSize={15} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Part 2: Categories breakdown rates */}
                  <div className="bg-neutral-950 border-2 border-neutral-850 p-5 space-y-3 font-mono">
                    <h5 className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">
                      School Category Monthly Performance
                    </h5>
                    
                    <div className="space-y-3">
                      {(['Pre-school', 'Primary', 'JHS'] as SchoolCategory[]).map((cat) => {
                        const info = monthlyCategoryBreakdown[cat];
                        const totalNumerator = info.present;
                        const totalDenominator = info.totalAll;
                        const rate = totalDenominator > 0 ? Math.round((totalNumerator / totalDenominator) * 100) : 100;
                        
                        let barColor = "bg-emerald-500";
                        if (rate < 65) barColor = "bg-rose-500";
                        else if (rate < 85) barColor = "bg-amber-400";

                        return (
                          <div key={cat} className="space-y-1">
                            <div className="flex justify-between items-center text-[9.5px]">
                              <span className="font-extrabold text-white uppercase">{cat}</span>
                              <span className="font-bold text-neutral-400">
                                {rate}% ({totalNumerator}/{totalDenominator})
                              </span>
                            </div>
                            <div className="w-full bg-neutral-900 h-1.5 border border-neutral-800 overflow-hidden">
                              <div className={`h-full ${barColor}`} style={{ width: `${rate}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* Session Audit Matrix */}
            <div className="bg-neutral-950 border-2 border-neutral-850 p-6 space-y-3">
              <div>
                <h4 className="text-xs font-black uppercase text-neutral-300">Daily Session Checkout Logs</h4>
                <p className="text-[8.5px] text-neutral-500 uppercase font-mono tracking-widest mt-0.5">
                  Raw session records audited for checkout compliance
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[10px] font-mono text-left divide-y divide-neutral-850">
                  <thead className="bg-neutral-950 text-neutral-400 uppercase font-black tracking-wider text-[9px]">
                    <tr>
                      <th className="py-2.5 px-3">Session Date</th>
                      <th className="py-2.5 px-3">Total Enrolled</th>
                      <th className="py-2.5 px-3 text-emerald-400">Marked Present</th>
                      <th className="py-2.5 px-3 text-rose-500">Marked Absent</th>
                      <th className="py-2.5 px-3 text-neutral-500">Unmarked/Pending</th>
                      <th className="py-2.5 px-3 text-right">Attendance Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-850/45 text-neutral-300">
                    {[...monthlyAttendanceData].reverse().slice(0, 10).map((row) => {
                      const rate = row["Attendance Rate (%)"];
                      let rateColor = "text-emerald-400";
                      if (rate < 65) rateColor = "text-rose-500";
                      else if (rate < 85) rateColor = "text-amber-400";

                      return (
                        <tr key={row.date} className="hover:bg-neutral-900/30">
                          <td className="py-2 px-3 font-extrabold text-white">{row.date}</td>
                          <td className="py-2 px-3">{row["Total Active"]}</td>
                          <td className="py-2 px-3 text-emerald-500 font-extrabold">{row["Present"]}</td>
                          <td className="py-2 px-3 text-rose-500 font-extrabold">{row["Absent"]}</td>
                          <td className="py-2 px-3 text-neutral-500">{row["Unmarked"]}</td>
                          <td className={`py-2 px-3 text-right font-black ${rateColor}`}>{rate}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {monthlyAttendanceData.length > 10 && (
                  <p className="text-[8.5px] font-mono font-black uppercase text-neutral-600 text-center mt-3 tracking-widest">
                    Showing latest 10 academic sessions of the selected month
                  </p>
                )}
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating high-fidelity feedback toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-neutral-900 border-2 border-amber-400 text-amber-400 font-mono text-[10px] py-3.5 px-5 shadow-[4px_4px_0px_0px_rgba(251,191,36,0.2)] z-50 flex items-center gap-2.5 uppercase font-black tracking-widest animate-fade-in-up">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <span>{toast}</span>
        </div>
      )}
    </motion.div>

    {/* Print Friendly & PDF Export Modal */}
    <AnimatePresence>
      {showPrintFriendlyModal && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-neutral-950 flex flex-col md:flex-row font-sans text-white">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: portrait;
                margin: 15mm;
              }
              body * {
                visibility: hidden !important;
              }
              #print-friendly-area, #print-friendly-area * {
                visibility: visible !important;
              }
              #print-friendly-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100% !important;
                margin: 0 !important;
                padding: 12mm !important;
                background: white !important;
                color: black !important;
                font-family: ui-sans-serif, system-ui, -apple-system, sans-serif !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .no-print {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
              }
            }
          `}} />

          {/* CONTROL PANEL COLUMN (HIDDEN IN PRINTING) */}
          <div className="w-full md:w-96 bg-neutral-900 border-r-4 border-neutral-800 flex flex-col h-full overflow-y-auto no-print p-6 space-y-6 text-white shrink-0">
            <div className="border-b border-neutral-850 pb-4">
              <span className="text-[10px] text-blue-400 font-mono tracking-widest font-black uppercase block">Saako Holy Child Trust</span>
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mt-1">
                <Printer size={18} className="text-blue-400" /> Print / Export PDF
              </h3>
            </div>

            {/* Config Fields */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-mono uppercase font-black text-neutral-450 tracking-wider">Document Settings</h4>
              
              {/* Authorized Signatory field */}
              <div className="space-y-1">
                <label className="text-[9px] font-mono uppercase font-black text-neutral-500 block">Authorized Signatory Name</label>
                <input
                  type="text"
                  value={printSignatory}
                  onChange={(e) => setPrintSignatory(e.target.value)}
                  className="w-full bg-neutral-950 border-2 border-neutral-850 hover:border-neutral-700 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-400 font-bold"
                  placeholder="e.g. Yakubu Hakeem (Headmaster)"
                />
              </div>

              {/* Custom Footnotes / Verification Memos */}
              <div className="space-y-1">
                <label className="text-[9px] font-mono uppercase font-black text-neutral-500 block">Statement Annotation Memo</label>
                <textarea
                  rows={4}
                  value={printMemo}
                  onChange={(e) => setPrintMemo(e.target.value)}
                  className="w-full bg-neutral-950 border-2 border-neutral-850 hover:border-neutral-700 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-400 text-[11px] leading-relaxed resize-none"
                  placeholder="Add custom annotations or compliance guidelines..."
                />
              </div>

              {/* Watermark Selector */}
              <div className="space-y-1">
                <label className="text-[9px] font-mono uppercase font-black text-neutral-500 block">Watermark Seal Text</label>
                <select
                  value={printWatermark}
                  onChange={(e) => setPrintWatermark(e.target.value as any)}
                  className="w-full bg-neutral-950 border-2 border-neutral-850 hover:border-neutral-700 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-400 font-bold"
                >
                  <option value="NONE">NO WATERMARK</option>
                  <option value="DRAFT">DRAFT PREVIEW</option>
                  <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                  <option value="SAAKO AUDITED">SAAKO AUDITED</option>
                </select>
              </div>
            </div>

            {/* Scale / Zoom control for on-screen preview */}
            <div className="space-y-2">
              <label className="text-[9px] font-mono uppercase font-black text-neutral-500 block flex justify-between">
                <span>Workspace Zoom Level</span>
                <span>{printPreviewZoom}%</span>
              </label>
              <div className="flex items-center gap-2 bg-neutral-950 p-2 border border-neutral-850">
                <button
                  type="button"
                  onClick={() => setPrintPreviewZoom(prev => Math.max(50, prev - 10))}
                  className="p-1 cursor-pointer hover:bg-neutral-905 text-neutral-450 hover:text-white"
                >
                  <ZoomOut size={14} />
                </button>
                <input
                  type="range"
                  min="50"
                  max="150"
                  step="10"
                  value={printPreviewZoom}
                  onChange={(e) => setPrintPreviewZoom(Number(e.target.value))}
                  className="flex-1 accent-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setPrintPreviewZoom(prev => Math.min(150, prev + 10))}
                  className="p-1 cursor-pointer hover:bg-neutral-905 text-neutral-450 hover:text-white"
                >
                  <ZoomIn size={14} />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.focus();
                    window.print();
                  }
                }}
                className="w-full py-4 text-xs font-black uppercase text-neutral-950 bg-amber-400 hover:bg-amber-300 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg font-mono"
              >
                <Printer size={15} /> PRINT OR SAVE AS PDF 📄
              </button>

              <button
                type="button"
                onClick={() => setShowPrintFriendlyModal(false)}
                className="w-full py-3 text-xs font-black uppercase text-neutral-450 hover:text-white bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 transition-colors cursor-pointer font-mono"
              >
                DISMISS WORKSPACE
              </button>
            </div>
          </div>

          {/* LIVE PREVIEW COLUMN */}
          <div className="flex-1 bg-neutral-950 overflow-y-auto p-4 md:p-8 flex items-start justify-center">
            <div 
              style={{ transform: `scale(${printPreviewZoom / 100})`, transformOrigin: 'top center' }}
              className="w-full max-w-[210mm] transition-all duration-300 shadow-2xl relative"
            >
              {/* Print Sheet Workspace Wrapper */}
              <div 
                id="print-friendly-area"
                className="bg-white text-neutral-900 p-[15mm] space-y-8 text-left relative min-h-[297mm] flex flex-col justify-between"
                style={{ width: '210mm', minHeight: '297mm', boxSizing: 'border-box' }}
              >
                {/* Watermark Underlay */}
                {printWatermark !== 'NONE' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden">
                    <div className="text-[52px] font-black tracking-widest text-neutral-200/40 uppercase border-8 border-neutral-200/40 p-4 md:p-8 rounded-2xl transform rotate-[-25deg] opacity-40 font-mono">
                      {printWatermark}
                    </div>
                  </div>
                )}

                <div className="space-y-6 z-10 relative flex-1">
                  {/* Official Document Crest Head */}
                  <div className="border-b-4 border-neutral-900 pb-4 flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 bg-neutral-900" />
                        <h1 className="text-lg font-black tracking-tighter uppercase font-mono">SAAKO HOLY CHILD ACADEMY</h1>
                      </div>
                      <p className="text-[10px] font-mono uppercase tracking-widest font-black text-neutral-500">
                        Primary & Junior High School Education • Administrative Ledger Registry
                      </p>
                      <p className="text-[9px] font-mono text-neutral-450 uppercase tracking-widest">
                        P.O. Box K-540, Koforidua • Eastern Region, Ghana
                      </p>
                    </div>
                    <div className="text-right space-y-1 font-mono">
                      <span className="text-[9px] font-black uppercase bg-neutral-900 text-white px-2 py-0.5 tracking-wider block">
                        PERFORMANCE SNAPSHOT
                      </span>
                      <div className="text-[10px] text-neutral-700 font-bold mt-1">
                        Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                      <div className="text-[9px] text-neutral-450 font-black">
                        TIME: {new Date().toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  {/* Report General Meta Data Row */}
                  <div className="grid grid-cols-4 gap-4 bg-neutral-100 p-4 border border-neutral-300 font-mono text-[10px]">
                    <div>
                      <span className="text-neutral-500 uppercase font-black text-[8px] block">TARGET AUDIT DATE:</span>
                      <span className="font-extrabold text-neutral-900">{dateFilter}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 uppercase font-black text-[8px] block">ACTIVE ACADEMIC TERM:</span>
                      <span className="font-extrabold text-neutral-900">{activeTerm?.name || 'NOT CONFIGURED'}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 uppercase font-black text-[8px] block">GENERATED BY ROLE:</span>
                      <span className="font-extrabold text-neutral-900">Administrator Vault</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 uppercase font-black text-[8px] block">SYSTEM LEDGER PERSISTENCE:</span>
                      <span className="font-extrabold text-emerald-700">{storageMode === 'cloud' ? 'CLOUD FIRESTORE' : 'LOCAL CACHE'}</span>
                    </div>
                  </div>

                  {/* Snapshot General Financial Metrics Card Panel */}
                  <div className="space-y-3">
                    <h3 className="text-[11px] font-mono uppercase font-black text-neutral-800 tracking-wider flex items-center gap-1.5 border-b border-neutral-200 pb-1">
                      <FileText size={12} className="text-neutral-600" /> I. CORE FINANCIAL PERFORMANCE SNAPSHOT
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="border border-neutral-300 p-3 bg-neutral-50/50 flex flex-col justify-between">
                        <span className="text-[8px] font-mono font-black text-neutral-500 uppercase">Target Date Collections</span>
                        <span className="text-sm font-extrabold text-neutral-900 font-mono mt-1">GHC {stats.totalCollected.toFixed(2)}</span>
                        <span className="text-[8px] font-mono text-neutral-450 uppercase mt-0.5">Verified Collections On {dateFilter}</span>
                      </div>
                      <div className="border border-neutral-300 p-3 bg-neutral-50/50 flex flex-col justify-between">
                        <span className="text-[8px] font-mono font-black text-neutral-500 uppercase">Collection Efficiency Rate</span>
                        <span className="text-sm font-extrabold text-neutral-900 font-mono mt-1">
                          {dailyProgressPercent.toFixed(1)}%
                        </span>
                        <span className="text-[8px] font-mono text-neutral-450 mt-0.5">Progress of GHC {dailyGoal} Daily Goal</span>
                      </div>
                      <div className="border border-neutral-300 p-3 bg-neutral-50/50 flex flex-col justify-between">
                        <span className="text-[8px] font-mono font-black text-neutral-500 uppercase">Total Accumulated Arrears</span>
                        <span className="text-sm font-extrabold text-red-600 font-mono mt-1">GHC {globalArrearsSum.toFixed(2)}</span>
                        <span className="text-[8px] font-mono text-neutral-450 mt-0.5">Term Outstanding Uncollected Debt</span>
                      </div>
                    </div>
                  </div>

                  {/* Snapshot Gate & Check-In Stats */}
                  <div className="space-y-3">
                    <h3 className="text-[11px] font-mono uppercase font-black text-neutral-800 tracking-wider flex items-center gap-1.5 border-b border-neutral-200 pb-1">
                      <Users size={12} className="text-neutral-600" /> II. GATE ATTENDANCE & PUPIL AUDIT SUMMARY
                    </h3>
                    <table className="w-full text-left border-collapse border border-neutral-300 font-mono text-[9px]">
                      <thead>
                        <tr className="bg-neutral-100 border-b border-neutral-300 text-neutral-600">
                          <th className="p-2 border-r border-neutral-300 font-black">TOTAL REGISTERED PUPILS</th>
                          <th className="p-2 border-r border-neutral-300 font-black">PUPILS PRESENT</th>
                          <th className="p-2 border-r border-neutral-300 font-black">PUPILS ABSENT</th>
                          <th className="p-2 font-black">PENDING GATE CHECK-INS</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="font-extrabold text-neutral-900 text-xs">
                          <td className="p-2 border-r border-neutral-300">{activeStudentsCount} active</td>
                          <td className="p-2 border-r border-neutral-300 text-emerald-700">{stats.paidCount} present</td>
                          <td className="p-2 border-r border-neutral-300 text-red-600">{stats.absentCount} marked</td>
                          <td className="p-2 text-amber-600">{stats.pendingCount} remaining</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Dynamic Layout Dependent Section */}
                  <div className="space-y-3">
                    <h3 className="text-[11px] font-mono uppercase font-black text-neutral-800 tracking-wider flex items-center gap-1.5 border-b border-neutral-200 pb-1">
                      <Activity size={12} className="text-neutral-600" /> III. ACTIVE INTERACTIVE PERSPECTIVE DETAILS ({activeLayout.replace('-', ' ').toUpperCase()})
                    </h3>

                    {/* Case A: Bento Grid or Classrooms Tracker */}
                    {(activeLayout === 'bento' || activeLayout === 'class-perf') && (
                      <div className="space-y-2">
                        <p className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest leading-none">
                          Classroom ledger collection rate, teacher rosters, and checkpoint efficiency metrics
                        </p>
                        <table className="w-full text-left border-collapse border border-neutral-300 font-mono text-[9px]">
                          <thead>
                            <tr className="bg-neutral-100 border-b border-neutral-300 text-neutral-600 font-black">
                              <th className="p-2 border-r border-neutral-300">CLASSROOM</th>
                              <th className="p-2 border-r border-neutral-300">CATEGORY</th>
                              <th className="p-2 border-r border-neutral-300 text-center">STUDENT COUNT</th>
                              <th className="p-2 border-r border-neutral-300 text-right">COLLECTED FEES</th>
                              <th className="p-2 border-r border-neutral-300 text-right">OUTSTANDING DEBT</th>
                              <th className="p-2 text-right font-black">PERFORMANCE RATE</th>
                            </tr>
                          </thead>
                          <tbody>
                            {classFeesSummary.map((item, idx) => (
                              <tr key={idx} className="border-b border-neutral-200 hover:bg-neutral-50">
                                <td className="p-1.5 border-r border-neutral-300 font-extrabold text-neutral-900">{item.className}</td>
                                <td className="p-1.5 border-r border-neutral-300 uppercase text-neutral-500 text-[8px]">{item.category}</td>
                                <td className="p-1.5 border-r border-neutral-300 text-center font-bold">{item.studentCount} active</td>
                                <td className="p-1.5 border-r border-neutral-300 text-right font-extrabold text-emerald-700">GHC {item.collected.toFixed(2)}</td>
                                <td className="p-1.5 border-r border-neutral-300 text-right font-bold text-red-600">GHC {item.missing.toFixed(2)}</td>
                                <td className="p-1.5 text-right font-black text-neutral-900">{item.rate.toFixed(1)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Case B: Weekly Collections */}
                    {activeLayout === 'weekly-aggregate' && (
                      <div className="space-y-2">
                        <p className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest leading-none">
                          Class-by-Class calendar week summary: {new Date(weeklyCollectionsData.mondayStr).toLocaleDateString()} to {new Date(weeklyCollectionsData.sundayStr).toLocaleDateString()}
                        </p>
                        <table className="w-full text-left border-collapse border border-neutral-300 font-mono text-[8px]">
                          <thead>
                            <tr className="bg-neutral-100 border-b border-neutral-300 text-neutral-600 font-black">
                              <th className="p-1.5 border-r border-neutral-300">CLASS</th>
                              {weeklyCollectionsData.weekdays.map((d, idx) => (
                                <th key={idx} className="p-1 border-r border-neutral-300 text-center uppercase font-black text-[7.5px]">
                                  {d.label.substring(0, 3)} ({d.dateStr.substring(8)})
                                </th>
                              ))}
                              <th className="p-1 text-right font-black">CLASS SUM</th>
                            </tr>
                          </thead>
                          <tbody>
                            {weeklyCollectionsData.rows.map((row, idx) => (
                              <tr key={idx} className="border-b border-neutral-200">
                                <td className="p-1 border-r border-neutral-300 font-bold text-neutral-900">{row.className}</td>
                                {weeklyCollectionsData.weekdays.map((d, dIdx) => (
                                  <td key={dIdx} className="p-1 border-r border-neutral-300 text-center font-bold">
                                    {row.dailyCollected[d.dateStr] > 0 ? `GHC ${row.dailyCollected[d.dateStr].toFixed(1)}` : '-'}
                                  </td>
                                ))}
                                <td className="p-1 text-right font-extrabold text-neutral-900">GHC {row.classTotal.toFixed(2)}</td>
                              </tr>
                            ))}
                            <tr className="bg-neutral-50 font-black border-t border-neutral-300 text-[8.5px]">
                              <td className="p-1.5 border-r border-neutral-300">DAILY TOTAL</td>
                              {weeklyCollectionsData.weekdays.map((d, idx) => (
                                <td key={idx} className="p-1.5 border-r border-neutral-300 text-center text-emerald-700">
                                  GHC {(weeklyCollectionsData.dayTotals[d.dateStr] || 0).toFixed(1)}
                                </td>
                              ))}
                              <td className="p-1.5 text-right text-emerald-800 text-xs">
                                GHC {weeklyCollectionsData.grandTotal.toFixed(2)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Case C: Alerts Deck */}
                    {activeLayout === 'alerts-desk' && (
                      <div className="space-y-2">
                        <p className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest leading-none">
                          Unassigned payments, missing classroom check-ins, or system validation errors
                        </p>
                        <div className="border border-neutral-300 p-4 space-y-2.5 font-mono text-[9px]">
                          {pendingAlerts.length === 0 ? (
                            <p className="italic text-neutral-500 text-center">No outstanding gate alerts recorded today.</p>
                          ) : (
                            pendingAlerts.slice(0, 15).map((alert, idx) => (
                              <div key={idx} className="flex justify-between items-center border-b border-neutral-200 pb-1.5">
                                <div className="space-y-0.5">
                                  <span className="font-extrabold text-neutral-900 uppercase">[{alert.type}] {alert.studentName}</span>
                                  <p className="text-neutral-500 text-[8.5px]">{alert.details}</p>
                                </div>
                                <span className="text-[8px] font-black uppercase text-amber-600 bg-amber-50 border border-amber-300 px-1.5 py-0.5">PENDING VERIFICATION</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Case D: Absentee Heatmap */}
                    {activeLayout === 'absence-heatmap' && (
                      <div className="space-y-2">
                        <p className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest leading-none">
                          Pupils flagged as absent for checkpoint {dateFilter} and registered contact metrics
                        </p>
                        <table className="w-full text-left border-collapse border border-neutral-300 font-mono text-[9px]">
                          <thead>
                            <tr className="bg-neutral-100 border-b border-neutral-300 text-neutral-600 font-black">
                              <th className="p-2 border-r border-neutral-300">STUDENT NAME</th>
                              <th className="p-2 border-r border-neutral-300">CLASS</th>
                              <th className="p-2 border-r border-neutral-300 font-bold">PARENT NAME</th>
                              <th className="p-2 border-r border-neutral-300 font-bold">PARENT CONTACT</th>
                              <th className="p-2 text-center font-bold">REASON / NOTES</th>
                            </tr>
                          </thead>
                          <tbody>
                            {payments.filter(p => p.date === dateFilter && p.isAbsent).length === 0 ? (
                              <tr>
                                <td colSpan={5} className="p-4 text-center italic text-neutral-450">No absence check-ins registered for this date.</td>
                              </tr>
                            ) : (
                              payments.filter(p => p.date === dateFilter && p.isAbsent).map((p, idx) => (
                                <tr key={idx} className="border-b border-neutral-200 hover:bg-neutral-50">
                                  <td className="p-1.5 border-r border-neutral-300 font-extrabold text-neutral-900">{p.studentName}</td>
                                  <td className="p-1.5 border-r border-neutral-300 font-bold text-neutral-600">{p.class}</td>
                                  <td className="p-1.5 border-r border-neutral-300 text-neutral-700">
                                    {(students || []).find(s => s.name === p.studentName)?.parentName || 'Unknown'}
                                  </td>
                                  <td className="p-1.5 border-r border-neutral-300 font-mono text-neutral-500 text-[8.5px]">
                                    {(students || []).find(s => s.name === p.studentName)?.parentPhone || 'No phone'}
                                  </td>
                                  <td className="p-1.5 text-center italic text-neutral-500 text-[8.5px]">
                                    {p.notes || 'Absent Gate Flag'}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Case E: Arrears Performance */}
                    {activeLayout === 'arrears-performance' && (
                      <div className="space-y-2">
                        <p className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest leading-none">
                          Classroom accumulative uncollected term debt and indebted ratio index
                        </p>
                        <table className="w-full text-left border-collapse border border-neutral-300 font-mono text-[9px]">
                          <thead>
                            <tr className="bg-neutral-100 border-b border-neutral-300 text-neutral-600 font-black">
                              <th className="p-2 border-r border-neutral-300">CLASSROOM NAME</th>
                              <th className="p-2 border-r border-neutral-300 text-center">TOTAL ENROLLMENT</th>
                              <th className="p-2 border-r border-neutral-300 text-center">INDEBTED PUPILS</th>
                              <th className="p-2 border-r border-neutral-300 text-right">ACCUMULATIVE ARREARS</th>
                              <th className="p-2 text-right font-black">RATIO STATUS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {classArrearsMetrics.map((item, idx) => (
                              <tr key={idx} className="border-b border-neutral-200 hover:bg-neutral-50">
                                <td className="p-1.5 border-r border-neutral-300 font-extrabold text-neutral-900">Class {item.className}</td>
                                <td className="p-1.5 border-r border-neutral-300 text-center font-bold">{item.studentCount} pupils</td>
                                <td className="p-1.5 border-r border-neutral-300 text-center text-red-600 font-extrabold">{item.indebtedStudents} indebted</td>
                                <td className="p-1.5 border-r border-neutral-300 text-right font-extrabold text-red-600">GHC {item.totalArrears.toFixed(2)}</td>
                                <td className="p-1.5 text-right text-[8px] font-black text-neutral-500 uppercase">
                                  {item.totalArrears > 500 ? '🔴 SEVERE OUTSTANDING' : item.totalArrears > 100 ? '🟡 PENDING DUE' : '🟢 STABLE'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Signatory Seal and Document Footnote Annotation */}
                <div className="border-t border-neutral-400 pt-6 mt-6 grid grid-cols-2 gap-8 font-mono text-[9px] z-10 relative">
                  <div className="space-y-1.5 text-neutral-550 leading-normal">
                    <span className="font-black text-neutral-700 uppercase text-[8px] block">REPORT COMPLIANCE GUIDELINES:</span>
                    <p className="italic text-[8.5px] leading-relaxed text-neutral-600">{printMemo}</p>
                  </div>
                  <div className="flex flex-col justify-between items-end text-right space-y-6">
                    <div className="space-y-0.5">
                      <span className="font-black text-neutral-700 uppercase text-[8px] block">OFFICIAL CERTIFICATION:</span>
                      <div className="text-neutral-900 font-extrabold">{printSignatory}</div>
                      <div className="text-neutral-400 uppercase text-[7.5px] tracking-wider">Authorized Officer Signature</div>
                    </div>
                    
                    {/* Signatory signature underline stamp container */}
                    <div className="w-48 border-b border-neutral-400/80 pt-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
});
