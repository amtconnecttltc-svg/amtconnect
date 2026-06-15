/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  User,
  RoomRequest,
  RoomUsageRecord,
  Equipment,
  BorrowRecord,
  ClassSchedule,
  ExamSchedule,
  ExamGrade,
} from '../types';

// The Fallback Google Apps Script URL provided by the user
export const DEFAULT_GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwiywQDhRdU0SqXkHqpeNka75o4Kh52a3u0fTiVQUuXo_FGAHi90Q-QRxQzcvqXecM/exec';

export function getGoogleScriptUrl(): string {
  try {
    const envUrl = (import.meta as any).env?.VITE_GOOGLE_SCRIPT_URL;
    if (envUrl) {
      return envUrl.trim();
    }
    return localStorage.getItem('amt_conn_google_script_url') || DEFAULT_GOOGLE_SCRIPT_URL;
  } catch {
    return DEFAULT_GOOGLE_SCRIPT_URL;
  }
}

export function saveGoogleScriptUrl(url: string) {
  try {
    localStorage.setItem('amt_conn_google_script_url', url.trim());
  } catch (err) {
    console.warn('Failed to save Google Script URL:', err);
  }
}

// Initial Mock Seed Data to make the Aviation Hangar App immediately beautiful and fully functional:
const DEFAULT_USERS: User[] = [
  {
    id: 'ADMIN',
    photoUrl: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150',
    firstName: 'Admin',
    lastName: 'System',
    role: 'Admin',
    signature: 'SYSTEM_ADMIN_PASS',
    email: 'admin@amtconnect.com',
    status: 'Active',
    createdAt: '2026-01-01',
  }
];

const DEFAULT_ROOMS = [
  'Practical Area in Hangar',
  'Meeting Room',
  'Theoretical Classroom',
  'Library Room',
  'Workshop 1',
  'Workshop 2',
  'Fiberglass Workshop',
  'Examination Room',
  'Aerodynamic Room',
  'Electrical Room',
];

const DEFAULT_EQUIPMENT: Equipment[] = [];

const DEFAULT_SCHEDULES: ClassSchedule[] = [];

const DEFAULT_ROOM_REQUESTS: RoomRequest[] = [];

const DEFAULT_ROOM_USAGE_RECORDS: RoomUsageRecord[] = [];

const DEFAULT_EXAMS: ExamSchedule[] = [];

const DEFAULT_GRADES: ExamGrade[] = [];

/**
 * Compresses base64 dataURL to around 120x150 JPEG for maximum storage containment.
 * Reduces storage usage from ~1MB to ~5KB (a 200x savings!)
 */
export function compressImage(base64Str: string, maxWidth: number = 130, maxHeight: number = 160, quality: number = 0.65): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !base64Str || !base64Str.startsWith('data:image')) {
      resolve(base64Str);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64Str);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // Use quality parameter for direct size reduction
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      } catch (err) {
        console.warn('Image compression failed, using original', err);
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
    img.src = base64Str;
  });
}

// Helper to access LocalStorage state
export function getLocalStorageState() {
  const getOrSet = <T>(key: string, defaultValue: T): T => {
    const val = localStorage.getItem(`amt_conn_${key}`);
    if (val === null) {
      try {
        localStorage.setItem(`amt_conn_${key}`, JSON.stringify(defaultValue));
      } catch (e) {
        console.warn(`Failed to initialize key state for ${key}`, e);
      }
      return defaultValue;
    }
    try {
      return JSON.parse(val);
    } catch {
      return defaultValue;
    }
  };

  return {
    users: getOrSet<User[]>('users', DEFAULT_USERS),
    roomRequests: getOrSet<RoomRequest[]>('roomRequests', DEFAULT_ROOM_REQUESTS),
    roomUsageRecords: getOrSet<RoomUsageRecord[]>('roomUsageRecords', DEFAULT_ROOM_USAGE_RECORDS),
    equipment: getOrSet<Equipment[]>('equipment', DEFAULT_EQUIPMENT),
    borrowRecords: getOrSet<BorrowRecord[]>('borrowRecords', []),
    schedules: getOrSet<ClassSchedule[]>('schedules', DEFAULT_SCHEDULES),
    examSchedules: getOrSet<ExamSchedule[]>('examSchedules', DEFAULT_EXAMS),
    examGrades: getOrSet<ExamGrade[]>('examGrades', DEFAULT_GRADES),
  };
}

export function saveLocalStorageState(state: ReturnType<typeof getLocalStorageState>) {
  try {
    Object.entries(state).forEach(([key, val]) => {
      localStorage.setItem(`amt_conn_${key}`, JSON.stringify(val));
    });
  } catch (err: any) {
    console.warn('LocalStorage save error encountered:', err);
    // Detect QuotaExceededError
    const isQuotaError = 
      err.name === 'QuotaExceededError' || 
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err.code === 22 || 
      err.code === 1014 || 
      err.message?.toLowerCase().includes('quota') ||
      err.message?.toLowerCase().includes('exceeded');

    if (isQuotaError) {
      console.warn('LocalStorage limit exceeded! Performing automatic database compression and purging old histories.');
      
      // Keep only latest 10 room requests
      if (state.roomRequests && state.roomRequests.length > 10) {
        state.roomRequests = state.roomRequests.slice(-10);
      }
      // Keep only latest 10 room usage records
      if (state.roomUsageRecords && state.roomUsageRecords.length > 10) {
        state.roomUsageRecords = state.roomUsageRecords.slice(-10);
      }
      // Keep only latest 10 borrow records
      if (state.borrowRecords && state.borrowRecords.length > 10) {
        state.borrowRecords = state.borrowRecords.slice(-10);
      }
      // Keep only latest 15 class schedules
      if (state.schedules && state.schedules.length > 15) {
        state.schedules = state.schedules.slice(-15);
      }
      
      try {
        Object.entries(state).forEach(([key, val]) => {
          localStorage.setItem(`amt_conn_${key}`, JSON.stringify(val));
        });
        console.log('Database successfully saved after history record reduction.');
      } catch (retryErr) {
        console.error('Critical quota exceeded even after history reduction. Clearing non-core collections to maintain functionality.');
        try {
          localStorage.removeItem('amt_conn_roomRequests');
          localStorage.removeItem('amt_conn_roomUsageRecords');
          localStorage.removeItem('amt_conn_borrowRecords');
          localStorage.removeItem('amt_conn_schedules');
          localStorage.removeItem('amt_conn_examSchedules');
          localStorage.removeItem('amt_conn_examGrades');
          
          localStorage.setItem('amt_conn_users', JSON.stringify(state.users));
          localStorage.setItem('amt_conn_equipment', JSON.stringify(state.equipment));
          console.warn('Saved essential user profiles and equipment database while discarding historical logs.');
        } catch (finalErr) {
          console.error('Core write failed. LocalStorage is fully locked!', finalErr);
        }
      }
    }
  }
}

// Global variable to hold sync errors or status
let isSyncing = false;
let lastSyncSuccess = false;

export async function syncWithGoogleSheets(state: ReturnType<typeof getLocalStorageState>): Promise<boolean> {
  if (isSyncing) return false;
  isSyncing = true;
  try {
    const payload = JSON.stringify({
      action: 'syncData',
      data: state,
    });

    const url = getGoogleScriptUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout for slower connections

    const response = await fetch(url, {
      method: 'POST',
      mode: 'no-cors', // Because Google redirect can lead to CORS preflight failure, "no-cors" is a safe way to write changes.
      headers: {
        'Content-Type': 'application/json',
      },
      body: payload,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    lastSyncSuccess = true;
    return true;
  } catch (err) {
    console.warn('Google Sheet Sync status (expected if not yet deployed/CORS restricted):', err);
    lastSyncSuccess = false;
    return false;
  } finally {
    isSyncing = false;
  }
}

// Force a pull from Google Sheets to sync sheets down (optional feature)
export async function pullFromGoogleSheets(): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const url = getGoogleScriptUrl();
    const response = await fetch(`${url}?action=getData`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const json = await response.json();
    if (json && typeof json === 'object') {
      return json;
    }
  } catch (err) {
    console.warn('Could not read Google Sheet API. Using Local Storage cache.', err);
  }
  return null;
}

export const APIService = {
  getRooms() {
    return DEFAULT_ROOMS;
  },

  getDb() {
    return getLocalStorageState();
  },

  saveDb(db: ReturnType<typeof getLocalStorageState>) {
    saveLocalStorageState(db);
    // Attempt sheets sync in background for non-blocking premium UX
    syncWithGoogleSheets(db).catch(() => {});
  },

  // Users Auth
  register(userData: Omit<User, 'status' | 'createdAt'>): { success: boolean; message: string; user?: User } {
    const db = this.getDb();
    const cleanId = userData.id.trim();
    const exists = db.users.some(u => u.id.toLowerCase() === cleanId.toLowerCase());
    if (exists) {
      return { success: false, message: 'รหัสประจำตัวนี้มีอยู่ในระบบแล้ว ไม่สามารถลงทะเบียนซ้ำได้' };
    }

    const newUser: User = {
      ...userData,
      id: cleanId,
      status: 'Pending', // Requires admin approve
      createdAt: new Date().toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' }),
    };

    db.users.push(newUser);
    this.saveDb(db);
    return { success: true, message: 'ลงทะเบียนสำเร็จ! กรุณารอแอดมินอนุมัติสิทธิ์เข้าใช้งาน', user: newUser };
  },

  login(id: string, passwordHash: string): { success: boolean; message: string; user?: User } {
    const db = this.getDb();
    const cleanId = id.trim();

    // Check custom credentials based on ID only
    const foundUser = db.users.find(
      u => u.id.toLowerCase() === cleanId.toLowerCase()
    );

    if (!foundUser) {
      return { success: false, message: 'ไม่พบข้อมูลผู้ใช้ หรือรหัสประจำตัวไม่ถูกต้อง' };
    }

    // If the user has a registered password, enforce password matching
    if (foundUser.password && foundUser.password !== passwordHash) {
      return { success: false, message: 'รหัสผ่านสำหรับการช่างไม่ถูกต้อง' };
    }

    // Checking status restrictions
    if (foundUser.status === 'Pending') {
      return { success: false, message: 'สถานะของท่าน: กำลังรอการอนุมัติโปรดติดต่อผู้บริหารระบบ' };
    }
    if (foundUser.status === 'พ้นสภาพ') {
      return { success: false, message: 'สถานะของท่าน: พ้นสภาพนักศึกษา/บุคคลากร และไม่สามารถเข้าสู่ระบบได้ โปรดติดต่อผู้เกี่ยวข้อง' };
    }
    if (foundUser.status === 'พักการเรียน') {
      return { success: false, message: 'สถานะของท่าน: พักการเรียน และไม่สามารถเข้าสู่ระบบได้ โปรดติดต่อผู้เกี่ยวข้อง' };
    }
    if (foundUser.status === 'จบการศึกษา') {
      return { success: false, message: 'สถานะของท่าน: จบการศึกษา และไม่สามารถเข้าสู่ระบบได้ โปรดติดต่อผู้เกี่ยวข้อง' };
    }

    return { success: true, message: 'เข้าสู่ระบบสำเร็จ', user: foundUser };
  },

  // Sync state wrapper
  getLastSyncStatus() {
    return { isSyncing, lastSyncSuccess };
  }
};

export function getAppOriginForQR(): string {
  let origin = '';
  try {
    // 1. Detect if active environment is dev or pre based on the actual page URL
    if (window.location && window.location.href) {
      if (window.location.href.includes('ais-dev-gevk6kzr7ppk3pspvl2p4h-879794802293.asia-east1.run.app')) {
        return 'https://ais-dev-gevk6kzr7ppk3pspvl2p4h-879794802293.asia-east1.run.app';
      }
      if (window.location.href.includes('ais-pre-gevk6kzr7ppk3pspvl2p4h-879794802293.asia-east1.run.app')) {
        return 'https://ais-pre-gevk6kzr7ppk3pspvl2p4h-879794802293.asia-east1.run.app';
      }
    }
  } catch (e) {
    // ignore cross-origin/sandbox exceptions
  }

  try {
    origin = window.location.origin;
  } catch (e) {
    // ignore cross-origin restrictions
  }
  
  if (!origin || origin === 'null') {
    try {
      origin = window.location.protocol + '//' + window.location.host;
    } catch (e) {
      // ignore
    }
  }

  // 2. Fallbacks based on referrer URL if the window location isn't accessible
  try {
    if (document.referrer) {
      if (document.referrer.includes('ais-dev-gevk6kzr7ppk3pspvl2p4h')) {
        return 'https://ais-dev-gevk6kzr7ppk3pspvl2p4h-879794802293.asia-east1.run.app';
      }
      if (document.referrer.includes('ais-pre-gevk6kzr7ppk3pspvl2p4h')) {
        return 'https://ais-pre-gevk6kzr7ppk3pspvl2p4h-879794802293.asia-east1.run.app';
      }
    }
  } catch (e) {
    // ignore
  }

  // default fallback
  if (!origin || origin.includes('null') || origin === '//') {
    origin = 'https://ais-pre-gevk6kzr7ppk3pspvl2p4h-879794802293.asia-east1.run.app';
  }
  
  return origin;
}

/**
 * Merges local database with pulled Google Sheet datastore records cleanly.
 * Prevents newer local registrations and credentials from being wiped out by blank sheets or delayed sync queues.
 */
export function mergeDatabases(
  localDb: ReturnType<typeof getLocalStorageState>,
  remoteDb: any
): ReturnType<typeof getLocalStorageState> {
  if (!remoteDb || typeof remoteDb !== 'object') return localDb;

  // Helper to merge arrays with unique ID (case insensitive matching)
  const mergeArrayById = <T extends { id: string }>(local: T[], remote: T[]): T[] => {
    if (!remote || !Array.isArray(remote)) return local;
    const merged = [...remote];
    local.forEach(lItem => {
      if (!lItem || !lItem.id) return;
      const exists = merged.some(rItem => rItem && rItem.id && String(rItem.id).toLowerCase().trim() === String(lItem.id).toLowerCase().trim());
      if (!exists) {
        merged.push(lItem);
      } else {
        // Find existing and merge properties, preserving local properties if remote is missing them
        const idx = merged.findIndex(rItem => rItem && rItem.id && String(rItem.id).toLowerCase().trim() === String(lItem.id).toLowerCase().trim());
        if (idx !== -1) {
          const remoteItem = merged[idx];
          const safeItem = { ...lItem };
          Object.keys(remoteItem).forEach(key => {
            const rawVal = (remoteItem as any)[key];
            if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== "") {
              (safeItem as any)[key] = rawVal;
            }
          });
          merged[idx] = safeItem;
        }
      }
    });
    return merged;
  };

  const mergedUsers = (): User[] => {
    const remoteUsers = remoteDb.users;
    if (!remoteUsers || !Array.isArray(remoteUsers)) return localDb.users;
    
    // Filter out invalid items from remote list before continuing
    const cleanRemoteUsers = remoteUsers.filter(u => u && u.id);
    const merged = [...cleanRemoteUsers];
    
    // Ensure Admin is always there
    const hasAdmin = merged.some(u => u && u.id && u.id.toLowerCase().trim() === 'admin');
    if (!hasAdmin) {
      const localAdmin = localDb.users.find(u => u && u.id && u.id.toLowerCase().trim() === 'admin');
      if (localAdmin) {
        merged.unshift(localAdmin);
      } else {
        merged.unshift({
          id: 'ADMIN',
          photoUrl: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=150',
          firstName: 'Admin',
          lastName: 'System',
          role: 'Admin',
          signature: 'SYSTEM_ADMIN_PASS',
          email: 'admin@amtconnect.com',
          status: 'Active',
          createdAt: '2026-01-01',
        });
      }
    }

    localDb.users.forEach(lUser => {
      if (!lUser || !lUser.id) return;
      const exists = merged.some(rUser => rUser && rUser.id && rUser.id.toLowerCase().trim() === lUser.id.toLowerCase().trim());
      if (!exists) {
        merged.push(lUser);
      } else {
        const idx = merged.findIndex(rUser => rUser && rUser.id && rUser.id.toLowerCase().trim() === lUser.id.toLowerCase().trim());
        if (idx !== -1) {
          const remoteUser = merged[idx] || {};
          const safeUser: User = {
            ...lUser,
            firstName: (remoteUser.firstName && String(remoteUser.firstName).trim() !== "") ? remoteUser.firstName.trim() : lUser.firstName,
            lastName: (remoteUser.lastName && String(remoteUser.lastName).trim() !== "") ? remoteUser.lastName.trim() : lUser.lastName,
            email: (remoteUser.email && String(remoteUser.email).trim() !== "") ? remoteUser.email.trim() : lUser.email,
            role: remoteUser.role || lUser.role,
            batch: remoteUser.batch || lUser.batch,
            status: remoteUser.status || lUser.status,
            password: remoteUser.password || lUser.password,
            photoUrl: remoteUser.photoUrl || lUser.photoUrl,
            signature: remoteUser.signature || lUser.signature,
            createdAt: remoteUser.createdAt || lUser.createdAt,
          };
          merged[idx] = safeUser;
        }
      }
    });

    return merged;
  };

  const mergeEquipment = (local: Equipment[], remote: Equipment[]): Equipment[] => {
    if (!remote || !Array.isArray(remote)) return local;
    const merged = [...remote];
    local.forEach(l => {
      if (!l) return;
      const exists = merged.some(r => r && (r.code === l.code || r.no === l.no));
      if (!exists) {
        merged.push(l);
      } else {
        const idx = merged.findIndex(r => r && (r.code === l.code || r.no === l.no));
        if (idx !== -1) {
          merged[idx] = {
            ...l,
            ...merged[idx],
          };
        }
      }
    });
    return merged;
  };

  return {
    users: mergedUsers(),
    roomRequests: mergeArrayById(localDb.roomRequests || [], remoteDb.roomRequests || []),
    roomUsageRecords: mergeArrayById(localDb.roomUsageRecords || [], remoteDb.roomUsageRecords || []),
    equipment: mergeEquipment(localDb.equipment || [], remoteDb.equipment || []),
    borrowRecords: mergeArrayById(localDb.borrowRecords || [], remoteDb.borrowRecords || []),
    schedules: mergeArrayById(localDb.schedules || [], remoteDb.schedules || []),
    examSchedules: mergeArrayById(localDb.examSchedules || [], remoteDb.examSchedules || []),
    examGrades: mergeArrayById(localDb.examGrades || [], remoteDb.examGrades || []),
  };
}

