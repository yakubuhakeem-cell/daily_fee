/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useApp } from '../context/AppContext';
import { Student, StudentClass } from '../types';
import { 
  Camera, 
  Upload, 
  Printer, 
  Search, 
  Contact, 
  Sliders, 
  Sparkles, 
  X, 
  Check, 
  RefreshCw, 
  ShieldAlert, 
  Info,
  Phone,
  User,
  Layers,
  CheckCircle2,
  Trash2
} from 'lucide-react';

export const IdCardsGeneratorTab: React.FC = () => {
  const { 
    students, 
    updateStudent, 
    activeTerm, 
    currentDate,
    playFeedbackSound
  } = useApp();

  // Search and selection state
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  
  // Customization options
  const [cardTheme, setCardTheme] = useState<'dark' | 'light'>('dark');
  const [accentColor, setAccentColor] = useState<'amber' | 'emerald' | 'blue' | 'red'>('amber');
  const [showQrCode, setShowQrCode] = useState(true);
  const [customExpiry, setCustomExpiry] = useState('');

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const videoRef = useRef<HTMLVideoElement>(null);

  // QR Code state
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Editable Student form fields (so they can make quick adjustments before printing)
  const [editName, setEditName] = useState('');
  const [editClass, setEditClass] = useState<StudentClass>('B1');
  const [editRollNumber, setEditRollNumber] = useState('');
  const [editGender, setEditGender] = useState<'Male' | 'Female' | undefined>(undefined);
  const [editGuardianPhone, setEditGuardianPhone] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const classes: StudentClass[] = [
    'Nursery', 'KG1', 'KG2',
    'B1', 'B2', 'B3', 'B4', 'B5', 'B6',
    'B7', 'B8', 'B9'
  ];

  // Resolve selected student
  const activeStudent = students.find(s => s.id === selectedStudentId);

  // Initialize selected student into workspace
  useEffect(() => {
    if (activeStudent) {
      setEditName(activeStudent.name);
      setEditClass(activeStudent.class);
      setEditRollNumber(activeStudent.rollNumber || '');
      setEditGender(activeStudent.gender);
      setEditGuardianPhone(activeStudent.guardianPhone || '');
    } else {
      setEditName('');
      setEditRollNumber('');
      setEditGuardianPhone('');
    }
    stopCamera();
  }, [selectedStudentId]);

  // Generate QR Code for the active student
  useEffect(() => {
    if (activeStudent) {
      const qrPayload = JSON.stringify({
        id: activeStudent.id,
        name: activeStudent.name,
        rollNumber: activeStudent.rollNumber || ''
      });

      QRCode.toDataURL(qrPayload, {
        margin: 1,
        width: 150,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
        .then(url => setQrCodeDataUrl(url))
        .catch(err => {
          console.error("Failed to generate QR Code in generator tab", err);
          setQrCodeDataUrl('');
        });
    } else {
      setQrCodeDataUrl('');
    }
  }, [activeStudent]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Filter students based on search query and class
  const filteredStudents = students.filter(st => {
    const matchesSearch = searchQuery.trim() === '' || 
      st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (st.rollNumber && st.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesClass = classFilter === 'all' || st.class === classFilter;
    
    return matchesSearch && matchesClass;
  });

  // Calculate default expiration
  const getExpiryInfo = () => {
    const termName = activeTerm?.name || "Term Calendar";
    // Default expiration is end of the term, let's say 2026-08-31 or activeTerm's last day
    const termDays = activeTerm?.schoolDays || [];
    const lastDay = termDays[termDays.length - 1] || "2026-08-14";
    
    return {
      termName,
      expiryDate: customExpiry || lastDay,
      isExpired: lastDay < currentDate
    };
  };

  const expiryInfo = getExpiryInfo();

  // Color theme variables based on accent selection
  const getAccentClass = (type: 'bg' | 'text' | 'border' | 'hoverBg' | 'focusRing') => {
    switch (accentColor) {
      case 'emerald':
        if (type === 'bg') return 'bg-emerald-500';
        if (type === 'text') return 'text-emerald-400';
        if (type === 'border') return 'border-emerald-500';
        if (type === 'hoverBg') return 'hover:bg-emerald-600';
        return 'focus:ring-emerald-400';
      case 'blue':
        if (type === 'bg') return 'bg-blue-500';
        if (type === 'text') return 'text-blue-400';
        if (type === 'border') return 'border-blue-500';
        if (type === 'hoverBg') return 'hover:bg-blue-600';
        return 'focus:ring-blue-400';
      case 'red':
        if (type === 'bg') return 'bg-red-500';
        if (type === 'text') return 'text-red-400';
        if (type === 'border') return 'border-red-500';
        if (type === 'hoverBg') return 'hover:bg-red-600';
        return 'focus:ring-red-400';
      case 'amber':
      default:
        if (type === 'bg') return 'bg-amber-400';
        if (type === 'text') return 'text-amber-400';
        if (type === 'border') return 'border-amber-400';
        if (type === 'hoverBg') return 'hover:bg-amber-500';
        return 'focus:ring-amber-400';
    }
  };

  // Camera Management
  const startCamera = async (modeOverride?: 'user' | 'environment') => {
    setCameraError(null);
    const targetMode = modeOverride || cameraFacingMode;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 320, facingMode: targetMode }
      });
      setCameraStream(stream);
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.error(err);
      setCameraError('Camera access denied or webcam not connected.');
    }
  };

  const toggleCameraFacingMode = async () => {
    const nextMode = cameraFacingMode === 'user' ? 'environment' : 'user';
    setCameraFacingMode(nextMode);
    if (cameraActive) {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 320, facingMode: nextMode }
        });
        setCameraStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.error(err);
        setCameraError('Failed to toggle camera direction.');
      }
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && activeStudent) {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const video = videoRef.current;
        const size = Math.min(video.videoWidth || 320, video.videoHeight || 320);
        const xOffset = ((video.videoWidth || 320) - size) / 2;
        const yOffset = ((video.videoHeight || 320) - size) / 2;
        ctx.drawImage(video, xOffset, yOffset, size, size, 0, 0, 300, 300);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        
        // Update local student object photoUrl
        updateStudent({
          ...activeStudent,
          photoUrl: dataUrl
        });
        
        stopCamera();
        if (playFeedbackSound) playFeedbackSound('click');
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeStudent) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          updateStudent({
            ...activeStudent,
            photoUrl: reader.result
          });
          if (playFeedbackSound) playFeedbackSound('click');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    if (activeStudent && window.confirm(`Remove profile photograph for ${activeStudent.name}?`)) {
      updateStudent({
        ...activeStudent,
        photoUrl: undefined
      });
    }
  };

  // Profile data updates
  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent || !editName.trim()) return;

    setIsUpdatingProfile(true);
    try {
      updateStudent({
        ...activeStudent,
        name: editName.trim(),
        class: editClass,
        rollNumber: editRollNumber.trim(),
        gender: editGender,
        guardianPhone: editGuardianPhone.trim()
      });
      alert('Student registration profile successfully synchronized!');
    } catch (err) {
      console.error(err);
      alert('Failed to update student profile.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Direct Print Layout Renderer using standard hidden iframe
  const handlePrintBadge = () => {
    if (!activeStudent) return;

    let printIframe = document.getElementById('idcard-print-iframe') as HTMLIFrameElement;
    if (!printIframe) {
      printIframe = document.createElement('iframe');
      printIframe.id = 'idcard-print-iframe';
      printIframe.setAttribute('style', 'position:fixed; right:0; bottom:0; width:0; height:0; border:0; pointer-events:none;');
      document.body.appendChild(printIframe);
    }

    const iframeDoc = printIframe.contentWindow?.document || printIframe.contentDocument;
    if (!iframeDoc) return;

    const isDark = cardTheme === 'dark';
    const accentHex = accentColor === 'emerald' ? '#10b981' : accentColor === 'blue' ? '#3b82f6' : accentColor === 'red' ? '#ef4444' : '#fbbf24';
    const accentDullHex = accentColor === 'emerald' ? '#047857' : accentColor === 'blue' ? '#1d4ed8' : accentColor === 'red' ? '#b91c1c' : '#d97706';

    const cardBgFront = isDark 
      ? 'background: linear-gradient(135deg, #171717 0%, #0a0a0a 100%) !important; color: #ffffff !important;'
      : 'background: linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%) !important; color: #111111 !important; border: 1.5px solid #d4d4d8 !important;';

    const cardBgBack = isDark 
      ? 'background: linear-gradient(135deg, #171717 0%, #0a0a0a 100%) !important; color: #ffffff !important;'
      : 'background: linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%) !important; color: #111111 !important; border: 1.5px solid #d4d4d8 !important;';

    const textMain = isDark ? 'color: #ffffff !important;' : 'color: #111111 !important;';
    const textMuted = isDark ? 'color: #8e8e93 !important;' : 'color: #52525b !important;';
    const borderCol = isDark ? 'border-color: #27272a !important;' : 'border-color: #e4e4e7 !important;';
    const subBg = isDark ? 'background-color: #0c0a09 !important;' : 'background-color: #f4f4f5 !important;';

    const docContent = `
<!DOCTYPE html>
<html>
  <head>
    <title>SHCA Student ID - ${activeStudent.name}</title>
    <meta charset="utf-8">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=JetBrains+Mono:wght@400;700;800&display=swap" rel="stylesheet">
    <style>
      @page {
        size: landscape;
        margin: 0;
      }
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background-color: #ffffff;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        box-sizing: border-box;
      }
      .print-container {
        display: flex;
        flex-direction: row;
        gap: 16px;
        justify-content: center;
        align-items: center;
      }
      .id-card {
        width: 324px;
        height: 204px;
        border-radius: 8px;
        border: 1.5px solid ${isDark ? '#3f3f46' : '#d4d4d8'} !important;
        box-sizing: border-box;
        overflow: hidden;
        position: relative;
        font-family: 'Inter', sans-serif;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-shadow: none;
        ${cardBgFront}
      }
      .accent-top {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4.5px;
        background-color: ${accentHex} !important;
      }
      .header {
        padding: 8px 10px 4px 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid ${isDark ? '#27272a' : '#e4e4e7'} !important;
        margin-top: 4.5px;
        box-sizing: border-box;
      }
      .header-logo-container {
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .logo-badge {
        width: 16px;
        height: 16px;
        background-color: ${accentHex} !important;
        color: #000000 !important;
        border-radius: 2px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
        font-size: 8px;
        letter-spacing: -0.5px;
      }
      .logo-text {
        font-weight: 900;
        font-size: 8.5px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        ${textMain}
      }
      .active-pass-badge {
        font-size: 5.5px;
        font-weight: 900;
        background-color: #022c22 !important;
        color: #34d399 !important;
        border: 1px solid #10b981 !important;
        padding: 1px 3px;
        border-radius: 2px;
        text-transform: uppercase;
      }
      .expired-pass-badge {
        font-size: 5.5px;
        font-weight: 900;
        background-color: #450a0a !important;
        color: #f87171 !important;
        border: 1px solid #b91c1c !important;
        padding: 1px 3px;
        border-radius: 2px;
        text-transform: uppercase;
      }
      .main-content {
        padding: 5px 10px;
        display: flex;
        gap: 8px;
        flex: 1;
        align-items: center;
        box-sizing: border-box;
      }
      .avatar-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.5px;
      }
      .avatar {
        width: 54px;
        height: 54px;
        border-radius: 4.5px;
        background-color: ${isDark ? '#09090b' : '#f4f4f5'} !important;
        border: 1px solid ${isDark ? '#27272a' : '#e4e4e7'} !important;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      .avatar-placeholder {
        font-family: 'JetBrains Mono', monospace;
        font-weight: 900;
        font-size: 14px;
        text-transform: uppercase;
        color: ${accentHex} !important;
      }
      .avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover !important;
      }
      .avatar-label {
        font-size: 4.8px;
        font-family: 'JetBrains Mono', monospace;
        font-weight: 900;
        letter-spacing: 0.5px;
        ${textMuted}
      }
      .details {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 1.5px;
      }
      .field-label {
        font-size: 5.5px;
        font-family: 'JetBrains Mono', monospace;
        font-weight: 700;
        text-transform: uppercase;
        ${textMuted}
      }
      .field-val-name {
        font-size: 9.5px;
        font-weight: 900;
        text-transform: uppercase;
        max-width: 140px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
        letter-spacing: -0.1px;
        ${textMain}
      }
      .meta-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 3px;
      }
      .field-val-meta {
        font-size: 7.5px;
        font-weight: 900;
        font-family: 'JetBrains Mono', monospace;
        color: ${accentHex} !important;
      }
      .field-val-gender {
        font-size: 7.5px;
        font-weight: 700;
        ${textMain}
      }
      .reg-id-box {
        margin-top: 1px;
        font-size: 5.5px;
        font-family: 'JetBrains Mono', monospace;
        ${textMuted}
      }
      .reg-id-badge {
        font-weight: 800;
        background-color: ${isDark ? '#09090b' : '#f4f4f5'} !important;
        border: 1px solid ${isDark ? '#27272a' : '#e4e4e7'} !important;
        padding: 0.5px 2.5px;
        border-radius: 1.5px;
        margin-left: 2px;
        ${textMain}
      }
      .qr-code-box {
        width: 42px;
        height: 42px;
        background-color: #ffffff !important;
        padding: 1.5px;
        border-radius: 2px;
        border: 1px solid ${isDark ? '#27272a' : '#d4d4d8'} !important;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5px;
        box-sizing: border-box;
      }
      .qr-code-img {
        width: 34px;
        height: 34px;
      }
      .qr-label {
        font-size: 3.5px;
        font-family: 'JetBrains Mono', monospace;
        font-weight: 900;
        color: #000000 !important;
        letter-spacing: 0.1px;
        line-height: 1;
      }
      .footer {
        padding: 3px 10px;
        border-top: 1px solid ${isDark ? '#27272a' : '#e4e4e7'} !important;
        font-family: 'JetBrains Mono', monospace;
        font-size: 5.8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        ${subBg}
      }
      .footer-left {
        font-weight: 705;
        ${textMuted}
      }
      .footer-expiry {
        font-weight: 900;
        background-color: ${isDark ? '#000000' : '#e4e4e7'} !important;
        border: 1px solid ${isDark ? '#27272a' : '#d4d4d8'} !important;
        padding: 0.5px 2px;
        border-radius: 1.5px;
        font-size: 5px;
        margin-left: 2px;
        ${textMain}
      }
      .term-label {
        font-weight: 900;
        color: ${accentHex} !important;
      }
      
      /* BACK SIDE */
      .id-card-back {
        ${cardBgBack}
      }
      .back-body {
        padding: 6px 10px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        flex: 1;
        box-sizing: border-box;
      }
      .rules-title {
        font-size: 6.5px;
        font-family: 'JetBrains Mono', monospace;
        font-weight: 900;
        letter-spacing: 0.5px;
        margin-bottom: 2px;
        ${textMuted}
      }
      .rules-list {
        margin: 0;
        padding-left: 10px;
        font-size: 5.5px;
        font-weight: 700;
        line-height: 1.25;
        ${textMuted}
      }
      .rules-list li {
        margin-bottom: 1px;
      }
      .contact-meta {
        display: flex;
        justify-content: space-between;
        font-family: 'JetBrains Mono', monospace;
        font-size: 5.5px;
        border-top: 1px dashed ${isDark ? '#27272a' : '#d4d4d8'} !important;
        padding-top: 2.5px;
        margin-top: 2px;
      }
      .contact-label {
        display: block;
        font-size: 4.5px;
        ${textMuted}
      }
      .contact-val {
        font-weight: 800;
        ${textMain}
      }
      .status-banner-back {
        border-radius: 2px;
        padding: 1.5px;
        text-align: center;
        font-family: 'JetBrains Mono', monospace;
        font-size: 5px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        background-color: ${isDark ? '#09090b' : '#f4f4f5'} !important;
        border: 1px solid ${isDark ? '#18181b' : '#e4e4e7'} !important;
        ${textMuted}
      }
      .barcode-area {
        background-color: #ffffff !important;
        padding: 3px 10px;
        border-top: 1px solid ${isDark ? '#27272a' : '#e4e4e7'} !important;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
      }
      .barcode-lines {
        width: 100%;
        height: 14px;
        display: flex;
        align-items: stretch;
        gap: 0.8px;
        background-color: #ffffff !important;
      }
      .barcode-bar {
        flex: 1;
        background-color: #000000 !important;
      }
      .barcode-label {
        font-family: 'JetBrains Mono', monospace;
        font-size: 5px;
        font-weight: 700;
        letter-spacing: 1px;
        color: #52525b !important;
        margin-top: 1px;
      }
    </style>
  </head>
  <body>
    <div class="print-container">
      <div class="id-card">
        <div class="accent-top"></div>
        <div class="header">
          <div class="header-logo-container">
            <div class="logo-badge" style="background-color: ${accentHex} !important;">SH</div>
            <div class="logo-text">SHCA-SAWLA</div>
          </div>
          <div>
            <span class="${expiryInfo.isExpired ? 'expired-pass-badge' : 'active-pass-badge'}">
              ${expiryInfo.isExpired ? 'Expired' : 'Active Pass'}
            </span>
          </div>
        </div>

        <div class="main-content">
          <div class="avatar-container">
            <div class="avatar">
              ${activeStudent.photoUrl 
                ? `<img src="${activeStudent.photoUrl}" alt="${activeStudent.name}" />`
                : `<div class="avatar-placeholder" style="color: ${accentHex} !important;">${activeStudent.name.slice(0, 2).toUpperCase()}</div>`
              }
            </div>
            <span class="avatar-label">STUDENT INFO</span>
          </div>

          <div class="details">
            <div>
              <span class="field-label">Pupil Name</span>
              <span class="field-val-name">${activeStudent.name}</span>
            </div>
            <div class="meta-grid">
              <div>
                <span class="field-label">Class</span>
                <span class="field-val-meta" style="color: ${accentHex} !important;">${activeStudent.class}</span>
              </div>
              <div>
                <span class="field-label">Gender</span>
                <span class="field-val-gender">${activeStudent.gender || '—'}</span>
              </div>
            </div>
            <div class="reg-id-box">
              REG-ID: <span class="reg-id-badge">${activeStudent.rollNumber || 'SHC-' + activeStudent.id.substring(0, 5).toUpperCase()}</span>
            </div>
          </div>

          ${showQrCode ? `
          <div class="qr-code-box">
            <img class="qr-code-img" src="${qrCodeDataUrl}" />
            <span class="qr-label">GATE PASS</span>
          </div>
          ` : ''}
        </div>

        <div class="footer">
          <div class="footer-left">
            SYSTEM ACCREDITED <span class="footer-expiry">EXP: ${expiryInfo.expiryDate}</span>
          </div>
          <div class="term-label" style="color: ${accentHex} !important;">${expiryInfo.termName.toUpperCase()}</div>
        </div>
      </div>

      <div class="id-card id-card-back">
        <div class="accent-top" style="background-color: ${isDark ? '#27272a' : '#d4d4d8'} !important;"></div>
        <div class="header">
          <span class="rules-title" style="margin: 0;">SECURITY CARD POLICY &amp; RULES</span>
        </div>

        <div class="back-body">
          <ol class="rules-list">
            <li>This card remains the property of SHCA-Sawla.</li>
            <li>Always present this card for scanning &amp; gate check-ins.</li>
            <li>Loss of credential elements must be reported immediately.</li>
            <li>Unauthorized duplication or counterfeit transfer is prohibited.</li>
          </ol>

          <div class="contact-meta">
            <div>
              <span class="contact-label">Guardian Mobile</span>
              <span class="contact-val">${activeStudent.guardianPhone || 'NOT ENROLLED'}</span>
            </div>
            <div style="text-align: right;">
              <span class="contact-label">Authorized Registrar</span>
              <span class="contact-val" style="color: ${accentDullHex} !important;">YAKUBU HAKEEM</span>
            </div>
          </div>

          <div class="status-banner-back">
            Validation Active &bull; Valid thru Term Closure (${expiryInfo.expiryDate})
          </div>
        </div>

        <div class="barcode-area">
          <div class="barcode-lines">
            ${Array.from({ length: 32 }).map((_, idx) => `
              <div class="barcode-bar" style="opacity: ${idx % 3 === 0 || idx % 4 === 1 ? 1 : 0};"></div>
            `).join('')}
          </div>
          <div class="barcode-label">
            *SHCA-${activeStudent.id.substring(0, 8).toUpperCase()}*
          </div>
        </div>
      </div>
    </div>

    <script>
      window.onload = function() {
        setTimeout(function() {
          window.focus();
          window.print();
        }, 300);
      };
    </script>
  </body>
</html>
    `;

    iframeDoc.open();
    iframeDoc.write(docContent);
    iframeDoc.close();
  };

  return (
    <div id="idcard-generator-tab-root" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT COLUMN: Student Selector Directory */}
      <div className="lg:col-span-4 bg-neutral-900 border-4 border-neutral-800 p-5 flex flex-col h-[650px] space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-800">
          <Contact className="text-amber-400 shrink-0" size={18} />
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Select Student</h3>
            <p className="text-[10px] text-neutral-400 uppercase font-mono mt-0.5">Enrolled pupil registry</p>
          </div>
        </div>

        {/* Directory Filters */}
        <div className="space-y-3 font-mono">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 text-neutral-500" size={14} />
            <input
              id="idcard-student-search-input"
              type="text"
              placeholder="SEARCH BY NAME/ROLL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-950 border-2 border-neutral-850 py-2 pl-9 pr-4 text-xs text-white placeholder-neutral-600 uppercase font-black focus:outline-none focus:border-amber-400 rounded-sm"
            />
          </div>

          <select
            id="idcard-class-filter-select"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-full bg-neutral-950 border-2 border-neutral-850 p-2 text-xs text-amber-400 font-black uppercase focus:outline-none focus:border-amber-400 rounded-sm cursor-pointer"
          >
            <option value="all">ALL CLASSES ({students.length})</option>
            {classes.map(cls => (
              <option key={cls} value={cls}>
                CLASS {cls} ({students.filter(s => s.class === cls).length})
              </option>
            ))}
          </select>
        </div>

        {/* Search Results list */}
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-850 bg-neutral-950/60 border border-neutral-850 p-2 space-y-1 rounded-sm">
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-500 font-mono uppercase tracking-wider">
              No matching pupils found.
            </div>
          ) : (
            filteredStudents.map(student => {
              const isSelected = student.id === selectedStudentId;
              return (
                <div
                  id={`student-selector-item-${student.id}`}
                  key={student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                  className={`p-3 cursor-pointer transition-all flex items-center justify-between border ${
                    isSelected 
                      ? 'bg-amber-400 border-amber-450 text-black font-black' 
                      : 'hover:bg-neutral-850 border-transparent text-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-neutral-950 overflow-hidden border border-neutral-800 flex items-center justify-center">
                      {student.photoUrl ? (
                        <img 
                          src={student.photoUrl} 
                          alt={student.name} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className={`text-[10px] font-mono font-black ${isSelected ? 'text-amber-400' : 'text-neutral-500'}`}>
                          {student.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs uppercase truncate ${isSelected ? 'font-black text-black' : 'font-extrabold text-white'}`}>
                        {student.name}
                      </p>
                      <p className={`text-[9px] font-mono uppercase ${isSelected ? 'text-neutral-800' : 'text-neutral-450'}`}>
                        {student.class} • {student.rollNumber || 'NO ROLL'}
                      </p>
                    </div>
                  </div>
                  {isSelected && <Check className="text-black shrink-0 stroke-[3.5]" size={14} />}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: ID Card Workspace */}
      <div className="lg:col-span-8 space-y-6">
        {!activeStudent ? (
          <div className="bg-neutral-900 border-4 border-dashed border-neutral-800 h-[650px] flex flex-col items-center justify-center text-center p-8 space-y-4 rounded-sm">
            <Contact size={48} className="text-neutral-650 animate-bounce" />
            <div className="max-w-md">
              <h4 className="text-base font-black uppercase text-neutral-400 tracking-wider">No Student Selected</h4>
              <p className="text-xs text-neutral-550 mt-1 leading-relaxed">
                Choose an active student from the left-hand directory panel to begin configuring, capturing portrait photos, and issuing print-ready laminated ID access badges.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* WORKSPACE COLUMN 1: Profile and Photo Workspace */}
            <div className="space-y-6">
              
              {/* Profile Details Adjuster Form */}
              <div className="bg-neutral-900 border-4 border-neutral-800 p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2.5 border-b border-neutral-800">
                  <Sliders className="text-amber-400" size={16} />
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">1. Verify Profile Data</h3>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-3 font-mono text-xs">
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-neutral-400 mb-1">Full Pupil Name</label>
                    <div className="relative">
                      <User className="absolute left-2.5 top-2.5 text-neutral-500" size={12} />
                      <input
                        id="idcard-name-input"
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 py-2 pl-8 pr-3 text-white uppercase focus:outline-none focus:border-amber-400"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-neutral-400 mb-1">Cohort Class</label>
                      <select
                        id="idcard-class-select"
                        value={editClass}
                        onChange={(e) => setEditClass(e.target.value as StudentClass)}
                        className="w-full bg-neutral-950 border border-neutral-800 p-2 text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                      >
                        {classes.map(cls => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold uppercase text-neutral-400 mb-1">Gender</label>
                      <select
                        id="idcard-gender-select"
                        value={editGender || ''}
                        onChange={(e) => setEditGender((e.target.value || undefined) as any)}
                        className="w-full bg-neutral-950 border border-neutral-800 p-2 text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                      >
                        <option value="">Choose Gender</option>
                        <option value="Male">MALE</option>
                        <option value="Female">FEMALE</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-neutral-400 mb-1">Roll / ID Number</label>
                      <input
                        id="idcard-roll-input"
                        type="text"
                        value={editRollNumber}
                        onChange={(e) => setEditRollNumber(e.target.value)}
                        placeholder="e.g. SHC-1004"
                        className="w-full bg-neutral-950 border border-neutral-800 p-2 text-white placeholder-neutral-600 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold uppercase text-neutral-400 mb-1">Guardian Phone</label>
                      <div className="relative">
                        <Phone className="absolute left-2.5 top-2.5 text-neutral-500" size={12} />
                        <input
                          id="idcard-phone-input"
                          type="text"
                          value={editGuardianPhone}
                          onChange={(e) => setEditGuardianPhone(e.target.value)}
                          placeholder="e.g. +23354..."
                          className="w-full bg-neutral-950 border border-neutral-800 py-2 pl-8 pr-3 text-white placeholder-neutral-600 focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    id="idcard-save-profile-btn"
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="w-full py-2.5 bg-neutral-950 hover:bg-neutral-850 text-white font-black uppercase text-[10px] tracking-wider border-2 border-neutral-800 hover:border-amber-400 transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isUpdatingProfile ? (
                      <RefreshCw className="animate-spin text-amber-400" size={13} />
                    ) : (
                      <Check className="text-amber-400 stroke-[3]" size={13} />
                    )}
                    <span>Save & Sync Profile Details</span>
                  </button>
                </form>
              </div>

              {/* Photo Upload & Direct Camera Snap Workstation */}
              <div className="bg-neutral-900 border-4 border-neutral-800 p-5 space-y-4">
                <div className="flex items-center justify-between pb-2.5 border-b border-neutral-800">
                  <div className="flex items-center gap-2">
                    <Camera className="text-amber-400" size={16} />
                    <h3 className="text-xs font-black uppercase tracking-widest text-white">2. Portrait photo</h3>
                  </div>
                  {activeStudent.photoUrl && (
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="text-[9px] font-mono font-black uppercase text-red-500 hover:text-red-400 cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 size={11} />
                      Remove
                    </button>
                  )}
                </div>

                {/* Main Camera view container */}
                {cameraActive ? (
                  <div className="space-y-3 font-mono text-xs">
                    <div className="relative aspect-square w-full max-w-[240px] mx-auto bg-black border-4 border-neutral-950 overflow-hidden rounded-sm">
                      <video
                        id="idcard-webcam-feed"
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                      <div className="absolute inset-0 border border-white/20 pointer-events-none rounded-md" />
                      {/* Guides */}
                      <div className="absolute inset-x-6 top-6 bottom-14 border border-dashed border-amber-400/40 pointer-events-none rounded-full flex items-center justify-center">
                        <span className="text-[7px] text-amber-400/30 font-bold uppercase tracking-widest mt-6">Face Alignment Zone</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        id="idcard-snap-photo-btn"
                        type="button"
                        onClick={capturePhoto}
                        className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-[10px] tracking-wider rounded-xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 size={13} className="stroke-[3]" />
                        Capture Snap
                      </button>

                      <button
                        type="button"
                        onClick={toggleCameraFacingMode}
                        className="px-3 py-2 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
                        title="Switch Camera facing mode"
                      >
                        <RefreshCw size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={stopCamera}
                        className="px-3 py-2 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 text-red-500 hover:text-red-400 cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Camera Trigger block */}
                    <button
                      id="idcard-camera-trigger-btn"
                      type="button"
                      onClick={() => startCamera()}
                      className="p-5 bg-neutral-950 hover:bg-neutral-850 border-2 border-neutral-850 hover:border-amber-400 flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-all"
                    >
                      <Camera className="text-amber-400 shrink-0" size={24} />
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-white block">Camera Snap</span>
                        <span className="text-[8px] text-neutral-500 font-mono font-bold uppercase block">Use Live Webcam</span>
                      </div>
                    </button>

                    {/* File Upload block */}
                    <label
                      className="p-5 bg-neutral-950 hover:bg-neutral-850 border-2 border-neutral-850 hover:border-amber-400 flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-all"
                    >
                      <Upload className="text-amber-400 shrink-0" size={24} />
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-white block">Upload Photo</span>
                        <span className="text-[8px] text-neutral-500 font-mono font-bold uppercase block">JPG/PNG Image file</span>
                      </div>
                      <input
                        id="idcard-file-upload-input"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e)}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {cameraError && (
                  <div className="p-3 bg-red-950/30 border border-red-900/50 text-red-400 text-[10px] font-mono rounded flex items-center gap-2">
                    <ShieldAlert size={14} className="shrink-0" />
                    <span>{cameraError}</span>
                  </div>
                )}
              </div>

            </div>

            {/* WORKSPACE COLUMN 2: Badge Settings & Double-sided Real-time preview */}
            <div className="space-y-6">
              
              {/* Badge Visual Settings Toolbar */}
              <div className="bg-neutral-900 border-4 border-neutral-800 p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2.5 border-b border-neutral-800">
                  <Sparkles className="text-amber-400" size={16} />
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">3. Badge Visual Settings</h3>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  {/* Theme Selector */}
                  <div>
                    <span className="block text-[9px] font-bold uppercase text-neutral-400 mb-1.5">Card Theme Options</span>
                    <div className="grid grid-cols-2 gap-2 bg-neutral-950 p-1 border border-neutral-850 rounded">
                      <button
                        id="idcard-theme-dark-btn"
                        type="button"
                        onClick={() => setCardTheme('dark')}
                        className={`py-1.5 font-bold text-[9px] uppercase tracking-wider rounded transition-all cursor-pointer ${cardTheme === 'dark' ? 'bg-amber-400 text-black font-black' : 'text-neutral-500 hover:text-neutral-300'}`}
                      >
                        Midnight Carbon
                      </button>
                      <button
                        id="idcard-theme-light-btn"
                        type="button"
                        onClick={() => setCardTheme('light')}
                        className={`py-1.5 font-bold text-[9px] uppercase tracking-wider rounded transition-all cursor-pointer ${cardTheme === 'light' ? 'bg-white text-black font-black' : 'text-neutral-500 hover:text-neutral-300'}`}
                      >
                        Laser Ivory White
                      </button>
                    </div>
                  </div>

                  {/* Accent Color Picker */}
                  <div>
                    <span className="block text-[9px] font-bold uppercase text-neutral-400 mb-1.5">Accent Color Schemes</span>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'amber', label: 'Gold', color: 'bg-amber-400 border-amber-500 text-amber-400' },
                        { id: 'emerald', label: 'Green', color: 'bg-emerald-500 border-emerald-600 text-emerald-400' },
                        { id: 'blue', label: 'Blue', color: 'bg-blue-500 border-blue-600 text-blue-400' },
                        { id: 'red', label: 'Red', color: 'bg-red-500 border-red-600 text-red-400' }
                      ].map(acc => (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => setAccentColor(acc.id as any)}
                          className={`p-1.5 border flex items-center justify-center gap-1 rounded transition-all cursor-pointer uppercase font-black text-[8px] tracking-wide ${
                            accentColor === acc.id 
                              ? 'bg-neutral-950 border-white text-white font-black scale-[1.05]' 
                              : 'bg-neutral-950/40 border-neutral-800 text-neutral-500 hover:text-neutral-300'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${acc.color.split(' ')[0]}`} />
                          <span>{acc.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Expiry Override */}
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-neutral-400 mb-1">Custom Expiration Date</label>
                    <input
                      id="idcard-expiry-override"
                      type="date"
                      value={customExpiry}
                      onChange={(e) => setCustomExpiry(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 p-2 text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                    />
                    <span className="text-[8.5px] text-neutral-550 mt-1 block">Defaults to Active Term closure limit. Use this to issue shorter temporary passes.</span>
                  </div>

                  {/* QR Option toggle */}
                  <div className="flex items-center justify-between p-2 bg-neutral-950 border border-neutral-850">
                    <span className="text-[9px] font-bold uppercase text-neutral-400">Generate Scan QR Code on Badge</span>
                    <button
                      id="idcard-toggle-qr-btn"
                      type="button"
                      onClick={() => setShowQrCode(!showQrCode)}
                      className={`px-2.5 py-1 text-[8px] font-black uppercase tracking-wider border-2 ${
                        showQrCode 
                          ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20' 
                          : 'border-neutral-800 text-neutral-500 bg-neutral-900/40'
                      }`}
                    >
                      {showQrCode ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Direct Print Trigger Area */}
              <div className="bg-neutral-950 border-2 border-neutral-800 p-4 space-y-3 font-mono text-xs">
                <button
                  id="idcard-print-badge-btn"
                  type="button"
                  onClick={handlePrintBadge}
                  className={`w-full py-3.5 ${getAccentClass('bg')} hover:opacity-90 text-black font-black uppercase text-xs tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(251,191,36,0.15)]`}
                >
                  <Printer size={15} className="stroke-[2.5]" />
                  <span>Generate &amp; Print Wallet ID Card</span>
                </button>
                <div className="text-center text-[9px] text-neutral-500 uppercase tracking-wide leading-relaxed font-semibold">
                  * Generates a landscape dual-sided layout suitable for printing on standard CR80 (85.6mm x 54mm) card stock or laminating pouches.
                </div>
              </div>

            </div>

          </div>
        )}

        {/* REAL-TIME DUAL SIDE BADGE PREVIEW GRID */}
        {activeStudent && (
          <div className="bg-neutral-900 border-4 border-neutral-800 p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-neutral-800">
              <Layers className="text-amber-400" size={16} />
              <h3 className="text-xs font-black uppercase tracking-widest text-white">4. Live Double-Sided Proof Preview</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 justify-center items-center">
              
              {/* FRONT SIDE PREVIEW */}
              <div className="flex flex-col items-center space-y-2">
                <span className="text-[10px] uppercase font-mono font-black text-neutral-400">Card Front Side</span>
                
                {/* Simulated Wallet Card Front */}
                <div 
                  id="idcard-preview-front"
                  className={`w-[324px] h-[204px] rounded-lg border-2 overflow-hidden relative font-sans flex flex-col justify-between shadow-2xl transition-all hover:scale-[1.02] ${
                    cardTheme === 'dark' 
                      ? 'bg-gradient-to-br from-neutral-900 to-neutral-950 text-white border-neutral-800' 
                      : 'bg-gradient-to-br from-white to-neutral-50 text-neutral-900 border-neutral-350'
                  }`}
                >
                  {/* Accent Top Lip */}
                  <div className={`absolute top-0 left-0 right-0 h-[4.5px] ${getAccentClass('bg')}`} />
                  
                  {/* Header */}
                  <div className={`mt-[4.5px] px-2.5 py-1.5 flex items-center justify-between border-b ${cardTheme === 'dark' ? 'border-neutral-850' : 'border-neutral-200'}`}>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-4 h-4 rounded-[2px] flex items-center justify-center font-black text-[8px] text-black shrink-0 ${getAccentClass('bg')}`}>
                        SH
                      </div>
                      <span className={`font-black text-[8px] uppercase tracking-wider ${cardTheme === 'dark' ? 'text-white' : 'text-neutral-800'}`}>
                        SHCA-SAWLA
                      </span>
                    </div>
                    <div>
                      <span className={`text-[5px] font-black uppercase px-1 py-0.5 border rounded-sm tracking-wider ${
                        expiryInfo.isExpired 
                          ? 'bg-red-950/40 text-red-400 border-red-900' 
                          : 'bg-emerald-950/40 text-emerald-400 border-emerald-900'
                      }`}>
                        {expiryInfo.isExpired ? 'Expired' : 'Active Pass'}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="px-2.5 py-1.5 flex items-center gap-2 flex-1">
                    {/* Avatar Block */}
                    <div className="flex flex-col items-center gap-[1.5px] shrink-0">
                      <div className={`w-[54px] h-[54px] rounded-[4.5px] border overflow-hidden flex items-center justify-center ${
                        cardTheme === 'dark' ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-100 border-neutral-300'
                      }`}>
                        {activeStudent.photoUrl ? (
                          <img 
                            src={activeStudent.photoUrl} 
                            alt={activeStudent.name} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className={`text-base font-mono font-black ${getAccentClass('text')}`}>
                            {activeStudent.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="text-[4.8px] font-mono font-bold text-neutral-500 uppercase tracking-widest">Student Info</span>
                    </div>

                    {/* Meta Info Block */}
                    <div className="flex-1 space-y-[1.5px]">
                      <div>
                        <span className="text-[5.5px] font-mono font-bold text-neutral-500 uppercase block leading-none">Pupil Name</span>
                        <span className={`text-[9.5px] font-black uppercase truncate block leading-tight max-w-[140px] ${cardTheme === 'dark' ? 'text-white' : 'text-black'}`}>
                          {activeStudent.name}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-1">
                        <div>
                          <span className="text-[5.5px] font-mono font-bold text-neutral-500 uppercase block leading-none">Class</span>
                          <span className={`text-[7.5px] font-mono font-black ${getAccentClass('text')}`}>{activeStudent.class}</span>
                        </div>
                        <div>
                          <span className="text-[5.5px] font-mono font-bold text-neutral-500 uppercase block leading-none">Gender</span>
                          <span className={`text-[7.5px] font-bold ${cardTheme === 'dark' ? 'text-white' : 'text-neutral-800'}`}>{activeStudent.gender || '—'}</span>
                        </div>
                      </div>

                      <div className="text-[5.5px] font-mono text-neutral-500 uppercase leading-none">
                        REG-ID: <span className={`font-black px-1 py-[0.5px] border rounded-[1.5px] ml-0.5 ${cardTheme === 'dark' ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-100 border-neutral-300 text-neutral-800'}`}>
                          {activeStudent.rollNumber || 'SHC-' + activeStudent.id.substring(0, 5).toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* QR Access Badge */}
                    {showQrCode && qrCodeDataUrl && (
                      <div className="w-[42px] h-[42px] bg-white p-[1.5px] border border-neutral-300 flex flex-col items-center justify-center gap-[0.5px] shrink-0 rounded-sm">
                        <img src={qrCodeDataUrl} className="w-[34px] h-[34px]" />
                        <span className="text-[3.5px] font-mono font-black text-black tracking-widest uppercase leading-none">Gate Pass</span>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Footer */}
                  <div className={`px-2.5 py-1.5 flex items-center justify-between text-[5.8px] font-mono border-t ${
                    cardTheme === 'dark' ? 'border-neutral-850 bg-neutral-950/60' : 'border-neutral-200 bg-neutral-100'
                  }`}>
                    <div className="text-neutral-500 font-bold uppercase tracking-wide">
                      SYSTEM ACCREDITED <span className={`font-black ml-1 px-1 border rounded-[1.5px] text-[5px] ${cardTheme === 'dark' ? 'bg-black border-neutral-800 text-white' : 'bg-neutral-250 border-neutral-350 text-neutral-850'}`}>EXP: {expiryInfo.expiryDate}</span>
                    </div>
                    <div className={`font-black uppercase tracking-wide ${getAccentClass('text')}`}>
                      {expiryInfo.termName}
                    </div>
                  </div>

                </div>
              </div>

              {/* BACK SIDE PREVIEW */}
              <div className="flex flex-col items-center space-y-2">
                <span className="text-[10px] uppercase font-mono font-black text-neutral-400">Card Back Side</span>
                
                {/* Simulated Wallet Card Back */}
                <div 
                  id="idcard-preview-back"
                  className={`w-[324px] h-[204px] rounded-lg border-2 overflow-hidden relative font-sans flex flex-col justify-between shadow-2xl transition-all hover:scale-[1.02] ${
                    cardTheme === 'dark' 
                      ? 'bg-gradient-to-br from-neutral-900 to-neutral-950 text-white border-neutral-800' 
                      : 'bg-gradient-to-br from-white to-neutral-50 text-neutral-900 border-neutral-350'
                  }`}
                >
                  {/* Accent Top Lip */}
                  <div className={`absolute top-0 left-0 right-0 h-[4.5px] ${cardTheme === 'dark' ? 'bg-neutral-800' : 'bg-neutral-300'}`} />
                  
                  {/* Header */}
                  <div className={`mt-[4.5px] px-2.5 py-1.5 flex items-center justify-between border-b ${cardTheme === 'dark' ? 'border-neutral-850' : 'border-neutral-200'}`}>
                    <span className="text-[6.5px] font-mono font-black text-neutral-500 uppercase tracking-wider">
                      SECURITY CARD POLICY &amp; RULES
                    </span>
                  </div>

                  {/* Rules and Contact Body */}
                  <div className="px-2.5 py-1.5 flex flex-col justify-between flex-1">
                    <ol className="list-decimal pl-3 text-[5.5px] font-bold text-neutral-500 space-y-[0.8px] leading-snug">
                      <li>This card remains the property of SHCA-Sawla.</li>
                      <li>Always present this card for scanning &amp; gate check-ins.</li>
                      <li>Loss of credential elements must be reported immediately.</li>
                      <li>Unauthorized duplication or counterfeit transfer is prohibited.</li>
                    </ol>

                    {/* Contact Details row */}
                    <div className={`pt-1.5 flex justify-between items-center text-[5.5px] font-mono border-t border-dashed ${
                      cardTheme === 'dark' ? 'border-neutral-800' : 'border-neutral-300'
                    }`}>
                      <div>
                        <span className="text-[4.5px] text-neutral-500 block leading-none">Guardian Mobile</span>
                        <span className={`font-black ${cardTheme === 'dark' ? 'text-white' : 'text-neutral-800'}`}>{activeStudent.guardianPhone || 'NOT ENROLLED'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[4.5px] text-neutral-500 block leading-none">Authorized Registrar</span>
                        <span className={`font-black ${getAccentClass('text')}`}>YAKUBU HAKEEM</span>
                      </div>
                    </div>

                    {/* Status bar */}
                    <div className={`rounded-sm py-[1.5px] text-center text-[5px] font-mono font-black uppercase tracking-wider border ${
                      cardTheme === 'dark' ? 'bg-neutral-950 border-neutral-850 text-neutral-500' : 'bg-neutral-100 border-neutral-250 text-neutral-500'
                    }`}>
                      Validation Active &bull; Valid thru Term Closure ({expiryInfo.expiryDate})
                    </div>
                  </div>

                  {/* Simulated Security Barcode Area */}
                  <div className={`px-2.5 py-1.5 flex flex-col items-center justify-center border-t bg-white border-neutral-200`}>
                    <div className="w-full h-3.5 flex items-stretch gap-[0.8px] bg-white">
                      {Array.from({ length: 32 }).map((_, idx) => (
                        <div 
                          key={idx} 
                          className="flex-1 bg-black" 
                          style={{ opacity: idx % 3 === 0 || idx % 4 === 1 ? 1 : 0 }} 
                        />
                      ))}
                    </div>
                    <div className="text-[5px] font-mono font-bold text-neutral-500 uppercase tracking-widest mt-[1px]">
                      *SHCA-{activeStudent.id.substring(0, 8).toUpperCase()}*
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
