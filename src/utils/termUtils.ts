/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Term } from '../types';

export interface TermGapBreak {
  fromTermId: string;
  fromTermName: string;
  toTermId: string;
  toTermName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  label: string;
  calendarDaysCount: number;
  weekdaysCount: number;
}

/**
 * Calculates a list of school days (Monday to Friday only) starting from a generic start date YYYY-MM-DD
 * until the requested number of school days is reached.
 */
export function generateSchoolDays(startDateStr: string, daysCount: number): string[] {
  const schoolDays: string[] = [];
  if (!startDateStr || daysCount <= 0) return schoolDays;
  
  // Parse startDateStr avoiding timezone offsets
  const parts = startDateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const currentDate = new Date(year, month, day);
  
  // Limit sanity bound of 365 days to prevent infinite calculations if invalid args passed
  let safetyCounter = 0;
  const maxSafety = 365;
  
  while (schoolDays.length < daysCount && safetyCounter < maxSafety) {
    const dayOfWeek = currentDate.getDay(); // 0 is Sunday, 6 is Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Monday to Friday
      const yyyy = currentDate.getFullYear();
      const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
      const dd = String(currentDate.getDate()).padStart(2, '0');
      schoolDays.push(`${yyyy}-${mm}-${dd}`);
    }
    currentDate.setDate(currentDate.getDate() + 1);
    safetyCounter++;
  }
  
  return schoolDays;
}

/**
 * Calculates gaps between consecutive terms chronologically.
 * These gaps represent vacation / term breaks where pupils are NOT billed.
 */
export function getTermGapBreaks(terms: Term[]): TermGapBreak[] {
  if (!terms || terms.length < 2) return [];

  // Sort terms by startDate
  const sorted = [...terms].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const gaps: TermGapBreak[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const termA = sorted[i];
    const termB = sorted[i + 1];

    if (!termA.schoolDays || termA.schoolDays.length === 0 || !termB.startDate) continue;

    // Last school day of Term A
    const lastDayA = termA.schoolDays[termA.schoolDays.length - 1];
    
    // Parse last day A and add 1 day to get start of vacation
    const partsA = lastDayA.split('-');
    const dtA = new Date(parseInt(partsA[0], 10), parseInt(partsA[1], 10) - 1, parseInt(partsA[2], 10));
    dtA.setDate(dtA.getDate() + 1);

    const gapStartY = dtA.getFullYear();
    const gapStartM = String(dtA.getMonth() + 1).padStart(2, '0');
    const gapStartD = String(dtA.getDate()).padStart(2, '0');
    const gapStartDateStr = `${gapStartY}-${gapStartM}-${gapStartD}`;

    // Parse start of Term B and subtract 1 day to get end of vacation
    const partsB = termB.startDate.split('-');
    const dtB = new Date(parseInt(partsB[0], 10), parseInt(partsB[1], 10) - 1, parseInt(partsB[2], 10));
    dtB.setDate(dtB.getDate() - 1);

    const gapEndY = dtB.getFullYear();
    const gapEndM = String(dtB.getMonth() + 1).padStart(2, '0');
    const gapEndD = String(dtB.getDate()).padStart(2, '0');
    const gapEndDateStr = `${gapEndY}-${gapEndM}-${gapEndD}`;

    if (gapStartDateStr <= gapEndDateStr) {
      // Calculate total calendar days and weekdays
      let calendarDaysCount = 0;
      let weekdaysCount = 0;

      const cursor = new Date(dtA);
      while (cursor <= dtB) {
        calendarDaysCount++;
        const dayOfWeek = cursor.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          weekdaysCount++;
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      gaps.push({
        fromTermId: termA.id,
        fromTermName: termA.name,
        toTermId: termB.id,
        toTermName: termB.name,
        startDate: gapStartDateStr,
        endDate: gapEndDateStr,
        label: `${termA.name} → ${termB.name} Vacation Break`,
        calendarDaysCount,
        weekdaysCount
      });
    }
  }

  return gaps;
}

/**
 * Checks if a given date YYYY-MM-DD falls in any gap between terms (vacation break).
 */
export function isDateInTermGap(dateStr: string, terms: Term[]): boolean {
  if (!dateStr || !terms || terms.length === 0) return false;
  
  const gaps = getTermGapBreaks(terms);
  for (const gap of gaps) {
    if (dateStr >= gap.startDate && dateStr <= gap.endDate) {
      return true;
    }
  }

  // Also check if dateStr is after the last school day of the latest term, or before the first term
  const sorted = [...terms].sort((a, b) => a.startDate.localeCompare(b.startDate));
  if (sorted.length > 0) {
    const firstTermStart = sorted[0].startDate;
    if (dateStr < firstTermStart) {
      return true;
    }
    const lastTerm = sorted[sorted.length - 1];
    if (lastTerm.schoolDays && lastTerm.schoolDays.length > 0) {
      const lastTermEnd = lastTerm.schoolDays[lastTerm.schoolDays.length - 1];
      if (dateStr > lastTermEnd) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks if a date is a Holiday or Vacation Day (public holiday, term gap, or weekend).
 */
export function isHolidayOrVacationDate(dateStr: string, terms: Term[], activeTerm?: Term | null): {
  isHoliday: boolean;
  type?: 'public_holiday' | 'vacation_break' | 'weekend' | 'out_of_term';
  label?: string;
} {
  if (!dateStr) return { isHoliday: false };

  // Check weekend
  const parts = dateStr.split('-');
  const dt = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  const dayOfWeek = dt.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return { isHoliday: true, type: 'weekend', label: 'Weekend' };
  }

  // Check explicit public holidays
  const allHolidays = new Set<string>();
  if (activeTerm?.publicHolidays) {
    activeTerm.publicHolidays.forEach(h => allHolidays.add(h));
  }
  terms?.forEach(t => t.publicHolidays?.forEach(h => allHolidays.add(h)));

  if (allHolidays.has(dateStr)) {
    return { isHoliday: true, type: 'public_holiday', label: 'Public Holiday (GHC 0.00 Fee)' };
  }

  // Check term gaps
  if (terms && terms.length > 0) {
    const gaps = getTermGapBreaks(terms);
    for (const gap of gaps) {
      if (dateStr >= gap.startDate && dateStr <= gap.endDate) {
        return { isHoliday: true, type: 'vacation_break', label: `${gap.label} (GHC 0.00 Fee)` };
      }
    }

    // Check if outside of all terms' schoolDays
    const allTermDays = new Set(terms.flatMap(t => t.schoolDays || []));
    if (!allTermDays.has(dateStr)) {
      return { isHoliday: true, type: 'out_of_term', label: 'Vacation Break / Out of Term (GHC 0.00 Fee)' };
    }
  }

  return { isHoliday: false };
}

