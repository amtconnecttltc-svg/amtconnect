/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, RoomRequest, RoomUsageRecord, Equipment, BorrowRecord, ClassSchedule, ExamSchedule, ExamGrade } from './types';
import { APIService, getAppOriginForQR } from './lib/api';
import RegistrationForms from './components/RegistrationForms';
import AdminPanel from './components/AdminPanel';
import TrainingManagerPanel from './components/TrainingManagerPanel';
import MaintenancePanel from './components/MaintenancePanel';
import ExamOfficeStudentPanel from './components/ExamOfficeStudentPanel';
import { StudentIdCard, RoomRequestDoc, RoomUsageRecordDoc } from './components/Documents';
import { 
  LogIn, LogOut, ShieldAlert, Key, Users, BookOpen, 
  Settings, RefreshCw, Mail, CheckCircle, Info, HardHat,
  Camera, QrCode
} from 'lucide-react';
import Swal from 'sweetalert2';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export default function App() {
  // Database state
  const [db, setDb] = useState<ReturnType<typeof APIService.getDb>>(APIService.getDb());
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // App navigation state: 'home' | 'dashboard' | 'register'
  const [currentScreen, setCurrentScreen] = useState<'home' | 'dashboard' | 'register'>('home');

  // Input states for login screen
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Login QR code Scanner interface states
  const [loginMethod, setLoginMethod] = useState<'password' | 'qr'>('password');
  const [isLoginCameraActive, setIsLoginCameraActive] = useState(false);
  const [loginCameraFacingMode, setLoginCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [loginCameraError, setLoginCameraError] = useState<string | null>(null);
  const [scannedUser, setScannedUser] = useState<User | null>(null);

  // Parse QR link verification from search query parameters on app load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id') || params.get('verifyId') || params.get('data');
    if (idParam) {
      const cleanId = idParam.trim().replace(/^['"]|['"]$/g, '').trim();
      const found = db.users.find(u => {
        const uIdClean = u.id.trim().toLowerCase();
        const scannedIdClean = cleanId.toLowerCase();
        return uIdClean === scannedIdClean || uIdClean === scannedIdClean.replace(/\D/g, '') || scannedIdClean === uIdClean.replace(/\D/g, '');
      });

      if (found) {
        // Safe clean url to keep URL tidy as a real-world system
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);

        // Strict security status checks
        if (found.status === 'Pending') {
          Swal.fire({
            icon: 'warning',
            title: 'บัญชีอยู่ระหว่างรออนุมัติ',
            text: 'สถานะของท่าน: กำลังรอการอนุมัติโปรดติดต่อผู้บริหารระบบ',
            confirmButtonColor: '#0F172A'
          });
          return;
        }
        if (found.status === 'พ้นสภาพ') {
          Swal.fire({
            icon: 'error',
            title: 'บัญชีผู้ใช้นี้พ้นสภาพแล้ว',
            text: 'สถานะของท่าน: พ้นสภาพนักศึกษา/บุคคลากร และไม่สามารถเข้าสู่ระบบได้ โปรดติดต่อแผนกทะเบียน',
            confirmButtonColor: '#0F172A'
          });
          return;
        }
        if (found.status === 'พักการเรียน') {
          Swal.fire({
            icon: 'error',
            title: 'บัญชีถูกระงับชั่วคราว',
            text: 'สถานะของท่าน: พักการเรียน และไม่สามารถเข้าสู่ระบบได้',
            confirmButtonColor: '#0F172A'
          });
          return;
        }
        if (found.status === 'จบการศึกษา') {
          Swal.fire({
            icon: 'error',
            title: 'บัญชีพ้นฐานพอร์ทัลหลัก',
            text: 'สถานะของท่าน: จบการศึกษา และไม่สามารถเข้าใช้งานระบบควบคุมได้',
            confirmButtonColor: '#0F172A'
          });
          return;
        }

        // Automatic secure login redirection
        setCurrentUser(found);
        setCurrentScreen('dashboard');

        let statusBg = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold';
        let statusText = 'อนุมัติเรียบร้อย (Active)';

        Swal.fire({
          title: '📌 เข้าสู่ระบบสำเร็จ (TLTC Verified)',
          html: `
            <div class="flex flex-col items-center text-center space-y-4 font-sans select-none my-2 p-1">
              ${found.photoUrl ? `
                <img src="${found.photoUrl}" alt="Photo" class="w-24 h-28 object-cover rounded-lg border-2 border-slate-900 shadow-md" referrerPolicy="no-referrer" />
              ` : `
                <div class="w-24 h-28 bg-slate-200 rounded-lg flex items-center justify-center text-slate-500 font-extrabold text-3xl border border-slate-300">
                  ${found.firstName.charAt(0)}
                </div>
              `}
              <div class="space-y-1">
                <h4 class="font-bold text-base text-slate-950">${found.firstName} ${found.lastName}</h4>
                <p class="text-xs text-slate-500 font-mono">ID: ${found.id}</p>
                <p class="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-250 inline-block mt-1">${found.role}</p>
              </div>

              <div class="w-full border-t border-neutral-200 my-1 pt-3.5 space-y-2 text-left">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-neutral-500">สถานภาพความมั่นคง:</span>
                  <span class="px-2 py-0.5 rounded border text-[11px] ${statusBg}">${statusText}</span>
                </div>
                ${found.batch ? `
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-neutral-500">รุ่น/ห้องเรียน:</span>
                    <span class="font-mono text-neutral-800 font-bold">Class ${found.batch}</span>
                  </div>
                ` : ''}
                <div class="flex items-center justify-between text-xs">
                  <span class="text-neutral-500 font-sans">ลงทะเบียน ณ วันที่:</span>
                  <span class="font-mono text-neutral-800">${found.createdAt}</span>
                </div>
              </div>

              <p class="text-[9.5px] text-slate-400 font-sans text-center leading-normal max-w-[280px]">
                สแกนแผงตรวจสอบความเสถียร ระบบได้ทำการยืนยันสิทธิ์และเปิดใช้งานแดชบอร์ดตามฐานสิทธิ์เรียบร้อยแล้ว
              </p>
            </div>
          `,
          confirmButtonText: 'เข้าชมพอร์ทัลระบบของฉัน',
          confirmButtonColor: '#0F172A'
        });
      } else {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        Swal.fire({
          icon: 'error',
          title: 'ไม่พบคิวอาร์รหัสสิทธิ์นี้',
          text: `รหัสที่ระบุไม่ปรากฏในระบบ: ${cleanId}`,
          confirmButtonColor: '#0F172A'
        });
      }
    }
  }, [db]);

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    let isMounted = true;
    let lastScannedText = '';
    let lastScanTime = 0;

    if (isLoginCameraActive && loginMethod === 'qr') {
      setLoginCameraError(null);
      
      const startScanner = async () => {
        // Wait briefly for React to render the scanner container div
        await new Promise((resolve) => setTimeout(resolve, 300));
        if (!isMounted) return;

        try {
          const container = document.getElementById('login-qr-reader');
          if (!container) {
            throw new Error('ไม่พบตำแหน่งแผงแสดงผลกล้องเครื่องสแกน');
          }
          
          html5QrCode = new Html5Qrcode('login-qr-reader');
          await html5QrCode.start(
            { facingMode: loginCameraFacingMode },
            {
              fps: 15,
              qrbox: (w, h) => {
                const size = Math.min(w, h, 250);
                return { width: size, height: size };
              }
            },
            (decodedText) => {
              const now = Date.now();
              if (decodedText === lastScannedText && now - lastScanTime < 3000) {
                return; // Prevent repeating scans of the same item within 3s
              }
              lastScannedText = decodedText;
              lastScanTime = now;
              handleQRLoginSubmit(decodedText);
            },
            () => {
              // Quietly bypass non-matches
            }
          );
        } catch (err: any) {
          console.error('Error starting Login Html5Qrcode engine:', err);
          setLoginCameraError(err.message || 'ไม่สามารถเข้าถึงอุปกรณ์กล้องได้ โปรดอนุมัติสิทธิ์การใช้งานกล้องในเบราว์เซอร์');
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
  }, [isLoginCameraActive, loginMethod, loginCameraFacingMode]);

  const handleQRLoginSubmit = (qrData: string) => {
    const cleanQR = qrData.trim();
    let parsedId = '';

    // Advanced Robust URL & Parameter parsing
    // 1. Try standard browser URL parsing first (extremely reliable for full verification links)
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
        console.error("Standard URL parsing error, falling back to regex regex:", e);
      }
    }

    // 2. Regular expression fallback if standard URL parsing didn't find the ID
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
        console.error("Regex extraction error:", e);
      }
    }

    // 3. Last path segment fallback (e.g. https://domain/user/67010214)
    if (!parsedId) {
      if (cleanQR.includes('/') && !cleanQR.endsWith('/')) {
        const lastSlash = cleanQR.lastIndexOf('/');
        const segment = cleanQR.substring(lastSlash + 1).trim();
        if (segment && segment.length >= 4 && !segment.includes('?') && !segment.includes('&')) {
          parsedId = segment;
        }
      }
    }

    // 4. Default to the whole scanned QR string if no URL syntax found
    if (!parsedId) {
      parsedId = cleanQR;
    }

    // 5. Clean legacy prefixes
    if (parsedId.toUpperCase().includes('AMT-CONNECT-VERIFY:')) {
      const parts = parsedId.split(/AMT-CONNECT-VERIFY:/i);
      if (parts && parts[1]) {
        parsedId = parts[1];
      }
    }

    // Trim and clean possible enclosing quotes
    parsedId = parsedId.trim().replace(/^['"\[\]]|['"\[\]]$/g, '').trim();

    const found = db.users.find(u => {
      const uIdClean = u.id.trim().toLowerCase();
      const scannedIdClean = parsedId.toLowerCase();
      return uIdClean === scannedIdClean || uIdClean === scannedIdClean.replace(/\D/g, '') || scannedIdClean === uIdClean.replace(/\D/g, '');
    });

    if (found) {
      // Ensure we validate their account security status first
      if (found.status === 'Pending') {
        Swal.fire({
          icon: 'warning',
          title: 'บัญชีอยู่ระหว่างรออนุมัติ',
          text: 'สถานะของท่าน: กำลังรอการอนุมัติโปรดติดต่อผู้บริหารระบบ',
          confirmButtonColor: '#0F172A'
        });
        return;
      }
      if (found.status === 'พ้นสภาพ') {
        Swal.fire({
          icon: 'error',
          title: 'บัญชีผู้ใช้นี้พ้นสภาพแล้ว',
          text: 'สถานะของท่าน: พ้นสภาพนักศึกษา/บุคคลากร และไม่สามารถเข้าสู่ระบบได้',
          confirmButtonColor: '#0F172A'
        });
        return;
      }
      if (found.status === 'พักการเรียน') {
        Swal.fire({
          icon: 'error',
          title: 'บัญชีถูกระงับชั่วคราว',
          text: 'สถานะของท่าน: พักการเรียน และไม่สามารถเข้าสู่ระบบได้',
          confirmButtonColor: '#0F172A'
        });
        return;
      }
      if (found.status === 'จบการศึกษา') {
        Swal.fire({
          icon: 'error',
          title: 'บัญชีพ้นฐานพอร์ทัลหลัก',
          text: 'สถานะของท่าน: จบการศึกษา และไม่สามารถเข้าใช้งานระบบควบคุมได้',
          confirmButtonColor: '#0F172A'
        });
        return;
      }

      // Prompt confirmation before logging in to verify user identity
      Swal.fire({
        title: 'ยืนยันตัวตนผู้ใช้ระบบ',
        html: `
          <div class="flex flex-col items-center space-y-4 font-sans select-none my-2 p-1 text-center">
            ${found.photoUrl ? `
              <img src="${found.photoUrl}" alt="Profile" class="w-24 h-24 rounded-full object-cover border-4 border-slate-100 shadow-md" referrerPolicy="no-referrer" />
            ` : `
              <div class="w-24 h-24 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center border border-dashed border-slate-300">
                <span class="text-xs uppercase font-extrabold text-slate-500">${found.firstName.charAt(0)}</span>
              </div>
            `}
            <div>
              <h3 class="text-sm font-bold text-slate-800">คุณคือ ${found.firstName} ${found.lastName} ใช่หรือไม่?</h3>
              <p class="text-xs text-slate-500 mt-1">ตำแหน่ง: <span class="font-bold text-slate-700">${found.role}</span> | รหัส: <span class="font-mono text-slate-700">${found.id}</span></p>
            </div>
            <p class="text-[10px] text-slate-400 font-sans tracking-wide leading-normal max-w-[280px]">
              โปรดยืนยันตัวตนของคุณเพื่อความปลอดภัยก่อนเข้าใช้งานแดชบอร์ดพอร์ทัล
            </p>
          </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'ใช่, ฉันเอง',
        cancelButtonText: 'ไม่ใช่ฉัน',
        confirmButtonColor: '#0F172A',
        cancelButtonColor: '#64748B'
      }).then((result) => {
        if (result.isConfirmed) {
          setIsLoginCameraActive(false);
          setScannedUser(null);
          setCurrentUser(found);
          setCurrentScreen('dashboard');

          Swal.fire({
            icon: 'success',
            title: 'เข้าสู่ระบบสำเร็จผ่านคิวอาร์โค้ด',
            text: `ยินดีต้อนรับคุณ ${found.firstName} ${found.lastName} (${found.role})`,
            timer: 1800,
            showConfirmButton: false
          });
        }
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'ไม่พบคิวอาร์โค้ดสิทธิ์นี้',
        html: `
          <div class="text-left text-xs space-y-2 select-text font-sans">
            <p><strong>รหัสประจำตัวที่ถอดความได้:</strong> <code class="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono text-xs font-bold">${parsedId || 'ว่างเปล่า'}</code></p>
            <p class="text-slate-500 text-[11px] leading-relaxed">
              ไม่พบรหัสคิวอาร์นี้ในฐานข้อมูลโรงเรียนช่างการบินชลบุรี หรือรูปแบบข้อมูลคิวอาร์ไม่ได้รับสิทธิ์ตรวจสอบ
            </p>
            <p class="text-slate-400 text-[10px] break-all font-mono">ข้อมูลสแกนดิบ (Raw): "${qrData}"</p>
          </div>
        `,
        confirmButtonColor: '#0F172A'
      });
    }
  };

  // Floating printable dialog overlays state
  const [activeCardUser, setActiveCardUser] = useState<User | null>(null);
  const [activeRequestDoc, setActiveRequestDoc] = useState<RoomRequest | null>(null);
  const [showUsageRecordDoc, setShowUsageRecordDoc] = useState(false);

  // Sync state polling
  const [syncStatus, setSyncStatus] = useState(APIService.getLastSyncStatus());

  useEffect(() => {
    // Sync status checker loop
    const interval = setInterval(() => {
      setSyncStatus(APIService.getLastSyncStatus());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Update central state and auto-save
  const updateDb = (newDb: typeof db) => {
    setDb(newDb);
    APIService.saveDb(newDb);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const idClean = loginId.trim();

    // 1. Admin bypass check
    if (idClean.toLowerCase() === 'admin' && loginPassword === 'admin1234') {
      const adminObject: User = {
        id: 'ADMIN',
        photoUrl: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150',
        firstName: 'Admin',
        lastName: 'Manager',
        role: 'Admin',
        signature: 'ADMIN_SIGNATURE',
        email: 'admin@amtconnect.com',
        status: 'Active',
        createdAt: '2569/06/11'
      };
      
      setCurrentUser(adminObject);
      setCurrentScreen('dashboard');
      Swal.fire({
        icon: 'success',
        title: 'ผู้บริหารระบบเข้าใช้งาน',
        text: 'ยินดีต้อนรับเข้าสูู่บอร์ดแอดมิน AMT Connect',
        timer: 1500,
        showConfirmButton: false
      });
      return;
    }

    // 2. Normal check using APIService
    const res = APIService.login(idClean, loginPassword);
    if (res.success && res.user) {
      setCurrentUser(res.user);
      setCurrentScreen('dashboard');
      Swal.fire({
        icon: 'success',
        title: 'ลงชื่อเข้าใช้สำเร็จ',
        text: `ยินดีต้อนรับคุณ ${res.user.firstName} (${res.user.role}) เข้าใช้งานระบบ`,
        timer: 1500,
        showConfirmButton: false
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'การเข้าสู่ระบบล้มเหลว',
        text: res.message,
        confirmButtonColor: '#171717'
      });
    }
  };

  const handleRegisterSuccess = (candidate: Omit<User, 'status' | 'createdAt'>) => {
    const res = APIService.register(candidate);
    if (res.success) {
      setDb(APIService.getDb()); // reload from disk helper
      Swal.fire({
        icon: 'success',
        title: 'ยื่นใบลงทะเบียนสำเร็จ',
        text: res.message,
        confirmButtonColor: '#171717'
      });
      setCurrentScreen('home');
      setLoginId('');
      setLoginPassword('');
    } else {
      Swal.fire({
        icon: 'error',
        title: 'ลงทะเบียนติดขัด',
        text: res.message,
        confirmButtonColor: '#171717'
      });
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentScreen('home');
    setLoginId('');
    setLoginPassword('');
    Swal.fire({
      icon: 'info',
      title: 'ออกจากระบบสำเร็จ',
      text: 'ขอบคุณที่ใช้งานระบบตรวจห้องและอุปกรณ์ AMT Connect',
      timer: 1000,
      showConfirmButton: false
    });
  };

  const forceTriggerSync = () => {
    Swal.fire({
      title: 'กำลังอัพเดตข้อมูลไปยังคลาวด์ชีต...',
      text: 'ติดต่อระบบประมวลผล Google Apps Script',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    APIService.saveDb(db);
    setTimeout(() => {
      Swal.close();
      Swal.fire({
        icon: 'success',
        title: 'อัปเดตระบบชีตสมบูรณ์',
        text: 'ประวัติ อุปกรณ์ และตารางสอบ ได้อัพโหลดขึ้น Google Sheet เรียบร้อยแล้ว',
        confirmButtonColor: '#171717'
      });
    }, 1500);
  };

  // --- ACTIONS FOR ADMIN ---
  const handleApproveUser = (userId: string) => {
    const nextUsers = db.users.map(u => u.id === userId ? { ...u, status: 'Active' as const } : u);
    updateDb({ ...db, users: nextUsers });
    Swal.fire('อนุมัติแล้ว', `อนุมัติสิทธิ์ความปลอดภัยผู้ใช้นี้เรียบร้อย`, 'success');
  };

  const handleRejectUser = (userId: string) => {
    const nextUsers = db.users.filter(u => u.id !== userId);
    updateDb({ ...db, users: nextUsers });
    Swal.fire('ปฏิเสธคำขอสำเร็จ', 'นำผู้ใช้งานออกจากบัญชีคิวคำขอลงทะเบียนแล้ว', 'info');
  };

  const handleUpdateStudentStatus = (userId: string, newStatus: User['status']) => {
    const nextUsers = db.users.map(u => u.id === userId ? { ...u, status: newStatus } : u);
    updateDb({ ...db, users: nextUsers });
  };

  const handleToggleRecordStatus = (recId: string) => {
    const nextRecords = db.roomUsageRecords.map(r => 
      r.id === recId 
        ? { ...r, maintenanceOfficerStatus: (r.maintenanceOfficerStatus === 'Acknowledged' ? 'Pending' : 'Acknowledged') as any } 
        : r
    );
    updateDb({ ...db, roomUsageRecords: nextRecords });
    Swal.fire('อัปเดตบันทึกห้องสำเร็จ', 'เปลี่ยนสถานภาพยอมรับลายเซ็นสมุดส่งตรวจเสร็จสิ้น', 'success');
  };

  // --- ACTIONS FOR TRAINING STAFF/MANAGER ---
  const handleUpdateProfile = (updatedProfile: Partial<User>) => {
    if (!currentUser) return;
    const nextUsers = db.users.map(u => u.id === currentUser.id ? { ...u, ...updatedProfile } : u);
    const updatedUser = { ...currentUser, ...updatedProfile };
    setCurrentUser(updatedUser);
    updateDb({ ...db, users: nextUsers });
  };

  const handleSubmitRoomRequest = (newRequest: Omit<RoomRequest, 'id' | 'maintenanceApproved' | 'isRoomUsageRecordCreated'>) => {
    const freshRequest: RoomRequest = {
      ...newRequest,
      id: `REQ-${Date.now()}`,
      maintenanceApproved: 'Pending' as const,
      isRoomUsageRecordCreated: false,
    };
    const nextReqs = [...db.roomRequests, freshRequest];
    updateDb({ ...db, roomRequests: nextReqs });
  };

  const handleUpdateStudentStatusByStaff = (studentId: string, status: User['status']) => {
    const nextUsers = db.users.map(u => u.id === studentId ? { ...u, status } : u);
    updateDb({ ...db, users: nextUsers });
    Swal.fire('สำเร็จ', 'ส่งข้อเสนอเปลี่ยนแปลงสถานะนักศึกษาเข้าสู่ระบบบริหารพิจารณาแล้ว', 'success');
  };

  const handleApproveStudentStatusByManager = (studentId: string) => {
    Swal.fire('ผู้บริหารอนุมัติ', 'อนุมัติยืนยันสถานะนักศึกษาเข้าบอร์ดทะเบียนเรียบร้อย', 'success');
  };

  // --- ACTIONS FOR MAINTENANCE ---
  const handleCertifyRoomRequest = (requestId: string, status: 'Approved' | 'Rejected', note: string, officerName: string, officerSignature?: string) => {
    const reqObj = db.roomRequests.find(r => r.id === requestId);
    if (!reqObj) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const nextRequests = db.roomRequests.map(r => 
      r.id === requestId 
        ? { 
            ...r, 
            maintenanceApproved: status, 
            maintenanceOfficerName: officerName, 
            maintenanceOfficerSignature: officerSignature, 
            maintenanceCertifiedDate: status === 'Approved' ? todayStr : undefined,
            maintenanceNote: note, 
            isRoomUsageRecordCreated: status === 'Approved' 
          } 
        : r
    );

    // If marked approved, auto export a room record on TLTC-MO-034
    let nextUsageRecords = [...db.roomUsageRecords];
    if (status === 'Approved') {
      const freshRecord: RoomUsageRecord = {
        id: `REC-${Date.now()}`,
        date: reqObj.date,
        room: reqObj.room,
        requesterName: reqObj.requesterName,
        report: `ความประสงค์: ${reqObj.purpose}. สังเกตุใบงาน: ${note || '-'}`,
        maintenanceOfficerStatus: 'Pending',
        remarks: `อ้างอิงเอกสารอนุมัติห้อง ${reqObj.id}`
      };
      nextUsageRecords.push(freshRecord);
    }

    updateDb({
      ...db,
      roomRequests: nextRequests,
      roomUsageRecords: nextUsageRecords
    });
  };

  const handleAddEquipment = (newTool: Equipment) => {
    const nextEquipments = [...db.equipment, newTool];
    updateDb({ ...db, equipment: nextEquipments });
  };

  const handleCheckReturnEquipment = (borrowId: string) => {
    const borrowObj = db.borrowRecords.find(b => b.id === borrowId);
    if (!borrowObj) return;

    // Mark borrow returned, save check signature and name
    const nextBorrowRecords = db.borrowRecords.map(b => 
      b.id === borrowId 
        ? { 
            ...b, 
            status: 'Returned' as const, 
            returnDate: new Date().toLocaleDateString('th-TH') + ' ' + new Date().toLocaleTimeString('th-TH'),
            checkSignature: currentUser?.signature || '',
            checkerName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Maintenance Officer'
          } 
        : b
    );

    // Increase equipment stock
    const nextEquipment = db.equipment.map(eq => 
      eq.code === borrowObj.equipmentCode 
        ? { ...eq, qty: eq.qty + borrowObj.qty } 
        : eq
    );

    updateDb({
      ...db,
      borrowRecords: nextBorrowRecords,
      equipment: nextEquipment
    });
  };

  const handleUpdateCalibration = (toolCode: string, calDate: string, status: Equipment['status']) => {
    const nextEquipment = db.equipment.map(eq => 
      eq.code === toolCode 
        ? { ...eq, calibrationDate: calDate, status } 
        : eq
    );
    updateDb({ ...db, equipment: nextEquipment });
  };

  // --- ACTIONS FOR OFFICE / EXAMS ---
  const handleAddSchedule = (s: ClassSchedule) => {
    const nextSch = [...db.schedules, s];
    updateDb({ ...db, schedules: nextSch });
  };

  const handleAddExam = (ex: ExamSchedule) => {
    const nextEx = [...db.examSchedules, ex];
    updateDb({ ...db, examSchedules: nextEx });
  };

  const handleAddGrade = (grade: ExamGrade) => {
    const nextGr = [...db.examGrades, grade];
    updateDb({ ...db, examGrades: nextGr });
  };

  // --- ACTIONS FOR BORROWING ---
  const handleBorrowEquipment = (code: string, qtyNeeded: number, sigImage: string) => {
    if (!currentUser) return;
    const tool = db.equipment.find(eq => eq.code === code);
    if (!tool) return;

    const freshBorrow: BorrowRecord = {
      id: `BRW-${Date.now()}`,
      equipmentCode: code,
      toolName: tool.toolName,
      borrowerId: currentUser.id,
      borrowerName: `${currentUser.firstName} ${currentUser.lastName}`,
      borrowerRole: currentUser.role,
      qty: qtyNeeded,
      borrowDate: new Date().toLocaleDateString('th-TH') + ' ' + new Date().toLocaleTimeString('th-TH'),
      status: 'Borrowed',
      borrowSignature: sigImage,
      toolLocation: tool.location,
    };

    const nextBorrowRecords = [...db.borrowRecords, freshBorrow];

    // Deduct stock Qty
    const nextEquipment = db.equipment.map(eq => 
      eq.code === code 
        ? { ...eq, qty: eq.qty - qtyNeeded } 
        : eq
    );

    updateDb({
      ...db,
      borrowRecords: nextBorrowRecords,
      equipment: nextEquipment
    });
  };

  const handleReturnEquipment = (borrowId: string) => {
    const nextBorrowRecords = db.borrowRecords.map(b => {
      if (b.id === borrowId) {
        const studentUser = db.users.find(u => u.id === b.borrowerId);
        return { 
          ...b, 
          status: 'PendingReturn' as const,
          returnSignature: studentUser?.signature || b.borrowSignature || ''
        };
      }
      return b;
    });
    updateDb({
      ...db,
      borrowRecords: nextBorrowRecords
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between font-sans selection:bg-slate-900 selection:text-white no-print">
      
      {/* 1. Header component */}
      <header className="bg-[#0F172A] text-slate-100 shadow-md no-print border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          
          {/* Logo & title brand */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 text-slate-100 rounded-lg border border-slate-700 flex items-center justify-center font-mono font-extrabold uppercase select-none shadow-sm animate-pulse">
              <HardHat size={24} className="text-slate-200" />
            </div>
            <div>
              <h1 className="font-sans font-extrabold text-xl sm:text-2xl uppercase tracking-widest flex items-center gap-2">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-350">AMT CONNECT</span>
              </h1>
              <p className="font-sans text-[10px] text-slate-400 font-medium tracking-normal">
                ระบบจัดการห้อง และ คลังเบิกอุปกรณ์ช่างอากาศยานวิทยาลัยเทคนิคถลาง | PART-147
              </p>
            </div>
          </div>

          {/* Sync indicator + session controls info */}
          <div className="flex items-center gap-4 text-xs font-sans">
            
            {/* Real-time Google Sheets Auto-Sync Status Badge */}
            <div className={`px-2.5 py-1 rounded-md text-[10px] font-sans font-extrabold flex items-center gap-1.5 transition-all duration-300 border ${
              syncStatus.isSyncing
                ? 'bg-amber-950/40 text-amber-300 border-amber-800'
                : syncStatus.lastSyncSuccess
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800'
                : 'bg-slate-800/50 text-slate-400 border-slate-700/60'
            }`}>
              <RefreshCw size={11} className={`${syncStatus.isSyncing ? 'animate-spin text-amber-400' : 'text-emerald-400'}`} />
              <span>
                {syncStatus.isSyncing 
                  ? 'กำลังบันทึกลง Google Sheets...' 
                  : '✓ ซิงค์ Google Sheets อัตโนมัติ'}
              </span>
            </div>

            {currentUser && (
              <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
                <img src={currentUser.photoUrl} alt="avatar" className="w-8 h-8 rounded-full border border-slate-700 object-cover" referrerPolicy="no-referrer" />
                <div className="text-left font-sans">
                  <span className="block font-bold truncate text-slate-200">{currentUser.firstName} {currentUser.lastName}</span>
                  <span className="block text-[10px] text-slate-400 uppercase font-mono tracking-wider font-semibold">{currentUser.role}</span>
                </div>
                <button
                  id="headerLogoutBtn"
                  onClick={handleLogout}
                  className="p-1.5 bg-rose-950/40 border border-rose-800 hover:bg-rose-900 text-rose-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="ออกจากระบบการช่าง"
                >
                  <LogOut size={13} />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Main Page content viewport switch */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 no-print">
        
        {/* VIEW 1: HOME PAGE (WELCOME TO AMT - AUTH FORM) */}
        {currentScreen === 'home' && (
          <div className="max-w-md mx-auto py-12">
            
            {/* Login Frame column */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
              <h3 className="font-sans font-extrabold text-slate-900 text-lg mb-1 flex items-center gap-2">
                <LogIn size={20} className="text-slate-800" />
                <span>ลงชื่อเข้าใช้ระบบ AMT Connect</span>
              </h3>
              <p className="text-[10px] text-slate-400 mb-4 uppercase font-mono tracking-wider">Aviation Secure login gateway</p>

              {/* Login Method tabs */}
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 gap-1 mb-4 select-none">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod('password');
                    setIsLoginCameraActive(false);
                  }}
                  className={`flex-1 text-[11px] font-bold py-1.5 rounded-md transition-all cursor-pointer text-center ${
                    loginMethod === 'password' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  ใช้รหัสผ่าน (Password)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod('qr');
                    setIsLoginCameraActive(true);
                  }}
                  className={`flex-1 text-[11px] font-bold py-1.5 rounded-md transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                    loginMethod === 'qr' ? 'bg-[#0F172A] text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <QrCode size={12} />
                  <span>สแกน QR Code</span>
                </button>
              </div>

              {loginMethod === 'password' ? (
                <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs animate-fade-in">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      รหัสนักศึกษา หรือ รหัสบุคลากร (User ID) *
                    </label>
                    <input
                      id="loginIdInput"
                      type="text"
                      required
                      placeholder="เช่น 67010214 หรือ STAFF101"
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      className="w-full border border-slate-250 px-3 py-2 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 font-mono text-sm uppercase transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      รหัสผ่านเข้าเล่นระบบ (Password) *
                    </label>
                    <input
                      id="loginPasswordInput"
                      type="password"
                      required
                      placeholder="ป้อนรหัสเข้าใช้ของคุณ"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full border border-slate-250 px-3 py-2 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 font-mono text-sm transition-all"
                    />
                  </div>

                  <button
                    id="loginSubmitBtn"
                    type="submit"
                    className="w-full bg-[#0F172A] hover:bg-slate-850 text-white font-extrabold py-2.5 rounded-lg shadow-sm text-xs transition-colors tracking-wide cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <LogIn size={13} />
                    <span>เข้าสู่ระบบความปลอดภัย</span>
                  </button>
                </form>
              ) : (
                <div className="space-y-4 animate-fade-in text-xs">
                  {scannedUser ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center space-y-4 animate-fade-in">
                      <div className="text-slate-600 font-bold text-xs uppercase tracking-wider mb-1 flex items-center justify-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>ตรวจพบข้อมูลสิทธิ์เข้าใช้งาน</span>
                      </div>
                      
                      <div className="flex flex-col items-center space-y-2">
                        {scannedUser.photoUrl ? (
                          <img
                            src={scannedUser.photoUrl}
                            alt={`${scannedUser.firstName} Profile`}
                            className="w-20 h-20 rounded-full border-2 border-slate-800 object-cover shadow-xs"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-slate-200 border-2 border-slate-300 flex items-center justify-center text-slate-500 font-extrabold text-2xl select-none">
                            {scannedUser.firstName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <h4 className="font-sans font-extrabold text-slate-950 text-sm">
                            {scannedUser.firstName} {scannedUser.lastName}
                          </h4>
                          <p className="text-[10px] text-slate-450 font-mono mt-0.5">
                            ID: {scannedUser.id}
                          </p>
                        </div>
                        
                        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] bg-slate-900 text-slate-100 font-bold border border-slate-705">
                          {scannedUser.role}
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-slate-200 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setScannedUser(null);
                            setIsLoginCameraActive(true);
                          }}
                          className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-[11px] rounded-lg cursor-pointer transition-colors"
                        >
                          สแกนใหม่ (Cancel)
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => {
                            const confirmedUser = scannedUser;
                            setScannedUser(null);
                            setCurrentUser(confirmedUser);
                            setCurrentScreen('dashboard');
                            setIsLoginCameraActive(false);
                            Swal.fire({
                              icon: 'success',
                              title: 'เข้าสู่ระบบสำเร็จ',
                              text: `ยินดีต้อนรับคุณ ${confirmedUser.firstName} (${confirmedUser.role})`,
                              timer: 1500,
                              showConfirmButton: false
                            });
                          }}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] rounded-lg cursor-pointer shadow-sm transition-colors"
                        >
                          ยืนยันเข้าสู่ระบบ
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="border border-slate-200 bg-slate-950 rounded-lg p-3 text-center text-white relative">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] font-mono tracking-widest text-emerald-400 flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${isLoginCameraActive ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
                            QR SCANNER PORT
                          </span>
                          <div className="flex items-center gap-1.5">
                            {isLoginCameraActive && (
                              <button
                                type="button"
                                onClick={() => setLoginCameraFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
                                className="bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/30 text-emerald-300 text-[8.5px] px-2.5 py-0.5 rounded cursor-pointer font-bold flex items-center gap-1 active:scale-95 transition-all"
                              >
                                <RefreshCw size={10} />
                                <span>สลับกล้อง ({loginCameraFacingMode === 'environment' ? 'หลัง' : 'หน้า'})</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setIsLoginCameraActive(!isLoginCameraActive)}
                              className="bg-white/10 hover:bg-white/20 text-white text-[8.5px] px-2 py-0.5 rounded cursor-pointer"
                            >
                              {isLoginCameraActive ? 'พักกล้อง' : 'เปิดทำงาน'}
                            </button>
                          </div>
                        </div>

                        {isLoginCameraActive ? (
                          <div>
                            {loginCameraError ? (
                              <div className="text-rose-400 text-[10px] p-2 bg-rose-950/40 rounded border border-rose-900/40 select-none">
                                ⚠️ {loginCameraError}
                              </div>
                            ) : (
                              <div className="relative w-full h-64 bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800 flex items-center justify-center">
                                <div
                                  id="login-qr-reader"
                                  className="absolute inset-0 w-full h-full object-cover"
                                />
                                {/* Scanning square targeting HUD with guiding prompt */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 p-2">
                                  <div className="w-40 h-40 border border-white/10 rounded-lg relative flex items-center justify-center bg-emerald-500/5">
                                    {/* Pulsing Emerald Corners */}
                                    <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl-sm animate-pulse" />
                                    <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr-sm animate-pulse" />
                                    <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl-sm animate-pulse" />
                                    <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br-sm animate-pulse" />
                                    
                                    {/* Sweeping laser line */}
                                    <div className="w-full h-0.5 bg-emerald-400 animate-bounce shadow-[0_0_8px_#10b981]" style={{ animationDuration: '2.5s' }} />
                                    
                                    {/* Helper instruction directly targeting user intent */}
                                    <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[9px] font-sans font-bold text-emerald-400 tracking-wider text-center uppercase bg-slate-950/95 px-2.5 py-1 rounded border border-emerald-500/30 whitespace-nowrap shadow-md select-none">
                                      เล็งคิวอาร์โค้ด (QR CODE) ในกรอบนี้
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-64 bg-slate-900 rounded flex flex-col items-center justify-center text-slate-500 border border-slate-800">
                            <Camera size={26} className="opacity-45 mb-1.5" />
                            <span className="text-[10px] font-bold">กล้องปิดการทำงานชั่วคราว</span>
                            <span className="text-[8.5px] font-mono opacity-55 uppercase mt-0.5">CAMERA INTERFACE STANDBY</span>
                          </div>
                        )}
                      </div>


                    </>
                  )}
                </div>
              )}


              <div className="mt-4 border-t border-slate-100 pt-3 text-center">
                <span className="text-[11px] text-slate-500 font-sans">ยังไม่ได้เชื่อมต่อหรือลงทะเบียนบัญชี?</span>
                <button
                  id="goRegisterBtn"
                  onClick={() => setCurrentScreen('register')}
                  className="ml-1.5 font-bold text-slate-950 hover:underline cursor-pointer"
                >
                  ลงทะเบียนผู้ใช้ใหม่ที่นี่
                </button>
              </div>
            </div>

          </div>
        )}

        {/* VIEW 2: REGISTER PROFILE PAGE */}
        {currentScreen === 'register' && (
          <div className="py-6 sm:py-12">
            <RegistrationForms 
              onRegisterSuccess={handleRegisterSuccess} 
              onCancel={() => setCurrentScreen('home')} 
              existingUsers={db.users}
            />
          </div>
        )}

        {/* VIEW 3: SYSTEM DASHBOARD (ACCORDING TO DIFFERENT LOGGED ROLES) */}
        {currentScreen === 'dashboard' && currentUser && (
          <div className="space-y-6">
            
            {/* Display profile welcome overlay and screen navigation alerts */}
            <div className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs">
              <div>
                <span className="bg-slate-100 text-slate-700 uppercase tracking-widest font-mono text-[9px] font-extrabold px-2.5 py-1 rounded-full border border-slate-200 shadow-3xs">
                  {currentUser.role} AREA BOARD
                </span>
                <h3 className="font-sans font-extrabold text-slate-900 text-base sm:text-lg mt-1.5">
                  ยินดีต้อนรับกลับอู่เครื่องบิน, {currentUser.firstName} {currentUser.lastName}
                </h3>
              </div>
            </div>

            {/* ROUTE INDIVIDUAL DASHBOARD ROOT DEPENDING ON USER POSITION ROLE */}
            {currentUser.role === 'Admin' ? (
              <AdminPanel
                users={db.users}
                roomRequests={db.roomRequests}
                roomUsageRecords={db.roomUsageRecords}
                borrowRecords={db.borrowRecords}
                onApproveUser={handleApproveUser}
                onRejectUser={handleRejectUser}
                onUpdateUserStatus={handleUpdateStudentStatus}
                onToggleRecordStatus={handleToggleRecordStatus}
                onViewStudentCard={(user) => setActiveCardUser(user)}
                onViewRequestDoc={(req) => setActiveRequestDoc(req)}
                onPrintUsageRecords={() => setShowUsageRecordDoc(true)}
                onReloadDb={() => setDb(APIService.getDb())}
              />
            ) : currentUser.role === 'Training Manager' || currentUser.role === 'Training Staff' ? (
              <TrainingManagerPanel
                currentUser={currentUser}
                users={db.users}
                roomRequests={db.roomRequests}
                classSchedules={db.schedules}
                roomUsageRecords={db.roomUsageRecords}
                borrowRecords={db.borrowRecords}
                onUpdateProfile={handleUpdateProfile}
                onSubmitRoomRequest={handleSubmitRoomRequest}
                onUpdateStudentStatusByStaff={handleUpdateStudentStatusByStaff}
                onApproveStudentStatusByManager={handleApproveStudentStatusByManager}
                onViewRequestDoc={(req) => setActiveRequestDoc(req)}
                onPrintUsageRecords={() => setShowUsageRecordDoc(true)}
              />
            ) : currentUser.role === 'Maintenance Manager' || currentUser.role === 'Maintenance Staff' ? (
              <MaintenancePanel
                currentUser={currentUser}
                roomRequests={db.roomRequests}
                roomUsageRecords={db.roomUsageRecords}
                equipments={db.equipment}
                borrowRecords={db.borrowRecords}
                onCertifyRoomRequest={handleCertifyRoomRequest}
                onAcknowledgeUsageRecord={handleToggleRecordStatus}
                onAddEquipment={handleAddEquipment}
                onCheckReturnEquipment={handleCheckReturnEquipment}
                onUpdateCalibration={handleUpdateCalibration}
                onUpdateProfile={handleUpdateProfile}
                onPrintUsageRecords={() => setShowUsageRecordDoc(true)}
                onViewRequestDoc={(req) => setActiveRequestDoc(req)}
              />
            ) : (
              /* Office Manager, Exam Staff, Students and general Instructors Panel */
              <ExamOfficeStudentPanel
                currentUser={currentUser}
                users={db.users}
                roomRequests={db.roomRequests}
                classSchedules={db.schedules}
                examSchedules={db.examSchedules}
                examGrades={db.examGrades}
                equipments={db.equipment}
                borrowRecords={db.borrowRecords}
                onAddSchedule={handleAddSchedule}
                onAddExam={handleAddExam}
                onAddGrade={handleAddGrade}
                onBorrowEquipment={handleBorrowEquipment}
                onReturnEquipment={handleReturnEquipment}
                onSubmitRoomRequest={handleSubmitRoomRequest}
                onViewRequestDoc={(req) => setActiveRequestDoc(req)}
                onUpdateProfile={handleUpdateProfile}
              />
            )}

          </div>
        )}

      </main>

      {/* 3. Footer markup */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center select-none no-print">
        <p className="font-sans text-[11px] text-slate-500 font-bold uppercase tracking-wider">
          ระบบ AMT Connect I ผู้พัฒนา นายซัยฟูลลอฮ อาแวบือราเฮง และนาย เลิศภพ เสตะพะ
        </p>
        <p className="font-mono text-[9px] text-slate-400 mt-1.5 uppercase font-semibold">
          © {new Date().getFullYear()} AMT THALANG COMPLIANT PART-147 AVIATION SCHOOL INFRASTRUCTURE
        </p>
      </footer>

      {/* --- PRINT FLOATING PORTABLES OVERLAYS FRAME SECTION --- */}
      {activeCardUser && (
        <StudentIdCard 
          user={activeCardUser} 
          onClose={() => setActiveCardUser(null)} 
        />
      )}

      {activeRequestDoc && (
        <RoomRequestDoc 
          request={activeRequestDoc} 
          onClose={() => setActiveRequestDoc(null)} 
        />
      )}

      {showUsageRecordDoc && (
        <RoomUsageRecordDoc 
          records={db.roomUsageRecords} 
          roomRequests={db.roomRequests}
          onClose={() => setShowUsageRecordDoc(false)} 
        />
      )}

    </div>
  );
}
