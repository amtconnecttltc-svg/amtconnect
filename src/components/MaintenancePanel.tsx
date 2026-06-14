/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, RoomRequest, RoomUsageRecord, Equipment, BorrowRecord } from '../types';
import { CustomQRCode, PrintQRCodeSheet } from './AviationQRCodes';
import SignaturePad from './SignaturePad';
import { TraceabilityToolsLogDoc } from './Documents';
import { 
  Building, Wrench, CheckCircle, Clock, Plus, Tag, 
  Settings, Key, AlertTriangle, ShieldCheck, Printer, Calendar,
  User as UserIcon, Eye, FileText
} from 'lucide-react';
import Swal from 'sweetalert2';

interface MaintenancePanelProps {
  currentUser: User;
  roomRequests: RoomRequest[];
  roomUsageRecords: RoomUsageRecord[];
  equipments: Equipment[];
  borrowRecords: BorrowRecord[];
  onCertifyRoomRequest: (requestId: string, status: 'Approved' | 'Rejected', note: string, officerName: string, officerSignature?: string) => void;
  onAcknowledgeUsageRecord: (recordId: string) => void;
  onAddEquipment: (newTool: Equipment) => void;
  onCheckReturnEquipment: (borrowId: string) => void;
  onUpdateCalibration: (toolCode: string, calDate: string, status: Equipment['status']) => void;
  onUpdateProfile: (updated: Partial<User>) => void;
  onPrintUsageRecords?: () => void;
  onViewRequestDoc?: (req: RoomRequest) => void;
}

export default function MaintenancePanel({
  currentUser,
  roomRequests,
  roomUsageRecords,
  equipments,
  borrowRecords,
  onCertifyRoomRequest,
  onAcknowledgeUsageRecord,
  onAddEquipment,
  onCheckReturnEquipment,
  onUpdateCalibration,
  onUpdateProfile,
  onPrintUsageRecords,
  onViewRequestDoc
}: MaintenancePanelProps) {
  const [activeButtonTab, setActiveButtonTab] = useState<'profile' | 'certify' | 'equipment' | 'returns' | 'calibration' | 'documents'>('profile');
  const [showQRCodeSheet, setShowQRCodeSheet] = useState(false);
  const [showTraceabilityDoc, setShowTraceabilityDoc] = useState(false);

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

  // Add equipment state
  const [toolName, setToolName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [toolCode, setToolCode] = useState('');
  const [qty, setQty] = useState(1);
  const [location, setLocation] = useState('');
  const [remark, setRemark] = useState('');
  const [calDateInput, setCalDateInput] = useState('');

  // Selected tool code for individual QR code popup preview
  const [previewQRCodeVal, setPreviewQRCodeVal] = useState<string | null>(null);

  // Certify Room note input state
  const [certifyNote, setCertifyNote] = useState('');

  const handleAddEquipmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolName || !toolCode) {
      Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: 'กรุณากรอกชื่อเครื่องมือและรหัสคิวอาร์โค้ดอุปกรณ์', confirmButtonColor: '#171717' });
      return;
    }

    // Check code duplication
    const dup = equipments.some(eq => eq.code.toLowerCase() === toolCode.toLowerCase());
    if (dup) {
      Swal.fire({ icon: 'warning', title: 'คิวอาร์โค้ดซ้ำ', text: 'รหัสคิวอาร์โค้ดสัญญลักษณ์นี้เคยระบุไปแล้วในคลังคราด', confirmButtonColor: '#171717' });
      return;
    }

    const nextNo = (equipments.length + 1).toString();
    onAddEquipment({
      no: nextNo,
      toolName,
      partNumber,
      serialNumber,
      code: toolCode,
      qty,
      location,
      status: 'Ready',
      remark,
      calibrationDate: calDateInput || undefined,
    });

    // Reset Inputs
    setToolName('');
    setPartNumber('');
    setSerialNumber('');
    setToolCode('');
    setQty(1);
    setLocation('');
    setRemark('');
    setCalDateInput('');
    Swal.fire({ icon: 'success', title: 'เพิ่มเรียบร้อย', text: 'เพิ่มอุปกรณ์ใหม่เข้าบัญชีช่างเรียบร้อยเพื่อพิมพ์คิวอาร์โค้ดสติกเกอร์', confirmButtonColor: '#171717' });
  };

  const handlePromptCertify = (requestId: string, status: 'Approved' | 'Rejected') => {
    if (status === 'Approved' && !currentUser.signature) {
      Swal.fire({
        icon: 'warning',
        title: 'ไม่พบลายเซ็นรับรอง (Signature Required)',
        text: 'กรุณาตั้งค่าและวาดลายเซ็นของคุณในแท็บ "ข้อมูลของฉัน" เพื่อใช้ลงนามกำกับในเอกสารความปลอดภัยของแผนกซ่อมบำรุงก่อนรับรองว่าห้องปฏิบัติการย่อยเป็น "พร้อมใช้งาน"',
        confirmButtonColor: '#171717'
      });
      setActiveButtonTab('profile');
      return;
    }

    Swal.fire({
      title: status === 'Approved' ? 'รับรองความพร้อมใช้งานของห้อง' : 'ปฏิเสธคำขอใช้ห้องปฏิบัติการ',
      input: 'text',
      inputLabel: 'ระบุบันทึกรายละเอียดเพิ่มเติม/คำแนะนำความปลอดภัย (เช่น ตรวจถังดับเพลิงและใส่รองเท้าเซฟตี้เรียบร้อย)',
      inputValue: certifyNote || 'ห้องเรือนช่างเครื่องบินจัดความพร้อมแล้ว',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันข้อตกลง',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#171717',
    }).then((result) => {
      if (result.isConfirmed) {
        onCertifyRoomRequest(
          requestId,
          status,
          result.value || '',
          `${currentUser.firstName} ${currentUser.lastName}`,
          currentUser.signature
        );
        Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', text: 'เปลี่ยนคำสั่งรับรองความปลอดภัยของห้องแล้ว', confirmButtonColor: '#171717' });
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 text-slate-850 font-sans text-xs animate-fade-in">
      
      {/* Sidebar Control panels */}
      <div className="lg:col-span-1 bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col gap-1.5 no-print">
        <h4 className="font-sans font-extrabold text-[10px] uppercase text-slate-400 mb-2 tracking-widest border-b border-slate-100 pb-1.5 font-bold">
          แผนกซ่อมบำรุงและอู่เครื่องบิน
        </h4>

        <button
          id="maintProfileTabBtn"
          onClick={() => setActiveButtonTab('profile')}
          className={`w-full py-2 px-3 text-left rounded-lg font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeButtonTab === 'profile' ? 'bg-[#0F172A] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
          }`}
        >
          <UserIcon size={14} />
          <span>ข้อมูลของฉัน</span>
        </button>

        <button
          id="maintCertifyTabBtn"
          onClick={() => setActiveButtonTab('certify')}
          className={`w-full py-2 px-3 text-left rounded-lg font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeButtonTab === 'certify' ? 'bg-[#0F172A] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
          }`}
        >
          <Building size={14} />
          <span>ความพร้อมห้อง (TLTC-MO-033)</span>
        </button>

        <button
          id="maintEquipmentTabBtn"
          onClick={() => setActiveButtonTab('equipment')}
          className={`w-full py-2 px-3 text-left rounded-lg font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeButtonTab === 'equipment' ? 'bg-[#0F172A] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
          }`}
        >
          <Wrench size={14} />
          <span>ข้อมูลสารบบอุปกรณ์เครื่องมือ</span>
        </button>

        <button
          id="maintReturnsTabBtn"
          onClick={() => setActiveButtonTab('returns')}
          className={`w-full py-2 px-3 text-left rounded-lg font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeButtonTab === 'returns' ? 'bg-[#0F172A] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
          }`}
        >
          <CheckCircle size={14} />
          <span>ตรวจรับอุปกรณ์คืนจากนักศึกษา</span>
        </button>

        <button
          id="maintCalibrationTabBtn"
          onClick={() => setActiveButtonTab('calibration')}
          className={`w-full py-2 px-3 text-left rounded-lg font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeButtonTab === 'calibration' ? 'bg-[#0F172A] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
          }`}
        >
          <Calendar size={14} />
          <span>Calibrate เครื่องวัด (สอบเทียบ)</span>
        </button>

        <button
          id="maintDocsTabBtn"
          onClick={() => setActiveButtonTab('documents')}
          className={`w-full py-2 px-3 text-left rounded-lg font-sans font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeButtonTab === 'documents' ? 'bg-[#0F172A] text-white shadow-xs' : 'hover:bg-slate-50 text-slate-650 hover:text-slate-900'
          }`}
        >
          <FileText size={14} />
          <span>เอกสารทั้งหมด (ทุกฟอร์ม)</span>
        </button>
      </div>

      {/* Main Tab Panel Display */}
      <div className="lg:col-span-3 bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        
        {/* TAB 0: PROFILE MANAGEMENT */}
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
                <span className="font-bold text-neutral-700">อัปเดตรูปถ่ายประจำตำแหน่ง:</span>
                <input
                  id="maintPhotoUploadInput"
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
                <label className="block text-[10px] font-bold text-neutral-700 mb-1">อีเมลสื่อสาร *</label>
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
              <button id="saveMaintProfileBtn" type="submit" className="px-6 py-2 bg-black text-white rounded font-bold hover:bg-neutral-850 cursor-pointer shadow">
                บันทึกการแก้ไขข้อมูลของฉัน
              </button>
            </div>
          </form>
        )}

        {/* TAB 1: CERTIFY ROOMS REQUEST & USAGE ACKNOWLEDGE */}
        {activeButtonTab === 'certify' && (
          <div className="space-y-6">
            
            {/* Certify pending room requests */}
            <div>
              <h3 className="font-sans font-extrabold text-sm mb-1 text-neutral-950 uppercase">
                รับการขอใช้ห้องเพื่อรับรองความพร้อมใช้งานของอู่และโรงช่าง
              </h3>
              <p className="text-[11px] text-neutral-500 mb-4">* ตรวจรับความปลอดภัยระดับช่างอากาศยานก่อนลงนามอนุมัติให้ครูผู้รับผิดชอบหรือนักศึกษาเข้าพื้นที่</p>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 text-[10px] text-neutral-555 font-bold border-b border-neutral-200">
                      <th className="py-2.5 px-2">วันที่จองใช้</th>
                      <th className="py-2.5 px-2">ผู้ส่งเรื่องขอสิทธิ์</th>
                      <th className="py-2.5 px-2">ห้องช่างที่ประสงค์จอง</th>
                      <th className="py-2.5 px-2">ความสำคัญของงาน</th>
                      <th className="py-2.5 px-2 text-center">ตัดสินใจ (Action)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomRequests.map((req) => (
                      <tr key={req.id} className="border-b border-neutral-100 hover:bg-neutral-50 text-[11px]">
                        <td className="py-2.5 px-2 font-mono">{req.date} ({req.timeRange})</td>
                        <td className="py-2.5 px-2">
                          <p className="font-sans font-bold">{req.requesterName}</p>
                          <p className="text-[10px] text-neutral-500 font-mono italic">{req.requesterRole}</p>
                        </td>
                        <td className="py-2.5 px-2 font-bold text-neutral-900">{req.room}</td>
                        <td className="py-2.5 px-2 truncate max-w-xs">{req.purpose}</td>
                        <td className="py-2.5 px-2">
                          <div className="flex gap-1.5 justify-center">
                            {req.maintenanceApproved === 'Pending' ? (
                              <>
                                <button
                                  id={`certifyRejectBtn_${req.id}`}
                                  onClick={() => handlePromptCertify(req.id, 'Rejected')}
                                  className="bg-neutral-100 hover:bg-rose-50 hover:text-rose-700 text-neutral-700 border border-neutral-300 font-bold px-2 py-1 rounded text-[10px] transition-colors cursor-pointer"
                                >
                                  ไม่พร้อม
                                </button>
                                <button
                                  id={`certifyApproveBtn_${req.id}`}
                                  onClick={() => handlePromptCertify(req.id, 'Approved')}
                                  className="bg-neutral-950 hover:bg-black text-white px-2.5 py-1 rounded font-extrabold text-[10px] shadow transition-transform cursor-pointer"
                                >
                                  ห้องพร้อมใช้งาน
                                </button>
                              </>
                            ) : (
                              <span className={`px-2 py-1 rounded font-bold text-[10px] ${
                                req.maintenanceApproved === 'Approved' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-stone-100 text-stone-500'
                              }`}>
                                ดูแลรับรองแล้ว ({req.maintenanceApproved})
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {roomRequests.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-neutral-450 italic">
                          ไม่มีการจองใช้ห้องค้างตรวจสอบในตอนนี้
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Acknowledge Usage (TLTC-MO-034 logs) */}
            <div className="border-t border-neutral-200 pt-6">
              <h3 className="font-sans font-extrabold text-sm mb-1 text-neutral-950 uppercase">
                แสดงประวัติการใช้สมุดรายงาน TLTC-MO-034 เพื่อกดรับทราบสถานภาพ
              </h3>
              <p className="text-[11px] text-neutral-500 mb-4">* ตรวจรับความคิดเห็นของครูผู้นำสอนว่าต้องการปรับปรุงอะไร ทาสี หรือซื้ออะไรเสริม แล้วกดรับคำสั่ง</p>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 text-[10px] text-neutral-555 font-bold border-b border-neutral-200">
                      <th className="py-2.5 px-2">วันบันทึก</th>
                      <th className="py-2.5 px-2">ห้อง</th>
                      <th className="py-2.5 px-2">ผู้ส่งรายการ</th>
                      <th className="py-2.5 px-2">สิ่งที่ต้องการให้ช่างดำเนินการซ่อม/พัฒนา</th>
                      <th className="py-2.5 px-2 text-center">รับรองความพร้อม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomUsageRecords.map(rec => (
                      <tr key={rec.id} className="border-b border-neutral-100 hover:bg-neutral-50 text-[11px]">
                        <td className="py-2.5 px-2 font-mono">{rec.date}</td>
                        <td className="py-2.5 px-2 font-bold text-neutral-950">{rec.room}</td>
                        <td className="py-2.5 px-2 font-sans font-bold text-neutral-650">{rec.requesterName}</td>
                        <td className="py-2.5 px-2 text-neutral-700">{rec.report}</td>
                        <td className="py-2.5 px-2 text-center">
                          {rec.maintenanceOfficerStatus === 'Acknowledged' ? (
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold px-2 py-1 rounded text-[10px]">
                              รับทราบข้อมูลแล้ว
                            </span>
                          ) : (
                            <button
                              id={`ackUsageBtn_${rec.id}`}
                              onClick={() => {
                                onAcknowledgeUsageRecord(rec.id);
                                Swal.fire({ icon: 'success', title: 'ตกลงรับทราบ', text: 'บันทึกสมุดรายงานแล้ว', confirmButtonColor: '#171717' });
                              }}
                              className="bg-black hover:bg-neutral-850 text-white font-bold px-2 py-1 rounded text-[10px] cursor-pointer"
                            >
                              กดเพื่อเซ็นรับทราบ
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {roomUsageRecords.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-neutral-450 italic">
                          ไม่มีการบันทึกรายงานสมุดบันทึกค้างไว้ในโรงช่าง
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EQUIPMENT INVENTORY & CREATOR */}
        {activeButtonTab === 'equipment' && (
          <div className="space-y-6">
            
            {/* Header action button for QR code print sheets */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-neutral-100 p-4 rounded-lg border border-neutral-300">
              <div>
                <h4 className="font-sans font-extrabold text-xs text-neutral-950 uppercase">หนังสือรายงานคิวอาร์โค้ดอุปกรณ์ทั้งหมด</h4>
                <p className="text-[10.5px] text-neutral-500">พิมพ์แผ่นสติ๊กเกอร์คิวอาร์โค้ดขนาดมาตรฐาน A4 เพื่อนำไปติดประดับที่กล่องแกนเครื่องมือ</p>
              </div>
              <button
                id="openAllQRCodeBookBtn"
                onClick={() => setShowQRCodeSheet(true)}
                className="flex items-center gap-1 bg-neutral-950 hover:bg-neutral-850 text-white font-sans font-extrabold text-xs py-2 px-4 rounded transition-all cursor-pointer shadow-xs whitespace-nowrap"
              >
                <Printer size={13} />
                <span>สร้าง PDF คิวอาร์โค้ดสติกเกอร์ทั้งหมด</span>
              </button>
            </div>

            {/* Inventory table */}
            <div className="border border-neutral-300 rounded p-4">
              <h4 className="font-sans font-bold text-neutral-900 border-b pb-2 mb-3">บัญชีเครื่องมือช่างอากาศยานปัจจุบัน</h4>
              
              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 text-[10px] text-neutral-500 font-bold border-b border-neutral-300 uppercase">
                      <th className="py-2 px-1">Code/QR-Code</th>
                      <th className="py-2 px-2">ชื่ออุปกรณ์ (P/N & S/N)</th>
                      <th className="py-2 px-2">ที่เก็บอุปกรณ์</th>
                      <th className="py-2.5 px-2 text-center">คงเหลือ (EA)</th>
                      <th className="py-2 px-2 text-center">สถานภาพ</th>
                      <th className="py-2 px-2 text-center">ทำป้าย</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipments.map((tool) => (
                      <tr key={tool.code} className="border-b border-neutral-100 hover:bg-neutral-50 text-[11px]">
                        <td className="py-2 px-1 font-mono font-bold text-neutral-950">{tool.code}</td>
                        <td className="py-2 px-2">
                          <p className="font-sans font-bold text-neutral-900">{tool.toolName}</p>
                          <p className="text-[9px] text-neutral-500 font-mono">P/N: {tool.partNumber || '-'} | S/N: {tool.serialNumber || '-'}</p>
                        </td>
                        <td className="py-2 px-2 font-mono text-neutral-550">{tool.location}</td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-neutral-900">{tool.qty}</td>
                        <td className="py-2 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold border ${
                            tool.status === 'Ready' ? 'bg-emerald-50 text-emerald-805 border-emerald-300' : 'bg-amber-50 text-amber-805 border-amber-300'
                          }`}>
                            {tool.status}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            id={`inspectQRCodeBtn_${tool.code}`}
                            onClick={() => setPreviewQRCodeVal(tool.code)}
                            className="bg-neutral-100 border border-neutral-300 hover:bg-neutral-200 px-2 py-1 rounded text-[10px] font-sans font-semibold cursor-pointer"
                          >
                            ดูคิวอาร์โค้ด
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Add Equipment Form */}
            <form onSubmit={handleAddEquipmentSubmit} className="bg-neutral-50/50 border border-neutral-300 p-5 rounded-lg space-y-4">
              <h4 className="font-sans font-extrabold text-neutral-950 border-b pb-2 flex items-center gap-1.5 text-xs">
                <Plus size={14} />
                <span>ลงทะเบียนเพิ่มเครื่องมือกล่องใหม่เข้าระบบคลังช่าง</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-700 mb-1">ชื่อเครื่องมือ (Tool Name) *</label>
                  <input
                    id="addToolNameInput"
                    type="text"
                    required
                    placeholder="เช่น Safety Wire Hand Pliers"
                    value={toolName}
                    onChange={(e) => setToolName(e.target.value)}
                    className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-700 mb-1">Part Number (P/N)</label>
                  <input
                    id="addToolPnInput"
                    type="text"
                    placeholder="เช่น P/N-ST9901"
                    value={partNumber}
                    onChange={(e) => setPartNumber(e.target.value)}
                    className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-700 mb-1">Serial Number (S/N)</label>
                  <input
                    id="addToolSnInput"
                    type="text"
                    placeholder="เช่น S/N-2026-33924"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-700 mb-1">คิวอาร์โค้ดระบุรหัส (Code ID) *</label>
                  <input
                    id="addToolCodeInput"
                    type="text"
                    required
                    placeholder="เช่น AMT-TL-015"
                    value={toolCode}
                    onChange={(e) => setToolCode(e.target.value)}
                    className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-700 mb-1">จำนวนหน่วยยืม (QTY EA) *</label>
                  <input
                    id="addToolQtyInput"
                    type="number"
                    min={1}
                    required
                    value={qty}
                    onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                    className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-700 mb-1">ห้องจัดเก็บ / ชั้นวางหิ้ง *</label>
                  <input
                    id="addToolLocInput"
                    type="text"
                    required
                    placeholder="เช่น Hangar Crib A"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-700 mb-1">วัน Calibrate (ถ้ามีเครื่องวัด)</label>
                  <input
                    id="addToolCalInput"
                    type="date"
                    value={calDateInput}
                    onChange={(e) => setCalDateInput(e.target.value)}
                    className="w-full border border-neutral-300 px-3 py-1.5 rounded focus:outline-none focus:border-neutral-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-700 mb-1">หมายเหตุเครื่องมือช่างและวิธีการใช้</label>
                <input
                  id="addToolRemarkInput"
                  type="text"
                  placeholder="เช่น เก็บรักษาในกล่องบุฟองน้ำกันความชื้นกระแทก"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div className="flex justify-end pt-2 border-t">
                <button
                  id="submitAddToolBtn"
                  type="submit"
                  className="bg-black hover:bg-neutral-850 text-white font-extrabold px-6 py-2 rounded shadow text-xs cursor-pointer"
                >
                  บันทึกข้อมูลและออกรหัสคิวอาร์โค้ด
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: CHECK EQUIPMENT RETURNS FROM STUDENTS */}
        {activeButtonTab === 'returns' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-neutral-200 pb-3">
              <div>
                <h3 className="font-sans font-extrabold text-sm mb-1 text-neutral-950 uppercase flex items-center gap-1.5">
                  <Wrench size={16} className="text-neutral-800" />
                  <span>หน้าต่างอนุมัติเซ็นรับคืนเครื่องมือเครื่องใช้</span>
                </h3>
                <p className="text-[11px] text-neutral-500">* หลังจากนักศึกษานำคีมล็อก ตัวตัด หรือ Torque Wrench มาส่งคืนเจ้าหน้าที่สลักบำรุง ให้ตรวจเช็คความชำรุด แล้วคลิกอนุมัติเซ็นลงสารบบ</p>
              </div>
              <button
                id="printTraceabilityLogBtn"
                onClick={() => setShowTraceabilityDoc(true)}
                className="flex items-center gap-2 bg-rose-650 hover:bg-rose-750 text-white font-sans font-extrabold text-[10.5px] px-3.5 py-2 rounded shadow-xs cursor-pointer select-none transition-transform duration-100 active:scale-95 text-center"
              >
                <Printer size={13} />
                <span>พิมพ์สมุดทะเบียนคุมเครื่องมือ (TLTC-MO-001)</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 text-[10px] text-neutral-550 border-b border-neutral-200 font-bold uppercase">
                    <th className="py-2.5 px-3">วันเวลาเบิกออก</th>
                    <th className="py-2.5 px-3">คิวอาร์โค้ดเครื่องมือ</th>
                    <th className="py-2.5 px-3">ชื่อรายการเครื่องมือ</th>
                    <th className="py-2.5 px-3">ผู้เบิกใช้ (ID / ชื่อ)</th>
                    <th className="py-2.5 px-3 text-center">หน่วยเบิก (EA)</th>
                    <th className="py-2.5 px-3 text-center">สถานะ</th>
                    <th className="py-2.5 px-3 text-center">ตรวจความคมชัด</th>
                  </tr>
                </thead>
                <tbody>
                  {borrowRecords
                    .filter(rec => rec.status === 'Borrowed' || rec.status === 'PendingReturn')
                    .map((rec) => (
                      <tr key={rec.id} className={`border-b border-neutral-100 hover:bg-neutral-50 text-[11px] ${rec.status === 'PendingReturn' ? 'bg-amber-50/40' : ''}`}>
                        <td className="py-2.5 px-3 font-mono">{rec.borrowDate}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-neutral-905">{rec.equipmentCode}</td>
                        <td className="py-2.5 px-3 font-semibold text-neutral-800">{rec.toolName}</td>
                        <td className="py-2.5 px-3">
                          <p className="font-bold">{rec.borrowerName}</p>
                          <p className="text-[10px] text-neutral-450 font-mono">{rec.borrowerId} ({rec.borrowerRole})</p>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">{rec.qty}</td>
                        <td className="py-2.5 px-3 text-center">
                          {rec.status === 'PendingReturn' ? (
                            <span className="bg-amber-50 text-amber-800 border border-amber-300 font-sans font-extrabold text-[9px] px-2 py-1 rounded inline-flex items-center gap-1 animate-pulse">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                              ส่งคืนแล้ว (รอตรวจ)
                            </span>
                          ) : (
                            <span className="bg-neutral-100 text-neutral-600 border border-neutral-300 font-sans font-bold text-[9px] px-2 py-0.5 rounded">
                              กำลังยืมใช้
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            id={`verifyReturnActionBtn_${rec.id}`}
                            onClick={() => {
                              onCheckReturnEquipment(rec.id);
                              Swal.fire({ icon: 'success', title: 'คืนอุปกรณ์เสร็จสมบูรณ์', text: 'เครื่องมือช่างสแกนคืนคลังเรียบร้อย และปรับสถานภาพเป็น Ready', confirmButtonColor: '#171717' });
                            }}
                            className={`font-sans font-bold text-[10px] py-1 px-3 rounded transition-colors cursor-pointer ${
                              rec.status === 'PendingReturn'
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                : 'bg-neutral-950 hover:bg-neutral-800 text-white'
                            }`}
                          >
                            {rec.status === 'PendingReturn' ? 'อนุมัติรับคืนคลัง' : 'รับรองคืนสลักแล้ว'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  {borrowRecords.filter(rec => rec.status === 'Borrowed' || rec.status === 'PendingReturn').length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-neutral-450 italic">
                        ไม่มีค้างชำระหรือรายการนักตากยืมในสารบบขณะนี้
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: CALIBRATION MANAGEMENT */}
        {activeButtonTab === 'calibration' && (
          <div className="space-y-4">
            <h3 className="font-sans font-extrabold text-sm mb-1 text-neutral-950 uppercase">
              งานเทียบมาตรฐานเครื่องวัดชั้นสูงของอู่ช่างการบิน (Calibrate)
            </h3>
            <p className="text-[11px] text-neutral-500 mb-4">
              เครื่องวัดประเภทประแจปอนด์ (Torque Wrench), ไมโครมิเตอร์ และเวอร์เนียคาลิเปอร์ จะต้องได้รับการสอบเทียบตรวจวัดความแม่นยำตามเกณฑ์มาตรฐานความปลอดภัย Part-147 เสมอ
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50 text-[10px] text-neutral-550 border-b border-neutral-200 font-bold uppercase">
                    <th className="py-2 px-2">QR Code</th>
                    <th className="py-2 px-2">ชื่ออุปกรณ์/เครื่องวัด</th>
                    <th className="py-2 px-2">วันสอบเทียบล่าสุด</th>
                    <th className="py-2 px-2">สถานะเกณฑ์</th>
                    <th className="py-2 px-2 text-center">ปรับแต่งการสอบเทียบ</th>
                  </tr>
                </thead>
                <tbody>
                  {equipments
                    .filter(tool => tool.calibrationDate)
                    .map((tool) => {
                      const calDays = tool.calibrationDate ? new Date(tool.calibrationDate).getTime() : 0;
                      const isOverdue = Date.now() - calDays > 365 * 24 * 60 * 60 * 1000; // Over 1 year

                      return (
                        <tr key={tool.code} className="border-b border-neutral-100 hover:bg-neutral-50 text-[11px]">
                          <td className="py-3 px-2 font-mono font-bold text-neutral-950">{tool.code}</td>
                          <td className="py-3 px-2">
                            <p className="font-bold">{tool.toolName}</p>
                            <p className="text-[9px] text-neutral-450 font-mono">P/N: {tool.partNumber}</p>
                          </td>
                          <td className="py-3 px-2 font-mono text-neutral-600">
                            {tool.calibrationDate || 'ไม่ระบุ'}
                          </td>
                          <td className="py-3 px-2">
                            {isOverdue ? (
                              <span className="flex items-center gap-1 text-rose-700 font-sans font-bold">
                                <AlertTriangle size={12} />
                                <span>สอบเทียบหมดประกัน (Overdue)</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-emerald-800 font-sans font-bold">
                                <ShieldCheck size={12} />
                                <span>อยู่ในเกณฑ์ปลอดภัย</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <button
                              id={`updateCalBtn_${tool.code}`}
                              onClick={() => {
                                Swal.fire({
                                  title: 'แก้ไขใบอัปเดตวันสอบเทียบ (Calibration)',
                                  html: `
                                    <div class="text-xs text-left text-neutral-600 mb-2">ระบุวันสอบเทียบครั้งล่าสุด:</div>
                                    <input type="date" id="swalCalDateInput" class="swal2-input text-xs" font-family="monospace" value="${new Date().toISOString().split('T')[0]}">
                                  `,
                                  showCancelButton: true,
                                  confirmButtonText: 'บันทึกเข้าเซิร์ฟเวอร์',
                                  cancelButtonText: 'ปิดกติกา',
                                  confirmButtonColor: '#171717',
                                }).then((res) => {
                                  if (res.isConfirmed) {
                                    const dateVal = (document.getElementById('swalCalDateInput') as HTMLInputElement).value;
                                    if (dateVal) {
                                      onUpdateCalibration(tool.code, dateVal, 'Ready');
                                      Swal.fire({ icon: 'success', title: 'อัปเดตสำเร็จ', text: 'เครื่องมือได้รับการบันทึกวันเทียบประกันใหม่', confirmButtonColor: '#171717' });
                                    }
                                  }
                                });
                              }}
                              className="bg-neutral-950 hover:bg-neutral-850 text-white font-sans text-[10px] font-semibold py-1 px-3 rounded transition-colors cursor-pointer"
                            >
                              ปรับวัน Calibrate
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: ALL DOCUMENTS (เหมือนแอดมิน) */}
        {activeButtonTab === 'documents' && (
          <div className="space-y-6">
            
            {/* TLTC-MO-034 List */}
            <div className="bg-white border border-neutral-300 p-5 rounded-lg shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div>
                  <h4 className="font-sans font-extrabold text-sm text-neutral-950">สมุดคู่มือช่างอากาศยาน TLTC-MO-034</h4>
                  <p className="text-[11px] text-neutral-500">บันทึกรายงานสิ่งที่ต้องการซ่อม พัฒนาระบบ และบันทึกสิ่งชำรุดเสียหาย</p>
                </div>
                {onPrintUsageRecords && (
                  <button
                    id="maintPrintMo034Btn"
                    type="button"
                    onClick={onPrintUsageRecords}
                    className="flex items-center gap-1.5 bg-black hover:bg-neutral-800 text-white font-sans text-xs font-bold px-3 py-1.5 rounded transition-all cursor-pointer shadow-sm"
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
                      <th className="py-2.5 px-2 w-1/12 text-center">ลำดับ</th>
                      <th className="py-2.5 px-2 w-2/12">วัน/เดือน/ปี</th>
                      <th className="py-2.5 px-2 w-2/12">ห้องที่ใช้งาน</th>
                      <th className="py-2.5 px-2 w-2/12">ผู้ร้องขอเข้าใช้งาน</th>
                      <th className="py-2.5 px-2 w-3/12">สิ่งที่ต้องการให้ซ่อม/พัฒนา</th>
                      <th className="py-2.5 px-2 w-2/12 text-center">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomUsageRecords.map((rec, index) => (
                      <tr key={rec.id} className="border-b border-neutral-100 hover:bg-neutral-50 text-[11px]">
                        <td className="py-2.5 px-2 text-center font-mono text-neutral-500">{index + 1}</td>
                        <td className="py-2.5 px-2 font-mono text-neutral-600">{rec.date}</td>
                        <td className="py-2.5 px-2 font-bold text-neutral-950">{rec.room}</td>
                        <td className="py-2.5 px-2 font-sans font-bold">{rec.requesterName}</td>
                        <td className="py-2.5 px-2 font-sans">{rec.report}</td>
                        <td className="py-2.5 px-2 text-center font-sans">
                          <button
                            type="button"
                            onClick={() => {
                              onAcknowledgeUsageRecord(rec.id);
                              Swal.fire({
                                icon: 'success',
                                title: 'ทำรายการสำเร็จ',
                                text: 'ได้ทำรายการลงนามรับทราบสมบูรณ์',
                                confirmButtonColor: '#171717'
                              });
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold shadow-xs mx-auto border transition-all cursor-pointer ${
                              rec.maintenanceOfficerStatus === 'Acknowledged'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-rose-600 hover:bg-rose-750 text-white border-rose-700'
                            }`}
                          >
                            <span>{rec.maintenanceOfficerStatus === 'Acknowledged' ? 'รับทราบแล้ว' : 'กดรับทราบเรื่อง'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {roomUsageRecords.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-neutral-450 italic">
                          ไม่มีประวัติบันทึกการใช้ห้องในขณะนี้
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DOCUMENT CHECKLIST TLTC-MO-033 */}
            <div className="bg-white border border-neutral-300 p-5 rounded-lg shadow-sm">
              <h4 className="font-sans font-extrabold text-sm mb-3 text-neutral-950">เอกสารคำขออนุมัติใช้ห้องปฏิบัติการการบิน (TLTC-MO-033)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-sans">
                  <thead>
                    <tr className="bg-neutral-100 text-[10px] text-neutral-600 border-b border-neutral-300 font-bold uppercase">
                      <th className="py-2.5 px-2">วันที่ยื่นคำขอ</th>
                      <th className="py-2.5 px-2">ผู้ร้องขอสิทธิ์</th>
                      <th className="py-2.5 px-2">ห้องซ่อมบำรุง</th>
                      <th className="py-2.5 px-2">จุดประสงค์กิจกรรม</th>
                      <th className="py-2.5 px-2 text-center">การอนุญาตห้อง</th>
                      <th className="py-2.5 px-2 text-center">ออกรายงาน PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomRequests.map(req => (
                      <tr key={req.id} className="border-b border-neutral-100 hover:bg-neutral-50 text-[11px]">
                        <td className="py-2.5 px-2 font-mono">{req.date}</td>
                        <td className="py-2.5 px-2">
                          <p className="font-sans font-bold">{req.requesterName}</p>
                          <p className="text-[9px] text-neutral-500 font-mono">{req.requesterRole}</p>
                        </td>
                        <td className="py-2.5 px-2 font-semibold text-neutral-950">{req.room}</td>
                        <td className="py-2.5 px-2 truncate max-w-xs">{req.purpose}</td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            req.maintenanceApproved === 'Approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : req.maintenanceApproved === 'Rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-neutral-200 text-neutral-700'
                          }`}>
                            {req.maintenanceApproved === 'Approved' ? 'อนุมัติความพร้อม' : req.maintenanceApproved === 'Rejected' ? 'ไม่อนุมัติ' : 'รอการตรวจสอบ'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          {onViewRequestDoc && (
                            <button
                              type="button"
                              onClick={() => onViewRequestDoc(req)}
                              className="flex items-center gap-1 bg-neutral-950 hover:bg-neutral-800 text-white font-sans text-[10px] font-semibold py-1 px-2.5 rounded transition-colors mx-auto cursor-pointer"
                            >
                              <Eye size={11} />
                              <span>ดูเอกสาร PDF</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {roomRequests.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-neutral-450 italic font-sans animate-fade-in">
                          ไม่มีเอกสารใบคำขอเข้าใช้ห้องซ่อมบำรุงขณะนี้
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TLTC-MO-001 Section: Borrow Records */}
            <div className="bg-white border border-neutral-300 p-5 rounded-lg shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div>
                  <h4 className="font-sans font-extrabold text-sm text-neutral-950 flex items-center gap-1.5">
                    <Wrench size={14} className="text-neutral-950" />
                    <span>สมุดทะเบียนการยืม-คืนเครื่องมือช่างอากาศยาน (TLTC-MO-001)</span>
                  </h4>
                  <p className="text-[11px] text-neutral-500">ประวัติการยืมคืนเครื่องมือช่างและอุปกรณ์ตรวจสอบย้อนกลับ (Traceability Verification Log)</p>
                </div>
                <button
                  id="maintPrintMo001Btn"
                  type="button"
                  onClick={() => setShowTraceabilityDoc(true)}
                  className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-750 text-white font-sans text-xs font-bold px-3 py-1.5 rounded transition-all cursor-pointer shadow-sm"
                >
                  <Printer size={13} />
                  <span>ออกเอกสารเป็น PDF (TLTC-MO-001)</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-100 text-[10px] text-neutral-600 border-b border-neutral-300 font-bold uppercase font-sans">
                      <th className="py-2.5 px-2 w-[15%]">วัน/เวลาที่ยืม</th>
                      <th className="py-2.5 px-2 w-[25%]">ชื่อเครื่องมือ</th>
                      <th className="py-2.5 px-2 w-[15%]">รหัสเครื่องมือ</th>
                      <th className="py-2.5 px-1 w-[8%] text-center">จำนวน</th>
                      <th className="py-2.5 px-2 w-[17%]">ผู้เบิกยืม</th>
                      <th className="py-2.5 px-2 w-[10%] text-center">สถานะ</th>
                      <th className="py-2.5 px-2 w-[15%] text-center font-sans font-bold text-neutral-750">ผู้ตรวจสอบรับคืน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {borrowRecords.map(rec => (
                      <tr key={rec.id} className="border-b border-neutral-100 hover:bg-neutral-50 text-[11px]">
                        <td className="py-2 px-2 font-mono">{rec.borrowDate}</td>
                        <td className="py-2 px-2">
                          <p className="font-bold text-neutral-950 font-sans">{rec.toolName}</p>
                        </td>
                        <td className="py-2 px-2 font-mono font-bold text-neutral-500">{rec.equipmentCode}</td>
                        <td className="py-2 px-1 text-center font-mono font-bold">{rec.qty}</td>
                        <td className="py-2 px-2">
                          <p className="font-sans font-semibold text-neutral-800">{rec.borrowerName}</p>
                          <p className="text-[9px] text-neutral-400 font-mono">ID: {rec.borrowerId}</p>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            rec.status === 'Returned'
                              ? 'bg-emerald-200 text-emerald-800'
                              : 'bg-rose-250 text-rose-800 font-black animate-pulse'
                          }`}>
                            {rec.status === 'Returned' ? 'คืนสะอาด' : 'ยังไม่คืน'}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center text-[10px] font-sans font-bold text-[#4B5563]">
                          {rec.status === 'Returned' ? (
                            <span className="text-neutral-900 border border-neutral-300 bg-neutral-100 px-2 py-0.5 rounded font-sans">
                              ✓ {rec.checkerName || 'เจ้าหน้าที่อู่'}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                onCheckReturnEquipment(rec.id);
                                Swal.fire({ icon: 'success', title: 'รับคืนสำเร็จ', text: 'เครื่องมือช่างได้สลักคืนสารบบสมบูรณ์แล้ว', confirmButtonColor: '#171717' });
                              }}
                              className="bg-black hover:bg-neutral-800 text-white font-sans text-[10px] font-semibold py-1 px-2.5 rounded transition-colors mx-auto cursor-pointer block"
                            >
                              ตรวจรับคืนที่นี่
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {borrowRecords.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-neutral-450 italic">
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

      {/* Pop up individual visual QR code label scanner preview */}
      {previewQRCodeVal && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 no-print animate-fade-in">
          <div className="bg-white p-6 rounded-lg w-full max-w-xs border border-neutral-300 shadow-xl flex flex-col items-center gap-4 text-center">
            <h4 className="font-sans font-bold text-neutral-900 text-xs uppercase">คิวอาร์โค้ดสลักบัญชีเครื่องมือ</h4>
            
            <CustomQRCode value={previewQRCodeVal} />

            <button
              onClick={() => setPreviewQRCodeVal(null)}
              className="w-full bg-neutral-950 text-white py-1.5 rounded font-sans font-bold text-xs hover:bg-neutral-850 transition-colors cursor-pointer"
            >
              ปิดหน้าต่างตรวจ
            </button>
          </div>
        </div>
      )}

      {/* QR Code A4 compilation print frame */}
      {showQRCodeSheet && (
        <PrintQRCodeSheet 
          equipments={equipments} 
          onClose={() => setShowQRCodeSheet(false)} 
        />
      )}

      {/* Traceability Tools Log modal */}
      {showTraceabilityDoc && (
        <TraceabilityToolsLogDoc 
          records={borrowRecords}
          onClose={() => setShowTraceabilityDoc(false)}
        />
      )}

    </div>
  );
}
