/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, PaymentRecord, Term, SystemSettings } from '../types';
import { roundCurrency, addCurrency, subtractCurrency, multiplyCurrency } from './currency';

export interface StudentFeeSummary {
  expectedFee: number;
  totalPaid: number;
  legacyDebt: number;
  totalDue: number;
  currentArrears: number; // > 0 means pupil owes money
  advanceCredit: number;  // > 0 means pupil paid in advance
  netBalance: number;     // Positive = advance credit, Negative = owes
  chargeableDaysCount: number;
  dailyRate: number;
  effectiveTermFee: number;
}

export function isTermPayer(student: Partial<Student> | null | undefined): boolean {
  if (!student) return false;
  const pType = (student.paymentType as string | undefined)?.toLowerCase();
  if (pType === 'term') return true;
  if (pType === 'daily') return false;
  if (student.termFee !== undefined && student.termFee > 0) return true;
  return false;
}

/**
 * Robust fee calculator handling Term vs Daily payment schemes and edge cases:
 * 1. Excludes public holidays and days prior to enrollment date from daily expected fee.
 * 2. Excludes days where pupil was marked absent (isAbsent: true) from daily expected fee.
 * 3. Gracefully bridges switching between Daily and Term schemes by preserving total verified payments.
 * 4. Applies category-specific term fees (Pre-school, Primary, JHS) or custom student term fees.
 * 5. Uses strict 2-decimal-place currency arithmetic to prevent floating point drift.
 */
export function calculateStudentFeeStatus(
  student: Student,
  payments: PaymentRecord[],
  activeTerm: Term | null,
  systemSettings?: Partial<SystemSettings>
): StudentFeeSummary {
  const dailyBase = systemSettings?.baselineDailyFee ?? 5.00;
  const discount = student.discount || 0;
  const dailyRate = Math.max(0, subtractCurrency(dailyBase, discount));

  // Determine baseline term fee for category if student doesn't have explicit custom termFee
  let categoryTermFee = 350.00;
  if (student.category === 'Pre-school') {
    categoryTermFee = systemSettings?.baselineTermFeePreSchool ?? systemSettings?.baselineTermFee ?? 350.00;
  } else if (student.category === 'Primary') {
    categoryTermFee = systemSettings?.baselineTermFeePrimary ?? systemSettings?.baselineTermFee ?? 350.00;
  } else if (student.category === 'JHS') {
    categoryTermFee = systemSettings?.baselineTermFeeJhs ?? systemSettings?.baselineTermFee ?? 450.00;
  }

  const effectiveTermFee = student.termFee !== undefined && student.termFee > 0
    ? student.termFee
    : categoryTermFee;

  const legacyDebt = roundCurrency(student.legacyDebt || 0);

  // Filter payments belonging to this student
  const studentPayments = payments.filter(p => p.studentId === student.id);

  const termSchoolDays = activeTerm?.schoolDays || [];
  const publicHolidays = new Set(activeTerm?.publicHolidays || []);
  const termStartDate = activeTerm?.startDate || '1970-01-01';
  const lastTermDay = termSchoolDays.length > 0 ? termSchoolDays[termSchoolDays.length - 1] : '2099-12-31';

  // Extract verified payments for active term with strict deduplication per date
  let rawTotalPaid = 0;
  const verifiedDailyPaymentsMap = new Map<string, PaymentRecord>();
  const termInstallmentPayments: PaymentRecord[] = [];

  const termPayer = isTermPayer(student);

  studentPayments.forEach(p => {
    if (p.verified === false || p.amount <= 0 || p.isAbsent) {
      return;
    }

    // Exclude out-of-term / post-term payment entries
    if (activeTerm && termSchoolDays.length > 0) {
      if (p.date < termStartDate || p.date > lastTermDay) {
        return;
      }
      if (publicHolidays.has(p.date)) {
        return;
      }
    }

    if (termPayer) {
      termInstallmentPayments.push(p);
    } else {
      const existing = verifiedDailyPaymentsMap.get(p.date);
      if (!existing) {
        verifiedDailyPaymentsMap.set(p.date, p);
      } else {
        const pTime = new Date(p.timestamp || p.date || 0).getTime();
        const existTime = new Date(existing.timestamp || existing.date || 0).getTime();
        if (p.amount > existing.amount || (p.amount === existing.amount && pTime >= existTime)) {
          verifiedDailyPaymentsMap.set(p.date, p);
        }
      }
    }
  });

  if (termPayer) {
    termInstallmentPayments.forEach(p => {
      rawTotalPaid = addCurrency(rawTotalPaid, p.amount);
    });
  } else {
    verifiedDailyPaymentsMap.forEach(p => {
      rawTotalPaid = addCurrency(rawTotalPaid, p.amount);
    });
  }

  let expectedFee = 0;
  let chargeableDaysCount = 0;
  let validSchoolDaysCount = 0;

  if (termPayer) {
    expectedFee = roundCurrency(effectiveTermFee);
  } else {
    // Daily Payment Type
    if (activeTerm && termSchoolDays.length > 0) {
      const enrollmentDate = student.enrollmentDate || '1970-01-01';

      // Valid school days on or after pupil enrollment date, excluding public holidays
      const validSchoolDays = termSchoolDays.filter(day => {
        if (day < enrollmentDate) return false;
        if (publicHolidays.has(day)) return false;
        return true;
      });
      validSchoolDaysCount = validSchoolDays.length;

      // Filter dates where student was explicitly marked absent
      const absentDates = new Set(
        studentPayments
          .filter(p => p.isAbsent === true)
          .map(p => p.date)
      );

      // Chargeable days = valid school days where pupil was NOT marked absent
      chargeableDaysCount = validSchoolDays.filter(day => !absentDates.has(day)).length;
      expectedFee = multiplyCurrency(chargeableDaysCount, dailyRate);
    }
  }

  // Cap totalPaid for Daily Payers at maximum possible term fee (validSchoolDaysCount * dailyRate)
  let totalPaid = roundCurrency(rawTotalPaid);
  if (!termPayer && activeTerm && validSchoolDaysCount > 0) {
    const maxPossibleTermDailyFee = multiplyCurrency(validSchoolDaysCount, dailyRate);
    if (totalPaid > maxPossibleTermDailyFee) {
      totalPaid = maxPossibleTermDailyFee;
    }
  }

  const totalDue = addCurrency(expectedFee, legacyDebt);
  const netBalance = subtractCurrency(totalPaid, totalDue);

  const currentArrears = netBalance < 0 ? Math.abs(netBalance) : 0;
  const advanceCredit = netBalance > 0 ? netBalance : 0;

  return {
    expectedFee,
    totalPaid,
    legacyDebt,
    totalDue,
    currentArrears: roundCurrency(currentArrears),
    advanceCredit: roundCurrency(advanceCredit),
    netBalance: roundCurrency(netBalance),
    chargeableDaysCount,
    dailyRate,
    effectiveTermFee: roundCurrency(effectiveTermFee)
  };
}
