/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserAccount, StudentClass, TeacherAllocation } from '../types';

export interface RBACAccessResult {
  allowed: boolean;
  roleType: 'admin' | 'headmaster' | 'class_teacher' | 'subject_teacher' | 'permission_granted' | 'restricted';
  reason: string;
  assignedClasses: StudentClass[];
  primaryClass?: StudentClass;
}

/**
 * Checks if user is an Administrator or Super Admin
 */
export function isAdministrator(user: UserAccount | null | undefined): boolean {
  if (!user) return false;
  const r = (user.role || '').toLowerCase();
  return r === 'administrator' || r === 'admin';
}

/**
 * Checks if user is a Headmaster / Principal
 */
export function isHeadmaster(user: UserAccount | null | undefined): boolean {
  if (!user) return false;
  const r = (user.role || '').toLowerCase();
  return r === 'headmaster' || r === 'headmistress' || r === 'principal';
}

/**
 * Checks if user has top-level management access (Admin or Headmaster)
 */
export function isHeadOrAdmin(user: UserAccount | null | undefined): boolean {
  return isAdministrator(user) || isHeadmaster(user);
}

/**
 * Checks if user is a Teacher
 */
export function isTeacher(user: UserAccount | null | undefined): boolean {
  if (!user) return false;
  const r = (user.role || '').toLowerCase();
  return r === 'teacher';
}

/**
 * Checks if user is an Accountant or Cashier
 */
export function isAccountantOrCashier(user: UserAccount | null | undefined): boolean {
  if (!user) return false;
  const r = (user.role || '').toLowerCase();
  return r === 'accountant' || r === 'cashier';
}

/**
 * Returns list of all classes assigned to a teacher
 */
export function getTeacherAssignedClasses(
  user: UserAccount | null | undefined,
  allocations: TeacherAllocation[] = []
): StudentClass[] {
  if (!user) return [];
  const classesSet = new Set<StudentClass>();

  if (user.assignedClass) {
    classesSet.add(user.assignedClass);
  }
  if (Array.isArray(user.assignedClasses)) {
    user.assignedClasses.forEach(c => classesSet.add(c));
  }

  // Also include classes where the teacher is designated in teacher allocations
  allocations
    .filter(a => a.teacherId === user.id || (a.teacherName && a.teacherName.toLowerCase() === user.name.toLowerCase()))
    .forEach(a => classesSet.add(a.class));

  return Array.from(classesSet);
}

/**
 * Evaluates whether a user is authorized to enter or modify marks for a specific class and subject.
 * 
 * Rules:
 * 1. Headmaster & Administrator -> Unrestricted edit access for all classes and subjects.
 * 2. Staff with `canManageExams` permission -> Unrestricted edit access.
 * 3. Class Teacher for `targetClass` -> Can edit all subjects for their assigned class.
 * 4. Subject Teacher allocated to `targetSubjectId` in `targetClass` -> Can edit marks for that specific subject.
 * 5. Other classes/teachers -> Read-Only access (Restricted from modifying/saving marks).
 */
export function canUserEditClassMarks(
  user: UserAccount | null | undefined,
  targetClass: StudentClass,
  targetSubjectId?: string,
  allocations: TeacherAllocation[] = []
): RBACAccessResult {
  // If no user is logged in
  if (!user) {
    return {
      allowed: false,
      roleType: 'restricted',
      reason: 'No authenticated user session found.',
      assignedClasses: []
    };
  }

  const assignedClasses = getTeacherAssignedClasses(user, allocations);
  const primaryClass = user.assignedClass || assignedClasses[0];

  // 1. Administrators have full system access
  if (isAdministrator(user)) {
    return {
      allowed: true,
      roleType: 'admin',
      reason: 'Full Administrative Authority: Unrestricted marks entry across all classes.',
      assignedClasses,
      primaryClass
    };
  }

  // 2. Headmasters have academic superuser access
  if (isHeadmaster(user)) {
    return {
      allowed: true,
      roleType: 'headmaster',
      reason: 'Headmaster Authority: Unrestricted academic oversight & marks entry.',
      assignedClasses,
      primaryClass
    };
  }

  // 3. Staff with explicit Exam Management permission
  if (user.permissions?.canManageExams) {
    return {
      allowed: true,
      roleType: 'permission_granted',
      reason: 'Exam Officer Authority: Authorized via Staff Exam Management permission.',
      assignedClasses,
      primaryClass
    };
  }

  // 4. Check if user is the assigned Class Teacher for targetClass
  const isDirectClassTeacher = 
    user.assignedClass === targetClass ||
    (Array.isArray(user.assignedClasses) && user.assignedClasses.includes(targetClass)) ||
    allocations.some(a => 
      (a.teacherId === user.id || a.teacherName.toLowerCase() === user.name.toLowerCase()) && 
      a.class === targetClass && 
      a.isClassTeacher
    );

  if (isDirectClassTeacher) {
    return {
      allowed: true,
      roleType: 'class_teacher',
      reason: `Authorized: Designated Class Teacher for Class ${targetClass}.`,
      assignedClasses,
      primaryClass
    };
  }

  // 5. Check if user is the allocated Subject Teacher for this specific subject
  if (targetSubjectId) {
    const isSubjectAllocated = allocations.some(a => 
      (a.teacherId === user.id || a.teacherName.toLowerCase() === user.name.toLowerCase()) && 
      a.class === targetClass && 
      a.subjectId === targetSubjectId
    );

    if (isSubjectAllocated) {
      return {
        allowed: true,
        roleType: 'subject_teacher',
        reason: `Authorized: Assigned Subject Teacher for this subject in ${targetClass}.`,
        assignedClasses,
        primaryClass
      };
    }
  }

  // 6. Access Restricted (Read-only view)
  const teacherClassesText = assignedClasses.length > 0 ? assignedClasses.join(', ') : 'None assigned';
  return {
    allowed: false,
    roleType: 'restricted',
    reason: `Access Restricted: You are assigned to [${teacherClassesText}]. Editing marks for Class ${targetClass} is strictly restricted to its assigned Class Teacher, Subject Teacher, or School Administration.`,
    assignedClasses,
    primaryClass
  };
}

/**
 * Checks if a user is allowed to edit student terminal report remarks and attitudes
 */
export function canUserEditTerminalReport(
  user: UserAccount | null | undefined,
  pupilClass: StudentClass,
  allocations: TeacherAllocation[] = []
): { canEditTeacherRemarks: boolean; canEditHeadmasterRemarks: boolean; reason: string } {
  if (!user) {
    return { canEditTeacherRemarks: false, canEditHeadmasterRemarks: false, reason: 'Unauthenticated' };
  }

  if (isHeadOrAdmin(user) || user.permissions?.canManageExams) {
    return { canEditTeacherRemarks: true, canEditHeadmasterRemarks: true, reason: 'Full management authority' };
  }

  const assignedClasses = getTeacherAssignedClasses(user, allocations);
  const isClassTeacher = assignedClasses.includes(pupilClass);

  return {
    canEditTeacherRemarks: isClassTeacher,
    canEditHeadmasterRemarks: false,
    reason: isClassTeacher 
      ? `Authorized Class Teacher for ${pupilClass}` 
      : `Restricted: Assigned to ${assignedClasses.join(', ') || 'other classes'}`
  };
}
