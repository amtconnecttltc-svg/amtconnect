/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Printer, Tag } from 'lucide-react';
import { Equipment } from '../types';

interface QRCodeProps {
  value: string;
}

// Renders a high-quality QR Code using api.qrserver.com
export function CustomQRCode({ value }: QRCodeProps) {
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(value)}`;

  return (
    <div className="flex flex-col items-center bg-white p-2 border border-neutral-300 rounded shadow-sm select-all">
      <div className="h-24 w-24 flex items-center justify-center overflow-hidden p-1.5 border border-neutral-200 rounded">
        <img
          src={qrCodeUrl}
          alt={`QR Code for ${value}`}
          className="h-full w-full object-contain"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="font-mono text-[9px] text-neutral-800 tracking-widest mt-1.5 font-extrabold uppercase">
        {value}
      </div>
    </div>
  );
}

interface PrintQRCodeSheetProps {
  equipments: Equipment[];
  onClose: () => void;
}

export function PrintQRCodeSheet({ equipments, onClose }: PrintQRCodeSheetProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 no-print">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-neutral-200">
        <div className="bg-neutral-950 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag size={20} />
            <div>
              <h3 className="font-sans font-bold text-base">แผ่นพิมพ์คิวอาร์โค้ดอุปกรณ์ช่างอากาศยาน</h3>
              <p className="text-xs text-neutral-400 font-mono">TLTC-AMT EQUIPMENT QR CODES BOOKLET</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              id="printQRCodeActionBtn"
              onClick={handlePrint}
              className="flex items-center gap-2 bg-white hover:bg-neutral-100 text-neutral-950 px-3 py-1.5 rounded-md font-sans font-bold text-xs transition-colors cursor-pointer"
            >
              <Printer size={14} />
              <span>สั่งพิมพ์คิวอาร์โค้ด (A4)</span>
            </button>
            <button
              id="closeQRCodeSheetBtn"
              onClick={onClose}
              className="text-neutral-400 hover:text-white transition-colors cursor-pointer text-sm font-medium"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>

        <div className="p-8 overflow-y-auto bg-neutral-50 flex-1">
          {/* Printable section starts here */}
          <div className="bg-white p-8 border border-neutral-300 shadow-md max-w-[210mm] mx-auto min-h-[297mm]">
            {/* Aviation Hangar Header */}
            <div className="border-b-4 border-double border-neutral-900 pb-4 mb-6 text-center">
              <h1 className="font-sans font-extrabold text-2xl tracking-normal text-neutral-950 font-semibold">航空整備 | AIRCRAFT MAINTENANCE EDUCATION CENTER</h1>
              <p className="font-sans text-xs text-neutral-600 mt-1 font-medium">สถาบันฝึกอบรมช่างบำรุงรักษาอากาศยาน • วิทยาลัยเทคนิคถลาง (TLTC)</p>
              <p className="font-mono text-[10px] text-neutral-500 uppercase mt-0.5 font-semibold">Inventory QR Code Booklet • Doc Ref: AMT-TL-QR01-2026</p>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {equipments.map((tool) => (
                <div
                  key={tool.code}
                  className="border border-neutral-400 p-4 rounded bg-white flex flex-col items-center justify-between gap-2 h-48 text-center print-card"
                >
                  <div className="w-full">
                    <p className="font-sans text-[11px] font-sans font-extrabold truncate text-neutral-900 uppercase leading-normal">
                      {tool.toolName}
                    </p>
                    <p className="font-mono text-[9px] text-neutral-500 leading-tight">
                      P/N: {tool.partNumber || '-'} <br />
                      S/N: {tool.serialNumber || '-'}
                    </p>
                  </div>

                  <CustomQRCode value={tool.code} />

                  <div className="w-full flex items-center justify-between border-t border-dotted border-neutral-300 pt-1 text-[8px] font-mono text-neutral-500 uppercase">
                    <span>LOC: {tool.location || 'Hangar'}</span>
                    <span>AMT-TLTC</span>
                  </div>
                </div>
              ))}
            </div>

            {equipments.length === 0 && (
              <div className="text-center py-20 text-neutral-400 font-sans">
                ไม่มีข้อมูลอุปกรณ์สำหรับพิมพ์คิวอาร์โค้ด
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
