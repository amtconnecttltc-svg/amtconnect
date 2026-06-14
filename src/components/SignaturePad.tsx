/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { Square, RotateCcw, Trash2, Edit3 } from 'lucide-react';

interface SignaturePadProps {
  onSave: (signatureDataUrl: string) => void;
  defaultValue?: string;
  placeholder?: string;
}

export default function SignaturePad({ onSave, defaultValue, placeholder = "เขียนลายเซ็นตรงนี้..." }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Line styles
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Handle high DPI screens
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Draw initial if default passed
    if (defaultValue) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        setHasSigned(true);
      };
      img.src = defaultValue;
    }
  }, [defaultValue]);

  // Handle resizing/reinit safely
  const clearHandler = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
    onSave('');
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      // Prevent scrolling when drawing on touch screens
      if (e.cancelable) e.preventDefault();
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSigned(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      if (e.cancelable) e.preventDefault();
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // Save image to callback
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  return (
    <div className="relative border border-neutral-300 rounded-md bg-white overflow-hidden shadow-inner group">
      <div className="absolute top-2 left-2 z-10 text-xs font-mono text-neutral-400 select-none flex items-center gap-1">
        <Edit3 size={12} />
        <span>{placeholder}</span>
      </div>

      <canvas
        id="sigPadCanvas"
        ref={canvasRef}
        className="w-full h-36 cursor-crosshair bg-stone-50 sig-canvas"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />

      <div className="absolute bottom-2 right-2 flex items-center gap-2">
        <button
          id="clearSigBtn"
          type="button"
          onClick={clearHandler}
          className="flex items-center gap-1 text-[11px] font-sans font-medium px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-sm border border-neutral-300 transition-colors cursor-pointer"
          title="ล้างข้อมูลลายเซ็น"
        >
          <RotateCcw size={12} />
          <span>ล้างสัญญศาสตร์</span>
        </button>
      </div>
      
      {hasSigned && (
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded border border-emerald-300">
          <span>มีลายเซ็นแล้ว</span>
        </div>
      )}
    </div>
  );
}
