/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, RoomRequest, RoomUsageRecord, BorrowRecord, Equipment, ClassSchedule } from '../types';
import { 
  Users, UserCheck, ShieldAlert, CheckCircle, XCircle, 
  Plus, Printer, Key, Eye, ToggleLeft, ToggleRight, Settings, Info,
  Camera, QrCode, Search, Award, BookOpen, RefreshCw, Wrench, Edit2, Trash2, Calendar, FileText
} from 'lucide-react';
import Swal from 'sweetalert2';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  getAppOriginForQR,
  getGoogleScriptUrl,
  saveGoogleScriptUrl,
  syncWithGoogleSheets,
  pullFromGoogleSheets,
  mergeDatabases,
  DEFAULT_GOOGLE_SCRIPT_URL,
  APIService
} from '../lib/api';
import { TraceabilityToolsLogDoc } from './Documents';

interface AdminPanelProps {
  users: User[];
  roomRequests: RoomRequest[];
  roomUsageRecords: RoomUsageRecord[];
  borrowRecords: BorrowRecord[];
  equipment: Equipment[];
  schedules: ClassSchedule[];
  onApproveUser: (userId: string) => void;
  onRejectUser: (userId: string) => void;
  onUpdateUserStatus: (userId: string, newStatus: User['status']) => void;
  onToggleRecordStatus: (recId: string) => void;
  onViewStudentCard: (user: User) => void;
  onViewRequestDoc: (req: RoomRequest) => void;
  onPrintUsageRecords: () => void;
  onReloadDb?: () => void;
  onAddUser?: (newUser: User) => void;
  onUpdateUser?: (updatedUser: User) => void;
  onDeleteUser?: (userId: string) => void;
  onAddEquipment?: (eq: Equipment) => void;
  onDeleteEquipment?: (code: string) => void;
  onAddSchedule?: (sch: ClassSchedule) => void;
  onDeleteSchedule?: (id: string) => void;
}

export default function AdminPanel({
  users,
  roomRequests,
  roomUsageRecords,
  borrowRecords,
  equipment = [],
  schedules = [],
  onApproveUser,
  onRejectUser,
  onUpdateUserStatus,
  onToggleRecordStatus,
  onViewStudentCard,
  onViewRequestDoc,
  onPrintUsageRecords,
  onReloadDb,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onAddEquipment,
  onDeleteEquipment,
  onAddSchedule,
  onDeleteSchedule
}: AdminPanelProps) {
  const [subTab, setSubTab] = useState<'users' | 'rooms' | 'records' | 'verify' | 'equipment' | 'schedules'>('users');
  const [filterBatch, setFilterBatch] = useState<string>('All');
  const [showTraceabilityDoc, setShowTraceabilityDoc] = useState(false);
  const [sheetsUrl, setSheetsUrl] = useState<string>(getGoogleScriptUrl());
  const [showSheetsConfig, setShowSheetsConfig] = useState(false);

  // --- Dynamic Admin Forms States ---
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserRole, setNewUserRole] = useState<User['role']>('นักศึกษา');
  const [newUserBatch, setNewUserBatch] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserStatus, setNewUserStatus] = useState<User['status']>('Active');

  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Equipment Form states
  const [showAddEquipmentForm, setShowAddEquipmentForm] = useState(false);
  const [newEqName, setNewEqName] = useState('');
  const [newEqPart, setNewEqPart] = useState('');
  const [newEqSerial, setNewEqSerial] = useState('');
  const [newEqCode, setNewEqCode] = useState('');
  const [newEqQty, setNewEqQty] = useState(1);
  const [newEqLocation, setNewEqLocation] = useState('Workspace 1');
  const [newEqRemark, setNewEqRemark] = useState('');

  // Class Schedule Form states
  const [showAddScheduleForm, setShowAddScheduleForm] = useState(false);
  const [newSchBatch, setNewSchBatch] = useState('');
  const [newSchSubjCode, setNewSchSubjCode] = useState('');
  const [newSchSubjName, setNewSchSubjName] = useState('');
  const [newSchInstructor, setNewSchInstructor] = useState('');
  const [newSchDay, setNewSchDay] = useState<ClassSchedule['dayOfWeek']>('จันทร์');
  const [newSchStart, setNewSchStart] = useState('08:30');
  const [newSchEnd, setNewSchEnd] = useState('16:30');

  // Verify Student state
  const [verifySearchId, setVerifySearchId] = useState('');
  const [verifyUser, setVerifyUser] = useState<User | null>(null);
  const [isVerifyCameraActive, setIsVerifyCameraActive] = useState(false);
  const [adminCameraFacingMode, setAdminCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [verifyCameraError, setVerifyCameraError] = useState<string | null>(null);

  // Camera handling for QR code simulation/reading
  React.useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    let isMounted = true;

    if (isVerifyCameraActive) {
      setVerifyCameraError(null);
      
      const startScanner = async () => {
        // Wait briefly for React to render the scanner container div
        await new Promise((resolve) => setTimeout(resolve, 300));
        if (!isMounted) return;

        try {
          const container = document.getElementById('admin-verify-reader');
          if (!container) {
            throw new Error('ไม่พบตำแหน่งแผงแสดงผลกล้องเครื่องสแกน');
          }
          
          html5QrCode = new Html5Qrcode('admin-verify-reader');
          await html5QrCode.start(
            { facingMode: adminCameraFacingMode },
            {
              fps: 15,
              qrbox: (w, h) => {
                const size = Math.min(w, h, 250);
                return { width: size, height: size };
              }
            },
            (decodedText) => {
              // On scanned successfully:
              handleSimulateQRScan(decodedText);
            },
            () => {
              // Quietly bypass non-match frames
            }
          );
        } catch (err: any) {
          console.error('Error starting Admin Html5Qrcode engine:', err);
          setVerifyCameraError(err.message || 'ไม่สามารถเข้าถึงอุปกรณ์กล้องได้ โปรดอนุมัติสิทธิ์การใช้งานกล้องในเบราว์เซอร์');
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
  }, [isVerifyCameraActive, adminCameraFacingMode]);

  const handleSimulateQRScan = (qrData: string) => {
    const cleanQR = qrData.trim();
    let parsedId = '';
    
    // Check if the QR encodes a URL and extract parameter
    if (cleanQR.startsWith('http://') || cleanQR.startsWith('https://') || cleanQR.includes('//') || cleanQR.includes('/?')) {
      try {
        let urlText = cleanQR;
        if (!urlText.startsWith('http://') && !urlText.startsWith('https://')) {
          urlText = 'https://' + urlText;
        }
        const urlObj = new URL(urlText);
        const idParam = urlObj.searchParams.get('id') || urlObj.searchParams.get('verifyId') || urlObj.searchParams.get('data');
        if (idParam) {
          parsedId = idParam.trim();
        }
      } catch (e) {
        console.error("AdminPanel URL extraction fallback to regex error:", e);
      }
    }

    // Regex Fallback if standard URL parser fails to detect ID
    if (!parsedId) {
      try {
        const idMatch = cleanQR.match(/[?&]id=([^&?#]+)/i) || cleanQR.match(/id=([^&?#]+)/i);
        const dataMatch = cleanQR.match(/[?&]data=([^&?#]+)/i) || cleanQR.match(/data=([^&?#]+)/i);
        const verifyIdMatch = cleanQR.match(/[?&]verifyId=([^&?#]+)/i) || cleanQR.match(/verifyId=([^&?#]+)/i);

        if (idMatch && idMatch[1]) {
          parsedId = decodeURIComponent(idMatch[1]).trim();
        } else if (dataMatch && dataMatch[1]) {
          parsedId = decodeURIComponent(dataMatch[1]).trim();
        } else if (verifyIdMatch && verifyIdMatch[1]) {
          parsedId = decodeURIComponent(verifyIdMatch[1]).trim();
        }
      } catch (e) {
        console.error("Admin regex extraction error:", e);
      }
    }

    if (!parsedId) {
      parsedId = cleanQR;
    }

    // Now extract ID if it has the prefix
    if (parsedId.toUpperCase().includes('AMT-CONNECT-VERIFY:')) {
      parsedId = parsedId.split(/AMT-CONNECT-VERIFY:/i)[1];
    }
    
    // Trim and clean possible enclosing quotes
    parsedId = parsedId.trim().replace(/^['"\[\]]|['"\[\]]$/g, '').trim();

    const found = users.find(u => {
      const uIdClean = u.id.trim().toLowerCase();
      const scannedIdClean = parsedId.toLowerCase();
      return uIdClean === scannedIdClean || uIdClean === scannedIdClean.replace(/\D/g, '') || scannedIdClean === uIdClean.replace(/\D/g, '');
    });

    if (found) {
      setVerifyUser(found);
      setVerifySearchId(found.id);
      Swal.fire({
        icon: 'success',
        title: 'สแกนสำเร็จ (QR Scanned Completed)',
        text: `ตรวจวิเคราะห์รหัสสิทธิ์: ${found.firstName} ${found.lastName} (${found.role})`,
        timer: 1500,
        showConfirmButton: false
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'ไม่พบบัญชีผู้ใช้ในระบบ',
        html: `
          <div class="text-left text-xs space-y-2 select-text font-sans text-neutral-800">
            <p><strong>รหัสที่ถอดความได้ (Decoded ID):</strong> <code class="bg-neutral-100 px-1 py-0.5 rounded font-mono text-xs font-bold">${parsedId || 'ว่างเปล่า'}</code></p>
            <p class="text-neutral-500 text-[11px] leading-relaxed">
              รหัสจำลองนี้ไม่มีรายชื่ออยู่ในสารบัญสิทธิของระบบ โปรดลงทะเบียนก่อนสแกน
            </p>
            <p class="text-neutral-400 text-[10px] break-all">ข้อมูลดิบ: "${qrData}"</p>
          </div>
        `,
        confirmButtonColor: '#171717'
      });
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = verifySearchId.trim();
    const found = users.find(u => u.id === cleanId || u.id.toLowerCase() === cleanId.toLowerCase());
    if (found) {
      setVerifyUser(found);
      Swal.fire({
        icon: 'success',
        title: 'ค้นพบข้อมูลผู้ใช้',
        text: `ระบบทำการโหลดบัตรประจำตัวและตารางสิทธิ์เสร็จสิ้น`,
        timer: 1000,
        showConfirmButton: false
      });
    } else {
      setVerifyUser(null);
      Swal.fire({
        icon: 'error',
        title: 'ไม่พบข้อมูล',
        text: `ไม่พบผู้ใช้ที่ใช้รหัสประจำตัว: ${cleanId}`,
        confirmButtonColor: '#171717'
      });
    }
  };

  // Derive status counters
  const activeStudents = users.filter(u => u.role === 'นักศึกษา' && u.status === 'Active');
  const activePersonnel = users.filter(u => u.role !== 'นักศึกษา' && u.role !== 'Admin' && u.status === 'Active');
  const pendingUsers = users.filter(u => u.status === 'Pending');

  // Hardcoded 10 Hangar/Class Rooms
  const roomsList = [
    'Practical Area in Hangar',
    'Meeting Room',
    'Theoretical Classroom',
    'Library Room',
    'Workshop 1',
    'Workshop 2',
    'Fiberglass Workshop',
    'Examination Room',
    'Aerodynamic Room',
    'Electrical Room'
  ];

  // Helper check if Room is Occupied today by approved request
  const checkRoomStatus = (roomName: string) => {
    // Check if there is an approved request for today (any request with Approved status)
    const approvedUsage = roomRequests.find(
      req => req.room === roomName && req.maintenanceApproved === 'Approved'
    );
    return approvedUsage ? { occupied: true, req: approvedUsage } : { occupied: false };
  };

  // Get cohorts (groups of batches)
  const batches = ['All', ...Array.from(new Set(users.map(u => u.batch).filter(Boolean)))];

  return (
    <div className="space-y-6 text-slate-850 font-sans text-xs animate-fade-in">
      
      {/* 4 Stats Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-350 transition-all duration-200">
          <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">ACTIVE STUDENTS</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">{activeStudents.length}</span>
            <span className="text-slate-500 font-sans text-[10px]">คนกำลังใช้งาน</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-350 transition-all duration-200">
          <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">ACTIVE PERSONNEL</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">{activePersonnel.length}</span>
            <span className="text-slate-500 font-sans text-[10px]">คนคอยสอน/ตรวจ</span>
          </div>
        </div>

        <div className="bg-rose-50/60 p-5 rounded-xl border border-rose-200 shadow-sm flex flex-col justify-between hover:border-rose-300 transition-all duration-200">
          <span className="text-[10px] text-rose-700 font-mono font-bold uppercase tracking-wider">PENDING APPROVALS</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-rose-900 font-mono">{pendingUsers.length}</span>
            <span className="text-rose-700 font-sans text-[10px] font-bold">รออนุมัติสิทธิ์</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-350 transition-all duration-200">
          <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">DOCUMENTS SUMMARY</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              {roomRequests.length + roomUsageRecords.length}
            </span>
            <span className="text-slate-500 font-sans text-[10px]">เอกสารทั้งหมด</span>
          </div>
        </div>
      </div>

      {/* 🚀 Google Sheets Connection URL Configurator (Collapsible) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-3xs space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="text-emerald-500 animate-pulse" size={16} style={{ animationDuration: '3s' }} />
            <div>
              <h4 className="font-sans font-extrabold text-xs text-slate-900">
                ระบบเชื่อมโยงฐานข้อมูล Google Sheets อัตโนมัติ (Real-time Cloud Sync)
              </h4>
              <p className="text-[10px] text-slate-500">
                บันทึก สั่งจอง หรือทำรายการใดๆ จะประสานเข้า Google Sheets ทันที คุณสามารถปรับแต่งพิกัดคลาวด์ได้ที่นี่
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSheetsConfig(!showSheetsConfig)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-705 font-sans font-bold text-[10px] cursor-pointer flex items-center gap-1 transition-colors active:scale-95"
          >
            <Settings size={12} className={showSheetsConfig ? "rotate-45" : ""} />
            <span>{showSheetsConfig ? 'ซ่อนการประสานงาน' : 'ตั้งค่าเชื่อมต่อ Google Sheets ส่วนตัว'}</span>
          </button>
        </div>

        {showSheetsConfig && (
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3.5 animate-fade-in text-left">
            <label className="block text-xs font-extrabold text-slate-900 font-sans">
              🔗 ที่อยู่เว็บแอป Google Apps Script (Web App URL):
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                required
                placeholder="https://script.google.com/macros/s/.../exec"
                value={sheetsUrl}
                onChange={(e) => setSheetsUrl(e.target.value)}
                className="flex-1 min-w-0 border border-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-905 text-xs bg-white font-mono text-slate-900 shadow-3xs"
              />
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (!sheetsUrl.trim() || !sheetsUrl.startsWith('https://script.google.com')) {
                      Swal.fire({
                        icon: 'error',
                        title: 'URL ไม่ถูกต้อง',
                        text: 'กรุณาใส่ที่อยู่ Web App URL ที่ตรงตามรูปแบบขึ้นต้นด้วย https://script.google.com',
                        confirmButtonColor: '#0F172A'
                      });
                      return;
                    }
                    saveGoogleScriptUrl(sheetsUrl);
                    Swal.fire({
                      icon: 'success',
                      title: 'บันทึกเรียบร้อย!',
                      text: 'ระบบตั้งค่าให้เชื่อมฐานข้อมูลคลาวน์ตัวใหม่เสร็จสิ้น ข้อมูลจะประสานอัตโนมัติต่อไป',
                      timer: 2000,
                      showConfirmButton: false
                    });
                  }}
                  className="bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer transition-colors active:scale-95 shadow-3xs shrink-0 font-sans"
                >
                  บันทึก URL ใหม่
                </button>
                
                {sheetsUrl !== DEFAULT_GOOGLE_SCRIPT_URL && (
                  <button
                    type="button"
                    onClick={() => {
                      setSheetsUrl(DEFAULT_GOOGLE_SCRIPT_URL);
                      saveGoogleScriptUrl(DEFAULT_GOOGLE_SCRIPT_URL);
                      Swal.fire({
                        icon: 'info',
                        title: 'คืนค่าเริ่มแรกสำเร็จ',
                        text: 'สล็อตประสานงานกลับไปใช้สเปรดชีตหลักตั้งต้น',
                        timer: 2000,
                        showConfirmButton: false
                      });
                    }}
                    className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold text-xs px-3 py-2 rounded-lg cursor-pointer transition-colors active:scale-95"
                    title="คืนค่าเริ่มต้น"
                  >
                    <RefreshCw size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  Swal.fire({
                    title: 'กำลังตรวจสอบและส่งฐานข้อมูล...',
                    text: 'ความยาวฐานข้อมูลและสิทธิ์กำลังประสานเข้า Google Sheets ของคุณ',
                    allowOutsideClick: false,
                    didOpen: () => {
                      Swal.showLoading();
                    }
                  });

                  const currentDb = APIService.getDb();
                  const success = await syncWithGoogleSheets(currentDb);
                  Swal.close();

                  if (success) {
                    Swal.fire({
                      icon: 'success',
                      title: 'ส่งไป Google Sheets สำเร็จ!',
                      text: 'ตรวจสอบข้อมูลในแผ่นงานสเปรดชีตของคุณได้ทันที',
                      confirmButtonColor: '#0F172A'
                    });
                  } else {
                    Swal.fire({
                      icon: 'warning',
                      title: 'เชื่อมต่อแบบจำกัด (CORS Restricted/no-cors mode)',
                      text: 'ส่งข้อมูลเรียบร้อยแล้ว แต่อุปกรณ์ไม่สามารถอ่านรายละเอียดกลับมาได้โดยตรง โปรดตรวจสอบที่ Google Sheets ของคุณว่ามีข้อมูลสอดคล้องกันเรียบร้อยแล้ว',
                      confirmButtonColor: '#0F172A'
                    });
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg cursor-pointer transition-all active:scale-95 font-sans"
              >
                <RefreshCw size={13} className="animate-spin" style={{ animationDuration: '4s' }} />
                <span>ประสานและอัปโหลดฐานข้อมูลขึ้นสเปรดชีตทันที (Force Sync)</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  Swal.fire({
                    title: 'กำลังดึงฐานข้อมูลลงมา...',
                    text: 'ดาวน์โหลดประวัติทั้งหมดเพื่ออัปเดตระบบแอปบนอุปกรณ์นี้',
                    allowOutsideClick: false,
                    didOpen: () => {
                      Swal.showLoading();
                    }
                  });

                  const fetchedData = await pullFromGoogleSheets();
                  Swal.close();

                  if (fetchedData && typeof fetchedData === 'object') {
                    const currentDb = APIService.getDb();
                    const mergedDb = mergeDatabases(currentDb, fetchedData);
                    
                    APIService.saveDb(mergedDb);
                    if (onReloadDb) {
                      onReloadDb();
                    }

                    Swal.fire({
                      icon: 'success',
                      title: 'ดึงข้อมูลเรียบร้อย!',
                      text: `ดาวน์โหลดข้อมูลสำเร็จ: บัญชีผู้ใช้งาน ${mergedDb.users.length} คน, อุปกรณ์ช่างและข้อมูลสำรองทั้งหมดพร้อมใช้งาน`,
                      confirmButtonColor: '#0F172A'
                    });
                  } else {
                    Swal.fire({
                      icon: 'error',
                      title: 'ดึงข้อมูลไม่สำเร็จ',
                      text: 'โปรดตรวจสอบความถูกต้องของ URL, เช็คการทำสิทธิ์ "Everyone (ทุกคน)" ใน Apps Script ของคุณ',
                      confirmButtonColor: '#0F172A'
                    });
                  }
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg cursor-pointer transition-all active:scale-95 font-sans"
              >
                <BookOpen size={13} className="text-emerald-400" />
                <span>ดึงฐานข้อมูลเดิมลงเครื่องนี้ (Pull Base Data)</span>
              </button>
            </div>
            
            <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
              💡 <b>เมื่อย้ายโฮสต์ไป Cloudflare Pages & GitHub:</b> คุณสามารถนำ URL ของ Apps Script เดิมของคุณ ไปป้อนที่กล่องข้อมูลด้านบนบนอุปกรณ์ใหม่ได้ทันที และกดปุ่มดึงข้อมูลฐานข้อมูลเดิมเพื่อซิงค์ประวัติ ยื่นคำร้อง ตาราง คลังข้อมูลกลับสู่บราวเซอร์ของคุณได้โดยอัตโนมัติ โดยไม่ต้องมาเพิ่มข้อมูลใหม่เลย!
            </p>
          </div>
        )}
      </div>

      {/* Admin Action Sub-navigation tabs */}
      <div className="flex bg-white hover:bg-slate-50/50 p-1 rounded-xl border border-slate-200 shadow-sm gap-1 overflow-x-auto shrink-0">
        <button
          id="adminUsersTabBtn"
          onClick={() => setSubTab('users')}
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-lg font-sans font-bold text-center text-xs transition-colors cursor-pointer whitespace-nowrap ${
            subTab === 'users' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-500 hover:text-slate-905 hover:bg-slate-50'
          }`}
        >
          จัดสิทธิ์และรายชื่อคนเข้าใช้
        </button>
        <button
          id="adminRoomsTabBtn"
          onClick={() => setSubTab('rooms')}
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-lg font-sans font-bold text-center text-xs transition-colors cursor-pointer whitespace-nowrap ${
            subTab === 'rooms' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-500 hover:text-slate-905 hover:bg-slate-50'
          }`}
        >
          ตรวจสอบสถานะห้องพักวันนี้
        </button>
        <button
          id="adminRecordsTabBtn"
          onClick={() => setSubTab('records')}
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-lg font-sans font-bold text-center text-xs transition-colors cursor-pointer whitespace-nowrap ${
            subTab === 'records' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-500 hover:text-slate-905 hover:bg-slate-50'
          }`}
        >
          เอกสารทั้งหมด
        </button>
        <button
          id="adminEquipmentTabBtn"
          onClick={() => setSubTab('equipment')}
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-lg font-sans font-bold text-center text-xs transition-colors cursor-pointer whitespace-nowrap ${
            subTab === 'equipment' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-500 hover:text-slate-905 hover:bg-slate-50'
          }`}
        >
          คลังเครื่องมือช่างอากาศยาน
        </button>
        <button
          id="adminSchedulesTabBtn"
          onClick={() => setSubTab('schedules')}
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-lg font-sans font-bold text-center text-xs transition-colors cursor-pointer whitespace-nowrap ${
            subTab === 'schedules' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-500 hover:text-slate-905 hover:bg-slate-50'
          }`}
        >
          วิชาเรียนและตารางสอบ
        </button>
        <button
          id="adminVerifyTabBtn"
          onClick={() => setSubTab('verify')}
          className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-lg font-sans font-bold text-center text-xs transition-colors cursor-pointer whitespace-nowrap ${
            subTab === 'verify' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-500 hover:text-slate-905 hover:bg-slate-50'
          }`}
        >
          สแกนกล้องตรวจสอบสิทธิ์
        </button>
      </div>

      {/* Subtab content 1: USERS */}
      {subTab === 'users' && (
        <div className="space-y-6">
          {/* Admin Command bar */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-left">
            <div>
              <h3 className="font-sans font-extrabold text-xs text-slate-900 flex items-center gap-2">
                <Users size={14} className="text-[#0F172A]" />
                <span>แผงควบคุมสิทธิ์ผู้ใช้งาน AMT Connect ทั้งหมด</span>
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">คุณสามารถเพิ่มรายชื่อเข้าสู่ระบบได้ทันที แก้ไขประวัติ หรือลบผู้ใช้รายบุคคลออกเพื่อบำรุงรักษาสิทธิ์ของสถาบัน</p>
            </div>
            <button
              onClick={() => {
                setShowAddUserForm(!showAddUserForm);
                setEditingUser(null);
              }}
              className="flex items-center gap-1 bg-slate-900 hover:bg-slate-805 text-white font-sans text-[10px] font-bold px-3 py-2 rounded-lg cursor-pointer transition-all active:scale-95 shadow-xs"
            >
              <Plus size={12} />
              <span>เพิ่มผู้ใช้ใหม่โดยตรง</span>
            </button>
          </div>

          {/* New User Addition Form Card */}
          {showAddUserForm && (
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-300 shadow-sm animate-fade-in space-y-4 text-left">
              <h4 className="font-extrabold text-xs text-slate-905 uppercase tracking-wider font-mono">➕ เพิ่มสิทธิ์ผู้ใช้ใหม่เข้าฐานข้อมูลโดยตรง (Internal Direct Registration)</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">รหัสประจำตัว (User ID) *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น 67010214 หรือ STAFF99"
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    className="w-full border border-slate-300 px-3 py-1.5 rounded bg-white text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">ชื่อจริง (First Name) *</label>
                  <input
                    type="text"
                    required
                    placeholder="ป้อนชื่อจริง"
                    value={newUserFirstName}
                    onChange={(e) => setNewUserFirstName(e.target.value)}
                    className="w-full border border-slate-300 px-3 py-1.5 rounded bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">นามสกุล (Last Name) *</label>
                  <input
                    type="text"
                    required
                    placeholder="ป้อนนามสกุล"
                    value={newUserLastName}
                    onChange={(e) => setNewUserLastName(e.target.value)}
                    className="w-full border border-slate-300 px-3 py-1.5 rounded bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">ตำแหน่งหน้าที่ (System Role) *</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as any)}
                    className="w-full border border-slate-300 px-3 py-1.5 rounded bg-white text-slate-900 font-sans cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="นักศึกษา">นักศึกษา</option>
                    <option value="Admin">Admin (ผู้ดูแลระบบหลัก)</option>
                    <option value="Training Manager">Training Manager (ผู้บริหารแผนกฝึกอบรม)</option>
                    <option value="Training Staff">Training Staff (เจ้าหน้าที่ฝึกอบรม)</option>
                    <option value="Maintenance Manager">Maintenance Manager (ผู้ดูแลโรงงานและเครื่องมือ)</option>
                    <option value="Maintenance Staff">Maintenance Staff (ช่างเทคนิค/เจ้าหน้าที่โรงงาน)</option>
                    <option value="Examination Manager">Examination Manager (ผู้ควบคุมการทดสอบ)</option>
                    <option value="Examination Staff">Examination Staff (เจ้าหน้าที่การสอบ)</option>
                    <option value="Office Manager">Office Manager (หัวหน้ากองธุรการ)</option>
                    <option value="Office Staff">Office Staff (เจ้าหน้าที่สารบรรณ)</option>
                  </select>
                </div>
                {newUserRole === 'นักศึกษา' && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">รุ่นนักศึกษา (Batch) *</label>
                    <input
                      type="text"
                      required={newUserRole === 'นักศึกษา'}
                      placeholder="เช่น 67"
                      value={newUserBatch}
                      onChange={(e) => setNewUserBatch(e.target.value)}
                      className="w-full border border-slate-300 px-3 py-1.5 rounded bg-white text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">อีเมลผู้ใช้งาน (Email)</label>
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full border border-slate-300 px-3 py-1.5 rounded bg-white text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">รหัสผ่านสำหรับเข้าสู่ระบบ *</label>
                  <input
                    type="password"
                    required
                    placeholder="ระบุรหัสผ่านเข้าเล่นระบบ"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full border border-slate-300 px-3 py-1.5 rounded bg-white text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">สถานะแรกเริ่ม (Status)</label>
                  <select
                    value={newUserStatus}
                    onChange={(e) => setNewUserStatus(e.target.value as any)}
                    className="w-full border border-slate-300 px-3 py-1.5 rounded bg-white text-slate-900 font-sans cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="Active">Active (อนุมัติทันที)</option>
                    <option value="Pending">Pending (รอตรวจสอบ)</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserForm(false)}
                  className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                >
                  ยกเลิกคำร้อง
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!newUserId.trim() || !newUserFirstName.trim() || !newUserLastName.trim() || !newUserPassword.trim()) {
                      Swal.fire('ข้อมูลไม่ครบถ้วน', 'ต้องกรอกรหัสประจำตัว ชื่อจริง นามสกุล และรหัสผ่านสะสมความปลอดภัยให้เรียบร้อย', 'warning');
                      return;
                    }
                    if (onAddUser) {
                      onAddUser({
                        id: newUserId.trim().toUpperCase(),
                        firstName: newUserFirstName.trim(),
                        lastName: newUserLastName.trim(),
                        email: newUserEmail.trim() || `${newUserId.toLowerCase()}@amtconnect.com`,
                        password: newUserPassword,
                        role: newUserRole,
                        batch: newUserRole === 'นักศึกษา' ? newUserBatch.trim() : undefined,
                        photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop',
                        signature: `DRAFT_USER_SIGN_${newUserId}`,
                        status: newUserStatus,
                        createdAt: new Date().toLocaleDateString('th-TH'),
                      });
                      // Clear values
                      setNewUserId('');
                      setNewUserFirstName('');
                      setNewUserLastName('');
                      setNewUserEmail('');
                      setNewUserPassword('');
                      setNewUserBatch('');
                      setShowAddUserForm(false);
                      Swal.fire({
                        icon: 'success',
                        title: 'เพิ่มผู้ใช้สำเร็จ',
                        text: 'รักษาสิทธิ์เรียบร้อย สามารถใช้เป็นสมาคมพิจารณาต่อไป',
                        timer: 1500,
                        showConfirmButton: false
                      });
                    }
                  }}
                  className="px-4 py-1.5 bg-slate-950 text-white hover:bg-slate-800 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                >
                  เพิ่มเข้าสู่คลังฐานข้อมูล
                </button>
              </div>
            </div>
          )}

          {/* User Editor Dialog Inline Block */}
          {editingUser && (
            <div className="bg-amber-50 p-5 rounded-xl border border-amber-300 shadow-sm animate-fade-in space-y-4 text-left text-slate-900">
              <div className="flex justify-between items-center">
                <h4 className="font-extrabold text-xs text-amber-900 uppercase tracking-wider font-mono">✍️ แก้ไข/ปรับเปลี่ยนประวัติ และสิทธิ์เข้าใช้งาน: ID: {editingUser.id}</h4>
                <button onClick={() => setEditingUser(null)} className="text-amber-700 hover:text-amber-905 font-bold font-sans cursor-pointer text-xs">ปิด</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-amber-800 mb-1">ชื่อจริง (First Name) *</label>
                  <input
                    type="text"
                    required
                    value={editingUser.firstName}
                    onChange={(e) => setEditingUser({ ...editingUser, firstName: e.target.value })}
                    className="w-full border border-amber-300 px-3 py-1.5 rounded bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-amber-800 mb-1">นามสกุล (Last Name) *</label>
                  <input
                    type="text"
                    required
                    value={editingUser.lastName}
                    onChange={(e) => setEditingUser({ ...editingUser, lastName: e.target.value })}
                    className="w-full border border-amber-300 px-3 py-1.5 rounded bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-amber-800 mb-1">ตำแหน่งหน้าที่ (System Role)</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                    className="w-full border border-amber-300 px-3 py-1.5 rounded bg-white text-slate-905 font-sans cursor-pointer"
                  >
                    <option value="นักศึกษา">นักศึกษา</option>
                    <option value="Admin">Admin (ผู้ดูแลระบบหลัก)</option>
                    <option value="Training Manager">Training Manager (ผู้บริหารแผนกฝึกอบรม)</option>
                    <option value="Training Staff">Training Staff (เจ้าหน้าที่ฝึกอบรม)</option>
                    <option value="Maintenance Manager">Maintenance Manager (ผู้ดูแลโรงงานและเครื่องมือ)</option>
                    <option value="Maintenance Staff">Maintenance Staff (ช่างเทคนิค/เจ้าหน้าที่โรงงาน)</option>
                    <option value="Examination Manager">Examination Manager (ผู้ควบคุมการทดสอบ)</option>
                    <option value="Examination Staff">Examination Staff (เจ้าหน้าที่การสอบ)</option>
                    <option value="Office Manager">Office Manager (หัวหน้ากองธุรการ)</option>
                    <option value="Office Staff">Office Staff (เจ้าหน้าที่สารบรรณ)</option>
                  </select>
                </div>
                {editingUser.role === 'นักศึกษา' && (
                  <div>
                    <label className="block text-[10px] font-bold text-amber-800 mb-1">รุ่นนักศึกษา (Batch) *</label>
                    <input
                      type="text"
                      required={editingUser.role === 'นักศึกษา'}
                      value={editingUser.batch || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, batch: e.target.value })}
                      className="w-full border border-amber-300 px-3 py-1.5 rounded bg-white text-slate-900 font-mono"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-bold text-amber-800 mb-1">อีเมลสะสมบันทึก (Email)</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full border border-amber-300 px-3 py-1.5 rounded bg-white text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-amber-800 mb-1">รหัสผ่านความปลอดภัย *</label>
                  <input
                    type="password"
                    required
                    value={editingUser.password || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    className="w-full border border-amber-300 px-3 py-1.5 rounded bg-white text-slate-905 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-amber-800 mb-1">สถานะสิทธิ์ในระบบ (Status)</label>
                  <select
                    value={editingUser.status}
                    onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as any })}
                    className="w-full border border-amber-300 px-3 py-1.5 rounded bg-white text-slate-950 font-sans cursor-pointer"
                  >
                    <option value="Pending">Pending (รออนุมัติ)</option>
                    <option value="Active">Active (พร้อมใช้สิทธิ์)</option>
                    <option value="พ้นสภาพ">พ้นสภาพ</option>
                    <option value="พักการเรียน">พักการเรียน</option>
                    <option value="จบการศึกษา">จบการศึกษา</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-1.5 border border-amber-300 hover:bg-stone-100 text-slate-700 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                >
                  ยกเลิกการแก้ไข
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!editingUser.firstName.trim() || !editingUser.lastName.trim()) {
                      Swal.fire('ป้อนข้อมูลไม่ครบ', 'ชื่อเสียงเรียงนามจะต้องมีตัวอักษร', 'warning');
                      return;
                    }
                    if (onUpdateUser) {
                      onUpdateUser(editingUser);
                      setEditingUser(null);
                      Swal.fire({
                        icon: 'success',
                        title: 'ปรับปรุงชื่อเสียงเสร็จสิ้น',
                        timer: 1000,
                        showConfirmButton: false
                      });
                    }
                  }}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                >
                  บันทึกความเปลี่ยนแปลงสิทธิ์
                </button>
              </div>
            </div>
          )}

          {/* Section: Pending request queues */}
          {pendingUsers.length > 0 && (
            <div className="bg-neutral-50 border border-neutral-350 rounded-xl p-4 shadow-3xs text-left">
              <h3 className="font-sans font-extrabold text-xs text-neutral-900 flex items-center gap-2 mb-3">
                <ShieldAlert className="text-red-500 animate-pulse" size={14} />
                <span>คำขออนุมัติสิทธิ์เชื่อมต่อความปลอดภัย (ค้างอนุมัติ {pendingUsers.length} คำขอ)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingUsers.map(pUser => (
                  <div key={pUser.id} className="bg-white border border-neutral-300 p-3 rounded-lg flex items-center justify-between gap-3 shadow-3xs">
                    <div className="flex items-center gap-3">
                      <img src={pUser.photoUrl} alt="avatar" className="w-10 h-12 object-cover border border-neutral-300 rounded" referrerPolicy="no-referrer" />
                      <div>
                        <p className="font-sans font-bold text-neutral-900">{pUser.firstName} {pUser.lastName}</p>
                        <p className="text-[10px] font-mono font-bold text-neutral-500 uppercase">{pUser.role} | ID: {pUser.id}</p>
                        <p className="text-[9px] text-neutral-400 truncate">{pUser.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0 text-right">
                      <div className="flex gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => onRejectUser(pUser.id)}
                          className="p-1 px-2 border border-rose-350 text-rose-705 bg-rose-50 hover:bg-rose-100 rounded text-[10px] font-sans font-bold transition-colors cursor-pointer"
                        >
                          ปฏิเสธ
                        </button>
                        <button
                          type="button"
                          onClick={() => onApproveUser(pUser.id)}
                          className="p-1 px-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          อนุมัติสิทธิ์
                        </button>
                      </div>
                      <span className="text-[8px] text-emerald-600 font-sans font-bold">✓ สมาชิกเตรียมเข้าคลัง</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* List of Registered Students & Teachers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
            
            {/* STUDENTS LIST */}
            <div className="bg-white border border-neutral-250 rounded-xl p-4 shadow-3xs">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-sans font-extrabold text-xs flex items-center gap-2">
                  <Users size={14} />
                  <span>รายชื่อนักศึกษา AMT</span>
                </h4>
                {/* Cohort filters */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-neutral-500 font-sans font-bold">กรองตามรุ่น:</span>
                  <select
                    id="studentBatchFilter"
                    value={filterBatch}
                    onChange={(e) => setFilterBatch(e.target.value)}
                    className="border border-neutral-350 px-1 py-0.5 rounded text-[10px] font-mono bg-white font-bold"
                  >
                    {batches.map(b => (
                      <option key={b} value={b}>{b === 'All' ? 'ทุกรุ่น' : `รุ่น ${b}`}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 text-[10px] text-neutral-500 border-b border-neutral-300 font-bold uppercase">
                      <th className="py-2 px-1">รูปถ่าย</th>
                      <th className="py-2 px-1">รหัสการช่าง</th>
                      <th className="py-2 px-1">ชื่อ-สกุล</th>
                      <th className="py-2 px-1">สถานะ</th>
                      <th className="py-2 px-1 text-center font-sans">เครื่องมือควบคุมบริหาร</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .filter(u => u.role === 'นักศึกษา' && (filterBatch === 'All' || u.batch === filterBatch))
                      .map(student => (
                        <tr key={student.id} className="border-b border-neutral-100 hover:bg-neutral-50 select-text">
                          <td className="py-2 px-1">
                            <img src={student.photoUrl} alt="img" className="w-8 h-10 object-cover border border-neutral-200 rounded shrink-0 cursor-pointer" onClick={() => onViewStudentCard(student)} title="คลิกเพื่อตรวจดูบัตรประจำตัว" referrerPolicy="no-referrer" />
                          </td>
                          <td className="py-2 px-1 font-mono font-bold text-neutral-900">{student.id}</td>
                          <td className="py-2 px-1 shrink-0">
                            <p className="font-sans font-bold">{student.firstName} {student.lastName}</p>
                            <p className="text-[9px] text-neutral-450 font-mono">{student.email}</p>
                          </td>
                          <td className="py-2 px-1">
                            <select
                              disabled={false}
                              value={student.status}
                              onChange={(e) => onUpdateUserStatus(student.id, e.target.value as User['status'])}
                              className="border px-1 px-1.5 py-0.5 rounded text-[10px] font-sans font-medium bg-white text-neutral-800 cursor-pointer border-neutral-300 focus:outline-none focus:border-slate-800"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Active">Active</option>
                              <option value="พ้นสภาพ">พ้นสภาพ</option>
                              <option value="พักการเรียน">พักการเรียน</option>
                              <option value="จบการศึกษา">จบการศึกษา</option>
                            </select>
                          </td>
                          <td className="py-2 px-1 text-center">
                            <div className="flex justify-center items-center gap-1">
                              <button
                                onClick={() => onViewStudentCard(student)}
                                className="font-sans text-[9px] border border-neutral-800 hover:bg-neutral-950 hover:text-white px-1.5 py-1 rounded transition-colors cursor-pointer"
                              >
                                บัตรช่าง
                              </button>
                              <button
                                onClick={() => {
                                  setEditingUser(student);
                                  setShowAddUserForm(false);
                                  window.scrollTo({ top: 410, behavior: 'smooth' });
                                }}
                                className="p-1 hover:bg-amber-100 text-amber-700 hover:text-amber-950 rounded transition-colors cursor-pointer border border-transparent hover:border-amber-300"
                                title="แก้ไขผู้ใช้"
                              >
                                <Edit2 size={11} />
                              </button>
                              <button
                                onClick={() => {
                                  Swal.fire({
                                    title: 'ยืนยันการลบบัญชี?',
                                    text: `คุณแน่ใจว่าต้องการถอนรากและลบประวัติของ ${student.firstName} ${student.lastName} หรือไม่?`,
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonColor: '#e11d48',
                                    cancelButtonColor: '#475569',
                                    confirmButtonText: 'ใช่, ฉันมั่นใจที่จะลบ',
                                    cancelButtonText: 'ยกเลิก'
                                  }).then((result) => {
                                    if (result.isConfirmed && onDeleteUser) {
                                      onDeleteUser(student.id);
                                      Swal.fire('ลบเรียบร้อย', 'ข้อมูลผู้ใช้เสร็จสิ้น', 'success');
                                    }
                                  });
                                }}
                                className="p-1 hover:bg-rose-100 text-rose-600 hover:text-rose-900 rounded transition-colors cursor-pointer border border-transparent hover:border-rose-300"
                                title="ลบผู้ใช้"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* STAFF / INSTRUCTORS LIST */}
            <div className="bg-white border border-neutral-250 rounded-xl p-4 shadow-3xs">
              <h4 className="font-sans font-extrabold text-xs flex items-center gap-2 mb-3">
                <UserCheck size={14} />
                <span>รายชื่อบุคลากร / ครูวิทยากรการช่าง</span>
              </h4>

              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 text-[10px] text-neutral-505 border-b border-neutral-300 font-bold uppercase font-sans">
                      <th className="py-2 px-1">รูปถ่าย</th>
                      <th className="py-2 px-1">รหัสประจำตำแหน่ง</th>
                      <th className="py-2 px-1">ชื่อ-สกุล / ตำแหน่งหลัก</th>
                      <th className="py-2 px-1">สถานะสิทธิ์</th>
                      <th className="py-2 px-1 text-center">พิมพ์บัตร/เครื่องมือปรับแต่ง</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .filter(u => u.role !== 'นักศึกษา' && u.role !== 'Admin')
                      .map(staff => (
                        <tr key={staff.id} className="border-b border-neutral-100 hover:bg-neutral-50 select-text">
                          <td className="py-2 px-1">
                            <img src={staff.photoUrl} alt="img" className="w-8 h-10 object-cover border border-neutral-200 rounded shrink-0 cursor-pointer" onClick={() => onViewStudentCard(staff)} referrerPolicy="no-referrer" />
                          </td>
                          <td className="py-2 px-1 font-mono font-bold text-neutral-900">{staff.id}</td>
                          <td className="py-2 px-1">
                            <p className="font-sans font-bold">{staff.firstName} {staff.lastName}</p>
                            <p className="text-[9px] font-mono text-neutral-600 font-bold uppercase">{staff.role}</p>
                            <p className="text-[9px] text-neutral-450">{staff.email}</p>
                          </td>
                          <td className="py-2 px-1 font-sans">
                            <select
                              value={staff.status}
                              onChange={(e) => onUpdateUserStatus(staff.id, e.target.value as User['status'])}
                              className="border px-1 py-0.5 rounded text-[10px] font-sans font-medium bg-white text-neutral-800 cursor-pointer border-neutral-300 focus:outline-none focus:border-slate-800"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Active">Active</option>
                              <option value="พ้นสภาพ">พ้นสภาพ</option>
                              <option value="จบการศึกษา">จบการศึกษา</option>
                            </select>
                          </td>
                          <td className="py-2 px-1 text-center">
                            <div className="flex justify-center items-center gap-1">
                              <button
                                onClick={() => onViewStudentCard(staff)}
                                className="font-sans text-[9px] border border-neutral-800 hover:bg-neutral-950 hover:text-white px-1.5 py-1 rounded transition-colors cursor-pointer"
                              >
                                บัตรครู
                              </button>
                              <button
                                onClick={() => {
                                  setEditingUser(staff);
                                  setShowAddUserForm(false);
                                  window.scrollTo({ top: 410, behavior: 'smooth' });
                                }}
                                className="p-1 hover:bg-amber-100 text-amber-700 hover:text-amber-955 rounded transition-colors cursor-pointer border border-transparent hover:border-amber-300"
                                title="แก้ไขสิทธิ์"
                              >
                                <Edit2 size={11} />
                              </button>
                              <button
                                onClick={() => {
                                  Swal.fire({
                                    title: 'ยืนยันนำชื่อครูหรือเจ้าหน้าที่ออก?',
                                    text: `คุณแน่ใจว่าต้องการลบบัญชีและสิทธิ์ของ ${staff.firstName} หรือไม่?`,
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonColor: '#e11d48',
                                    cancelButtonColor: '#475569',
                                    confirmButtonText: 'ลบทันที',
                                    cancelButtonText: 'สละล้าง'
                                  }).then((result) => {
                                    if (result.isConfirmed && onDeleteUser) {
                                      onDeleteUser(staff.id);
                                      Swal.fire('ลบออกแล้ว', 'ยกเลิกสิทธิ์อย่างงดงาม', 'success');
                                    }
                                  });
                                }}
                                className="p-1 hover:bg-rose-100 text-rose-600 hover:text-rose-900 rounded transition-colors cursor-pointer border border-transparent hover:border-rose-300"
                                title="ลบสิทธิ์สมาชิก"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subtab content 2: TODAY'S ROOM STATUS */}
      {subTab === 'rooms' && (
        <div className="bg-white border border-neutral-300 p-6 rounded-lg shadow-sm">
          <div className="mb-4">
            <h4 className="font-sans font-extrabold text-sm mb-1 text-neutral-950">สถานะของห้องซ่อมบำรุงและอู่การบิน ณ วันนี้</h4>
            <p className="text-[11px] text-neutral-500">
              * ข้อมูลอิงตามการอนุมัติใบจองห้องวันนี้ หากได้รับการตอบอนุมัติใบคำขอจะปรับเป็นสถานะ<b>ไม่ว่าง</b>โดยระบบอัตโนมัติ
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {roomsList.map(room => {
              const status = checkRoomStatus(room);
              return (
                <div
                  key={room}
                  className={`p-4 rounded-lg border transition-all flex items-center justify-between shadow-xs ${
                    status.occupied 
                      ? 'bg-rose-50 border-rose-300' 
                      : 'bg-neutral-50 border-neutral-300 hover:bg-neutral-100'
                  }`}
                >
                  <div>
                    <h5 className="font-sans font-bold text-neutral-900 text-xs">{room}</h5>
                    <p className="text-[10px] text-neutral-500 font-mono mt-0.5 uppercase">TLTC AERO DEPT</p>
                    {status.occupied && status.req && (
                      <p className="text-[10px] text-rose-700 font-sans mt-2 font-medium">
                        จองโดย: {status.req.requesterName} <br />
                        จุดประสงค์: {status.req.purpose}
                      </p>
                    )}
                  </div>

                  <div>
                    {status.occupied ? (
                      <span className="bg-rose-600 text-white font-sans text-[10px] font-bold px-2 py-1 rounded">
                        ไม่ว่าง (In-Use)
                      </span>
                    ) : (
                      <span className="bg-neutral-950 text-white font-sans text-[10px] font-bold px-2 py-1 rounded">
                        ว่าง (Available)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Subtab content 3: ROOM USAGE RECORDS TLTC-MO-034 */}
      {subTab === 'records' && (
        <div className="space-y-6">
          
          {/* TLTC-MO-034 List */}
          <div className="bg-white border border-neutral-300 p-5 rounded-lg shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div>
                <h4 className="font-sans font-extrabold text-sm text-neutral-950">สมุดคู่มือช่างอากาศยาน TLTC-MO-034</h4>
                <p className="text-[11px] text-neutral-500">บันทึกรายงานสิ่งที่ต้องการซ่อม พัฒนาระบบ และบันทึกสิ่งชำรุดเสียหาย</p>
              </div>
              <button
                id="printMo034Btn"
                onClick={onPrintUsageRecords}
                className="flex items-center gap-1.5 bg-black hover:bg-neutral-800 text-white font-sans text-xs font-bold px-3 py-1.5 rounded transition-all cursor-pointer shadow-sm"
              >
                <Printer size={13} />
                <span>ออกเอกสารเป็น PDF (TLTC-MO-034)</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-100 text-[10px] text-neutral-600 border-b border-neutral-300 font-bold uppercase">
                    <th className="py-2.5 px-2 w-1/12 text-center">ลำดับ</th>
                    <th className="py-2.5 px-2 w-2/12">วัน/เดือน/ปี</th>
                    <th className="py-2.5 px-2 w-2/12">ห้องที่ใช้งาน</th>
                    <th className="py-2.5 px-2 w-2/12">ผู้ร้องขอเข้าใช้งาน</th>
                    <th className="py-2.5 px-2 w-3/12">สิ่งที่ต้องการให้ซ่อม/พัฒนา</th>
                    <th className="py-2.5 px-2 w-1/12 text-center">ฝ่ายตรวจจับมือ</th>
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
                      <td className="py-2.5 px-2 text-center">
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold shadow-xs mx-auto border ${
                            rec.maintenanceOfficerStatus === 'Acknowledged'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                          title="จำกัดสิทธิ์แก้ไขสำหรับแอดมิน"
                        >
                          <span>{rec.maintenanceOfficerStatus === 'Acknowledged' ? 'รับทราบแล้ว' : 'รอรับทราบ'}</span>
                        </div>
                        <span className="block text-[8px] text-rose-600 font-sans mt-0.5 font-bold">🚫 แอดมินสิทธิ์อ่านอย่างเดียว</span>
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
              <table className="w-full text-left border-collapse">
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
                        <button
                          onClick={() => onViewRequestDoc(req)}
                          className="flex items-center gap-1 bg-neutral-950 hover:bg-neutral-800 text-white font-sans text-[10px] font-semibold py-1 px-2.5 rounded transition-colors mx-auto cursor-pointer"
                        >
                          <Eye size={11} />
                          <span>ดูเอกสาร PDF</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {roomRequests.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-450 italic">
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
                id="adminPrintMo001Btn"
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
                    <tr key={rec.id} className="border-b border-neutral-100 hover:bg-neutral-50 text-[11px] font-sans">
                      <td className="py-2.5 px-2 font-mono text-neutral-600 leading-tight">{rec.borrowDate}</td>
                      <td className="py-2.5 px-2 font-bold text-neutral-950 uppercase">{rec.toolName}</td>
                      <td className="py-2.5 px-2 font-mono font-bold text-neutral-700">{rec.equipmentCode}</td>
                      <td className="py-2.5 px-1 font-mono font-bold text-center">{rec.qty}</td>
                      <td className="py-2.5 px-2 font-sans font-semibold text-neutral-800">{rec.borrowerName}</td>
                      <td className="py-2.5 px-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rec.status === 'Returned'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rec.status === 'PendingReturn'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {rec.status === 'Returned' ? 'คืนแล้ว' : rec.status === 'PendingReturn' ? 'รออนุมัติคืน' : 'กำลังยืม'}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-sans font-bold text-neutral-700">
                        {rec.checkerName || (rec.status === 'Returned' ? 'Inspector' : '-')}
                      </td>
                    </tr>
                  ))}
                  {borrowRecords.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-neutral-450 italic">
                        ไม่มีประวัติการยืมคืนเครื่องมือช่างในขณะนี้
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Subtab content 4: VERIFY STUDENT ID & QR SCANNER */}
      {subTab === 'verify' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          
          {/* Left Hand: Scanner HUD & Search Input */}
          <div className="lg:col-span-6 bg-white border border-neutral-300 rounded-lg p-5 shadow-sm space-y-6">
            <div>
              <h3 className="font-sans font-extrabold text-sm text-neutral-950 flex items-center gap-2">
                <QrCode className="text-neutral-950" size={16} />
                <span>กล้องสแกนคิวอาร์โค้ด & ค้นหาสิทธิ์นักศึกษา</span>
              </h3>
              <p className="text-[10px] text-neutral-500 mt-1">
                ใช้กล้องสมาร์ตโฟนหรือเว็บแคมในการสแกนคิวอาร์โค้ดบน "บัตรประจำตัวนักศึกษา (ID Card)" เพื่อตรวจสถานะ ความปลอดภัย และประวัติตารางเรียนล่าสุดได้ทันที
              </p>
            </div>

            {/* Custom Interactive Camera Viewport */}
            <div className="border border-neutral-300 rounded-lg overflow-hidden bg-neutral-950 p-4 shrink-0">
              <div className="flex items-center justify-between mb-3 text-white text-[10px] font-semibold">
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${isVerifyCameraActive ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
                  {isVerifyCameraActive ? 'กล้องพร้อมสแกนข้อมูลบาร์โค้ด' : 'ปิดระบบกล้องสแกน'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsVerifyCameraActive(!isVerifyCameraActive)}
                  className={`px-3 py-1 rounded text-[10px] font-bold cursor-pointer transition-all duration-200 ${
                    isVerifyCameraActive ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-white text-neutral-950 hover:bg-neutral-100'
                  }`}
                >
                  {isVerifyCameraActive ? 'ปิดใช้งานกล้อง' : 'เปิดรันกล้องสแกน'}
                </button>
              </div>

              {isVerifyCameraActive ? (
                <div className="relative w-full h-64 bg-neutral-900 rounded border border-neutral-800 flex items-center justify-center overflow-hidden">
                  {verifyCameraError ? (
                    <div className="absolute inset-0 p-4 text-center text-rose-400 text-[10.5px] font-bold flex flex-col justify-center items-center bg-rose-950/25">
                      <span>⚠️ {verifyCameraError}</span>
                      <span className="text-neutral-300 font-normal mt-2">กำลังทำงานในโหมดโปรแกรมจำลองด่วน โปรดใช้แถบรายการปุ่มด่วนด้านล่างเพื่อสแกน</span>
                    </div>
                  ) : (
                    <>
                      <div
                        id="admin-verify-reader"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      {/* Laser scanning target square HUD */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 p-2">
                        <div className="w-40 h-40 border border-white/10 rounded-lg relative flex items-center justify-center bg-emerald-500/5">
                          <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl-sm animate-pulse" />
                          <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr-sm animate-pulse" />
                          <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl-sm animate-pulse" />
                          <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br-sm animate-pulse" />
                          
                          <div className="w-full h-0.5 bg-emerald-400 animate-bounce shadow-[0_0_8px_#10b981]" style={{ animationDuration: '2.5s' }} />
                          
                          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[9px] font-sans font-bold text-emerald-400 tracking-wider text-center uppercase bg-slate-950/95 px-2.5 py-1 rounded border border-emerald-500/30 whitespace-nowrap shadow-md select-none">
                            เล็งคิวอาร์โค้ด (QR CODE) ในกรอบนี้
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="w-full h-64 bg-neutral-900 rounded border border-neutral-800 flex flex-col items-center justify-center text-neutral-500">
                  <Camera size={32} className="opacity-40 mb-2" />
                  <span className="text-[10px] font-bold">กรุณากดปุ่มเพื่อสลับ "เปิดใช้งานกล้อง"</span>
                  <span className="text-[8.5px] font-mono mt-0.5 opacity-60">CAMERA CO-AXIAL INACTIVE</span>
                </div>
              )}

              {/* Simulation triggers */}
              <div className="mt-3.5 pt-3 border-t border-neutral-800">
                <span className="block text-neutral-450 text-[9px] uppercase font-bold tracking-wider mb-2">ปุ่มสแกนจำลองข้อมูล QR สำหรับนักศึกษาเพื่อการทดสอบด่วน:</span>
                <div className="flex flex-wrap gap-1">
                  {users
                    .filter(u => u.role === 'นักศึกษา')
                    .map(stu => (
                      <button
                        key={stu.id}
                        type="button"
                        onClick={() => handleSimulateQRScan(`${getAppOriginForQR()}/?id=${stu.id}`)}
                        className="bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 hover:border-emerald-500 px-2 py-1 rounded text-[9.5px] font-bold font-mono transition-transform duration-100 hover:scale-105 cursor-pointer"
                      >
                        [QR] {stu.firstName}
                      </button>
                    ))}
                </div>
              </div>
            </div>

            {/* Manual input validation search */}
            <form onSubmit={handleManualSearch} className="space-y-4 pt-3 border-t border-neutral-200">
              <h4 className="font-bold text-xs text-neutral-950">หรือระบุเลขรหัสประจำตัวเป็นข้อความ</h4>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-2.5 top-2.5 text-neutral-400" />
                  <input
                    type="text"
                    required
                    placeholder="ป้อนรหัสนักศึกษา (เช่น: 67010214...)"
                    value={verifySearchId}
                    onChange={(e) => setVerifySearchId(e.target.value)}
                    className="w-full border border-neutral-300 pl-8 pr-3 py-2 rounded focus:outline-none text-xs bg-white text-neutral-950 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-[#0F172A] hover:bg-neutral-800 text-white font-sans text-xs font-bold px-4 rounded transition-colors cursor-pointer shrink-0"
                >
                  ค้นหาสิทธิ์
                </button>
              </div>
            </form>
          </div>

          {/* Right Hand: Interactive Student Status Card View */}
          <div className="lg:col-span-6 space-y-6">
            {verifyUser ? (
              <div className="bg-white border border-neutral-300 rounded-lg p-5 shadow-sm space-y-5">
                <div className="flex justify-between items-center border-b pb-3.5">
                  <h4 className="font-sans font-extrabold text-sm text-neutral-955">ผลการวิเคราะห์ตัวตนผู้เรียนเครื่องช่าง (AMT Analytics Profile)</h4>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold ${
                    verifyUser.status === 'Active' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-neutral-100 text-neutral-500'
                  }`}>
                    สถานะการเรียน: {verifyUser.status}
                  </span>
                </div>

                {/* Profile card metadata block */}
                <div className="flex gap-4 p-3 bg-stone-50 border border-neutral-205 rounded-lg">
                  <img
                    src={verifyUser.photoUrl}
                    alt="Scan Avatar"
                    className="w-16 h-20 object-cover rounded border border-neutral-400 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="space-y-1 my-auto">
                    <p className="font-sans text-sm font-black text-neutral-950">{verifyUser.firstName} {verifyUser.lastName}</p>
                    <p className="text-[10px] text-neutral-600 font-medium">ตำแหน่งหน้าที่: <b>{verifyUser.role}</b> {verifyUser.batch ? `| รุ่น ${verifyUser.batch}` : ''}</p>
                    <p className="text-[10px] text-neutral-550 font-mono">อีเมลจดสิทธิ์: {verifyUser.email}</p>
                    <p className="text-[10px] text-neutral-550 font-mono">รหัสประจำตัว: <strong className="text-neutral-900 underline font-bold">{verifyUser.id}</strong></p>
                  </div>
                </div>

                {/* Digital vertical ID Card print block button */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onViewStudentCard(verifyUser)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-neutral-950 hover:bg-neutral-800 text-white font-sans text-xs font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer"
                  >
                    <Printer size={13} />
                    <span>พิมพ์และแสดงบัตรประจำตัวการช่างแนวตั้ง</span>
                  </button>
                </div>

                {/* Verification Checkpoints status indicator */}
                <div className="space-y-3.5">
                  <h5 className="font-bold text-neutral-800 text-xs flex items-center gap-1">
                    <CheckCircle className="text-emerald-600" size={14} />
                    <span>รายการตรวจสอบสิทธิ์เข้าใช้งานสถาบันฝึกบิน (Security Checkpoints)</span>
                  </h5>
                  <div className="space-y-2 text-[10.5px]">
                    <div className="flex items-center justify-between p-2 rounded bg-emerald-50/50 border border-emerald-200">
                      <span className="font-medium text-emerald-950">1. การเข้าใช้โรงงานและโรงช่างใหญ่บำรุงรักษา</span>
                      <span className="font-bold text-emerald-800">✅ APPROVED / ALLOWED</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-emerald-55/50 border border-emerald-200">
                      <span className="font-medium text-emerald-950">2. ใบอนุญาตรับรองระบบความปลอดภัย (Safety Pass)</span>
                      <span className="font-bold text-emerald-800">✅ ACTIVE & REGISTERED</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded bg-emerald-55/50 border border-emerald-200">
                      <span className="font-medium text-emerald-950">3. สิทธิ์การทำรายการยื่นคำขอจองห้องฝึกปฏิบัติ</span>
                      <span className="font-bold text-emerald-800">✅ PERMITTED ({verifyUser.role})</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-neutral-300 rounded-lg p-8 shadow-sm flex flex-col items-center justify-center text-center text-neutral-500 h-96">
                <QrCode size={48} className="opacity-30 mb-3 animate-pulse" />
                <h4 className="font-sans font-bold text-sm text-neutral-950">รอกล้องสแกนหรือค้นหาบันทึกสิทธิ์นักเรียน</h4>
                <p className="text-[10px] text-neutral-550 max-w-xs mt-1 leading-relaxed">
                  เมื่อระบบได้รับรหัสนักเรียนผ่านกล้องวิดีโอหรือป้อนรหัสทางซ้าย แดชบอร์ดจะประมวลผลข้อมูลและดึงประวัติการลงทะเบียน คอร์สเรียนล่าสุดทันที
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subtab content 5: EQUIPMENT INVENTORY */}
      {subTab === 'equipment' && (
        <div className="space-y-6 text-left">
          {/* Header Command Bar */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-sans font-extrabold text-xs text-slate-900 flex items-center gap-2">
                <Wrench size={14} className="text-[#0F172A]" />
                <span>คลังและบัญชีอุปกรณ์เครื่องมือช่างอากาศยาน (Aviation Tools Registry)</span>
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">พิจารณา บันทึกซีเรียลของเครื่องมือ วันที่ตรวจเทียบค่าเทียบมาตรฐาน (Calibration) และตำแหน่งชั้นวาง</p>
            </div>
            <button
              onClick={() => setShowAddEquipmentForm(!showAddEquipmentForm)}
              className="flex items-center gap-1 bg-slate-950 hover:bg-slate-800 text-white font-sans text-[10px] font-bold px-3 py-2 rounded-lg cursor-pointer transition-all active:scale-95"
            >
              <Plus size={12} />
              <span>{showAddEquipmentForm ? 'ซ่อนฟอร์ม' : 'เพิ่มเครื่องมือช่างใหม่'}</span>
            </button>
          </div>

          {/* Form to Add Equipment */}
          {showAddEquipmentForm && (
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-300 shadow-sm animate-fade-in space-y-4">
              <h4 className="font-extrabold text-[11px] text-slate-900 uppercase tracking-wider font-mono">🔧 ลงทะเบียนเครื่องมือช่างอากาศยานเข้าระบบคลังคุมเสี่ยง</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">ชื่อเครื่องมือ (Tool Name) *</label>
                  <input
                    type="text"
                    placeholder="เช่น Torque Wrench 150 In-lbs"
                    value={newEqName}
                    onChange={(e) => setNewEqName(e.target.value)}
                    className="w-full border border-slate-300 px-3 py-1.5 rounded bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Part Number *</label>
                  <input
                    type="text"
                    placeholder="เช่น AMT-TW-01"
                    value={newEqPart}
                    onChange={(e) => setNewEqPart(e.target.value)}
                    className="w-full border border-slate-300 px-3 py-1.5 rounded bg-white text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Serial Number *</label>
                  <input
                    type="text"
                    placeholder="เช่น SN-2026-98765"
                    value={newEqSerial}
                    onChange={(e) => setNewEqSerial(e.target.value)}
                    className="w-full border border-slate-300 px-3 py-1.5 rounded bg-white text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">บาร์โค้ดสแกนด่วน (Quick Code ID) *</label>
                  <input
                    type="text"
                    placeholder="เช่น EQ-8899"
                    value={newEqCode}
                    onChange={(e) => setNewEqCode(e.target.value)}
                    className="w-full border border-slate-300 px-3 py-1.5 rounded bg-white text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">จำนวนคงคลัง (Quantity) *</label>
                  <input
                    type="number"
                    min={1}
                    value={newEqQty}
                    onChange={(e) => setNewEqQty(parseInt(e.target.value) || 1)}
                    className="w-full border border-slate-300 px-3 py-1.5 rounded bg-white text-slate-900 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">ตำแหน่งตรวจสอบจัดวาง *</label>
                  <select
                    value={newEqLocation}
                    onChange={(e) => setNewEqLocation(e.target.value)}
                    className="w-full border border-slate-300 px-3 py-1.5 rounded bg-white text-slate-905 font-sans cursor-pointer focus:outline-none"
                  >
                    <option value="Hangar Practical Area">Hangar Practical Area</option>
                    <option value="Workshop 1 font-sans">Workshop 1</option>
                    <option value="Workshop 2 font-sans">Workshop 2</option>
                    <option value="Fiberglass Area font-sans">Fiberglass Area</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">หมายเหตุเพิ่มเติม (Remark/Calibration Info)</label>
                  <input
                    type="text"
                    placeholder="วันที่สอบเทียบมาตรฐาน, เกณฑ์เสี่ยง, หรือประวัติเบิก"
                    value={newEqRemark}
                    onChange={(e) => setNewEqRemark(e.target.value)}
                    className="w-full border border-slate-300 px-3 py-1.5 rounded bg-white text-slate-900 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddEquipmentForm(false)}
                  className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-600 rounded-lg text-[10px]"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!newEqName.trim() || !newEqPart.trim() || !newEqSerial.trim() || !newEqCode.trim()) {
                      Swal.fire('กรอกข้อมูลไม่ครบ', 'ต้องระบุชื่อชิ้นงาน, Part No, Serial No และบาร์โค้ดตรวจสอบ', 'warning');
                      return;
                    }
                    if (onAddEquipment) {
                      onAddEquipment({
                        no: String(equipment.length + 1),
                        toolName: newEqName.trim(),
                        partNumber: newEqPart.trim(),
                        serialNumber: newEqSerial.trim(),
                        code: newEqCode.trim().toUpperCase(),
                        qty: newEqQty,
                        location: newEqLocation,
                        status: 'Ready',
                        remark: newEqRemark.trim() || 'สอบเทียบตรงตามการอนุญาตสเตเชั่น'
                      });
                      setNewEqName('');
                      setNewEqPart('');
                      setNewEqSerial('');
                      setNewEqCode('');
                      setNewEqRemark('');
                      setShowAddEquipmentForm(false);
                    }
                  }}
                  className="px-4 py-1.5 bg-slate-950 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold"
                >
                  บันทึกเครื่องมือ
                </button>
              </div>
            </div>
          )}

          {/* Current Inventory Live Table List */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-3xs max-w-full overflow-x-auto">
            <h4 className="font-extrabold text-xs text-slate-900 mb-3 flex items-center gap-1.5">
              <Settings size={13} />
              <span>รายการเครื่องมือทั้งหมดที่มีลิขสิทธิ์ประจำอู่ ({equipment.length} ชนิดรายการ)</span>
            </h4>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-bold uppercase font-mono">
                  <th className="py-2.5 px-2">ลำดับ</th>
                  <th className="py-2.5 px-2">ชื่อชิ้นงานช่าง / ประเภทย่อย</th>
                  <th className="py-2.5 px-2">Part No.</th>
                  <th className="py-2.5 px-2">Serial / Code</th>
                  <th className="py-2.5 px-2 text-center">คงคลัง (Qty)</th>
                  <th className="py-2.5 px-2">ตำแหน่งห้อง</th>
                  <th className="py-2.5 px-2">สถานะสิทธิ์</th>
                  <th className="py-2.5 px-2 text-center">ควบคุมลบ</th>
                </tr>
              </thead>
              <tbody>
                {equipment.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      * ไม่มีข้อมูลเครื่องมือช่างในระบบคลังขณะนี้ กรุณาเปิดฟอร์มเพื่อบันทึกชิ้นงานแรก *
                    </td>
                  </tr>
                ) : (
                  equipment.map((eq, idx) => (
                    <tr key={eq.code || idx} className="border-b border-slate-100 hover:bg-slate-50 font-sans select-text">
                      <td className="py-2.5 px-2 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-2 font-bold">
                        <p className="text-slate-900">{eq.toolName}</p>
                        <p className="text-[9px] text-slate-455 font-mono font-normal">{eq.remark}</p>
                      </td>
                      <td className="py-2.5 px-2 font-mono font-bold text-slate-600">{eq.partNumber}</td>
                      <td className="py-2.5 px-2 font-mono text-slate-500">
                        <span className="block text-[10px] text-slate-700">S/N: {eq.serialNumber}</span>
                        <span className="block text-[9px] font-bold text-[#0F172A] bg-slate-100 px-1 rounded inline-block">Code: {eq.code}</span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-800">{eq.qty}</td>
                      <td className="py-2.5 px-2 text-slate-650 font-medium">{eq.location}</td>
                      <td className="py-2.5 px-2">
                        <span className="px-2.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {eq.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          onClick={() => {
                            Swal.fire({
                              title: 'จัดถอนเครื่องมือช่าง?',
                              text: `คุณต้องการลบเครื่องมือระบบชื่อ "${eq.toolName}" ออกจากคลังถาวรหรือไม่?`,
                              icon: 'warning',
                              showCancelButton: true,
                              confirmButtonColor: '#e11d48',
                              confirmButtonText: 'ลบทิ้ง',
                              cancelButtonText: 'ยกเลิก'
                            }).then((res) => {
                              if (res.isConfirmed && onDeleteEquipment) {
                                onDeleteEquipment(eq.code);
                              }
                            });
                          }}
                          className="p-1 text-rose-600 hover:bg-rose-50 rounded border border-transparent hover:border-rose-300 transition-colors cursor-pointer"
                          title="ลบเครื่องมือช่างอากาศยานนี้"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab content 6: AVIONICS SYLLABUS & SCHEDULES */}
      {subTab === 'schedules' && (
        <div className="space-y-6 text-left">
          {/* Header Command bar */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-sans font-extrabold text-xs text-slate-900 flex items-center gap-2">
                <Calendar size={14} className="text-[#0F172A]" />
                <span>ตารางวิชาเรียนและภาคปฏิบัติประจำรุ่น (Avionics Training & Syllabus Schedule)</span>
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">จัดระเบียบบทเรียนภาคปฏิบัติสำหรับนักศึกษาเพื่อกำหนดตารางเรียนประจำสัปดาห์</p>
            </div>
            <button
              onClick={() => setShowAddScheduleForm(!showAddScheduleForm)}
              className="flex items-center gap-1 bg-slate-950 hover:bg-slate-800 text-white font-sans text-[10px] font-bold px-3 py-2 rounded-lg cursor-pointer transition-all active:scale-95"
            >
              <Plus size={12} />
              <span>{showAddScheduleForm ? 'ซ่อนฟอร์ม' : 'เพิ่มตารางเรียนและวิชาใหม่'}</span>
            </button>
          </div>

          {/* Form to Add Schedule */}
          {showAddScheduleForm && (
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-300 shadow-sm animate-fade-in space-y-4">
              <h4 className="font-extrabold text-[11px] text-slate-905 uppercase tracking-wider font-mono">📅 กำหนดตารางกิจกรรมฝึกปฏิบัติวิชาการบิน</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-650 mb-1">กลุ่มเป้าหมายนักศึกษา (Batch) *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น 67 หรือ 66"
                    value={newSchBatch}
                    onChange={(e) => setNewSchBatch(e.target.value)}
                    className="w-full border border-slate-300 px-3 py-1.5 rounded bg-white text-slate-900 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-650 mb-1">รหัสวิชา (Syllabus Code) *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น AMT-101"
                    value={newSchSubjCode}
                    onChange={(e) => setNewSchSubjCode(e.target.value)}
                    className="w-full border border-slate-300 px-3 py-1.5 rounded bg-white text-slate-900 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-650 mb-1">ชื่อวิชาเรียนกักสิทธิ์ *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น Basic Aerodynamics Practical"
                    value={newSchSubjName}
                    onChange={(e) => setNewSchSubjName(e.target.value)}
                    className="w-full border border-slate-300 px-3 py-1.5 rounded bg-white text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-650 mb-1">อาจารย์ผู้สอนประจำคาบ (Instructor) *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น Instructor Somchai"
                    value={newSchInstructor}
                    onChange={(e) => setNewSchInstructor(e.target.value)}
                    className="w-full border border-slate-300 px-3 py-1.5 rounded bg-white text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-650 mb-1">วันประจำสัปดาห์ *</label>
                  <select
                    value={newSchDay}
                    onChange={(e) => setNewSchDay(e.target.value as any)}
                    className="w-full border border-slate-300 px-3 py-1.5 rounded bg-white text-slate-905 cursor-pointer focus:outline-none"
                  >
                    <option value="จันทร์">จันทร์</option>
                    <option value="อังคาร">อังคาร</option>
                    <option value="พุธ">พุธ</option>
                    <option value="พฤหัสบดี">พฤหัสบดี</option>
                    <option value="ศุกร์ font-sans">ศุกร์</option>
                    <option value="เสาร์ font-sans">เสาร์</option>
                    <option value="อาทิตย์ font-sans">อาทิตย์</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-650 mb-1">เวลาเริ่มเข้าปฏิบัติ (Start) *</label>
                  <input
                     type="text"
                     placeholder="08:30"
                     value={newSchStart}
                     onChange={(e) => setNewSchStart(e.target.value)}
                     className="w-full border border-slate-300 px-3 py-1.5 rounded bg-white text-slate-900 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-650 mb-1">เวลาปล่อยห้อง (End) *</label>
                  <input
                     type="text"
                     placeholder="16:30"
                     value={newSchEnd}
                     onChange={(e) => setNewSchEnd(e.target.value)}
                     className="w-full border border-slate-300 px-3 py-1.5 rounded bg-white text-slate-900 font-mono focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddScheduleForm(false)}
                  className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!newSchBatch.trim() || !newSchSubjCode.trim() || !newSchSubjName.trim() || !newSchInstructor.trim()) {
                      Swal.fire('ประมวลผลล้มเหลว', 'จำเป็นต้องระบุวิชาเรียนและรหัสกลุ่มผู้เรียนให้ครบถ้วนก่อนบันทึก', 'warning');
                      return;
                    }
                    if (onAddSchedule) {
                      onAddSchedule({
                        id: `SCH-${Date.now()}`,
                        batch: newSchBatch.trim(),
                        subjectCode: newSchSubjCode.trim().toUpperCase(),
                        subjectName: newSchSubjName.trim(),
                        instructorName: newSchInstructor.trim(),
                        dayOfWeek: newSchDay,
                        startDate: newSchStart,
                        endDate: newSchEnd
                      });
                      setNewSchBatch('');
                      setNewSchSubjCode('');
                      setNewSchSubjName('');
                      setNewSchInstructor('');
                      setShowAddScheduleForm(false);
                    }
                  }}
                  className="px-4 py-1.5 bg-slate-950 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold"
                >
                  บันทึกตารางสอน
                </button>
              </div>
            </div>
          )}

          {/* Table display */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-3xs max-w-full overflow-x-auto">
            <h4 className="font-extrabold text-xs text-slate-905 mb-3 flex items-center gap-1.5 font-sans">
              <Calendar size={13} />
              <span>ตารางบทเรียนและชั่วโมงการดูแลอากาศยานปัจจุบันทั้งหมด ({schedules.length} ชิ้นกิจกรรม)</span>
            </h4>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-205 text-[10px] text-slate-500 font-bold uppercase font-mono">
                  <th className="py-2.5 px-2">กลุ่มรุ่น</th>
                  <th className="py-2.5 px-2">วันเรียน</th>
                  <th className="py-2.5 px-2 font-sans">รหัสวิชา</th>
                  <th className="py-2.5 px-2 font-sans">ชื่อรายวิชา / สัมมนาเชิงลึก</th>
                  <th className="py-2.5 px-2">ชั่วโมงเรียน (Time Slots)</th>
                  <th className="py-2.5 px-2">อาจารย์วิทยากร (Instructor)</th>
                  <th className="py-2.5 px-2 text-center">ปุ่มลบตาราง</th>
                </tr>
              </thead>
              <tbody>
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                      * ไม่มีรายการตารางวิชาเรียนในระบบชั่วคราวกรุณาระบุกิจกรรมผ่านกล่องตรรกะใหม่ด้านบน *
                    </td>
                  </tr>
                ) : (
                  schedules.map((sch, idx) => (
                    <tr key={sch.id || idx} className="border-b border-slate-100 hover:bg-slate-50 font-sans select-text">
                      <td className="py-2 px-2 font-mono font-extrabold text-slate-600 bg-slate-50/50">รุ่น {sch.batch}</td>
                      <td className="py-2 px-2 font-bold text-[#0F172A]">{sch.dayOfWeek}</td>
                      <td className="py-2 px-2 font-mono text-xs font-bold text-emerald-700">{sch.subjectCode}</td>
                      <td className="py-2 px-2 font-bold text-slate-900">{sch.subjectName}</td>
                      <td className="py-2 px-2 font-mono font-medium text-slate-500 text-[10.5px]">
                        {sch.startDate && sch.endDate ? `${sch.startDate} - ${sch.endDate}` : '-'}
                      </td>
                      <td className="py-2 px-2 text-slate-700 font-medium">{sch.instructorName}</td>
                      <td className="py-2 px-2 text-center">
                        <button
                          onClick={() => {
                            Swal.fire({
                              title: 'จัดถอนตารางสิทธิ์บทเรียน?',
                              text: `คุณพึงปรารถนาต้องการลบตารางวิชา ${sch.subjectName} ของรุ่น ${sch.batch} หรือไม่?`,
                              icon: 'warning',
                              showCancelButton: true,
                              confirmButtonColor: '#e11d48',
                              confirmButtonText: 'ลบทิ้ง'
                            }).then((res) => {
                              if (res.isConfirmed && onDeleteSchedule) {
                                onDeleteSchedule(sch.id);
                              }
                            });
                          }}
                          className="p-1 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-300 rounded transition-colors cursor-pointer"
                          title="ลบวิชานี้ออกจากตาราง"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
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
