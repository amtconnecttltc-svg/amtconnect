/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, UserRole } from '../types';
import SignaturePad from './SignaturePad';
import { UserPlus, Image as ImageIcon, Key, Mail, UserCheck, ShieldAlert } from 'lucide-react';
import Swal from 'sweetalert2';

interface RegistrationFormsProps {
  onRegisterSuccess: (user: Omit<User, 'status' | 'createdAt'>) => void;
  onCancel: () => void;
  existingUsers: User[];
}

export default function RegistrationForms({ onRegisterSuccess, onCancel, existingUsers }: RegistrationFormsProps) {
  const [tab, setTab] = useState<'student' | 'instructor'>('student');
  
  // Registration States
  const [id, setId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [signature, setSignature] = useState('');
  const [instructorRole, setInstructorRole] = useState<UserRole>('Instructor');

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      Swal.fire({
        icon: 'warning',
        title: 'รูปภาพมีขนาดใหญ่เกินไป',
        text: 'กรุณาอัพโหลดรูปภาพขนาดไม่เกิน 1MB เพื่อลดการใช้ข้อมูลและทำให้การโหลดหน้าบอร์ดเสถียร',
        confirmButtonColor: '#171717'
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const getFormErrors = (): string | null => {
    if (!id.trim()) return 'กรุณาระบุรหัสประจำตัว หรือรหัสนักศึกษา';
    if (!firstName.trim() || !lastName.trim()) return 'กรุณากรอกชื่อและนามสกุลจริง';
    if (!email.trim() || !email.includes('@')) return 'กรุณากรอกอีเมลที่ถูกต้อง';
    if (password.length < 4) return 'รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร';
    if (!photoUrl) return 'กรุณาอัพโหลดรูปถ่ายผู้ใช้งานเพื่อสร้างบัตรประจำตัวการช่าง';
    if (!signature) return 'กรุณาเขียนลายเซ็นรับรองข้อมูลของคุณ';
    
    // Check duplication
    const duplicate = existingUsers.some(u => u.id.toLowerCase().trim() === id.toLowerCase().trim());
    if (duplicate) {
      return 'รหัสประจำตัวนี้เคยลงทะเบียนไว้ในระบบแล้ว กรุณาใช้รหัสส่วนตัวอื่นของคุณ';
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errorMsg = getFormErrors();
    if (errorMsg) {
      Swal.fire({
        icon: 'error',
        title: 'ข้อมูลไม่ครบถ้วน',
        text: errorMsg,
        confirmButtonColor: '#171717'
      });
      return;
    }

    const role: UserRole = tab === 'student' ? 'นักศึกษา' : instructorRole;
    
    // Auto calculate batch for student
    const calculatedBatch = tab === 'student' ? id.slice(0, 2) : undefined;

    onRegisterSuccess({
      id: id.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      password,
      photoUrl,
      signature,
      role,
      batch: calculatedBatch,
    });
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white border border-neutral-300 rounded-lg shadow-md p-6 sm:p-8 animate-fade-in text-neutral-900">
      
      {/* Title */}
      <div className="text-center mb-6">
        <h2 className="font-sans font-extrabold text-xl sm:text-2xl tracking-tight text-neutral-950 flex justify-center items-center gap-2">
          <UserPlus className="text-neutral-900" size={24} />
          <span>ลงทะเบียน AMT Connect</span>
        </h2>
        <p className="text-xs text-neutral-500 mt-1 uppercase font-mono tracking-widest">
          AIRCRAFT MAINTENANCE REGISTRATION CENTER
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border border-neutral-300 rounded-md p-1 mb-6 bg-neutral-150">
        <button
          id="studentRegTabBtn"
          type="button"
          onClick={() => { setTab('student'); setId(''); }}
          className={`flex-1 py-2 text-xs font-sans font-bold rounded-sm transition-all cursor-pointer ${
            tab === 'student'
              ? 'bg-neutral-950 text-white shadow'
              : 'text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          นักศึกษาการช่าง (Student)
        </button>
        <button
          id="staffRegTabBtn"
          type="button"
          onClick={() => { setTab('instructor'); setId(''); }}
          className={`flex-1 py-2 text-xs font-sans font-bold rounded-sm transition-all cursor-pointer ${
            tab === 'instructor'
              ? 'bg-neutral-950 text-white shadow'
              : 'text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          ครู / บุคลากร (Staff / Instructor)
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
        {/* Profile Picture Upload Input */}
        <div className="flex flex-col items-center justify-center p-4 border border-dashed border-neutral-300 rounded-lg bg-stone-50 gap-2 mb-4">
          <span className="font-bold text-neutral-700">รูปภาพประจำตัวประจำบัตรการช่าง *</span>
          <div className="w-24 h-24 rounded bg-neutral-200 border border-neutral-300 overflow-hidden flex items-center justify-center relative shadow-inner">
            {photoUrl ? (
              <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="text-neutral-400" size={24} />
            )}
          </div>
          <label className="text-[10px] font-sans font-bold px-3 py-1.5 bg-neutral-950 text-white rounded hover:bg-neutral-850 transition-all cursor-pointer shadow-sm">
            <span>เลือกไฟล์เพื่ออัพโหลดรูป</span>
            <input
              id="photoUploadInput"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </label>
          <span className="text-[9px] text-neutral-400">ขนาดแนะนำเป็นรูปสากลแนวตั้ง (ไม่เกิน 1MB)</span>
        </div>

        {/* Input fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-neutral-700 mb-1">
              {tab === 'student' ? 'รหัสนักศึกษา (Student ID) *' : 'รหัสประจำตัวครู/บุคลากร (Staff ID) *'}
            </label>
            <input
              id="regIdInput"
              type="text"
              required
              placeholder={tab === 'student' ? 'เช่น 67010214' : 'เช่น STAFF203'}
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900 font-mono text-sm"
            />
          </div>

          {tab === 'instructor' && (
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                ตำแหน่งบุคลากร (Position / Roles) *
              </label>
              <select
                id="instructorRoleSelect"
                value={instructorRole}
                onChange={(e) => setInstructorRole(e.target.value as UserRole)}
                className="w-full border border-neutral-300 px-2 py-2 rounded focus:outline-none focus:border-neutral-900 font-sans font-medium text-xs bg-white"
              >
                <option value="Instructor">Instructor (อาจารย์ผู้สอน)</option>
                <option value="Training Manager">Training Manager (ผู้จัดการฝ่ายการระบายฝึกอบรม)</option>
                <option value="Training Staff">Training Staff (เจ้าหน้าที่ฝ่ายอบรม)</option>
                <option value="Examination Manager">Examination Manager (ผู้จัดการฝ่ายสอบ/วิชาการ)</option>
                <option value="Examination Staff">Examination Staff (เจ้าหน้าที่ฝ่ายวิชาการและระบบสอบ)</option>
                <option value="Maintenance Manager">Maintenance Manager (ผู้จัดการแผนกซ่อมบำรุงในอู่)</option>
                <option value="Maintenance Staff">Maintenance Staff (เจ้าหน้าที่สลักบำรุงและโรงมือ)</option>
                <option value="Office Manager">Office Manager (ผู้จัดการส่วนงานทะเบียนและตาราง)</option>
                <option value="Office Staff">Office Staff (เจ้าหน้าที่ส่วนตารางเรียน)</option>
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-neutral-700 mb-1">ชื่อจริง (First Name) *</label>
            <input
              id="firstNameInput"
              type="text"
              required
              placeholder="กรอกชื่อจริงของคุณ"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-neutral-700 mb-1">นามสกุล (Last Name) *</label>
            <input
              id="lastNameInput"
              type="text"
              required
              placeholder="กรอกนามสกุลของคุณ"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full border border-neutral-300 px-3 py-2 rounded focus:outline-none focus:border-neutral-900 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-neutral-700 mb-1">อีเมลผู้ติดต่อ (Email) *</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                <Mail size={12} />
              </span>
              <input
                id="regEmailInput"
                type="email"
                required
                placeholder="เช่น student@amt.ac.th"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-neutral-300 pl-8 pr-3 py-2 rounded focus:outline-none focus:border-neutral-900 text-xs font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-neutral-700 mb-1">รหัสผ่านสำหรับล็อกอินเข้าใช้ระบบ *</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                <Key size={12} />
              </span>
              <input
                id="regPasswordInput"
                type="password"
                required
                placeholder="รหัสเข้าใช้ (อย่างต่ำ 4 หลัก)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-neutral-300 pl-8 pr-3 py-2 rounded focus:outline-none focus:border-neutral-900 text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Hand Drawing Digital Signature */}
        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-neutral-800">
            เซ็นลายเซ็นอิเล็กทรอนิกส์ (Digital Signature Drawing) *
          </label>
          <SignaturePad 
            onSave={(dataUrl) => setSignature(dataUrl)}
            placeholder="โปรดบรรจงเขียนลายเซ็นของคุณบนพื้นที่สี่เหลี่ยมด้านล่างเพื่อรับรองบัตรการช่าง"
          />
        </div>

        {/* Warning text under form */}
        <div className="flex gap-2 items-start p-3 bg-stone-100 rounded text-[10px] text-neutral-600 border border-neutral-200">
          <ShieldAlert className="text-neutral-700 shrink-0 mt-0.5" size={14} />
          <p>
            * ข้อมูลรหัสประจำตัวจะไม่สามารถเปลี่ยนภายหลังได้ เมื่อส่งข้อมูลแล้ว ระบบแอดมินจะต้องดำเนินการกดยอมรับแบบฟอร์มสัญญานี้ก่อน คุณถึงจะมีสิทธิ์เข้าใช้ระบบ AMT Connect
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-3 border-t border-neutral-200">
          <button
            id="cancelRegBtn"
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-neutral-100 border border-neutral-300 hover:bg-neutral-200 text-neutral-700 rounded font-bold transition-all cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            id="submitRegBtn"
            type="submit"
            className="px-6 py-2 bg-black text-white hover:bg-neutral-850 rounded font-extrabold shadow transition-all cursor-pointer flex items-center gap-1.5"
          >
            <UserCheck size={14} />
            <span>ส่งใบลงทะเบียน</span>
          </button>
        </div>
      </form>
    </div>
  );
}
