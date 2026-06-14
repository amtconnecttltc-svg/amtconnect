/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, RoomRequest, ClassSchedule, RoomUsageRecord, BorrowRecord } from '../types';
import SignaturePad from './SignaturePad';
import { 
  User as UserIcon, Calendar, CheckSquare, ClipboardList, 
  Search, Eye, Edit2, FileText, Check, ShieldAlert, Printer, Wrench
} from 'lucide-react';
import Swal from 'sweetalert2';
import { TraceabilityToolsLogDoc } from './Documents';
import { compressImage } from '../lib/api';

interface TrainingManagerPanelProps {
  currentUser: User;
  users: User[];
  roomRequests: RoomRequest[];
  classSchedules: ClassSchedule[];
  roomUsageRecords: RoomUsageRecord[];
  borrowRecords: BorrowRecord[];
  onUpdateProfile: (updated: Partial<User>) => void;
  onSubmitRoomRequest: (req: Omit<RoomRequest, 'id' | 'maintenanceApproved' | 'isRoomUsageRecordCreated'>) => void;
  onUpdateStudentStatusByStaff: (studentId: string, status: User['status']) => void;
  onApproveStudentStatusByManager?: (studentId: string) => void;
  onViewRequestDoc: (req: RoomRequest) => void;
  onPrintUsageRecords?: () => void;
}

export default function TrainingManagerPanel({
  currentUser,
  users,
  roomRequests,
  classSchedules,
  roomUsageRecords,
  borrowRecords,
  onUpdateProfile,
  onSubmitRoomRequest,
  onUpdateStudentStatusByStaff,
  onApproveStudentStatusByManager,
  onViewRequestDoc,
  onPrintUsageRecords
}: TrainingManagerPanelProps) {
  const isManager = currentUser.role === 'Training Manager';
  const [activeButtonTab, setActiveButtonTab] = useState<'profile' | 'request' | 'schedules' | 'status' | 'docs'>('profile');
  const [showTraceabilityDoc, setShowTraceabilityDoc] = useState(false);

  // Input states for room request
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [purpose, setPurpose] = useState('');
  const [requestDate, setRequestDate] = useState('');
  const [timeRange, setTimeRange] = useState('09:00 - 12:00');
  const [selectedRoom, setSelectedRoom] = useState('Practical Area in Hangar');
  const [otherRoomText, setOtherRoomText] = useState('');
  const [requestSignature, setRequestSignature] = useState('');

  // Search schedule states
  const [searchStudentId, setSearchStudentId] = useState('');
  const [foundStudent, setFoundStudent] = useState<User | null>(null);
  const [studentSchedules, setStudentSchedules] = useState<ClassSchedule[]>([]);

  // Batch states
  const [cohortBatch, setCohortBatch] = useState('67');

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
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: 'กรุณากรอกข้อมูลฟอร์มให้ครบถ้วน', confirmButtonColor: '#171717' });
      return;
    }
    if (!requestSignature) {
      Swal.fire({ icon: 'error', title: 'ต้องการลายเซ็น', text: 'กรุณาเซ็นลายมือรับรองใบคำขอนี้ด้วย', confirmButtonColor: '#171717' });
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

    // Reset Form
    setPurpose('');
    setDepartment('');
    setPhone('');
    setRequestSignature('');
    Swal.fire({ icon: 'success', title: 'ส่งคำขอสำเร็จ', text: 'ส่งใบคำขอใช้ห้องปฏิบัติการ เรียบร้อยแล้ว ขณะนี้รอเจ้าหน้าที่ฝ่ายซ่อมบำรุงตราระบุความพร้อม', confirmButtonColor: '#171717' });
  };

  const handleSearchStudentSchedule = () => {
    const student = users.find(u => u.id.trim() === searchStudentId.trim() && u.role === 'นักศึกษา');
    if (!student) {
      Swal.fire({ icon: 'error', title: 'ไม่พบรหัสประจำตัว', text: 'ไม่พบประวัตินักศึกษารหัสนี้ในสารบบ', confirmButtonColor: '#171717' });
      setFoundStudent(null);
      setStudentSchedules([]);
      return;
    }
    setFoundStudent(student);
    // Find class schedule matching student's batch (i.e. model prefix or cohort match)
    const batchPrefix = student.batch || student.id.substring(0, 2);
    const mathcingSchedules = classSchedules.filter(s => s.batch === batchPrefix);
    setStudentSchedules(mathcingSchedules);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 text-slate-850 font-sans text-xs">
      
      {/* Side menu control button panel */}
      <div className="lg:col-span-1 bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col gap-1.5">
        <h4 className="font-sans font-extrabold text-[10px] uppercase text-slate-400 mb-2 tracking-widest border-b border-slate-100 pb-1.5">
          ระบบควบคุมสำหรับ {currentUser.role}
        </h4>
        
        <button
          id="tmProfileBtn"
          onClick={() => setActiveButtonTab('profile')}
          className={`w-full py-2 px-3 text-left rounded-lg font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeButtonTab === 'profile' ? 'bg-[#0F172A] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
          }`}
        >
          <UserIcon size={14} />
          <span>ข้อมูลของฉัน</span>
        </button>

        <button
          id="tmRequestBtn"
          onClick={() => setActiveButtonTab('request')}
          className={`w-full py-2 px-3 text-left rounded-lg font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeButtonTab === 'request' ? 'bg-[#0F172A] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
          }`}
        >
          <Calendar size={14} />
          <span>ขออนุญาตใช้ห้องเรือนการช่าง</span>
        </button>

        <button
          id="tmSchedulesBtn"
          onClick={() => setActiveButtonTab('schedules')}
          className={`w-full py-2 px-3 text-left rounded-lg font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeButtonTab === 'schedules' ? 'bg-[#0F172A] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
          }`}
        >
          <Search size={14} />
          <span>ดูตารางเรียนนักศึกษา</span>
        </button>

        <button
          id="tmStatusBtn"
          onClick={() => setActiveButtonTab('status')}
          className={`w-full py-2 px-3 text-left rounded-lg font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeButtonTab === 'status' ? 'bg-[#0F172A] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
          }`}
        >
          <CheckSquare size={14} />
          <span>แก้ไขสถานะนักศึกษา</span>
        </button>

        <button
          id="tmDocsBtn"
          onClick={() => setActiveButtonTab('docs')}
          className={`w-full py-2 px-3 text-left rounded-lg font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeButtonTab === 'docs' ? 'bg-[#0F172A] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
          }`}
        >
          <ClipboardList size={14} />
          <span>{isManager ? 'เอกสารใบคลังคำร้องทั้งหมด' : 'เอกสารใบคำร้องของฉัน'}</span>
        </button>
      </div>

      {/* Main Panel Content screen */}
      <div className="lg:col-span-3 bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        
        {/* TAB 1: PROFILE MANAGEMENT */}
        {activeButtonTab === 'profile' && (
          <form onSubmit={handleUpdateProfileSubmit} className="space-y-4">
            <h3 className="font-sans font-extrabold text-sm mb-4 border-b pb-2 flex items-center gap-1.5">
              <UserIcon size={16} />
              <span>จัดการข้อมูลและลายเซ็นของฉัน (My Profile)</span>
            </h3>

            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-stone-50 border border-neutral-300 rounded mb-4">
              <div className="w-20 h-20 rounded border-2 border-neutral-800 overflow-hidden shrink-0">
                <img src={editPhoto} alt="img" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="space-y-1.5 w-full">
                <span className="font-bold text-neutral-700">อัปเดตรูปถ่ายประจำตัวผู้สอน:</span>
                <input
                  id="profilePhotoUploadInput"
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
                  className="block text-xs text-neutral-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-neutral-950 file:text-white hover:file:bg-neutral-850 cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-1">รหัสประจำตำแหน่ง (Locked)</label>
                <input type="text" disabled value={currentUser.id} className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none bg-neutral-100 font-mono text-neutral-550" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-1">ตำแหน่งหน้าที่รับผิดชอบ (Locked)</label>
                <input type="text" disabled value={currentUser.role} className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none bg-neutral-100 text-neutral-550" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-neutral-700 mb-1">ชื่อจริง *</label>
                <input type="text" required value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-700 mb-1">นามสกุล *</label>
                <input type="text" required value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-neutral-700 mb-1">อีเมลผู้สอน *</label>
                <input type="email" required value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900 font-mono" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-700 mb-1">เปลี่ยนรหัสผ่านใหม่ *</label>
                <input type="password" required value={editPassword} onChange={(e) => setEditPassword(e.target.value)} className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900 font-mono" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-neutral-700">ปรับปรุงลายเซ็นรับรองเอกสารช่าง *</label>
              <div className="w-full max-w-md">
                <SignaturePad onSave={(data) => setEditSig(data)} defaultValue={editSig} />
              </div>
            </div>

            <div className="pt-2 border-t flex justify-end">
              <button id="saveProfileBtn" type="submit" className="px-6 py-2 bg-black text-white rounded font-bold hover:bg-neutral-850 cursor-pointer shadow">
                บันทึกการแก้ไขข้อมูลของฉัน
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: REQUEST ROOM USE (TLTC-MO-033 Form) */}
        {activeButtonTab === 'request' && (
          <form onSubmit={handleRoomSubmit} className="space-y-4">
            <h3 className="font-sans font-extrabold text-sm mb-4 border-b pb-2">
              ยื่นใบร้องขอขอใช้โรงซ่อมและห้องปฏิบัติการ (TLTC-MO-033)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-neutral-50 rounded border border-neutral-250 mb-2">
              <div>
                <span className="block text-neutral-500 text-[10px]">ชื่อผู้ร้องเข้าใช้</span>
                <span className="font-bold">{currentUser.firstName} {currentUser.lastName}</span>
              </div>
              <div>
                <span className="block text-neutral-500 text-[10px]">ตำแหน่งทางวิชาการ</span>
                <span className="font-bold">{currentUser.role}</span>
              </div>
              <div>
                <span className="block text-neutral-500 text-[10px]">รหัสประจำตัว</span>
                <span className="font-bold font-mono">{currentUser.id}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-neutral-700 mb-1">สังกัด / แผนกวิชาที่เรียนหรือรับผิดชอบ *</label>
                <input
                  id="reqDeptInput"
                  type="text"
                  required
                  placeholder="เช่น ช่างบำรุงรักษาอากาศยาน ปี 2"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-700 mb-1">เบอร์ติดต่อกรณีเร่งด่วน *</label>
                <input
                  id="reqPhoneInput"
                  type="text"
                  required
                  placeholder="เช่น 081-xxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-neutral-700 mb-1">ห้องที่มีความประสงค์จองใช้ *</label>
                <select
                  id="reqRoomSelect"
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  className="w-full border border-neutral-300 px-2 py-2 rounded focus:outline-none bg-white font-medium"
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
                  <option value="Other">อื่นๆ (ระบุห้องด้านล่าง)</option>
                </select>
              </div>

              {selectedRoom === 'Other' && (
                <div>
                  <label className="block text-[10px] font-bold text-neutral-700 mb-1">กรอกข้อมูลระบุชื่อห้องอื่น *</label>
                  <input
                    id="reqOtherRoomInput"
                    type="text"
                    required
                    placeholder="เช่น ห้องล้างเครื่องยนต์"
                    value={otherRoomText}
                    onChange={(e) => setOtherRoomText(e.target.value)}
                    className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-neutral-700 mb-1">วันที่ต้องการเข้าใช้งาน *</label>
                <input
                  id="reqDateInput"
                  type="date"
                  required
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-700 mb-1">เวลากรอบชั่วโมงการจอง *</label>
                <select
                  id="reqTimeSelect"
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="w-full border border-neutral-300 px-2 py-2 rounded bg-white text-xs font-semibold"
                >
                  <option value="09:00 - 12:00">09:00 - 12:00 (เช้า)</option>
                  <option value="13:00 - 16:30">13:00 - 16:30 (บ่าย)</option>
                  <option value="09:00 - 16:30">09:00 - 16:30 (เต็มวัน)</option>
                  <option value="17:00 - 20:00">17:00 - 20:00 (ค่ำชดเชย)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-700 mb-1">บอกจุดประสงค์ในการขอใช้ห้องและสิ่งที่ต้องการพัฒนาฝึกปฏิบัติ *</label>
              <textarea
                id="reqPurposeTextarea"
                required
                rows={3}
                placeholder="อธิบายกิจกรรมการปฏิบัติงานของช่างอากาศยาน เช่น ตรวจซ่อมระบบไฟปีกเครื่องบิน หรือ ร้อยลวดน็อคฟล็อคฝาสูบเครื่องบิน"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-neutral-750">ลงนามลายมือผู้กรอกขอใช้ห้อง *</label>
              <div className="w-full max-w-sm">
                <SignaturePad 
                  onSave={async (val) => {
                    if (val) {
                      const compressed = await compressImage(val, 240, 70, 0.5);
                      setRequestSignature(compressed);
                    } else {
                      setRequestSignature('');
                    }
                  }} 
                />
              </div>
            </div>

            <div className="pt-2 border-t flex justify-end">
              <button id="sendRoomRequestBtn" type="submit" className="px-6 py-2.5 bg-neutral-950 hover:bg-neutral-850 text-white font-extrabold rounded shadow-sm text-xs cursor-pointer">
                ส่งเอกสารขอจองห้องคลังบำรุง
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: CHECK STUDENT SCHEDULE */}
        {activeButtonTab === 'schedules' && (
          <div className="space-y-6">
            <h3 className="font-sans font-extrabold text-sm mb-2 border-b pb-2">
              ตรวจสอบตารางเรียนและการเข้าเรียนรายบุคคล
            </h3>

            <div className="flex gap-2 max-w-md">
              <input
                id="searchStudentIdInput"
                type="text"
                placeholder="ระบุรหัสนักศึกษา (เช่น 67010214)"
                value={searchStudentId}
                onChange={(e) => setSearchStudentId(e.target.value)}
                className="flex-1 border border-neutral-350 rounded px-3 py-2 font-mono text-xs focus:outline-none"
              />
              <button
                id="searchStudentBtn"
                onClick={handleSearchStudentSchedule}
                className="px-4 py-2 bg-black text-white hover:bg-neutral-850 font-bold rounded cursor-pointer"
              >
                ค้นหาตารางเรียน
              </button>
            </div>

            {foundStudent && (
              <div className="bg-stone-50 border border-neutral-300 p-4 rounded space-y-4 animate-fade-in">
                <div className="flex items-center gap-4">
                  <img src={foundStudent.photoUrl} alt="student" className="w-12 h-16 object-cover border border-neutral-300 rounded" referrerPolicy="no-referrer" />
                  <div>
                    <h4 className="font-bold text-neutral-900 text-sm">{foundStudent.firstName} {foundStudent.lastName}</h4>
                    <p className="font-mono text-neutral-500 font-bold uppercase">ID: {foundStudent.id} | รุ่น {foundStudent.batch}</p>
                    <p className="font-sans text-[10px] text-neutral-600">สถานภาพนักศึกษา: <b>{foundStudent.status}</b></p>
                  </div>
                </div>

                <div className="border-t border-neutral-300 pt-3">
                  <h5 className="font-bold text-xs mb-2">ตารางเรียนประจำปีของชั้นเรียนนักศึกษา</h5>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left bg-white border border-neutral-200">
                      <thead>
                        <tr className="bg-neutral-100 text-[10px] text-neutral-650 font-bold uppercase border-b border-neutral-200">
                          <th className="py-2 px-3">วัน</th>
                          <th className="py-2 px-3">รหัสวิชา</th>
                          <th className="py-2 px-3">ชื่อหลักสูตรวิชา</th>
                          <th className="py-2 px-3">ช่วงวันที่เรียน</th>
                          <th className="py-2 px-3">ครูผู้สอน</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentSchedules.map((schedule) => (
                          <tr key={schedule.id} className="border-b border-neutral-100 text-[11px]">
                            <td className="py-2 px-3 font-bold text-neutral-950 font-sans">{schedule.dayOfWeek}</td>
                            <td className="py-2 px-3 font-mono text-neutral-600">{schedule.subjectCode}</td>
                            <td className="py-2 px-3 font-semibold text-neutral-800">{schedule.subjectName}</td>
                            <td className="py-2 px-3 font-mono">{schedule.startDate} ถึง {schedule.endDate}</td>
                            <td className="py-2 px-3 font-sans">{schedule.instructorName}</td>
                          </tr>
                        ))}
                        {studentSchedules.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-neutral-450 italic">
                              ไม่มีวิชาเรียนลงทะเบียนสำหรับรุ่นนักศึกษารายนี้
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: EDIT/APPROVE STUDENT STATUS */}
        {activeButtonTab === 'status' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-sans font-extrabold text-sm text-neutral-900">
                สถานภาพนักศึกษาแยกประเภทจำตามรุ่นความสำเร็จ
              </h3>
              <div className="flex items-center gap-1">
                <span>เลือกรุ่นที่ต้องการสืบค้น:</span>
                <select
                  value={cohortBatch}
                  onChange={(e) => setCohortBatch(e.target.value)}
                  className="border border-neutral-300 px-1.5 py-0.5 rounded font-mono font-bold bg-white text-xs"
                >
                  <option value="65">รุ่น 65</option>
                  <option value="66">รุ่น 66</option>
                  <option value="67">รุ่น 67</option>
                  <option value="68">รุ่น 68</option>
                </select>
              </div>
            </div>

            <p className="text-[11px] text-neutral-500">
              * เจ้าหน้าที่ฝ่ายอบรม (Staff) สามารถแนะนำหรือแก้ไขสถานะได้ โดย Training Manager จะเป็นคนกดยืนยันการเปลี่ยนแปลงเพื่อความปลอดภัยสิทธิ์การเข้าใช้งาน
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 text-[10px] text-neutral-500 font-bold border-b border-neutral-200">
                    <th className="py-2 px-2">รูปถ่าย</th>
                    <th className="py-2 px-2">รหัสนักศึกษา</th>
                    <th className="py-2 px-2">ชื่อ - นามสกุล</th>
                    <th className="py-2 px-2">สถานะปัจจุบัน</th>
                    <th className="py-2 px-2">แก้ไขสถานะ (Staff)</th>
                    {isManager && <th className="py-2 px-2 text-center">สิทธิ์ตรวจรับรองสิทธิ์ (Manager)</th>}
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter(u => u.role === 'นักศึกษา' && u.id.startsWith(cohortBatch))
                    .map((student) => (
                      <tr key={student.id} className="border-b border-neutral-150 hover:bg-neutral-50 text-[11px]">
                        <td className="py-2 px-2">
                          <img src={student.photoUrl} alt="t" className="w-8 h-10 object-cover border border-neutral-200 rounded" referrerPolicy="no-referrer" />
                        </td>
                        <td className="py-2 px-2 font-mono font-bold text-neutral-800">{student.id}</td>
                        <td className="py-2 px-2 font-bold">{student.firstName} {student.lastName}</td>
                        <td className="py-2 px-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            student.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'
                          }`}>
                            {student.status}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <select
                            id={`statusStaffSelect_${student.id}`}
                            value={student.status}
                            onChange={(e) => onUpdateStudentStatusByStaff(student.id, e.target.value as User['status'])}
                            className="border border-neutral-300 px-1 py-0.5 rounded text-[10.5px]"
                          >
                            <option value="Active">Active (ปกติ)</option>
                            <option value="พ้นสภาพ">พ้นสภาพ</option>
                            <option value="พักการเรียน">พักการเรียน</option>
                            <option value="จบการศึกษา">จบการศึกษา</option>
                          </select>
                        </td>
                        {isManager && (
                          <td className="py-2 px-2 text-center">
                            <button
                              id={`approveStudentStatusBtn_${student.id}`}
                              onClick={() => {
                                if (onApproveStudentStatusByManager) {
                                  onApproveStudentStatusByManager(student.id);
                                }
                              }}
                              className="bg-neutral-900 text-white font-semibold text-[10px] px-2 py-1 rounded hover:bg-neutral-800 transition-colors cursor-pointer"
                            >
                              อนุมัติข้อตกลง
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  {users.filter(u => u.role === 'นักศึกษา' && u.id.startsWith(cohortBatch)).length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-450 italic">
                        ไม่พบข้อมูลนักศึกษารุ่น {cohortBatch} ค้าอยู่ในสารบบ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: DOCUMENT REQUEST MANAGEMENT */}
        {activeButtonTab === 'docs' && (
          <div className="space-y-6">
            
            {/* TLTC-MO-034 List */}
            <div className="bg-white border border-neutral-300 p-5 rounded-lg shadow-sm font-sans">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div>
                  <h4 className="font-sans font-extrabold text-sm text-neutral-950">สมุดคู่มือช่างอากาศยาน TLTC-MO-034</h4>
                  <p className="text-[11px] text-neutral-500 font-sans">บันทึกรายงานสิ่งที่ต้องการซ่อม พัฒนาระบบ และบันทึกสิ่งชำรุดเสียหาย</p>
                </div>
                {onPrintUsageRecords && (
                  <button
                    id="trainingPrintMo034Btn"
                    type="button"
                    onClick={onPrintUsageRecords}
                    className="flex items-center gap-1.5 bg-black hover:bg-neutral-800 text-white font-sans text-xs font-bold px-3 py-1.5 rounded transition-all cursor-pointer shadow-sm animate-fade-in"
                  >
                    <Printer size={13} />
                    <span>ออกเอกสารเป็น PDF (TLTC-MO-034)</span>
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-100 text-[10px] text-neutral-600 border-b border-neutral-300 font-bold uppercase font-sans">
                      <th className="py-2.5 px-2 w-1/12 text-center font-bold">ลำดับ</th>
                      <th className="py-2.5 px-2 w-2/12 font-bold font-sans">วัน/เดือน/ปี</th>
                      <th className="py-2.5 px-2 w-2/12 font-bold font-sans">ห้องที่ใช้งาน</th>
                      <th className="py-2.5 px-2 w-2/12 font-bold font-sans">ผู้ร้องขอเข้าใช้งาน</th>
                      <th className="py-2.5 px-2 w-3/12 font-bold font-sans">สิ่งที่ต้องการให้ซ่อม/พัฒนา</th>
                      <th className="py-2.5 px-2 w-2/12 text-center font-bold font-sans">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomUsageRecords.map((rec, index) => (
                      <tr key={rec.id} className="border-b border-neutral-100 hover:bg-neutral-50 text-[11px] font-sans">
                        <td className="py-2.5 px-2 text-center font-mono text-neutral-500">{index + 1}</td>
                        <td className="py-2.5 px-2 font-mono text-neutral-600">{rec.date}</td>
                        <td className="py-2.5 px-2 font-bold text-neutral-950 font-sans">{rec.room}</td>
                        <td className="py-2.5 px-2 font-sans font-bold">{rec.requesterName}</td>
                        <td className="py-2.5 px-2 font-sans">{rec.report}</td>
                        <td className="py-2.5 px-2 text-center font-sans">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold border ${
                            rec.maintenanceOfficerStatus === 'Acknowledged'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-rose-50 text-rose-800 border-rose-250 animate-pulse'
                          }`}>
                            {rec.maintenanceOfficerStatus === 'Acknowledged' ? 'รับทราบแล้ว' : 'รอตรวจสอบ'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {roomUsageRecords.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-neutral-450 italic font-sans">
                          ไม่มีประวัติบันทึกการใช้ห้องในขณะนี้
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DOCUMENT CHECKLIST TLTC-MO-033 */}
            <div className="bg-white border border-neutral-300 p-5 rounded-lg shadow-sm font-sans">
              <h3 className="font-sans font-extrabold text-sm mb-3 border-b pb-2 text-neutral-950">
                เอกสารคำขออนุมัติใช้ห้องปฏิบัติการการบิน (TLTC-MO-033)
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 text-[10px] text-neutral-600 font-bold border-b border-neutral-200 uppercase font-sans">
                      <th className="py-2.5 px-3">วันที่ยื่นเรื่อง</th>
                      <th className="py-2.5 px-3">ผู้ขอสิทธิ์</th>
                      <th className="py-2.5 px-3">โรงงาน / ห้อง</th>
                      <th className="py-2.5 px-3">จุดประสงค์ฝึกช่าง</th>
                      <th className="py-2.5 px-3 text-center">การตรวจสอบ</th>
                      <th className="py-2.5 px-3 text-center">พิมพ์เอกสาร</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomRequests
                      .filter(req => isManager ? true : req.requesterId === currentUser.id)
                      .map((req) => (
                        <tr key={req.id} className="border-b border-neutral-100 hover:bg-neutral-50 text-[11px] font-sans">
                          <td className="py-2.5 px-3 font-mono">{req.date}</td>
                          <td className="py-2.5 px-3">
                            <p className="font-sans font-bold">{req.requesterName}</p>
                            <p className="text-[10px] text-neutral-500 font-mono italic">{req.requesterId}</p>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-neutral-905">{req.room}</td>
                          <td className="py-2.5 px-3 max-w-xs truncate">{req.purpose}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              req.maintenanceApproved === 'Approved'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                : req.maintenanceApproved === 'Rejected'
                                ? 'bg-rose-50 text-rose-800'
                                : 'bg-neutral-100 text-neutral-600'
                            }`}>
                              {req.maintenanceApproved === 'Approved' ? 'รับรองความพร้อมแล้ว' : req.maintenanceApproved === 'Rejected' ? 'ปฏิเสธห้อง' : 'รอฝ่ายห้องตรวจวัด'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-sans">
                            <button
                              type="button"
                              onClick={() => onViewRequestDoc(req)}
                              className="bg-black hover:bg-neutral-800 text-white font-sans text-[10px] font-bold py-1 px-2.5 rounded transition-colors cursor-pointer"
                            >
                              พิมพ์ PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                    {roomRequests.filter(req => isManager ? true : req.requesterId === currentUser.id).length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-neutral-450 italic font-sans">
                          ไม่มีเอกสารใบคำร้องขอใช้ห้องฝึกช่างของคุณค้างในประวัติ
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TLTC-MO-001 Section: Borrow Records */}
            <div className="bg-white border border-neutral-300 p-5 rounded-lg shadow-sm font-sans">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div>
                  <h4 className="font-sans font-extrabold text-sm text-neutral-950 flex items-center gap-1.5 font-sans">
                    <Wrench size={14} className="text-neutral-950" />
                    <span>สมุดทะเบียนการยืม-คืนเครื่องมือช่างอากาศยาน (TLTC-MO-001)</span>
                  </h4>
                  <p className="text-[11px] text-neutral-500 font-sans">ประวัติการยืมคืนเครื่องมือช่างและอุปกรณ์ตรวจสอบย้อนกลับ (Traceability Verification Log)</p>
                </div>
                <button
                  id="trainingPrintMo001Btn"
                  type="button"
                  onClick={() => setShowTraceabilityDoc(true)}
                  className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-750 text-white font-sans text-xs font-bold px-3 py-1.5 rounded transition-all cursor-pointer shadow-sm animate-fade-in"
                >
                  <Printer size={13} />
                  <span>ออกเอกสารเป็น PDF (TLTC-MO-001)</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-100 text-[10px] text-neutral-600 border-b border-neutral-300 font-bold uppercase font-sans">
                      <th className="py-2.5 px-2 w-[15%] font-bold">วัน/เวลาที่ยืม</th>
                      <th className="py-2.5 px-2 w-[25%] font-bold">ชื่อเครื่องมือ</th>
                      <th className="py-2.5 px-2 w-[15%] font-bold">รหัสเครื่องมือ</th>
                      <th className="py-2.5 px-1 w-[8%] text-center font-bold">จำนวน</th>
                      <th className="py-2.5 px-2 w-[17%] font-bold">ผู้เบิกยืม</th>
                      <th className="py-2.5 px-2 w-[10%] text-center font-bold">สถานะ</th>
                      <th className="py-2.5 px-2 w-[15%] text-blank font-bold text-center">ผู้รับประกันคืน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {borrowRecords.map(rec => (
                      <tr key={rec.id} className="border-b border-neutral-100 hover:bg-neutral-50 text-[11px] font-sans">
                        <td className="py-2 px-2 font-mono">{rec.borrowDate}</td>
                        <td className="py-2 px-2 font-sans font-bold">
                          <p className="text-neutral-950">{rec.toolName}</p>
                        </td>
                        <td className="py-2 px-2 font-mono font-bold text-neutral-500">{rec.equipmentCode}</td>
                        <td className="py-2 px-1 text-center font-mono font-bold">{rec.qty}</td>
                        <td className="py-2 px-2">
                          <p className="font-sans font-semibold text-neutral-800">{rec.borrowerName}</p>
                          <p className="text-[9px] text-neutral-400 font-mono">ID: {rec.borrowerId}</p>
                        </td>
                        <td className="py-2 px-2 text-center font-sans">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            rec.status === 'Returned'
                              ? 'bg-emerald-200 text-emerald-800'
                              : 'bg-rose-250 text-rose-800 animate-pulse'
                          }`}>
                            {rec.status === 'Returned' ? 'คืนสะอาด' : 'ยังไม่คืน'}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center text-[10px] font-sans font-bold text-neutral-600">
                          {rec.status === 'Returned' ? `✓ ${rec.checkerName || 'ผู้ประสานงาน'}` : '-'}
                        </td>
                      </tr>
                    ))}
                    {borrowRecords.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-neutral-450 italic font-sans">
                          ไม่มีประวัติการยืมคืนบันทึกขณะนี้
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
