/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole =
  | 'Admin'
  | 'Training Manager'
  | 'Examination Manager'
  | 'Maintenance Manager'
  | 'Office Manager'
  | 'Office Staff'
  | 'Training Staff'
  | 'Examination Staff'
  | 'Maintenance Staff'
  | 'Instructor'
  | 'นักศึกษา';

export type UserStatus = 'Active' | 'Pending' | 'พ้นสภาพ' | 'พักการเรียน' | 'จบการศึกษา';

export interface User {
  id: string; // Student ID (รหัสนักศึกษา) or Staff ID (รหัสประจำตัว)
  photoUrl: string; // Data URL or placeholder
  firstName: string;
  lastName: string;
  role: UserRole;
  signature: string; // Base64 signature path or SVG representation
  email: string;
  password?: string;
  status: UserStatus;
  createdAt: string;
  batch?: string; // First 2 digits of ID (only relevant for students/instructors)
}

export interface RoomRequest {
  id: string;
  date: string;
  timeRange: string;
  room: string;
  requesterId: string;
  requesterName: string;
  requesterRole: string;
  department: string;
  phone: string;
  purpose: string;
  signature: string;
  maintenanceApproved: 'Pending' | 'Approved' | 'Rejected'; // Room ready certification
  maintenanceOfficerName?: string;
  maintenanceOfficerSignature?: string;
  maintenanceCertifiedDate?: string;
  maintenanceNote?: string;
  isRoomUsageRecordCreated?: boolean;
}

export interface RoomUsageRecord {
  id: string; // matches room request or custom
  date: string;
  room: string;
  requesterName: string;
  report: string; // สิ่งที่ต้องการให้พัฒนา
  maintenanceOfficerStatus: 'Acknowledged' | 'Pending'; // แสดงข้อมูลว่ารับทราบหรือยัง
  remarks: string;
}

export interface Equipment {
  no: string;
  toolName: string;
  partNumber: string;
  serialNumber: string;
  code: string; // barcode string
  qty: number;
  location: string;
  status: 'Ready' | 'Calibrating' | 'Damaged' | 'Borrowed';
  remark: string;
  calibrationDate?: string;
}

export interface BorrowRecord {
  id: string;
  equipmentCode: string;
  toolName: string;
  borrowerId: string;
  borrowerName: string;
  borrowerRole: string;
  qty: number;
  borrowDate: string;
  status: 'Borrowed' | 'PendingReturn' | 'Returned';
  returnDate?: string;
  borrowSignature?: string;
  toolLocation?: string;
  returnSignature?: string;
  checkSignature?: string;
  checkerName?: string;
}

export interface ClassSchedule {
  id: string;
  batch: string; // first 2 digits of student ID, e.g. "67"
  subjectCode: string;
  subjectName: string;
  dayOfWeek: 'จันทร์' | 'อังคาร' | 'พุธ' | 'พฤหัส' | 'ศุกร์' | 'เสาร์' | 'อาทิตย์';
  startDate: string;
  endDate: string;
  instructorName: string;
}

export interface ExamSchedule {
  id: string;
  batch: string;
  date: string;
  time: string;
  subjectName: string;
}

export interface ExamGrade {
  id: string;
  batch: string;
  subjectName: string;
  round: number; // ครั้งที่
  grades: { studentId: string; studentName: string; score: number }[];
}
