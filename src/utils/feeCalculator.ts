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
  let categoryTermFee = systemSettings?.baselineTermFee ?? 350.00;
  if (student.category === 'Pre-school' && systemSettings?.baselineTermFeePreSchool) {
    categoryTermFee = systemSettings.baselineTermFeePreSchool;
  } else if (student.category === 'Primary' && systemSettings?.baselineTermFeePrimary) {
    categoryTermFee = systemSettings.baselineTermFeePrimary;
  } else if (student.category === 'JHS' && systemSettings?.baselineTermFeeJhs) {
    categoryTermFee = systemSettings.baselineTermFeeJhs;
  }

  const effectiveTermFee = student.termFee !== undefined && student.termFee > 0
    ? student.termFee
    : categoryTermFee;

  const legacyDebt = roundCurrency(student.legacyDebt || 0);

  // Filter payments belonging to this student
  const studentPayments = payments.filter(p => p.studentId === student.id);
  const totalPaid = studentPayments.reduce((sum, p) => {
    if (p.verified !== false && p.amount > 0) {
      return addCurrency(sum, p.amount);
    }
    return sum;
  }, 0);

  let expectedFee = 0;
  let chargeableDaysCount = 0;

  if (student.paymentType === 'Term') {
    expectedFee = roundCurrency(effectiveTermFee);
  } else {
    // Daily Payment Type
    if (activeTerm && activeTerm.schoolDays && activeTerm.schoolDays.length > 0) {
      const publicHolidays = new Set(activeTerm.publicHolidays || []);
      const enrollmentDate = student.enrollmentDate || '1970-01-01';

      // Valid school days on or after pupil enrollment date, excluding public holidays
      const validSchoolDays = activeTerm.schoolDays.filter(day => {
        if (day < enrollmentDate) return false;
        if (publicHolidays.has(day)) return false;
        return true;
      });

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
