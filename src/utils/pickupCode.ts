/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student } from '../types';

/**
 * Gets the current school week range (Monday to Friday) and week identifier
 */
export function getSchoolWeekInfo(dateInput?: string | Date): {
  weekId: string; // e.g. "2026-W31"
  mondayStr: string; // e.g. "2026-07-27"
  fridayStr: string; // e.g. "2026-07-31"
  formattedRange: string; // e.g. "Mon Jul 27 - Fri Jul 31, 2026"
  isExpired: boolean; // True if today is Saturday or Sunday
} {
  const d = dateInput ? new Date(dateInput) : new Date();
  const target = new Date(d.valueOf());
  
  // Day of week: 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
  const day = target.getDay();
  
  // Calculate Monday of current week
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const monday = new Date(target);
  monday.setDate(target.getDate() + diffToMonday);
  
  // Calculate Friday of current week
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  // ISO Year & Week Number calculation
  const jan1 = new Date(monday.getFullYear(), 0, 1);
  const daysSinceJan1 = Math.floor((monday.getTime() - jan1.getTime()) / 86400000);
  const weekNum = Math.ceil((daysSinceJan1 + jan1.getDay() + 1) / 7);
  const weekId = `${monday.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;

  const formatShort = (dateObj: Date) => {
    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const toYMD = (dateObj: Date) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dayStr = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayStr}`;
  };

  const isWeekend = day === 0 || day === 6;

  return {
    weekId,
    mondayStr: toYMD(monday),
    fridayStr: toYMD(friday),
    formattedRange: `${formatShort(monday)} to ${formatShort(friday)}`,
    isExpired: isWeekend
  };
}

/**
 * Generate a deterministic 4-digit numeric pickup pass code for a pupil for the given week.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Returns a unique pickup pass code mapping for a student roster for the active school week.
 */
export function getStudentPickupCode(student: Student, refDate?: string | Date): {
  code: string;
  weekId: string;
  validFrom: string;
  validUntil: string;
  formattedRange: string;
  isExpired: boolean;
} {
  const weekInfo = getSchoolWeekInfo(refDate);
  
  // Deterministic seed using student ID, roll number, and week ID
  const seedStr = `${student.id}_${student.rollNumber || ''}_${weekInfo.weekId}`;
  const rawHash = hashString(seedStr);
  
  // Generate 4-digit code between 1000 and 9999
  const pinNum = 1000 + (rawHash % 9000);
  const code = `PK-${pinNum}`;

  return {
    code,
    weekId: weekInfo.weekId,
    validFrom: weekInfo.mondayStr,
    validUntil: weekInfo.fridayStr,
    formattedRange: weekInfo.formattedRange,
    isExpired: weekInfo.isExpired
  };
}

/**
 * Returns student list with pickup pass codes, guaranteed unique within the batch
 */
export interface StudentWithPickupCode extends Student {
  pickupCode: string;
  pickupCodeWeekId: string;
  pickupValidUntil: string;
  pickupFormattedRange: string;
  pickupIsExpired: boolean;
}

export function getRosterWithPickupCodes(students: Student[], refDate?: string | Date): StudentWithPickupCode[] {
  const weekInfo = getSchoolWeekInfo(refDate);
  const usedCodes = new Set<string>();

  return students.map((s, idx) => {
    const seedStr = `${s.id}_${s.rollNumber || ''}_${weekInfo.weekId}`;
    let hash = hashString(seedStr);
    let pinNum = 1000 + ((hash + idx * 31) % 9000);
    let code = `PK-${pinNum}`;

    // Collision check
    let attempts = 0;
    while (usedCodes.has(code) && attempts < 100) {
      pinNum = 1000 + ((hash + attempts * 97) % 9000);
      code = `PK-${pinNum}`;
      attempts++;
    }
    usedCodes.add(code);

    return {
      ...s,
      pickupCode: code,
      pickupCodeWeekId: weekInfo.weekId,
      pickupValidUntil: weekInfo.fridayStr,
      pickupFormattedRange: weekInfo.formattedRange,
      pickupIsExpired: weekInfo.isExpired
    };
  });
}
