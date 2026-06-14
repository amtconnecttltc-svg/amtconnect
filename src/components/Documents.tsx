/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Printer, X, Award, ShieldAlert, CheckCircle } from 'lucide-react';
import { User, RoomRequest, RoomUsageRecord, BorrowRecord } from '../types';
import { getAppOriginForQR } from '../lib/api';

export function ThalangLogo({ className = "w-16 h-16" }: { className?: string }) {
  return (
    <img
      src="https://cdn.phototourl.com/free/2026-06-12-fda6ddeb-0ece-4e1a-97e3-3ce280078455.png"
      alt="วิทยาลัยเทคนิคถลาง"
      className={className}
      referrerPolicy="no-referrer"
    />
  );
}

interface StudentIdCardProps {
  user: User;
  onClose: () => void;
}

export function StudentIdCard({ user, onClose }: StudentIdCardProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 no-print animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden flex flex-col border border-neutral-200">
        <div className="bg-neutral-950 text-white p-3 flex items-center justify-between">
          <span className="text-xs font-mono font-bold">AMT CONNECT ID CARD ENGINE</span>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white text-xs cursor-pointer font-medium"
          >
            ปิด
          </button>
        </div>

        <div className="p-8 bg-neutral-100 flex-1 flex flex-col items-center justify-center">
          {/* Vertical ID Badge Card Layout */}
          <div className="w-[60mm] h-[95mm] bg-white border border-neutral-400 rounded-lg shadow-md p-4 flex flex-col justify-between items-center relative text-center print-card overflow-hidden">
            
            {/* Header Accent block */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-neutral-950" />
            
            {/* School Brand */}
            <div className="mt-2 w-full">
              <h4 className="font-sans font-extrabold text-[11px] uppercase tracking-wider text-neutral-950 font-semibold">
                AMT CONNECT
              </h4>
              <p className="font-sans text-[7px] text-neutral-500 font-medium">สถาบันฝึกอบรมช่างบำรุงรักษาอากาศยาน</p>
              <p className="font-mono text-[6px] text-neutral-400 mt-0.5">AIRCRAFT MAINTENANCE TRAINING CENTER</p>
            </div>

            {/* Photo */}
            <div className="my-1.5 shrink-0">
              <div className="w-20 h-24 border-2 border-neutral-950 rounded-xs overflow-hidden bg-neutral-100 relative">
                {user.photoUrl ? (
                  <img
                    src={user.photoUrl}
                    alt={user.firstName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-400 font-sans">
                    รูปถ่ายนักศึกษา
                  </div>
                )}
              </div>
            </div>

            {/* User Info Details */}
            <div className="w-full">
              <h3 className="font-sans font-bold text-xs text-neutral-950 truncate">
                {user.firstName} {user.lastName}
              </h3>
              <p className="font-sans text-[9px] font-bold text-neutral-600 uppercase tracking-wide">
                ตำแหน่ง: {user.role}
              </p>
              <p className="font-mono text-[9px] text-neutral-500 font-bold mt-0.5">
                ID: {user.id}
              </p>
            </div>

            {/* QR Code Section */}
            <div className="my-2 select-none flex flex-col items-center">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(getAppOriginForQR() + '/?id=' + user.id)}`} 
                alt="QR Verification" 
                className="w-12 h-12 border border-slate-200 p-0.5" 
                referrerPolicy="no-referrer"
              />
              <span className="text-[6px] text-neutral-400 font-mono tracking-widest mt-0.5 uppercase">VERIFY QR CODE</span>
            </div>

            {/* Signature Area */}
            <div className="w-full border-t border-dashed border-neutral-300 pt-1 flex flex-col items-center shrink-0">
              {user.signature ? (
                <img
                  src={user.signature}
                  alt="ลายมือชื่อ"
                  className="h-5 object-contain pointer-events-none filter grayscale mix-blend-multiply"
                />
              ) : (
                <div className="h-5 text-[8px] text-neutral-300 font-sans italic">ไม่มีลายเซ็น</div>
              )}
              <span className="text-[7px] text-neutral-400 font-sans mt-0.5">ลายมือชื่อผู้ถือบัตร</span>
            </div>

            {/* Footer stamp */}
            <div className="w-full flex items-center justify-between border-t border-neutral-200 pt-1 text-[6px] font-mono text-neutral-400 uppercase">
              <span>REG: {user.createdAt || '-'}</span>
              <span>TLTC CARD</span>
            </div>
          </div>
        </div>

        <div className="bg-neutral-50 p-3 flex justify-end gap-2 border-t border-neutral-200">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1 bg-neutral-950 hover:bg-neutral-800 text-white font-sans text-xs font-bold py-1.5 px-3 rounded-md transition-colors cursor-pointer"
          >
            <Printer size={13} />
            <span>สั่งพิมพ์บัตรประจำตัว</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function formatEffectiveDate(dateStr: string | undefined): string {
  if (!dateStr) return '23/04/2025';
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${day}/${month}/${year}`;
    }
  }
  return dateStr;
}

interface RoomRequestDocProps {
  request: RoomRequest;
  onClose: () => void;
}

// Robust Helper to convert Date String (DD/MM/YYYY or YYYY-MM-DD) into Thai BE date string (e.g., 19 ส.ค. 68)
function formatThaiDate(dateStr: string): string {
  if (!dateStr) return '....... / ....... / .......';
  
  let day = NaN;
  let month = NaN;
  let year = NaN;

  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    }
  } else if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    }
  }

  const thaiMonthsShort = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];

  if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
    // Convert CE (G.C.) to Buddhist Era (B.E.)
    const fullYear = year < 2400 ? year + 543 : year;
    const thYearShort = String(fullYear).slice(-2);
    const monthName = month >= 1 && month <= 12 ? thaiMonthsShort[month - 1] : '___';
    return `${day} ${monthName} ${thYearShort}`;
  }
  return dateStr;
}

export function RoomRequestDoc({ request, onClose }: RoomRequestDocProps) {
  const handlePrint = () => {
    window.print();
  };

  const [startTime, endTime] = React.useMemo(() => {
    if (!request.timeRange) return ['12:00', '12:45'];
    const parts = request.timeRange.split(/[\s]*-[\s]*/);
    return [parts[0] || '12:00', parts[1] || '12:45'];
  }, [request.timeRange]);

  const isHangar = request.room.toLowerCase().includes('hangar') || request.room.includes('โรงจอด') || request.room.toLowerCase().includes('practical');
  const isMeeting = request.room.toLowerCase().includes('meeting') || request.room.includes('ประชุม');
  const isTheoretical = request.room.toLowerCase().includes('theoretical') || request.room.toLowerCase().includes('classroom') || request.room.includes('ห้องเรียน');
  const isLibrary = request.room.toLowerCase().includes('library') || request.room.includes('ห้องสมุด');
  const isWorkshop1 = request.room.toLowerCase().includes('workshop 1') || request.room.includes('ช็อป 1') || request.room.toLowerCase().includes('workshop1');
  const isWorkshop2 = request.room.toLowerCase().includes('workshop 2') || request.room.includes('ช็อป 2') || request.room.toLowerCase().includes('workshop2');
  const isFiberglass = request.room.toLowerCase().includes('fiberglass') || request.room.includes('ไฟเบอร์กลาส') || request.room.toLowerCase().includes('fiber glass');
  const isExamination = request.room.toLowerCase().includes('examination') || request.room.includes('สอบ') || request.room.toLowerCase().includes('exam');
  const isAerodynamic = request.room.toLowerCase().includes('aerodynamic') || request.room.includes('แอร์โร') || request.room.toLowerCase().includes('aero');
  const isElectrical = request.room.toLowerCase().includes('electrical') || request.room.includes('ไฟฟ้า') || request.room.toLowerCase().includes('electric');
  const isOther = !isHangar && !isMeeting && !isTheoretical && !isLibrary && !isWorkshop1 && !isWorkshop2 && !isFiberglass && !isExamination && !isAerodynamic && !isElectrical;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 no-print animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col border border-neutral-200">
        <div className="bg-neutral-950 text-white p-4 flex items-center justify-between">
          <div>
            <h3 className="font-sans font-bold text-sm">พิมพ์เอกสารขออนุมัติใช้ห้อง (TLTC-MO-033)</h3>
            <p className="font-mono text-xs text-neutral-400">AMT-DOCUMENT GENERATOR SYSTEM</p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 hover:bg-neutral-800 rounded transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto bg-neutral-650 flex-1">
          {/* Printable A4 PDF Paper Mock */}
          <div className="bg-white p-12 shadow-2xl max-w-[210mm] mx-auto min-h-[297mm] font-sans text-black relative print-card text-[12px] leading-relaxed border border-neutral-300">
            
            {/* Form Header Table modeled exactly like Photo 1 */}
            <table className="w-full border-collapse border border-black text-xs text-black mb-6">
              <tbody>
                <tr>
                  <td rowSpan={2} className="border border-black p-1 w-[12%] text-center align-middle">
                    <ThalangLogo className="w-14 h-14 mx-auto" />
                  </td>
                  <td className="border border-black p-2 w-[58%] text-center align-middle font-sans font-bold text-[11px] uppercase tracking-wide">
                    TLTC AIRCRAFT MAINTENANCE TRAINING ORGANIZATION
                  </td>
                  <td className="border border-black p-2 w-[30%] text-center align-middle font-sans font-semibold text-[11px]">
                    Maintenance Office
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-2 text-center align-middle font-sans font-bold text-sm">
                    ขออนุญาตใช้ห้อง
                  </td>
                  <td className="border border-black p-2 text-center align-middle font-mono font-bold text-[11.5px] tracking-wide">
                    TLTC-MO-033
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Content Details Grid Block mirroring Photo 1 layout with blue ink text & dotted lines */}
            <div className="space-y-4 my-8 text-black font-sans text-[12px] leading-[2.2]">
              <div className="flex flex-wrap items-baseline gap-1">
                <span>ข้าพเจ้า</span>
                <span className="flex-1 min-w-[200px] border-b border-dotted border-black px-2 font-bold text-blue-800 text-center select-none font-serif text-[13px] italic">
                  {request.requesterName}
                </span>
                <span>ตำแหน่ง</span>
                <span className="w-[180px] border-b border-dotted border-black px-2 font-bold text-blue-800 text-center select-none font-serif text-[13px] italic">
                  {request.requesterRole || 'นักศึกษา'}
                </span>
              </div>

              <div className="flex flex-wrap items-baseline gap-1">
                <span>สังกัด/หน่วยงาน</span>
                <span className="flex-1 min-w-[220px] border-b border-dotted border-black px-2 font-bold text-blue-800 text-center select-none font-serif text-[13px] italic">
                  {request.department || 'แผนกวิชาช่างอากาศยาน'}
                </span>
                <span>เบอร์โทรศัพท์</span>
                <span className="w-[180px] border-b border-dotted border-black px-2 font-mono font-bold text-blue-800 text-center select-none text-[13px]">
                  {request.phone || '063-4303414'}
                </span>
              </div>

              <div className="flex flex-wrap items-baseline gap-1">
                <span>ความประสงค์ขออนุญาตใช้ห้องเพื่อ</span>
                <span className="flex-1 min-w-[300px] border-b border-dotted border-black px-2 font-bold text-blue-800 text-center select-none font-serif text-[13px] italic">
                  {request.purpose || 'การเรียนการสอนและการฝึกปฏิบัติวิชาชีพ'}
                </span>
              </div>

              <div className="flex flex-wrap items-baseline gap-1">
                <span>ระยะเวลาการขอใช้ห้อง วันที่</span>
                <span className="w-[150px] border-b border-dotted border-black px-2 font-bold text-blue-800 text-center select-none font-serif text-[13px] italic">
                  {formatThaiDate(request.date)}
                </span>
                <span>เวลา</span>
                <span className="w-[100px] border-b border-dotted border-black px-2 font-mono font-bold text-blue-800 text-center select-none text-[13px]">
                  {startTime}
                </span>
                <span>น.</span>
              </div>

              <div className="flex flex-wrap items-baseline gap-1 justify-end mr-[165px]">
                <span className="mr-2">วันที่</span>
                <span className="w-[150px] border-b border-dotted border-black px-2 font-bold text-blue-800 text-center select-none font-serif text-[13px] italic">
                  {formatThaiDate(request.date)}
                </span>
                <span>เวลา</span>
                <span className="w-[100px] border-b border-dotted border-black px-2 font-mono font-bold text-blue-800 text-center select-none text-[13px]">
                  {endTime}
                </span>
                <span>น.</span>
              </div>
            </div>

            {/* Checklist Box Area modeled on Photo 1 checkbox layout */}
            <div className="my-8 text-black border border-neutral-300 p-5 rounded-md relative bg-neutral-50/20">
              <h4 className="font-bold font-sans text-xs mb-4 text-black border-b border-neutral-200 pb-1">
                ห้องที่มีความประสงค์ขอใช้
              </h4>
              <div className="grid grid-cols-3 gap-y-4 pl-2 text-[11.5px] font-sans">
                {/* Practical Area in Hangar */}
                <div className="flex items-center">
                  <div className="relative flex items-center justify-center w-4 h-4 border border-black bg-white mr-3 text-blue-800 select-none flex-shrink-0">
                    {isHangar && <span className="absolute text-[16px] font-bold -mt-1 font-serif">✓</span>}
                  </div>
                  <span>Practical Area in Hangar</span>
                </div>
                {/* Meeting Room */}
                <div className="flex items-center">
                  <div className="relative flex items-center justify-center w-4 h-4 border border-black bg-white mr-3 text-blue-800 select-none flex-shrink-0">
                    {isMeeting && <span className="absolute text-[16px] font-bold -mt-1 font-serif">✓</span>}
                  </div>
                  <span>Meeting Room</span>
                </div>
                {/* Theoretical Classroom */}
                <div className="flex items-center">
                  <div className="relative flex items-center justify-center w-4 h-4 border border-black bg-white mr-3 text-blue-800 select-none flex-shrink-0">
                    {isTheoretical && <span className="absolute text-[16px] font-bold -mt-1 font-serif">✓</span>}
                  </div>
                  <span>Theoretical Classroom</span>
                </div>

                {/* Library Room */}
                <div className="flex items-center">
                  <div className="relative flex items-center justify-center w-4 h-4 border border-black bg-white mr-3 text-blue-800 select-none flex-shrink-0">
                    {isLibrary && <span className="absolute text-[16px] font-bold -mt-1 font-serif">✓</span>}
                  </div>
                  <span>Library Room</span>
                </div>
                {/* Workshop 1 */}
                <div className="flex items-center">
                  <div className="relative flex items-center justify-center w-4 h-4 border border-black bg-white mr-3 text-blue-800 select-none flex-shrink-0">
                    {isWorkshop1 && <span className="absolute text-[16px] font-bold -mt-1 font-serif">✓</span>}
                  </div>
                  <span>Workshop 1</span>
                </div>
                {/* Workshop 2 */}
                <div className="flex items-center">
                  <div className="relative flex items-center justify-center w-4 h-4 border border-black bg-white mr-3 text-blue-800 select-none flex-shrink-0">
                    {isWorkshop2 && <span className="absolute text-[16px] font-bold -mt-1 font-serif">✓</span>}
                  </div>
                  <span>Workshop 2</span>
                </div>

                {/* Fiberglass Workshop */}
                <div className="flex items-center">
                  <div className="relative flex items-center justify-center w-4 h-4 border border-black bg-white mr-3 text-blue-800 select-none flex-shrink-0">
                    {isFiberglass && <span className="absolute text-[16px] font-bold -mt-1 font-serif">✓</span>}
                  </div>
                  <span>Fiberglass Workshop</span>
                </div>
                {/* Examination Room */}
                <div className="flex items-center">
                  <div className="relative flex items-center justify-center w-4 h-4 border border-black bg-white mr-3 text-blue-800 select-none flex-shrink-0">
                    {isExamination && <span className="absolute text-[16px] font-bold -mt-1 font-serif">✓</span>}
                  </div>
                  <span className="font-semibold">Examination Room</span>
                </div>
                {/* Aerodynamic Room */}
                <div className="flex items-center">
                  <div className="relative flex items-center justify-center w-4 h-4 border border-black bg-white mr-3 text-blue-800 select-none flex-shrink-0">
                    {isAerodynamic && <span className="absolute text-[16px] font-bold -mt-1 font-serif">✓</span>}
                  </div>
                  <span>Aerodynamic Room</span>
                </div>

                {/* Electrical Room */}
                <div className="flex items-center">
                  <div className="relative flex items-center justify-center w-4 h-4 border border-black bg-white mr-3 text-blue-800 select-none flex-shrink-0">
                    {isElectrical && <span className="absolute text-[16px] font-bold -mt-1 font-serif">✓</span>}
                  </div>
                  <span>Electrical Room</span>
                </div>
                {/* Other rooms */}
                <div className="col-span-2 flex items-center">
                  <div className="relative flex items-center justify-center w-4 h-4 border border-black bg-white mr-3 text-blue-800 select-none flex-shrink-0">
                    {isOther && <span className="absolute text-[16px] font-bold -mt-1 font-serif">✓</span>}
                  </div>
                  <span className="flex-shrink-0">Other rooms/</span>
                  <span className="ml-1 flex-1 border-b border-dotted border-black px-1 text-blue-800 font-serif text-[12px] italic min-h-[14px]">
                    {isOther ? request.room : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Requester Signature Block matching Photo 1 positioning */}
            <div className="my-8 flex justify-end mr-4">
              <div className="w-[310px] flex flex-col items-center text-center space-y-1.5 text-black font-sans text-xs">
                <div className="flex items-baseline w-full justify-center gap-1">
                  <span>ลงชื่อ</span>
                  <div className="relative flex-1 border-b border-dotted border-black flex justify-center items-center h-10">
                    {request.signature ? (
                      <img
                        src={request.signature}
                        alt="Signature"
                        className="absolute max-h-12 object-contain filter grayscale mix-blend-multiply brightness-[0.6] contrast-[1.4]"
                        style={{ top: '-11px' }}
                      />
                    ) : (
                      <span className="text-blue-800 italic font-mono select-none font-bold text-xs mt-1 block">Yhn</span>
                    )}
                  </div>
                  <span>ผู้ใช้ห้อง</span>
                </div>

                <div className="flex items-baseline w-full justify-center">
                  <span>( </span>
                  <span className="flex-1 text-blue-850 font-bold px-1 font-serif text-[13.5px] italic">
                    {request.requesterName}
                  </span>
                  <span> )</span>
                </div>

                <div className="flex items-baseline w-full justify-center gap-1">
                  <span>ตำแหน่ง</span>
                  <span className="flex-1 border-b border-dotted border-black text-blue-850 font-bold text-center select-none font-serif text-[13px] italic">
                    {request.requesterRole || 'นักศึกษา'}
                  </span>
                </div>

                <div className="flex items-baseline w-full justify-center gap-1 pt-1.5 font-mono text-[11px] text-blue-850 font-bold">
                  {formatThaiDate(request.date)}
                </div>
              </div>
            </div>

            {/* Readiness Opinion Box modeled on Photo 1 bottom region */}
            <div className="border border-black p-4 space-y-4 my-8 text-black font-sans text-xs bg-neutral-50/20">
              <h4 className="font-bold underline">ความคิดเห็นผู้ตรวจสอบความพร้อมของห้อง</h4>
              
              <div className="space-y-3 pl-3">
                <div className="flex items-center">
                  <div className="relative flex items-center justify-center w-4 h-4 border border-black bg-white mr-3 text-blue-800 select-none flex-shrink-0">
                    {request.maintenanceApproved === 'Approved' && <span className="absolute text-[16px] font-bold -mt-1 font-serif">✓</span>}
                  </div>
                  <span>ห้องมีความพร้อมสามารถใช้งานได้</span>
                </div>

                <div className="flex items-center">
                  <div className="relative flex items-center justify-center w-4 h-4 border border-black bg-white mr-3 text-blue-800 select-none flex-shrink-0">
                    {request.maintenanceApproved === 'Rejected' && <span className="absolute text-[16px] font-bold -mt-1 font-serif">✓</span>}
                  </div>
                  <span>ห้องมีข้อบกพร่องไม่สามารถใช้งานได้</span>
                </div>
              </div>

              <div className="flex items-baseline gap-1 mt-2">
                <span>หมายเหตุ</span>
                <span className="flex-1 border-b border-dotted border-black px-2 text-blue-800 font-serif text-[12.5px] italic font-semibold min-h-[16px]">
                  {request.maintenanceNote || '................................................................................................................................................'}
                </span>
              </div>

              {/* Maintenance Inspector Signature block matching Photo 1 exactly */}
              <div className="flex justify-end pt-3 mr-4">
                <div className="w-[310px] flex flex-col items-center text-center space-y-1.5 text-black font-sans text-xs">
                  <div className="flex items-baseline w-full justify-center gap-1">
                    <span>ลงชื่อ</span>
                    <div className="relative flex-1 border-b border-dotted border-black flex justify-center items-center h-10">
                      {request.maintenanceApproved === 'Approved' ? (
                        request.maintenanceOfficerSignature ? (
                          <img 
                            src={request.maintenanceOfficerSignature} 
                            alt="signature" 
                            className="absolute max-h-[38px] object-contain mix-blend-multiply pointer-events-none mt-1 scale-105" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="absolute text-blue-800 font-serif italic text-[16px] select-none font-black scale-110 -rotate-3 tracking-widest leading-none mt-2">
                            {request.maintenanceOfficerName ? request.maintenanceOfficerName.split(' ')[0] : 'อิทธิพงศ์'}
                          </div>
                        )
                      ) : (
                        <span className="text-neutral-300 italic font-mono select-none">Signature</span>
                      )}
                    </div>
                    <span>ผู้ตรวจสอบ</span>
                  </div>

                  <div className="flex items-baseline w-full justify-center">
                    <span>( </span>
                    <span className="flex-1 text-blue-850 font-bold px-1 font-serif text-[13.5px] italic">
                      {request.maintenanceOfficerName || 'นายอิทธิพงศ์ สังวรณ์'}
                    </span>
                    <span> )</span>
                  </div>

                  <div className="text-[11.5px] font-extrabold text-neutral-800 uppercase tracking-wider">
                    Maintenance Officer
                  </div>

                  <div className="flex items-baseline w-full justify-center gap-1 pt-1.5 font-mono text-[11px] text-blue-850 font-bold">
                    {request.maintenanceApproved === 'Approved' ? formatThaiDate(request.date) : '....... / ....... / .......'}
                  </div>
                </div>
              </div>
            </div>

            {/* Document Footer */}
            <div className="flex justify-between items-center text-[10px] text-neutral-500 font-sans mt-12 pt-3 border-t border-neutral-300 select-none">
              <span>Effective date {formatEffectiveDate(request.maintenanceCertifiedDate)}, Rev.00</span>
              <span className="font-semibold">Page 1 of 1</span>
            </div>
          </div>
        </div>

        <div className="bg-neutral-50 p-4 border-t border-neutral-200 flex justify-end gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-neutral-950 hover:bg-neutral-800 text-white font-sans text-xs font-bold py-2 px-4 rounded-md transition-colors cursor-pointer"
          >
            <Printer size={14} />
            <span>สั่งพิมพ์เอกสาร PDF (A4)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface RoomUsageRecordDocProps {
  records: RoomUsageRecord[];
  roomRequests?: RoomRequest[];
  onClose: () => void;
}

export function RoomUsageRecordDoc({ records, roomRequests = [], onClose }: RoomUsageRecordDocProps) {
  const handlePrint = () => {
    window.print();
  };

  const latestCertifiedDate = React.useMemo(() => {
    const list = roomRequests.filter(r => r.maintenanceApproved === 'Approved' && r.maintenanceCertifiedDate);
    if (list.length === 0) return undefined;
    // Sort descending
    const sorted = [...list].sort((a, b) => {
      return new Date(b.maintenanceCertifiedDate!).getTime() - new Date(a.maintenanceCertifiedDate!).getTime();
    });
    return sorted[0].maintenanceCertifiedDate;
  }, [roomRequests]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 no-print animate-fade-in">
      {/* Dynamic Landscape print setup */}
      <style>{`
        @media print {
          .print-landscape {
            width: 297mm !important;
            height: 210mm !important;
            max-width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            padding: 8mm !important;
            background: white !important;
          }
          @page {
            size: landscape;
            margin: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col border border-neutral-200">
        <div className="bg-neutral-950 text-white p-4 flex items-center justify-between">
          <div>
            <h3 className="font-sans font-bold text-sm">พิมพ์สมุดบันทึกการใช้ห้อง (TLTC-MO-034)</h3>
            <p className="font-mono text-xs text-neutral-400">AMT-DOCUMENT GENERATOR SYSTEM</p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 hover:bg-neutral-800 rounded transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto bg-neutral-600 flex-1">
          {/* Printable Book Pattern (A4 Widescreen / Landscape Format) */}
          <div className="bg-white p-10 border border-neutral-300 shadow-2xl max-w-[297mm] mx-auto min-h-[210mm] font-sans text-black relative print-landscape text-xs leading-relaxed">
            
            {/* Form Header Table modeled after Photo 2 */}
            <table className="w-full border-collapse border border-black text-xs text-black mb-6">
              <tbody>
                <tr>
                  <td rowSpan={2} className="border border-black p-1 w-[10%] text-center align-middle">
                    <ThalangLogo className="w-14 h-14 mx-auto" />
                  </td>
                  <td className="border border-black p-2 w-[65%] text-center align-middle font-sans font-bold text-[11px] uppercase tracking-wide">
                    TLTC AIRCRAFT MAINTENANCE TRAINING ORGANIZATION
                  </td>
                  <td className="border border-black p-1 w-[25%] text-center align-middle font-sans font-semibold text-[10.5px]">
                    Maintenance Office
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-2 text-center align-middle font-sans font-bold text-[13px] tracking-wide">
                    บันทึกการใช้ห้อง
                  </td>
                  <td className="border border-black p-1 text-center align-middle font-mono font-bold text-[11px] tracking-wide">
                    TLTC-MO-034
                  </td>
                </tr>
              </tbody>
            </table>

            {/* List Table print layout modeled closely on Photo 2 */}
            <table className="w-full border-collapse border border-neutral-950 text-center font-sans mt-2">
              <thead>
                <tr className="bg-neutral-100/50 font-bold text-[11px] text-black">
                  <th className="border border-neutral-950 p-2.5 w-[11%]">ว/ด/ป</th>
                  <th className="border border-neutral-950 p-2.5 w-[16%]">ห้อง</th>
                  <th className="border border-neutral-950 p-2.5 w-[18%]">ผู้เข้าใช้ห้อง</th>
                  <th className="border border-neutral-950 p-2.5 w-[37%] text-left pl-4">รายงานการใช้ห้อง (สิ่งที่ต้องการให้พัฒนา)</th>
                  <th className="border border-neutral-950 p-2.5 w-[18%]">Maintenance Officer (ผู้ตรวจรับ)</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => {
                  const formattedDate = formatThaiDate(rec.date);
                  return (
                    <tr key={rec.id} className="text-[11px] h-12">
                      {/* Date */}
                      <td className="border border-neutral-950 p-2.5 font-bold text-blue-800 font-serif text-[12px] italic select-none">
                        {formattedDate}
                      </td>
                      {/* Room */}
                      <td className="border border-neutral-950 p-2.5 font-semibold text-blue-800 font-sans select-none">
                        {rec.room}
                      </td>
                      {/* Requester Signature & typed name inside parentheses */}
                      <td className="border border-neutral-950 p-2.5">
                        <div className="flex flex-col items-center justify-center leading-none text-blue-800 select-none">
                          <span className="font-serif italic font-black text-[13.5px] -rotate-2">
                            {rec.requesterName ? rec.requesterName.split(' ')[0] : 'ไซฮัน'}
                          </span>
                          <span className="text-[8.5px] text-neutral-500 mt-1 pb-0.5">
                            ({rec.requesterName || 'นายไซฮัน ซาราบรรณ'})
                          </span>
                        </div>
                      </td>
                      {/* Report / Feedback */}
                      <td className="border border-neutral-950 p-2.5 text-left pl-4 text-blue-800 font-serif text-[12.5px] italic font-semibold select-none">
                        {rec.report || 'ปฏิบัติงานเรียบร้อย ทำความสะอาดห้องเรียนสมบูรณ์หลังใช้บริการ'}
                      </td>
                      {/* Maintenance Officer Signature status */}
                      <td className="border border-neutral-950 p-2.5">
                        <div className="flex flex-col items-center justify-center leading-none text-blue-800 select-none">
                          <span className="font-serif italic font-black text-[14px] -rotate-3 text-blue-800 scale-105 tracking-wider">
                            อิทธิพงศ์
                          </span>
                          <span className="text-[8.5px] text-neutral-500 mt-1 pb-0.5">
                            (M.O. ตรวจทานเรียบร้อย)
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {/* Pad empty lines to look like empty rows in notebook if records are few */}
                {Array.from({ length: Math.max(0, 8 - records.length) }).map((_, i) => (
                  <tr key={`empty-${i}`} className="text-[11px] h-12">
                    <td className="border border-neutral-950 p-2.5 font-mono text-neutral-300">/......../......../</td>
                    <td className="border border-neutral-950 p-2.5 text-neutral-300">........................</td>
                    <td className="border border-neutral-950 p-2.5 text-neutral-300">........................</td>
                    <td className="border border-neutral-950 p-2.5 text-left pl-4 text-neutral-300">................................................................................................................</td>
                    <td className="border border-neutral-950 p-2.5 text-neutral-300">........................</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Verification End block matching Photo 2 hand-written checklist styles */}
            <div className="mt-10 flex justify-between items-start">
              <div className="text-[9.5px] text-neutral-500 max-w-[500px]">
                <span className="font-semibold block">คำชี้แนะการกรอกสมุดบันทึก:</span>
                <p>1. กรอกรายละเอียดทันทีหลังจากปฏิบัติงานเสร็จสิ้นในแต่ละช่วงวัน / คาบปฏิบัติการ</p>
                <p>2. แจ้งเบาะแสหรือข้อบกพร่องแอร์, ระบบกำลังไฟฟ้า, เครื่องมือดับเพลิง แก่ Maintenance Officer สังเกตการซ่อมบำรุง</p>
              </div>
              <div className="flex flex-col items-center text-center space-y-1.5 text-black font-sans text-xs mr-4">
                <span className="block mb-6 text-[10px] font-bold">รับรองโดย Maintenance Officer</span>
                <div className="relative w-48 border-b border-dotted border-black flex justify-center items-center h-8">
                  <div className="absolute text-blue-850 font-serif italic text-[15px] select-none font-black -rotate-3 pl-2 tracking-widest">
                    อิทธิพงศ์
                  </div>
                </div>
                <span className="text-[10px] text-neutral-500 font-semibold">( นายอิทธิพงศ์ สังวรณ์ )</span>
                <span className="text-[9px] text-neutral-400">Maintenance Lead Certifier</span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center text-[10.5px] text-neutral-500 font-sans mt-8 pt-3 border-t border-neutral-300 select-none">
              <span>Effective date {formatEffectiveDate(latestCertifiedDate)}, Rev.00</span>
              <span className="font-bold">Page 1 of 1</span>
            </div>
          </div>
        </div>

        <div className="bg-neutral-50 p-4 border-t border-neutral-200 flex justify-end gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-neutral-950 hover:bg-neutral-800 text-white font-sans text-xs font-bold py-2 px-4 rounded-md transition-colors cursor-pointer"
          >
            <Printer size={14} />
            <span>สั่งพิมพ์เอกสาร PDF (A4)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface TraceabilityToolsLogDocProps {
  records: BorrowRecord[];
  onClose: () => void;
}

export function TraceabilityToolsLogDoc({ records, onClose }: TraceabilityToolsLogDocProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 no-print animate-fade-in">
      {/* Dynamic Landscape Print Setup for TLTC-MO-001 */}
      <style>{`
        @media print {
          .print-landscape-mo001 {
            width: 297mm !important;
            height: 210mm !important;
            max-width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            padding: 10mm !important;
            background: white !important;
          }
          @page {
            size: landscape;
            margin: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl overflow-hidden flex flex-col border border-neutral-200">
        <div className="bg-neutral-950 text-white p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-rose-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">PDF GENERATOR</span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider">สมุดทะเบียนการยืม-คืนเครื่องมือช่างอากาศยาน (TLTC-MO-001) [แนวนอน]</span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white text-xs cursor-pointer font-extrabold flex items-center gap-1 border border-neutral-700 px-2.5 py-1 rounded"
          >
            <X size={12} />
            <span>ปิด</span>
          </button>
        </div>

        {/* Printable Area Cover - dynamic overflow-auto for landscape sheet preview */}
        <div className="p-8 bg-neutral-100 flex-1 overflow-auto flex justify-start lg:justify-center">
          
          {/* A4 Landscape Sheet Container (297mm x 210mm) */}
          <div className="w-[297mm] min-h-[210mm] shrink-0 bg-white border border-neutral-350 p-[12mm] flex flex-col justify-between shadow-sm relative text-black print-landscape-mo001 selection:bg-neutral-150">
            <div>
              {/* Header Grid Table style matching actual standard */}
              <div className="border border-black grid grid-cols-12 text-center text-xs mb-4">
                <div className="col-span-3 border-r border-black p-3.5 flex flex-col items-center justify-center">
                  <ThalangLogo className="w-14 h-14" />
                  <span className="text-[8px] font-sans font-black mt-1 tracking-widest text-black">TLTC AMTO</span>
                </div>
                
                <div className="col-span-6 border-r border-black p-3 flex flex-col justify-center items-center">
                  <span className="font-sans font-black text-[10.5px] leading-tight text-neutral-950 uppercase tracking-tight block">
                    TLTC AIRCRAFT MAINTENANCE TRAINING ORGANIZATION
                  </span>
                  <div className="h-0.5 w-16 bg-black my-1.5" />
                  <span className="font-sans font-black text-xs sm:text-sm tracking-wider text-neutral-950 block">
                    TRACEABILITY TOOLS LOG (TLTC-MO-001)
                  </span>
                </div>
                
                <div className="col-span-3 text-left p-3.5 flex flex-col justify-center gap-1.5 text-[9.5px] font-sans">
                  <div className="flex justify-between">
                    <span className="font-semibold text-neutral-500">Dept:</span>
                    <span className="font-bold text-neutral-950 uppercase text-[9px]">Maintenance Office</span>
                  </div>
                  <div className="border-t border-dashed border-neutral-200 my-0.5" />
                  <div className="flex justify-between">
                    <span className="font-semibold text-neutral-500">Doc No:</span>
                    <span className="font-bold text-rose-700 font-mono text-[10px]">TLTC-MO-001</span>
                  </div>
                </div>
              </div>

              {/* Document Info Subheader */}
              <div className="flex justify-between items-center text-[10px] mb-3 text-neutral-600 bg-neutral-50 p-2 border border-neutral-300 rounded font-sans font-medium">
                <p>
                  * สารบบสมุดรับรองตรวจจับประวัติยืม-คืนเครื่องมือและอุปกรณ์ตรวจสอบย้อนกลับ (Traceability Verification Log Segment)
                </p>
                <span className="font-extrabold text-neutral-950 font-mono">
                  รวมบันทึก: {records.length} แถว
                </span>
              </div>

              {/* Main Log Table */}
              <table className="w-full text-left border-collapse border border-black max-w-full text-[8.5px] leading-snug">
                <thead>
                  <tr className="bg-neutral-50 text-[8px] sm:text-[8.5px] font-sans font-black text-center uppercase text-neutral-950 border-b border-black">
                    <th className="py-2 px-0.5 border-r border-black font-semibold text-center w-[12%]">Date / Time Out</th>
                    <th className="py-2 px-1 border-r border-black font-semibold text-left w-[24%]">Description of Tool</th>
                    <th className="py-2 px-0.5 border-r border-black font-semibold text-center w-[11%]">QR Code</th>
                    <th className="py-2 px-0.5 border-r border-black font-semibold text-center w-[5%]">Qty</th>
                    <th className="py-2 px-0.5 border-r border-black font-semibold text-center w-[11%]">Location</th>
                    <th className="py-2 px-1 border-r border-black font-semibold w-[13%]">Borrow Signature</th>
                    <th className="py-2 px-0.5 border-r border-black font-semibold text-center w-[12%]">Date / Time In</th>
                    <th className="py-2 px-1 border-r border-black font-semibold w-[13%]">Return Signature</th>
                    <th className="py-2 px-0.5 font-semibold text-center w-[11%]">Checked By</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec) => (
                    <tr key={rec.id} className="border-b border-black text-neutral-950 h-10 text-center">
                      {/* 1. Date Out */}
                      <td className="py-1 px-0.5 border-r border-black font-mono text-[7px] leading-tight text-center">
                        {rec.borrowDate}
                      </td>
                      
                      {/* 2. Tool Description */}
                      <td className="py-1 px-1 border-r border-black text-left font-sans font-bold text-neutral-950 uppercase truncate max-w-[150px]">
                        {rec.toolName}
                      </td>
                      
                      {/* 3. QR Code / P/N */}
                      <td className="py-1 px-0.5 border-r border-black font-mono font-bold text-[7.5px]">
                        {rec.equipmentCode}
                      </td>
                      
                      {/* 4. Qty */}
                      <td className="py-1 px-0.5 border-r border-black font-mono font-black text-[9px]">
                        {rec.qty}
                      </td>
                      
                      {/* 5. Location */}
                      <td className="py-1 px-0.5 border-r border-black font-sans text-neutral-700 uppercase text-[7.5px]">
                        {rec.toolLocation || 'Board 4'}
                      </td>
                      
                      {/* 6. Borrow Signature Image */}
                      <td className="py-1 px-1 border-r border-black text-center flex flex-col justify-center items-center gap-0.5 h-10">
                        {rec.borrowSignature ? (
                          <img
                            src={rec.borrowSignature}
                            alt="Borrow Sig"
                            className="h-5 w-auto object-contain select-none max-w-[65px]"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="h-4 w-10 border-b border-neutral-300 border-dashed" />
                        )}
                        <span className="text-[6.5px] text-neutral-500 font-sans truncate max-w-[65px] leading-none block">
                          {rec.borrowerName}
                        </span>
                      </td>
                      
                      {/* 7. Date In */}
                      <td className="py-0.5 px-0.5 border-r border-black font-mono text-[7px] leading-tight">
                        {rec.status === 'Returned' ? rec.returnDate : '-'}
                      </td>
                      
                      {/* 8. Return Student Signature */}
                      <td className="py-1 px-1 border-r border-black text-center flex flex-col justify-center items-center gap-0.5 h-10">
                        {(rec.status === 'Returned' || rec.status === 'PendingReturn') ? (
                          rec.returnSignature ? (
                            <img
                              src={rec.returnSignature}
                              alt="Return Sig"
                              className="h-5 w-auto object-contain select-none max-w-[65px]"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <img
                              src={rec.borrowSignature}
                              alt="Return Sig"
                              className="h-5 w-auto object-contain select-none max-w-[65px]"
                              referrerPolicy="no-referrer"
                            />
                          )
                        ) : (
                          <div className="h-4 w-10 border-b border-neutral-300 border-dashed" />
                        )}
                        <span className="text-[6.5px] text-neutral-500 font-sans truncate max-w-[65px] leading-none block">
                          {(rec.status === 'Returned' || rec.status === 'PendingReturn') ? rec.borrowerName : '-'}
                        </span>
                      </td>
                      
                      {/* 9. Checked by Maintenance Inspector (แสดงเฉพาะหลังเซ็นรับรับรองการส่งคืนเสร็จสิ้น) */}
                      <td className="py-1 px-1 text-center flex flex-col justify-center items-center gap-0.5 h-10">
                        {rec.status === 'Returned' && rec.checkSignature ? (
                          <img
                            src={rec.checkSignature}
                            alt="Checker Sig"
                            className="h-5 w-auto object-contain select-none max-w-[60px]"
                            referrerPolicy="no-referrer"
                          />
                        ) : rec.status === 'Returned' ? (
                          <span className="text-[6.5px] text-emerald-700 font-bold uppercase block leading-none">CLEARED</span>
                        ) : (
                          <span className="text-[7px] text-neutral-350 font-sans">-</span>
                        )}
                        <span className="text-[6px] font-sans text-neutral-500 truncate max-w-[60px] leading-none block font-semibold">
                          {rec.status === 'Returned' ? (rec.checkerName || 'Inspector') : ''}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {/* Empty fallback rows to preserve standard paper length */}
                  {Array.from({ length: Math.max(0, 12 - records.length) }).map((_, index) => (
                    <tr key={`empty_row_${index}`} className="border-b border-black text-neutral-300 h-10 text-center">
                      <td className="border-r border-black font-mono text-[7px]">-</td>
                      <td className="border-r border-black font-sans text-left px-2 italic text-neutral-350">-</td>
                      <td className="border-r border-black font-mono text-[7px]">-</td>
                      <td className="border-r border-black font-mono text-[7px]">-</td>
                      <td className="border-r border-black font-sans text-neutral-350">-</td>
                      <td className="border-r border-black text-center flex flex-col justify-center items-center h-10 text-[7px]">-</td>
                      <td className="border-r border-black font-mono text-[7px]">-</td>
                      <td className="border-r border-black text-center flex flex-col justify-center items-center h-10 text-[7px]">-</td>
                      <td className="text-center h-10 text-[7px]">-</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Rules and verification flow section */}
              <div className="mt-8 flex justify-between items-start text-[9.5px] font-sans">
                <div className="max-w-[420px] text-neutral-500 leading-relaxed text-[8.5px]">
                  <span className="font-extrabold text-neutral-800 block text-[9px] mb-1">คำชี้แจงระเบียบรายงานยืมและรับคืนสิ่งอำนวยความสะดวก:</span>
                  <p>1. แบบฟอร์มชุดนี้เป็นหนึ่งในขั้นตอนประกันคุณภาพของฝ่ายสลักการบิน (AMTO Traceability Compliance)</p>
                  <p>2. การรับอนุมัติคืนแบบดิจิทัลจะเปลี่ยนสถานะเครื่องมือในคลังกองซ่อมบำรุงเป็น Ready ทันที</p>
                  <p>3. ห้ามนักศึกษานำเครื่องมือชิ้นแกนออกไปใช้นอกน่านปฏิบัติการในร่ม หากไม่มีอาจารย์ผู้คุมประเมินสถานการณ์</p>
                </div>

                <div className="flex flex-col items-center text-center space-y-1 text-black font-sans w-52">
                  <span className="block mb-6 text-[8.5px] font-extrabold text-neutral-800 uppercase tracking-tight">Certified by Lead Maintenance Officer</span>
                  <div className="relative w-40 border-b border-neutral-900 border-dotted h-8 flex justify-center items-center">
                    <div className="absolute text-emerald-800 font-medium font-serif italic text-xs -rotate-2 select-none">
                      อิทธิพงศ์ สังวรณ์
                    </div>
                  </div>
                  <span className="text-[9.5px] font-bold text-neutral-900 leading-none mt-1">นายอิทธิพงศ์ สังวรณ์</span>
                  <span className="text-[8px] text-neutral-500">Lead Maintenance Quality Officer</span>
                </div>
              </div>
            </div>

            {/* Footer Form Standard info */}
            <div className="flex justify-between items-center text-[8.5px] text-neutral-400 font-sans mt-8 pt-2 select-none border-t border-neutral-200">
              <span>Effective Date: 23/04/25, Rev.01</span>
              <span>TLTC-MO-001 / Traceability Tools Control Sheet</span>
              <span className="font-extrabold">Page 1 of 1</span>
            </div>
          </div>
        </div>

        <div className="bg-neutral-50 p-4 border-t border-neutral-200 flex justify-end gap-2 no-print">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-neutral-950 hover:bg-neutral-850 text-white font-sans text-xs font-bold py-2.5 px-5 rounded transition-transform duration-100 active:scale-95 cursor-pointer shadow-sm"
          >
            <Printer size={14} />
            <span>สั่งพิมพ์รายงาน (A4 PDF แนวนอน)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
