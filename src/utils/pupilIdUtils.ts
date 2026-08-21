/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, StudentClass, SystemSettings } from '../types';

export type PupilIdFormatStyle = 
  | 'PREFIX_CLASS_NUM'      // e.g. SHC-B5-001 (Recommended / Standard)
  | 'PREFIX_YEAR_CLASS_NUM' // e.g. SHC/2026/B5/001
  | 'PREFIX_YEAR_NUM'       // e.g. SHC/2026/001
  | 'PREFIX_NUM'            // e.g. SHC-0001
  | 'CLASS_NUM'             // e.g. B5-001
  | 'CUSTOM_NUM';           // e.g. 001

export interface PupilIdFormatOption {
  id: PupilIdFormatStyle;
  label: string;
  example: string;
  description: string;
}

export const PUPIL_ID_FORMAT_OPTIONS: PupilIdFormatOption[] = [
  {
    id: 'PREFIX_CLASS_NUM',
    label: 'School Code + Class + Roll No',
    example: 'SHC-B5-001',
    description: 'Clean, class-scoped identifier with school prefix (Default & Recommended)'
  },
  {
    id: 'PREFIX_YEAR_CLASS_NUM',
    label: 'School Code / Year / Class / Roll No',
    example: 'SHC/2026/B5/001',
    description: 'Official academic admission standard with academic year'
  },
  {
    id: 'PREFIX_YEAR_NUM',
    label: 'School Code / Year / Sequential No',
    example: 'SHC/2026/001',
    description: 'Annual sequential admission numbering across all classes'
  },
  {
    id: 'PREFIX_NUM',
    label: 'School Code + Global Sequential No',
    example: 'SHC-0001',
    description: 'School-wide continuous pupil numbering'
  },
  {
    id: 'CLASS_NUM',
    label: 'Class Code + Roll No',
    example: 'B5-001',
    description: 'Short class-specific roll identifier without school prefix'
  },
  {
    id: 'CUSTOM_NUM',
    label: 'Simple 3-Digit Roll No',
    example: '001',
    description: 'Minimal numeric roll number padded with leading zeros'
  }
];

/**
 * Normalizes a student class name into a standardized short code
 */
export function normalizeClassCode(className?: StudentClass | string): string {
  if (!className) return 'GEN';
  const c = className.trim();
  if (c.toLowerCase().startsWith('nursery')) return 'NUR';
  if (c.toLowerCase() === 'kg1') return 'KG1';
  if (c.toLowerCase() === 'kg2') return 'KG2';
  return c.toUpperCase();
}

/**
 * Extracts the default school prefix from settings or school name
 */
export function getSchoolPrefix(settings?: SystemSettings): string {
  if (settings?.pupilIdPrefix && settings.pupilIdPrefix.trim().length > 0) {
    return settings.pupilIdPrefix.trim().toUpperCase();
  }
  
  const schoolName = settings?.schoolName?.trim();
  if (!schoolName) return 'SHC';
  
  // Extract initials from school name (e.g. SAAKO HOLY CHILD ACADEMY -> SHCA or SHC)
  const words = schoolName.split(/[\s-]+/).filter(w => w.length > 0);
  if (words.length >= 3) {
    const initials = words.slice(0, 4).map(w => w[0].toUpperCase()).join('');
    return initials.length >= 2 ? initials : 'SHC';
  } else if (words.length === 2) {
    return (words[0].substring(0, 2) + words[1].substring(0, 1)).toUpperCase();
  }
  return schoolName.substring(0, 4).toUpperCase();
}

/**
 * Formats a Pupil ID for display or printing.
 * Guarantees a clean, human-readable ID and avoids raw `student_174...` or broken `SHC-STUDE` strings.
 */
export function formatPupilId(
  student?: Partial<Student> | null,
  settings?: SystemSettings,
  options?: {
    forceFormat?: PupilIdFormatStyle;
    overrideNumber?: number;
  }
): string {
  if (!student) return 'N/A';

  const prefix = getSchoolPrefix(settings);
  const separator = settings?.pupilIdSeparator || '-';
  const slashSep = settings?.pupilIdSeparator === '.' ? '.' : (settings?.pupilIdSeparator || '/');
  const padding = settings?.pupilIdPadding || 3;
  const classCode = normalizeClassCode(student.class);
  const year = new Date().getFullYear();

  // If student already has a customized formatted rollNumber (e.g. SHC-B5-001 or SHC/2026/001 or SHC-1002)
  const existingRoll = student.rollNumber?.trim();
  if (existingRoll && !options?.forceFormat) {
    // If it's already a clean compound ID (contains letters and digits or dashes/slashes), use it directly
    if (existingRoll.length >= 3 && /[A-Za-z]/.test(existingRoll)) {
      // Fix broken legacy substrings like "SHC-STUDE" or "FT-PUPIL-STUDE"
      if (existingRoll.startsWith('SHC-STUD') || existingRoll.startsWith('FT-PUPIL-STUD') || existingRoll.startsWith('FT-STUD')) {
        // Fall back to clean generation below
      } else {
        return existingRoll;
      }
    } else if (/^\d+$/.test(existingRoll)) {
      // If it's just a raw number like "1" or "01", nicely pad and format it according to active style
      const num = parseInt(existingRoll, 10);
      const paddedNum = String(num).padStart(padding, '0');
      const format = settings?.pupilIdFormat || 'PREFIX_CLASS_NUM';
      
      switch (format) {
        case 'PREFIX_CLASS_NUM':
          return `${prefix}${separator}${classCode}${separator}${paddedNum}`;
        case 'PREFIX_YEAR_CLASS_NUM':
          return `${prefix}/${year}/${classCode}/${paddedNum}`;
        case 'PREFIX_YEAR_NUM':
          return `${prefix}/${year}/${paddedNum}`;
        case 'PREFIX_NUM':
          return `${prefix}${separator}${paddedNum}`;
        case 'CLASS_NUM':
          return `${classCode}${separator}${paddedNum}`;
        case 'CUSTOM_NUM':
          return paddedNum;
        default:
          return `${prefix}${separator}${classCode}${separator}${paddedNum}`;
      }
    }
  }

  // Generate clean ID from scratch based on format
  const format = options?.forceFormat || settings?.pupilIdFormat || 'PREFIX_CLASS_NUM';
  
  // Extract number from override, rollNumber, or deterministically from student ID
  let numVal = options?.overrideNumber || 1;
  if (!options?.overrideNumber) {
    if (existingRoll && /^\d+$/.test(existingRoll)) {
      numVal = parseInt(existingRoll, 10);
    } else if (student.id) {
      if (student.id.startsWith('s') && !student.id.startsWith('student_')) {
        const parsed = parseInt(student.id.substring(1), 10);
        if (!isNaN(parsed) && parsed > 0) numVal = parsed;
      } else {
        // Extract numeric digits from student ID or timestamp
        const digits = student.id.replace(/\D/g, '');
        if (digits.length >= 3) {
          numVal = (parseInt(digits.slice(-3), 10) % 900) + 1;
        }
      }
    }
  }

  const paddedNum = String(numVal).padStart(padding, '0');

  switch (format) {
    case 'PREFIX_CLASS_NUM':
      return `${prefix}${separator}${classCode}${separator}${paddedNum}`;
    case 'PREFIX_YEAR_CLASS_NUM':
      return `${prefix}/${year}/${classCode}/${paddedNum}`;
    case 'PREFIX_YEAR_NUM':
      return `${prefix}/${year}/${paddedNum}`;
    case 'PREFIX_NUM':
      return `${prefix}${separator}${paddedNum}`;
    case 'CLASS_NUM':
      return `${classCode}${separator}${paddedNum}`;
    case 'CUSTOM_NUM':
      return paddedNum;
    default:
      return `${prefix}${separator}${classCode}${separator}${paddedNum}`;
  }
}

/**
 * Computes the next available sequential Pupil ID when admitting a new student
 */
export function generateNextPupilId(
  existingStudents: Student[],
  className: StudentClass,
  settings?: SystemSettings,
  formatStyle?: PupilIdFormatStyle
): string {
  const format = formatStyle || settings?.pupilIdFormat || 'PREFIX_CLASS_NUM';
  const prefix = getSchoolPrefix(settings);
  const separator = settings?.pupilIdSeparator || '-';
  const padding = settings?.pupilIdPadding || 3;
  const classCode = normalizeClassCode(className);
  const year = new Date().getFullYear();

  let targetStudents = existingStudents;
  if (format === 'PREFIX_CLASS_NUM' || format === 'PREFIX_YEAR_CLASS_NUM' || format === 'CLASS_NUM' || format === 'CUSTOM_NUM') {
    // Class-scoped sequence
    targetStudents = existingStudents.filter(s => s.class === className);
  }

  // Find highest numeric index present in class or system
  let highestNum = targetStudents.length;
  targetStudents.forEach(s => {
    if (!s.rollNumber) return;
    const match = s.rollNumber.match(/(\d+)$/);
    if (match) {
      const val = parseInt(match[1], 10);
      if (!isNaN(val) && val > highestNum) {
        highestNum = val;
      }
    }
  });

  const nextNum = highestNum + 1;
  const paddedNum = String(nextNum).padStart(padding, '0');

  switch (format) {
    case 'PREFIX_CLASS_NUM':
      return `${prefix}${separator}${classCode}${separator}${paddedNum}`;
    case 'PREFIX_YEAR_CLASS_NUM':
      return `${prefix}/${year}/${classCode}/${paddedNum}`;
    case 'PREFIX_YEAR_NUM':
      return `${prefix}/${year}/${paddedNum}`;
    case 'PREFIX_NUM':
      return `${prefix}${separator}${paddedNum}`;
    case 'CLASS_NUM':
      return `${classCode}${separator}${paddedNum}`;
    case 'CUSTOM_NUM':
      return paddedNum;
    default:
      return `${prefix}${separator}${classCode}${separator}${paddedNum}`;
  }
}

/**
 * Standardizes and re-numbers all existing pupil IDs in bulk.
 * Preserves alphabetical or class order and resolves duplicates.
 */
export function standardizeAllPupilIds(
  students: Student[],
  settings?: SystemSettings,
  formatStyle?: PupilIdFormatStyle
): { updatedStudents: Student[]; changedCount: number } {
  const format = formatStyle || settings?.pupilIdFormat || 'PREFIX_CLASS_NUM';
  const prefix = getSchoolPrefix(settings);
  const separator = settings?.pupilIdSeparator || '-';
  const padding = settings?.pupilIdPadding || 3;
  const year = new Date().getFullYear();

  let changedCount = 0;
  
  // Group students by class
  const classOrder: StudentClass[] = [
    'Nursery', 'KG1', 'KG2',
    'B1', 'B2', 'B3', 'B4', 'B5', 'B6',
    'B7', 'B8', 'B9'
  ];

  let globalCounter = 1;
  const updatedStudents: Student[] = [];

  classOrder.forEach(cls => {
    const inClass = students.filter(s => s.class === cls);
    // Sort students by name alphabetically within the class
    const sorted = [...inClass].sort((a, b) => a.name.localeCompare(b.name));
    
    sorted.forEach((student, index) => {
      const classCode = normalizeClassCode(cls);
      const classCounter = index + 1;
      let newId = '';

      switch (format) {
        case 'PREFIX_CLASS_NUM':
          newId = `${prefix}${separator}${classCode}${separator}${String(classCounter).padStart(padding, '0')}`;
          break;
        case 'PREFIX_YEAR_CLASS_NUM':
          newId = `${prefix}/${year}/${classCode}/${String(classCounter).padStart(padding, '0')}`;
          break;
        case 'PREFIX_YEAR_NUM':
          newId = `${prefix}/${year}/${String(globalCounter).padStart(padding, '0')}`;
          break;
        case 'PREFIX_NUM':
          newId = `${prefix}${separator}${String(globalCounter).padStart(padding, '0')}`;
          break;
        case 'CLASS_NUM':
          newId = `${classCode}${separator}${String(classCounter).padStart(padding, '0')}`;
          break;
        case 'CUSTOM_NUM':
          newId = String(classCounter).padStart(padding, '0');
          break;
        default:
          newId = `${prefix}${separator}${classCode}${separator}${String(classCounter).padStart(padding, '0')}`;
      }

      globalCounter++;

      if (student.rollNumber !== newId) {
        changedCount++;
        updatedStudents.push({
          ...student,
          rollNumber: newId,
          updatedAt: new Date().toISOString()
        });
      } else {
        updatedStudents.push(student);
      }
    });
  });

  // Also include any students with unrecognized classes if any
  const processedIds = new Set(updatedStudents.map(s => s.id));
  students.forEach(s => {
    if (!processedIds.has(s.id)) {
      const nextId = formatPupilId(s, settings, { forceFormat: format, overrideNumber: globalCounter++ });
      if (s.rollNumber !== nextId) {
        changedCount++;
        updatedStudents.push({ ...s, rollNumber: nextId, updatedAt: new Date().toISOString() });
      } else {
        updatedStudents.push(s);
      }
    }
  });

  return { updatedStudents, changedCount };
}
