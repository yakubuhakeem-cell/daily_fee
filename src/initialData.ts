/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, UserAccount, PaymentRecord, SchoolCategory, StudentClass } from './types';

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
    passwordEnabled: true,
    password: 'admin2026'
  },
  {
    id: 'accountant-1',
    name: 'Mr. Solomon Darko',
    email: 'accountant@school.edu',
    role: 'Accountant',
    mfaEnabled: true,
    mfaSecret: 'KWEKUDARKO123456',
    passwordEnabled: true,
    password: 'accountant2026'
  }
];

export const INITIAL_STUDENTS: Student[] = [
  // Pre-school (Nursery, KG1, KG2)
  { id: 's1', name: 'Kojo Mensah', class: 'Nursery', category: 'Pre-school', rollNumber: 'NS-2026-001', active: true, guardianPhone: '0541234567' },
  { id: 's2', name: 'Ama Serwaa', class: 'Nursery', category: 'Pre-school', rollNumber: 'NS-2026-002', active: true, guardianPhone: '0204987654' },
  { id: 's3', name: 'Ekow Benson', class: 'Nursery', category: 'Pre-school', rollNumber: 'NS-2026-003', active: true, guardianPhone: '0245678901' },
  { id: 's4', name: 'Abena Poku', class: 'KG1', category: 'Pre-school', rollNumber: 'KG1-2026-001', active: true, guardianPhone: '0503456789' },
  { id: 's5', name: 'Kwame Antwi', class: 'KG1', category: 'Pre-school', rollNumber: 'KG1-2026-002', active: true, guardianPhone: '0547654321' },
  { id: 's6', name: 'Yaa Boateng', class: 'KG2', category: 'Pre-school', rollNumber: 'KG2-2026-001', active: true, guardianPhone: '0201112223' },
  { id: 's7', name: 'Yaw Osei', class: 'KG2', category: 'Pre-school', rollNumber: 'KG2-2026-002', active: true, guardianPhone: '0249998887' },

  // Primary (B1 - B6)
  { id: 's8', name: 'Kofi Gyamfi', class: 'B1', category: 'Primary', rollNumber: 'B1-2026-001', active: true, guardianPhone: '0551122334' },
  { id: 's9', name: 'Adjoa Appiah', class: 'B1', category: 'Primary', rollNumber: 'B1-2026-002', active: true, guardianPhone: '0240011223' },
  { id: 's10', name: 'Ebenezer Amankwah', class: 'B1', category: 'Primary', rollNumber: 'B1-2026-003', active: true, guardianPhone: '0240123456' },
  { id: 's11', name: 'Akua Addo', class: 'B2', category: 'Primary', rollNumber: 'B2-2026-001', active: true, guardianPhone: '0505556667' },
  { id: 's12', name: 'Kwasi Asante', class: 'B2', category: 'Primary', rollNumber: 'B2-2026-002', active: true, guardianPhone: '0278889990' },
  { id: 's13', name: 'Esi Darko', class: 'B3', category: 'Primary', rollNumber: 'B3-2026-001', active: true, guardianPhone: '0246665554' },
  { id: 's14', name: 'Kweku Baah', class: 'B3', category: 'Primary', rollNumber: 'B3-2026-002', active: true, guardianPhone: '0548881112' },
  { id: 's15', name: 'Kofi Boakye', class: 'B4', category: 'Primary', rollNumber: 'B4-2026-001', active: true, guardianPhone: '0207773331' },
  { id: 's16', name: 'Afia Owusu', class: 'B4', category: 'Primary', rollNumber: 'B4-2026-002', active: true, guardianPhone: '0242223334' },
  { id: 's17', name: 'Kojo Taylor', class: 'B5', category: 'Primary', rollNumber: 'B5-2026-001', active: true, guardianPhone: '0509990001' },
  { id: 's18', name: 'Abena Manu', class: 'B5', category: 'Primary', rollNumber: 'B5-2026-002', active: true, guardianPhone: '0248883332' },
  { id: 's19', name: 'Kwabena Arthur', class: 'B6', category: 'Primary', rollNumber: 'B6-2026-001', active: true, guardianPhone: '0543332121' },
  { id: 's20', name: 'Amma Frimpong', class: 'B6', category: 'Primary', rollNumber: 'B6-2026-002', active: true, guardianPhone: '0206543210' },

  // JHS (B7 - B9)
  { id: 's21', name: 'Kwame Boadu', class: 'B7', category: 'JHS', rollNumber: 'JHS-2026-001', active: true, guardianPhone: '0245000111' },
  { id: 's22', name: 'Yaa Agyemang', class: 'B7', category: 'JHS', rollNumber: 'JHS-2026-002', active: true, guardianPhone: '0556000222' },
  { id: 's23', name: 'Yaw Asare', class: 'B8', category: 'JHS', rollNumber: 'JHS-2026-001', active: true, guardianPhone: '0279000333' },
  { id: 's24', name: 'Abena Frempong', class: 'B8', category: 'JHS', rollNumber: 'JHS-2026-002', active: true, guardianPhone: '0201201201' },
  { id: 's25', name: 'Kofi Mensah Jr.', class: 'B9', category: 'JHS', rollNumber: 'JHS-2026-001', active: true, guardianPhone: '0243403403' },
  { id: 's26', name: 'Afi Ansah', class: 'B9', category: 'JHS', rollNumber: 'JHS-2026-002', active: true, guardianPhone: '0507807807' },
  { id: 's27', name: 'Ekow Mensah', class: 'B9', category: 'JHS', rollNumber: 'JHS-2026-003', active: true, guardianPhone: '0245456789' },
];

// Let's seed some payments for the last school week: May 25, May 26, May 27, May 28, May 29.
// Today is May 30 (Sat).
export function generateSeedPayments(): PaymentRecord[] {
  const records: PaymentRecord[] = [];
  const days = [
    '2026-05-25', // Mon
    '2026-05-26', // Tue
    '2026-05-27', // Wed
    '2026-05-28', // Thu
    '2026-05-29', // Fri
  ];

  // Map of classes to teachers
  const getClassTeacher_seed = (cls: StudentClass) => {
    if (cls === 'Nursery') return 'Mrs. Abigail Mensah';
    if (cls === 'B1') return 'Mr. Emmanuel Gyamfi';
    return 'Madam Mary Appiah'; // Default simulated teacher
  };

  days.forEach((day, dayIndex) => {
    INITIAL_STUDENTS.forEach((student, studIndex) => {
      // Create interesting payment records. Let's make most pay, with a few defaults.
      // E.g. 85-90% payment rate.
      const seedHash = (dayIndex * 13 + studIndex * 7) % 100;
      const paid = seedHash < 88; // 88% paid

      if (paid) {
        records.push({
          id: `p-${day}-${student.id}`,
          studentId: student.id,
          studentName: student.name,
          class: student.class,
          category: student.category,
          amount: 5.0,
          date: day,
          timestamp: `${day}T07:45:${String((studIndex * 2 + 10) % 60).padStart(2, '0')}Z`,
          collectedBy: getClassTeacher_seed(student.class),
          verified: true
        });
      }
    });
  });

  return records;
}
