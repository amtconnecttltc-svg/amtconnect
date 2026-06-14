/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, RoomRequest, ClassSchedule, ExamSchedule, ExamGrade, Equipment, BorrowRecord } from '../types';
import SignaturePad from './SignaturePad';
import { 
  Plus, Calendar, Search, Star, Award, BookOpen, Users, 
  Wrench, Camera, HelpCircle, Eye, Printer, ShieldCheck, RefreshCw,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import Swal from 'sweetalert2';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { getAppOriginForQR } from '../lib/api';
import { TraceabilityToolsLogDoc } from './Documents';

interface ExamOfficeStudentPanelProps {
  currentUser: User;
  users: User[];
  roomRequests: RoomRequest[];
  classSchedules: ClassSchedule[];
  examSchedules: ExamSchedule[];
  examGrades: ExamGrade[];
  equipments: Equipment[];
  borrowRecords: BorrowRecord[];
  
  onAddSchedule: (s: ClassSchedule) => void;
  onAddExam: (ex: ExamSchedule) => void;
  onAddGrade: (grade: ExamGrade) => void;
  onBorrowEquipment: (code: string, qty: number, signature: string) => void;
  onReturnEquipment: (borrowId: string) => void;
  onSubmitRoomRequest: (req: Omit<RoomRequest, 'id' | 'maintenanceApproved' | 'isRoomUsageRecordCreated'>) => void;
  onViewRequestDoc: (req: RoomRequest) => void;
  onUpdateProfile: (updated: Partial<User>) => void;
}

const DAYS_OF_WEEK_LIST = [
  { key: 'จันทร์', name: 'วันจันทร์', color: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
  { key: 'อังคาร', name: 'วันอังคาร', color: 'bg-pink-50 border-pink-200 text-pink-800' },
  { key: 'พุธ', name: 'วันพุธ', color: 'bg-green-50 border-green-200 text-emerald-800' },
  { key: 'พฤหัส', name: 'วันพฤหัสบดี', color: 'bg-orange-50 border-orange-200 text-orange-850' },
  { key: 'ศุกร์', name: 'วันศุกร์', color: 'bg-blue-50 border-blue-200 text-blue-800' },
  { key: 'เสาร์', name: 'วันเสาร์', color: 'bg-purple-50 border-purple-200 text-purple-800' },
  { key: 'อาทิตย์', name: 'วันอาทิตย์', color: 'bg-red-50 border-red-200 text-red-800' },
];

const matchesDayOfWeek = (dayOfWeekStr: string, dayKey: string) => {
  if (!dayOfWeekStr) return false;
  const clean = dayOfWeekStr.trim().toLowerCase();
  const keyUpper = dayKey.toLowerCase();
  return clean === keyUpper || 
         clean.includes(keyUpper) || 
         (keyUpper === 'จันทร์' && clean.includes('จัน')) ||
         (keyUpper === 'อังคาร' && clean.includes('อัง')) ||
         (keyUpper === 'พุธ' && clean.includes('พุธ')) ||
         (keyUpper === 'พฤหัส' && (clean.includes('พฤ') || clean.includes('พฤหัส'))) ||
         (keyUpper === 'ศุกร์' && clean.includes('ศุก')) ||
         (keyUpper === 'เสาร์' && clean.includes('เสา')) ||
         (keyUpper === 'อาทิตย์' && clean.includes('อา'));
};

const THAI_MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const mapDayIndexToKey = (index: number) => {
  const keys = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];
  return keys[index];
};

export default function ExamOfficeStudentPanel({
  currentUser,
  users,
  roomRequests,
  classSchedules,
  examSchedules,
  examGrades,
  equipments,
  borrowRecords,
  
  onAddSchedule,
  onAddExam,
  onAddGrade,
  onBorrowEquipment,
  onReturnEquipment,
  onSubmitRoomRequest,
  onViewRequestDoc,
  onUpdateProfile
}: ExamOfficeStudentPanelProps) {
  const isStudent = currentUser.role === 'นักศึกษา';
  const isInstructor = currentUser.role === 'Instructor';
  const isOffice = currentUser.role === 'Office Manager' || currentUser.role === 'Office Staff';
  const isExam = currentUser.role === 'Examination Manager' || currentUser.role === 'Examination Staff';

  const studentBatch = currentUser.batch || (currentUser.id && currentUser.id.length >= 2 && !isNaN(Number(currentUser.id.substring(0, 2))) ? currentUser.id.substring(0, 2) : '67');

  const getThaiDayOfWeek = (d: Date): string => {
    const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];
    return days[d.getDay()];
  };

  const handleShowScheduleDetails = (cs: ClassSchedule, date: Date) => {
    const dStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    Swal.fire({
      title: `<span class="text-[10px] font-sans font-extrabold uppercase text-neutral-400 block tracking-widest mb-1">รายละเอียดชั่วโมงวิชาเรียน</span> <span class="font-sans font-black text-sm text-neutral-950">${cs.subjectCode}</span>`,
      html: `
        <div class="text-left font-sans text-xs space-y-2 py-2 mt-2 border-t border-dashed border-neutral-200">
          <p class="font-bold text-neutral-950">ชื่อวิชาเรียน: <span class="font-medium text-neutral-700">${cs.subjectName}</span></p>
          <p class="font-bold text-neutral-950">วันสอนหลักประจำสัปดาห์: <span class="font-medium text-neutral-700">วัน${cs.dayOfWeek}</span></p>
          <p class="font-bold text-neutral-950 font-mono">กลุ่มเป้าหมายผู้สอน: <span class="font-medium text-neutral-700">รุ่นนักศึกษา ${cs.batch}</span></p>
          <p class="font-bold text-neutral-950">ช่วงกำหนดจัดเรียนสอน: <span class="font-medium text-neutral-700">${cs.startDate} ถึง ${cs.endDate}</span></p>
          <p class="font-bold text-neutral-950">อาจารย์ผู้รับผิดชอบชี้สอน: <span class="font-medium text-neutral-700">${cs.instructorName}</span></p>
          <p class="font-bold text-neutral-950">วันที่ตรวจสอบตาราง: <span class="font-medium text-neutral-700">${dStr}</span></p>
        </div>
      `,
      confirmButtonText: 'รับทราบตารางเรียน',
      confirmButtonColor: '#171717',
    });
  };

  const handleShowExamDetails = (ex: ExamSchedule) => {
    Swal.fire({
      title: `<span class="text-[10px] font-sans font-extrabold uppercase text-rose-500 block tracking-widest mb-1">กำหนดการทดสอบประเมิน</span> <span class="font-sans font-black text-sm text-rose-600">SCHEDULE EXAM</span>`,
      html: `
        <div class="text-left font-sans text-xs space-y-2 py-2 mt-2 border-t border-dashed border-neutral-200">
          <p class="font-bold text-neutral-950">รายวิชาทดสอบ: <span class="font-medium text-neutral-700">${ex.subjectName}</span></p>
          <p class="font-bold text-neutral-950">วันที่ทำการสอบสากล: <span class="font-medium text-neutral-700">${ex.date}</span></p>
          <p class="font-bold text-neutral-950">ช่วงเวลากำหนดสอบ: <span class="font-medium text-neutral-700">${ex.time}</span></p>
          <p class="font-bold text-neutral-950 font-mono">กลุ่มเป้าหมายผู้สอบ: <span class="font-medium text-neutral-700">รุ่นนักศึกษา ${ex.batch}</span></p>
        </div>
      `,
      confirmButtonText: 'เตรียมสิทธิ์ความพร้อมสอบ',
      confirmButtonColor: '#E11D48',
    });
  };

  // State Tabs
  const [activeTab, setActiveTab] = useState<'profile' | 'action' | 'schedule' | 'borrow' | 'roster'>('profile');

  // Instructor Action Tab Switcher (Schedule management vs Lab requests)
  const [instActionTab, setInstActionTab] = useState<'schedule' | 'room'>('schedule');

  // Monthly calendar states
  const [calendarViewMode, setCalendarViewMode] = useState<'weekly' | 'monthly'>('monthly');
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date(2026, 5, 12)); // June 12, 2026
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<Date | null>(new Date(2026, 5, 12));

  const handlePrevMonth = () => {
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1));
  };

  // Office schedule states
  const [schBatch, setSchBatch] = useState('67');
  const [schCode, setSchCode] = useState('');
  const [schName, setSchName] = useState('');
  const [schDays, setSchDays] = useState<('จันทร์' | 'อังคาร' | 'พุธ' | 'พฤหัส' | 'ศุกร์' | 'เสาร์' | 'อาทิตย์')[]>(['จันทร์']);
  const [schStart, setSchStart] = useState('');
  const [schEnd, setSchEnd] = useState('');
  const [schTeacher, setSchTeacher] = useState('');

  // Auto-populate instructor name for teaching schedules if they are the instructor
  React.useEffect(() => {
    if (isInstructor && !schTeacher && currentUser) {
      setSchTeacher(`${currentUser.firstName} ${currentUser.lastName}`);
    }
  }, [isInstructor, currentUser, schTeacher]);

  // Exam states
  const [exBatch, setExBatch] = useState('67');
  const [exDate, setExDate] = useState('');
  const [exTime, setExTime] = useState('09:00 - 11:30');
  const [exSubject, setExSubject] = useState('');

  // Grading states
  const [gradeBatch, setGradeBatch] = useState('67');
  const [gradeSubject, setGradeSubject] = useState('');
  const [gradeRound, setGradeRound] = useState(1);
  const [studentGrades, setStudentGrades] = useState<{ [id: string]: number }>({});

  // Synchronise exam subject with class schedules when batch changes
  React.useEffect(() => {
    const activeExSubjects = Array.from(
      new Set(
        classSchedules
          .filter((s) => s.batch === exBatch)
          .map((s) => `${s.subjectCode} ${s.subjectName}`)
      )
    );
    if (activeExSubjects.length > 0) {
      if (!activeExSubjects.includes(exSubject)) {
        setExSubject(activeExSubjects[0]);
      }
    } else {
      setExSubject('');
    }
  }, [exBatch, classSchedules, exSubject]);

  // Synchronise grading subject with class schedules when batch changes
  React.useEffect(() => {
    const activeGradeSubjects = Array.from(
      new Set(
        classSchedules
          .filter((s) => s.batch === gradeBatch)
          .map((s) => `${s.subjectCode} ${s.subjectName}`)
      )
    );
    if (activeGradeSubjects.length > 0) {
      if (!activeGradeSubjects.includes(gradeSubject)) {
        setGradeSubject(activeGradeSubjects[0]);
      }
    } else {
      setGradeSubject('');
    }
  }, [gradeBatch, classSchedules, gradeSubject]);

  // Room Request form states
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [purpose, setPurpose] = useState('');
  const [requestDate, setRequestDate] = useState('');
  const [timeRange, setTimeRange] = useState('09:00 - 12:00');
  const [selectedRoom, setSelectedRoom] = useState('Practical Area in Hangar');
  const [otherRoomText, setOtherRoomText] = useState('');
  const [requestSignature, setRequestSignature] = useState('');

  // Equipment borrowing states
  const [targetCode, setTargetCode] = useState('');
  const [borrowQty, setBorrowQty] = useState(1);
  const [borrowSignature, setBorrowSignature] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scannedTool, setScannedTool] = useState<Equipment | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showTraceabilityDoc, setShowTraceabilityDoc] = useState(false);

  React.useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    let isMounted = true;

    if (isCameraActive) {
      setCameraError(null);
      
      const startScanner = async () => {
        // Wait briefly for React to render the scanner container div
        await new Promise((resolve) => setTimeout(resolve, 300));
        if (!isMounted) return;

        try {
          const container = document.getElementById('student-equipment-reader');
          if (!container) {
            throw new Error('ระบบไม่พบตำแหน่งแผงแสดงผลกล้องตรวจจับ');
          }
          
          html5QrCode = new Html5Qrcode('student-equipment-reader');
          await html5QrCode.start(
            { facingMode: 'environment' },
            {
              fps: 15,
              qrbox: (w, h) => {
                const size = Math.min(w, h, 250);
                return { width: size, height: Math.max(size * 0.5, 90) }; // wider scan box for barcodes and QR codes
              }
            },
            (decodedText) => {
              // On scanned successfully:
              handleSimulateScan(decodedText);
            },
            () => {
              // Verbose error frames, safe to bypass
            }
          );
        } catch (err: any) {
          console.error('Error starting Html5Qrcode engine:', err);
          setCameraError(err.message || 'ไม่สามารถเข้าถึงอุปกรณ์กล้องได้ โปรดเปิดสิทธิ์อนุมัติการใช้งานกล้องในเบราว์เซอร์');
        }
      };

      startScanner();
    }

    return () => {
      isMounted = false;
      if (html5QrCode) {
        try {
          if (html5QrCode.isScanning) {
            html5QrCode.stop().catch((stopErr) => {
              console.error('Error stopping scanner during cleanup:', stopErr);
            });
          }
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, [isCameraActive]);

  // Search schedule (for examinations checking)
  const [searchStudentId, setSearchStudentId] = useState('');
  const [checkedStudent, setCheckedStudent] = useState<User | null>(null);

  // Filter batch roster
  const [rosterBatch, setRosterBatch] = useState('67');

  // Profile Edit states
  const [editFirstName, setEditFirstName] = useState(currentUser.firstName);
  const [editLastName, setEditLastName] = useState(currentUser.lastName);
  const [editEmail, setEditEmail] = useState(currentUser.email);
  const [editPassword, setEditPassword] = useState(currentUser.password || '');
  const [editPhoto, setEditPhoto] = useState(currentUser.photoUrl);
  const [editSig, setEditSig] = useState(currentUser.signature);

  const handleUpdateProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFirstName.trim() || !editLastName.trim() || !editEmail.trim()) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: 'กรุณากรอกข้อมูลให้ครบถ้วน', confirmButtonColor: '#171717' });
      return;
    }
    onUpdateProfile({
      firstName: editFirstName,
      lastName: editLastName,
      email: editEmail,
      password: editPassword,
      photoUrl: editPhoto,
      signature: editSig
    });
    Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'แก้ไขข้อมูลของฉันเรียบร้อยแล้ว', confirmButtonColor: '#171717' });
  };

  const handleRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!department || !phone || !purpose || !requestDate) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: 'กรุณากรอกข้อมูลให้ครบถ้วน', confirmButtonColor: '#171717' });
      return;
    }
    if (!requestSignature) {
      Swal.fire({ icon: 'error', title: 'ต้องการลายเซ็น', text: 'กรุณาเซ็นชื่อลายมือบนบอร์ด', confirmButtonColor: '#171717' });
      return;
    }
    const finalRoom = selectedRoom === 'Other' ? otherRoomText : selectedRoom;
    onSubmitRoomRequest({
      date: requestDate,
      timeRange,
      room: finalRoom,
      requesterId: currentUser.id,
      requesterName: `${currentUser.firstName} ${currentUser.lastName}`,
      requesterRole: currentUser.role,
      department,
      phone,
      purpose,
      signature: requestSignature,
    });
    setPurpose('');
    setDepartment('');
    setPhone('');
    setRequestSignature('');
    Swal.fire({ icon: 'success', title: 'จองเรียบร้อย', text: 'ส่งใบคำขอกุญแจห้องแล้วรอฝ่ายข่างอนุมัติ', confirmButtonColor: '#171717' });
  };

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schCode || !schName || !schStart || !schEnd || !schTeacher) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: 'กรุณากรอกข้อมูลหลักสูตรที่เปิดสอนครบถ้วน', confirmButtonColor: '#171717' });
      return;
    }

    if (schDays.length === 0) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: 'กรุณาเลือกวันที่มีเรียนอย่างน้อย 1 วัน', confirmButtonColor: '#171717' });
      return;
    }

    schDays.forEach((day, index) => {
      onAddSchedule({
        id: `SCH-${Date.now()}-${index}`,
        batch: schBatch,
        subjectCode: schCode,
        subjectName: schName,
        dayOfWeek: day,
        startDate: schStart,
        endDate: schEnd,
        instructorName: schTeacher,
      });
    });

    setSchCode('');
    setSchName('');
    setSchTeacher('');
    Swal.fire({ icon: 'success', title: 'เปิดวิชาสอนสำเร็จ', text: 'ตารางเรียนได้รับการบันทึกลงปฏิทินเรียบร้อย', confirmButtonColor: '#171717' });
  };

  const handleScheduleExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exDate || !exSubject) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: 'กรุณากรอกข้อมูลสอบให้ครบถ้วน', confirmButtonColor: '#171717' });
      return;
    }

    onAddExam({
      id: `EXM-${Date.now()}`,
      batch: exBatch,
      date: exDate,
      time: exTime,
      subjectName: exSubject,
    });

    const activeExSubjects = Array.from(
      new Set(
        classSchedules
          .filter((s) => s.batch === exBatch)
          .map((s) => `${s.subjectCode} ${s.subjectName}`)
      )
    );
    setExSubject(activeExSubjects.length > 0 ? activeExSubjects[0] : '');
    Swal.fire({ icon: 'success', title: 'นัดหมายสอบสำเร็จ', text: 'เพิ่มวิชาสอบเข้านัดหมายแล้ว', confirmButtonColor: '#171717' });
  };

  const handlePublishGrades = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradeSubject) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: 'กรุณากรอกวิชาเพื่อรายงานเกรด', confirmButtonColor: '#171717' });
      return;
    }

    const studentRoster = users.filter(u => u.role === 'นักศึกษา' && u.batch === gradeBatch);
    const parsedGrades = studentRoster.map(std => ({
      studentId: std.id,
      studentName: `${std.firstName} ${std.lastName}`,
      score: studentGrades[std.id] || 0,
    }));

    onAddGrade({
      id: `GR-${Date.now()}`,
      batch: gradeBatch,
      subjectName: gradeSubject,
      round: gradeRound,
      grades: parsedGrades,
    });

    const activeGradeSubjects = Array.from(
      new Set(
        classSchedules
          .filter((s) => s.batch === gradeBatch)
          .map((s) => `${s.subjectCode} ${s.subjectName}`)
      )
    );
    setGradeSubject(activeGradeSubjects.length > 0 ? activeGradeSubjects[0] : '');
    setStudentGrades({});
    Swal.fire({ icon: 'success', title: 'ประกาศผลสอบแล้ว', text: 'คะแนนถูกส่งเข้าสู่ตารางคะแนนนักศึกษา', confirmButtonColor: '#171717' });
  };

  // Simulate scanning of QR code
  const handleSimulateScan = (codeToScan: string) => {
    const match = equipments.find(eq => eq.code.toLowerCase() === codeToScan.toLowerCase().trim());
    if (match) {
      setScannedTool(match);
      setTargetCode(match.code);
      setIsCameraActive(false);
      Swal.fire({ icon: 'success', title: 'พบอุปกรณ์ช่าง', text: `อุปกรณ์: ${match.toolName} (คงเหลือ: ${match.qty} EA)`, confirmButtonColor: '#171717' });
    } else {
      Swal.fire({ icon: 'error', title: 'ไม่พบรหัสอุปกรณ์', text: 'คิวอาร์โค้ดนี้ไม่ได้ถูกจดจำในโรงซ่อมบำรุง', confirmButtonColor: '#171717' });
    }
  };

  const handleBorrowSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCode) {
      Swal.fire({ icon: 'error', title: 'ระบุรหัสคิวอาร์โค้ด', text: 'โปรดสแกนป้ายคิวอาร์โค้ดหรือป้อนรหัสอุปกรณ์ก่อน', confirmButtonColor: '#171717' });
      return;
    }
    const match = equipments.find(eq => eq.code === targetCode);
    if (!match) {
      Swal.fire({ icon: 'error', title: 'ไม่พบอุปกรณ์', text: 'ไม่พบเครื่องมือชิ้นนี้ในรายการ', confirmButtonColor: '#171717' });
      return;
    }
    if (match.qty < borrowQty) {
      Swal.fire({ icon: 'warning', title: 'ของไม่พอ', text: 'จำนวนอุปกรณ์ในคลังมีไม่เพียงพอต่อการยืมปฏิบัติการครั้งนี้', confirmButtonColor: '#171717' });
      return;
    }
    if (!borrowSignature) {
      Swal.fire({ icon: 'error', title: 'โปรดลงนามและเซ็นลายเซ็น', text: 'จำเป็นต้องวาดลายมือชื่ออิเล็กทรอนิกส์ด้านล่างก่อนยืมอุปกรณ์', confirmButtonColor: '#171717' });
      return;
    }

    onBorrowEquipment(targetCode, borrowQty, borrowSignature);
    setTargetCode('');
    setBorrowQty(1);
    setBorrowSignature('');
    setScannedTool(null);
    Swal.fire({ icon: 'success', title: 'เบิกจ่ายเครื่องมือสำเร็จ', text: 'อุปกรณ์ถูกโอนย้ายสถานะ และสิทธิ์ในการพายึดเรียบร้อย', confirmButtonColor: '#171717' });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 text-slate-850 font-sans text-xs">
      
      {/* Sidebar Navigation */}
      <div className="lg:col-span-1 bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col gap-1.5">
        <h4 className="font-sans font-extrabold text-[10px] uppercase text-slate-400 mb-2 tracking-widest border-b border-slate-100 pb-1.5 font-bold">
          ระบบสารสนเทศสำหรับการช่าง
        </h4>

        <button
          id="seoStudentProfileBtn"
          onClick={() => setActiveTab('profile')}
          className={`w-full py-2 px-3 text-left rounded-lg font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'profile' ? 'bg-[#0F172A] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
          }`}
        >
          <Star size={14} />
          <span>ข้อมูลห้องเรียนของฉัน</span>
        </button>

        <button
          id="seoActionBtn"
          onClick={() => setActiveTab('action')}
          className={`w-full py-2 px-3 text-left rounded-lg font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'action' ? 'bg-[#0F172A] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
          }`}
        >
          <Calendar size={14} />
          <span>
            {isOffice || isInstructor ? 'จัดการตารางเรียนและสอน' : isExam ? 'จัดประกาศสอบ & คะแนน' : 'ขอใช้พื้นที่ห้องปฏิบัติ'}
          </span>
        </button>

        {!isOffice && !isExam && (
          <button
            id="seoBorrowBtn"
            onClick={() => setActiveTab('borrow')}
            className={`w-full py-2 px-3 text-left rounded-lg font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'borrow' ? 'bg-[#0F172A] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
            }`}
          >
            <Wrench size={14} />
            <span>เบิกจ่าย/คืนเครื่องมือช่าง</span>
          </button>
        )}

        <button
          id="seoRosterBtn"
          onClick={() => setActiveTab('roster')}
          className={`w-full py-2 px-3 text-left rounded-lg font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'roster' ? 'bg-[#0F172A] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
          }`}
        >
          <Users size={14} />
          <span>ทำเนียบเพื่องร่วมรุ่น / บุคลากร</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="lg:col-span-3 bg-white border border-slate-200 p-6 rounded-xl shadow-sm min-h-[400px]">
        
        {/* TAB 1: USER INFO / STUDENT REVIEWS */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="font-sans font-extrabold text-sm border-b pb-2 flex items-center justify-between">
              <span>ประวัติข้อมูลส่วนตัวและผลการจองของฉัน ({currentUser.role})</span>
              <span className="font-mono text-[10px] text-neutral-500">ID: {currentUser.id}</span>
            </h3>

            {/* EDIT PROFILE SECTION */}
            <form onSubmit={handleUpdateProfileSubmit} className="space-y-4 bg-stone-50 border border-neutral-300 p-4 rounded">
              <h4 className="font-bold text-neutral-900 text-xs border-b pb-1">แก้ไขประวัติข้อมูลและรูปภาพลายเซ็น</h4>
              
              <div className="flex flex-col sm:flex-row items-center gap-6 p-2 rounded mb-1">
                <div className="w-16 h-20 rounded border border-neutral-400 overflow-hidden shrink-0">
                  <img src={editPhoto} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="space-y-1 w-full">
                  <span className="font-bold text-[10px] text-neutral-700">อัปเดตไฟล์รูปถ่ายประจำตัวผู้ใช้:</span>
                  <input
                    id="seoPhotoUploadInput"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const r = new FileReader();
                        r.onloadend = () => setEditPhoto(r.result as string);
                        r.readAsDataURL(f);
                      }
                    }}
                    className="block text-[10px] text-neutral-400 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-semibold file:bg-neutral-950 file:text-white hover:file:bg-neutral-850 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-neutral-800 mb-0.5">ชื่อจริง *</label>
                  <input type="text" required value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="w-full border border-neutral-300 px-2 py-1 rounded focus:outline-none text-xs bg-white" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-neutral-800 mb-0.5">นามสกุล *</label>
                  <input type="text" required value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="w-full border border-neutral-300 px-2 py-1 rounded focus:outline-none text-xs bg-white" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-neutral-800 mb-0.5">อีเมลผู้ใช้งาน *</label>
                  <input type="email" required value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full border border-neutral-300 px-2 py-1 rounded focus:outline-none text-xs bg-white font-mono" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-neutral-800 mb-0.5">เปลี่ยนรหัสผ่านเพื่อเข้าใช้งานรอบถัดไป *</label>
                  <input type="password" required value={editPassword} onChange={(e) => setEditPassword(e.target.value)} className="w-full border border-neutral-300 px-2 py-1 rounded focus:outline-none text-xs bg-white font-mono" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-neutral-800">ปรับแก้ลายเซ็นมือถือรับรองรายงาน *</label>
                <div className="w-full max-w-sm">
                  <SignaturePad onSave={(data) => setEditSig(data)} defaultValue={editSig} />
                </div>
              </div>

              <div className="pt-2 border-t flex justify-end">
                <button id="saveSeoProfileBtn" type="submit" className="px-4 py-1.5 bg-[#0F172A] hover:bg-neutral-800 text-white rounded font-bold cursor-pointer text-[10px] shadow-sm">
                  บันทึกการแก้ไขข้อมูลส่วนตัวของฉัน
                </button>
              </div>
            </form>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-4 bg-stone-100/50 border border-neutral-300 rounded">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <img src={currentUser.photoUrl} alt="avatar" className="w-16 h-20 object-cover rounded border border-neutral-400 shrink-0" referrerPolicy="no-referrer" />
                <div>
                  <h4 className="font-bold text-neutral-900 text-sm">{currentUser.firstName} {currentUser.lastName}</h4>
                  <p className="font-sans text-[11px] text-neutral-600">ตำแหน่งการช่าง: <b>{currentUser.role}</b></p>
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 font-mono text-[10px] px-2 py-0.5 rounded font-bold mt-2 inline-block">
                    บัญชีพร้อมใช้งาน (Approved)
                  </span>
                </div>
              </div>
              
              {/* Profile QR Verification block */}
              <div className="flex flex-col items-center bg-white p-3 rounded-lg border border-neutral-300 shadow-xs shrink-0 select-none">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(getAppOriginForQR() + '/?id=' + currentUser.id)}`} 
                  alt="Student ID QR Code" 
                  className="w-16 h-16 rounded border border-neutral-100 p-0.5"
                  referrerPolicy="no-referrer"
                />
                <span className="text-[7.5px] font-mono font-bold text-neutral-500 mt-1.5 uppercase tracking-wider">VERIFICATION QR</span>
                <span className="text-[9px] text-[#0F172A] font-bold mt-0.5">{currentUser.id}</span>
              </div>
            </div>

            {/* If Student, show class schedule and grades */}
            {isStudent && (
              <div className="space-y-4">
                <div className="border border-neutral-350 rounded-xl p-4 bg-white shadow-xs">
                  
                  {/* Calendar view selector */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-neutral-900 text-white rounded-lg">
                        <Calendar size={15} />
                      </div>
                      <div>
                        <h4 className="font-sans font-extrabold text-[12px] text-neutral-950 uppercase tracking-tight">
                          ตารางแผนจัดวิชาเรียนและสอบประจำรุ่น (รุ่น {studentBatch})
                        </h4>
                        <p className="text-[9px] text-neutral-400">ระบบประมวลตารางเรียนส่วนนักศึกษาอู่การช่าง</p>
                      </div>
                    </div>
                    
                    <div className="flex border border-neutral-300 rounded p-0.5 bg-neutral-50 shrink-0">
                      <button
                        type="button"
                        id="btnCalendarViewMonthly"
                        onClick={() => setCalendarViewMode('monthly')}
                        className={`px-3 py-1.5 rounded-sm text-[10px] font-bold cursor-pointer transition-all ${
                          calendarViewMode === 'monthly' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-neutral-500 hover:text-neutral-950'
                        }`}
                      >
                        รายเดือน (Monthly View)
                      </button>
                      <button
                        type="button"
                        id="btnCalendarViewWeekly"
                        onClick={() => setCalendarViewMode('weekly')}
                        className={`px-3 py-1.5 rounded-sm text-[10px] font-bold cursor-pointer transition-all ${
                          calendarViewMode === 'weekly' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
                        }`}
                      >
                        ตารางรายสัปดาห์ (Weekly Grid)
                      </button>
                    </div>
                  </div>

                  {calendarViewMode === 'monthly' ? (
                    <div className="space-y-4 animate-fade-in">
                      {/* Year-Month Navigator Controls */}
                      <div className="flex justify-between items-center bg-stone-50 p-2 border border-neutral-200 rounded-lg">
                        <button
                          type="button"
                          id="btnPrevMonth"
                          onClick={handlePrevMonth}
                          className="px-3 py-1.5 text-[10px] font-black bg-white border border-neutral-300 hover:bg-neutral-100 rounded-lg shadow-3xs cursor-pointer select-none"
                        >
                          &larr; เดือนก่อนหน้า
                        </button>
                        <span className="font-sans font-extrabold text-xs text-neutral-900 text-center">
                          {THAI_MONTH_NAMES[currentCalendarDate.getMonth()]} {currentCalendarDate.getFullYear() + 543} (June 2026 Sandbox)
                        </span>
                        <button
                          type="button"
                          id="btnNextMonth"
                          onClick={handleNextMonth}
                          className="px-3 py-1.5 text-[10px] font-black bg-white border border-neutral-300 hover:bg-neutral-100 rounded-lg shadow-3xs cursor-pointer select-none"
                        >
                          เดือนถัดไป &rarr;
                        </button>
                      </div>

                      {/* 7 Columns Day Names */}
                      <div className="grid grid-cols-7 gap-1.5 text-center font-sans font-bold text-[9px] text-neutral-500 uppercase tracking-widest py-1 border-b border-dashed border-neutral-200">
                        <span className="text-red-500 font-extrabold">อา. (Sun)</span>
                        <span>จ. (Mon)</span>
                        <span>อ. (Tue)</span>
                        <span>พ. (Wed)</span>
                        <span>พฤ. (Thu)</span>
                        <span>ศ. (Fri)</span>
                        <span className="text-purple-600 font-extrabold">ส. (Sat)</span>
                      </div>

                      {/* Day Grid Cell Rendering */}
                      <div className="grid grid-cols-7 gap-1.5">
                        {(() => {
                          const year = currentCalendarDate.getFullYear();
                          const month = currentCalendarDate.getMonth();
                          const firstDay = new Date(year, month, 1);
                          const startDay = firstDay.getDay();
                          const daysInMonth = new Date(year, month + 1, 0).getDate();

                          const cells: Date[] = [];
                          for (let i = startDay - 1; i >= 0; i--) {
                            cells.push(new Date(year, month, -i));
                          }
                          for (let i = 1; i <= daysInMonth; i++) {
                            cells.push(new Date(year, month, i));
                          }
                          const rem = (7 - (cells.length % 7)) % 7;
                          for (let i = 1; i <= rem; i++) {
                            cells.push(new Date(year, month + 1, i));
                          }
                          while (cells.length < 35) {
                            const lastD = cells[cells.length - 1];
                            cells.push(new Date(lastD.getFullYear(), lastD.getMonth(), lastD.getDate() + 1));
                          }

                          return cells.map((cellDate, index) => {
                            const isCurrentM = cellDate.getMonth() === month;
                            const isToday = cellDate.toDateString() === new Date().toDateString();
                            const currDateStr = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(cellDate.getDate()).padStart(2, '0')}`;
                            const cellDayThaiName = getThaiDayOfWeek(cellDate);

                            const rowClassesOnThisDay = classSchedules.filter(s => {
                              if (s.batch !== studentBatch) return false;
                              const isWithinRange = (!s.startDate || currDateStr >= s.startDate) && (!s.endDate || currDateStr <= s.endDate);
                              return matchesDayOfWeek(s.dayOfWeek, cellDayThaiName) && isWithinRange;
                            });

                            const rowExamsOnThisDay = examSchedules.filter(ex => {
                              return ex.batch === studentBatch && ex.date === currDateStr;
                            });

                            return (
                              <div
                                key={index}
                                className={`min-h-[80px] sm:min-h-[100px] p-1.5 border rounded-lg flex flex-col justify-between transition-all hover:bg-neutral-50 relative ${
                                  isCurrentM ? 'bg-white border-neutral-200' : 'bg-neutral-50/60 border-neutral-150 opacity-40'
                                } ${isToday ? 'ring-2 ring-neutral-950 border-neutral-950' : ''}`}
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className={`text-[10px] font-mono leading-none ${
                                    isToday ? 'bg-neutral-950 text-white w-5 h-5 rounded-full flex items-center justify-center font-extrabold' : 'text-neutral-700 font-bold'
                                  }`}>
                                    {cellDate.getDate()}
                                  </span>
                                  {isToday && (
                                    <span className="text-[7px] text-neutral-900 font-black uppercase tracking-tight">Today</span>
                                  )}
                                </div>

                                <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[60px] scrollbar-thin">
                                  {rowClassesOnThisDay.map(cs => (
                                    <button
                                      key={cs.id}
                                      type="button"
                                      onClick={() => handleShowScheduleDetails(cs, cellDate)}
                                      className="w-full text-left bg-neutral-900 border border-neutral-950 text-white rounded px-1.5 py-0.5 text-[8.5px] leading-tight font-sans truncate hover:opacity-85 shadow-3xs cursor-pointer block font-extrabold"
                                      title={`คลาส: ${cs.subjectCode} - ${cs.subjectName}`}
                                    >
                                      🕒 {cs.subjectCode}
                                    </button>
                                  ))}

                                  {rowExamsOnThisDay.map(ex => (
                                    <button
                                      key={ex.id}
                                      type="button"
                                      onClick={() => handleShowExamDetails(ex)}
                                      className="w-full text-left bg-red-600 border border-red-700 text-white rounded px-1.5 py-0.5 text-[8.5px] leading-tight font-sans truncate hover:opacity-85 shadow-3xs cursor-pointer block font-extrabold"
                                      title={`สอบ: ${ex.subjectName}`}
                                    >
                                      📝 สอบ: {ex.subjectName}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  ) : (
                    /* Calendar Grid Representation of classSchedules (Weekly Grid fallback) */
                    <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 animate-fade-in">
                      {DAYS_OF_WEEK_LIST.map((day) => {
                        const daySchedules = classSchedules.filter(
                          (s) => s.batch === studentBatch && matchesDayOfWeek(s.dayOfWeek, day.key)
                        );
                        return (
                          <div key={day.key} className="border border-neutral-200 rounded overflow-hidden flex flex-col h-32 bg-stone-50/50 hover:shadow-2xs transition-shadow">
                            {/* Day header bar */}
                            <div className={`px-2 py-1 text-center font-sans font-black text-[9px] uppercase tracking-tight text-white ${
                              day.key === 'จันทร์' ? 'bg-yellow-600' :
                              day.key === 'อังคาร' ? 'bg-pink-600' :
                              day.key === 'พุธ' ? 'bg-emerald-600' :
                              day.key === 'พฤหัส' ? 'bg-amber-600' :
                              day.key === 'ศุกร์' ? 'bg-sky-600' :
                              day.key === 'เสาร์' ? 'bg-purple-600' :
                              'bg-red-600'
                            }`}>
                              {day.name}
                            </div>

                            {/* Day classes container */}
                            <div className="p-1.5 flex-1 flex flex-col gap-1.5 overflow-y-auto">
                              {daySchedules.map((s) => (
                                <div key={s.id} className="p-1.5 rounded border border-neutral-300 bg-white shadow-3xs flex flex-col justify-between text-[9px] leading-tight">
                                  <div>
                                    <span className="font-mono text-[7.5px] font-bold text-neutral-400 block tracking-tight">
                                      {s.subjectCode}
                                    </span>
                                    <span className="font-bold text-neutral-900 block truncate" title={s.subjectName}>
                                      {s.subjectName}
                                    </span>
                                  </div>
                                  <div className="border-t border-dashed border-neutral-150 my-1" />
                                  <span className="text-[7.5px] text-neutral-600 italic block truncate">
                                    ครู: {s.instructorName || 'Unassigned'}
                                  </span>
                                </div>
                              ))}
                              {daySchedules.length === 0 && (
                                <div className="flex-1 flex items-center justify-center text-center">
                                  <span className="text-[8px] text-neutral-400 italic">No classes</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Exam schedule & Grades */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-neutral-300 rounded p-4">
                    <h4 className="font-bold text-xs mb-2 flex items-center gap-1 text-neutral-950">
                      <BookOpen size={14} />
                      <span>ปฏิทินสอบกลางภาค/ปลายภาค (รุ่น {studentBatch})</span>
                    </h4>
                    <div className="space-y-2">
                      {examSchedules
                        .filter(ex => ex.batch === studentBatch)
                        .map(ex => (
                          <div key={ex.id} className="p-2 border border-neutral-200 rounded bg-stone-50 text-[11px]">
                            <p className="font-bold">{ex.subjectName}</p>
                            <p className="text-[10px] text-neutral-500">วันสอบ: {ex.date} เวลา ({ex.time})</p>
                          </div>
                        ))}
                      {examSchedules.filter(ex => ex.batch === studentBatch).length === 0 && (
                        <p className="text-neutral-450 italic text-center py-4">ไม่มีตารางสอบประกาศขณะนี้</p>
                      )}
                    </div>
                  </div>

                  <div className="border border-neutral-350 rounded p-4">
                    <h4 className="font-bold text-xs mb-2 flex items-center gap-1 text-neutral-950">
                      <Award size={14} />
                      <span>สมุดประเมินประกาศคะแนนสอบ</span>
                    </h4>
                    <div className="space-y-2">
                      {examGrades
                        .filter(eg => eg.batch === studentBatch)
                        .map(eg => {
                          const scoreObj = eg.grades.find(g => g.studentId === currentUser.id);
                          return (
                            <div key={eg.id} className="p-2 border border-neutral-200 rounded flex items-center justify-between bg-stone-50 text-[11px]">
                              <div>
                                <p className="font-bold">{eg.subjectName}</p>
                                <p className="text-[10px] text-neutral-400">ประเมินครั้งที่ {eg.round}</p>
                              </div>
                              <span className="font-mono text-xs font-bold bg-neutral-950 text-white px-2 py-0.5 rounded">
                                {scoreObj ? `${scoreObj.score} คะแนน` : 'ไม่มีคะแนน'}
                              </span>
                            </div>
                          );
                        })}
                      {examGrades.filter(eg => eg.batch === studentBatch).length === 0 && (
                        <p className="text-neutral-450 italic text-center py-4">ยังไม่มีการประกาศคะแนนกลางกลุ่ม</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SPECIAL ACTION PER POSITION (Form add) */}
        {activeTab === 'action' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* If Instructor: show switcher between Schedule and Room booking */}
            {isInstructor && (
              <div className="flex bg-neutral-100 p-1 rounded-lg border border-neutral-200 mb-2 w-fit">
                <button
                  type="button"
                  id="btnInstActionSchedule"
                  onClick={() => setInstActionTab('schedule')}
                  className={`px-4 py-1.5 rounded-md font-sans font-bold text-[10px] transition-all cursor-pointer ${
                    instActionTab === 'schedule' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-650 hover:text-slate-900'
                  }`}
                >
                  เปิดคอร์สและลงตารางเรียนนักศึกษา (Add Schedules)
                </button>
                <button
                  type="button"
                  id="btnInstActionRoom"
                  onClick={() => setInstActionTab('room')}
                  className={`px-4 py-1.5 rounded-md font-sans font-bold text-[10px] transition-all cursor-pointer ${
                    instActionTab === 'room' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-650 hover:text-slate-900'
                  }`}
                >
                  เขียนใบร้องขอใช้พื้นที่ห้องปฏิบัติการ (Room Request)
                </button>
              </div>
            )}

            {/* If OFFICE or (INSTRUCTOR with 'schedule' subtab): ADD/EDIT SCHEDULES */}
            {(isOffice || (isInstructor && instActionTab === 'schedule')) && (
              <form onSubmit={handleCreateSchedule} className="space-y-4">
                <h3 className="font-sans font-extrabold text-sm border-b pb-2 text-neutral-950 uppercase">
                  เปิดคอร์สวิชาและลงตารางเรียนนักศึกษาการช่าง
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-700 mb-1">รุ่นนักศึกษา (เช่น 67) *</label>
                    <select
                      id="optSchBatchSelect"
                      value={schBatch}
                      onChange={(e) => setSchBatch(e.target.value)}
                      className="w-full border border-neutral-350 px-2 py-2 rounded bg-white font-mono"
                    >
                      <option value="65">รุ่น 65</option>
                      <option value="66">รุ่น 66</option>
                      <option value="67">รุ่น 67</option>
                      <option value="68">รุ่น 68</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-700 mb-1">รหัสวิชาหลักสูตร *</label>
                    <input
                      id="optSchCodeInput"
                      type="text"
                      required
                      placeholder="เช่น AMT-104"
                      value={schCode}
                      onChange={(e) => setSchCode(e.target.value)}
                      className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-700 mb-1">ชื่อวิชาเรียนเต็ม *</label>
                    <input
                      id="optSchNameInput"
                      type="text"
                      required
                      placeholder="เช่น Turbine Engine Maintenance"
                      value={schName}
                      onChange={(e) => setSchName(e.target.value)}
                      className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none"
                    />
                  </div>
                </div>

                <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                  <span className="block text-[10px] font-bold text-neutral-700 mb-2">เลือกวันที่มีเรียนประจำสัปดาห์ (เลือกได้มากกว่า 1 วัน) *</span>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK_LIST.map((day) => {
                      const isSelected = schDays.includes(day.key as any);
                      return (
                        <button
                          key={day.key}
                          type="button"
                          id={`btnSchDaySelect-${day.key}`}
                          onClick={() => {
                            if (isSelected) {
                              setSchDays(schDays.filter((d) => d !== day.key));
                            } else {
                              setSchDays([...schDays, day.key as any]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-neutral-900 border-neutral-900 text-white shadow-xs scale-105'
                              : 'bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-100'
                          }`}
                        >
                          <span className={`w-2.5 h-2.5 rounded-full inline-block ${
                            day.key === 'จันทร์' ? 'bg-yellow-400' :
                            day.key === 'อังคาร' ? 'bg-pink-400' :
                            day.key === 'พุธ' ? 'bg-emerald-400' :
                            day.key === 'พฤหัส' ? 'bg-amber-400' :
                            day.key === 'ศุกร์' ? 'bg-sky-400' :
                            day.key === 'เสาร์' ? 'bg-purple-400' :
                            'bg-red-400'
                          }`} />
                          <span>{day.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-700 mb-1">วันที่เริ่มเรียนคลาสแรก *</label>
                    <input
                      id="optSchStartInput"
                      type="date"
                      required
                      value={schStart}
                      onChange={(e) => setSchStart(e.target.value)}
                      className="w-full border border-neutral-300 px-3 py-1.5 rounded focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-700 mb-1">วันที่สิ้นเรียนคลาสสุดท้าย *</label>
                    <input
                      id="optSchEndInput"
                      type="date"
                      required
                      value={schEnd}
                      onChange={(e) => setSchEnd(e.target.value)}
                      className="w-full border border-neutral-300 px-3 py-1.5 rounded focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-700 mb-1">ชื่อสลักครูผู้ชี้สอน *</label>
                    <input
                      id="optSchTeacherInput"
                      type="text"
                      required
                      placeholder="เช่น Instructor Somsak"
                      value={schTeacher}
                      onChange={(e) => setSchTeacher(e.target.value)}
                      className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t">
                  <button
                    id="submitSchBtn"
                    type="submit"
                    className="bg-black hover:bg-neutral-850 text-white font-extrabold px-6 py-2 rounded shadow text-xs cursor-pointer"
                  >
                    เปิดตารางตริยวิชา
                  </button>
                </div>
              </form>
            )}

            {/* If EXAM DEPT: SCHEDULE EXAMS & GRADES */}
            {isExam && (
              <div className="space-y-6">
                
                {/* 1. Schedule Exam */}
                <form onSubmit={handleScheduleExam} className="bg-neutral-50 p-4 border border-neutral-300 rounded-lg space-y-4">
                  <h4 className="font-sans font-bold text-neutral-950 uppercase border-b pb-1 text-xs">นัดกำหนดการสอบนักศึกษาการช่าง</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-700 mb-1">รุ่นนักศึกษา *</label>
                      <select
                        id="examBatchSelect"
                        value={exBatch}
                        onChange={(e) => {
                          const newBatch = e.target.value;
                          setExBatch(newBatch);
                          const subjects = Array.from(
                            new Set(
                              classSchedules
                                .filter((s) => s.batch === newBatch)
                                .map((s) => `${s.subjectCode} ${s.subjectName}`)
                            )
                          );
                          setExSubject(subjects.length > 0 ? subjects[0] : '');
                        }}
                        className="w-full border border-neutral-300 px-1.5 py-1.5 rounded bg-white font-mono text-xs"
                      >
                        <option value="65">รุ่น 65</option>
                        <option value="66">รุ่น 66</option>
                        <option value="67">รุ่น 67</option>
                        <option value="68">รุ่น 68</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-neutral-700 mb-1">วิชาที่สอบ *</label>
                      {Array.from(
                        new Set(
                          classSchedules
                            .filter((s) => s.batch === exBatch)
                            .map((s) => `${s.subjectCode} ${s.subjectName}`)
                        )
                      ).length > 0 ? (
                        <select
                          id="examSubjectInput"
                          required
                          value={exSubject}
                          onChange={(e) => setExSubject(e.target.value)}
                          className="w-full border border-neutral-300 px-3 py-2.5 rounded focus:outline-none bg-white font-sans text-xs"
                        >
                          {Array.from(
                            new Set(
                              classSchedules
                                .filter((s) => s.batch === exBatch)
                                .map((s) => `${s.subjectCode} ${s.subjectName}`)
                            )
                          ).map((sub) => (
                            <option key={sub} value={sub}>
                              {sub}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-rose-500 font-semibold p-2 border border-rose-200 bg-rose-50 rounded text-[11px]">
                          ไม่มีรายวิชาเรียนในระบบที่เป็นของ รุ่น {exBatch} ในขณะนี้ โปรดเพิ่มตารางเรียนก่อน
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-700 mb-1">วันเวลาสอบ *</label>
                      <input
                        id="examDateInput"
                        type="date"
                        required
                        value={exDate}
                        onChange={(e) => setExDate(e.target.value)}
                        className="w-full border border-neutral-300 px-3 py-1.5 rounded focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button id="submitExamBtn" type="submit" className="bg-black text-white hover:bg-neutral-850 px-5 py-2 rounded text-xs font-bold cursor-pointer">
                      นัดรวมรวมสอบกลาง
                    </button>
                  </div>
                </form>

                {/* 2. Publish Grades */}
                <form onSubmit={handlePublishGrades} className="bg-white p-4 border border-neutral-300 rounded-lg space-y-4">
                  <h4 className="font-sans font-bold text-neutral-950 uppercase border-b pb-1 text-xs">ประกาศประเมินสรุปคะแนนสอบ</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-700 mb-1">รุ่นนักเรียน *</label>
                      <select
                        id="gradeBatchSelect"
                        value={gradeBatch}
                        onChange={(e) => {
                          const newBatch = e.target.value;
                          setGradeBatch(newBatch);
                          const subjects = Array.from(
                            new Set(
                              classSchedules
                                .filter((s) => s.batch === newBatch)
                                .map((s) => `${s.subjectCode} ${s.subjectName}`)
                            )
                          );
                          setGradeSubject(subjects.length > 0 ? subjects[0] : '');
                        }}
                        className="w-full border border-neutral-300 px-1.5 py-1.5 rounded bg-white font-mono text-xs"
                      >
                        <option value="65">รุ่น 65</option>
                        <option value="66">รุ่น 66</option>
                        <option value="67">รุ่น 67</option>
                        <option value="68">รุ่น 68</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-700 mb-1">วิชาเรียน *</label>
                      {Array.from(
                        new Set(
                          classSchedules
                            .filter((s) => s.batch === gradeBatch)
                            .map((s) => `${s.subjectCode} ${s.subjectName}`)
                        )
                      ).length > 0 ? (
                        <select
                          id="gradeSubjectInput"
                          required
                          value={gradeSubject}
                          onChange={(e) => setGradeSubject(e.target.value)}
                          className="w-full border border-neutral-300 px-3 py-2.5 rounded focus:outline-none bg-white font-sans text-xs"
                        >
                          {Array.from(
                            new Set(
                              classSchedules
                                .filter((s) => s.batch === gradeBatch)
                                .map((s) => `${s.subjectCode} ${s.subjectName}`)
                            )
                          ).map((sub) => (
                            <option key={sub} value={sub}>
                              {sub}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-rose-500 font-semibold p-2 border border-rose-200 bg-rose-50 rounded text-[11px]">
                          ไม่มีรายวิชาเรียนในระบบที่เป็นของ รุ่น {gradeBatch} ในขณะนี้ โปรดเพิ่มตารางเรียนก่อน
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-700 mb-1">ครั้งที่พิจารณา (Round) *</label>
                      <input
                        id="gradeRoundInput"
                        type="number"
                        min={1}
                        required
                        value={gradeRound}
                        onChange={(e) => setGradeRound(parseInt(e.target.value) || 1)}
                        className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* List batch students for grading */}
                  <div className="border border-neutral-200 rounded p-3 bg-stone-50 max-h-48 overflow-y-auto">
                    <span className="font-bold block mb-2 text-neutral-600 uppercase text-[10px]">รายชื่อนักเรียนรุ่น {gradeBatch} เพื่อกรอกคะแนน (เปอร์เซ็นต์เต็ม 100)</span>
                    <div className="space-y-2">
                      {users
                        .filter(u => u.role === 'นักศึกษา' && u.batch === gradeBatch)
                        .map(std => (
                          <div key={std.id} className="flex justify-between items-center bg-white p-2 border rounded shadow-xs text-xs">
                            <span className="font-bold">{std.id} - {std.firstName} {std.lastName}</span>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              placeholder="กรอกคะแนน"
                              value={studentGrades[std.id] || ''}
                              onChange={(e) => setStudentGrades({ ...studentGrades, [std.id]: parseInt(e.target.value) || 0 })}
                              className="w-20 border px-2 py-1 text-center rounded font-mono font-bold"
                            />
                          </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button id="submitGradesBtn" type="submit" className="bg-black text-white hover:bg-neutral-850 px-5 py-2 rounded text-xs font-bold cursor-pointer">
                      ประกาศรับรองเกรดลงชีต
                    </button>
                  </div>
                </form>

              </div>
            )}

            {/* If STUDENT or (INSTRUCTOR with 'room' subtab): SUBMIT ROOM REQUEST */}
            {(isStudent || (isInstructor && instActionTab === 'room')) && (
              <form onSubmit={handleRoomSubmit} className="space-y-4">
                <h3 className="font-sans font-extrabold text-sm border-b pb-2 text-neutral-950 uppercase">
                  เขียนใบร้องขอเข้าใช้พื้นที่ปฏิบัติการซ่อม (TLTC-MO-033)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-700 mb-1">ฝ่ายวิทยา สังกัดแผนกหน่วยงาน *</label>
                    <input
                      id="reqDeptInput"
                      type="text"
                      required
                      placeholder="เช่น ฝ่ายทดสอบปีก ช่างการบินรุ่น 67"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-700 mb-1">เบอร์ฉุกเฉิน *</label>
                    <input
                      id="reqPhoneInput"
                      type="text"
                      required
                      placeholder="เช่น 089-xxxxxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-700 mb-1">พื้นที่ปฏิบัติงานที่ต้องการขอจอง *</label>
                    <select
                      id="reqRoomSelect"
                      value={selectedRoom}
                      onChange={(e) => setSelectedRoom(e.target.value)}
                      className="w-full border border-neutral-300 px-2 py-2 rounded bg-white text-xs font-semibold"
                    >
                      <option value="Practical Area in Hangar">Practical Area in Hangar</option>
                      <option value="Meeting Room">Meeting Room</option>
                      <option value="Theoretical Classroom">Theoretical Classroom</option>
                      <option value="Library Room">Library Room</option>
                      <option value="Workshop 1">Workshop 1</option>
                      <option value="Workshop 2">Workshop 2</option>
                      <option value="Fiberglass Workshop">Fiberglass Workshop</option>
                      <option value="Examination Room">Examination Room</option>
                      <option value="Aerodynamic Room">Aerodynamic Room</option>
                      <option value="Electrical Room">Electrical Room</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-700 mb-1">วันที่ต้องการเข้าใช้งานห้อง *</label>
                    <input
                      id="reqDateInput"
                      type="date"
                      required
                      value={requestDate}
                      onChange={(e) => setRequestDate(e.target.value)}
                      className="w-full border border-neutral-300 px-3 py-1.5 rounded focus:outline-none font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-neutral-700 mb-1">เวลากรอบชั่วโมง *</label>
                    <select
                      id="reqTimeRangeSelect"
                      value={timeRange}
                      onChange={(e) => setTimeRange(e.target.value)}
                      className="w-full border border-neutral-300 px-2 py-2 rounded bg-white text-xs font-medium"
                    >
                      <option value="09:00 - 12:00">09:00 - 12:00</option>
                      <option value="13:00 - 16:30">13:00 - 16:30</option>
                      <option value="09:00 - 16:30">09:00 - 16:30</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-700 mb-1">จุดประสงค์กิจกรรมคราดการเข้าใช้งานอย่างชัดถ้อยชัดใบ *</label>
                  <textarea
                    id="reqPurposeTextarea"
                    required
                    rows={2}
                    placeholder="ระบุ เช่น ตรวจเทียบวันหมดประกันเครื่องวัด Dial Gauges"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full border border-neutral-300 px-3 py-2 rounded"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-neutral-750">ลงนามลายเซ็นรับคำยืนยันเอกสาร *</label>
                  <div className="w-full max-w-sm">
                    <SignaturePad onSave={(data) => setRequestSignature(data)} />
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t">
                  <button id="sendRoomRequestBtn" type="submit" className="bg-neutral-950 text-white font-bold px-6 py-2 rounded hover:bg-neutral-850 cursor-pointer text-xs">
                    บันทึกส่งเอกสารขอจอง
                  </button>
                </div>
              </form>
            )}

          </div>
        )}

        {/* TAB 3: BORROW AND RETURN EQUIPMENT (FITTED WITH CAM SCANNERS) */}
        {activeTab === 'borrow' && (
          <div className="space-y-6">
            
            <div className="border border-neutral-300 p-5 rounded-lg bg-neutral-50/50">
              <h3 className="font-sans font-extrabold text-sm mb-3 text-neutral-950 flex items-center gap-1.5 uppercase">
                <Camera size={16} />
                <span>เบิกและยืมเครื่องมือในอู่ / ตรวจสอบสแกนโค้ดสลักป้าย</span>
              </h3>

              {isCameraActive ? (
                <div className="border-2 border-neutral-950 bg-neutral-950 rounded-lg p-4 text-center text-white relative min-h-[300px] flex flex-col justify-between items-center transition-all duration-350">
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10 bg-neutral-900/60 px-2 py-0.5 rounded-full">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                    <span className="text-[9px] font-mono tracking-widest text-emerald-400">ACTIVE CAMERA</span>
                  </div>

                  <button 
                    type="button" 
                    onClick={() => setIsCameraActive(false)} 
                    className="absolute top-2 left-2 bg-rose-900/90 hover:bg-rose-800 text-white text-[9px] font-bold px-2.5 py-1 rounded-md transition-all cursor-pointer z-10 shadow-md flex items-center gap-1"
                  >
                    <span>✕ ปิดหน้าเปิดกล้อง</span>
                  </button>
                  
                  {/* Real Web Camera Stream View with Scanner HUD Overlay */}
                  <div className="w-full mt-6">
                    {cameraError ? (
                      <div className="text-rose-400 text-[10px] font-bold p-3 bg-rose-950/40 rounded-lg max-w-md mx-auto mb-3 border border-rose-900/40 select-none">
                        ⚠️ ขออภัย: {cameraError} <br />
                        <span className="font-normal text-slate-300 mt-1 block">(ระบบตรวจพบขีดจำกัดเบราว์เซอร์ จึงสลับกลับสู่โหมดจำลองเพื่อทดสอบให้ท่านใช้ปุ่มด้านล่างสแกนทดสอบได้ทันที)</span>
                      </div>
                    ) : (
                      <div className="relative w-full max-w-sm h-48 bg-neutral-900 rounded-lg overflow-hidden border border-neutral-700 mx-auto mb-3 flex items-center justify-center">
                        <div 
                          id="student-equipment-reader" 
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        {/* Interactive Scanner laser targeting HUD overlay */}
                        <div className="absolute inset-0 border border-emerald-500/20 flex items-center justify-center pointer-events-none z-10">
                          <div className="w-48 h-28 border border-emerald-400/50 rounded flex items-center justify-center relative">
                            <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-emerald-400" />
                            <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-emerald-400" />
                            <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-emerald-400" />
                            <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-emerald-400" />
                            <div className="w-44 h-0.5 bg-emerald-450 animate-bounce shadow-[0_0_10px_#10b981]" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="w-full">
                    <span className="block text-[9.5px] text-neutral-300 mb-2 font-semibold">หรือคุณสามารถคลิกเลือกปุ่มด้านล่างนี้ เพื่อ "สลับสแกนอุปกรณ์" จำลองได้ทันที:</span>
                    <div className="flex flex-wrap justify-center gap-1 text-[10px]">
                      {equipments.map(tool => (
                        <button
                          key={tool.code}
                          id={`simulateToolScanBtn_${tool.code}`}
                          type="button"
                          onClick={() => handleSimulateScan(tool.code)}
                          className="bg-white/10 hover:bg-emerald-600 hover:text-white border border-white/20 px-2.5 py-1 rounded cursor-pointer font-bold font-mono transition-transform duration-100 hover:scale-105"
                        >
                          สแกน {tool.code}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 border-2 border-dashed border-neutral-300 rounded bg-white">
                  <button
                    id="activateCamScanBtn"
                    type="button"
                    onClick={() => setIsCameraActive(true)}
                    className="flex items-center gap-2 bg-neutral-950 hover:bg-neutral-850 text-white font-sans font-extrabold px-6 py-2.5 rounded shadow inline-flex text-xs transition-colors cursor-pointer"
                  >
                    <Camera size={14} />
                    <span>เปิดกล้องสแกนคิวอาร์โค้ดสลักป้ายอุปกรณ์</span>
                  </button>
                  <p className="text-[10px] text-neutral-400 mt-2">หรือกรอกรหัสคิวอาร์โค้ดตรงขวาเพื่อทำรายการแบบแมนนวล</p>
                </div>
              )}

              {/* Manual input borrowing Form */}
              <form onSubmit={handleBorrowSubmit} className="space-y-4 mt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-700 mb-1">รหัสคิวอาร์โค้ดอุปกรณ์ *</label>
                    <input
                      id="toolCodeManualInput"
                      type="text"
                      required
                      placeholder="เช่น AMT-TL-001"
                      value={targetCode}
                      onChange={(e) => {
                        setTargetCode(e.target.value);
                        const match = equipments.find(eq => eq.code.toLowerCase() === e.target.value.toLowerCase().trim());
                        setScannedTool(match || null);
                      }}
                      className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900 font-mono text-sm uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-700 mb-1">จำนวนที่ยืม (QTY EA) *</label>
                    <input
                      id="borrowQtyInput"
                      type="number"
                      min={1}
                      required
                      value={borrowQty}
                      onChange={(e) => setBorrowQty(parseInt(e.target.value) || 1)}
                      className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900 font-mono text-sm"
                    />
                  </div>
                </div>

                {scannedTool && (
                  <div className="p-3 bg-neutral-100 border border-neutral-300 rounded-md flex justify-between items-center">
                    <div>
                      <p className="font-sans font-bold text-neutral-950">{scannedTool.toolName}</p>
                      <p className="text-[9px] text-neutral-500 font-mono">P/N: {scannedTool.partNumber} | ชั้นวาง: {scannedTool.location}</p>
                    </div>
                    <span className="font-sans font-bold bg-neutral-950 text-white text-[10px] px-2 py-1 rounded">
                      เหลือในสต๊อก: {scannedTool.qty} {scannedTool.qty > 0 ? 'พร้อมยืม' : 'ของหมดคลัง'}
                    </span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-neutral-800">เซ็นรับรองความปลอดภัยและยืมเครื่องมือคืนครบตามกติกา *</label>
                  <SignaturePad onSave={(data) => setBorrowSignature(data)} placeholder="วาดลายเซ็นของคุณด้านล่าง..." />
                </div>

                <div className="flex justify-end border-t pt-2">
                  <button id="executeBorrowBtn" type="submit" className="bg-neutral-950 text-white font-extrabold px-6 py-2 rounded hover:bg-neutral-800 text-xs shadow-sm cursor-pointer">
                    เซ็นลายมืออนุมัติเบิกจ่าย
                  </button>
                </div>
              </form>
            </div>

            {/* Display borrowed tools list (own and buddy roster) */}
            <div className="border border-neutral-300 p-5 rounded-lg space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-neutral-150 pb-2 flex-wrap">
                <h4 className="font-sans font-extrabold text-neutral-900 uppercase">
                  ตารางเครื่องมือที่ถูกเบิกจ่าย (และครอบครองร่วมรุ่นช่าง)
                </h4>
                <button
                  id="studentPrintTraceabilityLogBtn"
                  type="button"
                  onClick={() => setShowTraceabilityDoc(true)}
                  className="flex items-center gap-1.5 bg-rose-655 hover:bg-rose-755 text-white font-sans font-extrabold text-[10px] px-3.5 py-2 rounded shadow-xs cursor-pointer select-none transition-transform duration-100 active:scale-95"
                >
                  <Printer size={12} />
                  <span>พิมพ์ประวัติยืมเครื่องมือชุดนี้ (TLTC-MO-001)</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 text-[10px] text-neutral-550 font-bold border-b border-neutral-200">
                      <th className="py-2.5 px-2">วันเวลาที่ยืม</th>
                      <th className="py-2.5 px-2">คิวอาร์โค้ด</th>
                      <th className="py-2.5 px-2">ชื่ออุปกรณ์ช่างอากาศยาน</th>
                      <th className="py-2.5 px-2">ผู้ถือเครื่องมือขณะนี้</th>
                      <th className="py-2.5 px-2 text-center">หน่วย (EA)</th>
                      <th className="py-2.5 px-2 text-center">คืนอุปกรณ์</th>
                    </tr>
                  </thead>
                  <tbody>
                    {borrowRecords
                      .filter(rec => isStudent ? (rec.status === 'Borrowed' || rec.status === 'PendingReturn') : true)
                      .map((rec) => {
                        const isBorrowedByMe = rec.borrowerId === currentUser.id;
                        return (
                          <tr key={rec.id} className="border-b border-neutral-100 hover:bg-neutral-50 text-[11px]">
                            <td className="py-2.5 px-2 font-mono text-neutral-550">{rec.borrowDate}</td>
                            <td className="py-2.5 px-2 font-mono font-bold">{rec.equipmentCode}</td>
                            <td className="py-2.5 px-2 font-bold text-neutral-900">{rec.toolName}</td>
                            <td className="py-2.5 px-2 font-medium">
                              {isBorrowedByMe ? (
                                <span className="bg-neutral-950 text-white px-1.5 py-0.5 rounded text-[10px] font-bold">
                                  คุณกำลังถืออยู่ (You)
                                </span>
                              ) : (
                                <span>{rec.borrowerName} ({rec.borrowerId})</span>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono font-bold text-neutral-800">{rec.qty}</td>
                            <td className="py-2.5 px-2 text-center">
                              {rec.status === 'Returned' ? (
                                <span className="text-neutral-450 italic">คืนแล้ว ({rec.returnDate})</span>
                              ) : rec.status === 'PendingReturn' ? (
                                <span className="text-amber-600 bg-amber-50 border border-amber-300 font-sans font-bold text-[9px] px-2 py-0.5 rounded inline-block animate-pulse">
                                  รอฝ่ายรักษาบำรุงตรวจรับ
                                </span>
                              ) : (
                                <button
                                  id={`returnBtn_${rec.id}`}
                                  hidden={!isBorrowedByMe}
                                  onClick={() => {
                                    onReturnEquipment(rec.id);
                                    Swal.fire({ icon: 'success', title: 'คืนอุปกรณ์แล้ว', text: 'ส่งคืนสู่สารบบ เรียบร้อยแล้ว (รอฝ่ายซ่อมตรวจสอบแบริ่งต่อไป)', confirmButtonColor: '#171717' });
                                  }}
                                  className="bg-black hover:bg-neutral-800 text-white font-sans font-bold text-[9px] py-1 px-2.5 rounded transition-colors cursor-pointer"
                                >
                                  กดส่งคืนอุปกรณ์
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    {borrowRecords.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-neutral-450 italic">
                          ไม่มีการยืมใช้เครื่องมือในบัญชีขณะนี้
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ROSTER GROUP (Buddy list / Cohort rosters) */}
        {activeTab === 'roster' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-sans font-extrabold text-sm text-neutral-900 uppercase">
                {isStudent ? 'ทำเนียบเพื่อนเรียนร่วมรุ่นช่างอากาศยาน' : 'ทำเนียบบุคลากรวิชาสอนช่างการบิน'}
              </h3>
              
              {isStudent && (
                <div className="flex items-center gap-1">
                  <span>เลือกรุ่นที่เรียกตรวจ:</span>
                  <select
                    id="rosterBatchSelect"
                    value={rosterBatch}
                    onChange={(e) => setRosterBatch(e.target.value)}
                    className="border border-neutral-300 px-1 py-0.5 rounded font-mono font-bold bg-white"
                  >
                    <option value="65">รุ่น 65</option>
                    <option value="66">รุ่น 66</option>
                    <option value="67">รุ่น 67</option>
                    <option value="68">รุ่น 68</option>
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {users
                .filter(u => isStudent ? (u.role === 'นักศึกษา' && u.batch === rosterBatch) : (u.role !== 'นักศึกษา' && u.role !== 'Admin'))
                .map((member) => (
                  <div key={member.id} className="flex gap-4 p-3 border border-neutral-300 rounded bg-white items-center shadow-xs">
                    <img src={member.photoUrl} alt="member" className="w-12 h-14 object-cover rounded border" referrerPolicy="no-referrer" />
                    <div>
                      <p className="font-sans font-extrabold text-neutral-950">{member.firstName} {member.lastName}</p>
                      <p className="font-mono text-[10px] text-neutral-500 font-bold uppercase">{member.role} | ID: {member.id}</p>
                      <p className="text-[10px] text-neutral-400 font-mono mt-0.5">{member.email}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

      </div>

      {showTraceabilityDoc && (
        <TraceabilityToolsLogDoc 
          records={borrowRecords.filter(rec => isStudent ? rec.borrowerId === currentUser.id : true)}
          onClose={() => setShowTraceabilityDoc(false)}
        />
      )}

    </div>
  );
}
