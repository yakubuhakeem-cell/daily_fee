/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, UserAccount, PaymentRecord, ExamsPayment, SchoolCategory, StudentClass } from './types';

// Helper to determine category
export function getClassCategory(className: StudentClass): SchoolCategory {
  if (['Nursery', 'KG1', 'KG2'].includes(className)) {
    return 'Pre-school';
  }
  if (['B1', 'B2', 'B3', 'B4', 'B5', 'B6'].includes(className)) {
    return 'Primary';
  }
  return 'JHS';
}

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'admin-hakeem',
    name: 'Hakeem Yakubu',
    email: 'yakubuhakeem@gmail.com',
    role: 'Administrator',
    mfaEnabled: true,
    mfaSecret: 'SHA-SAAKOKEY2003',
    passwordEnabled: true
  }
];

export const ORIGINAL_DEMO_STUDENT_IDS: string[] = [
  's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10',
  's11', 's12', 's13', 's14', 's15', 's16', 's17', 's18', 's19', 's20',
  's21', 's22', 's23', 's24', 's25', 's26', 's27'
];

export const INITIAL_STUDENTS: Student[] = [];

export function generateRandomPassword(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateSeedPayments(): PaymentRecord[] {
  return [];
}

export function generateSeedExamsPayments(): ExamsPayment[] {
  return [];
}

